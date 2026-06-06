'use client';

import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSession, signOut, onAuthStateChange } from '@/lib/auth';
import { LogOut, User } from 'lucide-react';

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSession().then((s) => setSession(s));

    const { unsubscribe } = onAuthStateChange((s) => {
      setSession(s);
    });

    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pb-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border border-border flex items-center justify-center">
            <User size={32} className="text-muted" />
          </div>
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
