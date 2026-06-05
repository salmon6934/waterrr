import { describe, it, expect } from 'vitest';
import { computeNotificationTimes, isWithinActiveHours } from './notifications';
import type { ReminderSchedule } from './types';

describe('isWithinActiveHours', () => {
  it('returns true when time is within active hours', () => {
    const time = new Date('2024-01-15T10:00:00');
    expect(isWithinActiveHours(time, '08:00', '22:00')).toBe(true);
  });

  it('returns true when time is exactly at start', () => {
    const time = new Date('2024-01-15T08:00:00');
    expect(isWithinActiveHours(time, '08:00', '22:00')).toBe(true);
  });

  it('returns true when time is exactly at end', () => {
    const time = new Date('2024-01-15T22:00:00');
    expect(isWithinActiveHours(time, '08:00', '22:00')).toBe(true);
  });

  it('returns false when time is before active hours', () => {
    const time = new Date('2024-01-15T07:59:00');
    expect(isWithinActiveHours(time, '08:00', '22:00')).toBe(false);
  });

  it('returns false when time is after active hours', () => {
    const time = new Date('2024-01-15T22:01:00');
    expect(isWithinActiveHours(time, '08:00', '22:00')).toBe(false);
  });

  it('handles narrow window correctly', () => {
    const time = new Date('2024-01-15T12:30:00');
    expect(isWithinActiveHours(time, '12:00', '13:00')).toBe(true);
  });
});

describe('computeNotificationTimes', () => {
  const baseSchedule: ReminderSchedule = {
    enabled: true,
    intervalMinutes: 60,
    activeHoursStart: '08:00',
    activeHoursEnd: '22:00',
  };

  const referenceDate = new Date('2024-01-15T00:00:00');

  it('returns empty array when schedule is disabled', () => {
    const schedule: ReminderSchedule = { ...baseSchedule, enabled: false };
    expect(computeNotificationTimes(schedule, referenceDate)).toEqual([]);
  });

  it('returns empty array when interval is zero', () => {
    const schedule: ReminderSchedule = { ...baseSchedule, intervalMinutes: 0 };
    expect(computeNotificationTimes(schedule, referenceDate)).toEqual([]);
  });

  it('returns empty array when start equals end', () => {
    const schedule: ReminderSchedule = {
      ...baseSchedule,
      activeHoursStart: '10:00',
      activeHoursEnd: '10:00',
    };
    expect(computeNotificationTimes(schedule, referenceDate)).toEqual([]);
  });

  it('returns empty array when start is after end', () => {
    const schedule: ReminderSchedule = {
      ...baseSchedule,
      activeHoursStart: '22:00',
      activeHoursEnd: '08:00',
    };
    expect(computeNotificationTimes(schedule, referenceDate)).toEqual([]);
  });

  it('generates times at 60-minute intervals from 08:00 to 22:00', () => {
    const times = computeNotificationTimes(baseSchedule, referenceDate);
    // From 08:00 to 22:00 at 60-minute intervals: 08:00, 09:00, ..., 22:00 = 15 times
    expect(times).toHaveLength(15);
    expect(times[0].getHours()).toBe(8);
    expect(times[0].getMinutes()).toBe(0);
    expect(times[14].getHours()).toBe(22);
    expect(times[14].getMinutes()).toBe(0);
  });

  it('generates times at 30-minute intervals', () => {
    const schedule: ReminderSchedule = { ...baseSchedule, intervalMinutes: 30 };
    const times = computeNotificationTimes(schedule, referenceDate);
    // From 08:00 to 22:00 at 30-minute intervals: 29 times
    expect(times).toHaveLength(29);
  });

  it('all generated times fall within active hours', () => {
    const schedule: ReminderSchedule = { ...baseSchedule, intervalMinutes: 45 };
    const times = computeNotificationTimes(schedule, referenceDate);

    for (const time of times) {
      expect(
        isWithinActiveHours(time, schedule.activeHoursStart, schedule.activeHoursEnd)
      ).toBe(true);
    }
  });

  it('consecutive times are spaced exactly intervalMinutes apart', () => {
    const schedule: ReminderSchedule = { ...baseSchedule, intervalMinutes: 90 };
    const times = computeNotificationTimes(schedule, referenceDate);

    for (let i = 1; i < times.length; i++) {
      const diff = (times[i].getTime() - times[i - 1].getTime()) / (1000 * 60);
      expect(diff).toBe(90);
    }
  });

  it('uses the reference date for the generated times', () => {
    const ref = new Date('2024-03-20T12:00:00');
    const times = computeNotificationTimes(baseSchedule, ref);

    for (const time of times) {
      expect(time.getFullYear()).toBe(2024);
      expect(time.getMonth()).toBe(2); // March = 2
      expect(time.getDate()).toBe(20);
    }
  });
});
