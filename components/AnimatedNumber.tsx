'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

/**
 * Animates a number counting up/down to a target value.
 */
export default function AnimatedNumber({ value, duration = 400 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = startRef.current;
    const diff = value - start;
    if (diff === 0) return;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = value;
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      startRef.current = value;
    };
  }, [value, duration]);

  return <>{display}</>;
}
