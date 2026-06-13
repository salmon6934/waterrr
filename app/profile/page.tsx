'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { getSession, signOut, onAuthStateChange } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { LogOut, Pencil, Settings, User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      if (s) loadUsername(s.user.id);
    });

    const { unsubscribe } = onAuthStateChange((s) => {
      setSession(s);
      if (s) loadUsername(s.user.id);
    });

    return () => unsubscribe();
  }, []);

  async function loadUsername(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (data) setUsername(data.username);
  }

  async function handleSignOut() {
    try {
      // Clear localStorage so next user doesn't inherit stale data
      localStorage.removeItem('water_reminder_intake_entries');
      localStorage.removeItem('water_reminder_daily_goal');
      localStorage.removeItem('water_reminder_streak');
      localStorage.removeItem('water_reminder_reminders');
      await signOut();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 pb-20">
      <button
        onClick={() => router.push('/settings')}
        className="absolute top-4 right-4 p-2 text-foreground hover:text-muted transition-colors"
        aria-label="Settings"
      >
        <Settings size={24} />
      </button>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border border-border flex items-center justify-center">
            <User size={32} className="text-muted" />
          </div>
          {username && (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-foreground">{username}</p>
              <button
                onClick={() => router.push('/profile/edit')}
                className="p-1 text-muted hover:text-foreground transition-colors"
                aria-label="Edit profile"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
          <h1 className="text-2xl font-bold text-center">Profile</h1>
        </div>

        <div className="border border-border p-4 space-y-2">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-mono text-foreground break-all">
            {session.user.email}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 border border-border px-4 py-3 text-foreground bg-background hover:bg-foreground hover:text-background transition-colors"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>

        {error && (
          <p className="text-sm text-foreground border border-border p-2 bg-background">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
