import { describe, expect, it } from 'vitest';
import { readLessonOrigin, withStudioOrigin } from '../lessonOrigin';
import { modeDegreeFormula } from '../modeCharacter';

const read = (url: string) =>
  readLessonOrigin(new URL(url, 'http://x').searchParams);

describe('lesson origin', () => {
  it('round-trips a song and chord through the URL', () => {
    const url = withStudioOrigin('/learn/dorian/d', {
      song: 'Midnight Groove',
      chord: '2 min9',
    });
    expect(url).toBe(
      '/learn/dorian/d?from=studio&song=Midnight+Groove&chord=2+min9',
    );
    expect(read(url)).toEqual({ song: 'Midnight Groove', chord: '2 min9' });
  });

  it('appends to an existing query', () => {
    expect(withStudioOrigin('/l?activity=asc-nh', { song: 'A' })).toBe(
      '/l?activity=asc-nh&from=studio&song=A',
    );
  });

  it('ignores links that did not come from the Studio', () => {
    expect(read('/learn/ionian/c')).toBeNull();
    expect(read('/learn/ionian/c?from=studio')).toBeNull();
  });
});

describe('modeDegreeFormula', () => {
  it('writes modes against the major scale', () => {
    expect(modeDegreeFormula([0, 2, 4, 5, 7, 9, 11, 12])).toBe('1 2 3 4 5 6 7');
    expect(modeDegreeFormula([0, 2, 3, 5, 7, 9, 10])).toBe('1 2 ♭3 4 5 6 ♭7');
    expect(modeDegreeFormula([0, 2, 4, 6, 7, 9, 11])).toBe('1 2 3 ♯4 5 6 7');
    expect(modeDegreeFormula([0, 1, 3, 5, 6, 8, 10])).toBe(
      '1 ♭2 ♭3 4 ♭5 ♭6 ♭7',
    );
  });

  it('declines scales that are not seven notes', () => {
    expect(modeDegreeFormula([0, 2, 4, 7, 9])).toBeNull();
  });
});

describe('modeCharacter', () => {
  it('has a line for every mode the engine knows', async () => {
    const { ALL_MODES } = await import('@/daw/prism-engine/data/modes');
    const { MODE_CHARACTER } = await import('../modeCharacter');
    const missing = Object.keys(ALL_MODES).filter((k) => !MODE_CHARACTER[k]);
    expect(missing).toEqual([]);
  });

  it('resolves lesson slugs, including the symbol spellings', async () => {
    const { modeCharacter } = await import('../modeCharacter');
    expect(modeCharacter('ionian')).toMatch(/^The major scale/);
    expect(modeCharacter('Dorian')).toBe('Minor with a bright raised 6th');
    expect(modeCharacter('ionian#5')).toMatch(/raised 5th/);
    expect(modeCharacter('locrian𝄫7')).toMatch(/double-flat 7th/);
    expect(modeCharacter('altereddominant')).toMatch(/Every tension/);
    expect(modeCharacter('blues')).toBeUndefined();
  });
});
