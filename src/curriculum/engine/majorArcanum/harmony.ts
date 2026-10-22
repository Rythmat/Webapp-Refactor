/**
 * Major Arcanum's harmony: the progressions a run plays, a chord's tones,
 * and how a chord is voiced.
 *
 * Everything is in scale positions of the major key: 0 the 1, 4 the 5, 7 the
 * 1 an octave up, −1 the 7 below. A chord is a degree (0 the I) stacked in
 * thirds: a triad, or with its 7th.
 *
 * A phrase's progression ends open (on V, a question) or home (on I, the
 * answer), and a run pairs them, so the music breathes in questions and
 * answers the way songs do.
 *
 * Pure, no React.
 */

import { pickOne, type EchoRandom } from '../echo/random';

/** Semitones of the major scale. */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

/** Semitones above the 1 of a scale position, below and past the octave too. */
export function positionSemitones(position: number): number {
  const at = ((position % 7) + 7) % 7;
  return MAJOR_STEPS[at] + 12 * Math.floor(position / 7);
}

/** A scale position's degree, 0 (the 1) to 6 (the 7). */
export const degreeOf = (position: number): number => ((position % 7) + 7) % 7;

/** A chord of the key. */
export interface ArcanumChord {
  /** 0 the I, 4 the V. */
  degree: number;
  seventh: boolean;
}

/** A chord's tones as scale positions, stacked in thirds from its root. */
export const chordTones = ({ degree, seventh }: ArcanumChord): number[] =>
  (seventh ? [0, 2, 4, 6] : [0, 2, 4]).map((step) => degree + step);

/** Whether a scale position is one of a chord's tones, in any octave. */
export const isChordTone = (position: number, chord: ArcanumChord): boolean =>
  chordTones(chord).some((tone) => degreeOf(tone) === degreeOf(position));

export type PhraseEnding = 'open' | 'home';

/** Four-bar progressions, a chord a bar, by how they end. */
const FOUR_BAR: Readonly<Record<PhraseEnding, readonly (readonly number[])[]>> =
  {
    open: [
      [0, 5, 3, 4], // I vi IV V
      [0, 3, 5, 4], // I IV vi V
      [5, 3, 0, 4], // vi IV I V
      [0, 5, 1, 4], // I vi ii V
      [0, 2, 3, 4], // I iii IV V
      [0, 3, 0, 4], // I IV I V
      [0, 1, 3, 4], // I ii IV V
    ],
    home: [
      [0, 3, 4, 0], // I IV V I
      [1, 4, 0, 0], // ii V I I
      [3, 4, 0, 0], // IV V I I
      [5, 1, 4, 0], // vi ii V I
      [0, 5, 4, 0], // I vi V I
      [3, 0, 4, 0], // IV I V I
      [2, 5, 4, 0], // iii vi V I
    ],
  };

/** Two-bar progressions, for Novice's short phrases. */
const TWO_BAR: Readonly<Record<PhraseEnding, readonly (readonly number[])[]>> =
  {
    open: [
      [0, 4], // I V
      [3, 4], // IV V
      [5, 4], // vi V
      [1, 4], // ii V
    ],
    home: [
      [4, 0], // V I
      [3, 0], // IV I
    ],
  };

/** A phrase's chord degrees, a chord a bar, not the one just played. */
export function pickProgression(
  bars: 2 | 4,
  ending: PhraseEnding,
  rng: EchoRandom,
  previous?: readonly number[],
): number[] {
  const from = (bars === 2 ? TWO_BAR : FOUR_BAR)[ending];
  const fresh = from.filter((p) => p.join() !== previous?.join());
  return [...pickOne(rng, fresh.length ? fresh : from)];
}

/** The quality a chord on each degree has in a major key. */
const TRIAD_SUFFIX = ['', 'm', 'm', '', '', 'm', '°'] as const;
const SEVENTH_SUFFIX = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'ø7'] as const;

/** A chord's symbol in its key: C, Am, G7, Bø7 (root spelled by `name`). */
export function chordSymbol(
  chord: ArcanumChord,
  rootName: (position: number) => string,
): string {
  const d = degreeOf(chord.degree);
  return (
    rootName(chord.degree) +
    (chord.seventh ? SEVENTH_SUFFIX[d] : TRIAD_SUFFIX[d])
  );
}

/** How a mode voices its chords. */
export interface VoicingRules {
  /** The positions a voicing may use. */
  window: { low: number; high: number };
  /** Any inversion; otherwise root position, the root at the bottom. */
  inversions: boolean;
}

/** Every way to stack a chord's tones inside the window. */
function voicings(chord: ArcanumChord, rules: VoicingRules): number[][] {
  const tones = chordTones(chord);
  const shapes: number[][] = [];
  const inversions = rules.inversions ? tones.length : 1;
  for (let inv = 0; inv < inversions; inv++) {
    // Inversion `inv`: the lowest `inv` tones go up an octave.
    const shape = [
      ...tones.slice(inv),
      ...tones.slice(0, inv).map((t) => t + 7),
    ];
    for (let octave = -3; octave <= 3; octave++) {
      const placed = shape.map((p) => p + 7 * octave);
      if (
        placed[0] >= rules.window.low &&
        placed[placed.length - 1] <= rules.window.high
      )
        shapes.push(placed);
    }
  }
  return shapes;
}

/** How far a voicing's notes travel from the last one's. */
function motion(from: readonly number[], to: readonly number[]): number {
  const near = (p: number, among: readonly number[]) =>
    Math.min(
      ...among.map((q) =>
        Math.abs(positionSemitones(p) - positionSemitones(q)),
      ),
    );
  const top =
    Math.abs(
      positionSemitones(to[to.length - 1]) -
        positionSemitones(from[from.length - 1]),
    ) * 0.5;
  return to.reduce((sum, p) => sum + near(p, from), 0) + top;
}

/**
 * A chord's voicing, as scale positions, low to high. In root position the
 * root is at the bottom, an octave chosen to stay near the last chord; with
 * inversions, the inversion whose notes move least from the last chord's
 * (voice leading), a near tie settled at random. The first chord of a run
 * sits mid-window.
 */
export function voiceChord(
  chord: ArcanumChord,
  previous: readonly number[] | null,
  rules: VoicingRules,
  rng: EchoRandom,
): number[] {
  const all = voicings(chord, rules);
  if (!all.length) return chordTones(chord);
  const middle = (rules.window.low + rules.window.high) / 2;
  const scored = all.map((v) => ({
    v,
    score: previous
      ? motion(previous, v)
      : Math.abs((v[0] + v[v.length - 1]) / 2 - middle) +
        (degreeOf(v[0]) === degreeOf(chord.degree) ? 0 : 0.5),
  }));
  const best = Math.min(...scored.map((s) => s.score));
  const near = scored.filter(
    (s) => s.score <= best + (rules.inversions ? 1 : 0),
  );
  return pickOne(rng, near).v;
}
