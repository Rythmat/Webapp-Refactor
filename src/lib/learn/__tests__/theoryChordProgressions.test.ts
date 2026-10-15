import { describe, expect, it } from 'vitest';
import {
  chordArpeggioThenHold,
  midiSequenceToHalfNotes,
  midiSequenceToWholeNotes,
} from '@/components/Games/content/noteSequences';
import { CHORD_SCALE_DATA } from '@/components/learn/chordScaleData';
import { normalizeQuality } from '@/lib/chordNotation/qualities';
import { SCALE_LESSONS, spellScaleChord } from '../scaleLessons';
import {
  diminishedDegrees,
  theoryChordRhythmProblems,
  theoryProgressionsFor,
} from '../theoryChordProgressions';

const C_MAJOR_TRIADS = [
  [60, 64, 67],
  [62, 65, 69],
  [64, 67, 71],
  [65, 69, 72],
  [67, 71, 74],
  [69, 72, 76],
  [71, 74, 77],
];

describe('Theory chord progressions', () => {
  it("uses Peter's Ionian progressions", () => {
    expect(theoryProgressionsFor('ionian')).toEqual({
      triads: [
        [1, 2, 1],
        [1, 4, 1],
        [5, 4, 1, 6],
        [1, 5, 6, 4],
      ],
      sevenths: [
        [1, 2, 1],
        [3, 4, 1],
        [3, 6, 2, 5],
        [1, 6, 4, 5],
      ],
    });
  });

  describe.each(CHORD_SCALE_DATA.map((m) => [m.modeName, m.modeSlug]))(
    '%s',
    (_name, slug) => {
      const dim = diminishedDegrees(slug);
      const { triads, sevenths } = theoryProgressionsFor(slug);

      it('never puts a diminished chord in a progression', () => {
        for (const p of [...triads, ...sevenths]) {
          expect(p.filter((d) => dim.has(d))).toEqual([]);
        }
      });

      if (dim.has(1)) {
        it('has no progressions (its 1 chord is diminished)', () => {
          expect(triads).toEqual([]);
          expect(sevenths).toEqual([]);
        });
      } else {
        it('has two 2-chord (home on 1) and two 4-chord progressions', () => {
          for (const set of [triads, sevenths]) {
            const two = set.filter((p) => p.length === 3);
            expect(two).toHaveLength(2);
            for (const p of two) expect(p[2]).toBe(1);
            expect(set.filter((p) => p.length === 4)).toHaveLength(2);
          }
        });
      }
    },
  );
});

describe('Theory chord rhythm rule', () => {
  it('passes the built Chords activities', () => {
    const figure = [1, 5, 6, 4].map((d) => C_MAJOR_TRIADS[d - 1]);
    expect(
      theoryChordRhythmProblems(midiSequenceToWholeNotes(figure, 'p')),
    ).toEqual([]);
    expect(
      theoryChordRhythmProblems(chordArpeggioThenHold([60, 64, 67], 'a')),
    ).toEqual([]);
    expect(
      theoryChordRhythmProblems(chordArpeggioThenHold([60, 64, 67, 71], 'a')),
    ).toEqual([]);
  });

  it('allows one chord restruck within its bar', () => {
    expect(
      theoryChordRhythmProblems(
        midiSequenceToHalfNotes([C_MAJOR_TRIADS[0]], 'h'),
      ),
    ).toEqual([]);
  });

  it('catches two chords in a bar', () => {
    const half = (chord: number[], startTicks: number) =>
      chord.map((m) => ({
        pitchName: String(m),
        midi: m,
        startTicks,
        durationTicks: 960,
      }));
    expect(
      theoryChordRhythmProblems([
        ...half(C_MAJOR_TRIADS[0], 0),
        ...half(C_MAJOR_TRIADS[3], 960),
      ]),
    ).toEqual(['bar 1 holds 2 chords']);
  });

  it('catches a chord shorter than a quarter note', () => {
    const eighth = C_MAJOR_TRIADS[0].map((m, i) => ({
      pitchName: `n${i}`,
      midi: m,
      startTicks: 0,
      durationTicks: 240,
    }));
    expect(theoryChordRhythmProblems(eighth)).toHaveLength(1);
  });
});

describe('Pentatonic and blues chords', () => {
  it.each(Object.values(SCALE_LESSONS).map((l) => [l.title, l]))(
    '%s: each chord is a known quality, voiced as named, one per bar',
    (_title, lesson) => {
      expect(lesson.chords.length).toBeGreaterThan(0);
      for (const chord of lesson.chords) {
        expect(normalizeQuality(chord.quality)).not.toBe(chord.quality);
        expect(chord.tones).toHaveLength(chord.offsets.length);
        const notes = chord.offsets.map((o) => o + 60);
        expect(
          theoryChordRhythmProblems(chordArpeggioThenHold(notes, 's')),
        ).toEqual([]);
      }
    },
  );
});

describe('spellScaleChord', () => {
  const sharp9 = SCALE_LESSONS.minorblues.chords[2];
  it('spells the ♯9 on the 2nd letter, beside the 3', () => {
    expect(spellScaleChord(sharp9, 'C')).toEqual(['E', 'B♭', 'D♯']);
    expect(spellScaleChord(sharp9, 'Bb')).toEqual(['D', 'A♭', 'C♯']);
    expect(spellScaleChord(sharp9, 'F♯')).toEqual(['A♯', 'E', 'G♯♯']);
  });
});
