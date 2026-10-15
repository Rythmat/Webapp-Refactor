/**
 * The labels the lane stores for a chord it knows by its pitches, and that
 * the identity reader reads back as the same chord.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/chordLabels.test.ts
 */
import { describe, expect, it } from 'vitest';
import { pitchesOfLabels, type ChordPitches } from '../chordIdentity';
import {
  chordLabels,
  engineSlashFor,
  KEYLESS_CHORD_COLOR,
} from '../chordLabels';
import { keyFrame } from '../keyFrame';

const C = keyFrame(0, 'ionian');
const aMinor = keyFrame(9, 'aeolian');

const chord = (
  rootPc: number,
  quality = 'major',
  bassPc = rootPc,
): ChordPitches => ({ rootPc, quality, bassPc });

describe('chordLabels', () => {
  it('writes the lane’s degree, letter and engine labels in a key', () => {
    expect(chordLabels(chord(2, 'minor7'), C)).toMatchObject({
      name: '2 min7',
      noteName: 'D min7',
      degreeKey: '2 minor7',
    });
    expect(chordLabels(chord(0), aMinor)).toMatchObject({
      name: 'b3 maj',
      noteName: 'C maj',
      degreeKey: 'b3 major',
    });
  });

  it('writes a slash chord’s bass as a key degree and a letter', () => {
    // G/B: the engine voices it as 'major/3', G's own third.
    expect(chordLabels(chord(7, 'major', 11), C)).toMatchObject({
      name: '5 maj/7',
      noteName: 'G maj/B',
      degreeKey: '5 major/3',
    });
    // D/C: no engine quality puts C under D, so the degreeKey has no slash.
    expect(chordLabels(chord(2, 'major', 0), C)).toMatchObject({
      name: '2 maj/1',
      noteName: 'D maj/C',
      degreeKey: '2 major',
    });
  });

  it('spells in the key, unless the writer spelled it', () => {
    const fSharpKey = keyFrame(6, 'ionian');
    expect(chordLabels(chord(10, 'minor'), fSharpKey).noteName).toBe('A# min');
    expect(
      chordLabels(chord(10, 'minor'), C, { root: 'A#' }, { root: 10 }).noteName,
    ).toBe('A# min');
    expect(chordLabels(chord(10, 'minor'), C).noteName).toBe('Bb min');
  });

  it('writes letters only, and the keyless colour, without a key', () => {
    expect(chordLabels(chord(9, 'minor7', 7), null)).toEqual({
      name: 'A min7/G',
      noteName: 'A min7/G',
      color: KEYLESS_CHORD_COLOR,
    });
  });

  it('reads back as the chord it was written for', () => {
    const chords = [
      chord(2, 'minor7'),
      chord(7, 'major', 11),
      chord(2, 'major', 0),
      chord(5, 'major', 0),
      chord(4, 'major', 8),
      chord(11, 'minor7b5'),
      chord(1, 'dominant7'),
    ];
    for (const frame of [C, aMinor, keyFrame(3, 'dorian'), null]) {
      for (const pitches of chords) {
        expect(
          pitchesOfLabels(chordLabels(pitches, frame), frame),
          JSON.stringify([frame?.mode, pitches]),
        ).toEqual(pitches);
      }
    }
  });
});

describe('engineSlashFor', () => {
  it('finds the CHORDS quality that voices the bass, the chord’s own tone first', () => {
    expect(engineSlashFor(chord(0, 'major', 4))).toBe('major/3');
    expect(engineSlashFor(chord(5, 'major', 0))).toBe('major/5');
    expect(engineSlashFor(chord(0, 'major', 2))).toBeUndefined();
    expect(engineSlashFor(chord(0))).toBeUndefined();
  });
});
