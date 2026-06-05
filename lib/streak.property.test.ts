import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateStreakContinuity, toDateString } from './streak';
import { StreakData } from './types';

/**
 * Property 13: Streak continuity validation
 * Validates: Requirements 12.1, 12.2, 12.7
 */
describe('Property 13: Streak continuity validation', () => {
  it('preserves streak when lastCompletedDate is yesterday', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (currentStreak) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const streakData: StreakData = {
          currentStreak,
          lastCompletedDate: toDateString(yesterday),
        };

        const result = validateStreakContinuity(streakData, today);
        expect(result).toBe(currentStreak);
      })
    );
  });

  it('resets streak to 0 when lastCompletedDate is more than 1 day ago', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 2, max: 365 }),
        (currentStreak, daysAgo) => {
          const today = new Date();
          const pastDate = new Date(today);
          pastDate.setDate(pastDate.getDate() - daysAgo);

          const streakData: StreakData = {
            currentStreak,
            lastCompletedDate: toDateString(pastDate),
          };

          const result = validateStreakContinuity(streakData, today);
          expect(result).toBe(0);
        }
      )
    );
  });

  it('preserves streak when lastCompletedDate is today', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (currentStreak) => {
        const today = new Date();

        const streakData: StreakData = {
          currentStreak,
          lastCompletedDate: toDateString(today),
        };

        const result = validateStreakContinuity(streakData, today);
        expect(result).toBe(currentStreak);
      })
    );
  });
});
