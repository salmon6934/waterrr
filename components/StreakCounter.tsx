'use client';

import { Flame } from 'lucide-react';

interface StreakCounterProps {
  streak: number; // current consecutive days meeting goal
}

/**
 * Displays the current streak count with a flame icon.
 * Uses lucide-react Flame icon that respects the current theme (text-foreground).
 */
export default function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-foreground">
      <Flame size={20} strokeWidth={2} aria-hidden="true" />
      <span className="text-lg font-bold">
        {streak} {streak === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
}
