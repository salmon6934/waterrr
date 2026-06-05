import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Sends a magic link to the provided email address for passwordless authentication.
 * @param email - The user's email address
 * @throws Error if the magic link cannot be sent
 */
export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    throw error;
  }
}

/**
 * Retrieves the current user session.
 * @returns The current session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session;
}

/**
 * Signs the user out and clears the session.
 * @throws Error if sign out fails
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Registers a listener for authentication state changes.
 * @param callback - Function invoked with the session (or null) whenever auth state changes
 * @returns An unsubscribe function to remove the listener
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
