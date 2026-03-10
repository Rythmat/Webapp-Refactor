/**
 * Phase 19 — Progress Rules Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  isLevelUnlocked,
  getUnlockedLevels,
  getNextLockedLevel,
  getUnlockThreshold,
} from '../engine/progressRules';
import {
  buildCurriculumLessonId,
  buildCurriculumActivityId,
  parseCurriculumActivityId,
} from '../hooks/useCurriculumProgress';

// ---------------------------------------------------------------------------
// Progress rules
// ---------------------------------------------------------------------------

describe('progressRules', () => {
  const noProgress = () => 0;
  const fullProgress = () => 100;
  const partialProgress = (pct: number) => () => pct;

  it('L1 is always unlocked', () => {
    expect(isLevelUnlocked('POP', 'L1', noProgress)).toBe(true);
    expect(isLevelUnlocked('JAZZ', 'L1', noProgress)).toBe(true);
  });

  it('L2 is locked when L1 < 70%', () => {
    expect(isLevelUnlocked('POP', 'L2', partialProgress(50))).toBe(false);
    expect(isLevelUnlocked('POP', 'L2', partialProgress(69))).toBe(false);
  });

  it('L2 unlocks when L1 >= 70%', () => {
    expect(isLevelUnlocked('POP', 'L2', partialProgress(70))).toBe(true);
    expect(isLevelUnlocked('POP', 'L2', fullProgress)).toBe(true);
  });

  it('L3 is locked when L2 < 70%', () => {
    const getCompletion = (_g: string, level: string) =>
      level === 'L1' ? 100 : level === 'L2' ? 60 : 0;
    expect(isLevelUnlocked('JAZZ', 'L3', getCompletion as any)).toBe(false);
  });

  it('L3 unlocks when L2 >= 70%', () => {
    const getCompletion = (_g: string, level: string) =>
      level === 'L2' ? 85 : 0;
    expect(isLevelUnlocked('JAZZ', 'L3', getCompletion as any)).toBe(true);
  });

  it('getUnlockedLevels returns correct set', () => {
    expect(getUnlockedLevels('POP', noProgress)).toEqual(['L1']);
    expect(getUnlockedLevels('POP', partialProgress(75))).toEqual([
      'L1',
      'L2',
      'L3',
    ]);
    expect(getUnlockedLevels('POP', fullProgress)).toEqual(['L1', 'L2', 'L3']);
  });

  it('getNextLockedLevel returns correct level', () => {
    expect(getNextLockedLevel('POP', noProgress)).toBe('L2');
    expect(getNextLockedLevel('POP', fullProgress)).toBe(null);
  });

  it('getUnlockThreshold returns default', () => {
    expect(getUnlockThreshold('POP')).toBe(70);
    expect(getUnlockThreshold('JAZZ')).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// Activity ID helpers
// ---------------------------------------------------------------------------

describe('curriculum activity IDs', () => {
  it('builds lesson ID correctly', () => {
    expect(buildCurriculumLessonId('JAZZ', 'L2')).toBe('curriculum:JAZZ:L2');
    expect(buildCurriculumLessonId('POP', 'L1')).toBe('curriculum:POP:L1');
  });

  it('builds activity instance ID correctly', () => {
    expect(buildCurriculumActivityId('JAZZ', 'L2', 'A', 3)).toBe(
      'curriculum:JAZZ:L2:A:3',
    );
  });

  it('parses activity ID correctly', () => {
    const parsed = parseCurriculumActivityId('curriculum:JAZZ:L2:A:3');
    expect(parsed).toEqual({
      genre: 'JAZZ',
      level: 'L2',
      section: 'A',
      stepNumber: 3,
    });
  });

  it('returns null for invalid IDs', () => {
    expect(parseCurriculumActivityId('invalid')).toBe(null);
    expect(parseCurriculumActivityId('curriculum:JAZZ')).toBe(null);
    expect(parseCurriculumActivityId('other:JAZZ:L2:A:3')).toBe(null);
  });
});
