# Notifications

## Overview

AVIEN sends **local push notifications** to remind users to drink water at regular intervals throughout the day. Notifications are scheduled on-device — no internet connection required.

## Configuration

Users configure reminders in the Settings page via the `ReminderForm` component:

```typescript
interface ReminderSchedule {
  enabled: boolean;           // Master toggle
  intervalMinutes: number;    // Time between reminders (e.g., 60)
  startHour: number;          // Active window start (e.g., 8 for 8:00 AM)
  endHour: number;            // Active window end (e.g., 22 for 10:00 PM)
}
```

## Scheduling Algorithm (`lib/notifications.ts`)

### `computeNotificationTimes(schedule: ReminderSchedule, date: Date): Date[]`

Generates an array of notification times for a given day:

1. Start at `startHour` on the given date
2. Add `intervalMinutes` repeatedly
3. Stop when exceeding `endHour`
4. Return all computed times

**Guards:**
- Returns empty if `enabled === false`
- Returns empty if `intervalMinutes === 0`
- Returns empty if `startHour >= endHour`

### `isWithinActiveHours(time: number, start: number, end: number): boolean`

Checks if a given hour falls within the active notification window (inclusive on both ends).

### Example

```
Schedule: interval=60, start=8, end=22
Generated times: 8:00, 9:00, 10:00, ... 22:00 (15 notifications)

Schedule: interval=30, start=9, end=12
Generated times: 9:00, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00 (7 notifications)
```

## Capacitor Integration

Notifications are delivered via the `@capacitor/local-notifications` plugin:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Request permission
await LocalNotifications.requestPermissions();

// Schedule notifications
await LocalNotifications.schedule({
  notifications: times.map((time, i) => ({
    id: i,
    title: 'Time to hydrate! 💧',
    body: 'Take a sip of water',
    schedule: { at: time },
  })),
});

// Cancel all
await LocalNotifications.cancel({ notifications: [...] });
```

## Scheduling Strategy

1. On save: compute times for the next 7 days
2. Schedule all at once (Capacitor handles them natively)
3. When a notification fires and fewer than 5 remain: top up the schedule
4. On schedule change: cancel all, reschedule with new settings

## Platform Behavior

| Platform | Behavior |
|----------|----------|
| Android (Capacitor) | Full native notifications, survives app close |
| Browser (dev) | Graceful no-op (no crash, no notifications) |

## Permissions

Android requires:
- `SCHEDULE_EXACT_ALARM` — precise timing
- `RECEIVE_BOOT_COMPLETED` — reschedule after device restart

The app requests these on first notification schedule attempt.

## Testing

15 unit tests cover:
- Boundary conditions (time exactly at start/end)
- Invalid configurations (zero interval, start ≥ end, disabled)
- Correct interval spacing
- Generated times within active window
- Date anchoring
