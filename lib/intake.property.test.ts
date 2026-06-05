import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateProgress, isValidVolume, sortEntriesChronologically } from './intake';
import type { IntakeEntry } from './types';

/**
 * Property 1: Progress percentage is bounded and proportional
 * **Validates: Requirements 1.1, 1.4**
 *
 * For any current intake value >= 0 and any daily goal > 0,
 * calculateProgress(current, goal) SHALL equal (current / goal) * 100
 * clamped to the range [0, 100].
 */
describe('Property 1: Progress percentage is bounded and proportional', () => {
  it('should always return a value in [0, 100] for any non-negative current and positive goal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
        (current, goal) => {
          const result = calculateProgress(current, goal);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      )
    );
  });

  it('should equal (current / goal) * 100 clamped to [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
        (current, goal) => {
          const result = calculateProgress(current, goal);
          const expected = Math.min(Math.max((current / goal) * 100, 0), 100);
          expect(result).toBeCloseTo(expected, 10);
        }
      )
    );
  });

  it('should return 100 when current exceeds goal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
        (goal) => {
          const current = goal * 2;
          const result = calculateProgress(current, goal);
          expect(result).toBe(100);
        }
      )
    );
  });

  it('should return 0 when current is 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
        (goal) => {
          const result = calculateProgress(0, goal);
          expect(result).toBe(0);
        }
      )
    );
  });
});

/**
 * Property 2: Custom volume validation accepts valid range
 * **Validates: Requirements 1.3**
 *
 * For any numeric input value, isValidVolume(volume) SHALL return true
 * if and only if the value is an integer between 1 and 5000 inclusive.
 */
describe('Property 2: Custom volume validation accepts valid range', () => {
  it('returns true for any integer in [1, 5000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5000 }), (volume) => {
        expect(isValidVolume(volume)).toBe(true);
      })
    );
  });

  it('returns false for integers outside [1, 5000] (negative, zero, > 5000)', () => {
    const outOfRange = fc.oneof(
      fc.integer({ min: -1_000_000, max: 0 }),
      fc.integer({ min: 5001, max: 1_000_000 })
    );

    fc.assert(
      fc.property(outOfRange, (volume) => {
        expect(isValidVolume(volume)).toBe(false);
      })
    );
  });

  it('returns false for non-integer floats', () => {
    const nonIntegerFloat = fc.double({
      min: -1_000_000,
      max: 1_000_000,
      noDefaultInfinity: true,
      noNaN: true,
    }).filter((v) => !Number.isInteger(v));

    fc.assert(
      fc.property(nonIntegerFloat, (volume) => {
        expect(isValidVolume(volume)).toBe(false);
      })
    );
  });
});

/**
 * **Validates: Requirements 1.5**
 *
 * Property 3: Daily log is chronologically ordered
 *
 * For any set of intake entries with distinct timestamps,
 * sortEntriesChronologically SHALL produce a list where each entry's
 * timestamp is less than or equal to the next entry's timestamp.
 */
describe('Property 3: Daily log is chronologically ordered', () => {
  it('sorted entries have non-decreasing timestamps for all consecutive pairs', () => {
    // Generate distinct timestamps as unique integers (ms since epoch) within a reasonable range
    const minMs = new Date('2020-01-01T00:00:00Z').getTime();
    const maxMs = new Date('2030-12-31T23:59:59Z').getTime();

    const distinctTimestampEntries = fc
      .uniqueArray(fc.integer({ min: minMs, max: maxMs }), { minLength: 0, maxLength: 50 })
      .map((timestamps) =>
        timestamps.map(
          (ts, i): IntakeEntry => ({
            id: `entry-${i}-${ts}`,
            volume: 250,
            timestamp: new Date(ts).toISOString(),
          })
        )
      );

    fc.assert(
      fc.property(distinctTimestampEntries, (entries) => {
        const sorted = sortEntriesChronologically(entries);

        for (let i = 0; i < sorted.length - 1; i++) {
          const current = new Date(sorted[i].timestamp).getTime();
          const next = new Date(sorted[i + 1].timestamp).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }),
      { numRuns: 200 }
    );
  });
});
