/**
 * A progression for the prompt: the library's loops for its style and moods
 * (the keywords), in its mode, spelled as symbols the band engine reads.
 */
import { describe, expect, it } from 'vitest';
import { loadChordProgressions } from '@/curriculum/data/loaders';
import { echoRandom } from '@/curriculum/engine/echo/random';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { parseMusicPrompt } from '../parseMusicPrompt';
import { chordsInKey, parentOf, pickProgression } from '../pickProgression';
import { planPrompt } from '../planPrompt';

const plan = (text: string, seed = 1) =>
  planPrompt(parseMusicPrompt(text), echoRandom(seed));

describe('chordsInKey', () => {
  it.each([
    [['2 minor7', '5 dominant7'], 0, ['Dm7', 'G7']],
    [['6 minor', '4 major', '1 major', '5 major'], 0, ['Am', 'F', 'C', 'G']],
    [['6 minor', '4 major', '1 major', '5 major'], 9, ['F#m', 'D', 'A', 'E']],
    [
      ['1 major7', '6 minor7', '2 minor7', '5 dominant7'],
      3,
      ['Ebmaj7', 'Cm7', 'Fm7', 'Bb7'],
    ],
    [['1 major/3'], 0, ['C/E']],
    [
      ['5 dominant7sus4', '5 dominant7#5', '7 minor7b5'],
      0,
      ['G7sus4', 'G7#5', 'Bm7b5'],
    ],
  ])('%j in %i → %j', (degrees, parent, expected) => {
    expect(chordsInKey(degrees, parent)).toEqual(expected);
  });

  it('writes nearly every loop in the library as symbols the band reads', async () => {
    const library = await loadChordProgressions();
    const written = library.filter((e) => {
      const chords = chordsInKey(e.chords, 0);
      return chords && chords.every((c) => chordSymbolTones(c));
    });
    expect(written.length).toBeGreaterThanOrEqual(library.length - 13);
  });
});

describe('spelling', () => {
  it('spells a flat key with flats and a sharp key with sharps', () => {
    const loop = ['6 minor7', '2 minor7', '5 dominant7', '1 major'];
    // A♭ minor: its parent is B (C♭) major.
    expect(chordsInKey(loop, 11, 'flats')).toEqual([
      'Abm7',
      'Dbm7',
      'Gb7',
      'B',
    ]);
    expect(chordsInKey(['1 major', '4 major'], 1, 'sharps')).toEqual([
      'C#',
      'F#',
    ]);
  });
});

describe('parentOf', () => {
  it('reads a mode through its parent major', () => {
    expect(parentOf(2, 'dorian')).toBe(0);
    expect(parentOf(9, 'aeolian')).toBe(0);
    expect(parentOf(7, 'mixolydian')).toBe(0);
    expect(parentOf(4, 'ionian')).toBe(4);
  });
});

describe('pickProgression', () => {
  it('starts on the mode’s tonic chord, in the prompt’s key', async () => {
    const library = await loadChordProgressions();
    for (const [text, tonic] of [
      ['a sad song in A minor', /^Am/],
      ['a funk groove in D Dorian', /^Dm/],
      ['a happy pop song in G major', /^G(?!m)/],
    ] as const) {
      const p = plan(text);
      const picked = pickProgression(library, p, echoRandom(2));
      expect(picked.chords[0], text).toMatch(tonic);
      expect([2, 4, 8]).toContain(picked.chords.length);
    }
  });

  it('answers the prompt’s moods and style from the library’s tags', async () => {
    const library = await loadChordProgressions();
    const picked = pickProgression(
      library,
      plan('a sad pop song in C'),
      echoRandom(3),
    );
    const entry = library.find((e) => e.id === picked.id)!;
    expect(entry.vibes.join() + entry.styles.join()).toMatch(/melancholic|pop/);
  });

  it('gives the same loop for the same seed', async () => {
    const library = await loadChordProgressions();
    const p = plan('a dark trap beat', 9);
    expect(pickProgression(library, p, echoRandom(4))).toEqual(
      pickProgression(library, p, echoRandom(4)),
    );
  });

  it('leaves out the loops already tried', async () => {
    const library = await loadChordProgressions();
    const p = plan('jazz in F');
    const first = pickProgression(library, p, echoRandom(5));
    const next = pickProgression(
      library,
      p,
      echoRandom(5),
      new Set([first.id!]),
    );
    expect(next.id).not.toBe(first.id);
  });

  it('never repeats another section’s progression, and shares as little as it can', async () => {
    const library = await loadChordProgressions();
    const p = plan('a happy pop song in C major');
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const first = pickProgression(library, p, echoRandom(seed));
      const next = pickProgression(library, p, echoRandom(seed), undefined, {
        avoid: [first.chords],
      });
      expect(new Set(next.chords)).not.toEqual(new Set(first.chords));
    }
  });

  it('starts a bridge off the tonic chord', async () => {
    const library = await loadChordProgressions();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const picked = pickProgression(
        library,
        plan('a pop song in C major'),
        echoRandom(seed),
        undefined,
        {
          role: 'bridge',
        },
      );
      expect(picked.chords[0], picked.chords.join(' ')).not.toMatch(
        /^C(?![#b])/,
      );
    }
  });

  it('plays a 12-bar blues on the tonic', async () => {
    const picked = pickProgression(
      [],
      plan('a 12-bar blues in A'),
      echoRandom(1),
    );
    expect(picked.chords).toEqual([
      'A7',
      'A7',
      'A7',
      'A7',
      'D7',
      'D7',
      'A7',
      'A7',
      'E7',
      'D7',
      'A7',
      'E7',
    ]);
  });

  it('falls back to the mode’s own loop when the library has nothing', () => {
    const picked = pickProgression(
      [],
      plan('a song in D Dorian'),
      echoRandom(1),
    );
    expect(picked).toEqual({
      id: null,
      degrees: ['2 minor7', '5 dominant7'],
      chords: ['Dm7', 'G7'],
    });
  });
});
