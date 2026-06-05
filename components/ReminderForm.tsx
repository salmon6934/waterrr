'use client';

import { useEffect, useState } from 'react';
import type { ReminderSchedule } from '@/lib/types';
import { loadReminderSchedule, saveReminderSchedule } from '@/lib/storage';
import { scheduleNotifications, cancelAllNotifications } from '@/lib/notifications';

const INTERVAL_OPTIONS = [30, 60, 90, 120] as const;

export default function ReminderForm() {
  const [schedule, setSchedule] = useState<ReminderSchedule>({
    enabled: false,
    intervalMinutes: 60,
    activeHoursStart: '08:00',
    activeHoursEnd: '22:00',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = loadReminderSchedule();
    setSchedule(stored);
  }, []);

  async function handleSave(updated: ReminderSchedule) {
    setError(null);
    setSaving(true);

    try {
      saveReminderSchedule(updated);
      setSchedule(updated);

      if (updated.enabled) {
        await scheduleNotifications(updated);
      } else {
        await cancelAllNotifications();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update reminder schedule.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleToggle() {
    const updated = { ...schedule, enabled: !schedule.enabled };
    handleSave(updated);
  }

  function handleIntervalChange(interval: number) {
    const updated = { ...schedule, intervalMinutes: interval };
    handleSave(updated);
  }

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updated = { ...schedule, activeHoursStart: e.target.value };
    handleSave(updated);
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updated = { ...schedule, activeHoursEnd: e.target.value };
    handleSave(updated);
  }

  return (
    <div className="w-full space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="reminder-toggle" className="text-sm font-mono">
          Reminders
        </label>
        <button
          id="reminder-toggle"
          role="switch"
          aria-checked={schedule.enabled}
          onClick={handleToggle}
          disabled={saving}
          className={`
            relative w-12 h-6 border border-border transition-colors
            ${schedule.enabled ? 'bg-foreground' : 'bg-background'}
          `}
        >
          <span
            className={`
              absolute top-0.5 w-4 h-4 transition-transform
              ${schedule.enabled ? 'translate-x-6 bg-background' : 'translate-x-1 bg-foreground'}
            `}
          />
        </button>
      </div>

      {/* Interval Selector */}
      <fieldset className="space-y-2" disabled={!schedule.enabled || saving}>
        <legend className="text-sm font-mono text-muted">
          Interval (minutes)
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {INTERVAL_OPTIONS.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => handleIntervalChange(interval)}
              aria-pressed={schedule.intervalMinutes === interval}
              className={`
                py-2 text-sm font-mono border border-border transition-colors
                ${
                  schedule.intervalMinutes === interval
                    ? 'bg-foreground text-background'
                    : 'bg-background text-foreground hover:bg-foreground hover:text-background'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {interval}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Active Hours */}
      <fieldset className="space-y-3" disabled={!schedule.enabled || saving}>
        <legend className="text-sm font-mono text-muted">Active Hours</legend>
        <div className="flex items-center gap-3">
          <label htmlFor="active-start" className="text-sm font-mono w-12">
            Start
          </label>
          <input
            id="active-start"
            type="time"
            value={schedule.activeHoursStart}
            onChange={handleStartChange}
            className="flex-1 bg-background text-foreground border border-border px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="active-end" className="text-sm font-mono w-12">
            End
          </label>
          <input
            id="active-end"
            type="time"
            value={schedule.activeHoursEnd}
            onChange={handleEndChange}
            className="flex-1 bg-background text-foreground border border-border px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </fieldset>

      {/* Error Message */}
      {error && (
        <p role="alert" className="text-sm font-mono text-foreground border border-border p-3">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
