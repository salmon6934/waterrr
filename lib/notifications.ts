/**
 * Notification scheduling logic for the Water Reminder app.
 *
 * Pure functions (computeNotificationTimes, isWithinActiveHours) are exported
 * for testability. Capacitor LocalNotifications integration gracefully degrades
 * in web/dev environments.
 */

import type { ReminderSchedule } from './types';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Checks if a given time falls within the [start, end] active hours range.
 * Both start and end are inclusive.
 */
export function isWithinActiveHours(
  time: Date,
  start: string,
  end: string
): boolean {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const timeMinutes = time.getHours() * 60 + time.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Computes an array of notification times for a given day based on the
 * reminder schedule. All times fall within [activeHoursStart, activeHoursEnd]
 * and are spaced exactly intervalMinutes apart.
 */
export function computeNotificationTimes(
  schedule: ReminderSchedule,
  referenceDate: Date
): Date[] {
  if (!schedule.enabled || schedule.intervalMinutes <= 0) {
    return [];
  }

  const [startHour, startMinute] = schedule.activeHoursStart.split(':').map(Number);
  const [endHour, endMinute] = schedule.activeHoursEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes >= endMinutes) {
    return [];
  }

  const times: Date[] = [];
  let currentMinutes = startMinutes;

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;

    const notificationTime = new Date(referenceDate);
    notificationTime.setHours(hours, minutes, 0, 0);

    times.push(notificationTime);
    currentMinutes += schedule.intervalMinutes;
  }

  return times;
}

// --- Capacitor LocalNotifications integration ---

const SCHEDULE_DAYS_AHEAD = 7;

const REMINDER_MESSAGES = [
  'Take a sip. Your body will thank you.',
  'Water break. You got this.',
  'Quick reminder — hydrate.',
  'Your future self wants you to drink water right now.',
  'Sip sip. Keep the streak alive.',
  'A glass of water goes a long way.',
  'Pause. Breathe. Drink.',
  'Hydration check ✓',
  'Water > everything else rn.',
  'Just a sip. That\'s all it takes.',
];

/** Returns true if running on a native platform (Android/iOS). */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Requests notification permissions from the user.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return true;

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedules local notifications for the next 7 days based on the schedule.
 * Cancels all existing notifications first.
 */
export async function scheduleNotifications(
  schedule: ReminderSchedule
): Promise<void> {
  await cancelAllNotifications();

  if (!schedule.enabled) return;
  if (!isNative()) return;

  const now = new Date();
  const allFutureTimes: Date[] = [];

  for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS_AHEAD; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);

    const times = computeNotificationTimes(schedule, day);
    const futureTimes = times.filter((t) => t.getTime() > now.getTime());
    allFutureTimes.push(...futureTimes);
  }

  if (allFutureTimes.length === 0) return;

  const notifications = allFutureTimes.map((time, index) => ({
    id: index + 1,
    title: 'Tis time',
    body: REMINDER_MESSAGES[index % REMINDER_MESSAGES.length],
    schedule: { at: time },
  }));

  await LocalNotifications.schedule({ notifications });
}

/**
 * Cancels all previously scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    // Best effort
  }
}

/**
 * Reschedules notifications from the new configuration.
 */
export async function rescheduleNotifications(
  schedule: ReminderSchedule
): Promise<void> {
  await scheduleNotifications(schedule);
}

/**
 * Sets up a listener that tops up scheduled notifications when running low.
 * Call once at app startup.
 */
export async function initNotificationListener(
  schedule: ReminderSchedule
): Promise<void> {
  if (!isNative()) return;

  LocalNotifications.addListener('localNotificationReceived', async () => {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length < 5) {
        await scheduleNotifications(schedule);
      }
    } catch {
      // Best effort
    }
  });
}

/**
 * Sends a test notification that fires 10 seconds from now.
 * Returns a status string describing what happened.
 */
export async function sendTestNotification(): Promise<string> {
  if (!isNative()) {
    return 'Not on native platform';
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') {
        return `Permission denied: ${req.display}`;
      }
    }
  } catch (err) {
    return `Permission error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const fireAt = new Date(Date.now() + 10_000);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 99999,
          title: '💧 Test Notification',
          body: `This is a test! Scheduled at ${new Date().toLocaleTimeString()}`,
          schedule: { at: fireAt },
        },
      ],
    });
    return `OK — fires at ${fireAt.toLocaleTimeString()}`;
  } catch (err) {
    return `Schedule error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
