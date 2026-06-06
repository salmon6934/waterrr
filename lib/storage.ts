/**
 * localStorage service for the Water Reminder app.
 * Provides typed read/write utilities with JSON serialization,
 * error handling, and date-based filtering.
 */

import {
  IntakeEntry,
  DailyGoal,
  ReminderSchedule,
  ThemePreference,
  StreakData,
} from './types';
import { DEFAULT_DAILY_GOAL, STORAGE_KEYS } from './constants';

// --- Intake Entries ---

/**
 * Saves a new intake entry by appending it to the existing entries array.
 */
export function saveIntakeEntry(entry: IntakeEntry): void {
  try {
    const existing = loadAllEntries();
    existing.push(entry);
    localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, JSON.stringify(existing));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Deletes an intake entry by ID from localStorage.
 */
export function deleteIntakeEntry(id: string): void {
  try {
    const existing = loadAllEntries();
    const filtered = existing.filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, JSON.stringify(filtered));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Loads all intake entries for the current calendar date.
 */
export function loadTodayEntries(): IntakeEntry[] {
  const entries = loadAllEntries();
  return filterEntriesByDate(entries, new Date());
}

// --- Daily Goal ---

/**
 * Saves the daily goal to localStorage.
 */
export function saveDailyGoal(goal: DailyGoal): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, JSON.stringify(goal));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Loads the daily goal from localStorage.
 * Defaults to 2000ml if no goal is saved or data is corrupted.
 */
export function loadDailyGoal(): DailyGoal {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyGoal;
      if (parsed && typeof parsed.value === 'number' && parsed.updatedAt) {
        return parsed;
      }
    }
  } catch {
    // Fall through to default
  }
  return { value: DEFAULT_DAILY_GOAL, updatedAt: new Date().toISOString() };
}

// --- Theme ---

/**
 * Saves the theme preference to localStorage.
 */
export function saveTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Loads the theme preference from localStorage.
 * Defaults to dark theme if no preference is saved or data is corrupted.
 */
export function loadTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (raw) {
      const parsed = JSON.parse(raw) as ThemePreference;
      if (parsed && (parsed.mode === 'light' || parsed.mode === 'dark')) {
        return parsed;
      }
    }
  } catch {
    // Fall through to default
  }
  return { mode: 'dark' };
}

// --- Reminder Schedule ---

/**
 * Saves the reminder schedule to localStorage.
 */
export function saveReminderSchedule(schedule: ReminderSchedule): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.REMINDER_SCHEDULE,
      JSON.stringify(schedule)
    );
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Loads the reminder schedule from localStorage.
 * Returns a default schedule (disabled, 60-min interval, 08:00–22:00) if not set.
 */
export function loadReminderSchedule(): ReminderSchedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDER_SCHEDULE);
    if (raw) {
      const parsed = JSON.parse(raw) as ReminderSchedule;
      if (
        parsed &&
        typeof parsed.enabled === 'boolean' &&
        typeof parsed.intervalMinutes === 'number' &&
        typeof parsed.activeHoursStart === 'string' &&
        typeof parsed.activeHoursEnd === 'string'
      ) {
        return parsed;
      }
    }
  } catch {
    // Fall through to default
  }
  return {
    enabled: false,
    intervalMinutes: 60,
    activeHoursStart: '08:00',
    activeHoursEnd: '22:00',
  };
}

// --- Streak Data ---

/**
 * Saves streak data to localStorage.
 */
export function saveStreakData(streak: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Loads streak data from localStorage.
 * Returns a zeroed streak if no data is saved or data is corrupted.
 */
export function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (raw) {
      const parsed = JSON.parse(raw) as StreakData;
      if (
        parsed &&
        typeof parsed.currentStreak === 'number' &&
        typeof parsed.lastCompletedDate === 'string'
      ) {
        return parsed;
      }
    }
  } catch {
    // Fall through to default
  }
  return { currentStreak: 0, lastCompletedDate: '' };
}

// --- Utilities ---

/**
 * Filters intake entries to only those whose timestamp falls within the given calendar date.
 * This is a pure function suitable for unit/property testing.
 */
export function filterEntriesByDate(
  entries: IntakeEntry[],
  date: Date
): IntakeEntry[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return (
      entryDate.getFullYear() === year &&
      entryDate.getMonth() === month &&
      entryDate.getDate() === day
    );
  });
}

/**
 * Loads all intake entries from localStorage (all dates).
 * Returns an empty array on parse failure.
 */
function loadAllEntries(): IntakeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INTAKE_ENTRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as IntakeEntry[];
      }
    }
  } catch {
    // Return empty array on error
  }
  return [];
}
