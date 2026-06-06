'use client';

import { useState } from 'react';
import { sendMagicLink } from '@/lib/auth';
import { Mail, Loader2, Droplets } from 'lucide-react';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send magic link';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <Droplets size={48} className="text-foreground" />
          <h1 className="text-2xl font-bold text-center">Water Reminder</h1>
          <p className="text-sm text-muted text-center">
            Track your daily hydration goals
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          <p className="text-sm text-muted text-center">
            Enter your email to sign in or create an account
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
              <span>{loading ? 'Sending...' : 'Continue with Email'}</span>
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
      </div>
    </main>
  );
}
