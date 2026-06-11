/**
 * Timezone utilities for the Water Reminder app.
 * All date calculations use IST (Indian Standard Time, UTC+5:30).
 */

/** IST offset in milliseconds: +5 hours 30 minutes */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Returns a Date object adjusted to represent the current IST time.
 * Note: The returned Date's getFullYear/getMonth/getDate/getHours etc.
 * will return IST values when using getUTC* methods.
 */
export function getNowIST(): Date {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/**
 * Converts any Date to its IST representation.
 * Use getUTC* methods on the returned Date to get IST values.
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Returns the start of the current day in IST as a UTC ISO string.
 * E.g., if IST is 2024-01-15 14:30, returns the UTC equivalent of 2024-01-15 00:00:00 IST.
 */
export function getISTDayStartUTC(date?: Date): string {
  const now = date ?? new Date();
  const istDate = toIST(now);
  // Get the IST date components
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  // Construct midnight IST, then convert back to UTC
  const midnightIST = Date.UTC(year, month, day) - IST_OFFSET_MS;
  return new Date(midnightIST).toISOString();
}

/**
 * Returns the end of the current day in IST (start of next day) as a UTC ISO string.
 */
export function getISTDayEndUTC(date?: Date): string {
  const now = date ?? new Date();
  const istDate = toIST(now);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  // Construct midnight of next day IST, then convert back to UTC
  const nextMidnightIST = Date.UTC(year, month, day + 1) - IST_OFFSET_MS;
  return new Date(nextMidnightIST).toISOString();
}

/**
 * Returns the current date in IST as a YYYY-MM-DD string.
 */
export function getISTDateString(date?: Date): string {
  const now = date ?? new Date();
  const istDate = toIST(now);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a localized IST timestamp string (ISO 8601 format with +05:30 offset).
 * Use this when storing timestamps that should clearly indicate IST.
 */
export function getISTTimestamp(): string {
  const now = new Date();
  const istDate = toIST(now);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  const ms = String(istDate.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+05:30`;
}

/**
 * Checks if a given ISO timestamp falls on the same IST calendar date as today.
 */
export function isISTToday(timestamp: string): boolean {
  const entryDate = new Date(timestamp);
  const todayStr = getISTDateString();
  const entryStr = getISTDateString(entryDate);
  return entryStr === todayStr;
}
