/**
 * App-wide constants for the Water Reminder app.
 */

/** Default daily goal in milliliters for new users. */
export const DEFAULT_DAILY_GOAL = 2000;

/** Preset quick-add volumes in milliliters. */
export const PRESET_VOLUMES = [250, 350, 500] as const;

/** Minimum allowed custom volume in milliliters. */
export const MIN_VOLUME = 1;

/** Maximum allowed custom volume in milliliters. */
export const MAX_VOLUME = 5000;

/** localStorage keys for persisting app data. */
export const STORAGE_KEYS = {
  INTAKE_ENTRIES: 'water_reminder_intake_entries',
  DAILY_GOAL: 'water_reminder_daily_goal',
  REMINDER_SCHEDULE: 'water_reminder_reminders',
  THEME: 'water_reminder_theme',
  AUTH_SESSION: 'water_reminder_session',
  STREAK: 'water_reminder_streak',
} as const;
