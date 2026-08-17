import { describe, expect, it } from 'vitest';
import type { Day, Unit } from '../types';
import { planOrphanAdoptions } from './useEnsureLessonUnits';

// Minimal fixtures — planOrphanAdoptions only reads id/label/scheduledDate and
// unit id/dayIds, so the rest of the shapes are irrelevant here.
const mkDay = (id: string, label: string, scheduledDate: string | null): Day =>
  ({ id, label, scheduledDate }) as unknown as Day;

const mkUnit = (id: string, monthIndex: number, dayIds: string[] = []): Unit =>
  ({ id, monthIndex, dayIds }) as unknown as Unit;

describe('planOrphanAdoptions', () => {
  const units = [mkUnit('u1', 9)]; // single unit → the adoption target

  it('adopts a lone orphan into a unit', () => {
    expect(
      planOrphanAdoptions(units, [mkDay('d1', 'Blues', '2025-10-06')]),
    ).toEqual([{ dayId: 'd1', unitId: 'u1' }]);
  });

  it('does NOT re-adopt an orphan that duplicates an already-linked Day', () => {
    const withLinked = [mkUnit('u1', 9, ['linked'])];
    const days = [
      mkDay('linked', 'Blues', '2025-10-06'),
      mkDay('orphan', 'Blues', '2025-10-06'), // same date + label → skip
    ];
    expect(planOrphanAdoptions(withLinked, days)).toEqual([]);
  });

  it('still adopts a distinct orphan (different label) on the same date', () => {
    const withLinked = [mkUnit('u1', 9, ['linked'])];
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

  it('adopts an unscheduled orphan (no signature to dedupe on)', () => {
    expect(planOrphanAdoptions(units, [mkDay('d1', 'X', null)])).toEqual([
      { dayId: 'd1', unitId: 'u1' },
    ]);
  });

  it('returns nothing when there are no units', () => {
    expect(
      planOrphanAdoptions([], [mkDay('d1', 'X', '2025-10-06')]),
    ).toEqual([]);
  });
});
