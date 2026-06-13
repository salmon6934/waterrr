/**
 * Friend connection utilities for the Water Reminder app.
 * Provides feature access gating, user search, friend requests,
 * and invite link generation/parsing.
 */

import { supabase } from './supabase';
import { UserProfile, FriendConnection, IntakeEntry } from './types';
import { getISTDayStartUTC, getISTDayEndUTC } from './timezone';

/** Feature identifiers for access gating. */
export type Feature = 'intake' | 'reminders' | 'theme' | 'friends' | 'friend-progress';

const socialFeatures: Feature[] = ['friends', 'friend-progress'];

/**
 * Determines whether a given feature is accessible based on authentication state.
 * Local features (intake, reminders, theme) are always accessible.
 * Social features (friends, friend-progress) require authentication.
 */
export function canAccessFeature(
  feature: Feature,
  isAuthenticated: boolean
): boolean {
  if (socialFeatures.includes(feature)) return isAuthenticated;
  return true;
}

/** Base URL used for invite link generation. */
const INVITE_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/friends`
  : 'https://app.example.com/friends';

/**
 * Searches for user profiles by username substring (case-insensitive).
 * Returns matching profiles excluding the current user.
 * @param query - The username substring to search for
 * @returns Array of matching UserProfile objects
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, daily_goal, created_at')
    .ilike('username', `%${query.trim()}%`);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data
    .filter((profile) => profile.id !== currentUserId)
    .map((profile) => ({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      dailyGoal: profile.daily_goal,
      createdAt: profile.created_at,
    }));
}

/**
 * Sends a friend request to the target user by creating a pending connection.
 * Throws if the target user does not exist or if the request fails.
 * @param targetUserId - The Supabase user ID of the target user
 */
export async function sendFriendRequest(targetUserId: string): Promise<void> {
  // Verify target user exists
  const { data: targetUser, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .single();

  if (lookupError || !targetUser) {
    throw new Error('User not found');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be authenticated to send a friend request');
  }

  // Create pending friend connection
  const { error } = await supabase
    .from('friend_connections')
    .insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'pending',
    });

  if (error) {
    throw new Error(`Failed to send friend request: ${error.message}`);
  }

  // Send push notification to recipient (fire-and-forget)
  supabase.functions.invoke('send-push-notification', {
    body: { senderId: user.id, recipientId: targetUserId },
  }).catch(() => {});
}

/**
 * Accepts a pending friend request by updating its status to 'accepted'.
 * @param connectionId - The ID of the friend connection to accept
 */
export async function acceptFriendRequest(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to accept friend request: ${error.message}`);
  }
}

/**
 * Generates a shareable invite link encoding the given user ID.
 * The link can be shared or encoded as a QR code.
 * @param userId - The user ID to encode in the invite link
 * @returns A full URL string with the userId as a query parameter
 */
export function generateInviteLink(userId: string): string {
  return `${INVITE_BASE_URL}?invite=${encodeURIComponent(userId)}`;
}

/**
 * Parses an invite link and extracts the user ID.
 * @param link - The invite link URL to parse
 * @returns The userId string if valid, or null if the link is invalid
 */
export function parseInviteLink(link: string): string | null {
  try {
    const url = new URL(link);
    const invite = url.searchParams.get('invite');
    if (!invite || invite.trim().length === 0) {
      return null;
    }
    return decodeURIComponent(invite);
  } catch {
    return null;
  }
}

/**
 * Given a list of FriendConnection records, returns the set of friend user IDs
 * for the specified user. A friend connection is symmetric: if A->B is accepted,
 * both A is a friend of B and B is a friend of A.
 * @param connections - Array of FriendConnection records
 * @param userId - The user whose friends to retrieve
 * @returns Array of user IDs who are friends with the given user
 */
export function getFriendsForUser(
  connections: FriendConnection[],
  userId: string
): string[] {
  const friends: string[] = [];
  for (const conn of connections) {
    if (conn.status !== 'accepted') continue;
    if (conn.userId === userId) {
      friends.push(conn.friendId);
    } else if (conn.friendId === userId) {
      friends.push(conn.userId);
    }
  }
  return friends;
}

/**
 * Builds the notification body for a friend request push notification.
 * @param username - The sender's display name
 * @returns Formatted notification body string containing the sender's username
 */
export function buildFriendRequestNotificationBody(username: string): string {
  return `${username} sent you a friend request`;
}

/**
 * Builds the nudge notification body for a sender.
 * The body includes the sender's username and a static encouragement message.
 * The total body length is guaranteed to be at most 100 characters.
 * @param username - The sender's display name (1–30 chars)
 * @returns Notification body string (max 100 chars)
 */
export function buildNudgeNotificationBody(username: string): string {
  const message = `${username} reminds you to drink water! 💧`;
  // Ensure total length does not exceed 100 characters
  if (message.length > 100) {
    return message.slice(0, 100);
  }
  return message;
}

/**
 * Builds the notification body for a close friend intake notification.
 * @param username - The logger's display name
 * @param volume - The volume of water logged in milliliters
 * @returns Formatted notification body string
 */
export function buildCloseFriendIntakeNotificationBody(
  username: string,
  volume: number
): string {
  return `${username} just drank ${volume}ml`;
}

/**
 * Determines whether a close friend intake notification is rate limited.
 * Rate limit window is 60 minutes (3600000 ms).
 * @param lastSentAt - ISO 8601 timestamp of the last notification sent, or null if none
 * @param now - The current date/time
 * @returns true if rate limited (notification should be suppressed), false otherwise
 */
export function isCloseFriendNotificationRateLimited(
  lastSentAt: string | null,
  now: Date
): boolean {
  if (lastSentAt === null) {
    return false;
  }
  const elapsed = now.getTime() - new Date(lastSentAt).getTime();
  return elapsed < 3600000;
}

/**
 * Removes a friend connection and cleans up close_friends in both directions.
 * @param connectionId - The ID of the friend connection to remove
 * @param userId - The current authenticated user's ID
 * @param friendId - The friend being removed
 */
export async function removeFriend(
  connectionId: string,
  userId: string,
  friendId: string
): Promise<void> {
  // Remove close friend designations in both directions
  await supabase
    .from('close_friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  await supabase
    .from('close_friends')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId);

  // Remove the friend connection itself
  const { error } = await supabase
    .from('friend_connections')
    .delete()
    .eq('id', connectionId);

  if (error) {
    throw new Error(`Failed to remove friend: ${error.message}`);
  }
}

/**
 * Sends a nudge notification to an inactive friend by invoking the
 * `send-nudge` Supabase Edge Function.
 * @param senderId - The user ID of the nudge sender
 * @param receiverId - The user ID of the inactive friend to nudge
 * @returns Object containing the sentAt timestamp from the server
 */
export async function sendNudge(
  senderId: string,
  receiverId: string
): Promise<{ sentAt: string }> {
  const { data, error } = await supabase.functions.invoke('send-nudge', {
    body: { senderId, receiverId },
  });

  if (error) {
    throw new Error(`Failed to send nudge: ${error.message}`);
  }

  if (!data || !data.sentAt) {
    throw new Error('Nudge response missing sentAt timestamp');
  }

  return { sentAt: data.sentAt };
}

/**
 * Pure computation for nudge cooldown logic.
 * Determines whether a nudge cooldown is active based on the sent_at timestamp
 * and the current time. Cooldown period is 24 hours (86400000 ms).
 * @param sentAt - ISO 8601 timestamp of the last nudge sent, or null if no nudge exists
 * @param now - The current date/time to compare against
 * @returns Object with `active` (true if cooldown is in effect) and `expiresAt` (ISO string or null)
 */
export function computeNudgeCooldown(
  sentAt: string | null,
  now: Date
): { active: boolean; expiresAt: string | null } {
  if (!sentAt) {
    return { active: false, expiresAt: null };
  }

  const sentAtDate = new Date(sentAt);
  const cooldownMs = 2 * 60 * 60 * 1000; // 2 hours
  const expiresAt = new Date(sentAtDate.getTime() + cooldownMs);

  if (now < expiresAt) {
    return { active: true, expiresAt: expiresAt.toISOString() };
  }

  return { active: false, expiresAt: null };
}

/**
 * Checks whether the nudge cooldown is active between a sender and receiver.
 * Queries the `nudges` table for the most recent nudge between the pair and
 * determines if it was sent within the last 24 hours.
 * @param senderId - The sender's user ID
 * @param receiverId - The receiver's user ID
 * @returns Object with `active` (true if cooldown is in effect) and `expiresAt` (ISO string or null)
 */
export async function getNudgeCooldown(
  senderId: string,
  receiverId: string
): Promise<{ active: boolean; expiresAt: string | null }> {
  const { data, error } = await supabase
    .from('nudges')
    .select('sent_at')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query nudge cooldown: ${error.message}`);
  }

  if (!data) {
    return { active: false, expiresAt: null };
  }

  const sentAt = new Date(data.sent_at);
  const cooldownMs = 2 * 60 * 60 * 1000; // 2 hours
  const expiresAt = new Date(sentAt.getTime() + cooldownMs);
  const now = new Date();

  if (now < expiresAt) {
    return { active: true, expiresAt: expiresAt.toISOString() };
  }

  return { active: false, expiresAt: null };
}

/**
 * Determines whether a friend is considered inactive based on their most
 * recent intake timestamp. A friend is inactive if they have no recorded
 * intake (null) or if the time since their last intake exceeds 24 hours.
 * @param lastIntakeTimestamp - ISO 8601 timestamp of the friend's last intake, or null
 * @param now - The current date/time to compare against
 * @returns true if the friend is inactive, false otherwise
 */
export function isInactive(
  lastIntakeTimestamp: string | null,
  now: Date
): boolean {
  if (lastIntakeTimestamp === null) {
    return true;
  }

  const lastIntake = new Date(lastIntakeTimestamp);
  const deltaMs = now.getTime() - lastIntake.getTime();

  return deltaMs > 600000; // 10 minutes in milliseconds
}

/**
 * Checks whether a friend has at least one registered device token
 * for push notifications.
 * @param friendId - The friend's user ID to check
 * @returns true if at least one device token exists, false otherwise
 */
export async function friendHasDeviceToken(friendId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('device_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', friendId);

  if (error) {
    throw new Error(`Failed to check device token: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Marks a friend as a close friend by inserting into the close_friends table.
 * @param userId - The current user's ID
 * @param friendId - The friend to designate as a close friend
 */
export async function addCloseFriend(userId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('close_friends')
    .insert({ user_id: userId, friend_id: friendId });

  if (error) {
    throw new Error(`Failed to add close friend: ${error.message}`);
  }

  // Send push notification to the friend (fire-and-forget)
  supabase.functions.invoke('send-close-friend-added-notification', {
    body: { userId, friendId },
  }).catch(() => {});
}

/**
 * Removes a close friend designation by deleting from the close_friends table.
 * @param userId - The current user's ID
 * @param friendId - The friend to remove from close friends
 */
export async function removeCloseFriend(userId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('close_friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  if (error) {
    throw new Error(`Failed to remove close friend: ${error.message}`);
  }
}

/**
 * Gets the list of close friend IDs for a user.
 * These are the friends that the user has marked as close (granting them access to user's entries).
 * @param userId - The user whose close friends to retrieve
 * @returns Array of friend user IDs designated as close friends
 */
export async function getCloseFriends(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('close_friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get close friends: ${error.message}`);
  }

  return (data || []).map((row) => row.friend_id);
}

/**
 * Gets the list of user IDs who have marked the given user as their close friend.
 * These are friends who have granted access to view their entries.
 * @param userId - The user to check
 * @returns Array of user IDs who marked this user as a close friend
 */
export async function getWhoMarkedMeClose(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('close_friends')
    .select('user_id')
    .eq('friend_id', userId);

  if (error) {
    throw new Error(`Failed to get who marked me close: ${error.message}`);
  }

  return (data || []).map((row) => row.user_id);
}

/**
 * Formats an IntakeEntry for display, showing the volume in milliliters
 * and the timestamp formatted as HH:MM (24-hour local time).
 * @param entry - The IntakeEntry to format
 * @returns A formatted string containing volume and HH:MM timestamp
 */
export function formatIntakeEntry(entry: IntakeEntry): string {
  const date = new Date(entry.timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${entry.volume}ml at ${hours}:${minutes}`;
}

/**
 * Gets a close friend's intake entries for today (IST), limited to 50,
 * ordered by most recent first.
 * @param friendId - The close friend's user ID
 * @returns Array of IntakeEntry objects for today
 */
export async function getCloseFriendIntakeEntries(friendId: string): Promise<IntakeEntry[]> {
  const todayStart = getISTDayStartUTC();
  const todayEnd = getISTDayEndUTC();

  const { data, error } = await supabase
    .from('intake_entries')
    .select('id, volume, timestamp, user_id')
    .eq('user_id', friendId)
    .gte('timestamp', todayStart)
    .lt('timestamp', todayEnd)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch intake entries: ${error.message}`);
  }

  return (data || []).map((entry) => ({
    id: entry.id,
    volume: entry.volume,
    timestamp: entry.timestamp,
    userId: entry.user_id,
  }));
}
