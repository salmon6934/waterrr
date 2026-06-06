'use client';

import './globals.css';
import { Space_Mono } from 'next/font/google';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import PageTransition from '../components/PageTransition';
import NavBar from '../components/NavBar';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import { loadTheme } from '../lib/storage';
import { getSession, onAuthStateChange } from '../lib/auth';
import { initBackgroundSync } from '../lib/sync';
import { supabase } from '../lib/supabase';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const theme = loadTheme();
    if (theme.mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Check if user has a profile in Supabase
  async function checkProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    setHasProfile(!!data);
  }

  useEffect(() => {
    // Check current session
    getSession().then(async (s) => {
      setSession(s);
      if (s) {
        await checkProfile(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { unsubscribe } = onAuthStateChange(async (s) => {
      setSession(s);
      if (s) {
        await checkProfile(s.user.id);
      } else {
        setHasProfile(null);
      }
    });

    // Initialize background sync
    const sync = initBackgroundSync();

    return () => {
      unsubscribe();
      sync.unsubscribe();
    };
  }, []);

  function handleOnboardingComplete() {
    setHasProfile(true);
  }

  return (
    <html lang="en" className={spaceMono.className}>
      <head>
        <title>Water Reminder</title>
        <meta name="description" content="Track your daily water intake and stay hydrated" />
      </head>
      <body className="max-w-[390px] mx-auto bg-background text-foreground">
        {loading ? (
          <div className="flex min-h-screen items-center justify-center">
            <p className="font-mono text-muted animate-pulse">Loading...</p>
          </div>
        ) : !session ? (
          <AuthScreen />
        ) : !hasProfile ? (
          <OnboardingScreen session={session} onComplete={handleOnboardingComplete} />
        ) : (
          <>
            <PageTransition>{children}</PageTransition>
            <NavBar />
          </>
        )}
      </body>
    </html>
  );
}
