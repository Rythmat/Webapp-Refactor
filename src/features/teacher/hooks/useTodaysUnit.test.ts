import { describe, expect, it } from 'vitest';
import type { Unit } from '@/features/classroom/types';
import { findUnitsActiveOn } from './useTodaysUnit';

const makeUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'unit-test-abcd',
  label: 'Test',
  monthIndex: 9,
  theme: null,
  weeks: [],
  ...overrides,
});

describe('findUnitsActiveOn', () => {
  const sy = { autumn: 2025, spring: 2026 };

  it('returns the HHM unit when today is Oct 1 (inside its window)', () => {
    const units = [
      makeUnit({
        id: 'unit-sept-hhm-x',
        monthIndex: 9,
        dateWindow: { start: '09-15', end: '10-15' },
      }),
      makeUnit({ id: 'unit-may-mothers-day-x', monthIndex: 5 }),
    ];
    const today = new Date(2025, 9, 1); // Oct 1, 2025
    const active = findUnitsActiveOn(units, today, sy);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('unit-sept-hhm-x');
  });

  it('returns no units when today is July (outside the school year)', () => {
    const units = [
      makeUnit({
        id: 'unit-sept-hhm-x',
        monthIndex: 9,
        dateWindow: { start: '09-15', end: '10-15' },
      }),
      makeUnit({ id: 'unit-aug-welcome-x', monthIndex: 8 }),
    ];
    const today = new Date(2025, 6, 15); // Jul 15, 2025
    const active = findUnitsActiveOn(units, today, sy);
    expect(active).toEqual([]);
  });

  it('returns multiple units on Oct 13 (HHM and Indigenous+DDLM overlap)', () => {
    const units = [
      makeUnit({
        id: 'unit-sept-hhm-x',
        monthIndex: 9,
        dateWindow: { start: '09-15', end: '10-15' },
      }),
      makeUnit({
        id: 'unit-oct-indigenous-ddlm-x',
        monthIndex: 10,
        dateWindow: { start: '10-12', end: '11-02' },
      }),
    ];
    const today = new Date(2025, 9, 13); // Oct 13, 2025
    const active = findUnitsActiveOn(units, today, sy);
    expect(active).toHaveLength(2);
  });

  it('defaults to a full-month range when no dateWindow is set', () => {
    const units = [makeUnit({ id: 'unit-nov-compassion-x', monthIndex: 11 })];
    const today = new Date(2025, 10, 20); // Nov 20, 2025
    expect(findUnitsActiveOn(units, today, sy)).toHaveLength(1);
  });
});
