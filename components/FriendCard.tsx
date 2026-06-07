'use client';

import { motion } from 'framer-motion';
import { FriendProgress } from '@/lib/types';

interface FriendCardProps {
  friend: FriendProgress;
}

/**
 * Displays a friend's hydration progress including username,
 * current daily intake as a progress bar, daily goal value, and current streak.
 */
export default function FriendCard({ friend }: FriendCardProps) {
  const { username, currentIntake, dailyGoal, currentStreak } = friend;
  const percentage = dailyGoal > 0
    ? Math.min(Math.max((currentIntake / dailyGoal) * 100, 0), 100)
    : 0;

  return (
    <div className="border border-border p-4 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-foreground">{username}</span>
        <span className="text-xs text-muted">🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
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
        <span>{currentIntake}ml / {dailyGoal}ml</span>
        <span>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
