# Water Intake Tracking

## Overview

The core feature of AVIEN. Users log water intake throughout the day and track progress toward a configurable daily goal.

## User Interface

### Home Page (`app/page.tsx`)

- **Progress Ring** — circular visualization showing current intake vs goal (water-fill animation)
- **Quick-Add Buttons** — preset volumes: 250ml, 350ml, 500ml
- **Custom Add** — modal for entering any volume (1–5000ml)
- **Daily Log** — chronological list of today's entries with delete capability
- **Streak Counter** — consecutive days indicator

## Data Model

```typescript
interface IntakeEntry {
  id: string;          // UUID, generated client-side
  volume: number;      // 1–5000 ml
  timestamp: number;   // Unix timestamp (ms)
}

interface DailyGoal {
  value: number;       // Default: 2000ml
}
```

## Business Logic (`lib/intake.ts`)

### `calculateTotalIntake(entries: IntakeEntry[]): number`

Sums all entry volumes. Returns 0 for empty arrays.

### `calculateProgress(current: number, goal: number): number`

Returns percentage (0–100), clamped. `current / goal * 100`, never exceeds 100.

### `isValidVolume(volume: number): boolean`

Returns `true` if `1 ≤ volume ≤ 5000`. Rejects zero, negatives, and unreasonably large values.

### `sortEntriesChronologically(entries: IntakeEntry[]): IntakeEntry[]`

Sorts entries by timestamp ascending (oldest first).

### `isToday(timestamp: number): boolean`

Checks if a timestamp falls on the current calendar date.

## Interaction Flow

### Adding Water

```
1. User taps 250ml button
2. Create entry: { id: randomUUID(), volume: 250, timestamp: Date.now() }
3. Save to localStorage (instant)
4. Update React state → UI re-renders with new total
5. Trigger haptic feedback (light vibration)
6. Sync to Supabase in background
7. If new total ≥ goal:
   a. Trigger goal completion haptic (success pattern)
   b. Update streak
   c. Sync streak to Supabase
```

### Deleting an Entry

```
1. User taps X on an entry
2. Remove from React state → UI re-renders
3. Remove from localStorage
4. Delete from Supabase
5. Recalculate total and progress
```

## Settings

### Daily Goal

- Configurable in Settings page (1–5000ml range)
- Default: 2000ml
- Persisted to localStorage and Supabase
- Includes hydration status indicator:
  - Below 1500ml: "Below recommended"
  - 1500–3000ml: "Good"
  - Above 3000ml: "Above recommended"

## Validation Rules

| Rule | Implementation |
|------|---------------|
| Volume must be 1–5000ml | `isValidVolume()` check before save |
| Entry ID must be unique | UUID generation ensures uniqueness |
| Timestamp must be present | Set at creation time, never null |
| Goal must be 1–5000ml | Input validation in Settings |
