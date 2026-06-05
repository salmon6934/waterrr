'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { IntakeEntry } from '@/lib/types';
import { sortEntriesChronologically } from '@/lib/intake';

interface DailyLogProps {
  entries: IntakeEntry[];
}

/**
 * Formats an ISO 8601 timestamp into a human-readable time string (HH:MM).
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * DailyLog displays a chronological list of all water intake entries
 * recorded for the current day. Each entry shows volume (ml) and
 * a formatted timestamp. New entries animate in via Framer Motion.
 */
export default function DailyLog({ entries }: DailyLogProps) {
  const sorted = sortEntriesChronologically(entries);

  return (
    <div className="w-full">
      <h2 className="font-mono text-sm text-muted mb-2">Today&apos;s Log</h2>
      {sorted.length === 0 ? (
        <p className="font-mono text-sm text-muted">No entries yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((entry) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between border border-border px-3 py-2 font-mono text-sm"
              >
                <span className="text-foreground">{entry.volume} ml</span>
                <span className="text-muted">{formatTimestamp(entry.timestamp)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
