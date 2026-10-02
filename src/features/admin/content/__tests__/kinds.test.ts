import { describe, expect, it } from 'vitest';
import { isContentKind, KIND_ORDER } from '../kinds';

/**
 * The edit page trusts `isContentKind` to decide between an editor and the
 * "not a content kind" notice. An unknown kind once opened silently as a globe
 * event, so the guard is pinned here.
 */
describe('isContentKind', () => {
  it('accepts every kind the console lists', () => {
    for (const kind of KIND_ORDER) expect(isContentKind(kind), kind).toBe(true);
  });

  it('refuses typos, blanks and inherited object keys', () => {
    for (const value of [
      undefined,
      '',
      'globe_events',
      'Song',
      'constructor',
      'toString',
      '__proto__',
      'hasOwnProperty',
    ]) {
      expect(isContentKind(value), String(value)).toBe(false);
    }
  });
});
