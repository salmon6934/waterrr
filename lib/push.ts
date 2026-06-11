/**
 * Push notification utilities for the Water Reminder app.
 * Provides FCM device token registration, removal, and refresh
 * using the Capacitor Firebase Messaging plugin.
 */

import { supabase } from './supabase';

/**
 * Check if FCM is available on the current platform.
 * Returns true only when running on a native Capacitor platform (Android/iOS),
 * not in a regular browser or during SSR.
 */
export function isFCMAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Capacitor sets window.Capacitor on native platforms
    const cap = (window as unknown as Record<string, unknown>).Capacitor as
      | { isNativePlatform?: () => boolean }
      | undefined;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/**
 * Dynamically imports the Capacitor Firebase Messaging plugin.
 * Returns null if the plugin is not installed.
 */
async function getFirebaseMessaging(): Promise<{
  getToken: () => Promise<{ token: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
} | null> {
  try {
    // @ts-ignore -- plugin installed in task 8.2; dynamic import gracefully fails if absent
    const mod = await import('@capacitor-firebase/messaging');
    return mod.FirebaseMessaging;
  } catch {
    return null;
  }
}

/**
 * Register the current device with FCM and store the token in Supabase.
 * Gets the FCM token from the Capacitor plugin and upserts it into
 * the `device_tokens` table.
 * @param userId - The authenticated user's ID
 */
export async function registerDeviceToken(userId: string): Promise<void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging plugin is not available');
  }

  // Request push notification permissions (required on Android 13+)
  const permResult = await messaging.requestPermissions();
  if (permResult.receive !== 'granted') {
    throw new Error('Push notification permission not granted');
  }

  const { token } = await messaging.getToken();

  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { user_id: userId, token },
      { onConflict: 'token' }
    );

  if (error) {
    throw new Error(`Failed to register device token: ${error.message}`);
  }
}

/**
 * Remove all device tokens for the given user on logout.
 * Deletes every row in `device_tokens` matching the user ID.
 * @param userId - The authenticated user's ID
 */
export async function unregisterDeviceToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to unregister device tokens: ${error.message}`);
  }
}

/**
 * Handle an FCM token refresh by replacing the stored token.
 * Deletes existing tokens for the user and inserts the new one.
 * @param userId - The authenticated user's ID
 * @param newToken - The refreshed FCM token string
 */
export async function handleTokenRefresh(
  userId: string,
  newToken: string
): Promise<void> {
  // Delete old tokens for this user
  const { error: deleteError } = await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Failed to remove old device tokens: ${deleteError.message}`);
  }

  // Insert the new token
  const { error: insertError } = await supabase
    .from('device_tokens')
    .insert({ user_id: userId, token: newToken });

  if (insertError) {
    throw new Error(`Failed to store refreshed device token: ${insertError.message}`);
  }
}
