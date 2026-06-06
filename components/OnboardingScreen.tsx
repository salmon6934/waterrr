'use client';

import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User, Loader2 } from 'lucide-react';

interface OnboardingScreenProps {
  session: Session;
  onComplete: () => void;
}

export default function OnboardingScreen({ session, onComplete }: OnboardingScreenProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: session.user.id,
        email: session.user.email,
        username: trimmed,
        daily_goal: 2000,
        current_streak: 0,
        last_completed_date: null,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        // If profile already exists (race condition), just proceed
        if (insertError.code === '23505') {
          onComplete();
          return;
        }
        throw insertError;
      }

      onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border border-border flex items-center justify-center">
            <User size={32} className="text-muted" />
          </div>
          <h1 className="text-2xl font-bold text-center">Set Up Profile</h1>
          <p className="text-sm text-muted text-center">
            Choose a display name to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-mono text-muted mb-1">
              Display Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              required
              disabled={loading}
              maxLength={30}
              className="w-full border border-border bg-background text-foreground px-4 py-3 font-mono placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
            />
          </div>

          <div className="border border-border p-3 space-y-1">
            <p className="text-xs text-muted">Email</p>
            <p className="font-mono text-sm text-foreground break-all">
              {session.user.email}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full flex items-center justify-center gap-2 border border-border px-4 py-3 text-background bg-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span>Get Started</span>
            )}
          </button>
        </form>

        {error && (
          <p className="text-sm text-foreground border border-border p-3 text-center">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
