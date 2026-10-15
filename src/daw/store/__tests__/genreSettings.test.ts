/**
 * A genre's Prism settings (genreSettings.ts), shared by choosing a genre in
 * Prism and by opening a project template: the genre's swing and strum from
 * the engine's tables, and a rhythm drawn from the genre's own, Whole Notes
 * weighted in.
 *
 * Run: npx vitest run src/daw/store/__tests__/genreSettings.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GENRE_MAP, GENRE_STRUM, GENRE_SWING } from '@prism/engine';
import { genreSettings, genreStrum } from '../genreSettings';
import { useStore } from '../index';

afterEach(() => {
  vi.restoreAllMocks();
});

const rhythmsOf = (...genres: string[]) =>
  Object.entries(GENRE_MAP)
    .filter(([, genre]) => genres.includes(genre))
    .map(([rhythm]) => rhythm);

describe('genreSettings', () => {
  it("takes the genre's swing and strum from the engine", () => {
    const rock = genreSettings('Rock');
    expect(rock).toMatchObject({
      genre: 'Rock',
      swing: GENRE_SWING['Rock' as keyof typeof GENRE_SWING] ?? 0,
      // The table's number as it stands, as before 1.3: the table counts
      // from 0 and StrumMode from 1, which 1.16 reconciles.
      strumMode: GENRE_STRUM.Rock.mode,
      strumAmount: GENRE_STRUM.Rock.amount,
    });
    expect(GENRE_STRUM.Rock.amount).toBeGreaterThan(0);
  });

  it("draws the rhythm from the genre's own, or its aliases, and Whole Notes", () => {
    const pool = [...rhythmsOf('Pop', 'Rock'), 'Whole Notes'];
    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      vi.spyOn(Math, 'random').mockReturnValue(draw);
      expect(pool).toContain(genreSettings('Indie').rhythmName);
    }
    // The pool's first draw is the genre's first rhythm; its last, Whole Notes.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(genreSettings('Rock').rhythmName).toBe(rhythmsOf('Rock')[0]);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(genreSettings('Rock').rhythmName).toBe('Whole Notes');
  });

  it('leaves the rhythm out for a genre with none, and plain swing and strum', () => {
    const none = genreSettings('No Such Genre');
    expect(none).toEqual({
      genre: 'No Such Genre',
      swing: 0,
      strumMode: 0,
      strumAmount: 0,
    });
    expect('rhythmName' in none).toBe(false);
  });

  it('strums as genreStrum says, which draws nothing at random', () => {
    const random = vi.spyOn(Math, 'random');
    for (const genre of ['Rock', 'Jazz', 'Reggae', 'No Such Genre']) {
      const strum = genreStrum(genre);
      expect(genreSettings(genre)).toMatchObject(strum);
    }
    random.mockClear();
    genreStrum('Indie');
    expect(random).not.toHaveBeenCalled();
  });

  it('is what choosing the genre in Prism writes', () => {
    useStore.setState(useStore.getInitialState(), true);
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const expected = genreSettings('Hip Hop');
    useStore.getState().selectGenre('Hip Hop');
    expect(useStore.getState()).toMatchObject(expected);
  });
});
