import { describe, expect, it } from 'vitest';
import {
  formatInspect,
  inspectSearch,
  parseInspect,
  withInspect,
} from '../useOfficeInspector';

describe('the Inspector in the URL', () => {
  it('round-trips each kind', () => {
    for (const kind of ['lesson', 'student', 'assignment'] as const) {
      const target = { kind, classroomId: 'c1', id: 'x-42' };
      expect(formatInspect(target)).toBe(`${kind}:c1/x-42`);
      expect(parseInspect(formatInspect(target))).toEqual(target);
    }
    expect(
      inspectSearch({ kind: 'lesson', classroomId: 'c1', id: 'day-42' }),
    ).toBe('?inspect=lesson%3Ac1%2Fday-42');
  });

  it('keeps the page’s other params', () => {
    expect(
      withInspect('?view=week', { kind: 'lesson', classroomId: 'c', id: 'd' }),
    ).toBe('?view=week&inspect=lesson%3Ac%2Fd');
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
