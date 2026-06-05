/**
 * Haptic feedback helpers wrapping Capacitor Haptics.
 * Provides graceful no-op fallback for web/dev environments where
 * native haptics are unavailable.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Check if Capacitor Haptics is available on the current platform.
 * Returns false in browser/dev environments where native plugins aren't loaded.
 */
async function isHapticsAvailable(): Promise<boolean> {
  try {
    // Capacitor plugins throw or are undefined in web environments
    // A quick call to check availability
    if (typeof Haptics === 'undefined' || Haptics === null) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Trigger a short haptic vibration for quick-add button taps.
 * Uses ImpactStyle.Light for a subtle, responsive tap feel.
 *
 * Validates: Requirement 5.1
 */
export async function triggerQuickAddHaptic(): Promise<void> {
  try {
    if (!(await isHapticsAvailable())) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Silently fail in environments where haptics aren't supported
  }
}

/**
 * Trigger a success haptic pattern for 100% daily goal completion.
 * Uses NotificationType.Success for a distinct celebratory feedback.
 *
 * Validates: Requirement 5.2
 */
export async function triggerGoalCompletionHaptic(): Promise<void> {
  try {
    if (!(await isHapticsAvailable())) return;
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Silently fail in environments where haptics aren't supported
  }
}
