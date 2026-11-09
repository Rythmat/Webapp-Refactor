/**
 * The student's song (Make Your Song): their chords take and melody take,
 * each played as many times as fill the song's eight bars (2 bars ×4,
 * 4 ×2, 8 ×1), and the chords a Band plays them over.
 *
 * THE CHANGES (`chordChanges`)
 * The band follows the chords take as it changes, as often as it does in a
 * bar: with Auto Fill on the bar lines (the half bars at Level 3), without
 * it where the take put them (on its 16ths). A chord sounds until the next
 * change, whether or not it's still held: a strike of the chord already
 * sounding changes nothing, and the first chord sounds from the downbeat.
 * Each change is in the song's key: its degree, its label ("4 maj") and
 * its symbol ("F", "Bbm": chart.ts `chordSymbol`, which chordSymbolTones
 * reads), with the symbol's tones, so a change is a genre TimedChord
 * (chordTimeline.ts) too. With no chords take yet, the band plays the 1
 * chord. `chordAtTick` finds the change sounding at a tick.
 *
 * THE CHART (`chart`)
 * For whatever reads a chord a bar (Music Literacy Part 3, chart.ts
 * `LiteracyChart`; bandPracticeTrack.ts builds its track from one): each
 * bar's chord is the one sounding longest in it, by the changes (on a tie,
 * the earlier, so a Level 3 bar changing at its half bar gives its first).
 * So a bar with no change keeps the chord sounding into it.
 *
 * What a later phase needs to call `buildBandPracticeTrack`: `chart` (the
 * song's eight bars, in its key and mode, triads) as the request's chart,
 * `chordChanges` (with `length`) as the chords it really plays, and
 * `tempo` as its bpm; for the Studio, `melody` and `chordNotes` as the
 * Melody and Chords tracks' notes, in ticks at 480 a quarter. Pure, no
 * React.
 */

import type { LiteracyScaleDegree } from '@/content/musicLiteracy/schemas';
import { chordSymbolTones } from '../genreGeneration/chordSymbolTones';
import type { TimedChord } from '../genreGeneration/chordTimeline';
import {
  chartSymbols,
  chordSymbol,
  type LiteracyChart,
} from '../musicLiteracy/chart';
import { diatonicChord, type VoicedChord } from '../musicLiteracy/chords';
import { pitchClassOf, type LiteracyKey } from '../musicLiteracy/pitch';
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

/**
 * A change of the song's chords (THE CHANGES above): where the band changes
 * chord, to what, and for how long. A genre TimedChord as well: its symbol's
 * tones (chordSymbolTones) come with it.
 */
export interface SongChordChange extends TimedChord {
  /** Where it starts, ticks from the song's downbeat. */
  tick: number;
  /** Until the next change, or the song's end. */
  duration: number;
  /** The song's bar it starts in, from 0. */
  bar: number;
  degree: LiteracyScaleDegree;
  /** "4 maj". */
  label: string;
  /** "F", "Bbm": the key's spelling, ASCII accidentals. */
  symbol: string;
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
  /**
   * The song's chords as the band plays them, every change, in time order
   * from tick 0 to `length` (THE CHANGES above).
   */
  chordChanges: SongChordChange[];
  /** A chord a bar of the phrase: the chord sounding longest in each bar. */
  phraseChart: LiteracyChart;
  /**
   * A chord a bar of the whole song: the chord sounding longest in each bar
   * (THE CHART above), for whatever reads one chord a bar.
   */
  chart: LiteracyChart;
  /** The chart as chord symbols, a bar each: "C Am F G". */
  symbols: string[];
}

/** A stretch of the song with one chord sounding. */
interface Span {
  tick: number;
  end: number;
  degree: LiteracyScaleDegree;
}

/** Spans in order, neighbours with the same chord made one. */
function joinSpans(spans: readonly Span[]): Span[] {
  const joined: Span[] = [];
  for (const span of spans) {
    const last = joined.at(-1);
    if (last && last.degree === span.degree) last.end = span.end;
    else if (span.end > span.tick) joined.push({ ...span });
  }
  return joined;
}

/**
 * A take's chords as they sound over `length` ticks (THE CHANGES above):
 * each until the next change, the first from the downbeat. The 1 chord
 * throughout with none.
 */
function soundingSpans(
  take: Pick<ChordTake, 'chords'> | null,
  length: number,
): Span[] {
  const played = [...(take?.chords ?? [])]
    .filter((chord) => chord.tick < length)
    .sort((a, b) => a.tick - b.tick);
  if (played.length === 0) return [{ tick: 0, end: length, degree: '1' }];
  const spans: Span[] = [];
  for (const chord of played) {
    const last = spans.at(-1);
    if (last && chord.tick <= last.tick) {
      // Two on one tick: the later.
      last.degree = chord.degree;
      continue;
    }
    if (last) last.end = chord.tick;
    spans.push({
      tick: last ? chord.tick : 0,
      end: length,
      degree: chord.degree,
    });
  }
  return joinSpans(spans);
}

/** Each bar's chord: the one sounding longest in it; on a tie, the earlier. */
function longestPerBar(
  spans: readonly Span[],
  bars: number,
): LiteracyScaleDegree[] {
  return Array.from({ length: bars }, (_, bar) => {
    const start = bar * BAR_TICKS;
    const end = start + BAR_TICKS;
    let best: LiteracyScaleDegree = spans[0]?.degree ?? '1';
    let most = 0;
    for (const span of spans) {
      const heard = Math.min(end, span.end) - Math.max(start, span.tick);
      if (heard > most) {
        most = heard;
        best = span.degree;
      }
    }
    return best;
  });
}

/** A span as a change of the song, in its key. */
function changeOf(span: Span, key: LiteracyKey): SongChordChange {
  const symbol = chordSymbol(key, span.degree);
  const chord = diatonicChord(key.mode, span.degree)!;
  const rootPc = (pitchClassOf(key.tonic) + chord.rootSemitones) % 12;
  const tones = chordSymbolTones(symbol) ?? {
    rootPc,
    bassPc: rootPc,
    intervals: [...chord.intervals],
  };
  return {
    ...tones,
    tick: span.tick,
    duration: span.end - span.tick,
    bar: Math.floor(span.tick / BAR_TICKS),
    degree: span.degree,
    label: chord.label,
    symbol,
  };
}

/**
 * The change sounding at `tick`: the last starting at or before it (before
 * the first, the first; null with none). `changes` in time order, as
 * `chordChanges` are; a looping band asks for its tick modulo the song's
 * length.
 */
export function chordAtTick<T extends { tick: number }>(
  changes: readonly T[],
  tick: number,
): T | null {
  if (changes.length === 0) return null;
  let low = 0;
  let high = changes.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (changes[mid].tick <= tick) low = mid;
    else high = mid - 1;
  }
  return changes[low];
}

/**
 * A chord a bar of a chords take's phrase (THE CHART above): the chord
 * sounding longest in each bar, each sounding until the next change.
 */
export function takeBarDegrees(
  take: Pick<ChordTake, 'chords'> | null,
  bars: number,
): LiteracyScaleDegree[] {
  return longestPerBar(soundingSpans(take, bars * BAR_TICKS), bars);
}

/**
 * The changes of a chords take over the song (THE CHANGES above): its
 * phrase's, played `repeats` times, a chord running on over a repeat's
 * line made one change.
 */
export function songChordChanges(
  take: Pick<ChordTake, 'chords'> | null,
  key: LiteracyKey,
  phraseBars: number,
  repeats: number,
): SongChordChange[] {
  const phrase = phraseBars * BAR_TICKS;
  const spans = soundingSpans(take, phrase);
  const song = joinSpans(
    Array.from({ length: repeats }, (_, r) =>
      spans.map((span) => ({
        ...span,
        tick: r * phrase + span.tick,
        end: r * phrase + span.end,
      })),
    ).flat(),
  );
  return song.map((span) => changeOf(span, key));
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
  const chordChanges = songChordChanges(chordTake, key, phraseBars, repeats);
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
    chordChanges,
    phraseChart: chartOf(phraseDegrees),
    chart,
    symbols: chartSymbols(chart),
  };
}
