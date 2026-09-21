import { describe, expect, it } from 'vitest';
import {
  NO_MARKS,
  isOneSystem,
  planSystems,
  withPageBreak,
  withSystemBreak,
  withSystemRun,
  type SystemMarks,
} from '../systemPlan';

const marks = (over: Partial<SystemMarks> = {}): SystemMarks => ({
  ...NO_MARKS,
  ...over,
});

const shape = (systems: ReturnType<typeof planSystems>) =>
  systems.map((s) => s.measures);

describe('the default flow', () => {
  it('deals bars out four to a line', () => {
    expect(shape(planSystems(12, 4))).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
    ]);
  });

  it('leaves a short last line short', () => {
    expect(shape(planSystems(6, 4))).toEqual([
      [0, 1, 2, 3],
      [4, 5],
    ]);
  });

  it('handles an empty score', () => {
    expect(planSystems(0, 4)).toEqual([]);
  });

  it('honours another bars-per-line', () => {
    expect(shape(planSystems(6, 2))).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
});

describe('a system break', () => {
  // The bug this replaces: a break at bar 3 turned every bar after it into
  // one enormous system, because the layout was stored as row sizes.
  it('splits there and lets the rest flow on as before', () => {
    const plan = planSystems(12, 4, marks({ breaks: new Set([3]) }));
    expect(shape(plan)).toEqual([[0, 1, 2], [3, 4, 5, 6], [7, 8, 9, 10], [11]]);
  });

  it('works on any barline, not just the fourth', () => {
    for (const at of [1, 2, 3, 5, 7, 9]) {
      const plan = planSystems(12, 4, marks({ breaks: new Set([at]) }));
      const starts = plan.map((s) => s.measures[0]);
      expect(starts).toContain(at);
    }
  });

  it('takes several breaks at once', () => {
    const plan = planSystems(10, 4, marks({ breaks: new Set([2, 5]) }));
    expect(shape(plan)).toEqual([[0, 1], [2, 3, 4], [5, 6, 7, 8], [9]]);
  });

  it('toggles on and off again', () => {
    const on = withSystemBreak([], 3, 12);
    expect(on).toEqual([3]);
    expect(withSystemBreak(on, 3, 12)).toEqual([]);
  });

  it('refuses a break at the start or past the end', () => {
    expect(withSystemBreak([], 0, 12)).toEqual([]);
    expect(withSystemBreak([], 12, 12)).toEqual([]);
  });
});

describe('making bars into one system', () => {
  it('holds eight bars on one line', () => {
    const { runs, breaks } = withSystemRun([], [], [2, 3, 4, 5, 6, 7, 8, 9]);
    const plan = planSystems(
      14,
      4,
      marks({ runs: new Map(runs), breaks: new Set(breaks) }),
    );
    expect(shape(plan)).toEqual([
      [0, 1],
      [2, 3, 4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13],
    ]);
  });

  it('holds five bars, which the default would have split', () => {
    const { runs, breaks } = withSystemRun([], [], [0, 1, 2, 3, 4]);
    const plan = planSystems(
      10,
      4,
      marks({ runs: new Map(runs), breaks: new Set(breaks) }),
    );
    expect(shape(plan)[0]).toEqual([0, 1, 2, 3, 4]);
  });

  it('lets the rest of the score flow normally after it', () => {
    const { runs, breaks } = withSystemRun([], [], [0, 1, 2, 3, 4, 5]);
    const plan = planSystems(
      14,
      4,
      marks({ runs: new Map(runs), breaks: new Set(breaks) }),
    );
    expect(shape(plan).slice(1)).toEqual([
      [6, 7, 8, 9],
      [10, 11, 12, 13],
    ]);
  });

  it('clears a break that fell inside the new system', () => {
    const { breaks } = withSystemRun([], [4], [2, 3, 4, 5, 6]);
    expect(breaks).not.toContain(4);
    expect(breaks).toContain(2);
  });

  it('replaces a run that started on the same bar', () => {
    const { runs } = withSystemRun([[2, 3]], [], [2, 3, 4, 5, 6]);
    expect(runs).toEqual([[2, 5]]);
  });

  it('ignores an empty selection', () => {
    expect(withSystemRun([[2, 3]], [1], [])).toEqual({
      runs: [[2, 3]],
      breaks: [1],
    });
  });

  it('recognises bars that are already one system', () => {
    const plan = planSystems(12, 4);
    expect(isOneSystem(plan, [0, 1, 2, 3])).toBe(true);
    expect(isOneSystem(plan, [0, 1, 2])).toBe(false);
    expect(isOneSystem(plan, [])).toBe(false);
  });
});

describe('a page break', () => {
  it('starts a system, and marks it as opening a page', () => {
    const plan = planSystems(12, 4, marks({ pageBreaks: new Set([6]) }));
    expect(shape(plan)).toEqual([
      [0, 1, 2, 3],
      [4, 5],
      [6, 7, 8, 9],
      [10, 11],
    ]);
    expect(plan.map((s) => s.startsPage)).toEqual([false, false, true, false]);
  });

  it('toggles on and off again', () => {
    const on = withPageBreak([], 8, 16);
    expect(on).toEqual([8]);
    expect(withPageBreak(on, 8, 16)).toEqual([]);
  });

  it('refuses a page break at the start or past the end', () => {
    expect(withPageBreak([], 0, 16)).toEqual([]);
    expect(withPageBreak([], 16, 16)).toEqual([]);
  });

  it('works alongside a system break and a run', () => {
    const plan = planSystems(
      16,
      4,
      marks({
        breaks: new Set([2]),
        runs: new Map([[8, 5]]),
        pageBreaks: new Set([8]),
      }),
    );
    expect(shape(plan)).toEqual([
      [0, 1],
      [2, 3, 4, 5],
      [6, 7],
      [8, 9, 10, 11, 12],
      [13, 14, 15],
    ]);
    expect(plan.find((s) => s.measures[0] === 8)?.startsPage).toBe(true);
  });
});

describe('every bar is dealt exactly once', () => {
  it('whatever the marks say', () => {
    const plan = planSystems(
      20,
      4,
      marks({
        breaks: new Set([3, 11]),
        runs: new Map([[13, 6]]),
        pageBreaks: new Set([5]),
      }),
    );
    expect(plan.flatMap((s) => s.measures)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
  });
});
