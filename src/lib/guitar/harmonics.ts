// ── Natural harmonics on a guitar string ───────────────────────────────────
// Where a string can be touched to sound one of its partials, and what it
// sounds there. A position on the string is `x`, the fraction of the scale
// length from the nut (0) to the bridge (1). Touching the string lightly at
// x = k/n stops every mode of vibration but those with a node there, so it
// rings at partial n (when k/n is in lowest terms; 2/4 is partial 2's node).
// Pressing it to a fret instead shortens the string: the note is f0/(1−x).
// Pitches are sounding pitch, as in fretboard.ts.

import {
  centsFromET,
  partialHz,
  partialInterval,
  partialSemitones,
} from '@/lib/music/harmonicSeries';

/** The frets this activity draws: a 24-fret neck, as the reference shows. */
export const HARMONIC_NECK_FRETS = 24;

/** The partials the activity teaches (2 = the 12th-fret octave). */
export const HARMONIC_PARTIALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** The ones that ring clearly on a real guitar: 12th, 7th, 5th, ~4th, ~3rd fret. */
export const PLAYABLE_PARTIALS = [2, 3, 4, 5, 6] as const;

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** The fret (fractional) at position x: 12 at x = ½, 24 at x = ¾. */
export function fretAt(x: number): number {
  return -12 * Math.log2(1 - x);
}

/** The position of a fret (fractional frets allowed): 1 − 2^(−f/12). */
export function positionOfFret(fret: number): number {
  return 1 - 2 ** (-fret / 12);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface HarmonicNode {
  partial: number;
  /** The node is at k/n of the string. */
  k: number;
  x: number;
  fret: number;
  /** Over the neck (fret ≤ 24); else over the body, toward the bridge. */
  onNeck: boolean;
}

/** Every place partial n rings: x = k/n for k in lowest terms. */
export function harmonicNodes(partial: number): HarmonicNode[] {
  const nodes: HarmonicNode[] = [];
  for (let k = 1; k < partial; k++) {
    if (gcd(k, partial) !== 1) continue;
    const x = k / partial;
    const fret = fretAt(x);
    nodes.push({
      partial,
      k,
      x,
      fret,
      onNeck: fret <= HARMONIC_NECK_FRETS + 1e-9,
    });
  }
  return nodes;
}

export interface PitchInfo {
  hz: number;
  /** The exact pitch as a MIDI number (fractional). */
  midi: number;
  /** The nearest equal-tempered note. */
  nearestMidi: number;
  /** From that note to the true pitch: + sharp, − flat. */
  cents: number;
}

export interface PartialInfo extends PitchInfo {
  partial: number;
  /** "Octave + perfect 5th" above the open string. */
  interval: string;
}

/** What partial n of an open string sounds. */
export function partialInfo(openMidi: number, partial: number): PartialInfo {
  const f0 = midiToHz(openMidi);
  return {
    partial,
    hz: partialHz(f0, partial),
    midi: openMidi + 12 * Math.log2(partial),
    nearestMidi: openMidi + partialSemitones(partial),
    cents: centsFromET(partial),
    interval: partialInterval(partial).long,
  };
}

/** The pitch of a string pressed at x (a fretless stop): f0 / (1 − x). */
export function stoppedHz(f0: number, x: number): number {
  return f0 / (1 - x);
}

/** The pitch, nearest note and cents of any frequency. */
export function pitchOf(hz: number): PitchInfo {
  const midi = hzToMidi(hz);
  const nearestMidi = Math.round(midi);
  return { hz, midi, nearestMidi, cents: (midi - nearestMidi) * 100 };
}

// ── String-length ratios ───────────────────────────────────────────────────

export interface RatioStop {
  /** The vibrating part of the string, as a fraction: [2, 3] = 2/3. */
  fraction: readonly [number, number];
  /** The pressed note's interval over the open string. */
  name: string;
}

/** The simple ratios, from the open string up (vibrating length). */
export const RATIO_STOPS: readonly RatioStop[] = [
  { fraction: [1, 1], name: 'Unison' },
  { fraction: [8, 9], name: 'Major 2nd' },
  { fraction: [5, 6], name: 'Minor 3rd' },
  { fraction: [4, 5], name: 'Major 3rd' },
  { fraction: [3, 4], name: 'Perfect 4th' },
  { fraction: [2, 3], name: 'Perfect 5th' },
  { fraction: [5, 8], name: 'Minor 6th' },
  { fraction: [3, 5], name: 'Major 6th' },
  { fraction: [1, 2], name: 'Octave' },
];

/** Where the finger stops the string for a ratio stop: x = 1 − a/b. */
export function ratioStopPosition(stop: RatioStop): number {
  return 1 - stop.fraction[0] / stop.fraction[1];
}

/** The ratio stop within `tolerance` of x (in string length), if any. */
export function nearestRatioStop(
  x: number,
  tolerance = 0.006,
): RatioStop | null {
  let best: RatioStop | null = null;
  let bestDistance = tolerance;
  for (const stop of RATIO_STOPS) {
    const d = Math.abs(ratioStopPosition(stop) - x);
    if (d <= bestDistance) {
      best = stop;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * The lowest partial with a node at x (within `tolerance`), and its k: at
 * x = 1/3 the string can ring partial 3. Null between nodes (up to 12).
 */
export function harmonicAt(
  x: number,
  tolerance = 0.004,
  maxPartial = 12,
): { partial: number; k: number } | null {
  for (let n = 2; n <= maxPartial; n++) {
    const k = Math.round(x * n);
    if (k <= 0 || k >= n) continue;
    if (Math.abs(x - k / n) <= tolerance) {
      const g = gcd(k, n);
      return { partial: n / g, k: k / g };
    }
  }
  return null;
}

// ── Words ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Where to touch, in the player's words. Natural harmonics are played over
 * the fret wire, not between frets: "Over the 12th fret", "Just behind the
 * 4th fret (≈ 3.9)", "Over the body (≈ fret 27.9)".
 */
export function describeNodeFret(fret: number): string {
  if (fret > HARMONIC_NECK_FRETS + 1e-9) {
    return `Over the body (≈ fret ${fret.toFixed(1)})`;
  }
  const wire = Math.round(fret);
  if (Math.abs(fret - wire) < 0.1) return `Over the ${ordinal(wire)} fret`;
  const side = fret < wire ? 'Just behind' : 'Just past';
  return `${side} the ${ordinal(wire)} fret (≈ ${fret.toFixed(1)})`;
}

/** "+1.955" / "−13.686" with a real minus, to `digits` places. */
export function formatCents(cents: number, digits = 1): string {
  const value = Math.abs(cents).toFixed(digits);
  if (Number(value) === 0) return `±${value}`;
  return `${cents < 0 ? '−' : '+'}${value}`;
}
