import { describe, expect, it } from 'vitest';
import { plannerDays, plannerLabel, weekFromParam } from '../plannerWeek';

const TODAY = new Date(2026, 10, 11); // Wednesday 11 Nov 2026

describe('the Planner week', () => {
  it('runs Monday to Sunday, weekend last', () => {
    const days = plannerDays(new Date(2026, 10, 11));
    expect(days.map((d) => d.iso)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(days.map((d) => d.weekend)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('reads the week from the URL, else this week', () => {
    expect(weekFromParam('2026-12-02', TODAY).getDate()).toBe(29); // its Sunday
    expect(weekFromParam(null, TODAY).getDate()).toBe(8);
    expect(weekFromParam('nonsense', TODAY).getDate()).toBe(8);
  });

  it('labels the week, across a month too', () => {
    expect(plannerLabel(plannerDays(new Date(2026, 10, 25)))).toBe(
      'Nov 23 – 29, 2026',
    );
    expect(plannerLabel(plannerDays(new Date(2026, 11, 2)))).toBe(
      'Nov 30 – Dec 6, 2026',
    );
    expect(plannerLabel(plannerDays(new Date(2026, 10, 11)))).toBe(
      'Nov 9 – 15, 2026',
    );
  });
});
