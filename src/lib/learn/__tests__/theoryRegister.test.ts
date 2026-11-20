import { describe, expect, it } from 'vitest';
import { relativeRootMidi, rootToMidi } from '@/components/learn/modeHelpers';
import {
  buildPitchClassSpellingMap,
  spelledMidiNoteName,
} from '@/components/learn/noteSpellingLookup';
import {
  getRelativeMode,
  RELATIVE_MODES_CONTENT,
} from '@/components/learn/relativeModeContent';
import { GUITAR_THEORY_CATALOG } from '@/curriculum/data/guitar/theoryCatalog';
import { pitchNameToMidi } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { theoryProgressionsFor } from '@/lib/learn/theoryChordProgressions';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { keyLabelToSemitone } from '@/lib/musicKeyUrl';
import {
  diatonicChordLadder,
  inChordRegister,
  THEORY_CHORD_CEILING,
  theoryScaleMidis,
  theoryTonicMidi,
} from '../theoryRegister';

// The audit behind the owner's 2026-11-19 report ("in E Ionian the chords jumped
// down an octave at F♯ minor"): every keyboard Theory lesson, in every key,
// runs its scale and its chords one way, starting in C3–B3.

const KEYS = [
  'C',
  'C♯',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G♭',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

const SLUGS = [...new Set(GUITAR_THEORY_CATALOG.map((entry) => entry.slug))];

const lessons = SLUGS.flatMap((slug) => {
  const steps = getLocalModeSteps(slug);
  return steps ? [{ slug, steps }] : [];
}).flatMap(({ slug, steps }) =>
  KEYS.map((key) => {
    const tonic = theoryTonicMidi(keyLabelToSemitone(key));
    return { slug, key, tonic, scale: theoryScaleMidis(tonic, steps) };
  }),
);

const sevenNote = lessons.filter(({ scale }) => scale.length === 8);

const strictlyRising = (notes: readonly number[]) =>
  notes.every((note, i) => i === 0 || note > notes[i - 1]);

/** The note as the lesson spells it, read back: B♯ and C♭ keep their octave. */
const roundTrips = (slug: string, key: string, scale: number[]) => {
  const spelling = buildPitchClassSpellingMap(slug, key, scale);
  return (midi: number) =>
    pitchNameToMidi(spelledMidiNoteName(midi, spelling)) === midi;
};

describe('Theory register', () => {
  it('covers every keyboard Theory lesson', () => {
    expect(SLUGS.length).toBeGreaterThan(30);
    expect(lessons.length).toBe(
      SLUGS.filter((s) => getLocalModeSteps(s)).length * KEYS.length,
    );
  });

  it('starts every scale in C3–B3 and climbs it note by note', () => {
    for (const { slug, key, tonic, scale } of lessons) {
      const where = `${key} ${slug}`;
      expect(tonic, where).toBeGreaterThanOrEqual(48);
      expect(tonic, where).toBeLessThanOrEqual(59);
      expect(scale[0], where).toBe(tonic);
      expect(scale[scale.length - 1], where).toBe(tonic + 12);
      expect(strictlyRising(scale), where).toBe(true);
      // Coming down is the same notes reversed: one way all the way.
      expect(strictlyRising([...scale].reverse().map((m) => -m)), where).toBe(
        true,
      );
    }
  });

  it('names every scale note in its own octave', () => {
    for (const { slug, key, scale } of lessons) {
      const ok = roundTrips(slug, key, scale);
      for (const midi of scale)
        expect(ok(midi), `${key} ${slug} ${midi}`).toBe(true);
    }
  });

  it('puts each chord of 1–7 on the next scale note up, under C6', () => {
    for (const { slug, key, scale } of sevenNote) {
      for (const size of [3, 4]) {
        const where = `${key} ${slug} ${size === 3 ? 'triads' : '7ths'}`;
        const ladder = diatonicChordLadder(scale, size);
        expect(ladder, where).toHaveLength(7);
        ladder.forEach((chord, degree) => {
          expect(chord[0], `${where} ${degree + 1}`).toBe(scale[degree]);
          expect(chord, `${where} ${degree + 1}`).toHaveLength(size);
          expect(strictlyRising(chord), `${where} ${degree + 1}`).toBe(true);
          expect(chord[size - 1] - chord[0]).toBeLessThan(12);
        });
        expect(strictlyRising(ladder.map((c) => c[0])), where).toBe(true);
        expect(Math.max(...ladder.flat()), where).toBeLessThanOrEqual(
          THEORY_CHORD_CEILING,
        );
        const ok = roundTrips(slug, key, scale);
        for (const midi of ladder.flat())
          expect(ok(midi), `${where} ${midi}`).toBe(true);
      }
    }
  });

  it('plays its progressions with the same chords', () => {
    for (const { slug, scale } of sevenNote) {
      const ladder = diatonicChordLadder(scale, 3);
      for (const degrees of theoryProgressionsFor(slug).triads) {
        for (const degree of degrees) {
          expect(ladder[degree - 1][0]).toBe(scale[degree - 1]);
        }
      }
    }
  });

  it('voices the API’s chords on the ladder, whatever octave they come in', () => {
    // E Ionian: the reported key. The API's chords arrive wrapped into one
    // octave, an inversion and an octave low; the ladder is the same.
    const tonic = theoryTonicMidi(keyLabelToSemitone('E'));
    const scale = theoryScaleMidis(tonic, getLocalModeSteps('ionian'));
    const local = diatonicChordLadder(scale, 3);
    const wrapped = local.map((chord) =>
      chord.map((m) => ((m - tonic) % 12) + tonic),
    );
    const inverted = local.map(([r, t, f]) => [t, f, r + 12]);
    const low = local.map((chord) => chord.map((m) => m - 12));
    expect(diatonicChordLadder(scale, 3, wrapped)).toEqual(local);
    expect(diatonicChordLadder(scale, 3, inverted)).toEqual(local);
    expect(diatonicChordLadder(scale, 3, low)).toEqual(local);
    // E3 G♯3 B3 up to D♯4 F♯4 A4: F♯ min sits above E maj.
    expect(local[0]).toEqual([52, 56, 59]);
    expect(local[1]).toEqual([54, 57, 61]);
    expect(local[6]).toEqual([63, 66, 69]);
  });

  it('keeps a chord the API builds differently, on its own degree', () => {
    const scale = theoryScaleMidis(48, [0, 2, 4, 5, 7, 9, 11]);
    // A 5 dom7 given for C Ionian's 5 triad: its notes, voiced on G3.
    const given = [
      undefined,
      undefined,
      undefined,
      undefined,
      [55, 59, 62, 65],
    ];
    expect(diatonicChordLadder(scale, 3, given)[4]).toEqual([55, 59, 62, 65]);
    // A chord not built on its degree falls back to the scale's.
    expect(diatonicChordLadder(scale, 3, [[50, 53, 57]])[0]).toEqual([
      48, 52, 55,
    ]);
  });

  it('moves a run of chords down as one piece, never one chord alone', () => {
    const run = [
      [76, 79, 83],
      [78, 81, 85],
    ];
    expect(inChordRegister(run)).toEqual([
      [64, 67, 71],
      [66, 69, 73],
    ]);
    expect(inChordRegister([[60, 64, 67]])).toEqual([[60, 64, 67]]);
  });
});

describe('Relative modes', () => {
  it('climbs the key’s scale, one mode on each note, from C3–B3', () => {
    for (const entry of RELATIVE_MODES_CONTENT) {
      const tonic = rootToMidi(entry.scaleNotes[0]);
      expect(tonic).toBeGreaterThanOrEqual(48);
      expect(tonic).toBeLessThanOrEqual(59);
      const roots = entry.scaleNotes.map((_, i) =>
        relativeRootMidi(tonic, getRelativeMode(entry.scaleNotes, i).root),
      );
      expect(roots[0]).toBe(tonic);
      expect(strictlyRising(roots), entry.scaleNotes.join(' ')).toBe(true);
      expect(roots[6] - tonic).toBeLessThan(12);
    }
  });
});
