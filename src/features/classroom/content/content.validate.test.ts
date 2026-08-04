import { describe, expect, it } from 'vitest';
import { ACTIVITIES, CLOS, LESSON_SEEDS, THEMES } from './canonical';
import { contentCounts, validateContent } from './canonical/validate';

const banks = { ACTIVITIES, CLOS, LESSON_SEEDS, THEMES };

describe('canonical content integrity', () => {
  it('has zero referential-integrity errors', () => {
    expect(validateContent(banks)).toEqual([]);
  });

  it('ships the expected counts', () => {
    const c = contentCounts(banks);
    // 81 base activities + 15 seed anchors.
    expect(c.activities).toBe(96);
    // 20 day templates + 15 activity anchors.
    expect(c.seeds).toBe(35);
    expect(c.daySeeds).toBe(20);
    expect(c.activitySeeds).toBe(15);
    // 12 canonical monthly (additive-merged) + 10 genre + 4 location.
    expect(c.themes).toBe(26);
    // Learning CLO records: one per activity (96) + one per non-empty
    // day-seed phase (60). The spec's "~106" is the axis tally, not records.
    expect(c.clos).toBe(156);
  });

  it('every calendar month 1-12 has a theme', () => {
    for (let m = 1; m <= 12; m += 1) {
      expect(THEMES.some((t) => t.month === m)).toBe(true);
    }
  });

  it('normalizes away legacy genre-lesson/theory-lesson modules', () => {
    const modules = new Set<string>();
    for (const a of ACTIVITIES) {
      for (const r of a.atlasResources) modules.add(r.module);
    }
    expect([...modules].sort()).toEqual(['arcade', 'globe', 'learn', 'studio']);
  });
});
