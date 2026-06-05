import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveIntakeEntry,
  loadTodayEntries,
  saveDailyGoal,
  loadDailyGoal,
  saveTheme,
  loadTheme,
  saveReminderSchedule,
  loadReminderSchedule,
  saveStreakData,
  loadStreakData,
  filterEntriesByDate,
} from './storage';
import { STORAGE_KEYS } from './constants';
import type { IntakeEntry, DailyGoal, ThemePreference, ReminderSchedule, StreakData } from './types';

beforeEach(() => {
  localStorage.clear();
});

describe('saveIntakeEntry / loadTodayEntries', () => {
  it('saves and loads an entry for today', () => {
    const entry: IntakeEntry = {
      id: 'test-1',
      volume: 250,
      timestamp: new Date().toISOString(),
    };
    saveIntakeEntry(entry);
    const today = loadTodayEntries();
    expect(today).toHaveLength(1);
    expect(today[0].id).toBe('test-1');
    expect(today[0].volume).toBe(250);
  });

  it('does not return entries from a different date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const entry: IntakeEntry = {
      id: 'old-1',
      volume: 500,
      timestamp: yesterday.toISOString(),
    };
    saveIntakeEntry(entry);
    const today = loadTodayEntries();
    expect(today).toHaveLength(0);
  });

  it('accumulates multiple entries', () => {
    saveIntakeEntry({ id: 'a', volume: 250, timestamp: new Date().toISOString() });
    saveIntakeEntry({ id: 'b', volume: 350, timestamp: new Date().toISOString() });
    const today = loadTodayEntries();
    expect(today).toHaveLength(2);
  });

  it('returns empty array when localStorage has corrupted data', () => {
    localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, 'not valid json{{{');
    const today = loadTodayEntries();
    expect(today).toEqual([]);
  });
});

describe('saveDailyGoal / loadDailyGoal', () => {
  it('saves and loads the daily goal', () => {
    const goal: DailyGoal = { value: 3000, updatedAt: new Date().toISOString() };
    saveDailyGoal(goal);
    const loaded = loadDailyGoal();
    expect(loaded.value).toBe(3000);
  });

  it('returns default 2000ml when no goal is saved', () => {
    const loaded = loadDailyGoal();
    expect(loaded.value).toBe(2000);
  });

  it('returns default when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, '!!!bad');
    const loaded = loadDailyGoal();
    expect(loaded.value).toBe(2000);
  });
});

describe('saveTheme / loadTheme', () => {
  it('saves and loads a theme preference', () => {
    const theme: ThemePreference = { mode: 'light' };
    saveTheme(theme);
    expect(loadTheme().mode).toBe('light');
  });

  it('defaults to dark theme when nothing is stored', () => {
    expect(loadTheme().mode).toBe('dark');
  });

  it('defaults to dark theme on corrupted data', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, '"invalid"');
    expect(loadTheme().mode).toBe('dark');
  });
});

describe('saveReminderSchedule / loadReminderSchedule', () => {
  it('saves and loads a reminder schedule', () => {
    const schedule: ReminderSchedule = {
      enabled: true,
      intervalMinutes: 30,
      activeHoursStart: '09:00',
      activeHoursEnd: '21:00',
    };
    saveReminderSchedule(schedule);
    const loaded = loadReminderSchedule();
    expect(loaded.enabled).toBe(true);
    expect(loaded.intervalMinutes).toBe(30);
    expect(loaded.activeHoursStart).toBe('09:00');
    expect(loaded.activeHoursEnd).toBe('21:00');
  });

  it('returns default schedule when nothing is stored', () => {
    const loaded = loadReminderSchedule();
    expect(loaded.enabled).toBe(false);
    expect(loaded.intervalMinutes).toBe(60);
    expect(loaded.activeHoursStart).toBe('08:00');
    expect(loaded.activeHoursEnd).toBe('22:00');
  });
});

describe('saveStreakData / loadStreakData', () => {
  it('saves and loads streak data', () => {
    const streak: StreakData = { currentStreak: 5, lastCompletedDate: '2024-01-15' };
    saveStreakData(streak);
    const loaded = loadStreakData();
    expect(loaded.currentStreak).toBe(5);
    expect(loaded.lastCompletedDate).toBe('2024-01-15');
  });

  it('returns zeroed streak when nothing is stored', () => {
    const loaded = loadStreakData();
    expect(loaded.currentStreak).toBe(0);
    expect(loaded.lastCompletedDate).toBe('');
  });

  it('returns zeroed streak on corrupted data', () => {
    localStorage.setItem(STORAGE_KEYS.STREAK, '{bad json');
    const loaded = loadStreakData();
    expect(loaded.currentStreak).toBe(0);
  });
});

describe('filterEntriesByDate', () => {
  it('returns only entries matching the target date', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const entries: IntakeEntry[] = [
      { id: '1', volume: 250, timestamp: today.toISOString() },
      { id: '2', volume: 500, timestamp: yesterday.toISOString() },
      { id: '3', volume: 350, timestamp: today.toISOString() },
    ];

    const filtered = filterEntriesByDate(entries, today);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('returns empty array when no entries match', () => {
    const entries: IntakeEntry[] = [
      { id: '1', volume: 250, timestamp: '2023-01-01T12:00:00.000Z' },
    ];
    const filtered = filterEntriesByDate(entries, new Date(2024, 5, 15));
    expect(filtered).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterEntriesByDate([], new Date())).toEqual([]);
  });
});
