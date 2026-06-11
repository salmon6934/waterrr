/**
 * Background sync service for the Water Reminder app.
 * Implements write-local-first strategy with background push to Supabase when authenticated.
 *
 * - On auth state change (login), syncs local intake entries to Supabase
 * - Syncs daily goal changes to Supabase profiles table when authenticated
 * - Syncs streak data (currentStreak, lastCompletedDate) to Supabase profiles table
 * - Falls back to loading from Supabase if localStorage is unavailable or corrupted
 */

import { supabase } from './supabase';
import { onAuthStateChange, getSession } from './auth';
import {
  loadTodayEntries,
  loadDailyGoal,
  loadStreakData,
  saveIntakeEntry,
  saveDailyGoal,
  saveStreakData,
} from './storage';
import { STORAGE_KEYS } from './constants';
import { IntakeEntry, DailyGoal, StreakData } from './types';
import { getISTDayStartUTC, getISTDayEndUTC } from './timezone';

/**
 * Syncs all local intake entries to Supabase intake_entries table.
 * Uses upsert to avoid duplicates based on entry id.
 */
export async function syncIntakeEntriesToSupabase(
  userId: string
): Promise<void> {
  const entries = loadAllLocalEntries();
  if (entries.length === 0) return;

  const rows = entries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    volume: entry.volume,
    timestamp: entry.timestamp,
  }));

  const { error } = await supabase
    .from('intake_entries')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Failed to sync intake entries to Supabase:', error.message);
  }
}

/**
 * Syncs the daily goal to the Supabase profiles table.
 */
export async function syncDailyGoalToSupabase(userId: string): Promise<void> {
  const goal = loadDailyGoal();

  const { error } = await supabase
    .from('profiles')
    .update({ daily_goal: goal.value })
    .eq('id', userId);

  if (error) {
    console.error('Failed to sync daily goal to Supabase:', error.message);
  }
}

/**
 * Syncs streak data (currentStreak, lastCompletedDate) to the Supabase profiles table.
 */
export async function syncStreakToSupabase(userId: string): Promise<void> {
  const streak = loadStreakData();

  const { error } = await supabase
    .from('profiles')
    .update({
      current_streak: streak.currentStreak,
      last_completed_date: streak.lastCompletedDate || null,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to sync streak to Supabase:', error.message);
  }
}

/**
 * Loads intake entries from Supabase for the current day (IST).
 * Used as a fallback when localStorage is unavailable or corrupted.
 */
export async function loadIntakeEntriesFromSupabase(
  userId: string
): Promise<IntakeEntry[]> {
  const startOfDay = getISTDayStartUTC();
  const endOfDay = getISTDayEndUTC();

  const { data, error } = await supabase
    .from('intake_entries')
    .select('id, volume, timestamp')
    .eq('user_id', userId)
    .gte('timestamp', startOfDay)
    .lt('timestamp', endOfDay)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error(
      'Failed to load intake entries from Supabase:',
      error.message
    );
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    volume: row.volume,
    timestamp: row.timestamp,
    userId,
  }));
}

/**
 * Loads daily goal from Supabase profiles table.
 * Used as a fallback when localStorage is unavailable or corrupted.
 */
export async function loadDailyGoalFromSupabase(
  userId: string
): Promise<DailyGoal | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('daily_goal')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to load daily goal from Supabase:', error?.message);
    return null;
  }

  return {
    value: data.daily_goal,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads streak data from Supabase profiles table.
 * Used as a fallback when localStorage is unavailable or corrupted.
 */
export async function loadStreakFromSupabase(
  userId: string
): Promise<StreakData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_streak, last_completed_date')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to load streak from Supabase:', error?.message);
    return null;
  }

  return {
    currentStreak: data.current_streak,
    lastCompletedDate: data.last_completed_date || '',
  };
}

/**
 * Checks if localStorage is available and not corrupted for a given key.
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to load data from Supabase as a fallback when localStorage is unavailable.
 * Populates localStorage with fetched data if possible.
 */
export async function fallbackLoadFromSupabase(userId: string): Promise<{
  entries: IntakeEntry[];
  dailyGoal: DailyGoal | null;
  streak: StreakData | null;
}> {
  const [entries, dailyGoal, streak] = await Promise.all([
    loadIntakeEntriesFromSupabase(userId),
    loadDailyGoalFromSupabase(userId),
    loadStreakFromSupabase(userId),
  ]);

  // Try to persist fetched data to localStorage
  try {
    for (const entry of entries) {
      saveIntakeEntry(entry);
    }
    if (dailyGoal) {
      saveDailyGoal(dailyGoal);
    }
    if (streak) {
      saveStreakData(streak);
    }
  } catch {
    // localStorage may still be unavailable; data was loaded for in-memory use
  }

  return { entries, dailyGoal, streak };
}

/**
 * Performs a full sync of local data to Supabase.
 * Called on auth state change when a user logs in.
 */
export async function syncAllToSupabase(userId: string): Promise<void> {
  await Promise.all([
    syncIntakeEntriesToSupabase(userId),
    syncDailyGoalToSupabase(userId),
    syncStreakToSupabase(userId),
  ]);
}

/**
 * Initializes the background sync listener.
 * On auth state change (user login):
 * 1. First pulls today's data from Supabase into localStorage (for multi-device support)
 * 2. Then syncs any local-only data back to Supabase
 *
 * @returns An unsubscribe function to remove the auth listener.
 */
export function initBackgroundSync(): { unsubscribe: () => void } {
  const { unsubscribe } = onAuthStateChange(async (session) => {
    if (!session) return;

    const userId = session.user.id;

    // Always pull from Supabase first to support multi-device
    await pullFromSupabase(userId);

    if (isLocalStorageAvailable()) {
      // Then sync any local data back to Supabase
      await syncAllToSupabase(userId);
    }
  });

  return { unsubscribe };
}

/**
 * Pulls the user's data from Supabase and merges it into localStorage.
 * Ensures multi-device data is available locally.
 */
async function pullFromSupabase(userId: string): Promise<void> {
  try {
    const [entries, dailyGoal, streak] = await Promise.all([
      loadIntakeEntriesFromSupabase(userId),
      loadDailyGoalFromSupabase(userId),
      loadStreakFromSupabase(userId),
    ]);

    // Merge remote entries with local (deduplicate by id)
    const localEntries = loadAllLocalEntries();
    const localIds = new Set(localEntries.map((e) => e.id));
    const newEntries = entries.filter((e) => !localIds.has(e.id));

    if (newEntries.length > 0) {
      const merged = [...localEntries, ...newEntries];
      localStorage.setItem(STORAGE_KEYS.INTAKE_ENTRIES, JSON.stringify(merged));
    }

    // Use remote goal/streak if available (server is source of truth)
    if (dailyGoal) {
      saveDailyGoal(dailyGoal);
    }
    if (streak) {
      saveStreakData(streak);
    }
  } catch {
    // Silently fail — local data still works
  }
}

// --- Internal helpers ---

/**
 * Loads all intake entries from localStorage (all dates).
 */
function loadAllLocalEntries(): IntakeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INTAKE_ENTRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as IntakeEntry[];
      }
    }
  } catch {
    // Return empty on failure
  }
  return [];
}
