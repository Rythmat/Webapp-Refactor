import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_SCALE_DEGREES,
  LITERACY_TONICS,
  type LiteracyHarmony,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import {
  CHORD_HIGHEST_MIDI,
  CHORD_LOWEST_MIDI,
  MAX_ROOT_MOVE,
  chordLabel,
  chordLedgerLines,
  chordOutside,
  chordPalette,
  chordRoots,
  diatonicChord,
  diatonicChords,
  fillTemplate,
  progressionLabels,
  progressionProblems,
  sampleProgression,
  voiceChord,
  voiceChords,
  voicedChord,
  voicedPasses,
  voicedProgression,
  xBars,
  type LiteracyChord,
  type VoicedChord,
} from '../chords';
import { SCALE_SEMITONES, pitchClassOf } from '../pitch';

/**
 * Part 2's chords, as the owner set them: natural major and minor, the
 * diminished chord left out, by the app's hybrid numbering; root position
 * in the treble staff, a figure's chords voiced together for the fewest
 * ledger lines with no root moving past a 4th; the palette an X is picked
 * from; and a progression made from a template and the picks.
 */

const HARMONIES: LiteracyHarmony[] = ['triads', 'sevenths'];
const labels = (mode: 'major' | 'minor', harmony: LiteracyHarmony) =>
  diatonicChords(mode, harmony).map((chord) => chord.label);

describe('the chord table', () => {
  it('names major’s six chords as the app does', () => {
    expect(labels('major', 'triads')).toEqual([
      '1 maj',
      '2 min',
      '3 min',
      '4 maj',
      '5 maj',
      '6 min',
    ]);
    expect(labels('major', 'sevenths')).toEqual([
      '1 maj7',
      '2 min7',
      '3 min7',
      '4 maj7',
      '5 dom7',
      '6 min7',
    ]);
  });

  it('names minor’s six, the 5 chord a minor one', () => {
    expect(labels('minor', 'triads')).toEqual([
      '1 min',
      '♭3 maj',
      '4 min',
      '5 min',
      '♭6 maj',
      '♭7 maj',
    ]);
    expect(labels('minor', 'sevenths')).toEqual([
      '1 min7',
      '♭3 maj7',
      '4 min7',
      '5 min7',
      '♭6 maj7',
      '♭7 dom7',
    ]);
  });

  it('leaves out the diminished chord: major’s 7, minor’s 2', () => {
    for (const harmony of HARMONIES) {
      expect(diatonicChord('major', '7', harmony)).toBeNull();
      expect(diatonicChord('minor', '2', harmony)).toBeNull();
      expect(chordLabel('major', '7', harmony)).toBeNull();
    }
  });

  it('never writes a Roman numeral', () => {
    for (const mode of LITERACY_MODES)
      for (const harmony of HARMONIES)
        for (const label of labels(mode, harmony))
          expect(label).not.toMatch(/[IVX]/);
  });

  it('stacks each chord in thirds from the mode’s own notes', () => {
    for (const mode of LITERACY_MODES)
      for (const harmony of HARMONIES)
        for (const chord of diatonicChords(mode, harmony)) {
          expect(chord.intervals).toHaveLength(harmony === 'triads' ? 3 : 4);
          for (const interval of chord.intervals)
            expect(SCALE_SEMITONES[mode]).toContain(
              (chord.rootSemitones + interval) % 12,
            );
        }
    expect(diatonicChord('minor', '3')?.number).toBe('♭3');
    expect(diatonicChord('minor', '7', 'sevenths')?.intervals).toEqual([
      0, 4, 7, 10,
    ]);
  });
});

describe('the palette', () => {
  it('offers major 2, 3, 4, 5 and 6, and minor ♭3, 4, 5, ♭6 and ♭7', () => {
    expect(chordPalette('major').map((c) => c.number)).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(chordPalette('minor').map((c) => c.number)).toEqual([
      '♭3',
      '4',
      '5',
      '♭6',
      '♭7',
    ]);
    expect(chordPalette('minor', 'sevenths').map((c) => c.label)).toEqual([
      '♭3 maj7',
      '4 min7',
      '5 min7',
      '♭6 maj7',
      '♭7 dom7',
    ]);
  });
});

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);
const C_MAJOR = { tonic: 'C', mode: 'major' } as const;
/** The degrees of a mode's chords, the diminished one left out. */
const degreesOf = (mode: LiteracyMode) =>
  LITERACY_SCALE_DEGREES.filter((d) => diatonicChord(mode, d) !== null);
/** Every progression of `length` bars a mode's chords make. */
const progressionsOf = (
  mode: LiteracyMode,
  length: number,
): LiteracyScaleDegree[][] =>
  length === 0
    ? [[]]
    : progressionsOf(mode, length - 1).flatMap((head) =>
        degreesOf(mode).map((d) => [...head, d]),
      );
const roots = (chords: readonly VoicedChord[]) => chords.map((c) => c.root);
const moves = (chords: readonly VoicedChord[]) =>
  chords.slice(1).map((c, i) => c.root - chords[i].root);
const linesOf = (chords: readonly VoicedChord[], tonic: LiteracyTonic) =>
  chords.reduce((sum, c) => sum + chordLedgerLines(c, tonic, c.root), 0);

/** The first of two costs that differs is lower in `a`. */
const lower = (a: readonly number[], b: readonly number[]) => {
  const i = a.findIndex((x, k) => x !== b[k]);
  return i >= 0 && a[i] < b[i];
};

/**
 * The cheapest voicing by trying every one: no root past a 4th from the
 * last; then the fewest semitones past C3–C6, the fewest ledger lines, the
 * least movement, the lowest.
 */
function bruteForce(chords: LiteracyChord[], tonic: LiteracyTonic): number[] {
  let best: { roots: number[]; cost: number[] } | null = null;
  const walk = (picked: number[]) => {
    const i = picked.length;
    if (i === chords.length) {
      const sum = (f: (root: number, j: number) => number) =>
        picked.reduce((total, root, j) => total + f(root, j), 0);
      const cost = [
        sum((root, j) => chordOutside(chords[j], root)),
        sum((root, j) => chordLedgerLines(chords[j], tonic, root)),
        sum((root, j) => (j ? Math.abs(root - picked[j - 1]) : 0)),
        sum((root) => root),
      ];
      if (!best || lower(cost, best.cost)) best = { roots: picked, cost };
      return;
    }
    for (const root of chordRoots(chords[i], tonic, { stretch: true }))
      if (i === 0 || Math.abs(root - picked[i - 1]) <= MAX_ROOT_MOVE)
        walk([...picked, root]);
  };
  walk([]);
  return best!.roots;
}

/** Whether some voicing within 4ths keeps every note in C3–C6. */
function fitsInRange(chords: LiteracyChord[], tonic: LiteracyTonic): boolean {
  const from = (i: number, root: number): boolean =>
    i === chords.length - 1 ||
    chordRoots(chords[i + 1], tonic).some(
      (next) => Math.abs(next - root) <= MAX_ROOT_MOVE && from(i + 1, next),
    );
  return chordRoots(chords[0], tonic).some((root) => from(0, root));
}

describe('voicing a chord', () => {
  it('voices every chord in root position in C3–C6, in all 12 keys, both modes, triads and 7ths', () => {
    for (const key of KEYS)
      for (const harmony of HARMONIES)
        for (const chord of diatonicChords(key.mode, harmony)) {
          const voiced = voiceChord(chord, key.tonic);
          const where = `${key.tonic} ${key.mode} ${chord.label}`;
          expect(voiced.midis[0], where).toBe(voiced.root);
          expect(
            voiced.midis.map((m) => m - voiced.root),
            where,
          ).toEqual(chord.intervals);
          expect(voiced.root % 12, where).toBe(
            (pitchClassOf(key.tonic) + chord.rootSemitones) % 12,
          );
          expect(Math.min(...voiced.midis), where).toBeGreaterThanOrEqual(
            CHORD_LOWEST_MIDI,
          );
          expect(Math.max(...voiced.midis), where).toBeLessThanOrEqual(
            CHORD_HIGHEST_MIDI,
          );
        }
  });

  it('puts a chord on its own where it needs the fewest ledger lines, the lower on a tie', () => {
    for (const key of KEYS)
      for (const harmony of HARMONIES)
        for (const chord of diatonicChords(key.mode, harmony)) {
          const where = `${key.tonic} ${key.mode} ${chord.label}`;
          const options = chordRoots(chord, key.tonic).map((root) => ({
            root,
            lines: chordLedgerLines(chord, key.tonic, root),
          }));
          const fewest = Math.min(...options.map((o) => o.lines));
          const voiced = voiceChord(chord, key.tonic);
          expect(voiced.root, where).toBe(
            options.find((o) => o.lines === fewest)!.root,
          );
          // A triad always fits in the staff: from D4 to G5, no line.
          if (harmony === 'triads') expect(fewest, where).toBe(0);
        }
  });

  it('voices C major’s chords in the staff', () => {
    expect(voicedChord(C_MAJOR, '1')?.midis).toEqual([72, 76, 79]); // C5–G5
    expect(voicedChord(C_MAJOR, '4')?.midis).toEqual([65, 69, 72]); // F4–C5
    expect(voicedChord(C_MAJOR, '6')?.midis).toEqual([69, 72, 76]); // A4–E5
    // G4 B4 D5 F5, inside the staff.
    expect(voicedChord(C_MAJOR, '5', 'sevenths')?.midis).toEqual([
      67, 71, 74, 77,
    ]);
    // C4–B4 and C5–B5 need a line each (middle C, B5): the lower.
    expect(voicedChord(C_MAJOR, '1', 'sevenths')?.midis).toEqual([
      60, 64, 67, 71,
    ]);
    expect(voicedChord({ tonic: 'D', mode: 'minor' }, '1')?.midis).toEqual([
      62, 65, 69,
    ]);
    // D♭4 is written on D4, under the staff: no line.
    expect(voicedChord({ tonic: 'Db', mode: 'major' }, '1')?.root).toBe(61);
    expect(voicedChord(C_MAJOR, '7')).toBeNull();
  });

  it('counts a chord’s ledger lines spelled the key’s way, as a melody’s', () => {
    const one = diatonicChord('major', '1')!;
    expect(chordLedgerLines(one, 'C', 60)).toBe(1); // C4 E4 G4: middle C
    expect(chordLedgerLines(one, 'C', 72)).toBe(0); // C5 E5 G5
    expect(chordLedgerLines(one, 'C', 48)).toBe(4); // C3: four below
    // A♭ major's 1 at A♭5: A♭5 C6 E♭6, written on A5, C6, E6.
    expect(chordLedgerLines(one, 'Ab', 80)).toBe(3);
    // F♯ minor's 7 chord, E4 G♯4 B4 D5 (E: no line): spelled from F♯'s E.
    const seven = diatonicChord('minor', '7', 'sevenths')!;
    expect(chordLedgerLines(seven, 'F#', 64)).toBe(0);
  });
});

describe('voicing a progression', () => {
  it('finds a way within a 4th between any two chords: only the tritone, the diminished chord’s, has none', () => {
    for (const mode of LITERACY_MODES)
      for (const harmony of HARMONIES)
        for (const a of diatonicChords(mode, harmony))
          for (const b of diatonicChords(mode, harmony)) {
            const up = (b.rootSemitones - a.rootSemitones + 12) % 12;
            const down = 12 - up;
            expect(
              Math.min(up, up === 0 ? 0 : down),
              `${mode} ${a.label} to ${b.label}`,
            ).toBeLessThanOrEqual(MAX_ROOT_MOVE);
          }
    // The left-out chords are the only ones a tritone from another.
    const tritones = (mode: LiteracyMode) =>
      LITERACY_SCALE_DEGREES.filter((d) =>
        LITERACY_SCALE_DEGREES.some((e) => {
          const [x, y] = [d, e].map(
            (g) => SCALE_SEMITONES[mode][LITERACY_SCALE_DEGREES.indexOf(g)],
          );
          return (y - x + 12) % 12 === 6;
        }),
      );
    expect(tritones('major')).toEqual(['4', '7']);
    expect(tritones('minor')).toEqual(['2', '6']);
  });

  it('never moves a root past a 4th: every 4-bar progression, every key, in C3–C6 whenever it can be', () => {
    let stretched = 0;
    for (const key of KEYS)
      for (const harmony of HARMONIES)
        for (const degrees of progressionsOf(key.mode, 4)) {
          const voiced = voicedProgression(key, degrees, harmony);
          const where = `${degrees.join(' ')} ${harmony} in ${key.tonic} ${key.mode}`;
          for (const move of moves(voiced))
            expect(Math.abs(move), where).toBeLessThanOrEqual(MAX_ROOT_MOVE);
          const outside = voiced.reduce(
            (sum, c) => sum + chordOutside(c, c.root),
            0,
          );
          const chords = degrees.map(
            (d) => diatonicChord(key.mode, d, harmony)!,
          );
          // Past C3–C6 only when nothing within 4ths stays in it.
          expect(outside > 0, where).toBe(!fitsInRange(chords, key.tonic));
          if (outside > 0) stretched++;
          const midis = voiced.flatMap((c) => [...c.midis]);
          expect(Math.min(...midis), where).toBeGreaterThanOrEqual(36);
          expect(Math.max(...midis), where).toBeLessThanOrEqual(96);
        }
    // Triads always fit; a 7ths figure climbing by 4ths now and then can't.
    expect(stretched).toBeGreaterThan(0);
    // D major's 1 5 2 6 in 7ths falls a 4th three times, D to B: from
    // D4 its B2 is a semitone under C3, from D5 its C♯6 one over.
    const dMajor = voicedProgression(
      { tonic: 'D', mode: 'major' },
      ['1', '5', '2', '6'],
      'sevenths',
    );
    expect(roots(dMajor)).toEqual([74, 69, 64, 59]);
    expect(dMajor[0].midis).toEqual([74, 78, 81, 85]);
  });

  it('finds the voicing trying every one would: the fewest ledger lines, then the least movement, then the lowest', () => {
    const check = (
      key: { tonic: LiteracyTonic; mode: LiteracyMode },
      degrees: LiteracyScaleDegree[],
      harmony: LiteracyHarmony,
    ) => {
      const chords = degrees.map((d) => diatonicChord(key.mode, d, harmony)!);
      expect(
        roots(voiceChords(chords, key.tonic)),
        `${degrees.join(' ')} ${harmony} in ${key.tonic} ${key.mode}`,
      ).toEqual(bruteForce(chords, key.tonic));
    };
    for (const key of KEYS)
      for (const harmony of HARMONIES)
        for (const degrees of progressionsOf(key.mode, 3))
          check(key, degrees, harmony);
    for (const tonic of ['C', 'F#', 'Ab'] as const)
      for (const degrees of progressionsOf('major', 4)) {
        check({ tonic, mode: 'major' }, degrees, 'triads');
        check({ tonic, mode: 'major' }, degrees, 'sevenths');
      }
  });

  it('goes up from A minor to C, never down a 6th', () => {
    const voiced = voicedProgression(C_MAJOR, ['6', '1']);
    expect(voiced.map((c) => c.midis)).toEqual([
      [69, 72, 76], // A4 C5 E5
      [72, 76, 79], // C5 E5 G5: up a minor 3rd
    ]);
    // And back down from C to A minor; in every key, 6 and 1 a 3rd apart.
    expect(moves(voicedProgression(C_MAJOR, ['1', '6']))).toEqual([-3]);
    for (const tonic of LITERACY_TONICS) {
      expect(
        moves(voicedProgression({ tonic, mode: 'major' }, ['6', '1'])),
      ).toEqual([3]);
      expect(
        moves(voicedProgression({ tonic, mode: 'minor' }, ['6', '1'])),
      ).toEqual([4]);
    }
  });

  it('voices 1 4 5 1 in C up from C4, never leaping a 5th', () => {
    const voiced = voicedProgression(C_MAJOR, ['1', '4', '5', '1']);
    expect(voiced.map((c) => c.midis)).toEqual([
      [60, 64, 67], // C4 E4 G4
      [65, 69, 72], // F4 A4 C5
      [67, 71, 74], // G4 B4 D5
      [72, 76, 79], // C5 E5 G5
    ]);
    expect(moves(voiced)).toEqual([5, 2, 5]);
    // Middle C's line is the only one: C5 to start would take F5's A5 and C6.
    expect(linesOf(voiced, 'C')).toBe(1);
  });

  it('voices a chord alone, and a figure of one chord, the same', () => {
    const one = diatonicChord('major', '1')!;
    expect(voiceChords([one, one], 'C').map((c) => c.root)).toEqual([72, 72]);
    expect(voicedProgression(C_MAJOR, ['4'])[0]).toEqual(
      voicedChord(C_MAJOR, '4'),
    );
    expect(voiceChords([], 'C')).toEqual([]);
  });

  it('plays a left-out chord as the 1', () => {
    expect(voicedProgression(C_MAJOR, ['7'])[0].label).toBe('1 maj');
  });
});

describe('voicing a figure’s passes together', () => {
  it('goes on with the 7ths from where the triads end, within a 4th', () => {
    // 1 6 4 5 in C comes round where it began: C A F G, then C again.
    const [triads, sevenths] = voicedPasses(C_MAJOR, [
      { degrees: ['1', '6', '4', '5'], harmony: 'triads' },
      { degrees: ['1', '6', '4', '5'], harmony: 'sevenths' },
    ]);
    expect(triads.map((c) => c.label)).toEqual([
      '1 maj',
      '6 min',
      '4 maj',
      '5 maj',
    ]);
    expect(sevenths.map((c) => c.label)).toEqual([
      '1 maj7',
      '6 min7',
      '4 maj7',
      '5 dom7',
    ]);
    const all = [...triads, ...sevenths];
    expect(moves(all)).toEqual([-3, -4, 2, 5, -3, -4, 2]);
    // C5 A4 F4 G4, then C5 again (up a 4th from G4): in the staff, but
    // for the 1 maj7's B5.
    expect(roots(triads)).toEqual([72, 69, 65, 67]);
    expect(roots(sevenths)).toEqual([72, 69, 65, 67]);
    expect(roots(all)).toEqual(bruteForce(all, 'C'));
    expect(linesOf(triads, 'C')).toBe(0);
    expect(linesOf(sevenths, 'C')).toBe(1);
  });

  it('starts each pass over on its own fewest ledger lines', () => {
    // 4 5 6 2 (the sample) climbs going round: F G A D, then F. The 7ths
    // start a new phrase, so they take F4 again rather than pushing the
    // triads down to F3 to come round within a 4th.
    const [triads, sevenths] = voicedPasses(C_MAJOR, [
      { degrees: ['4', '5', '6', '2'], harmony: 'triads' },
      { degrees: ['4', '5', '6', '2'], harmony: 'sevenths' },
    ]);
    expect(roots(triads)).toEqual([65, 67, 69, 74]);
    expect(roots(sevenths)).toEqual([65, 67, 69, 74]);
    for (const pass of [triads, sevenths])
      for (const move of moves(pass))
        expect(Math.abs(move)).toBeLessThanOrEqual(MAX_ROOT_MOVE);
  });

  it('stays within a 4th across the restart when that costs no ledger lines', () => {
    // 6 4 5 3 voiced on its fewest lines comes round within a 4th anyway.
    const [triads, sevenths] = voicedPasses(C_MAJOR, [
      { degrees: ['6', '4', '5', '3'], harmony: 'triads' },
      { degrees: ['6', '4', '5', '3'], harmony: 'sevenths' },
    ]);
    expect(Math.abs(sevenths[0].root - triads[3].root)).toBeLessThanOrEqual(
      MAX_ROOT_MOVE,
    );
  });

  it('leaps only where the figure starts over, when C3–C6 can’t hold it within 4ths', () => {
    // 3 6 2 5 climbs a 4th, a 4th, a 4th and falls a 3rd: round twice it
    // would climb 27 semitones, past what C3–C6 holds with its 7ths.
    const passes = voicedPasses(C_MAJOR, [
      { degrees: ['3', '6', '2', '5'], harmony: 'triads' },
      { degrees: ['3', '6', '2', '5'], harmony: 'sevenths' },
    ]);
    for (const pass of passes)
      expect(moves(pass).map(Math.abs)).toEqual([5, 5, 5]);
    expect(Math.abs(passes[1][0].root - passes[0][3].root)).toBeGreaterThan(
      MAX_ROOT_MOVE,
    );
    for (const c of passes.flat()) {
      expect(Math.min(...c.midis)).toBeGreaterThanOrEqual(48);
      expect(Math.max(...c.midis)).toBeLessThanOrEqual(84);
    }
  });
});

describe('a progression from a template', () => {
  it('fills the X bars with the picks, in order, the 1 where the template puts it', () => {
    expect(xBars(['X', '1', 'X', 'X'])).toEqual([0, 2, 3]);
    expect(fillTemplate(['X', '1', 'X', 'X'], ['4', '5', '4'])).toEqual([
      '4',
      '1',
      '5',
      '4',
    ]);
    expect(fillTemplate(['1', 'X'], [])).toBeNull();
    expect(fillTemplate(['1', 'X'], [null])).toBeNull();
  });

  it('wants exactly the step’s number of different chords, from the palette', () => {
    const template = ['1', 'X', 'X', 'X'] as const;
    expect(
      progressionProblems([...template], 2, ['4', '5', '5'], 'major'),
    ).toEqual([]);
    expect(
      progressionProblems([...template], 2, ['4', '4', '4'], 'major').map(
        (p) => p.code,
      ),
    ).toEqual(['tooFew']);
    expect(
      progressionProblems([...template], 2, ['4', '5', '6'], 'major').map(
        (p) => [p.code, p.message],
      ),
    ).toEqual([['tooMany', 'Use just 2 different chords.']]);
    expect(
      progressionProblems([...template], 2, ['4', null, '5'], 'major'),
    ).toEqual([
      { code: 'unfilled', message: 'Choose a chord for every X.', pick: 1 },
    ]);
    // Not the 1, nor the chord the mode leaves out.
    expect(
      progressionProblems([...template], 2, ['1', '7', '5'], 'major').map(
        (p) => [p.code, p.pick],
      ),
    ).toEqual([
      ['notInPalette', 0],
      ['notInPalette', 1],
    ]);
    expect(
      progressionProblems(
        ['X', 'X', 'X', 'X'],
        4,
        ['3', '4', '6', '7'],
        'minor',
      ),
    ).toEqual([]);
    expect(
      progressionProblems(
        ['X', 'X', 'X', 'X'],
        4,
        ['2', '4', '6', '7'],
        'minor',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('makes a sample for a preview: the step’s count of common chords', () => {
    expect(sampleProgression(['1', 'X'], 1, 'major')).toEqual(['1', '4']);
    expect(sampleProgression(['1', 'X', 'X', 'X'], 2, 'major')).toEqual([
      '1',
      '4',
      '5',
      '4',
    ]);
    const four = sampleProgression(['X', 'X', 'X', 'X'], 4, 'minor');
    expect(new Set(four).size).toBe(4);
    expect(progressionProblems(['X', 'X', 'X', 'X'], 4, four, 'minor')).toEqual(
      [],
    );
  });

  it('names a progression’s chords by the mode and harmony', () => {
    expect(progressionLabels(['1', '6', '4', '5'], 'major')).toEqual([
      '1 maj',
      '6 min',
      '4 maj',
      '5 maj',
    ]);
    expect(
      progressionLabels(['1', '6', '7', '5'], 'minor', 'sevenths'),
    ).toEqual(['1 min7', '♭6 maj7', '♭7 dom7', '5 min7']);
  });
});
