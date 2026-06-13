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
  foregroundNotification: { title: string; body: string } | null;
  dismissNotification: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextValue>({
  pushError: null,
  foregroundNotification: null,
  dismissNotification: () => {},
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
  const [foregroundNotification, setForegroundNotification] = useState<{ title: string; body: string } | null>(null);
  const router = useRouter();
  const userIdRef = useRef<string | null>(null);

  function dismissNotification() {
    setForegroundNotification(null);
  }

  // Auto-dismiss foreground notification after 4 seconds
  useEffect(() => {
    if (!foregroundNotification) return;
    const timer = setTimeout(() => setForegroundNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [foregroundNotification]);

  useEffect(() => {
    let tokenRefreshCleanup: (() => void) | null = null;
    let notificationTapCleanup: (() => void) | null = null;
    let foregroundCleanup: (() => void) | null = null;

    async function setupListeners() {
      try {
        const mod = await import('@capacitor-firebase/messaging');
        const FirebaseMessaging = mod.FirebaseMessaging;

        // Listen for foreground notifications
        const foregroundListener = await FirebaseMessaging.addListener(
          'notificationReceived',
          (event: { notification: { title?: string; body?: string } }) => {
            const notification = event.notification;
            if (notification.title || notification.body) {
              setForegroundNotification({
                title: notification.title || '',
                body: notification.body || '',
              });
            }
          }
        );
        foregroundCleanup = () => foregroundListener.remove();

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
      foregroundCleanup?.();
    };
  }, [router]);

  return (
    <PushNotificationContext.Provider value={{ pushError, foregroundNotification, dismissNotification }}>
      {/* Foreground notification toast */}
      {foregroundNotification && (
        <div
          onClick={dismissNotification}
          className="fixed top-4 left-4 right-4 z-50 border border-border bg-background p-3 shadow-lg font-mono cursor-pointer"
          role="alert"
        >
          {foregroundNotification.title && (
            <p className="text-sm font-bold text-foreground">{foregroundNotification.title}</p>
          )}
          {foregroundNotification.body && (
            <p className="text-xs text-muted mt-0.5">{foregroundNotification.body}</p>
          )}
        </div>
      )}
      {children}
    </PushNotificationContext.Provider>
  );
}
