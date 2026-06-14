# Close Friends & Nudges

## Overview

The social enhancements layer adds deeper friend interactions: **close friend designation** (view detailed intake entries), **friend removal**, and **nudge notifications** for inactive friends.

## Close Friend Designation

### Concept

Users can mark any accepted friend as a "close friend." Close friends get a water droplet (💧) icon and their detailed intake entries become visible.

### User Flow

```
1. User taps on a FriendCard → card expands
2. For non-close friend: shows "Mark as Close Friend" button
3. User taps button → close_friends row created
4. Card now shows 💧 icon next to username
5. On next expand: shows today's intake entries (max 50, most recent first)
6. Each entry: volume in ml + HH:MM timestamp
7. "Remove Close Friend" button available to revert
```

### Implementation

```typescript
// lib/friends.ts
addCloseFriend(userId, friendId)         → INSERT into close_friends
removeCloseFriend(userId, friendId)      → DELETE from close_friends
getCloseFriends(userId)                  → SELECT friend_ids
getCloseFriendIntakeEntries(friendId)    → SELECT today's entries (limit 50, DESC)
formatIntakeEntry(entry)                 → "250ml at 14:30"
```

### FriendCard States

```
┌────────────────────────────────────┐
│          COLLAPSED (default)       │
│  username | progress bar | streak  │
└──────────────────┬─────────────────┘
                   │ tap
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐  ┌──────────────────────┐
│ EXPANDED        │  │ EXPANDED             │
│ (non-close)     │  │ (close friend)       │
│                 │  │                      │
│ • Mark Close    │  │ 💧 icon on username  │
│ • Nudge Button  │  │ • Intake entries list│
│ • Remove Friend │  │ • Remove Close Friend│
└─────────────────┘  │ • Nudge Button       │
                     │ • Remove Friend      │
                     └──────────────────────┘
```

## Friend Removal

### User Flow

```
1. User taps FriendCard → expands
2. User taps "Remove Friend" button
3. RemoveFriendDialog appears with confirmation prompt
4. User confirms → friend_connections row deleted (CASCADE removes close_friends)
5. Friend removed from list immediately
6. On error: friend stays in list, error message shown
7. On cancel: dialog dismissed, no changes
```

### Implementation

```typescript
removeFriend(connectionId)  → DELETE from friend_connections
// Database cascade automatically removes close_friends row if exists
```

## Nudge System

### Concept

When a friend hasn't logged water in 24+ hours, a nudge button appears on their card. Tapping it sends a push notification encouraging them to drink water.

### Inactivity Detection

```typescript
isInactive(lastIntakeTimestamp: string | null, now: Date): boolean
// Returns true if:
//   - lastIntakeTimestamp is null (never logged)
//   - now - lastIntakeTimestamp > 24 hours
```

### Nudge Button Visibility

| Condition | Button State |
|-----------|-------------|
| Friend has no device token | Hidden |
| Friend is not inactive (logged within 24h) | Hidden |
| Friend is inactive, no cooldown | Visible, enabled ("👋 Nudge") |
| Friend is inactive, cooldown active | Visible, disabled ("23h remaining" / "45m remaining") |
| Nudge send in progress | Visible, disabled ("Sending...") |

### Cooldown

- Duration: **2 hours** from last nudge sent
- Tracked in `nudges` table (sender_id, receiver_id, sent_at)
- Timer display: hours when ≥ 1 hour, minutes when < 1 hour
- Format: `Math.floor(seconds / 3600)` + "h remaining" or `Math.floor(seconds / 60)` + "m remaining"

### Implementation

```typescript
sendNudge(senderId, receiverId)              → invoke send-nudge Edge Function
getNudgeCooldown(senderId, receiverId)       → query nudges table, compute cooldown
computeNudgeCooldown(sentAt, now)            → pure cooldown computation
buildNudgeNotificationBody(username)         → "{username} reminds you to drink water! 💧" (max 100 chars)
```

## Close Friend Intake Notifications

When a close friend logs water, all users who designated them as close receive a push notification.

### Rate Limiting

- **Window:** 5 minutes per (logger, recipient) pair
- **Tracked in:** `close_friend_notifications` table
- If a close friend logs multiple entries within 5 minutes, only the first triggers a notification

### Implementation

```typescript
buildCloseFriendIntakeNotificationBody(username, volume)  → "{username} just drank {volume}ml"
isCloseFriendNotificationRateLimited(lastSentAt, now)     → true if < 5 minutes elapsed
```

## Edge Function Helpers (`lib/edge-function-helpers.ts`)

Pure functions extracted from Edge Functions for testability:

```typescript
shouldProcessFriendRequest(status)           → true only if status === 'pending'
isNudgeCooldownActive(lastSentAt, now)       → true if < 2h elapsed
getNudgeCooldownExpiry(lastSentAt)           → ISO string of expiry time
isIntakeNotificationRateLimited(lastSentAt, now) → true if < 5min elapsed
buildIntakeNotificationBody(username, volume)    → "{username} just drank {volume}ml"
buildNudgeNotificationBody(username)             → "{username} says: Stay hydrated! 💧"
```

## New Components

| Component | File | Purpose |
|-----------|------|---------|
| IntakeEntryList | `components/IntakeEntryList.tsx` | Renders close friend's entries (loading/error/empty states) |
| NudgeButton | `components/NudgeButton.tsx` | Nudge with cooldown timer and error handling |
| RemoveFriendDialog | `components/RemoveFriendDialog.tsx` | Confirmation prompt for friend removal |
| AnimatedNumber | `components/AnimatedNumber.tsx` | Eased number animation (used in progress display) |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Fetch close friend entries fails | Card stays expanded, inline error shown |
| Friend removal network error | Friend stays in list, error message in dialog |
| Nudge send fails | Button stays enabled, inline error below button |
| Close friend intake notification fails (server) | Silent — logger is unaware |
| Rate limit hit for notifications | Silent suppression, no user feedback |
