'use client';

import { motion } from 'framer-motion';
import { calculateProgress } from '../lib/intake';

interface ProgressRingProps {
  current: number; // current total intake in ml
  goal: number;    // daily goal in ml
}

const SIZE = 200;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressRing({ current, goal }: ProgressRingProps) {
  const progress = calculateProgress(current, goal);
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label={`${Math.round(progress)}% of daily water goal`}
        role="img"
      >
        {/* Background circle */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE_WIDTH}
          opacity={0.2}
        />
        {/* Progress circle */}
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
          {Math.round(progress)}%
        </text>
      </svg>
    </div>
  );
}
