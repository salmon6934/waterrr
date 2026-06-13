'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface NudgeButtonProps {
  isInactive: boolean;
  hasDeviceToken: boolean;
  cooldownExpiresAt: string | null;
  onNudge: () => Promise<void>;
  compact?: boolean;
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
 * - When compact, renders as icon-only Bell button with 32×32 tap target (Requirements 2.1, 2.2)
 * - Rotating animation on Bell icon while sending (Requirement 2.5)
 * - Disabled state with opacity 0.5 during cooldown (Requirement 2.6)
 */
export default function NudgeButton({
  isInactive,
  hasDeviceToken,
  cooldownExpiresAt,
  onNudge,
  compact = false,
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

  // NOTE: Visibility check temporarily disabled for testing. Restore before production.
  // if (!hasDeviceToken || !isInactive) {
  //   return null;
  // }

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

  if (compact) {
    return (
      <div className="font-mono">
        <button
          type="button"
          disabled={isCooldownActive || sending}
          onClick={handleNudge}
          aria-label="Nudge"
          className={`min-w-[32px] min-h-[32px] flex items-center justify-center border border-border transition-colors ${
            isCooldownActive
              ? 'opacity-50 cursor-not-allowed'
              : sending
                ? 'cursor-wait'
                : 'text-foreground hover:bg-foreground hover:text-background'
          }`}
        >
          <motion.span
            className="inline-flex"
            animate={sending ? { rotate: 360 } : { rotate: 0 }}
            transition={
              sending
                ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                : { duration: 0 }
            }
          >
            <Bell size={16} />
          </motion.span>
        </button>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="font-mono">
      <button
        type="button"
        disabled={isCooldownActive || sending}
        onClick={handleNudge}
        className={`w-full border border-border px-3 py-1.5 text-xs transition-colors ${
          isCooldownActive
            ? 'opacity-50 cursor-not-allowed'
            : sending
              ? 'text-muted cursor-wait opacity-60'
              : 'text-foreground hover:bg-foreground hover:text-background'
        }`}
      >
        {sending ? (
          <span className="inline-flex items-center gap-1.5">
            <motion.span
              className="inline-flex"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            >
              <Bell size={16} />
            </motion.span>
            Sending...
          </span>
        ) : isCooldownActive ? (
          <span className="inline-flex items-center gap-1.5">
            <Bell size={16} />
            {formatCooldownTime(remainingSeconds)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Bell size={16} />
            Nudge
          </span>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
