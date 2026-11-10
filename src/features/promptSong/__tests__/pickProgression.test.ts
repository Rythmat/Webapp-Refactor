/**
 * A progression for the prompt: the library's loops for its style and moods
 * (the keywords), in its mode, spelled as symbols the band engine reads.
 */
import { describe, expect, it } from 'vitest';
import { loadChordProgressions } from '@/curriculum/data/loaders';
import { echoRandom } from '@/curriculum/engine/echo/random';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { parseMusicPrompt } from '../parseMusicPrompt';
import {
  bassAgreement,
  chordsInKey,
  fitBass,
  parentOf,
  PHRASE_BARS,
  pickProgression,
} from '../pickProgression';
import { planPrompt } from '../planPrompt';

const plan = (text: string, seed = 1) =>
  planPrompt(parseMusicPrompt(text), echoRandom(seed));
const BAR = 1920;

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
      expect(picked.timed.changes[0]).toEqual({
        tick: 0,
        symbol: picked.chords[0],
      });
      expect(picked.timed.length, text).toBe(PHRASE_BARS * BAR);
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
    expect(picked.id).toBeNull();
    expect(picked.degrees).toEqual(['2 minor7', '5 dominant7']);
    // Dm7 G7 four times, the last bar turning round on C (D Dorian's ♭VII).
    expect(picked.chords).toEqual([
      ...'Dm7 G7 Dm7 G7 Dm7 G7 Dm7 G7'.split(' '),
      'C',
    ]);
    expect(picked.timed.changes.at(-1)).toEqual({
      tick: 7.5 * BAR,
      symbol: 'C',
    });
  });
});

describe('the phrase (owner, 2026-11-10: four bars ground)', () => {
  it('plays eight bars that are not the same four twice', async () => {
    const library = await loadChordProgressions();
    for (const text of ['pop in C', 'jazz in F', 'a sad song in A minor']) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const { timed } = pickProgression(
          library,
          plan(text),
          echoRandom(seed),
        );
        expect(timed.length).toBe(PHRASE_BARS * BAR);
        const half = (from: number) =>
          timed.changes
            .filter((c) => c.tick >= from && c.tick < from + 4 * BAR)
            .map((c) => `${c.tick - from}:${c.symbol}`)
            .join(' ');
        const first = half(0);
        // A five-to-seven chord loop holds chords across the halves.
        if (timed.changes.some((c) => c.tick === 4 * BAR))
          expect(half(4 * BAR), `${text} ${seed}`).not.toBe(first);
      }
    }
  });

  it('plays the longer loops too, their chords held to fill eight bars', async () => {
    const library = await loadChordProgressions();
    const lengths = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const picked = pickProgression(library, plan('jazz'), echoRandom(seed));
      const entry = library.find((e) => e.id === picked.id);
      if (entry) lengths.add(entry.chords.length);
    }
    expect([...lengths].some((n) => n >= 5)).toBe(true);
  });
});

describe('variety (owner, 2026-11-10: mostly very similar material)', () => {
  it.each(['sad pop', 'gospel', 'lofi hip hop', 'pop', 'funk'])(
    '“%s” picks many loops, none most of the time',
    async (text) => {
      const library = await loadChordProgressions();
      const counts = new Map<number | null, number>();
      for (let seed = 1; seed <= 200; seed++) {
        const picked = pickProgression(
          library,
          plan(text, seed),
          echoRandom(seed * 7),
        );
        counts.set(picked.id, (counts.get(picked.id) ?? 0) + 1);
      }
      expect(counts.size, text).toBeGreaterThanOrEqual(10);
      expect(Math.max(...counts.values()), text).toBeLessThanOrEqual(50);
    },
  );

  it('leaves out the loops the session played lately while others fit', async () => {
    const library = await loadChordProgressions();
    const p = plan('sad pop');
    const recent = new Set<number>();
    for (let seed = 1; seed <= 6; seed++) {
      const picked = pickProgression(library, p, echoRandom(seed), undefined, {
        recent,
      });
      expect(recent.has(picked.id!)).toBe(false);
      recent.add(picked.id!);
    }
  });
});

describe('chords over a bass line (owner, 2026-11-10)', () => {
  const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;
  const bars = (...notes: (keyof typeof pc)[]) =>
    notes.map((n, i) => ({ tick: i * BAR, pc: pc[n] }));
  /** The chord's root or its slash bass, as a pitch class. */
  const standsOn = (symbol: string) => {
    const tones = chordSymbolTones(symbol)!;
    return tones.bassPc ?? tones.rootPc;
  };
  const symbolAt = (
    timed: { changes: readonly { tick: number; symbol: string }[] },
    tick: number,
  ) => [...timed.changes].reverse().find((c) => c.tick <= tick)!.symbol;

  it('stands every chord on the bass note under it', async () => {
    const library = await loadChordProgressions();
    const bass = bars('A', 'F', 'C', 'G', 'A', 'F', 'C', 'G');
    for (const text of [
      'pop in C major',
      'R&B in C major',
      'sad pop in C major',
      'jazz in C major',
      'neo soul in A minor',
    ]) {
      for (let seed = 1; seed <= 20; seed++) {
        const picked = fitBass(
          library,
          plan(text),
          bass,
          8 * BAR,
          echoRandom(seed),
        );
        for (const b of bass)
          expect(
            standsOn(symbolAt(picked.timed, b.tick)),
            `${text} ${seed} ${picked.chords.join(' ')}`,
          ).toBe(b.pc);
      }
    }
  });

  it('varies the chords it stands there', async () => {
    const library = await loadChordProgressions();
    const bass = bars('C', 'A', 'D', 'G');
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++)
      seen.add(
        fitBass(
          library,
          plan('R&B in C major'),
          bass,
          4 * BAR,
          echoRandom(seed),
        ).chords.join(' '),
      );
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('builds the mode’s own chords on a bass no loop fits', () => {
    const bass = bars('C', 'E', 'B', 'D');
    const picked = fitBass(
      [],
      plan('pop in C major'),
      bass,
      4 * BAR,
      echoRandom(1),
    );
    expect(picked.id).toBeNull();
    expect(picked.chords).toEqual(['C', 'Em', 'Bdim', 'Dm']);
  });

  it('measures how much of the bass chords already stand on', () => {
    const bass = bars('A', 'F', 'C', 'G');
    const lane = ['Am', 'F', 'C', 'G'];
    expect(bassAgreement((t) => lane[Math.floor(t / BAR)], bass)).toBe(1);
    const other = ['Dm', 'G', 'Dm', 'G'];
    expect(bassAgreement((t) => other[Math.floor(t / BAR)], bass)).toBeLessThan(
      0.75,
    );
  });
});
