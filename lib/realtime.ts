/**
 * Real-time friend progress subscriptions module.
 * Subscribes to Supabase realtime changes on intake_entries and profiles tables
 * for the user's accepted friends. Provides callback-based updates and
 * connectivity status tracking with auto-reconnect.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { FriendProgress } from './types';

/** Connectivity status for the real-time connection. */
export type RealtimeStatus = 'connected' | 'disconnected' | 'connecting';

/** Callback invoked when friend progress data changes. */
export type FriendProgressCallback = (friends: FriendProgress[]) => void;

/** Callback invoked when connectivity status changes. */
export type StatusCallback = (status: RealtimeStatus) => void;

/** Options for initializing real-time subscriptions. */
export interface RealtimeSubscriptionOptions {
  userId: string;
  onFriendsUpdate: FriendProgressCallback;
  onStatusChange?: StatusCallback;
}

/** Internal state for managing the subscription lifecycle. */
interface SubscriptionState {
  channel: RealtimeChannel | null;
  userId: string;
  friendIds: string[];
  status: RealtimeStatus;
  onFriendsUpdate: FriendProgressCallback;
  onStatusChange?: StatusCallback;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

let state: SubscriptionState | null = null;

/**
 * Fetches the list of accepted friend IDs for the given user.
 */
async function fetchFriendIds(userId: string): Promise<string[]> {
  const { data: connections, error } = await supabase
    .from('friend_connections')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error || !connections) return [];

  return connections.map((conn) =>
    conn.user_id === userId ? conn.friend_id : conn.user_id
  );
}

/**
 * Fetches current friend progress data (profiles + today's intake).
 */
async function fetchFriendProgress(friendIds: string[]): Promise<FriendProgress[]> {
  if (friendIds.length === 0) return [];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, daily_goal, current_streak')
    .in('id', friendIds);

  if (!profiles) return [];

  // Fetch today's intake entries for friends
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).toISOString();
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  ).toISOString();

  const { data: intakeEntries } = await supabase
    .from('intake_entries')
    .select('user_id, volume')
    .in('user_id', friendIds)
    .gte('timestamp', startOfDay)
    .lt('timestamp', endOfDay);

  // Build intake totals map
  const intakeMap: Record<string, number> = {};
  if (intakeEntries) {
    for (const entry of intakeEntries) {
      intakeMap[entry.user_id] = (intakeMap[entry.user_id] || 0) + entry.volume;
    }
  }

  // Build FriendProgress list
  return profiles.map((profile) => ({
    userId: profile.id,
    username: profile.username,
    currentIntake: intakeMap[profile.id] || 0,
    dailyGoal: profile.daily_goal,
    currentStreak: profile.current_streak || 0,
  }));
}

/**
 * Updates the connectivity status and notifies the listener.
 */
function setStatus(newStatus: RealtimeStatus): void {
  if (!state) return;
  state.status = newStatus;
  state.onStatusChange?.(newStatus);
}

/**
 * Handles incoming real-time changes by refetching friend progress data.
 * This ensures FriendCard data is updated within 5 seconds of a remote change.
 */
async function handleRealtimeChange(): Promise<void> {
  if (!state) return;

  const progress = await fetchFriendProgress(state.friendIds);
  state.onFriendsUpdate(progress);
}

/**
 * Attempts to reconnect after a disconnect by re-subscribing to the channel.
 */
function scheduleReconnect(): void {
  if (!state) return;

  // Clear any existing reconnect timer
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
  }

  state.reconnectTimer = setTimeout(() => {
    if (state && state.status === 'disconnected') {
      // Re-create the subscription
      unsubscribeFromFriendProgress();
      subscribeToFriendProgress({
        userId: state.userId,
        onFriendsUpdate: state.onFriendsUpdate,
        onStatusChange: state.onStatusChange,
      });
    }
  }, 5000);
}

/**
 * Subscribes to real-time changes on intake_entries and profiles tables
 * for the user's accepted friends. Updates are delivered via the onFriendsUpdate
 * callback whenever a friend's intake or profile changes.
 *
 * @param options - Subscription configuration including userId and callbacks
 */
export async function subscribeToFriendProgress(
  options: RealtimeSubscriptionOptions
): Promise<void> {
  const { userId, onFriendsUpdate, onStatusChange } = options;

  // Clean up any existing subscription
  if (state?.channel) {
    await supabase.removeChannel(state.channel);
  }

  // Initialize state
  state = {
    channel: null,
    userId,
    friendIds: [],
    status: 'connecting',
    onFriendsUpdate,
    onStatusChange,
    reconnectTimer: null,
  };

  setStatus('connecting');

  // Fetch friend IDs
  const friendIds = await fetchFriendIds(userId);
  state.friendIds = friendIds;

  // Deliver initial data
  const initialProgress = await fetchFriendProgress(friendIds);
  onFriendsUpdate(initialProgress);

  if (friendIds.length === 0) {
    setStatus('connected');
    return;
  }

  // Create a realtime channel subscribing to intake_entries and profiles changes
  const channel = supabase
    .channel('friend-progress-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'intake_entries',
        filter: `user_id=in.(${friendIds.join(',')})`,
      },
      () => {
        handleRealtimeChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=in.(${friendIds.join(',')})`,
      },
      () => {
        handleRealtimeChange();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setStatus('disconnected');
        scheduleReconnect();
      } else if (status === 'TIMED_OUT') {
        setStatus('disconnected');
        scheduleReconnect();
      }
    });

  state.channel = channel;
}

/**
 * Unsubscribes from all real-time friend progress channels and cleans up state.
 */
export function unsubscribeFromFriendProgress(): void {
  if (!state) return;

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  if (state.channel) {
    supabase.removeChannel(state.channel);
    state.channel = null;
  }

  state = null;
}

/**
 * Returns the current real-time connectivity status.
 * Returns 'disconnected' if no subscription is active.
 */
export function getRealtimeStatus(): RealtimeStatus {
  return state?.status ?? 'disconnected';
}

/**
 * Returns the current list of friend IDs being tracked.
 * Useful for components that need to know which friends are subscribed.
 */
export function getSubscribedFriendIds(): string[] {
  return state?.friendIds ?? [];
}
