import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from './constants';
import type { IntakeEntry, DailyGoal, StreakData } from './types';

// Mock Supabase client
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn();
const mockFrom = vi.fn((table: string) => {
  if (table === 'intake_entries') {
    return {
      upsert: mockUpsert,
      select: mockSelect,
    };
  }
  return {
    update: mockUpdate,
    select: mockSelect,
  };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('./auth', () => ({
  onAuthStateChange: vi.fn((cb) => {
    return { unsubscribe: vi.fn() };
  }),
  getSession: vi.fn().mockResolvedValue(null),
}));

import {
  syncIntakeEntriesToSupabase,
  syncDailyGoalToSupabase,
  syncStreakToSupabase,
  isLocalStorageAvailable,
  syncAllToSupabase,
  initBackgroundSync,
} from './sync';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('syncIntakeEntriesToSupabase', () => {
  it('upserts local entries to Supabase', async () => {
    const entries: IntakeEntry[] = [
      { id: 'entry-1', volume: 250, timestamp: '2024-01-15T10:00:00.000Z' },
      { id: 'entry-2', volume: 500, timestamp: '2024-01-15T12:00:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, JSON.stringify(entries));

    await syncIntakeEntriesToSupabase('user-123');

    expect(mockFrom).toHaveBeenCalledWith('intake_entries');
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { id: 'entry-1', user_id: 'user-123', volume: 250, timestamp: '2024-01-15T10:00:00.000Z' },
        { id: 'entry-2', user_id: 'user-123', volume: 500, timestamp: '2024-01-15T12:00:00.000Z' },
      ],
      { onConflict: 'id' }
    );
  });

  it('does nothing when no entries exist locally', async () => {
    await syncIntakeEntriesToSupabase('user-123');
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('syncDailyGoalToSupabase', () => {
  it('updates the daily goal in Supabase profiles', async () => {
    const goal: DailyGoal = { value: 3000, updatedAt: '2024-01-15T10:00:00.000Z' };
    localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, JSON.stringify(goal));

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    await syncDailyGoalToSupabase('user-123');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ daily_goal: 3000 });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });
});

describe('syncStreakToSupabase', () => {
  it('updates streak data in Supabase profiles', async () => {
    const streak: StreakData = { currentStreak: 5, lastCompletedDate: '2024-01-15' };
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    await syncStreakToSupabase('user-123');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      current_streak: 5,
      last_completed_date: '2024-01-15',
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('sends null for empty lastCompletedDate', async () => {
    const streak: StreakData = { currentStreak: 0, lastCompletedDate: '' };
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    await syncStreakToSupabase('user-123');

    expect(mockUpdate).toHaveBeenCalledWith({
      current_streak: 0,
      last_completed_date: null,
    });
  });
});

describe('isLocalStorageAvailable', () => {
  it('returns true when localStorage is working', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });
});

describe('syncAllToSupabase', () => {
  it('calls all sync functions', async () => {
    const entries: IntakeEntry[] = [
      { id: 'entry-1', volume: 250, timestamp: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, JSON.stringify(entries));

    const goal: DailyGoal = { value: 2500, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, JSON.stringify(goal));

    const streak: StreakData = { currentStreak: 3, lastCompletedDate: '2024-01-14' };
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    await syncAllToSupabase('user-123');

    // Should have called from for intake_entries and profiles (goal + streak)
    expect(mockFrom).toHaveBeenCalledWith('intake_entries');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });
});

describe('initBackgroundSync', () => {
  it('returns an unsubscribe function', () => {
    const { unsubscribe } = initBackgroundSync();
    expect(typeof unsubscribe).toBe('function');
  });
});
