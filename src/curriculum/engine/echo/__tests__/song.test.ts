import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import {
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '../levels';
import { assembleSong, takeBarDegrees } from '../song';
import { processTake } from '../takes';

/**
 * The song: each take repeated to fill eight bars (2 bars ×4, 4 ×2, 8 ×1),
 * and a chord a bar for the Band.
 */

const KEY = { tonic: 'G', mode: 'major' } as const;

const strike = (midis: number[], onset: number): PlayedNote[] =>
  midis.map((midi) => ({ midi, onset, duration: 1800 }));

const takes = (level: EchoLevelNumber) => ({
  melody: processTake(
    [
      { midi: 67, onset: 0, duration: 480 },
      { midi: 71, onset: 1920, duration: 480 },
    ],
    { kind: 'melody', key: KEY, level },
  ),
  chords: processTake(
    [...strike([67, 71, 74], 0), ...strike([60, 64, 67], 1920)],
    { kind: 'chords', key: KEY, level, scaffolding: { autoFill: true } },
  ),
});

describe('the song', () => {
  it('repeats each phrase to fill eight bars: ×4, ×2, ×1', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const { melody, chords } = takes(level);
      const song = assembleSong(level, KEY, chords, melody);
      const { phraseBars, repeats } = ECHO_LEVELS[level];
      expect([song.phraseBars, song.repeats]).toEqual([phraseBars, repeats]);
      expect(song.bars).toBe(8);
      expect(song.length).toBe(8 * 1920);
      expect(song.melody).toHaveLength(2 * repeats);
      expect(song.melody.map((n) => n.tick)).toEqual(
        Array.from({ length: repeats }, (_, r) => [
          r * phraseBars * 1920,
          r * phraseBars * 1920 + 1920,
        ]).flat(),
      );
      expect(song.chords).toHaveLength(2 * repeats);
      expect(song.chart.chords).toHaveLength(8);
      expect(song.phraseChart.chords).toHaveLength(phraseBars);
      expect(song.chordNotes).toHaveLength(3 * song.chords.length);
    }
  });

  it('gives the Band a chord a bar, in the song’s key, at its tempo', () => {
    const { melody, chords } = takes(1);
    const song = assembleSong(1, KEY, chords, melody);
    expect(song.phraseChart.chords).toEqual(['1', '4']);
    expect(song.chart).toEqual({
      chords: ['1', '4', '1', '4', '1', '4', '1', '4'],
      harmony: 'triads',
      tonic: 'G',
      mode: 'major',
    });
    expect(song.symbols.slice(0, 2)).toEqual(['G', 'C']);
    expect(song.tempo).toBe(80);
    expect(assembleSong(1, KEY, chords, melody, { tempo: 92 }).tempo).toBe(92);
    // At Level 2 the last chord holds through bars 2 to 4.
    const four = takes(2);
    expect(
      assembleSong(2, KEY, four.chords, four.melody).phraseChart.chords,
    ).toEqual(['1', '4', '4', '4']);
  });

  it('plays the 1 chord until there’s a chords take', () => {
    const song = assembleSong(2, KEY, null, null);
    expect(song.chart.chords).toEqual(Array(8).fill('1'));
    expect(song.melody).toEqual([]);
    expect(song.chords).toEqual([]);
  });

  it('charts a bar by the chord sounding longest in it', () => {
    const chord = (degree: '1' | '4' | '5', tick: number, duration: number) =>
      ({ degree, tick, duration }) as never;
    // Bar 1: the 1 a beat, the 4 three; bar 2: the 5 half, then the 1
    // half (a tie: the earlier); bar 3 nothing, so the 1 played last goes on.
    expect(
      takeBarDegrees(
        {
          chords: [
            chord('1', 0, 480),
            chord('4', 480, 1440),
            chord('5', 1920, 960),
            chord('1', 2880, 960),
          ],
        },
        3,
      ),
    ).toEqual(['4', '5', '1']);
    // Before the first chord, the first.
    expect(takeBarDegrees({ chords: [chord('5', 1920, 1920)] }, 2)).toEqual([
      '5',
      '5',
    ]);
  });
});
