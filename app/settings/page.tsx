'use client';

import { useEffect, useState } from 'react';
import ReminderForm from '@/components/ReminderForm';
import ThemeToggle from '@/components/ThemeToggle';
import { loadDailyGoal, saveDailyGoal } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import type { DailyGoal } from '@/lib/types';

function getHydrationStatus(goalValue: number): { message: string; color: string } {
  if (goalValue < 1500) {
    return { message: 'Below recommended intake. Adults typically need 1500–3000 ml/day.', color: 'text-yellow-500' };
  }
  if (goalValue <= 3000) {
    return { message: 'Good target! This is within the recommended daily range.', color: 'text-green-500' };
  }
  return { message: 'Above typical intake. Make sure this suits your activity level.', color: 'text-orange-500' };
}

export default function SettingsPage() {
  const [goalInput, setGoalInput] = useState<string>('2000');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = loadDailyGoal();
    setGoalInput(String(stored.value));
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow empty string so user can fully clear the field
    if (raw === '') {
      setGoalInput('');
      return;
    }
    // Remove leading zeros and set the numeric string
    const cleaned = raw.replace(/^0+/, '') || '';
    setGoalInput(cleaned);
  }

  function handleGoalSave() {
    setError('');

    // Validate empty or invalid
    const numValue = Number(goalInput);
    if (!goalInput || isNaN(numValue) || numValue < 1) {
      setError('Please enter a valid daily goal (1–5000 ml)');
      return;
    }
    if (numValue > 5000) {
      setError('Maximum daily goal is 5000 ml');
      return;
    }

    const goal: DailyGoal = {
      value: numValue,
      updatedAt: new Date().toISOString(),
    };
    saveDailyGoal(goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Sync to Supabase
    getSession().then((session) => {
      if (session) {
        supabase
          .from('profiles')
          .update({ daily_goal: numValue })
          .eq('id', session.user.id)
          .then(({ error: syncError }) => {
            if (syncError) {
              console.error('Failed to sync daily goal to Supabase:', syncError.message);
            }
          });
      }
    });
  }

  const numericGoal = Number(goalInput) || 0;
  const hydrationStatus = numericGoal > 0 ? getHydrationStatus(numericGoal) : null;

  return (
    <main className="w-full max-w-[390px] mx-auto px-4 py-8 font-mono">
      <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

      {/* Daily Goal Section */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Daily Goal</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={5000}
            value={goalInput}
            onChange={handleInputChange}
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

        {/* Error message */}
        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}

        {/* Hydration status */}
        {hydrationStatus && (
          <p className={`mt-3 text-xs ${hydrationStatus.color}`}>
            {hydrationStatus.message}
          </p>
        )}
      </section>

      {/* Reminders Section */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Hydration Reminders</h2>
        <ReminderForm />
      </section>

      {/* Theme Section */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Appearance</h2>
        <ThemeToggle />
      </section>
    </main>
  );
}
