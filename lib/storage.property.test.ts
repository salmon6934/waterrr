import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterEntriesByDate } from './storage';
import type { IntakeEntry } from './types';

/**
 * Property 4: Date filtering returns only matching entries
 *
 * For any set of intake entries spanning multiple calendar dates and any target date,
 * filterEntriesByDate(entries, date) SHALL return exactly those entries whose timestamp
 * falls within that calendar date, and no others.
 *
 * **Validates: Requirements 1.6, 2.2**
 */
describe('Property 4: Date filtering returns only matching entries', () => {
  // Arbitrary that generates an IntakeEntry with a timestamp on a given date
  const intakeEntryOnDate = (date: Date) =>
    fc.record({
      id: fc.uuid(),
      volume: fc.integer({ min: 1, max: 5000 }),
      // Generate a random time-of-day on the specified date
      hour: fc.integer({ min: 0, max: 23 }),
      minute: fc.integer({ min: 0, max: 59 }),
      second: fc.integer({ min: 0, max: 59 }),
      ms: fc.integer({ min: 0, max: 999 }),
    }).map(({ id, volume, hour, minute, second, ms }) => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second, ms);
      return {
        id,
        volume,
        timestamp: d.toISOString(),
      } as IntakeEntry;
    });

  // Arbitrary that generates a reasonable date (within a few years range)
  const arbitraryDate = fc
    .integer({ min: 0, max: 1000 })
    .map((offset) => {
      const base = new Date(2020, 0, 1);
      base.setDate(base.getDate() + offset);
      return base;
    });

  it('returns exactly entries matching the target date and no others', () => {
    fc.assert(
      fc.property(
        // Generate 2-5 distinct dates
        fc.array(arbitraryDate, { minLength: 2, maxLength: 5 }).chain((dates) => {
          // Pick one as the target date
          return fc.record({
            targetIndex: fc.integer({ min: 0, max: dates.length - 1 }),
            entriesPerDate: fc.tuple(
              ...dates.map((date) => fc.array(intakeEntryOnDate(date), { minLength: 0, maxLength: 5 }))
            ),
          }).map(({ targetIndex, entriesPerDate }) => ({
            dates,
            targetDate: dates[targetIndex],
            entriesPerDate,
          }));
        }),
        ({ dates, targetDate, entriesPerDate }) => {
          // Flatten all entries
          const allEntries = entriesPerDate.flat();

          // Call the function under test
          const result = filterEntriesByDate(allEntries, targetDate);

          const targetYear = targetDate.getFullYear();
          const targetMonth = targetDate.getMonth();
          const targetDay = targetDate.getDate();

          // 1. All returned entries have timestamps on the target date
          for (const entry of result) {
            const entryDate = new Date(entry.timestamp);
            expect(entryDate.getFullYear()).toBe(targetYear);
            expect(entryDate.getMonth()).toBe(targetMonth);
            expect(entryDate.getDate()).toBe(targetDay);
          }

          // 2. No entries from other dates are included (completeness check)
          const expectedEntries = allEntries.filter((entry) => {
            const entryDate = new Date(entry.timestamp);
            return (
              entryDate.getFullYear() === targetYear &&
              entryDate.getMonth() === targetMonth &&
              entryDate.getDate() === targetDay
            );
          });

          expect(result.length).toBe(expectedEntries.length);

          // 3. Entries not returned have timestamps on different dates
          const returnedIds = new Set(result.map((e) => e.id));
          const notReturned = allEntries.filter((e) => !returnedIds.has(e.id));
          for (const entry of notReturned) {
            const entryDate = new Date(entry.timestamp);
            const onTargetDate =
              entryDate.getFullYear() === targetYear &&
              entryDate.getMonth() === targetMonth &&
              entryDate.getDate() === targetDay;
            expect(onTargetDate).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
