/**
 * Friend connection utilities for the Water Reminder app.
 * Provides feature access gating, user search, friend requests,
 * and invite link generation/parsing.
 */

import { supabase } from './supabase';
import { UserProfile, FriendConnection } from './types';

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
