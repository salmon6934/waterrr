# Testing

## Overview

AVIEN uses **Vitest** as the test runner with **fast-check** for property-based testing. The test suite validates core business logic and social enhancement features.

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
- Push notification token management
- Edge function logic helpers
- UI components (rendering states, user interactions)

### Property-Based Tests

Tests that verify universal properties hold for **any** valid input. The `fast-check` library generates hundreds of random inputs per property. Used for:

- Mathematical invariants (progress always in [0, 100])
- Data validation rules (volume accepts 1–5000 only)
- Algorithmic correctness (sorted entries have non-decreasing timestamps)
- Symmetry guarantees (friend connections are bidirectional)
- Round-trip guarantees (encode → decode = identity)
- Cooldown logic (2h nudge, 60min notification rate limit)
- Format correctness (notification bodies match spec)

### Integration Tests

End-to-end flows testing multiple modules working together:

- Friend removal cascade (connection + close friend cleanup)
- Nudge cooldown enforcement
- Token refresh lifecycle
- Close friend intake notification delivery + rate limiting
- Notification tap navigation based on auth state

## Test Files

### Core Logic Tests (`lib/`)

| File | Tests | Coverage Area |
|------|-------|---------------|
| `lib/storage.test.ts` | 18 | localStorage read/write, corruption handling, date filtering |
| `lib/storage.property.test.ts` | 1 | Date filtering returns only matching entries (any input) |
| `lib/intake.property.test.ts` | 7 | Progress bounds, volume validation, chronological sorting |
| `lib/streak.property.test.ts` | 3 | Streak continuity preservation and reset logic |
| `lib/notifications.test.ts` | 15 | Notification scheduling, boundary checks, interval correctness |
| `lib/haptics.test.ts` | 6 | Haptic plugin calls, error resilience |
| `lib/friends.property.test.ts` | 10 | Feature gating, invite round-trips, connection symmetry, search |

### Social Enhancement Tests (`__tests__/`)

| File | Tests | Coverage Area |
|------|-------|---------------|
| `__tests__/friends-social.property.test.ts` | 11 | Close friends, nudges, notifications, cooldowns, formatting |
| `__tests__/push.test.ts` | — | FCM token register/unregister/refresh, platform detection |
| `__tests__/edge-functions.test.ts` | — | Edge function helper logic (cooldowns, rate limits, bodies) |
| `__tests__/social-integration.test.ts` | — | End-to-end social flows (removal cascade, nudge cooldown) |
| `__tests__/ui-components.test.tsx` | — | FriendCard states, NudgeButton, RemoveFriendDialog, IntakeEntryList |

### UI Design Change Tests (`__tests__/`)

| File | Tests | Coverage Area |
|------|-------|---------------|
| `__tests__/navbar-profile-navigation.test.tsx` | 8 | NavBar 3-tab rendering, no Settings tab, font-bold active, no border-t, Profile page gear/pencil icons |
| `__tests__/nudge-button-friendcard-layout.test.tsx` | 6 | NudgeButton Bell icon, 32×32 tap target, cooldown opacity, FriendCard collapsed/expanded layouts |
| `__tests__/settings-reminder-styling.test.tsx` | 7 | Settings h2 heading styles, ReminderForm dropdown arrow alignment |

## Properties Tested

### Core Properties (Original)

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

### Social Enhancement Properties (New)

| # | Property | Module |
|---|----------|--------|
| S1 | Intake entries sorted descending and capped at 50 | `friends.ts` |
| S2 | Entry formatting includes volume and valid HH:MM | `friends.ts` |
| S3 | Card expand/collapse is a round-trip | `FriendCard` |
| S4 | Friend removal invariant (removed from friends + close friends) | `friends.ts` |
| S5 | Friend request notification payload contains sender username | `friends.ts` |
| S6 | Inactivity detection uses 24-hour threshold | `friends.ts` |
| S7 | Nudge notification body contains username and ≤ 100 chars | `friends.ts` |
| S8 | Nudge cooldown active within 2 hours of sent_at | `friends.ts` |
| S9 | Cooldown time formatting uses hours or minutes appropriately | `NudgeButton` |
| S10 | Close friend intake notification format matches spec | `friends.ts` |
| S11 | Close friend intake notification 60-min rate limiting | `friends.ts` |

## Test Conventions

- Core logic tests live alongside their source in `lib/`
- Social enhancement tests live in `__tests__/`
- Unit tests: `*.test.ts`
- Property tests: `*.property.test.ts`
- Component tests: `*.test.tsx`
- No mocking of `localStorage` — tests use `jsdom` which provides a working implementation
- Capacitor plugins are mocked at the module level
- Supabase client is mocked (no network calls in tests)
- Property tests run with `fc.assert(fc.property(...), { numRuns: 100 })`

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
import { isInactive } from '../lib/friends';

describe('Property: inactivity threshold', () => {
  it('returns true when delta > 24h', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (now) => {
          const oldTimestamp = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
          return isInactive(oldTimestamp, now) === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```
