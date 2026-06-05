/**
 * Notification scheduling logic for the Water Reminder app.
 *
 * Pure functions (computeNotificationTimes, isWithinActiveHours) are exported
 * for testability. Capacitor LocalNotifications integration gracefully degrades
 * in web/dev environments.
 */

import type { ReminderSchedule } from './types';

/**
 * Checks if a given time falls within the [start, end] active hours range.
 * Both start and end are inclusive.
 *
 * @param time - The Date to check
 * @param start - Start time in "HH:MM" format
 * @param end - End time in "HH:MM" format
 * @returns true if the time is within [start, end]
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
 *
 * @param schedule - The reminder schedule configuration
 * @param referenceDate - The date for which to compute notification times
 * @returns Array of Date objects representing notification times
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

  // If start >= end, no valid window exists
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

interface LocalNotificationRequest {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
}

/**
 * Attempts to dynamically import Capacitor LocalNotifications.
 * Returns null if unavailable (web/dev environment).
 */
async function getLocalNotificationsPlugin() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

/**
 * Requests notification permissions from the user.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getLocalNotificationsPlugin();
  if (!plugin) {
    // Web/dev fallback — assume granted for development
    return true;
  }

  try {
    const result = await plugin.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedules local notifications based on the reminder schedule.
 * Cancels any previously scheduled notifications first, then schedules
 * fresh notifications for the computed times.
 *
 * @param schedule - The reminder schedule configuration
 * @throws Error if scheduling fails (caller should display error to user)
 */
export async function scheduleNotifications(
  schedule: ReminderSchedule
): Promise<void> {
  // Always cancel existing notifications first
  await cancelAllNotifications();

  if (!schedule.enabled) {
    return;
  }

  const plugin = await getLocalNotificationsPlugin();
  if (!plugin) {
    // Web/dev fallback — log and return silently
    console.info('[Notifications] Capacitor plugin not available, skipping schedule.');
    return;
  }

  // Request permission if needed
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    throw new Error('Notification permission denied. Please enable notifications in your device settings.');
  }

  const now = new Date();
  const times = computeNotificationTimes(schedule, now);

  // Filter out times that have already passed today
  const futureTimes = times.filter((t) => t.getTime() > now.getTime());

  if (futureTimes.length === 0) {
    return;
  }

  const notifications: LocalNotificationRequest[] = futureTimes.map((time, index) => ({
    id: index + 1,
    title: 'Hydration Reminder 💧',
    body: 'Time to drink some water! Stay hydrated.',
    schedule: { at: time },
  }));

  try {
    await plugin.schedule({ notifications });
  } catch (error) {
    throw new Error(
      `Failed to schedule notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Cancels all previously scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  const plugin = await getLocalNotificationsPlugin();
  if (!plugin) {
    return;
  }

  try {
    const pending = await plugin.getPending();
    if (pending.notifications.length > 0) {
      await plugin.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    // Silently fail on cancel — best effort cleanup
  }
}

/**
 * Reschedules notifications based on an updated schedule configuration.
 * Cancels all existing notifications and schedules fresh ones from the
 * new configuration.
 *
 * @param schedule - The updated reminder schedule
 * @throws Error if scheduling fails
 */
export async function rescheduleNotifications(
  schedule: ReminderSchedule
): Promise<void> {
  await scheduleNotifications(schedule);
}
