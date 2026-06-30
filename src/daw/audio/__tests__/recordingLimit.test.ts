import { describe, it, expect } from 'vitest';
import {
  computeMaxRecordSeconds,
  mergeIntervals,
  type Interval,
} from '@/daw/audio/recordingLimit';

const CAP = 300; // 5 minutes

describe('mergeIntervals', () => {
  it('merges overlapping and adjacent intervals', () => {
    const merged = mergeIntervals([
      { start: 0, end: 10 },
      { start: 5, end: 15 },
      { start: 15, end: 20 },
      { start: 30, end: 40 },
    ]);
    expect(merged).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 40 },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(mergeIntervals([])).toEqual([]);
  });
});

describe('computeMaxRecordSeconds', () => {
  it('gives the full cap on an empty track', () => {
    expect(computeMaxRecordSeconds([], 0, CAP)).toBe(CAP);
    expect(computeMaxRecordSeconds([], 120, CAP)).toBe(CAP);
  });

  it('reduces the budget by existing coverage when recording into empty space', () => {
    // 2 minutes already used; recording starts after it in empty space.
    const existing: Interval[] = [{ start: 0, end: 120 }];
    expect(computeMaxRecordSeconds(existing, 200, CAP)).toBe(180);
  });

  it('treats time spent over existing audio as free (overwrite)', () => {
    // One 1-minute clip at [120,180]. Start at 60s in empty space.
    // Budget = 300 - 60 = 240s of NEW coverage. Walking from 60:
    //   [60,120) gap = 60s new, [120,180) free, [180,...) new.
    // 240 new = 60 (before) + 180 (after) -> stop at 180+180 = 360.
    // Wall-clock = 360 - 60 = 300.
    const existing: Interval[] = [{ start: 120, end: 180 }];
    expect(computeMaxRecordSeconds(existing, 60, CAP)).toBe(300);
  });

  it('starting inside an existing clip: covered portion is free', () => {
    // Clip [120,240] (2 min). Start at 180 (inside it). usedCoverage = 120.
    // Budget = 180. [180,240) free, then new from 240 -> stop at 240+180=420.
    // Wall-clock = 420 - 180 = 240.
    const existing: Interval[] = [{ start: 120, end: 240 }];
    expect(computeMaxRecordSeconds(existing, 180, CAP)).toBe(240);
  });

  it('returns 0 when the track is full and the start is in empty space', () => {
    const existing: Interval[] = [{ start: 0, end: 300 }];
    expect(computeMaxRecordSeconds(existing, 400, CAP)).toBe(0);
  });

  it('full track but starting inside coverage: can re-record over it only', () => {
    // Track full [0,300]. Start at 100 inside it. Budget 0, but [100,300) is
    // free to overwrite, so recording may run until coverage ends at 300.
    const existing: Interval[] = [{ start: 0, end: 300 }];
    expect(computeMaxRecordSeconds(existing, 100, CAP)).toBe(200);
  });
});
