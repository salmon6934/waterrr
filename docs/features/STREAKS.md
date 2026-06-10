# Streaks

## Overview

Streaks track the number of **consecutive days** a user meets their daily water intake goal. They incentivize consistent hydration habits.

## Data Model

```typescript
interface StreakData {
  currentStreak: number;        // Consecutive days count
  lastCompletedDate: string;    // "YYYY-MM-DD" format, or empty string
}
```

## State Machine

```
                    ┌─────────────────────┐
                    │   Check Continuity   │
                    │  (app startup/daily) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     lastCompleted =     lastCompleted =    gap > 1 day
         today             yesterday
              │                │                │
              ▼                ▼                ▼
        Keep streak      Keep streak      Reset to 0
        (no change)      (preserved)
```

## Logic (`lib/streak.ts`)

### `isDailyGoalMet(entries: IntakeEntry[], goal: number): boolean`

Returns `true` if the sum of all entry volumes ≥ the daily goal.

### `updateStreak(current: number, goalMet: boolean): number`

- `goalMet === true` → returns `current + 1`
- `goalMet === false` → returns `0`

### `validateStreakContinuity(streakData: StreakData, today: Date): StreakData`

Called on app startup to check if the streak should be preserved or reset:

| `lastCompletedDate` | Result |
|---------------------|--------|
| Today | Streak preserved (already counted) |
| Yesterday | Streak preserved (chain unbroken) |
| 2+ days ago | Streak reset to 0 |
| Empty/never | Streak stays at 0 |

### `toDateString(date: Date): string`

Converts a Date to `"YYYY-MM-DD"` format for comparison.

## When Streak Updates

```
User adds water
    │
    ▼
Calculate total for today
    │
    ▼
total ≥ goal?
    │
    ├── No → do nothing
    │
    └── Yes → Is this the first time today?
                │
                ├── Already completed today → do nothing
                │
                └── First completion →
                      • streak += 1
                      • lastCompletedDate = today
                      • Save to localStorage
                      • Sync to Supabase (profile update)
                      • Trigger success haptic
```

## Persistence

Streak data is stored in two places:

1. **localStorage** — immediate access, offline capable
2. **Supabase `profiles` table** — `current_streak` and `last_completed_date` columns

On login, the sync process reconciles both sources.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User meets goal, then deletes entries below goal | Streak is NOT decremented (completed status is locked for the day) |
| User crosses midnight while using app | Streak evaluation uses the device's local date |
| User changes timezone | Streak uses the new timezone for "today" calculation |
| First-time user | Streak starts at 0, no lastCompletedDate |
