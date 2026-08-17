import { describe, expect, it } from 'vitest';
import { computeUnitReschedule } from './calendarDnd';

/**
 * September 2025 starts on a Monday (Sep 1 = Mon). Weekends that matter to the
 * cases below, marked non-school so the school-day walk skips them.
 */
const weekendMap = (): Map<string, unknown> => {
  const m = new Map<string, unknown>();
  for (const d of [
    '2025-09-06',
    '2025-09-07',
    '2025-09-13',
    '2025-09-14',
    '2025-09-20',
    '2025-09-21',
    '2025-09-27',
    '2025-09-28',
  ]) {
    m.set(d, { kind: 'weekend' });
  }
  return m;
};

describe('computeUnitReschedule', () => {
  it('keeps consecutive lessons consecutive', () => {
    // Mon/Tue/Wed → drop on the next Monday.
    expect(
      computeUnitReschedule(
        ['2025-09-01', '2025-09-02', '2025-09-03'],
        '2025-09-08',
        weekendMap(),
      ),
    ).toEqual(['2025-09-08', '2025-09-09', '2025-09-10']);
  });

  it('preserves school-day gaps (Mon/Wed/Fri stays Mon/Wed/Fri)', () => {
    expect(
      computeUnitReschedule(
        ['2025-09-01', '2025-09-03', '2025-09-05'],
        '2025-09-08',
        weekendMap(),
      ),
    ).toEqual(['2025-09-08', '2025-09-10', '2025-09-12']);
  });

  it('treats Fri→Mon as adjacent school days (weekend not a gap)', () => {
    // Fri Sep 5 + Mon Sep 8 are consecutive school days → drop on Fri Sep 12
    // lands Fri Sep 12 + Mon Sep 15 (the weekend between is skipped).
    expect(
      computeUnitReschedule(
        ['2025-09-05', '2025-09-08'],
        '2025-09-12',
        weekendMap(),
      ),
    ).toEqual(['2025-09-12', '2025-09-15']);
  });

  it('dropping on a weekend lands the block on the next school day', () => {
    expect(
      computeUnitReschedule(['2025-09-01'], '2025-09-06', weekendMap()),
    ).toEqual(['2025-09-08']);
  });

  it('sorts the input and returns results parallel to the sorted order', () => {
    expect(
      computeUnitReschedule(
        ['2025-09-03', '2025-09-01', '2025-09-02'],
        '2025-09-08',
        weekendMap(),
      ),
    ).toEqual(['2025-09-08', '2025-09-09', '2025-09-10']);
  });

  it('never collides two days onto one date when a member sits on a non-school day', () => {
    // A member Day parked on a Saturday (non-school) would tie the preceding
    // Friday's school-day offset; the strictly-increasing rule bumps it to the
    // next school day instead of stacking on the same date.
    const result = computeUnitReschedule(
      ['2025-09-05', '2025-09-06'], // Fri (school) + Sat (weekend)
      '2025-09-12', // Fri
      weekendMap(),
    );
    expect(new Set(result).size).toBe(2); // distinct dates
    expect(result).toEqual(['2025-09-12', '2025-09-15']); // Fri → next school day (Mon)
  });

  it('returns [] for a Unit with no scheduled days', () => {
    expect(computeUnitReschedule([], '2025-09-08', weekendMap())).toEqual([]);
  });
});
