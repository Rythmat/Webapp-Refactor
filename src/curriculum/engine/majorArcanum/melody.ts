/**
 * Major Arcanum's melodies: phrases a musician would play, not notes at
 * random.
 *
 * A PHRASE
 * Four bars (two in Novice) over a chord a bar:
 *
 *   1  the motif     a rhythm and a contour, its first note on the chord
 *   2  its echo      the same rhythm; the contour again, or moved a step or
 *                    two to fit the new chord (a sequence)
 *   3  a contrast    a second rhythm and contour, moving the other way
 *   4  the cadence   longer notes stepping into the phrase's goal: open, on
 *                    the 2, 5 or 7 over V; home, on the 1 (or the 3) over I
 *
 * Novice's two-bar phrase is the motif and its cadence. A run alternates
 * open phrases and home ones, questions and answers, and keeps two motifs
 * (A and B) across it, A coming back the way a song's hook does, so the
 * player hears what's coming and plays it.
 *
 * THE MATERIAL
 * Rhythms are the owner's melody rhythms (Echo's library, one bar, three to
 * five notes, by tier); contours are his Melody Contour Library's (Echo's),
 * the common ones most often; and his Transposing Practices lines
 * (data/majorArcanum/transposingPractices.json) come in whole: a one-bar
 * line as a motif, a two-bar line as a phrase's last two bars when it ends
 * where the phrase should. All of it is in scale positions, so every key
 * plays the same music.
 *
 * Pure, no React.
 */

import SEED_FILE from '@/curriculum/data/majorArcanum/transposingPractices.json';
import { CONTOUR_LIBRARY, contourMotion } from '../echo/contours';
import { BEAT_TICKS } from '../echo/levels';
import { pickOne, pickWeighted, type EchoRandom } from '../echo/random';
import { MELODY_RHYTHMS } from '../echo/rhythm';
import {
  degreeOf,
  isChordTone,
  type ArcanumChord,
  type PhraseEnding,
} from './harmony';
import type { ArcanumLevel, ArcanumMode, ModeConfig } from './levels';

/** A note of a melody: where it starts and how long, in beats, and its pitch. */
export interface MelodyNote {
  beat: number;
  duration: number;
  /** Scale position: 0 the 1. */
  position: number;
}

/** A bar's rhythm: each note's start and length, in beats. */
type BarRhythm = readonly { at: number; dur: number }[];

/** A motif: a bar's rhythm, and the contour its notes follow. */
export interface Motif {
  rhythm: BarRhythm;
  /** Scale steps from its first note. */
  contour: readonly number[];
  /** Where it came from, for the tests: 'echo' or a seed line's id. */
  source: string;
}

/** How far a mode's melodies leap between neighbors, in scale steps. */
const MAX_LEAP: Readonly<Record<ArcanumMode, number>> = {
  novice: 2,
  pro: 4,
  expert: 5,
  maestro: 7,
};

/** How often a phrase takes one of the owner's practice lines when one fits. */
export const SEED_SHARE = 0.35;

// ── The owner's practice lines ───────────────────────────────────────────────

const C_MAJOR_PC = [0, 2, 4, 5, 7, 9, 11];

/** A C major MIDI note's scale position: C4 is 0. */
function seedPosition(midi: number): number {
  const at = C_MAJOR_PC.indexOf(((midi % 12) + 12) % 12);
  return at + 7 * (Math.floor(midi / 12) - 5);
}

interface SeedLine {
  id: string;
  bars: 1 | 2;
  notes: MelodyNote[];
}

const SEED_PPQ = SEED_FILE.ppq;

/** The practice lines, as notes in beats and scale positions. */
export const SEED_LINES: readonly SeedLine[] = SEED_FILE.melodies.map((m) => {
  let at = 0;
  const notes: MelodyNote[] = [];
  for (const n of m.notes as { midi?: number; dur: number; rest?: boolean }[]) {
    const dur = n.dur / SEED_PPQ;
    if (!n.rest && n.midi !== undefined)
      notes.push({ beat: at, duration: dur, position: seedPosition(n.midi) });
    at += dur;
  }
  return { id: m.id, bars: m.bars as 1 | 2, notes };
});

// ── Choosing material ────────────────────────────────────────────────────────

const TAG_WEIGHT = { common: 6, uncommon: 2, rare: 1 } as const;

/** The rhythms a level's melodies draw on. */
export function rhythmPool(
  config: ModeConfig,
  mode: ArcanumMode,
  level: ArcanumLevel,
): BarRhythm[] {
  const rhythms = MELODY_RHYTHMS.filter((r) =>
    config.rhythmTiers.includes(r.tier),
  )
    // Novice's first levels: notes on the beats only.
    .filter(
      (r) =>
        mode !== 'novice' ||
        level > 2 ||
        r.hits.every((h) => h.onset % BEAT_TICKS === 0),
    );
  return rhythms.map((r) =>
    r.hits.map((h) => ({
      at: h.onset / BEAT_TICKS,
      dur: h.duration / BEAT_TICKS,
    })),
  );
}

/** A contour of `notes` notes that the mode can play. */
function chooseContour(
  notes: number,
  config: ModeConfig,
  mode: ArcanumMode,
  rng: EchoRandom,
  avoidMotion?: string,
): readonly number[] {
  const span = config.melodyRange.high - config.melodyRange.low;
  const fits = CONTOUR_LIBRARY.filter(
    (c) =>
      c.noteCount === notes &&
      config.contourTiers.includes(c.tier) &&
      Math.max(...c.contour) - Math.min(...c.contour) <= span &&
      c.contour
        .slice(1)
        .every((v, i) => Math.abs(v - c.contour[i]) <= MAX_LEAP[mode]),
  );
  const varied = avoidMotion
    ? fits.filter((c) => contourMotion(c.contour) !== avoidMotion)
    : fits;
  const from = varied.length ? varied : fits;
  if (!from.length) return Array.from({ length: notes }, (_, i) => i % 2);
  const pick = pickWeighted(rng, from, (c) => TAG_WEIGHT[c.tag]);
  return pick.contour.map((v) => v - pick.contour[0]);
}

/** A motif: one of the level's rhythms, or a practice line, and a contour. */
export function chooseMotif(
  config: ModeConfig,
  mode: ArcanumMode,
  level: ArcanumLevel,
  rng: EchoRandom,
  avoid?: Motif,
): Motif {
  const span = config.melodyRange.high - config.melodyRange.low;
  const seeds = SEED_LINES.filter((s) => {
    if (s.bars !== 1) return false;
    const ps = s.notes.map((n) => n.position);
    return (
      Math.max(...ps) - Math.min(...ps) <= span &&
      ps.slice(1).every((p, i) => Math.abs(p - ps[i]) <= MAX_LEAP[mode]) &&
      s.id !== avoid?.source
    );
  });
  if (seeds.length && rng() < SEED_SHARE) {
    const seed = pickOne(rng, seeds);
    return {
      rhythm: seed.notes.map((n) => ({ at: n.beat, dur: n.duration })),
      contour: seed.notes.map((n) => n.position - seed.notes[0].position),
      source: seed.id,
    };
  }
  const pool = rhythmPool(config, mode, level);
  const others = pool.filter((r) => r !== avoid?.rhythm);
  const rhythm = pickOne(rng, others.length ? others : pool);
  const contour = chooseContour(
    rhythm.length,
    config,
    mode,
    rng,
    avoid ? contourMotion(avoid.contour) : undefined,
  );
  return { rhythm, contour, source: 'echo' };
}

// ── Placing a bar ────────────────────────────────────────────────────────────

/**
 * Where a contour starts: its first note on one of the chord's tones, the
 * whole of it inside the range, as near the last note as it can be.
 */
function placeContour(
  contour: readonly number[],
  chord: ArcanumChord,
  previous: number | null,
  range: { low: number; high: number },
  rng: EchoRandom,
): number {
  const low = range.low - Math.min(...contour);
  const high = range.high - Math.max(...contour);
  const starts: { start: number; score: number }[] = [];
  for (let start = low; start <= high; start++) {
    const middle = (range.low + range.high) / 2;
    const score =
      (isChordTone(start, chord) ? 0 : 4) +
      (previous === null
        ? Math.abs(start - middle) * 0.5
        : Math.abs(start - previous));
    starts.push({ start, score });
  }
  if (!starts.length) return range.low;
  const best = Math.min(...starts.map((s) => s.score));
  return pickOne(
    rng,
    starts.filter((s) => s.score <= best + 0.5),
  ).start;
}

const barNotes = (
  rhythm: BarRhythm,
  positions: readonly number[],
  barBeat: number,
): MelodyNote[] =>
  rhythm.map((r, i) => ({
    beat: barBeat + r.at,
    duration: r.dur,
    position: positions[i],
  }));

/** The cadence's rhythms: fewer notes, the last one long. */
const CADENCES: readonly { rhythm: BarRhythm; tier: 1 | 2 }[] = [
  { rhythm: [{ at: 0, dur: 4 }], tier: 1 },
  {
    rhythm: [
      { at: 0, dur: 2 },
      { at: 2, dur: 2 },
    ],
    tier: 1,
  },
  {
    rhythm: [
      { at: 0, dur: 1 },
      { at: 1, dur: 1 },
      { at: 2, dur: 2 },
    ],
    tier: 1,
  },
  {
    rhythm: [
      { at: 0, dur: 0.5 },
      { at: 0.5, dur: 0.5 },
      { at: 1, dur: 1 },
      { at: 2, dur: 2 },
    ],
    tier: 1,
  },
  {
    rhythm: [
      { at: 0, dur: 1.5 },
      { at: 1.5, dur: 0.5 },
      { at: 2, dur: 2 },
    ],
    tier: 2,
  },
  {
    rhythm: [
      { at: 0, dur: 1 },
      { at: 1, dur: 3 },
    ],
    tier: 2,
  },
];

/** The phrase's goal: open, the 2, 5 or 7; home, the 1, or now and then the 3. */
function cadenceTarget(
  ending: PhraseEnding,
  chord: ArcanumChord,
  previous: number,
  range: { low: number; high: number },
  rng: EchoRandom,
): number {
  const goals = ending === 'home' ? (rng() < 0.8 ? [0] : [0, 2]) : [1, 4, 6];
  const candidates: number[] = [];
  for (let p = range.low; p <= range.high; p++)
    if (goals.includes(degreeOf(p)) && isChordTone(p, chord))
      candidates.push(p);
  if (!candidates.length)
    return Math.max(range.low, Math.min(range.high, previous));
  const best = Math.min(...candidates.map((p) => Math.abs(p - previous)));
  return pickOne(
    rng,
    candidates.filter((p) => Math.abs(p - previous) === best),
  );
}

/** The cadence bar: steps into the goal, from the side the melody is on. */
function cadenceBar(
  config: ModeConfig,
  ending: PhraseEnding,
  chord: ArcanumChord,
  previous: number,
  barBeat: number,
  rng: EchoRandom,
): MelodyNote[] {
  const allowTier2 = config.rhythmTiers.includes(2);
  const { rhythm } = pickOne(
    rng,
    CADENCES.filter((c) => c.tier === 1 || allowTier2),
  );
  const range = config.melodyRange;
  const target = cadenceTarget(ending, chord, previous, range, rng);
  const before = rhythm.length - 1;
  let side = previous >= target ? 1 : -1;
  if (target + side * before > range.high || target + side * before < range.low)
    side = -side;
  const positions = rhythm.map((_, i) => {
    const p = target + side * (before - i);
    return Math.max(range.low, Math.min(range.high, p));
  });
  return barNotes(rhythm, positions, barBeat);
}

/** A two-bar practice line that ends the way this phrase must, in range. */
function closingLine(
  config: ModeConfig,
  mode: ArcanumMode,
  ending: PhraseEnding,
  chords: readonly ArcanumChord[],
  previous: number,
  rng: EchoRandom,
): MelodyNote[] | null {
  const range = config.melodyRange;
  const goals = ending === 'home' ? [0, 2] : [1, 4, 6];
  const fits: { notes: MelodyNote[]; distance: number }[] = [];
  for (const line of SEED_LINES) {
    if (line.bars !== 2) continue;
    const ps = line.notes.map((n) => n.position);
    if (!ps.slice(1).every((p, i) => Math.abs(p - ps[i]) <= MAX_LEAP[mode]))
      continue;
    const last = line.notes[line.notes.length - 1];
    if (!goals.includes(degreeOf(last.position))) continue;
    if (!isChordTone(last.position, chords[1])) continue;
    for (let octave = -2; octave <= 2; octave++) {
      const shifted = ps.map((p) => p + 7 * octave);
      if (Math.min(...shifted) < range.low || Math.max(...shifted) > range.high)
        continue;
      fits.push({
        notes: line.notes.map((n, i) => ({ ...n, position: shifted[i] })),
        distance: Math.abs(shifted[0] - previous),
      });
    }
  }
  const smooth = fits.filter((f) => f.distance <= MAX_LEAP[mode] + 1);
  if (!smooth.length || rng() >= SEED_SHARE) return null;
  return pickOne(rng, smooth).notes;
}

// ── A phrase ─────────────────────────────────────────────────────────────────

export interface PhraseInput {
  config: ModeConfig;
  mode: ArcanumMode;
  /** The phrase's chords, one a bar. */
  chords: readonly ArcanumChord[];
  ending: PhraseEnding;
  /** The motif that opens it (A or B), and the run's other one, for the contrast. */
  motif: Motif;
  contrast: Motif;
  /** The last note before it, if any: the phrase starts near it. */
  previous: number | null;
  rng: EchoRandom;
}

/** A phrase's notes, beats from its first downbeat. */
export function melodyPhrase(input: PhraseInput): MelodyNote[] {
  const { config, mode, chords, ending, motif, contrast, rng } = input;
  const range = config.melodyRange;
  const bars = chords.length;
  const notes: MelodyNote[] = [];
  const last = () =>
    notes.length ? notes[notes.length - 1].position : input.previous;

  // Bar 1: the motif, its first note on the chord.
  const start = placeContour(motif.contour, chords[0], last(), range, rng);
  const motifPositions = motif.contour.map((c) => start + c);
  notes.push(...barNotes(motif.rhythm, motifPositions, 0));

  if (bars === 2) {
    notes.push(...cadenceBar(config, ending, chords[1], last()!, 4, rng));
    return notes;
  }

  // Bar 2: its echo, as it was if it still fits, else moved to the new chord.
  const shifts = [0, -1, 1, -2, 2].filter((d) => {
    const moved = motifPositions.map((p) => p + d);
    return (
      Math.min(...moved) >= range.low &&
      Math.max(...moved) <= range.high &&
      isChordTone(moved[0], chords[1])
    );
  });
  const echoPositions = shifts.length
    ? motifPositions.map((p) => p + shifts[0])
    : motif.contour.map(
        (c) => placeContour(motif.contour, chords[1], last(), range, rng) + c,
      );
  notes.push(...barNotes(motif.rhythm, echoPositions, 4));

  // Bars 3 and 4: one of the owner's lines that ends right, or a contrast
  // and a cadence.
  const closing = closingLine(
    config,
    mode,
    ending,
    chords.slice(2),
    last()!,
    rng,
  );
  if (closing) {
    notes.push(...closing.map((n) => ({ ...n, beat: n.beat + 8 })));
    return notes;
  }
  const cStart = placeContour(contrast.contour, chords[2], last(), range, rng);
  notes.push(
    ...barNotes(
      contrast.rhythm,
      contrast.contour.map((c) => cStart + c),
      8,
    ),
  );
  notes.push(...cadenceBar(config, ending, chords[3], last()!, 12, rng));
  return notes;
}
