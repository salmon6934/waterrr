'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { acceptFriendRequest } from '@/lib/friends';
import { Check, X } from 'lucide-react';

interface PendingRequest {
  id: string;
  userId: string;
  username: string;
}

export default function PendingRequests({ refreshKey, onAccept }: { refreshKey?: number; onAccept?: () => void }) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const session = await getSession();
    if (!session) return;

    const userId = session.user.id;

    // Get pending connections where current user is the friend (receiver)
    const { data, error } = await supabase
      .from('friend_connections')
      .select('id, user_id')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error || !data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Get usernames for the senders
    const senderIds = data.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', senderIds);

    const usernameMap: Record<string, string> = {};
    if (profiles) {
      for (const p of profiles) {
        usernameMap[p.id] = p.username;
      }
    }

    const pending: PendingRequest[] = data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: usernameMap[r.user_id] || 'Unknown',
    }));

    setRequests(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, refreshKey]);

  async function handleAccept(connectionId: string) {
    try {
      await acceptFriendRequest(connectionId);
      setRequests((prev) => prev.filter((r) => r.id !== connectionId));
      onAccept?.();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  }

  async function handleDecline(connectionId: string) {
    try {
      await supabase
        .from('friend_connections')
        .delete()
        .eq('id', connectionId);
      setRequests((prev) => prev.filter((r) => r.id !== connectionId));
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  }

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
        Pending Requests
      </h2>
      <div className="flex flex-col gap-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between border border-border p-3"
          >
            <span className="text-sm text-foreground font-mono">{req.username}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(req.id)}
                className="p-1 border border-border hover:bg-foreground hover:text-background transition-colors"
                aria-label={`Accept request from ${req.username}`}
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                className="p-1 border border-border hover:bg-foreground hover:text-background transition-colors"
                aria-label={`Decline request from ${req.username}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
