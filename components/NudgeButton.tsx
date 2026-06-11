'use client';

import { useState, useEffect } from 'react';

interface NudgeButtonProps {
  isInactive: boolean;
  hasDeviceToken: boolean;
  cooldownExpiresAt: string | null;
  onNudge: () => Promise<void>;
}

/**
 * Formats a cooldown duration in seconds into a human-readable string.
 * Uses hours when remaining time is >= 3600 seconds, minutes otherwise.
 * Values are computed with Math.floor.
 *
 * Validates: Requirements 4.7
 */
export function formatCooldownTime(remainingSeconds: number): string {
  if (remainingSeconds >= 3600) {
    const hours = Math.floor(remainingSeconds / 3600);
    return `${hours}h remaining`;
  }
  const minutes = Math.floor(remainingSeconds / 60);
  return `${minutes}m remaining`;
}

/**
 * Nudge button component for sending push notifications to inactive friends.
 *
 * - Hidden when friend has no device token or is not inactive (Requirements 4.8, 4.9)
 * - Disabled with cooldown timer when cooldown is active (Requirement 4.5, 4.7)
 * - Shows error inline on send failure, keeps button enabled (Requirement 4.6)
 */
export default function NudgeButton({
  isInactive,
  hasDeviceToken,
  cooldownExpiresAt,
  onNudge,
}: NudgeButtonProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Compute remaining cooldown seconds and update every minute
  useEffect(() => {
    function computeRemaining(): number {
      if (!cooldownExpiresAt) return 0;
      const expiresAt = new Date(cooldownExpiresAt).getTime();
      const now = Date.now();
      const diff = Math.floor((expiresAt - now) / 1000);
      return diff > 0 ? diff : 0;
    }

    setRemainingSeconds(computeRemaining());

    const interval = setInterval(() => {
      const remaining = computeRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [cooldownExpiresAt]);

  // Hide button when friend has no device token or is not inactive
  if (!hasDeviceToken || !isInactive) {
    return null;
  }

  const isCooldownActive = remainingSeconds > 0;

  async function handleNudge() {
    setError(null);
    setSending(true);
    try {
      await onNudge();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not send nudge';
      setError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="font-mono">
      <button
        type="button"
        disabled={isCooldownActive || sending}
        onClick={handleNudge}
        className={`w-full border border-border px-3 py-1.5 text-xs transition-colors ${
          isCooldownActive || sending
            ? 'text-muted cursor-not-allowed opacity-60'
            : 'text-foreground hover:bg-foreground hover:text-background'
        }`}
      >
        {sending
          ? 'Sending...'
          : isCooldownActive
            ? formatCooldownTime(remainingSeconds)
            : '👋 Nudge'}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
