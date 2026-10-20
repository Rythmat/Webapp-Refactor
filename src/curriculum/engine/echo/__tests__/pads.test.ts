import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_TONICS,
} from '@/content/musicLiteracy/schemas';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { chartColors } from '../../musicLiteracy/chart';
import { voicedChord } from '../../musicLiteracy/chords';
import { bossCalls, melodyCall } from '../calls';
import { ECHO_LEVEL_NUMBERS } from '../levels';
import { chordPads, melodyPads } from '../pads';
import { echoRandom } from '../random';

/**
 * The pads: the scale positions a level's calls reach, at the pitches the
 * calls play, ten at most, in the key's colors; the six chord pads.
 */

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);

describe('the melody pads', () => {
  it('are an octave from the 5 below at Level 1, ten from Level 2', () => {
    const one = melodyPads(1, { tonic: 'C', mode: 'major' });
    expect(one.pads.map((p) => p.label)).toEqual([
      '5',
      '6',
      '7',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(one.pads.map((p) => p.midi)).toEqual([
      67, 69, 71, 72, 74, 76, 77, 79,
    ]);
    expect(one.pads.map((p) => p.octave)).toEqual([-1, -1, -1, 0, 0, 0, 0, 0]);
    const two = melodyPads(2, { tonic: 'C', mode: 'minor' });
    expect(two.pads.map((p) => p.label)).toEqual([
      '5',
      '♭6',
      '♭7',
      '1',
      '2',
      '♭3',
      '4',
      '5',
      '♭6',
      '♭7',
    ]);
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const key of KEYS) {
        expect(melodyPads(level, key).pads.length).toBeLessThanOrEqual(10);
      }
    }
  });

  it('play every note the level’s calls play, the boss’s too', () => {
    const rng = echoRandom('pads');
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const key of KEYS) {
        const midis = new Set(melodyPads(level, key).pads.map((p) => p.midi));
        const calls = [
          melodyCall(level, key, rng),
          ...bossCalls(level, key, rng),
        ];
        for (const call of calls) {
          if (call.kind !== 'melody') continue;
          for (const note of call.notes) expect(midis).toContain(note.midi);
        }
      }
    }
  });

  it('wear the key’s colors: the 1’s pad the key’s own', () => {
    const major = melodyPads(1, { tonic: 'D', mode: 'major' });
    expect(major.keyColor).toBe(colorForKeyMode('D', 'ionian'));
    expect(major.pads.find((p) => p.label === '1')!.color).toBe(major.keyColor);
    expect(major.pads.find((p) => p.label === '5')!.color).toBe(
      colorForKeyMode('A', 'ionian'),
    );
    // C minor wears E♭'s color.
    const minor = melodyPads(2, { tonic: 'C', mode: 'minor' });
    expect(minor.keyColor).toBe(colorForKeyMode('Eb', 'ionian'));
    expect(minor.pads.find((p) => p.label === '1')!.color).toBe(minor.keyColor);
  });
});

describe('the chord pads', () => {
  it('are the mode’s six chords, colored by their roots, voiced on their own', () => {
    const key = { tonic: 'A', mode: 'minor' } as const;
    const pads = chordPads(key);
    expect(pads.map((p) => p.label)).toEqual([
      '1 min',
      '♭3 maj',
      '4 min',
      '5 min',
      '♭6 maj',
      '♭7 maj',
    ]);
    expect(pads.map((p) => p.color)).toEqual(
      chartColors({
        chords: pads.map((p) => p.degree),
        harmony: 'triads',
        tonic: 'A',
        mode: 'minor',
      }),
    );
    for (const pad of pads) {
      expect(pad.chord).toEqual(voicedChord(key, pad.degree));
    }
    expect(
      chordPads({ tonic: 'F', mode: 'major' }).map((p) => p.label),
    ).toEqual(['1 maj', '2 min', '3 min', '4 maj', '5 maj', '6 min']);
  });
});
