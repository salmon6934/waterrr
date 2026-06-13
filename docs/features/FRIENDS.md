# Friends & Social

## Overview

AVIEN's social layer allows users to connect with friends and view each other's hydration progress in real-time. All social features require authentication.

## Features

- **Search users** by username
- **Send friend requests** to other users
- **Accept/decline** incoming requests
- **View friend activity** (today's intake, goal, streak)
- **Share invite links** for adding friends outside the app
- **Real-time updates** via Supabase WebSocket subscriptions
- **Close friend designation** — view detailed intake entries (see [Close Friends doc](./CLOSE_FRIENDS.md))
- **Friend removal** with confirmation dialog
- **Nudge inactive friends** with push notifications (see [Close Friends doc](./CLOSE_FRIENDS.md))
- **Push notifications** for friend requests (see [Push Notifications doc](./PUSH_NOTIFICATIONS.md))

## Friend Connection Flow

```
User A searches "bob"
    │
    ▼
searchUsers("bob") → Supabase query (ilike on username)
    │
    ▼
Results displayed (excluding self)
    │
    ▼
User A taps "Add" on Bob's profile
    │
    ▼
sendFriendRequest(bobId)
    │
    ▼
Creates row: { user_id: A, friend_id: B, status: 'pending' }
    │
    ├── DB webhook fires → send-push-notification Edge Function
    │                       → FCM push to Bob's device
    ▼
Bob opens Friends page → sees pending request
    │
    ▼
Bob taps "Accept"
    │
    ▼
acceptFriendRequest(connectionId) → status = 'accepted'
    │
    ▼
Both A and B now see each other in their friends list
```

## API (`lib/friends.ts`)

### Core Friend Operations

```typescript
searchUsers(query: string): Promise<Profile[]>
// Case-insensitive substring search, excludes current user

sendFriendRequest(targetUserId: string): Promise<void>
// Creates pending connection, triggers push notification via webhook

acceptFriendRequest(connectionId: string): Promise<void>
// Updates status to 'accepted'

removeFriend(connectionId: string): Promise<void>
// Deletes connection (cascade removes close_friends row)

getFriendsForUser(connections: FriendConnection[], userId: string): string[]
// Pure function — symmetric friend ID extraction
```

### Close Friend Operations

```typescript
addCloseFriend(userId: string, friendId: string): Promise<void>
removeCloseFriend(userId: string, friendId: string): Promise<void>
getCloseFriends(userId: string): Promise<string[]>
getCloseFriendIntakeEntries(friendId: string): Promise<IntakeEntry[]>
```

### Nudge Operations

```typescript
sendNudge(senderId: string, receiverId: string): Promise<{ sentAt: string }>
getNudgeCooldown(senderId: string, receiverId: string): Promise<{ active: boolean; expiresAt: string | null }>
computeNudgeCooldown(sentAt: string | null, now: Date): { active: boolean; expiresAt: string | null }
isInactive(lastIntakeTimestamp: string | null, now: Date): boolean
friendHasDeviceToken(friendId: string): Promise<boolean>
```

### Notification Body Builders

```typescript
buildFriendRequestNotificationBody(username: string): string
buildNudgeNotificationBody(username: string): string
buildCloseFriendIntakeNotificationBody(username: string, volume: number): string
isCloseFriendNotificationRateLimited(lastSentAt: string | null, now: Date): boolean
```

### Invite Links

```typescript
generateInviteLink(userId: string): string
// Encodes userId as URL query parameter

parseInviteLink(link: string): string | null
// Extracts userId, returns null for invalid links
```

### Feature Gating

```typescript
canAccessFeature(feature: string, isAuthenticated: boolean): boolean
// Local features always true, social features require auth
```

## Enhanced Friends Page

The Friends page (`app/friends/page.tsx`) loads `EnhancedFriendProgress[]` which includes:

- Basic progress data (intake, goal, streak)
- Close friend status
- Last intake timestamp (for inactivity detection)
- Device token existence (for nudge button visibility)
- Nudge cooldown expiry (for timer display)

## Real-Time Updates

The Friends page subscribes to Supabase channels for live updates via `lib/realtime.ts`:

- Subscribes to `intake_entries` and `profiles` changes for accepted friends
- Auto-reconnect on disconnect (5-second retry)
- Connectivity status tracking (`connected`, `disconnected`, `connecting`)
- Initial data fetch + incremental updates on changes

## UI Components

| Component | Purpose |
|-----------|---------|
| `FriendCard` | Expandable card: collapsed (progress) → expanded (actions) |
| `FriendSearch` | Username search input + results list with "Add" buttons |
| `InviteShare` | Generates and displays shareable invite link |
| `PendingRequests` | Lists incoming requests with accept/decline buttons |
| `IntakeEntryList` | Close friend's intake entries for today |
| `NudgeButton` | Nudge with cooldown timer |
| `RemoveFriendDialog` | Confirmation prompt for friend removal |

## Security

- All social features are gated behind authentication (`canAccessFeature()`)
- RLS ensures users can only see their own connections and friends' intake data
- Friend search exposes only usernames (not emails or private data)
- Connection uniqueness constraint prevents duplicate requests
- Nudge cooldown enforced server-side (Edge Function, 2-hour window)
- Close friend intake notifications rate-limited server-side (60-min window)
