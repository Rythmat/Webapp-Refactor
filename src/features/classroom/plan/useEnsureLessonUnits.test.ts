import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Day, Unit } from '../types';
import { defaultUnitIdFor, planOrphanAdoptions } from './useEnsureLessonUnits';

// Minimal fixtures — planOrphanAdoptions only reads id/label/scheduledDate and
// unit id/dayIds, so the rest of the shapes are irrelevant here.
const mkDay = (id: string, label: string, scheduledDate: string | null): Day =>
  ({ id, label, scheduledDate }) as unknown as Day;

const mkUnit = (id: string, monthIndex: number, dayIds: string[] = []): Unit =>
  ({ id, monthIndex, dayIds }) as unknown as Unit;

afterEach(() => {
  vi.useRealTimers();
});

describe('planOrphanAdoptions', () => {
  // `monthIndex` is 1-indexed (10 = October), matching the October test dates.
  const units = [mkUnit('u1', 10)]; // single unit → the adoption target

  it('adopts a lone orphan into a unit', () => {
    expect(
      planOrphanAdoptions(units, [mkDay('d1', 'Blues', '2025-10-06')]),
    ).toEqual([{ dayId: 'd1', unitId: 'u1' }]);
  });

  it('does NOT re-adopt an orphan that duplicates an already-linked Day', () => {
    const withLinked = [mkUnit('u1', 10, ['linked'])];
    const days = [
      mkDay('linked', 'Blues', '2025-10-06'),
      mkDay('orphan', 'Blues', '2025-10-06'), // same date + label → skip
    ];
    expect(planOrphanAdoptions(withLinked, days)).toEqual([]);
  });

  it('still adopts a distinct orphan (different label) on the same date', () => {
    const withLinked = [mkUnit('u1', 10, ['linked'])];
    const days = [
      mkDay('linked', 'Blues', '2025-10-06'),
      mkDay('other', 'Jazz', '2025-10-06'),
    ];
    expect(planOrphanAdoptions(withLinked, days)).toEqual([
      { dayId: 'other', unitId: 'u1' },
    ]);
  });

  it('adopts only the first of two duplicate orphans', () => {
    const days = [
      mkDay('a', 'Blues', '2025-10-06'),
      mkDay('b', 'Blues', '2025-10-06'), // duplicate of a → skip
    ];
    expect(planOrphanAdoptions(units, days)).toEqual([
      { dayId: 'a', unitId: 'u1' },
    ]);
  });

  it('adopts an unscheduled orphan into the current-month unit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 9, 15)); // October → getMonth()+1 = 10 = u1
    expect(planOrphanAdoptions(units, [mkDay('d1', 'X', null)])).toEqual([
      { dayId: 'd1', unitId: 'u1' },
    ]);
  });

  it('does NOT dump an unmatched orphan into the first unit (no fallback)', () => {
    // Only an August unit; an October day has no month match → stays orphaned.
    expect(
      planOrphanAdoptions([mkUnit('aug', 24)], [mkDay('d1', 'X', '2025-10-06')]),
    ).toEqual([]);
  });

  it('returns nothing when there are no units', () => {
    expect(planOrphanAdoptions([], [mkDay('d1', 'X', '2025-10-06')])).toEqual(
      [],
    );
  });
});

describe('defaultUnitIdFor', () => {
  it('maps a September ISO date to the monthIndex:9 unit (1-indexed, TZ-safe)', () => {
    // `new Date("2025-09-01")` is UTC → Aug 31 local in negative offsets; the
    // slice-based parse returns 9 regardless of the runner's timezone.
    expect(
      defaultUnitIdFor([mkUnit('aug', 8), mkUnit('sep', 9)], '2025-09-01'),
    ).toBe('sep');
  });

  it('returns undefined when no unit matches the month', () => {
    expect(defaultUnitIdFor([mkUnit('aug', 8)], '2025-10-06')).toBeUndefined();
  });

  it('uses today’s local month (1-indexed) when unscheduled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 8, 10)); // September → month 9
    expect(defaultUnitIdFor([mkUnit('aug', 8), mkUnit('sep', 9)])).toBe('sep');
  });
});
