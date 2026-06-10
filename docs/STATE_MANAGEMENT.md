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

This handles the multi-device scenario where a user logs water on one device and opens the app on another.

## Real-Time Subscriptions

`lib/realtime.ts` manages WebSocket connections to Supabase for live updates on the Friends page:

- Subscribes to `intake_entries` table changes
- Subscribes to `profiles` table changes
- Auto-reloads friend data when any relevant change occurs
- Cleans up subscriptions on page unmount

## React Patterns Used

### State Lifting

Page-level state is managed in page components (`app/page.tsx`, etc.) and passed down to child components as props. No global state management library is used — the app is simple enough that prop drilling through 1-2 levels is sufficient.

### Effect-Based Loading

```typescript
useEffect(() => {
  const entries = loadTodayEntries();
  const goal = loadDailyGoal();
  setEntries(entries);
  setGoal(goal);
}, []);
```

### Optimistic Updates

State is updated immediately on user action, then synced in the background:

```typescript
const handleAdd = (volume: number) => {
  const entry = { id: crypto.randomUUID(), volume, timestamp: Date.now() };
  setEntries(prev => [...prev, entry]);     // Instant UI
  saveIntakeEntry(entry);                    // Persist local
  syncEntryToSupabase(entry);               // Background cloud
};
```
