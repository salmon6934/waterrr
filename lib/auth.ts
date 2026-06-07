import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Signs up a new user with email and password.
 * @param email - The user's email address
 * @param password - The user's password
 * @throws Error if signup fails
 */
export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
}

/**
 * Signs in a user with email and password.
 * @param email - The user's email address
 * @param password - The user's password
 * @throws Error if sign in fails
 */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
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
