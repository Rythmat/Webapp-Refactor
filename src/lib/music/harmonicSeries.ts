// ── The harmonic series ────────────────────────────────────────────────────
// A string (or any pitched tone) sounds its fundamental and the whole-number
// multiples of it: partial n is n × f0. Equal temperament only approximates
// those ratios, so most partials sit a few cents off the nearest key. Shared
// by the Arcade's Harmonic Strings and the guitar Harmonics activity.

/** The frequency of partial `n` of a tone at `f0` Hz. */
export function partialHz(f0: number, n: number): number {
  return f0 * n;
}

/** How far above the fundamental partial `n` sounds, in cents (1200/octave). */
export function partialCents(n: number): number {
  return 1200 * Math.log2(n);
}

/** Partial `n`'s nearest equal-tempered step above the fundamental, in semitones. */
export function partialSemitones(n: number): number {
  return Math.round(partialCents(n) / 100);
}

/**
 * Cents from that equal-tempered step to the true partial: + sharp, − flat.
 * Partial 3: +1.955; 5: −13.686; 7: −31.174; 11: −48.682.
 */
export function centsFromET(n: number): number {
  return partialCents(n) - partialSemitones(n) * 100;
}

/** The interval names of the first 16 partials over the fundamental. */
export interface PartialInterval {
  /** The Arcade's short label: "P5 (+oct)". */
  short: string;
  /** Spelled out: "Octave + perfect 5th". */
  long: string;
}

export const PARTIAL_INTERVALS: readonly PartialInterval[] = [
  { short: 'Unison', long: 'Fundamental' },
  { short: 'Octave', long: 'Octave' },
  { short: 'P5 (+oct)', long: 'Octave + perfect 5th' },
  { short: 'Octave 2', long: '2 octaves' },
  { short: 'M3 (+2oct)', long: '2 octaves + major 3rd' },
  { short: 'P5 (+2oct)', long: '2 octaves + perfect 5th' },
  { short: 'm7 (+2oct)', long: '2 octaves + minor 7th' },
  { short: 'Octave 3', long: '3 octaves' },
  { short: 'M2 (+3oct)', long: '3 octaves + major 2nd' },
  { short: 'M3 (+3oct)', long: '3 octaves + major 3rd' },
  { short: 'Tritone (+3oct)', long: '3 octaves + tritone' },
  { short: 'P5 (+3oct)', long: '3 octaves + perfect 5th' },
  { short: 'm6 (+3oct)', long: '3 octaves + minor 6th' },
  { short: 'm7 (+3oct)', long: '3 octaves + minor 7th' },
  { short: 'M7 (+3oct)', long: '3 octaves + major 7th' },
  { short: 'Octave 4', long: '4 octaves' },
];

/** Partial `n`'s interval names (n = 1…16). */
export function partialInterval(n: number): PartialInterval {
  const entry = PARTIAL_INTERVALS[n - 1];
  if (!entry) throw new RangeError(`No interval name for partial ${n}`);
  return entry;
}
