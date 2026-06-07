'use client';

import { useState } from 'react';
import { signUp, signIn } from '@/lib/auth';
import { Mail, Lock, Loader2, Droplets } from 'lucide-react';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        await signUp(email, password);
        setMessage('Account created! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Authentication failed';
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
          <h1 className="text-2xl font-bold text-center">Waterrr</h1>
          <p className="text-sm text-muted text-center">
            Track your daily hydration goals
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <p className="text-sm text-muted text-center">
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
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

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={loading}
                minLength={6}
                className="w-full border border-border bg-background text-foreground pl-10 pr-4 py-3 font-mono placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
                aria-label="Password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 border border-border px-4 py-3 text-background bg-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : null}
              <span>{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
            className="w-full text-center text-sm text-muted hover:text-foreground transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>

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
