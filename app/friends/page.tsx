'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSession, onAuthStateChange } from '@/lib/auth';
import {
  canAccessFeature,
  addCloseFriend,
  removeCloseFriend,
  removeFriend,
  getCloseFriends,
  getWhoMarkedMeClose,
  getNudgeCooldown,
  sendNudge,
  getCloseFriendIntakeEntries,
} from '@/lib/friends';
import { EnhancedFriendProgress, IntakeEntry } from '@/lib/types';
import FriendCard from '@/components/FriendCard';
import FriendSearch from '@/components/FriendSearch';
import InviteShare from '@/components/InviteShare';
import PendingRequests from '@/components/PendingRequests';

export default function FriendsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<EnhancedFriendProgress[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [intakeEntriesMap, setIntakeEntriesMap] = useState<Record<string, IntakeEntry[]>>({});
  const [intakeEntriesLoading, setIntakeEntriesLoading] = useState<Record<string, boolean>>({});
  const [intakeEntriesError, setIntakeEntriesError] = useState<Record<string, string | null>>({});
  const [connectionIdMap, setConnectionIdMap] = useState<Record<string, string>>({});

  // Load session on mount and listen for auth changes
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const currentSession = await getSession();
      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    }

    loadSession();

    const { unsubscribe } = onAuthStateChange((newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Load friends list with enhanced data
  const loadFriends = useCallback(async (userId: string) => {
    setFriendsLoading(true);

    // Get accepted friend connections where current user is either userId or friendId
    const { data: connections, error } = await supabase
      .from('friend_connections')
      .select('id, user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error || !connections) {
      setFriendsLoading(false);
      return;
    }

    // Extract friend IDs and build connection ID map
    const friendIds: string[] = [];
    const connIdMap: Record<string, string> = {};
    for (const conn of connections) {
      const friendId = conn.user_id === userId ? conn.friend_id : conn.user_id;
      friendIds.push(friendId);
      connIdMap[friendId] = conn.id;
    }

    if (friendIds.length === 0) {
      setFriends([]);
      setFriendsLoading(false);
      return;
    }

    // Load profiles for friends
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, daily_goal, current_streak')
      .in('id', friendIds);

    if (!profiles) {
      setFriendsLoading(false);
      return;
    }

    // Load today's intake for each friend
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data: intakeEntries } = await supabase
      .from('intake_entries')
      .select('user_id, volume')
      .in('user_id', friendIds)
      .gte('timestamp', startOfDay)
      .lt('timestamp', endOfDay);

    // Build intake map for today's totals
    const intakeMap: Record<string, number> = {};
    if (intakeEntries) {
      for (const entry of intakeEntries) {
        intakeMap[entry.user_id] = (intakeMap[entry.user_id] || 0) + entry.volume;
      }
    }

    // Query close friends: who I marked as close (I grant them access to MY entries)
    const iMarkedCloseIds = await getCloseFriends(userId);
    const iMarkedCloseSet = new Set(iMarkedCloseIds);

    // Query reverse: who marked ME as close (they grant me access to THEIR entries)
    const theyMarkedMeCloseIds = await getWhoMarkedMeClose(userId);
    const theyMarkedMeCloseSet = new Set(theyMarkedMeCloseIds);

    // Get last intake timestamp for each friend (most recent entry)
    const lastIntakeTimestamps: Record<string, string | null> = {};
    await Promise.all(
      friendIds.map(async (friendId) => {
        const { data } = await supabase
          .from('intake_entries')
          .select('timestamp')
          .eq('user_id', friendId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();
        lastIntakeTimestamps[friendId] = data?.timestamp ?? null;
      })
    );

    // Check device token existence for each friend
    const hasDeviceTokenMap: Record<string, boolean> = {};
    await Promise.all(
      friendIds.map(async (friendId) => {
        const { count } = await supabase
          .from('device_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', friendId);
        hasDeviceTokenMap[friendId] = (count ?? 0) > 0;
      })
    );

    // Get nudge cooldown info for each friend
    const nudgeCooldowns: Record<string, string | null> = {};
    await Promise.all(
      friendIds.map(async (friendId) => {
        const cooldown = await getNudgeCooldown(userId, friendId);
        nudgeCooldowns[friendId] = cooldown.expiresAt;
      })
    );

    // Build EnhancedFriendProgress list
    const enhancedFriends: EnhancedFriendProgress[] = profiles.map((profile) => {
      const iMarkedThem = iMarkedCloseSet.has(profile.id);
      const theyMarkedMe = theyMarkedMeCloseSet.has(profile.id);
      return {
        userId: profile.id,
        username: profile.username,
        currentIntake: intakeMap[profile.id] || 0,
        dailyGoal: profile.daily_goal,
        currentStreak: profile.current_streak || 0,
        isCloseFriend: iMarkedThem, // kept for backward compat
        iMarkedThemClose: iMarkedThem,
        theyMarkedMeClose: theyMarkedMe,
        isMutualCloseFriend: iMarkedThem && theyMarkedMe,
        lastIntakeTimestamp: lastIntakeTimestamps[profile.id] ?? null,
        hasDeviceToken: hasDeviceTokenMap[profile.id] ?? false,
        nudgeCooldownExpiresAt: nudgeCooldowns[profile.id] ?? null,
      };
    });

    setConnectionIdMap(connIdMap);

    setFriends(enhancedFriends);
    setFriendsLoading(false);

    // Load intake entries for friends who marked me as close (I can see their entries)
    const closeFriendEntries: Record<string, IntakeEntry[]> = {};
    const loadingState: Record<string, boolean> = {};
    const errorState: Record<string, string | null> = {};

    const canViewEntriesFor = theyMarkedMeCloseIds.filter((id) => friendIds.includes(id));

    for (const friendId of canViewEntriesFor) {
      loadingState[friendId] = true;
    }
    setIntakeEntriesLoading(loadingState);

    await Promise.all(
      canViewEntriesFor.map(async (friendId) => {
        try {
          const entries = await getCloseFriendIntakeEntries(friendId);
          closeFriendEntries[friendId] = entries;
          errorState[friendId] = null;
        } catch {
          closeFriendEntries[friendId] = [];
          errorState[friendId] = 'Could not load entries';
        }
      })
    );

    setIntakeEntriesMap(closeFriendEntries);
    setIntakeEntriesLoading({});
    setIntakeEntriesError(errorState);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;
    const userId = session.user.id;
    loadFriends(userId);

    // Subscribe to real-time changes on intake_entries, profiles, close_friends, and nudges
    const channelName = `friends-enhanced-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intake_entries' },
        () => {
          if (!cancelled) loadFriends(userId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          if (!cancelled) loadFriends(userId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'close_friends' },
        () => {
          if (!cancelled) loadFriends(userId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nudges' },
        () => {
          if (!cancelled) loadFriends(userId);
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [session, loadFriends]);

  // Action handlers
  const handleMarkCloseFriend = async (friendId: string) => {
    if (!session?.user?.id) return;
    await addCloseFriend(session.user.id, friendId);
    await loadFriends(session.user.id);
  };

  const handleRemoveCloseFriend = async (friendId: string) => {
    if (!session?.user?.id) return;
    await removeCloseFriend(session.user.id, friendId);
    await loadFriends(session.user.id);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!session?.user?.id) return;
    const connId = connectionIdMap[friendId];
    if (!connId) return;
    await removeFriend(connId);
    await loadFriends(session.user.id);
  };

  const handleNudge = async (friendId: string) => {
    if (!session?.user?.id) return;
    await sendNudge(session.user.id, friendId);
    await loadFriends(session.user.id);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  // Authentication gate
  const isAuthenticated = !!session;
  if (!canAccessFeature('friends', isAuthenticated)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen font-mono p-6 text-center">
        <p className="text-foreground text-sm mb-2">Sign in to access Friends</p>
        <p className="text-muted text-xs">
          Friends features require authentication. Please sign in from the Auth page.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 font-mono max-w-[390px] mx-auto">
      {/* Connectivity indicator */}
      {!connected && (
        <div className="flex items-center gap-2 mb-4 p-2 border border-border">
          <span className="w-2 h-2 bg-foreground animate-pulse" />
          <span className="text-xs text-muted">Real-time disconnected. Reconnecting...</span>
        </div>
      )}

      {/* Page header */}
      <h1 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wide">
        Friends
      </h1>

      {/* Pending friend requests */}
      <PendingRequests />

      {/* Friends list */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
          Activity
        </h2>
        {friendsLoading ? (
          <p className="text-xs text-muted animate-pulse">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="text-xs text-muted">
            No friends yet. Search for users or share your invite link below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((friend) => (
              <FriendCard
                key={friend.userId}
                friend={friend}
                intakeEntries={intakeEntriesMap[friend.userId]}
                entriesLoading={intakeEntriesLoading[friend.userId] ?? false}
                entriesError={intakeEntriesError[friend.userId] ?? null}
                onMarkCloseFriend={() => handleMarkCloseFriend(friend.userId)}
                onRemoveCloseFriend={() => handleRemoveCloseFriend(friend.userId)}
                onRemoveFriend={() => handleRemoveFriend(friend.userId)}
                onNudge={friend.isMutualCloseFriend ? () => handleNudge(friend.userId) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add Friend button */}
      <button
        onClick={() => setShowAddFriend(!showAddFriend)}
        className="w-full mb-6 flex items-center justify-center gap-2 border border-border px-4 py-3 text-sm font-mono text-foreground bg-background hover:bg-foreground hover:text-background transition-colors"
      >
        <span>{showAddFriend ? 'Close' : '+ Add Friend'}</span>
      </button>

      {/* Add friend panel (search + invite) */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mb-6 space-y-6">
              {/* Friend search */}
              <section>
                <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                  Find Friends
                </h2>
                <FriendSearch />
              </section>

              {/* Invite share */}
              <section>
                <InviteShare userId={session!.user.id} />
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
