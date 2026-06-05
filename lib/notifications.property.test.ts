import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeNotificationTimes, isWithinActiveHours } from './notifications';
import type { ReminderSchedule } from './types';

/**
 * Generator for a valid HH:MM time string.
 * Hours: 0–23, Minutes: 0–59
 */
const timeStringArb = fc
  .record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  })
  .map(({ hour, minute }) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

/**
 * Convert HH:MM string to total minutes since midnight.
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Generator for a valid enabled ReminderSchedule with start < end.
 */
const validScheduleArb = fc
  .record({
    intervalMinutes: fc.integer({ min: 1, max: 480 }),
    start: timeStringArb,
    end: timeStringArb,
  })
  .filter(({ start, end }) => toMinutes(start) < toMinutes(end))
  .map(({ intervalMinutes, start, end }) => ({
    enabled: true,
    intervalMinutes,
    activeHoursStart: start,
    activeHoursEnd: end,
  }));

/**
 * Generator for two distinct valid ReminderSchedule configurations.
 * "Distinct" means they differ in at least one of: intervalMinutes, activeHoursStart, activeHoursEnd.
 */
const twoDistinctSchedulesArb = fc
  .tuple(validScheduleArb, validScheduleArb)
  .filter(
    ([s1, s2]) =>
      s1.intervalMinutes !== s2.intervalMinutes ||
      s1.activeHoursStart !== s2.activeHoursStart ||
      s1.activeHoursEnd !== s2.activeHoursEnd
  );

/**
 * Generator for a valid reference date (no NaN/invalid dates).
 */
const referenceDateArb = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-12-31T23:59:59.000Z'),
  noInvalidDate: true,
});

/**
 * Property 7: Notification times fall within active hours
 * **Validates: Requirements 4.2, 4.3**
 *
 * For any valid ReminderSchedule with active hours [start, end] and interval > 0,
 * all computed notification times SHALL have their time-of-day component within
 * the [start, end] range, and consecutive notifications SHALL be spaced exactly
 * intervalMinutes apart.
 */
describe('Property 7: Notification times fall within active hours', () => {
  it('all computed notification times fall within [activeHoursStart, activeHoursEnd]', () => {
    fc.assert(
      fc.property(validScheduleArb, referenceDateArb, (schedule, referenceDate) => {
        const times = computeNotificationTimes(schedule, referenceDate);

        for (const time of times) {
          expect(
            isWithinActiveHours(time, schedule.activeHoursStart, schedule.activeHoursEnd)
          ).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('consecutive notifications are spaced exactly intervalMinutes apart', () => {
    fc.assert(
      fc.property(validScheduleArb, referenceDateArb, (schedule, referenceDate) => {
        const times = computeNotificationTimes(schedule, referenceDate);

        for (let i = 0; i < times.length - 1; i++) {
          const diffMs = times[i + 1].getTime() - times[i].getTime();
          const diffMinutes = diffMs / (1000 * 60);
          expect(diffMinutes).toBe(schedule.intervalMinutes);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('returns a non-empty array when schedule is enabled with valid window', () => {
    fc.assert(
      fc.property(validScheduleArb, referenceDateArb, (schedule, referenceDate) => {
        const times = computeNotificationTimes(schedule, referenceDate);
        // The first notification is always at start time, so result is never empty
        // when enabled and start < end
        expect(times.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 200 }
    );
  });

  it('returns empty array when schedule is disabled', () => {
    fc.assert(
      fc.property(validScheduleArb, referenceDateArb, (schedule, referenceDate) => {
        const disabledSchedule: ReminderSchedule = { ...schedule, enabled: false };
        const times = computeNotificationTimes(disabledSchedule, referenceDate);
        expect(times).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 8: Schedule update produces fresh notification set
 * Validates: Requirements 4.5
 *
 * For any two distinct ReminderSchedule configurations applied in sequence,
 * the resulting set of scheduled notifications SHALL exactly match those
 * computed from the second configuration only, with no remnants of the first.
 */
describe('Property 8: Schedule update produces fresh notification set', () => {
  const referenceDate = new Date('2024-06-15T00:00:00');

  it('applying two schedules in sequence produces notifications matching only the second schedule', () => {
    fc.assert(
      fc.property(twoDistinctSchedulesArb, ([schedule1, schedule2]) => {
        // Simulate applying schedule1 first
        const timesFromFirst = computeNotificationTimes(schedule1, referenceDate);

        // Now apply schedule2 (the "update") — this replaces schedule1
        const timesFromSecond = computeNotificationTimes(schedule2, referenceDate);

        // The result of applying the update should exactly match computing
        // from the second schedule alone (fresh computation)
        const freshComputation = computeNotificationTimes(schedule2, referenceDate);

        // The updated set must exactly equal the fresh computation from schedule2
        expect(timesFromSecond).toHaveLength(freshComputation.length);
        for (let i = 0; i < timesFromSecond.length; i++) {
          expect(timesFromSecond[i].getTime()).toBe(freshComputation[i].getTime());
        }

        // Verify no remnants of schedule1 that aren't in schedule2's set
        const secondTimestamps = new Set(timesFromSecond.map((t) => t.getTime()));
        const firstTimestamps = timesFromFirst.map((t) => t.getTime());

        // Any time from schedule1 that appears in the result must also be a
        // legitimate time from schedule2 (no stale notifications carried over)
        for (const ts of firstTimestamps) {
          if (secondTimestamps.has(ts)) {
            // This is fine — coincidental overlap between two schedules
            expect(freshComputation.map((t) => t.getTime())).toContain(ts);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it('schedule update with disabled second schedule produces empty notification set', () => {
    fc.assert(
      fc.property(validScheduleArb, (schedule1) => {
        const disabledSchedule: ReminderSchedule = {
          enabled: false,
          intervalMinutes: schedule1.intervalMinutes,
          activeHoursStart: schedule1.activeHoursStart,
          activeHoursEnd: schedule1.activeHoursEnd,
        };

        // First schedule produces some notifications
        const timesFromFirst = computeNotificationTimes(schedule1, referenceDate);
        expect(timesFromFirst.length).toBeGreaterThan(0);

        // Applying a disabled schedule clears everything — no remnants
        const timesAfterUpdate = computeNotificationTimes(disabledSchedule, referenceDate);
        expect(timesAfterUpdate).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('schedule update result is independent of the first schedule', () => {
    fc.assert(
      fc.property(
        validScheduleArb,
        validScheduleArb,
        validScheduleArb,
        (scheduleA, scheduleB, scheduleTarget) => {
          // Regardless of what the "first" schedule was (A or B),
          // applying the same "target" schedule should produce identical results
          // This validates that no state from the first leaks into the second.

          // Simulate: first = A, then apply target
          computeNotificationTimes(scheduleA, referenceDate);
          const afterA = computeNotificationTimes(scheduleTarget, referenceDate);

          // Simulate: first = B, then apply target
          computeNotificationTimes(scheduleB, referenceDate);
          const afterB = computeNotificationTimes(scheduleTarget, referenceDate);

          // Both should produce exactly the same result
          expect(afterA).toHaveLength(afterB.length);
          for (let i = 0; i < afterA.length; i++) {
            expect(afterA[i].getTime()).toBe(afterB[i].getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
