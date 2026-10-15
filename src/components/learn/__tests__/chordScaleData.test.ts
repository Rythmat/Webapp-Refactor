import { describe, expect, it } from 'vitest';
import { SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { qualityDisplayName } from '../buildDiatonicChords';
import {
  CHORD_SCALE_DATA,
  getChordScales,
  type ChordScaleEntry,
} from '../chordScaleData';

// Every chord in the tables is checked against the scale itself: stack thirds
// on each degree of the mode's steps, measure the intervals, and name the chord
// the way the file does. A table copied from another mode, a mislabelled
// degree or a mis-spelled ninth then fails here, not on the overview page.

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTALS: Record<string, number> = {
  '': 0,
  '♭': -1,
  '♯': 1,
  '𝄫': -2,
  '𝄪': 2,
};

/** A degree label ("♭3", "𝄫7") in semitones above the tonic. */
function degreeSemitones(degree: string): number {
  const match = /^(𝄫|𝄪|♭|♯)?([1-7])$/u.exec(degree);
  if (!match) throw new Error(`Not a degree label: "${degree}"`);
  return MAJOR_SCALE[Number(match[2]) - 1] + ACCIDENTALS[match[1] ?? ''];
}

/** Third and fifth above the root → triad name. */
const TRIADS: Record<string, string> = {
  '4,7': 'maj',
  '3,7': 'min',
  '3,6': 'dim',
  '4,8': 'aug',
  '4,6': 'maj(♭5)',
  '2,6': 'sus2(♭5)',
};

/** Third, fifth and seventh above the root → seventh-chord name. */
const SEVENTHS: Record<string, string> = {
  '4,7,11': 'maj7',
  '3,7,10': 'min7',
  '4,7,10': 'dom7',
  '3,6,10': 'min7(♭5)',
  '3,6,9': 'dim7',
  '3,7,11': 'min(maj7)',
  '4,8,11': 'maj7(♯5)',
  '4,6,10': 'dom7(♭5)',
  '3,7,9': 'min6',
  '2,6,9': 'sus2(♭5)add6',
};

/** Semitones from degree `root` up `skip` scale steps. */
function above(steps: number[], root: number, skip: number): number {
  return (((steps[(root + skip) % 7] - steps[root]) % 12) + 12) % 12;
}

/** Semitones above the root that a ninth's name says its 9th sits. */
function ninthSemitones(quality: string): number | undefined {
  if (quality.includes('♭9')) return 1;
  if (quality.includes('♯9')) return 3;
  if (quality.includes('9')) return 2;
  return undefined;
}

/**
 * The seventh chord a ninth chord extends, by the file's spelling: an altered
 * ninth sits in the parentheses ("dom7(♭5♭9)" → "dom7(♭5)", "maj7(♭9)" →
 * "maj7"), a natural one replaces the 7 ("min9(♭5)" → "min7(♭5)").
 */
function seventhOfNinth(quality: string): string {
  return quality.replace(/[♭♯]9/u, '').replace('()', '').replace('9', '7');
}

const degreesOf = (entries: ChordScaleEntry[]) => entries.map((e) => e.degree);
const qualitiesOf = (entries: ChordScaleEntry[]) =>
  entries.map((e) => e.quality);

describe('CHORD_SCALE_DATA', () => {
  it('covers the 35 modes, each once', () => {
    const slugs = CHORD_SCALE_DATA.map((m) => m.modeSlug);
    expect(slugs).toHaveLength(35);
    expect(new Set(slugs).size).toBe(35);
  });

  describe.each(CHORD_SCALE_DATA.map((m) => [m.modeSlug, m] as const))(
    '%s',
    (slug, table) => {
      const steps = getLocalModeSteps(slug) ?? [];
      const labels = table.intervals.split(', ');

      it('has 7 triads, 7 sevenths and 7 ninths', () => {
        expect(table.triads).toHaveLength(7);
        expect(table.sevenths).toHaveLength(7);
        expect(table.ninths).toHaveLength(7);
      });

      it("spells its intervals as the mode's steps", () => {
        expect(steps).toHaveLength(7);
        expect(labels.map(degreeSemitones)).toEqual(steps);
      });

      it('labels every chord with its own degree of the mode', () => {
        expect(degreesOf(table.triads)).toEqual(labels);
        expect(degreesOf(table.sevenths)).toEqual(labels);
        expect(degreesOf(table.ninths)).toEqual(labels);
      });

      it('names each triad by the thirds stacked on its degree', () => {
        const expected = steps.map(
          (_, i) => TRIADS[[above(steps, i, 2), above(steps, i, 4)].join()],
        );
        expect(qualitiesOf(table.triads)).toEqual(expected);
      });

      it('names each seventh chord by the thirds stacked on its degree', () => {
        const expected = steps.map(
          (_, i) =>
            SEVENTHS[
              [
                above(steps, i, 2),
                above(steps, i, 4),
                above(steps, i, 6),
              ].join()
            ],
        );
        expect(qualitiesOf(table.sevenths)).toEqual(expected);
      });

      it('gives each ninth the 9th the scale has above its root', () => {
        expect(qualitiesOf(table.ninths).map(ninthSemitones)).toEqual(
          steps.map((_, i) => above(steps, i, 1)),
        );
      });

      it('builds each ninth on the seventh chord of the same degree', () => {
        expect(qualitiesOf(table.ninths).map(seventhOfNinth)).toEqual(
          qualitiesOf(table.sevenths),
        );
      });

      it('has a display name for every quality it uses', () => {
        const all = [
          ...table.triads,
          ...table.sevenths,
          ...table.ninths,
          ...(table.extraTriads ?? []),
          ...(table.extraSevenths ?? []),
          ...(table.extraNinths ?? []),
        ];
        const missing = all
          .map((e) => e.quality)
          .filter((q) => qualityDisplayName(q) === q);
        expect(missing).toEqual([]);
      });
    },
  );
});

describe('pentatonic and blues entries', () => {
  it.each(Object.values(SCALE_LESSONS).map((s) => [s.slug] as const))(
    '%s has its degrees and no chords',
    (slug) => {
      const table = getChordScales(slug);
      expect(table).toBeDefined();
      expect(table!.triads).toEqual([]);
      expect(table!.sevenths).toEqual([]);
      expect(table!.ninths).toEqual([]);
      expect(table!.intervals.split(', ').map(degreeSemitones)).toEqual(
        getLocalModeSteps(slug),
      );
    },
  );
});
