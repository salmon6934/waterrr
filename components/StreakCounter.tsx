'use client';

interface StreakCounterProps {
  streak: number; // current consecutive days meeting goal
}

/**
 * Displays the current streak count with a fire emoji label.
 * Positioned alongside the ProgressRing on the home page.
 */
export default function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-foreground">
      <span className="text-lg" aria-hidden="true">
        🔥
      </span>
      <span className="text-lg font-bold">
        {streak} {streak === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
}
