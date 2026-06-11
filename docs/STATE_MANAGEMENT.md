# State Management

## Strategy

AVIEN uses a **local-first, sync-later** data strategy. All state lives in two places with a clear hierarchy:

```
┌─────────────────────────────────────┐
│          React Component State      │  ← UI (ephemeral)
│          (useState, useEffect)      │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│            localStorage             │  ← Source of truth (device)
│        (lib/storage.ts)             │
└─────────────────┬───────────────────┘
                  │ Background sync
┌─────────────────▼───────────────────┐
│         Supabase Postgres           │  ← Source of truth (cloud)
│         (lib/sync.ts)               │
└─────────────────────────────────────┘
```

## State Categories

### Ephemeral (React state only)

- Modal open/closed
- Form input values before submission
- Loading/error indicators
- Search results
- FriendCard expanded/collapsed state
- Remove dialog visibility
- Nudge sending state

### Persisted Locally

- Today's intake entries
- Daily goal (ml)
- Reminder schedule
- Theme preference (light/dark)
- Streak data (current count + last completed date)

### Synced to Cloud

- Intake entries (per user)
- Profile data (username, daily goal, streak)
- Friend connections (requests + accepted)
- Close friend designations
- Device tokens (FCM)
- Nudge records (cooldown tracking)
- Close friend notification records (rate limiting)

## localStorage Service

`lib/storage.ts` provides type-safe read/write operations:

```typescript
// All operations are synchronous and immediate
saveIntakeEntry(entry: IntakeEntry): void
loadTodayEntries(): IntakeEntry[]
saveDailyGoal(goal: number): void
loadDailyGoal(): number           // defaults to 2000
saveTheme(theme: ThemePreference): void
loadTheme(): ThemePreference      // defaults to 'dark'
saveReminderSchedule(schedule: ReminderSchedule): void
loadReminderSchedule(): ReminderSchedule
saveStreakData(data: StreakData): void
loadStreakData(): StreakData
filterEntriesByDate(entries: IntakeEntry[], date: Date): IntakeEntry[]
```

All read operations handle corrupted data gracefully by returning sensible defaults.

## Sync Logic

`lib/sync.ts` handles bidirectional synchronization between localStorage and Supabase.

### Sync Triggers

| Event | Sync Action |
|-------|-------------|
| User adds water | Upsert entry to Supabase |
| User deletes entry | Delete from Supabase |
| Goal reached (streak) | Update profile in Supabase |
| Daily goal changed | Update profile in Supabase |
| User logs in | Pull all today's data, merge with local |

### Merge Strategy

On login, the sync process:

1. Loads all today's entries from Supabase
2. Compares with local entries by `id`
3. Keeps the union (deduplication by entry ID)
4. Writes merged set back to localStorage

## Real-Time Subscriptions

`lib/realtime.ts` manages WebSocket connections to Supabase for live updates:

### Architecture

```typescript
subscribeToFriendProgress(options)  → Sets up channels, returns void
unsubscribeFromFriendProgress()     → Cleans up channels
getRealtimeStatus()                 → 'connected' | 'disconnected' | 'connecting'
getSubscribedFriendIds()            → Current tracked friend IDs
```

### Features

- Subscribes to `intake_entries` and `profiles` table changes (filtered by friend IDs)
- Auto-reconnect on disconnect (5-second retry)
- Connectivity status tracking with callbacks
- Initial data fetch on subscription setup
- Calculates intake totals per friend for FriendProgress objects

### Subscription Lifecycle

```
subscribeToFriendProgress()
    │
    ├── Fetch accepted friend IDs
    ├── Fetch initial friend progress data
    ├── Deliver initial data via callback
    └── Create Supabase channel
         ├── Listen: intake_entries changes (filtered by friend IDs)
         ├── Listen: profiles changes (filtered by friend IDs)
         └── On any change → refetch + deliver updated data
```

## Push Notification State

`PushNotificationProvider` manages FCM lifecycle as React context:

- Registers device token on authenticated mount
- Unregisters on logout
- Listens for token refresh events
- Handles notification tap navigation
- Exposes `pushError` state for inline error display

## React Patterns Used

### State Lifting

Page-level state is managed in page components and passed down to child components as props. No global state management library is used.

### Context Providers

- `PushNotificationProvider` — FCM token lifecycle and notification tap handling

### Optimistic Updates

State is updated immediately on user action, then synced in the background:

```typescript
const handleAdd = (volume: number) => {
  const entry = { id: crypto.randomUUID(), volume, timestamp: new Date().toISOString() };
  setEntries(prev => [...prev, entry]);     // Instant UI
  saveIntakeEntry(entry);                    // Persist local
  syncEntryToSupabase(entry);               // Background cloud
};
```

### Enhanced Friends Page State

The Friends page manages additional state for social features:

```typescript
const [friends, setFriends] = useState<EnhancedFriendProgress[]>([]);
const [intakeEntriesMap, setIntakeEntriesMap] = useState<Record<string, IntakeEntry[]>>({});
const [intakeEntriesLoading, setIntakeEntriesLoading] = useState<Record<string, boolean>>({});
const [intakeEntriesError, setIntakeEntriesError] = useState<Record<string, string | null>>({});
const [connectionIdMap, setConnectionIdMap] = useState<Record<string, string>>({});
```

This tracks per-friend intake entries, loading states, and connection IDs for removal.
