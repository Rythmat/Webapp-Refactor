import { describe, expect, it } from 'vitest';
import {
  MAX_FAVOURITES,
  isFavouriteId,
  isLibraryFavourites,
  toggledFavourites,
} from '../favourites';

// ── Library favourites: what prefsStore keeps (milestone 2.14) ─────────────
// The ♡ list is a per-user pref stored as JSON, so it is a sorted array of
// item ids (a Set would store as {}), and prefsStore takes nothing else.

describe('library favourites', () => {
  it('know an item id by its kind', () => {
    expect(isFavouriteId('part:pop-l1-d1-2')).toBe(true);
    expect(isFavouriteId('preset:pack:BA - 303 REALITY')).toBe(true);
    expect(isFavouriteId('sample:x')).toBe(false);
    expect(isFavouriteId('part:')).toBe(false);
    expect(isFavouriteId(':x')).toBe(false);
    expect(isFavouriteId(3)).toBe(false);
    expect(isFavouriteId(`part:${'x'.repeat(200)}`)).toBe(false);
  });

  it('are kept sorted and unique by a toggle', () => {
    let list = toggledFavourites([], 'part:b');
    list = toggledFavourites(list, 'groove:a');
    expect(list).toEqual(['groove:a', 'part:b']);
    expect(isLibraryFavourites(list)).toBe(true);
    expect(toggledFavourites(list, 'part:b')).toEqual(['groove:a']);
    expect(toggledFavourites(list, 'nonsense')).toEqual(list);
  });

  it('take only a sorted list of item ids, not too long', () => {
    expect(isLibraryFavourites([])).toBe(true);
    expect(isLibraryFavourites(['part:b', 'part:a'])).toBe(false);
    expect(isLibraryFavourites(['part:a', 'part:a'])).toBe(false);
    expect(isLibraryFavourites({})).toBe(false);
    const many = Array.from(
      { length: MAX_FAVOURITES + 1 },
      (_, i) => `part:${String(i).padStart(4, '0')}`,
    );
    expect(isLibraryFavourites(many)).toBe(false);
    expect(
      toggledFavourites(many.slice(0, MAX_FAVOURITES), 'part:zz'),
    ).toHaveLength(MAX_FAVOURITES);
  });
});
