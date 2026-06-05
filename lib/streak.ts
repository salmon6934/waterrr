import { IntakeEntry, StreakData } from './types';
import { calculateTotalIntake } from './intake';

/**
 * Formats a Date object as a YYYY-MM-DD string.
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines whether the daily goal was met for a given set of entries.
 * @param entries - Array of intake entries for the day
 * @param goal - Daily goal in milliliters
 * @returns true if total intake >= goal
 */
export function isDailyGoalMet(entries: IntakeEntry[], goal: number): boolean {
  return calculateTotalIntake(entries) >= goal;
}

/**
 * Calculates the updated streak value based on whether today's goal was met.
 * @param currentStreak - The current streak count
 * @param goalMet - Whether the daily goal was met
 * @returns currentStreak + 1 if goalMet, else 0
 */
export function updateStreak(currentStreak: number, goalMet: boolean): number {
  return goalMet ? currentStreak + 1 : 0;
}

/**
 * Validates streak continuity based on the last completed date and the current date.
 * - If lastCompletedDate is yesterday or today, streak is preserved (returns currentStreak).
 * - If lastCompletedDate is more than 1 day ago (gap > 1 day), streak resets to 0.
 * - If lastCompletedDate is null/undefined/empty, streak is 0.
 *
 * @param streakData - The persisted streak data
 * @param currentDate - The current date (passed in for testability)
 * @returns The validated streak value
 */
export function validateStreakContinuity(
  streakData: StreakData,
  currentDate: Date
): number {
  if (!streakData.lastCompletedDate) {
    return 0;
  }

  const todayStr = toDateString(currentDate);

  // If lastCompletedDate is today, streak is preserved
  if (streakData.lastCompletedDate === todayStr) {
    return streakData.currentStreak;
  }

  // Calculate yesterday's date
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  // If lastCompletedDate is yesterday, streak is preserved
  if (streakData.lastCompletedDate === yesterdayStr) {
    return streakData.currentStreak;
  }

  // Gap is more than 1 day — reset streak
  return 0;
}
