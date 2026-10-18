import { describe, expect, it } from 'vitest';
import type {
  LiteracyMelodicEchoStep,
  LiteracyMode,
  LiteracyNote,
  LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import {
  CIRCLE_OF_FIFTHS,
  emptyChoices,
  withMode,
  withTonic,
} from '../choices';
import { melodyOf, melodyTonic, stepNotes } from '../literacy';
import { notePitch, tonicMidi } from '../pitch';
import {
  MELODY_HIGHEST_MIDI,
  MELODY_LOWEST_MIDI,
  ledgerLinesOf,
  placeMelody,
  pitchFrom,
  spelledNote,
  staffPosition,
  staffPositionOf,
  trebleLedgerLines,
  type WrittenNote,
} from '../register';

/**
 * Where a melody sits: in the treble staff, with as few ledger lines as it
 * can. A step's words, call and response are placed together, the 1 in the
 * lowest octave that keeps every note in C4–A5; failing that, the fewest
 * ledger lines, then nearest the staff's middle line. Chords keep their
 * register.
 */

const n = (degree: WrittenNote['degree'], octave?: number): WrittenNote =>
  octave ? { degree, octave } : { degree };
const keyOf = (tonic: LiteracyTonic, mode: LiteracyMode = 'major') => ({
  tonic,
  mode,
});
const inKey = (tonic: LiteracyTonic, mode: LiteracyMode = 'major') =>
  withMode(withTonic(emptyChoices(), tonic), mode);
/** A melody's pitches, placed in a key (scale numbering, Part 2's). */
const placed = (
  notes: readonly WrittenNote[],
  tonic: LiteracyTonic,
  mode: LiteracyMode = 'major',
) => {
  const key = keyOf(tonic, mode);
  const { tonic: one } = placeMelody(key, notes, 'scale');
  return notes.map((note) => pitchFrom(note, one, key, 'scale'));
};
const pos = (letter: string, octave: number) => staffPositionOf(letter, octave);

const TRIAD = melodyOf(part2Step('one-three-five'));
const NEIGHBOR = melodyOf(part2Step('one-seven-one'));
const LOW_FIVE_UP = [n('5', -1), n('6', -1), n('7', -1), n('1')];
const DOWN_TO_LOW_FIVE = [
  n('1'),
  n('7', -1),
  n('6', -1),
  n('5', -1),
  n('6', -1),
  n('7', -1),
  n('1'),
];
const FIVE_SIX_FIVE = [n('5'), n('6'), n('5')];
const FIVE_FOUR_SIX_FIVE = [n('5'), n('4'), n('6'), n('5')];
/** The low 5 to the 5 two octaves up: too wide for C4–A5 in any key. */
const FIVE_TO_FIVE = [n('5', -1), n('1'), n('5'), n('5', 1)];

describe('ledger lines on the treble staff', () => {
  it('needs none from D4 to G5, then one more every other step out', () => {
    const lines = (letter: string, octave: number) =>
      trebleLedgerLines(pos(letter, octave));
    expect(lines('D', 4)).toBe(0);
    expect(lines('E', 4)).toBe(0);
    expect(lines('F', 5)).toBe(0);
    expect(lines('G', 5)).toBe(0);
    expect([lines('C', 4), lines('B', 3)]).toEqual([1, 1]);
    expect([lines('A', 5), lines('B', 5)]).toEqual([1, 1]);
    expect([lines('A', 3), lines('G', 3)]).toEqual([2, 2]);
    expect([lines('C', 6), lines('D', 6)]).toEqual([2, 2]);
    expect([lines('F', 3), lines('E', 6)]).toEqual([3, 3]);
  });

  it('counts a melody by its lowest note below the staff and its highest above', () => {
    expect(ledgerLinesOf([])).toBe(0);
    expect(ledgerLinesOf([pos('E', 4), pos('G', 5)])).toBe(0);
    expect(ledgerLinesOf([pos('A', 3), pos('C', 4), pos('E', 4)])).toBe(2);
    expect(ledgerLinesOf([pos('C', 4), pos('A', 5)])).toBe(2);
  });

  it('writes each note the key’s way: D♭’s 1 on D, F♯’s 7 an E♯, A’s 3 a C♯', () => {
    const dFlat = keyOf('Db');
    expect(staffPosition(n('1'), 61, dFlat)).toBe(pos('D', 4));
    expect(spelledNote(n('1'), 61, dFlat)).toBe('D♭4');
    expect(trebleLedgerLines(staffPosition(n('1'), 61, dFlat))).toBe(0);
    expect(spelledNote(n('7', -1), 66, keyOf('F#'), 'scale')).toBe('E♯4');
    // C♯4 is written on middle C's ledger line, D♭4 under the staff.
    const aMajor = keyOf('A');
    expect(spelledNote(n('3'), 57, aMajor, 'scale')).toBe('C♯4');
    expect(trebleLedgerLines(staffPosition(n('3'), 57, aMajor))).toBe(1);
    // Minor's ♭3 in scale numbering, and Part 1's chromatic labels.
    expect(spelledNote(n('3'), 61, keyOf('Db', 'minor'), 'scale')).toBe('F♭4');
    expect(spelledNote(n('b3'), 60, keyOf('C'))).toBe('E♭4');
    expect(spelledNote(n('#4'), 60, keyOf('C'))).toBe('F♯4');
  });
});

describe('a melody in the treble staff', () => {
  it('leaves Part 1 where it was: in C, middle C its lowest note', () => {
    const lesson = LITERACY_FIXTURE;
    for (const step of lesson.steps) {
      expect(melodyTonic(lesson, step), step.tag).toBe(60);
      const notes = stepNotes(lesson, step);
      const before = (s: readonly LiteracyNote[]) =>
        s.map((note) => notePitch(note, lesson.key));
      expect(
        notes.words.map((x) => x.midi),
        step.tag,
      ).toEqual(before(step.words.notes));
      expect(
        notes.call.map((x) => x.midi),
        step.tag,
      ).toEqual(before(step.call.notes));
      const midis = [...notes.words, ...notes.call, ...notes.response].map(
        (x) => x.midi,
      );
      expect(Math.min(...midis), step.tag).toBe(60);
      expect(placeMelody(lesson.key, melodyOf(step)).ledgerLines).toBe(1);
    }
  });

  it('places Part 2’s figures in G, C, F♯ and D♭, major and minor', () => {
    const table: [LiteracyTonic, LiteracyMode, number[], number[]][] = [
      // key        1-3-5          1-7-1 (its 7 below)
      ['G', 'major', [67, 71, 74], [67, 66, 67]],
      ['G', 'minor', [67, 70, 74], [67, 65, 67]],
      ['C', 'major', [60, 64, 67], [72, 71, 72]],
      ['C', 'minor', [60, 63, 67], [72, 70, 72]],
      ['F#', 'major', [66, 70, 73], [66, 65, 66]],
      ['F#', 'minor', [66, 69, 73], [66, 64, 66]],
      ['Db', 'major', [61, 65, 68], [61, 60, 61]],
      // D♭ minor's ♭7 below is C♭4, under middle C: up an octave.
      ['Db', 'minor', [61, 64, 68], [73, 71, 73]],
    ];
    for (const [tonic, mode, triad, neighbor] of table) {
      expect(placed(TRIAD, tonic, mode), `1-3-5 in ${tonic} ${mode}`).toEqual(
        triad,
      );
      expect(
        placed(NEIGHBOR, tonic, mode),
        `1-7-1 in ${tonic} ${mode}`,
      ).toEqual(neighbor);
    }
    // What the player plays: the same pitches, from the student's key.
    const step = part2Step('one-three-five');
    expect(
      stepNotes(PART2_FIXTURE, step, inKey('G')).call.map((x) => x.midi),
    ).toEqual([67, 71, 74]);
    expect(stepNotes(PART2_FIXTURE, step, inKey('G')).tonic).toBe(67);
  });

  it('lifts the low-5 figures into the staff', () => {
    // C major: G4 A4 B4 C5, where the old register had G3 A3 B3 C4.
    expect(placed(LOW_FIVE_UP, 'C')).toEqual([67, 69, 71, 72]);
    expect(LOW_FIVE_UP.map((note) => notePitch(note, keyOf('C')))).toEqual([
      55, 57, 59, 60,
    ]);
    // F major's low 5 is middle C itself: C4 D4 E4 F4.
    expect(placed(LOW_FIVE_UP, 'F')).toEqual([60, 62, 64, 65]);
    // G major's is D4, in the staff.
    expect(placed(LOW_FIVE_UP, 'G')).toEqual([62, 64, 66, 67]);
    // E minor's B3 is under middle C: B4 to E5.
    expect(placed(DOWN_TO_LOW_FIVE, 'E', 'minor')).toEqual([
      76, 74, 72, 71, 72, 74, 76,
    ]);
    for (const mode of ['major', 'minor'] as const)
      for (const tonic of CIRCLE_OF_FIFTHS)
        for (const figure of [LOW_FIVE_UP, DOWN_TO_LOW_FIVE]) {
          const at = placeMelody(keyOf(tonic, mode), figure, 'scale');
          expect(at.fits, `${tonic} ${mode}`).toBe(true);
          expect(at.ledgerLines, `${tonic} ${mode}`).toBeLessThanOrEqual(1);
        }
  });

  it('keeps the upper 5’s neighbors in the staff, in every key', () => {
    expect(placed(FIVE_SIX_FIVE, 'C')).toEqual([67, 69, 67]);
    // E major's B3 would be under middle C: B4 C♯5 B4.
    expect(placed(FIVE_SIX_FIVE, 'E')).toEqual([71, 73, 71]);
    // A major's 4 is D4: the lowest that fits.
    expect(placed(FIVE_FOUR_SIX_FIVE, 'A')).toEqual([64, 62, 66, 64]);
    for (const mode of ['major', 'minor'] as const)
      for (const tonic of CIRCLE_OF_FIFTHS)
        for (const figure of [FIVE_SIX_FIVE, FIVE_FOUR_SIX_FIVE]) {
          const at = placeMelody(keyOf(tonic, mode), figure, 'scale');
          expect(at.fits, `${tonic} ${mode}`).toBe(true);
          expect(at.lowest).toBeGreaterThanOrEqual(MELODY_LOWEST_MIDI);
          expect(at.highest).toBeLessThanOrEqual(MELODY_HIGHEST_MIDI);
        }
  });

  it('places the words, call and response together, so a step never jumps an octave', () => {
    // The call alone would sit on C4; the response's 7 below takes both to C5.
    const step: LiteracyMelodicEchoStep = {
      tag: 'together',
      title: 'Together',
      call: {
        bars: 1,
        notes: [
          { tick: 0, duration: 480, degree: '1' },
          { tick: 480, duration: 480, degree: '3' },
          { tick: 960, duration: 480, degree: '5' },
        ],
      },
      response: {
        bars: 1,
        notes: [
          { tick: 0, duration: 480, degree: '1' },
          { tick: 480, duration: 480, degree: '7', octave: -1 },
          { tick: 960, duration: 480, degree: '1' },
        ],
      },
    };
    const lesson = { ...PART2_FIXTURE, steps: [...PART2_FIXTURE.steps, step] };
    const notes = stepNotes(lesson, step, inKey('C'));
    expect(notes.call.map((x) => x.midi)).toEqual([72, 76, 79]);
    expect(notes.response.map((x) => x.midi)).toEqual([72, 71, 72]);
    expect(notes.tonic).toBe(72);
  });

  it('takes the fewest ledger lines, then the staff’s middle, for a figure too wide to fit', () => {
    // C: G3 to G5 (2 lines, under the staff) beats G4 to G6 (4 above).
    const inC = placeMelody(keyOf('C'), FIVE_TO_FIVE, 'scale');
    expect(inC).toEqual({
      tonic: 60,
      lowest: 55,
      highest: 79,
      ledgerLines: 2,
      fits: false,
    });
    // A: E3–E5 and E4–E6 need 3 each; E4–E6 is nearer the middle line.
    expect(placeMelody(keyOf('A'), FIVE_TO_FIVE, 'scale')).toMatchObject({
      tonic: 69,
      ledgerLines: 3,
      fits: false,
    });
    // B: F♯3–F♯5 is the nearer, so the lower.
    expect(placeMelody(keyOf('B'), FIVE_TO_FIVE, 'scale')).toMatchObject({
      tonic: 59,
      ledgerLines: 3,
    });
    // Level on both: the lower of the two.
    const wide = [n('1'), n('3', 1), n('5', 1)];
    expect(placeMelody(keyOf('G'), wide, 'scale').tonic).toBe(55);
  });

  it('places nothing but melodies: a chord step keeps the series’ 1 and its voicing', () => {
    const chord = part2Step('the-1-chord');
    for (const tonic of CIRCLE_OF_FIFTHS) {
      expect(melodyTonic(PART2_FIXTURE, chord, inKey(tonic))).toBe(
        tonicMidi(tonic),
      );
      const notes = stepNotes(PART2_FIXTURE, chord, inKey(tonic));
      expect(notes.tonic).toBe(tonicMidi(tonic));
      for (const attack of notes.chords!.call) {
        const root = attack.chord.midis[0];
        expect(root).toBeGreaterThanOrEqual(50);
        expect(root).toBeLessThanOrEqual(61);
      }
    }
    expect(melodyOf(part2Step('choose-key'))).toEqual([]);
  });
});
