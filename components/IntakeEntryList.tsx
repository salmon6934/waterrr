'use client';

import { IntakeEntry } from '@/lib/types';
import { formatIntakeEntry } from '@/lib/friends';

interface IntakeEntryListProps {
  entries: IntakeEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Renders a close friend's intake entries for today.
 * Displays volume in ml and HH:MM timestamp for each entry.
 * Handles empty, loading, and error states.
 */
export default function IntakeEntryList({ entries, loading, error }: IntakeEntryListProps) {
  if (loading) {
    return (
      <div className="py-2 text-xs text-muted font-mono" aria-busy="true">
        Loading entries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-xs text-red-500 font-mono" role="alert">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-2 text-xs text-muted font-mono">
        No entries today
      </div>
    );
  }

  return (
    <ul className="py-2 space-y-1 font-mono" aria-label="Intake entries">
      {entries.map((entry) => (
        <li key={entry.id} className="text-xs text-foreground border border-border px-2 py-1">
          {formatIntakeEntry(entry)}
        </li>
      ))}
    </ul>
  );
}
