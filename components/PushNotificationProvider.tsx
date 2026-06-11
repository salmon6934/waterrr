'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '../lib/auth';
import {
  isFCMAvailable,
  registerDeviceToken,
  unregisterDeviceToken,
  handleTokenRefresh,
} from '../lib/push';

interface PushNotificationContextValue {
  pushError: string | null;
}

const PushNotificationContext = createContext<PushNotificationContextValue>({
  pushError: null,
});

export function usePushNotification() {
  return useContext(PushNotificationContext);
}

export default function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pushError, setPushError] = useState<string | null>(null);
  const router = useRouter();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let tokenRefreshCleanup: (() => void) | null = null;
    let notificationTapCleanup: (() => void) | null = null;

    async function setupListeners() {
      try {
        const mod = await import('@capacitor-firebase/messaging');
        const FirebaseMessaging = mod.FirebaseMessaging;

        // Listen for FCM token refresh events
        const tokenListener = await FirebaseMessaging.addListener(
          'tokenReceived',
          async (event: { token: string }) => {
            const currentUserId = userIdRef.current;
            if (currentUserId && event.token) {
              try {
                await handleTokenRefresh(currentUserId, event.token);
              } catch {
                // Silent failure on token refresh per design
              }
            }
          }
        );
        tokenRefreshCleanup = () => tokenListener.remove();

        // Listen for notification tap events
        const tapListener = await FirebaseMessaging.addListener(
          'notificationActionPerformed',
          async () => {
            const currentUserId = userIdRef.current;
            if (currentUserId) {
              router.push('/friends');
            } else {
              router.push('/');
            }
          }
        );
        notificationTapCleanup = () => tapListener.remove();
      } catch {
        // Plugin not available — no-op in browser/dev
      }
    }

    async function handleAuthenticated(userId: string) {
      userIdRef.current = userId;
      if (isFCMAvailable()) {
        try {
          await registerDeviceToken(userId);
          setPushError(null);
        } catch {
          setPushError('Push notifications are unavailable');
        }
      }
    }

    async function handleLogout(previousUserId: string | null) {
      if (previousUserId) {
        try {
          await unregisterDeviceToken(previousUserId);
        } catch {
          // Best effort — don't block logout
        }
      }
      userIdRef.current = null;
    }

    // Initialize: check current session
    getSession().then((session) => {
      if (session) {
        handleAuthenticated(session.user.id);
      }
    });

    // Listen for auth state changes
    const { unsubscribe } = onAuthStateChange((session: Session | null) => {
      if (session) {
        handleAuthenticated(session.user.id);
      } else {
        handleLogout(userIdRef.current);
      }
    });

    // Set up FCM listeners
    setupListeners();

    return () => {
      unsubscribe();
      tokenRefreshCleanup?.();
      notificationTapCleanup?.();
    };
  }, [router]);

  return (
    <PushNotificationContext.Provider value={{ pushError }}>
      {children}
    </PushNotificationContext.Provider>
  );
}
