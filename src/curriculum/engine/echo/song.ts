/**
 * The student's song (Make Your Song): their chords take and melody take,
 * each played as many times as fill the song's eight bars (2 bars ×4,
 * 4 ×2, 8 ×1), and the chart a Band plays them from.
 *
 * THE CHART
 * A Band reads a chord a bar (Music Literacy Part 3, chart.ts
 * `LiteracyChart`; bandPracticeTrack.ts builds its track from one). A bar's
 * chord is the one sounding longest in it (on a tie, the earlier, so a
 * Level 3 bar changing at its half bar gives its first); a bar with none
 * keeps the last chord played before it, and bars before the first chord
 * take that one. With no chords take yet, the band plays the 1 chord.
 *
 * What a later phase needs to call `buildBandPracticeTrack`: `chart` (the
 * song's eight bars, in its key and mode, triads) as the request's chart,
 * and `tempo` as its bpm; for the Studio, `melody` and `chordNotes` as the
 * Melody and Chords tracks' notes, in ticks at 480 a quarter. Pure, no
 * React.
 */

import type { LiteracyScaleDegree } from '@/content/musicLiteracy/schemas';
import { chartSymbols, type LiteracyChart } from '../musicLiteracy/chart';
import type { VoicedChord } from '../musicLiteracy/chords';
import type { LiteracyKey } from '../musicLiteracy/pitch';
import {
  BAR_TICKS,
  ECHO_TIME_SIGNATURE,
  echoLevel,
  type EchoLevelNumber,
} from './levels';
import type { ChordTake, MelodyTake } from './takes';

/** A note of the song's melody. */
export interface SongNote {
  midi: number;
  tick: number;
  duration: number;
  /** "♭3". */
  label: string;
}

/** A chord of the song's Chords track. */
export interface SongChord {
  tick: number;
  duration: number;
  /** Its bar of the song, from 0. */
  bar: number;
  degree: LiteracyScaleDegree;
  /** "4 maj". */
  label: string;
  chord: VoicedChord;
}

export interface EchoSong {
  level: EchoLevelNumber;
  key: LiteracyKey;
  tempo: number;
  timeSignature: readonly [number, number];
  barTicks: number;
  /** The phrase a take records, and how many times the song plays it. */
  phraseBars: number;
  repeats: number;
  /** The song's bars, all of it: eight. */
  bars: number;
  /** The song's length in ticks. */
  length: number;
  melody: SongNote[];
  chords: SongChord[];
  /** The chords as notes, every chord tone of each: the Chords track's. */
  chordNotes: { midi: number; tick: number; duration: number }[];
  /** A chord a bar of the phrase. */
  phraseChart: LiteracyChart;
  /** A chord a bar of the whole song: what the Band plays. */
  chart: LiteracyChart;
  /** The chart as chord symbols, a bar each: "C Am F G". */
  symbols: string[];
}

/** A chord a bar of a chords take's phrase (THE CHART above). */
export function takeBarDegrees(
  take: Pick<ChordTake, 'chords'> | null,
  bars: number,
): LiteracyScaleDegree[] {
  const longest: (LiteracyScaleDegree | null)[] = Array.from(
    { length: bars },
    (_, bar) => {
      const start = bar * BAR_TICKS;
      const end = start + BAR_TICKS;
      let best: LiteracyScaleDegree | null = null;
      let most = 0;
      for (const chord of take?.chords ?? []) {
        const heard =
          Math.min(end, chord.tick + chord.duration) -
          Math.max(start, chord.tick);
        if (heard > most) {
          most = heard;
          best = chord.degree;
        }
      }
      return best;
    },
  );
  const played = [...(take?.chords ?? [])].sort((a, b) => a.tick - b.tick);
  const first = played[0]?.degree ?? '1';
  return longest.map(
    (degree, bar) =>
      degree ??
      played.filter((chord) => chord.tick < bar * BAR_TICKS).at(-1)?.degree ??
      first,
  );
}

/**
 * The song from the two takes (either may be missing yet): each repeated
 * to fill the song, with its chart (THE CHART above). `tempo`: the level's
 * when left out.
 */
export function assembleSong(
  level: EchoLevelNumber,
  key: LiteracyKey,
  chordTake: ChordTake | null,
  melodyTake: MelodyTake | null,
  { tempo }: { tempo?: number } = {},
): EchoSong {
  const config = echoLevel(level);
  const phraseBars = config.phraseBars;
  const repeats = config.repeats;
  const phrase = phraseBars * BAR_TICKS;
  const times = Array.from({ length: repeats }, (_, r) => r * phrase);

  const melody = times.flatMap((offset) =>
    (melodyTake?.notes ?? [])
      .filter((note) => note.tick < phrase)
      .map((note) => ({
        midi: note.midi,
        tick: offset + note.tick,
        duration: Math.min(note.duration, phrase - note.tick),
        label: note.label,
      })),
  );
  const chords = times.flatMap((offset) =>
    (chordTake?.chords ?? [])
      .filter((chord) => chord.tick < phrase)
      .map((chord) => ({
        tick: offset + chord.tick,
        duration: Math.min(chord.duration, phrase - chord.tick),
        bar: Math.floor((offset + chord.tick) / BAR_TICKS),
        degree: chord.degree,
        label: chord.label,
        chord: chord.chord,
      })),
  );
  const chordNotes = chords.flatMap((chord) =>
    chord.chord.midis.map((midi) => ({
      midi,
      tick: chord.tick,
      duration: chord.duration,
    })),
  );
  const phraseDegrees = takeBarDegrees(chordTake, phraseBars);
  const chartOf = (degrees: LiteracyScaleDegree[]): LiteracyChart => ({
    chords: degrees,
    harmony: 'triads',
    tonic: key.tonic,
    mode: key.mode,
  });
  const chart = chartOf(times.flatMap(() => phraseDegrees));
  return {
    level,
    key,
    tempo: tempo ?? config.tempo,
    timeSignature: ECHO_TIME_SIGNATURE,
    barTicks: BAR_TICKS,
    phraseBars,
    repeats,
    bars: phraseBars * repeats,
    length: phrase * repeats,
    melody,
    chords,
    chordNotes,
    phraseChart: chartOf(phraseDegrees),
    chart,
    symbols: chartSymbols(chart),
  };
}
