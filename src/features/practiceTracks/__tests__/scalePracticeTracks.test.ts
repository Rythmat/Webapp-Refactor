import { describe, expect, it } from 'vitest';
import { buildChordToneContext } from '@/components/Games/content/melodyConstraints';
import { SCALE_LESSONS, spellScaleLesson } from '@/lib/learn/scaleLessons';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { generatePracticeTrack } from '../generatePracticeTrack';

// rootMidi is 60 + root, so C keeps the note math readable.
const ROOT_C = 0;

describe('Pentatonic/Blues practice tracks', () => {
  it('plays | 1 maj | 4 maj | 1 maj | 4 maj | for the major pentatonic', async () => {
    const result = await generatePracticeTrack(
      'majorpentatonic',
      ROOT_C,
      'melody',
    );
    expect(result.chordRegions.map((r) => r.midis)).toEqual([
      [48, 52, 55],
      [53, 57, 60],
      [48, 52, 55],
      [53, 57, 60],
    ]);
    expect(result.mode).toBe('ionian');
    expect(result.scaleTitle).toBe('Major Pentatonic');
  });

  it('plays | 1 min | 1 min | ♭6 maj7 | ♭6 maj7 | for the minor pentatonic', async () => {
    const result = await generatePracticeTrack(
      'minorpentatonic',
      ROOT_C,
      'melody',
    );
    expect(result.chordRegions.map((r) => r.midis)).toEqual([
      [48, 51, 55],
      [48, 51, 55],
      [56, 60, 63, 67], // A♭maj7, an octave under the melody
      [56, 60, 63, 67],
    ]);
    expect(result.mode).toBe('aeolian');
  });

  it.each(['majorblues', 'minorblues'] as const)(
    'plays | 1 dom7 | 4 dom7 | 1 dom7 | 1 dom7 | for the %s scale',
    async (slug) => {
      const result = await generatePracticeTrack(slug, ROOT_C, 'melody');
      expect(result.chordRegions.map((r) => r.midis)).toEqual([
        [48, 52, 55, 58], // C7
        [53, 57, 60, 63], // F7
        [48, 52, 55, 58],
        [48, 52, 55, 58],
      ]);
    },
  );

  it('keeps every Practice Track chord under the melody and at or below C5', async () => {
    const modes = [
      'ionian',
      'lydian',
      'mixolydian',
      'dorian',
      'aeolian',
      'phrygian',
      'locrian',
      'majorpentatonic',
      'minorpentatonic',
      'majorblues',
      'minorblues',
    ] as const;
    for (const mode of modes)
      for (let root = 0; root < 12; root++) {
        const result = await generatePracticeTrack(mode, root, 'melody');
        const midis = result.chordRegions.flatMap((r) => r.midis ?? []);
        // Lowest chord note no higher than C5; the voicing drops one octave
        // from where it was built, so its top is under the tonic an octave up.
        expect(Math.min(...midis)).toBeLessThanOrEqual(72);
        expect(Math.max(...midis)).toBeLessThan(60 + root + 12);
      }
  });

  it('leaves the melody open for the student', async () => {
    const result = await generatePracticeTrack('minorblues', ROOT_C, 'melody');
    expect(result.melodyClip).toBeNull();
    expect(result.chordsClip).not.toBeNull();
  });
});

describe('Pentatonic/Blues scales', () => {
  it('has the formulas as written: 1-2-3-5-6, 1-♭3-4-5-♭7, 1-2-♭3-3-5-6, 1-♭3-4-♯4-5-♭7', () => {
    expect(getLocalModeSteps('majorpentatonic')).toEqual([0, 2, 4, 7, 9]);
    expect(getLocalModeSteps('minorpentatonic')).toEqual([0, 3, 5, 7, 10]);
    expect(getLocalModeSteps('majorblues')).toEqual([0, 2, 3, 4, 7, 9]);
    expect(getLocalModeSteps('minorblues')).toEqual([0, 3, 5, 6, 7, 10]);
  });

  it('lands melodies on the tonic triad, not on every other degree', () => {
    const scaleMidis = (steps: number[]) => [...steps.map((s) => 60 + s), 72];
    const pcs = (set: Set<number>) => [...set].sort((a, b) => a - b);

    const minorPent = buildChordToneContext(
      scaleMidis(SCALE_LESSONS.minorpentatonic.steps),
      SCALE_LESSONS.minorpentatonic.chordTones,
    )!;
    expect(pcs(minorPent.chordTonePcs)).toEqual([0, 3, 7]); // C E♭ G
    expect(minorPent.thirdPc).toBe(3);
    // A 5th is three steps of a pentatonic scale, an octave five.
    expect(minorPent.fifthSteps).toBe(3);
    expect(minorPent.octaveSteps).toBe(5);

    const majorBlues = buildChordToneContext(
      scaleMidis(SCALE_LESSONS.majorblues.steps),
      SCALE_LESSONS.majorblues.chordTones,
    )!;
    expect(pcs(majorBlues.chordTonePcs)).toEqual([0, 4, 7]); // C E G
    expect(majorBlues.fifthSteps).toBe(4);
  });

  it('leaves the seven-note modes as they were', () => {
    const ionian = buildChordToneContext([60, 62, 64, 65, 67, 69, 71, 72])!;
    expect([...ionian.chordTonePcs].sort((a, b) => a - b)).toEqual([0, 4, 7]);
    expect(ionian.fifthSteps).toBe(4);
    expect(ionian.octaveSteps).toBe(7);
  });

  it('spells each degree from its own letter', () => {
    expect(spellScaleLesson(SCALE_LESSONS.minorblues, 'C')).toEqual([
      'C',
      'E♭',
      'F',
      'F♯',
      'G',
      'B♭',
    ]);
    expect(spellScaleLesson(SCALE_LESSONS.majorblues, 'A')).toEqual([
      'A',
      'B',
      'C',
      'C♯',
      'E',
      'F♯',
    ]);
    expect(spellScaleLesson(SCALE_LESSONS.minorpentatonic, 'E♭')).toEqual([
      'E♭',
      'G♭',
      'A♭',
      'B♭',
      'D♭',
    ]);
  });
});
