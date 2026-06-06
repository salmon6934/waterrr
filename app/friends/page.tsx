'use client';

import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSession, onAuthStateChange } from '@/lib/auth';
import { canAccessFeature } from '@/lib/friends';
import { FriendProgress } from '@/lib/types';
import FriendCard from '@/components/FriendCard';
import FriendSearch from '@/components/FriendSearch';
import InviteShare from '@/components/InviteShare';
import PendingRequests from '@/components/PendingRequests';

export default function FriendsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProgress[]>([]);
  const [connected, setConnected] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);

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

  // Load friends list and subscribe to real-time updates
  const loadFriends = useCallback(async (userId: string) => {
    // Get accepted friend connections where current user is either userId or friendId
    const { data: connections, error } = await supabase
      .from('friend_connections')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error || !connections) return;

    // Extract friend IDs
    const friendIds = connections.map((conn) =>
      conn.user_id === userId ? conn.friend_id : conn.user_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    // Load profiles for friends
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, daily_goal, current_streak')
      .in('id', friendIds);

    if (!profiles) return;

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

    // Build intake map
    const intakeMap: Record<string, number> = {};
    if (intakeEntries) {
      for (const entry of intakeEntries) {
        intakeMap[entry.user_id] = (intakeMap[entry.user_id] || 0) + entry.volume;
      }
    }

    // Build FriendProgress list
    const friendProgressList: FriendProgress[] = profiles.map((profile) => ({
      userId: profile.id,
      username: profile.username,
      currentIntake: intakeMap[profile.id] || 0,
      dailyGoal: profile.daily_goal,
      currentStreak: profile.current_streak || 0,
    }));

    setFriends(friendProgressList);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;
    loadFriends(userId);

    // Subscribe to real-time changes on intake_entries for friends
    const intakeChannel = supabase
      .channel('friends-intake')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intake_entries' },
        () => {
          // Reload friends data when any intake entry changes
          loadFriends(userId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          // Reload friends data when any profile changes (goal/streak updates)
          loadFriends(userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(intakeChannel);
    };
  }, [session, loadFriends]);

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
        {friends.length === 0 ? (
          <p className="text-xs text-muted">
            No friends yet. Search for users or share your invite link below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((friend) => (
              <FriendCard key={friend.userId} friend={friend} />
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
      {showAddFriend && (
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
      )}
    </div>
  );
}
