'use client';

import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { sendMagicLink, getSession, signOut, onAuthStateChange } from '@/lib/auth';
import { Mail, LogOut, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check current session on mount
    getSession().then((s) => setSession(s));

    // Subscribe to auth state changes
    const { unsubscribe } = onAuthStateChange((s) => {
      setSession(s);
    });

    return () => unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await sendMagicLink(email);
      setMessage('Check your email for the login link');
      setEmail('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setSession(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
    }
  }

  // Authenticated state
  if (session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-2xl font-bold text-center">Account</h1>

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

  // Unauthenticated state
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pb-20">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        <p className="text-sm text-muted text-center">
          Enter your email to receive a magic link
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full border border-border bg-background text-foreground pl-10 pr-4 py-3 font-mono placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
              aria-label="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full flex items-center justify-center gap-2 border border-border px-4 py-3 text-background bg-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mail size={18} />
            )}
            <span>{loading ? 'Sending...' : 'Send Magic Link'}</span>
          </button>
        </form>

        {message && (
          <p className="text-sm text-foreground border border-border p-3 text-center">
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm text-foreground border border-border p-3 text-center">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
