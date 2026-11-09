import { describe, expect, it } from 'vitest';
import {
  formatInspect,
  inspectSearch,
  parseInspect,
} from '../useOfficeInspector';

describe('the Inspector in the URL', () => {
  it('round-trips a lesson', () => {
    const target = {
      kind: 'lesson',
      classroomId: 'c1',
      dayId: 'day-42',
    } as const;
    expect(formatInspect(target)).toBe('lesson:c1/day-42');
    expect(parseInspect(formatInspect(target))).toEqual(target);
    expect(inspectSearch(target)).toBe('?inspect=lesson%3Ac1%2Fday-42');
  });

  it('ignores what it cannot read', () => {
    for (const bad of [
      null,
      '',
      'lesson',
      'lesson:',
      'lesson:c1',
      'lesson:/d',
      'lesson:c1/',
      'song:x/y',
    ]) {
      expect(parseInspect(bad)).toBeNull();
    }
  });
});
