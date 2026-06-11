/**
 * Pure logic helper functions extracted from Supabase Edge Functions.
 * These functions encapsulate the core business logic that runs inside
 * Deno-based Edge Functions, making it testable in a Node.js/vitest environment.
 */

/**
 * Check if a friend request notification should be processed based on status.
 * Only pending requests trigger push notifications.
 * @param status - The friend connection status
 * @returns true if the request should be processed (status is 'pending')
 */
export function shouldProcessFriendRequest(status: string): boolean {
  return status === 'pending';
}

/**
 * Check if the nudge cooldown is active (within 24h of last nudge).
 * @param lastSentAt - ISO 8601 timestamp of the last nudge, or null if none
 * @param now - The current date/time
 * @returns true if cooldown is active (less than 24h elapsed)
 */
export function isNudgeCooldownActive(lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return false;
  const elapsed = now.getTime() - new Date(lastSentAt).getTime();
  return elapsed < 2 * 60 * 60 * 1000;
}

/**
 * Compute the nudge cooldown expiry timestamp (24h after last sent).
 * @param lastSentAt - ISO 8601 timestamp of the last nudge
 * @returns ISO 8601 string of the cooldown expiry time
 */
export function getNudgeCooldownExpiry(lastSentAt: string): string {
  const sentAt = new Date(lastSentAt);
  return new Date(sentAt.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

/**
 * Check if a close friend intake notification is rate limited (60-min window).
 * @param lastSentAt - ISO 8601 timestamp of the last notification, or null if none
 * @param now - The current date/time
 * @returns true if rate limited (less than 60 minutes elapsed)
 */
export function isIntakeNotificationRateLimited(lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return false;
  const elapsed = now.getTime() - new Date(lastSentAt).getTime();
  return elapsed < 60 * 60 * 1000;
}

/**
 * Build notification body for close friend intake.
 * Format: "{username} just drank {volume}ml"
 * @param username - The logger's display name
 * @param volume - The volume of water in milliliters
 * @returns Formatted notification body string
 */
export function buildIntakeNotificationBody(username: string, volume: number): string {
  return `${username} just drank ${volume}ml`;
}

/**
 * Build nudge notification body (max 100 chars).
 * @param username - The sender's display name
 * @returns Formatted nudge body string, truncated to 100 characters
 */
export function buildNudgeNotificationBody(username: string): string {
  return `${username} says: Stay hydrated! 💧`.slice(0, 100);
}
