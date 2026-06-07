'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Clock, CheckCircle } from 'lucide-react';
import type { ReminderSchedule } from '@/lib/types';
import { loadReminderSchedule, saveReminderSchedule } from '@/lib/storage';
import {
  scheduleNotifications,
  cancelAllNotifications,
  computeNotificationTimes,
} from '@/lib/notifications';

const INTERVAL_OPTIONS = [30, 60, 90, 120] as const;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getNextNotificationTime(schedule: ReminderSchedule): string | null {
  if (!schedule.enabled) return null;

  const now = new Date();
  const times = computeNotificationTimes(schedule, now);
  const next = times.find((t) => t.getTime() > now.getTime());

  if (next) return formatTime(next);

  // If no more today, show first one tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = computeNotificationTimes(schedule, tomorrow);
  if (tomorrowTimes.length > 0) {
    return `Tomorrow ${formatTime(tomorrowTimes[0])}`;
  }

  return null;
}

function getRemindersPerDay(schedule: ReminderSchedule): number {
  if (!schedule.enabled) return 0;
  const times = computeNotificationTimes(schedule, new Date());
  return times.length;
}

export default function ReminderForm() {
  const [schedule, setSchedule] = useState<ReminderSchedule>({
    enabled: false,
    intervalMinutes: 60,
    activeHoursStart: '08:00',
    activeHoursEnd: '22:00',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadReminderSchedule();
    setSchedule(stored);
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  function handleSave(updated: ReminderSchedule) {
    setError(null);
    setSuccessMessage(null);

    // Save to localStorage and update state immediately
    saveReminderSchedule(updated);
    setSchedule(updated);

    // Schedule/cancel notifications in the background — don't block UI
    if (updated.enabled) {
      scheduleNotifications(updated)
        .then(() => {
          const count = getRemindersPerDay(updated);
          setSuccessMessage(`Scheduled ${count} reminder${count !== 1 ? 's' : ''} per day`);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Failed to schedule notifications.';
          setError(message);
        });
    } else {
      cancelAllNotifications().catch(() => {
        // Best effort
      });
      setSuccessMessage('Reminders disabled');
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

  const nextTime = getNextNotificationTime(schedule);
  const remindersPerDay = getRemindersPerDay(schedule);

  return (
    <div className="w-full space-y-5">
      {/* Status Banner — entire row is tappable */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-3 p-3 border border-border transition-colors w-full text-left touch-manipulation ${
          schedule.enabled ? 'bg-foreground/5' : ''
        }`}
      >
        {schedule.enabled ? (
          <Bell size={18} className="text-foreground shrink-0" />
        ) : (
          <BellOff size={18} className="text-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-foreground">
            {schedule.enabled ? 'Reminders active' : 'Reminders off'}
          </p>
          {schedule.enabled && nextTime && (
            <p className="text-xs font-mono text-muted mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              Next: {nextTime}
            </p>
          )}
        </div>
        <span
          role="switch"
          aria-checked={schedule.enabled}
          aria-label="Toggle reminders"
          className={`
            relative w-10 h-5 border border-border transition-colors shrink-0 pointer-events-none
            ${schedule.enabled ? 'bg-foreground' : 'bg-background'}
          `}
        >
          <span
            className={`
              absolute top-[3px] left-[3px] w-3 h-3 transition-transform
              ${schedule.enabled ? 'translate-x-[18px] bg-background' : 'translate-x-0 bg-foreground'}
            `}
          />
        </span>
      </button>

      {/* Interval Selector */}
      <fieldset className="space-y-2" disabled={!schedule.enabled}>
        <legend className="text-sm font-mono text-muted">
          Every
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {INTERVAL_OPTIONS.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => handleIntervalChange(interval)}
              aria-pressed={schedule.intervalMinutes === interval}
              className={`
                py-2 text-sm font-mono border border-border transition-colors touch-manipulation
                ${
                  schedule.intervalMinutes === interval
                    ? 'bg-foreground text-background'
                    : 'bg-background text-foreground hover:bg-foreground hover:text-background'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {interval}m
            </button>
          ))}
        </div>
        {schedule.enabled && remindersPerDay > 0 && (
          <p className="text-xs font-mono text-muted">
            {remindersPerDay} reminder{remindersPerDay !== 1 ? 's' : ''} per day
          </p>
        )}
      </fieldset>

      {/* Active Hours */}
      <fieldset className="space-y-3" disabled={!schedule.enabled}>
        <legend className="text-sm font-mono text-muted">Active window</legend>
        <div className="flex items-center gap-3">
          <label htmlFor="active-start" className="text-sm font-mono w-12">
            From
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
            Until
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

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 border border-border text-sm font-mono text-foreground animate-pulse">
          <CheckCircle size={14} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-3 border border-border space-y-2">
          <p className="text-sm font-mono text-foreground">
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  );
}
