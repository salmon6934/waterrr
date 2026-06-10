# Testing

## Overview

AVIEN uses **Vitest** as the test runner with **fast-check** for property-based testing. The test suite contains **61 tests** covering core business logic.

## Running Tests

```bash
# Run all tests (single execution, no watch mode)
npm run test
```

## Test Strategy

### Unit Tests

Traditional example-based tests that verify specific inputs produce expected outputs. Used for:

- localStorage operations (save/load round-trips, corruption handling)
- Notification time computation (boundary checks, interval spacing)
- Haptic feedback (plugin calls, graceful failures)

### Property-Based Tests

Tests that verify universal properties hold for **any** valid input. The `fast-check` library generates hundreds of random inputs per property. Used for:

- Mathematical invariants (progress always in [0, 100])
- Data validation rules (volume accepts 1–5000 only)
- Algorithmic correctness (sorted entries have non-decreasing timestamps)
- Symmetry guarantees (friend connections are bidirectional)
- Round-trip guarantees (encode → decode = identity)

## Test Files

| File | Tests | Coverage Area |
|------|-------|---------------|
| `lib/storage.test.ts` | 18 | localStorage read/write, corruption handling, date filtering |
| `lib/storage.property.test.ts` | 1 | Date filtering returns only matching entries (any input) |
| `lib/intake.property.test.ts` | 7 | Progress bounds, volume validation, chronological sorting |
| `lib/streak.property.test.ts` | 3 | Streak continuity preservation and reset logic |
| `lib/notifications.test.ts` | 15 | Notification scheduling, boundary checks, interval correctness |
| `lib/haptics.test.ts` | 6 | Haptic plugin calls, error resilience |
| `lib/friends.property.test.ts` | 10 | Feature gating, invite round-trips, connection symmetry, search |

## Properties Tested

| # | Property | Module |
|---|----------|--------|
| 1 | Progress percentage bounded [0, 100] and proportional | `intake.ts` |
| 2 | Volume validation accepts 1–5000 only | `intake.ts` |
| 3 | Sorted entries have non-decreasing timestamps | `intake.ts` |
| 4 | Date filter returns only matching entries | `storage.ts` |
| 5 | Intake entry save → load round-trip | `storage.ts` |
| 6 | Daily goal save → load round-trip | `storage.ts` |
| 9 | Feature access respects auth boundary | `friends.ts` |
| 10 | Search returns only username-matching profiles | `friends.ts` |
| 11 | Accepted connections are symmetric | `friends.ts` |
| 12 | Invite link encode → decode round-trip | `friends.ts` |
| 13 | Streak continuity: preserved if ≤1 day gap, reset otherwise | `streak.ts` |
| 14 | Streak increment: +1 if goal met, 0 if not | `streak.ts` |

## Test Conventions

- Test files live alongside their source in `lib/`
- Unit tests: `*.test.ts`
- Property tests: `*.property.test.ts`
- No mocking of `localStorage` — tests use `jsdom` which provides a working implementation
- Capacitor plugins are mocked at the module level in haptics tests
- Supabase client is mocked in friends property tests (no network calls in tests)

## Adding New Tests

```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { calculateProgress } from './intake';

describe('calculateProgress', () => {
  it('returns 50 when current is half of goal', () => {
    expect(calculateProgress(1000, 2000)).toBe(50);
  });
});

// Property test example
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { calculateProgress } from './intake';

describe('Property: progress bounds', () => {
  it('always returns [0, 100] for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.nat(),           // current: any non-negative integer
        fc.integer({ min: 1, max: 10000 }), // goal: positive integer
        (current, goal) => {
          const result = calculateProgress(current, goal);
          return result >= 0 && result <= 100;
        }
      )
    );
  });
});
```
