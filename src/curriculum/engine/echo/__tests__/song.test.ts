import { describe, expect, it } from 'vitest';
import { chordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import type { PlayedNote } from '../../musicLiteracy/grading';
import {
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '../levels';
import { assembleSong, chordAtTick, takeBarDegrees } from '../song';
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

describe('the song’s chord changes', () => {
  const chordsTake = (
    level: EchoLevelNumber,
    played: PlayedNote[],
    autoFill = true,
  ) =>
    processTake(played, {
      kind: 'chords',
      key: KEY,
      level,
      scaffolding: { autoFill },
    });
  const changes = (song: ReturnType<typeof assembleSong>) =>
    song.chordChanges.map((c) => [c.tick, c.degree, c.symbol]);
  const G = [67, 71, 74];
  const C = [60, 64, 67];
  const D = [62, 66, 69];
  const Em = [64, 67, 71];

  it('changes at the half bar at Level 3: two changes in that bar', () => {
    const take = chordsTake(3, [
      ...strike(G, 0),
      ...strike(D, 960),
      ...strike(Em, 1920),
      ...strike(C, 2880),
    ]);
    const song = assembleSong(3, KEY, take, null);
    expect(changes(song)).toEqual([
      [0, '1', 'G'],
      [960, '5', 'D'],
      [1920, '6', 'Em'],
      [2880, '4', 'C'],
    ]);
    expect(song.chordChanges.filter((c) => c.bar === 0)).toHaveLength(2);
    // The last change lasts to the song’s end.
    expect(song.chordChanges.at(-1)!.duration).toBe(song.length - 2880);
    // The chart: a bar’s longest, a tie the earlier.
    expect(song.chart.chords.slice(0, 2)).toEqual(['1', '6']);
  });

  it('keeps one change a bar at Levels 1 and 2, played that way', () => {
    for (const level of [1, 2] as const) {
      const take = chordsTake(level, [...strike(G, 0), ...strike(C, 1920)]);
      const song = assembleSong(level, KEY, take, null);
      for (const change of song.chordChanges) {
        expect(change.tick % 1920).toBe(0);
      }
      const bars = song.chordChanges.map((c) => c.bar);
      expect(new Set(bars).size).toBe(bars.length);
    }
    // Level 1: G C, four times over.
    const one = assembleSong(
      1,
      KEY,
      chordsTake(1, [...strike(G, 0), ...strike(C, 1920)]),
      null,
    );
    expect(changes(one).map(([tick]) => tick)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((bar) => bar * 1920),
    );
    // Auto Fill at Level 2 puts a change in the bar on its bar line.
    const two = chordsTake(2, [...strike(G, 0), ...strike(C, 960)]);
    expect(changes(assembleSong(2, KEY, two, null)).slice(0, 2)).toEqual([
      [0, '1', 'G'],
      [1920, '4', 'C'],
    ]);
  });

  it('follows the take where it changes without Auto Fill, on its 16ths', () => {
    const take = chordsTake(
      2,
      [...strike(G, 0), ...strike(C, 1450), ...strike(G, 1920)],
      false,
    );
    const song = assembleSong(2, KEY, take, null);
    expect(changes(song).slice(0, 3)).toEqual([
      [0, '1', 'G'],
      [1440, '4', 'C'],
      [1920, '1', 'G'],
    ]);
    // Two changes in bar 1; the chart gives it the G, sounding longest.
    expect(song.chart.chords[0]).toBe('1');
  });

  it('makes a chord struck again, or running on over the repeat, one change', () => {
    const take = chordsTake(
      2,
      [...strike(G, 0), ...strike(G, 480), ...strike(G, 1920)],
      false,
    );
    const song = assembleSong(2, KEY, take, null);
    expect(changes(song)).toEqual([[0, '1', 'G']]);
    expect(song.chordChanges[0].duration).toBe(song.length);
  });

  it('sounds a chord until the next change, held or not', () => {
    // A G let go on beat 2, a C on beat 4: the G sounds three beats.
    const take = processTake(
      [
        ...G.map((midi) => ({ midi, onset: 0, duration: 400 })),
        ...strike(C, 1440),
      ],
      { kind: 'chords', key: KEY, level: 2 },
    );
    const song = assembleSong(2, KEY, take, null);
    expect(song.chordChanges[0]).toMatchObject({ tick: 0, duration: 1440 });
    expect(song.phraseChart.chords[0]).toBe('1');
  });

  it('plays the 1 chord until there’s a chords take', () => {
    const song = assembleSong(1, KEY, null, null);
    expect(changes(song)).toEqual([[0, '1', 'G']]);
    expect(song.chordChanges[0]).toMatchObject({
      duration: song.length,
      label: '1 maj',
    });
  });

  it('spells its symbols the key’s way, as chordSymbolTones reads them', () => {
    const key = { tonic: 'D', mode: 'minor' } as const;
    const take = processTake(
      [...strike([58, 62, 65], 0), ...strike([60, 64, 67], 1920)],
      { kind: 'chords', key, level: 1 },
    );
    const song = assembleSong(1, key, take, null);
    expect(
      song.chordChanges.slice(0, 2).map((c) => [c.label, c.symbol]),
    ).toEqual([
      ['♭6 maj', 'Bb'],
      ['♭7 maj', 'C'],
    ]);
    for (const change of song.chordChanges) {
      expect(change).toMatchObject(chordSymbolTones(change.symbol)!);
    }
  });

  it('finds the change sounding at a tick', () => {
    const take = chordsTake(3, [...strike(G, 0), ...strike(D, 960)]);
    const { chordChanges } = assembleSong(3, KEY, take, null);
    expect(chordAtTick(chordChanges, 0)?.symbol).toBe('G');
    expect(chordAtTick(chordChanges, 959)?.symbol).toBe('G');
    expect(chordAtTick(chordChanges, 960)?.symbol).toBe('D');
    expect(chordAtTick(chordChanges, 15000)?.symbol).toBe('D');
    expect(chordAtTick(chordChanges, -10)?.symbol).toBe('G');
    expect(chordAtTick([], 0)).toBeNull();
  });
});
