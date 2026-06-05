import { IntakeEntry } from './types';

/**
 * Calculates the total intake volume from a list of entries.
 * @param entries - Array of intake entries
 * @returns Sum of all entry volumes in milliliters
 */
export function calculateTotalIntake(entries: IntakeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.volume, 0);
}

/**
 * Validates whether a volume value is acceptable.
 * Must be an integer between 1 and 5000 inclusive.
 * @param volume - Volume in milliliters to validate
 * @returns true if the volume is valid
 */
export function isValidVolume(volume: number): boolean {
  return Number.isInteger(volume) && volume >= 1 && volume <= 5000;
}

/**
 * Sorts intake entries by timestamp in ascending chronological order.
 * Returns a new array (does not mutate the input).
 * @param entries - Array of intake entries
 * @returns New array sorted by timestamp ascending
 */
export function sortEntriesChronologically(entries: IntakeEntry[]): IntakeEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Checks if an ISO 8601 timestamp falls on the current calendar date.
 * @param timestamp - ISO 8601 datetime string
 * @returns true if the timestamp is today's date
 */
export function isToday(timestamp: string): boolean {
  const entryDate = new Date(timestamp);
  const now = new Date();
  return (
    entryDate.getFullYear() === now.getFullYear() &&
    entryDate.getMonth() === now.getMonth() &&
    entryDate.getDate() === now.getDate()
  );
}

/**
 * Calculates progress as a percentage clamped to [0, 100].
 * Returns 0 if goal is <= 0.
 * @param current - Current intake in milliliters
 * @param goal - Daily goal in milliliters
 * @returns Percentage value between 0 and 100
 */
export function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max((current / goal) * 100, 0), 100);
}
