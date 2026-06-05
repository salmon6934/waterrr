'use client';

import { useEffect, useState } from 'react';
import ReminderForm from '@/components/ReminderForm';
import ThemeToggle from '@/components/ThemeToggle';
import { loadDailyGoal, saveDailyGoal } from '@/lib/storage';
import type { DailyGoal } from '@/lib/types';

export default function SettingsPage() {
  const [goalValue, setGoalValue] = useState<number>(2000);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadDailyGoal();
    setGoalValue(stored.value);
  }, []);

  function handleGoalSave() {
    const goal: DailyGoal = {
      value: goalValue,
      updatedAt: new Date().toISOString(),
    };
    saveDailyGoal(goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="w-full max-w-[390px] mx-auto px-4 py-8 font-mono">
      <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

      {/* Daily Goal Section */}
      <section className="mb-8">
        <h2 className="text-sm font-mono text-muted mb-3">Daily Goal</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={5000}
            value={goalValue}
            onChange={(e) => setGoalValue(Number(e.target.value))}
            aria-label="Daily goal in milliliters"
            className="flex-1 bg-background text-foreground border border-border px-3 py-2 text-sm font-mono"
          />
          <span className="text-sm text-muted">ml</span>
          <button
            onClick={handleGoalSave}
            className="px-4 py-2 text-sm font-mono border border-border bg-foreground text-background hover:opacity-80 transition-opacity"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </section>

      {/* Reminders Section */}
      <section className="mb-8">
        <h2 className="text-sm font-mono text-muted mb-3">Reminders</h2>
        <ReminderForm />
      </section>

      {/* Theme Section */}
      <section className="mb-8">
        <h2 className="text-sm font-mono text-muted mb-3">Appearance</h2>
        <ThemeToggle />
      </section>
    </main>
  );
}
