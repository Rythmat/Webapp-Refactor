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
 * The pads: the 1 up to the 1 above at every level, at the pitches the
 * calls play, in the key's colors; the six chord pads and the 1 again an
 * octave up.
 */

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);

describe('the melody pads', () => {
  it('are an octave with a 1 at each end, eight pads in every key', () => {
    const major = melodyPads({ tonic: 'C', mode: 'major' });
    expect(major.pads.map((p) => p.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '1',
    ]);
    expect(major.pads.map((p) => p.midi)).toEqual([
      60, 62, 64, 65, 67, 69, 71, 72,
    ]);
    expect(major.pads.map((p) => p.octave)).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    const minor = melodyPads({ tonic: 'C', mode: 'minor' });
    expect(minor.pads.map((p) => p.label)).toEqual([
      '1',
      '2',
      '♭3',
      '4',
      '5',
      '♭6',
      '♭7',
      '1',
    ]);
    for (const key of KEYS) {
      const { pads } = melodyPads(key);
      expect(pads).toHaveLength(8);
      expect(pads.at(-1)!.midi - pads[0].midi).toBe(12);
    }
  });

  it('play every note the level’s calls play, the boss’s too', () => {
    const rng = echoRandom('pads');
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const key of KEYS) {
        const midis = new Set(melodyPads(key).pads.map((p) => p.midi));
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
    const major = melodyPads({ tonic: 'D', mode: 'major' });
    expect(major.keyColor).toBe(colorForKeyMode('D', 'ionian'));
    expect(major.pads.find((p) => p.label === '1')!.color).toBe(major.keyColor);
    expect(major.pads.find((p) => p.label === '5')!.color).toBe(
      colorForKeyMode('A', 'ionian'),
    );
    // C minor wears E♭'s color.
    const minor = melodyPads({ tonic: 'C', mode: 'minor' });
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
      '1 min',
    ]);
    expect(pads.map((p) => p.color)).toEqual(
      chartColors({
        chords: pads.map((p) => p.degree),
        harmony: 'triads',
        tonic: 'A',
        mode: 'minor',
      }),
    );
    for (const pad of pads.slice(0, 6)) {
      expect(pad.chord).toEqual(voicedChord(key, pad.degree));
      expect(pad.octave).toBe(0);
    }
    expect(
      chordPads({ tonic: 'F', mode: 'major' }).map((p) => p.label),
    ).toEqual(['1 maj', '2 min', '3 min', '4 maj', '5 maj', '6 min', '1 maj']);
  });

  it('end on the 1 chord an octave up, as the melody pads end on the 1', () => {
    for (const key of KEYS) {
      const pads = chordPads(key);
      const [home, top] = [pads[0], pads.at(-1)!];
      expect(top.degree).toBe('1');
      expect(top.octave).toBe(1);
      expect(top.chord.midis).toEqual(home.chord.midis.map((m) => m + 12));
      expect(top.chord.root).toBe(home.chord.root + 12);
      expect(top.chord.pitchClasses).toEqual(home.chord.pitchClasses);
    }
  });
});
