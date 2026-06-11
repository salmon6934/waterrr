'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProgressRing from '@/components/ProgressRing';
import StreakCounter from '@/components/StreakCounter';
import QuickAddButton from '@/components/QuickAddButton';
import CustomAddModal from '@/components/CustomAddModal';
import DailyLog from '@/components/DailyLog';
import AnimatedNumber from '@/components/AnimatedNumber';
import {
  loadTodayEntries,
  saveIntakeEntry,
  deleteIntakeEntry,
  loadDailyGoal,
  loadStreakData,
  saveStreakData,
} from '@/lib/storage';
import {
  calculateTotalIntake,
} from '@/lib/intake';
import {
  isDailyGoalMet,
  updateStreak,
  validateStreakContinuity,
  toDateString,
} from '@/lib/streak';
import { triggerGoalCompletionHaptic } from '@/lib/haptics';
import { PRESET_VOLUMES } from '@/lib/constants';
import { IntakeEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getISTTimestamp } from '@/lib/timezone';

export default function Home() {
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [goal, setGoal] = useState<number>(2000);
  const [streak, setStreak] = useState<number>(0);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const goalReachedRef = useRef(false);

  // Load data from storage on mount
  useEffect(() => {
    const todayEntries = loadTodayEntries();
    setEntries(todayEntries);

    const dailyGoal = loadDailyGoal();
    setGoal(dailyGoal.value);

    const streakData = loadStreakData();
    const validatedStreak = validateStreakContinuity(streakData, new Date());
    setStreak(validatedStreak);

    // If streak was reset due to gap, persist the reset
    if (validatedStreak !== streakData.currentStreak) {
      saveStreakData({
        currentStreak: validatedStreak,
        lastCompletedDate: streakData.lastCompletedDate,
      });
    }

    // Check if goal was already reached today (so we don't re-trigger haptic)
    const total = calculateTotalIntake(todayEntries);
    if (total >= dailyGoal.value) {
      goalReachedRef.current = true;
    }
  }, []);

  // Handle date change: if stored entries are not from today, reset
  useEffect(() => {
    const checkDateChange = () => {
      const todayEntries = loadTodayEntries();
      setEntries(todayEntries);

      const total = calculateTotalIntake(todayEntries);
      const dailyGoal = loadDailyGoal();
      goalReachedRef.current = total >= dailyGoal.value;
    };

    // Check on visibility change (e.g., user returns to app next day)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();

        // Also re-validate streak
        const streakData = loadStreakData();
        const validatedStreak = validateStreakContinuity(streakData, new Date());
        setStreak(validatedStreak);

        // Reload goal in case it changed in settings
        const dailyGoal = loadDailyGoal();
        setGoal(dailyGoal.value);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAddIntake = useCallback(
    (volume: number) => {
      const newEntry: IntakeEntry = {
        id: crypto.randomUUID(),
        volume,
        timestamp: getISTTimestamp(),
      };

      // Save to localStorage
      saveIntakeEntry(newEntry);

      // Update entries state
      const updatedEntries = [...entries, newEntry];
      setEntries(updatedEntries);

      // Sync to Supabase immediately
      getSession().then((session) => {
        if (session) {
          supabase
            .from('intake_entries')
            .upsert({
              id: newEntry.id,
              user_id: session.user.id,
              volume: newEntry.volume,
              timestamp: newEntry.timestamp,
            }, { onConflict: 'id' })
            .then(({ error }) => {
              if (error) {
                console.error('Failed to sync entry to Supabase:', error.message);
              }
            });
        }
      });

      // Check if goal is met for the first time
      const newTotal = calculateTotalIntake(updatedEntries);
      if (newTotal >= goal && !goalReachedRef.current) {
        goalReachedRef.current = true;

        // Trigger success haptic
        triggerGoalCompletionHaptic();

        // Update streak
        const streakData = loadStreakData();
        const goalMet = isDailyGoalMet(updatedEntries, goal);
        const newStreak = updateStreak(streakData.currentStreak, goalMet);
        setStreak(newStreak);

        // Persist streak locally
        saveStreakData({
          currentStreak: newStreak,
          lastCompletedDate: toDateString(new Date()),
        });

        // Sync streak to Supabase
        getSession().then((session) => {
          if (session) {
            supabase
              .from('profiles')
              .update({
                current_streak: newStreak,
                last_completed_date: toDateString(new Date()),
              })
              .eq('id', session.user.id)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync streak to Supabase:', error.message);
                }
              });
          }
        });
      }
    },
    [entries, goal]
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      // Remove from localStorage
      deleteIntakeEntry(id);

      // Update state
      const updatedEntries = entries.filter((e) => e.id !== id);
      setEntries(updatedEntries);

      // Delete from Supabase
      getSession().then((session) => {
        if (session) {
          supabase
            .from('intake_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to delete entry from Supabase:', error.message);
              }
            });
        }
      });

      // Reset goal reached state if we drop below goal
      const newTotal = calculateTotalIntake(updatedEntries);
      if (newTotal < goal) {
        goalReachedRef.current = false;
      }
    },
    [entries, goal]
  );

  const totalIntake = calculateTotalIntake(entries);

  return (
    <main className="flex h-screen flex-col items-center px-4 py-8 pb-24 gap-6 overflow-hidden">
      {/* Progress Ring and Streak */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <ProgressRing current={totalIntake} goal={goal} />
        <StreakCounter streak={streak} />
        <p className="font-mono text-sm text-muted">
          <AnimatedNumber value={totalIntake} /> / {goal} ml
        </p>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
        {PRESET_VOLUMES.map((volume) => (
          <QuickAddButton key={volume} volume={volume} onAdd={handleAddIntake} />
        ))}
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="border border-border bg-background text-foreground font-mono px-4 py-3 text-sm font-bold transition-colors hover:bg-foreground hover:text-background active:bg-foreground active:text-background"
        >
          Custom
        </button>
      </div>

      {/* Custom Add Modal */}
      <CustomAddModal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={handleAddIntake}
      />

      {/* Daily Log — header stays fixed, entries scroll */}
      <div className="w-full max-w-sm flex-1 min-h-0 flex flex-col">
        <h2 className="font-mono text-sm text-muted mb-2 shrink-0">Today&apos;s Log</h2>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <DailyLog entries={entries} onDelete={handleDeleteEntry} />
        </div>
      </div>
    </main>
  );
}
