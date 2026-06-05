/**
 * Core type definitions for the Water Reminder app.
 */

/** A single record of water consumed. */
export interface IntakeEntry {
  id: string;              // UUID
  volume: number;          // milliliters (1-5000)
  timestamp: string;       // ISO 8601 datetime
  userId?: string;         // Supabase user ID (when authenticated)
}

/** The target volume of water the user aims to consume each day. */
export interface DailyGoal {
  value: number;           // milliliters (default: 2000)
  updatedAt: string;       // ISO 8601 datetime
}

/** User-configured reminder notification schedule. */
export interface ReminderSchedule {
  enabled: boolean;
  intervalMinutes: number; // e.g., 30, 60, 90, 120
  activeHoursStart: string; // HH:MM format (e.g., "08:00")
  activeHoursEnd: string;   // HH:MM format (e.g., "22:00")
}

/** A user profile stored in Supabase. */
export interface UserProfile {
  id: string;              // Supabase user ID
  username: string;        // Unique display name
  email: string;
  dailyGoal: number;       // milliliters
  createdAt: string;
}

/** A friend connection between two users. */
export interface FriendConnection {
  id: string;
  userId: string;          // Requesting user
  friendId: string;        // Target user
  status: 'pending' | 'accepted';
  createdAt: string;
}

/** A friend's current hydration progress. */
export interface FriendProgress {
  userId: string;
  username: string;
  currentIntake: number;   // total ml for today
  dailyGoal: number;
  currentStreak: number;   // consecutive days meeting goal
}

/** Streak tracking data persisted in localStorage. */
export interface StreakData {
  currentStreak: number;       // consecutive days meeting DailyGoal
  lastCompletedDate: string;   // ISO 8601 date (YYYY-MM-DD) of last day goal was met
}

/** User's selected visual theme. */
export interface ThemePreference {
  mode: 'light' | 'dark';
}
