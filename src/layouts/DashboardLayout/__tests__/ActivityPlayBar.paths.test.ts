import { describe, expect, it } from 'vitest';
import { isPlayBarPath, shouldShowPlayBar } from '../ActivityPlayBar';

describe('where the bar at the foot of the page shows', () => {
  it('shows Recent activity on its landing pages and every Library page', () => {
    for (const path of [
      '/home',
      '/learn',
      '/songs',
      '/library',
      '/library/p1',
    ]) {
      expect(isPlayBarPath(path)).toBe(true);
    }
    expect(isPlayBarPath('/library/')).toBe(true);
    expect(isPlayBarPath('/classroom')).toBe(false);
    expect(isPlayBarPath('/libraryx')).toBe(false);
  });

  it('shows on every page while the player holds something', () => {
    expect(shouldShowPlayBar('/classroom', true)).toBe(true);
    expect(shouldShowPlayBar('/classroom', false)).toBe(false);
    expect(shouldShowPlayBar('/library', false)).toBe(true);
  });
});
