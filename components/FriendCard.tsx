'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
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
 * - Collapsed: username, progress bar + NudgeButton (compact), intake/goal, streak
 * - Expanded (non-close friend): "Mark as Close Friend", "Remove Friend"
 * - Expanded (close friend): 💧 icon, IntakeEntryList, "Remove Close Friend",
 *   "Remove Friend"
 *
 * Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.3, 2.4, 2.7
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
    iMarkedThemClose,
    theyMarkedMeClose,
    isMutualCloseFriend,
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
            {isMutualCloseFriend && (
              <span className="mr-1" aria-label="Mutual close friend">
                💧
              </span>
            )}
            {username}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-muted">
            <Flame size={12} strokeWidth={2} />
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar row with nudge button */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-3 border border-border bg-background overflow-hidden">
            <motion.div
              className="h-full bg-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {onNudge && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <NudgeButton
                compact
                isInactive={friendIsInactive}
                hasDeviceToken={hasDeviceToken}
                cooldownExpiresAt={nudgeCooldownExpiresAt}
                onNudge={onNudge}
              />
            </div>
          )}
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
              {/* Show intake entries if they marked me as close (I can see their entries) */}
              {theyMarkedMeClose && (
                <IntakeEntryList
                  entries={intakeEntries}
                  loading={entriesLoading}
                  error={entriesError}
                />
              )}

              {/* Button row: close friend toggle + remove friend side by side */}
              {(() => {
                const closeFriendButton = iMarkedThemClose && onRemoveCloseFriend ? (
                  <button
                    key="remove-close"
                    type="button"
                    onClick={onRemoveCloseFriend}
                    className={`${onRemoveFriend ? 'w-1/2' : 'w-full'} border border-border px-3 py-1.5 text-xs text-foreground hover:bg-foreground hover:text-background transition-colors`}
                  >
                    Remove Close Friend
                  </button>
                ) : !iMarkedThemClose && onMarkCloseFriend ? (
                  <button
                    key="mark-close"
                    type="button"
                    onClick={onMarkCloseFriend}
                    className={`${onRemoveFriend ? 'w-1/2' : 'w-full'} border border-border px-3 py-1.5 text-xs text-foreground hover:bg-foreground hover:text-background transition-colors`}
                  >
                    Mark as Close Friend
                  </button>
                ) : null;

                const removeFriendButton = onRemoveFriend ? (
                  <button
                    key="remove-friend"
                    type="button"
                    onClick={() => setShowRemoveDialog(true)}
                    className={`${closeFriendButton ? 'w-1/2' : 'w-full'} border border-border px-3 py-1.5 text-xs text-red-500 hover:bg-red-500 hover:text-background transition-colors`}
                  >
                    Remove Friend
                  </button>
                ) : null;

                if (closeFriendButton || removeFriendButton) {
                  return (
                    <div className="flex gap-2">
                      {closeFriendButton}
                      {removeFriendButton}
                    </div>
                  );
                }
                return null;
              })()}

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
