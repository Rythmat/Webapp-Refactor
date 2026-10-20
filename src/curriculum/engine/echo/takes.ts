/**
 * Make Your Song's takes: what the student recorded on the Melody track or
 * the Chords track, turned into the notes or chords the track keeps.
 *
 * A TAKE
 * Is its phrase: the level's 2, 4 or 8 bars, ticks from its downbeat. It's
 * quantized to 16ths, as Music Literacy's create rounds are (createPass.ts
 * `quantizeTick`): an onset rounds to the nearest 16th, an end too, a note
 * at least a 16th long. A note rounding to before the downbeat or to the
 * phrase's end or later is left out (flagged), and one ringing past the
 * end stops there, so a take is always its phrase, trimmed or padded with
 * silence. A melody note lasts no longer than the next one starts.
 *
 * A CHORDS TAKE
 * Notes struck together are one chord (chordGrading.ts `clusterChords`).
 * A chord is recognized the way the chord grader hears a right one: every
 * note of one of the key's six chords, in any octave and order, extra notes
 * aside; where two could be (C E G A), the one whose root is the lowest
 * note. A strike that isn't one of the six is left out and flagged. The
 * take's chords are voiced together, as a progression (chords.ts
 * `voiceChords`), whatever voicing the student played.
 *
 * THE SCAFFOLDING (Game Settings, all off unless turned on)
 *
 *   Auto-Tune Melody  a note snaps to the nearest note of the key; between
 *                     two, to the one in the key's 1 chord (1, 3 or 5),
 *                     else the lower. In a chords take it tunes the notes
 *                     before the chord is recognized (or, Roots Only, the
 *                     root).
 *   Roots Only Chords one note makes its diatonic chord: the lowest note
 *                     struck is the root. The 7 in major and the 2 in
 *                     minor make none (their chord is diminished), nor
 *                     does a note outside the key: both are flagged.
 *   Auto Fill Bars    chords change on the bar line (the half bar at Level
 *                     3), each lasting until the next; melody notes snap
 *                     to the level's grid (an eighth at Level 1, a 16th
 *                     after).
 *
 * WHERE AUTO FILL PUTS A CHANGE
 * A change (a strike of a chord other than the one sounding) goes to the
 * line it's played after, or to the next line when it's in the last
 * quarter before it: a late change still lands in its bar, an early one on
 * the bar it was meant for. Of two changes on one line, the one played
 * nearer it wins (on a tie, the later). A line no change reaches keeps the
 * chord sounding there, and the lines before the first change take the
 * first chord, so every bar has one.
 *
 * Pure, no React.
 */

import type {
  LiteracyDegree,
  LiteracyScaleDegree,
} from '@/content/musicLiteracy/schemas';
import { clusterChords } from '../musicLiteracy/chordGrading';
import {
  diatonicChord,
  voicedProgression,
  type VoicedChord,
} from '../musicLiteracy/chords';
import { quantizeTick } from '../musicLiteracy/createPass';
import type { PlayedNote } from '../musicLiteracy/grading';
import {
  DEGREE_OF_SEMITONE,
  SCALE_SEMITONES,
  degreeLabel,
  pitchClassOf,
  type LiteracyKey,
} from '../musicLiteracy/pitch';
import { echoChordDegrees } from './calls';
import {
  BAR_TICKS,
  SIXTEENTH_TICKS,
  echoLevel,
  type EchoLevelNumber,
} from './levels';

/** Game Settings' scaffolding for Make Your Song. */
export interface EchoScaffolding {
  autoTune: boolean;
  rootsOnly: boolean;
  autoFill: boolean;
}

/** All off: the default (they can encourage random button pressing). */
export const NO_SCAFFOLDING: EchoScaffolding = {
  autoTune: false,
  rootsOnly: false,
  autoFill: false,
};

export type TakeKind = 'melody' | 'chords';

export interface TakeOptions {
  kind: TakeKind;
  key: LiteracyKey;
  level: EchoLevelNumber;
  /** The phrase's bars; the level's when left out. */
  bars?: number;
  /** What's turned on; off when left out. */
  scaffolding?: Partial<EchoScaffolding>;
  /** The take's downbeat, in `played`'s ticks: 0 when they're from it. */
  start?: number;
}

/** A note of a melody take. */
export interface TakeNote {
  midi: number;
  /** Ticks from the take's downbeat. */
  tick: number;
  duration: number;
  /** Its chromatic degree in the key: 'b3'. */
  degree: LiteracyDegree;
  /** As shown: "♭3". */
  label: string;
  /** A note of the key's scale. */
  inKey: boolean;
  /** What was played, before Auto-Tune. */
  played: number;
}

/** A chord of a chords take. */
export interface TakeChord {
  /** Ticks from the take's downbeat. */
  tick: number;
  duration: number;
  /** Its bar of the take, from 0. */
  bar: number;
  /** Its root as a degree of the mode: '3' in minor is ♭3. */
  degree: LiteracyScaleDegree;
  /** "4 maj". */
  label: string;
  /** Voiced with the take's other chords. */
  chord: VoicedChord;
  /** The notes struck for it (the first strike, under Auto Fill). */
  struck: PlayedNote[];
}

export type TakeFlagReason =
  /** Played before the take's downbeat, or after its end. */
  | 'outsidePhrase'
  /** Struck together, but not one of the key's six chords. */
  | 'unrecognized'
  /** Roots Only: a root with no chord (the diminished one's, or off the key). */
  | 'noChord';

/** Something in a take that was left out. */
export interface TakeFlag {
  reason: TakeFlagReason;
  notes: PlayedNote[];
  /** Where, in ticks from the take's downbeat (unquantized). */
  tick: number;
  /** For the student, short. */
  message: string;
}

interface TakeBase {
  key: LiteracyKey;
  level: EchoLevelNumber;
  bars: number;
  barTicks: number;
  /** The take's length in ticks: its bars. */
  length: number;
  scaffolding: EchoScaffolding;
  flags: TakeFlag[];
  /** Nothing kept: record again. */
  empty: boolean;
}

export interface MelodyTake extends TakeBase {
  kind: 'melody';
  notes: TakeNote[];
}

export interface ChordTake extends TakeBase {
  kind: 'chords';
  chords: TakeChord[];
}

export type EchoTake = MelodyTake | ChordTake;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Semitones above the key's 1, octaves aside. */
const aboveOne = (midi: number, key: LiteracyKey) =>
  mod12(midi - pitchClassOf(key.tonic));

/**
 * A pitch snapped to the key (Auto-Tune): itself when in the scale, else
 * the nearer scale note; between two, the one in the key's 1 chord, else
 * the lower.
 */
export function snapToKey(midi: number, key: LiteracyKey): number {
  const scale = SCALE_SEMITONES[key.mode];
  const above = aboveOne(midi, key);
  if (scale.includes(above)) return midi;
  const below = Math.max(...scale.filter((s) => s < above));
  const over = scale.find((s) => s > above) ?? 12;
  const down = above - below;
  const up = over - above;
  if (down !== up) return down < up ? midi - down : midi + up;
  const home = [scale[0], scale[2], scale[4], 12];
  return home.includes(over) && !home.includes(below) ? midi + up : midi - down;
}

/** A pitch's chromatic degree in the key: 'b3'. */
const chromaticDegree = (midi: number, key: LiteracyKey): LiteracyDegree =>
  DEGREE_OF_SEMITONE[aboveOne(midi, key)];

/** The key's chord whose root a pitch is (Roots Only); null for none. */
export function rootChord(
  midi: number,
  key: LiteracyKey,
): LiteracyScaleDegree | null {
  const index = SCALE_SEMITONES[key.mode].indexOf(aboveOne(midi, key));
  if (index < 0) return null;
  const degree = String(index + 1) as LiteracyScaleDegree;
  return echoChordDegrees(key.mode).includes(degree) ? degree : null;
}

/**
 * The key's chord a strike makes (A CHORDS TAKE above): every note of one
 * of the six, any octave and order; of two, the one rooted on the lowest
 * note. Null for none.
 */
export function recognizeChord(
  midis: readonly number[],
  key: LiteracyKey,
): LiteracyScaleDegree | null {
  if (midis.length === 0) return null;
  const classes = new Set(midis.map((midi) => aboveOne(midi, key)));
  const lowest = aboveOne(Math.min(...midis), key);
  const whole = echoChordDegrees(key.mode).filter((degree) => {
    const chord = diatonicChord(key.mode, degree)!;
    return chord.intervals.every((tone) =>
      classes.has(mod12(chord.rootSemitones + tone)),
    );
  });
  const rooted = whole.find(
    (degree) => diatonicChord(key.mode, degree)!.rootSemitones === lowest,
  );
  return rooted ?? whole[0] ?? null;
}

/** The scaffolding, every switch set. */
const scaffoldingOf = (on?: Partial<EchoScaffolding>): EchoScaffolding => ({
  ...NO_SCAFFOLDING,
  ...on,
});

const outside = (
  notes: PlayedNote[],
  tick: number,
  bars: number,
): TakeFlag => ({
  reason: 'outsidePhrase',
  notes,
  tick,
  message: `Played outside the take’s ${bars} bars, so left out.`,
});

/** A take's notes or chords from what the student played (A TAKE above). */
export function processTake(
  played: readonly PlayedNote[],
  options: TakeOptions & { kind: 'melody' },
): MelodyTake;
export function processTake(
  played: readonly PlayedNote[],
  options: TakeOptions & { kind: 'chords' },
): ChordTake;
export function processTake(
  played: readonly PlayedNote[],
  options: TakeOptions,
): EchoTake;
export function processTake(
  played: readonly PlayedNote[],
  options: TakeOptions,
): EchoTake {
  const level = echoLevel(options.level);
  const bars = options.bars ?? level.phraseBars;
  const scaffolding = scaffoldingOf(options.scaffolding);
  const start = options.start ?? 0;
  // The take's own ticks, from its downbeat.
  const notes = [...played]
    .map((note) => ({ ...note, onset: note.onset - start }))
    .sort((a, b) => a.onset - b.onset);
  const base = {
    key: options.key,
    level: options.level,
    bars,
    barTicks: BAR_TICKS,
    length: bars * BAR_TICKS,
    scaffolding,
  };
  return options.kind === 'melody'
    ? melodyTake(notes, base, level.melodyGrid)
    : chordTake(notes, base, level.chordGrid);
}

type Base = Omit<TakeBase, 'flags' | 'empty'>;

function melodyTake(
  played: readonly PlayedNote[],
  base: Base,
  levelGrid: number,
): MelodyTake {
  const { key, length, scaffolding, bars } = base;
  const grid = scaffolding.autoFill ? levelGrid : SIXTEENTH_TICKS;
  const flags: TakeFlag[] = [];
  const kept: { tick: number; end: number; midi: number; played: number }[] =
    [];
  for (const note of played) {
    const midi = scaffolding.autoTune ? snapToKey(note.midi, key) : note.midi;
    const tick = quantizeTick(note.onset, grid);
    if (tick < 0 || tick >= length) {
      flags.push(outside([note], note.onset, bars));
      continue;
    }
    // The same key struck twice on one step of the grid is one note.
    if (kept.some((k) => k.tick === tick && k.midi === midi)) continue;
    const end =
      note.duration > 0
        ? Math.min(length, quantizeTick(note.onset + note.duration, grid))
        : length;
    kept.push({
      tick,
      end: Math.max(tick + grid, end),
      midi,
      played: note.midi,
    });
  }
  kept.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
  // A note lasts no longer than the next one starts.
  for (const note of kept) {
    const next = kept.find((k) => k.tick > note.tick);
    if (next) note.end = Math.min(note.end, next.tick);
  }
  const scale = SCALE_SEMITONES[key.mode];
  const notes: TakeNote[] = kept.map((note) => {
    const degree = chromaticDegree(note.midi, key);
    return {
      midi: note.midi,
      tick: note.tick,
      duration: note.end - note.tick,
      degree,
      label: degreeLabel(degree),
      inKey: scale.includes(aboveOne(note.midi, key)),
      played: note.played,
    };
  });
  return { ...base, kind: 'melody', notes, flags, empty: notes.length === 0 };
}

/** A strike heard as a chord, before it's placed. */
interface Heard {
  onset: number;
  end: number;
  degree: LiteracyScaleDegree;
  struck: PlayedNote[];
}

/** A chord placed on the take, before it's voiced. */
interface Placed {
  tick: number;
  end: number;
  degree: LiteracyScaleDegree;
  struck: PlayedNote[];
}

function chordTake(
  played: readonly PlayedNote[],
  base: Base,
  levelGrid: number,
): ChordTake {
  const { key, length, scaffolding, bars } = base;
  const flags: TakeFlag[] = [];
  const heard: Heard[] = [];
  for (const strike of clusterChords(played)) {
    const tuned = strike.notes.map((note) =>
      scaffolding.autoTune ? snapToKey(note.midi, key) : note.midi,
    );
    let degree: LiteracyScaleDegree | null;
    if (scaffolding.rootsOnly) {
      const root = Math.min(...tuned);
      degree = rootChord(root, key);
      if (!degree) {
        const label = degreeLabel(chromaticDegree(root, key));
        flags.push({
          reason: 'noChord',
          notes: strike.notes,
          tick: strike.onset,
          message: SCALE_SEMITONES[key.mode].includes(aboveOne(root, key))
            ? `The ${label} makes no chord here: try another note.`
            : `The ${label} isn’t in the key: try another note.`,
        });
        continue;
      }
    } else {
      degree = recognizeChord(tuned, key);
      if (!degree) {
        flags.push({
          reason: 'unrecognized',
          notes: strike.notes,
          tick: strike.onset,
          message: 'That isn’t one of the key’s chords: play all three notes.',
        });
        continue;
      }
    }
    const ends = strike.notes.map((note) =>
      note.duration > 0 ? note.onset + note.duration : Infinity,
    );
    heard.push({
      onset: strike.onset,
      end: Math.max(...ends),
      degree,
      struck: strike.notes,
    });
  }

  const placed = scaffolding.autoFill
    ? fillBars(heard, length, levelGrid, bars, flags)
    : asPlayed(heard, length, bars, flags);
  const voiced = voicedProgression(
    key,
    placed.map((p) => p.degree),
  );
  const chords: TakeChord[] = placed.map((p, i) => ({
    tick: p.tick,
    duration: p.end - p.tick,
    bar: Math.floor(p.tick / BAR_TICKS),
    degree: p.degree,
    label: voiced[i].label,
    chord: voiced[i],
    struck: p.struck,
  }));
  return { ...base, kind: 'chords', chords, flags, empty: chords.length === 0 };
}

/**
 * Chords where they were played: on the 16th grid, each lasting as it was
 * held, no longer than the next one starts or the take ends.
 */
function asPlayed(
  heard: readonly Heard[],
  length: number,
  bars: number,
  flags: TakeFlag[],
): Placed[] {
  const placed: Placed[] = [];
  for (const h of heard) {
    const tick = quantizeTick(h.onset);
    if (tick < 0 || tick >= length) {
      flags.push(outside(h.struck, h.onset, bars));
      continue;
    }
    if (placed.some((p) => p.tick === tick)) continue;
    const end = Number.isFinite(h.end)
      ? Math.min(length, quantizeTick(h.end))
      : length;
    placed.push({
      tick,
      end: Math.max(tick + SIXTEENTH_TICKS, end),
      degree: h.degree,
      struck: h.struck,
    });
  }
  placed.sort((a, b) => a.tick - b.tick);
  placed.forEach((p, i) => {
    const next = placed[i + 1];
    if (next) p.end = Math.min(p.end, next.tick);
  });
  return placed;
}

/** A change goes to the next line from this far before it: a quarter of the grid. */
const EARLY_SHARE = 0.25;

/** Auto Fill Bars (WHERE AUTO FILL PUTS A CHANGE above). */
function fillBars(
  heard: readonly Heard[],
  length: number,
  grid: number,
  bars: number,
  flags: TakeFlag[],
): Placed[] {
  // Changes only: a strike of the chord already sounding changes nothing.
  const changes = heard.filter(
    (h, i) => i === 0 || h.degree !== heard[i - 1].degree,
  );
  const lines = Math.round(length / grid);
  const atLine: (Heard | null)[] = Array(lines).fill(null);
  const kept: Heard[] = [];
  for (const change of changes) {
    const line = Math.floor(change.onset / grid + EARLY_SHARE);
    if (line < 0 || line >= lines) {
      flags.push(outside(change.struck, change.onset, bars));
      continue;
    }
    kept.push(change);
    const held = atLine[line];
    const nearer =
      !held ||
      Math.abs(change.onset - line * grid) <=
        Math.abs(held.onset - line * grid);
    if (nearer) atLine[line] = change;
  }
  const first = atLine.find((h) => h !== null);
  if (!first) return [];
  // Each line's chord: its own change, else the chord sounding there, else
  // (before any) the first.
  const chordAt = atLine.map(
    (own, line) =>
      own ?? kept.filter((c) => c.onset <= line * grid).at(-1) ?? first,
  );
  const placed: Placed[] = [];
  chordAt.forEach((h, line) => {
    const last = placed.at(-1);
    if (last && last.degree === h.degree) last.end = (line + 1) * grid;
    else {
      placed.push({
        tick: line * grid,
        end: (line + 1) * grid,
        degree: h.degree,
        struck: h.struck,
      });
    }
  });
  return placed;
}
