'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedFriendProgress, IntakeEntry } from '@/lib/types';
import { isInactive } from '@/lib/friends';
import IntakeEntryList from '@/components/IntakeEntryList';
import RemoveFriendDialog from '@/components/RemoveFriendDialog';
import NudgeButton from '@/components/NudgeButton';

interface FriendCardProps {
  friend: EnhancedFriendProgress;
  onMarkCloseFriend?: () => void;
  onRemoveCloseFriend?: () => void;
  onRemoveFriend?: () => void;
  onNudge?: () => Promise<void>;
  intakeEntries?: IntakeEntry[];
  entriesLoading?: boolean;
  entriesError?: string | null;
}

/**
 * Expandable friend card displaying hydration progress.
 *
 * States:
 * - Collapsed: username, progress bar, intake/goal, streak
 * - Expanded (non-close friend): "Mark as Close Friend", "Remove Friend", NudgeButton
 * - Expanded (close friend): 💧 icon, IntakeEntryList, "Remove Close Friend",
 *   "Remove Friend", NudgeButton
 *
 * Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1
 */
export default function FriendCard({
  friend,
  onMarkCloseFriend,
  onRemoveCloseFriend,
  onRemoveFriend,
  onNudge,
  intakeEntries = [],
  entriesLoading = false,
  entriesError = null,
}: FriendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const {
    username,
    currentIntake,
    dailyGoal,
    currentStreak,
    isCloseFriend,
    lastIntakeTimestamp,
    hasDeviceToken,
    nudgeCooldownExpiresAt,
  } = friend;

  const percentage =
    dailyGoal > 0
      ? Math.min(Math.max((currentIntake / dailyGoal) * 100, 0), 100)
      : 0;

  const friendIsInactive = isInactive(lastIntakeTimestamp, new Date());

  function handleCardTap() {
    if (!showRemoveDialog) {
      setExpanded((prev) => !prev);
    }
  }

  async function handleRemoveConfirm() {
    if (!onRemoveFriend) return;
    setRemoveError(null);
    setRemoveLoading(true);
    try {
      await onRemoveFriend();
      setShowRemoveDialog(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Removal failed. Try again.';
      setRemoveError(message);
    } finally {
      setRemoveLoading(false);
    }
  }

  function handleRemoveCancel() {
    setShowRemoveDialog(false);
    setRemoveError(null);
  }

  return (
    <div className="border border-border p-4 font-mono">
      {/* Collapsed state: always visible, tap to expand/collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardTap();
          }
        }}
        className="cursor-pointer"
        aria-expanded={expanded}
        aria-label={`${username} friend card, ${expanded ? 'expanded' : 'collapsed'}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-foreground">
            {isCloseFriend && (
              <span className="mr-1" aria-label="Close friend">
                💧
              </span>
            )}
            {username}
          </span>
          <span className="text-xs text-muted">
            🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 border border-border bg-background mb-2 overflow-hidden">
          <motion.div
            className="h-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {currentIntake}ml / {dailyGoal}ml
          </span>
          <span>{Math.round(percentage)}%</span>
        </div>
      </div>

      {/* Expanded state */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Close friend expanded content */}
              {isCloseFriend && (
                <>
                  <IntakeEntryList
                    entries={intakeEntries}
                    loading={entriesLoading}
                    error={entriesError}
                  />
                  {onRemoveCloseFriend && (
                    <button
                      type="button"
                      onClick={onRemoveCloseFriend}
                      className="w-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-foreground hover:text-background transition-colors"
                    >
                      Remove Close Friend
                    </button>
                  )}
                </>
              )}

              {/* Non-close friend expanded content */}
              {!isCloseFriend && onMarkCloseFriend && (
                <button
                  type="button"
                  onClick={onMarkCloseFriend}
                  className="w-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  Mark as Close Friend
                </button>
              )}

              {/* Nudge button (shown in both expanded states) */}
              {onNudge && (
                <NudgeButton
                  isInactive={friendIsInactive}
                  hasDeviceToken={hasDeviceToken}
                  cooldownExpiresAt={nudgeCooldownExpiresAt}
                  onNudge={onNudge}
                />
              )}

              {/* Remove friend button */}
              {onRemoveFriend && (
                <button
                  type="button"
                  onClick={() => setShowRemoveDialog(true)}
                  className="w-full border border-border px-3 py-1.5 text-xs text-red-500 hover:bg-red-500 hover:text-background transition-colors"
                >
                  Remove Friend
                </button>
              )}

              {/* Remove friend confirmation dialog */}
              {showRemoveDialog && (
                <RemoveFriendDialog
                  username={username}
                  onConfirm={handleRemoveConfirm}
                  onCancel={handleRemoveCancel}
                  error={removeError}
                  loading={removeLoading}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
