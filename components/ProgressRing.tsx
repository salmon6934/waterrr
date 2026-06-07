'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { calculateProgress } from '../lib/intake';

interface ProgressRingProps {
  current: number;
  goal: number;
}

const SIZE = 200;
const STROKE_WIDTH = 6;
const BORDER_WIDTH = 1.5;
const GAP = 6;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const INNER_RADIUS = RADIUS - GAP - STROKE_WIDTH / 2 - BORDER_WIDTH / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FILL_RADIUS = INNER_RADIUS - BORDER_WIDTH / 2 - 2;

export default function ProgressRing({ current, goal }: ProgressRingProps) {
  const progress = calculateProgress(current, goal);
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  // Animated percentage counter
  const [displayPercent, setDisplayPercent] = useState(Math.round(progress));
  const startRef = useRef(Math.round(progress));
  const [showSplash, setShowSplash] = useState(false);
  const prevProgressRef = useRef(progress);

  useEffect(() => {
    const target = Math.round(progress);
    const start = startRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const duration = 500;
    const startTime = performance.now();
    let frame: number;

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPercent(Math.round(start + diff * eased));
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        startRef.current = target;
      }
    }

    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      startRef.current = target;
    };
  }, [progress]);

  // Trigger splash when reaching 100%
  useEffect(() => {
    if (progress >= 100 && prevProgressRef.current < 100) {
      const delay = setTimeout(() => {
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 1200);
      }, 1000);
      return () => clearTimeout(delay);
    }
    prevProgressRef.current = progress;
  }, [progress]);

  // Water fill: bottom of circle is at center + FILL_RADIUS
  // Top of water is at (1 - progress/100) * 2 * FILL_RADIUS from the top of the circle area
  const fillHeight = (progress / 100) * 2 * FILL_RADIUS;
  const waterY = SIZE / 2 + FILL_RADIUS - fillHeight;

  return (
    <div className="flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label={`${Math.round(progress)}% of daily water goal`}
        role="img"
      >
        <defs>
          {/* Clip path for the inner circle area */}
          <clipPath id="water-clip">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={FILL_RADIUS} />
          </clipPath>
        </defs>

        {/* Outer background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE_WIDTH}
          opacity={0.15}
        />
        {/* Outer progress circle */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="square"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset }}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        {/* Inner thin border circle */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={INNER_RADIUS}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={BORDER_WIDTH}
          opacity={0.3}
        />

        {/* Animated water fill */}
        <g clipPath="url(#water-clip)">
          <motion.g
            animate={{ y: waterY - (SIZE / 2 - FILL_RADIUS) }}
            initial={{ y: 2 * FILL_RADIUS }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            {/* Wave shape */}
            <motion.path
              d={`
                M ${SIZE / 2 - FILL_RADIUS - 10} ${SIZE / 2 - FILL_RADIUS}
                Q ${SIZE / 2 - FILL_RADIUS * 0.5} ${SIZE / 2 - FILL_RADIUS - 6}
                  ${SIZE / 2} ${SIZE / 2 - FILL_RADIUS}
                Q ${SIZE / 2 + FILL_RADIUS * 0.5} ${SIZE / 2 - FILL_RADIUS + 6}
                  ${SIZE / 2 + FILL_RADIUS + 10} ${SIZE / 2 - FILL_RADIUS}
                V ${SIZE / 2 + FILL_RADIUS + 10}
                H ${SIZE / 2 - FILL_RADIUS - 10}
                Z
              `}
              fill="var(--foreground)"
              opacity={0.12}
              animate={{ x: [-12, 12, -12] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Second wave (offset for depth) */}
            <motion.path
              d={`
                M ${SIZE / 2 - FILL_RADIUS - 10} ${SIZE / 2 - FILL_RADIUS + 3}
                Q ${SIZE / 2 - FILL_RADIUS * 0.3} ${SIZE / 2 - FILL_RADIUS + 7}
                  ${SIZE / 2 + 10} ${SIZE / 2 - FILL_RADIUS + 3}
                Q ${SIZE / 2 + FILL_RADIUS * 0.6} ${SIZE / 2 - FILL_RADIUS - 3}
                  ${SIZE / 2 + FILL_RADIUS + 10} ${SIZE / 2 - FILL_RADIUS + 3}
                V ${SIZE / 2 + FILL_RADIUS + 10}
                H ${SIZE / 2 - FILL_RADIUS - 10}
                Z
              `}
              fill="var(--foreground)"
              opacity={0.08}
              animate={{ x: [14, -14, 14] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.g>
        </g>

        {/* Percentage text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--foreground)"
          className="font-mono text-2xl"
          style={{ fontSize: '24px', fontFamily: 'var(--font-space-mono), Space Mono, monospace' }}
        >
          {displayPercent}%
        </text>

        {/* Splash particles on 100% */}
        {showSplash && (
          <>
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * 2 * Math.PI;
              const endX = Math.cos(angle) * (RADIUS + 30);
              const endY = Math.sin(angle) * (RADIUS + 30);
              return (
                <motion.circle
                  key={i}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={3}
                  fill="var(--foreground)"
                  initial={{ opacity: 0.8, x: 0, y: 0 }}
                  animate={{ opacity: 0, x: endX, y: endY }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
