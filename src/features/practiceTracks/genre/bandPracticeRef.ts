/**
 * bandPracticeRef.ts — What a Studio link says about a Band playing a
 * student's chart (Music Literacy's Hear It with Your Band), as the link
 * carries it: the band, its variation, and the chart's key, harmony and
 * chords, all as written in the URL.
 *
 *   ?practiceGenre=latin&practiceLevel=1&practiceSection=A
 *   &practiceBand=latin-band-1&practiceVariation=l1-cumbia
 *   &practiceKey=D&practiceKeyMode=minor&practiceHarmony=triads
 *   &practiceChords=1-4-5-6
 *
 * Plain strings, checked only for being there: bandPracticeTrack.ts reads
 * the chart (chart.ts parseChart) when it builds, and plays the starter for
 * one it can't read. Kept apart and import-free so the Studio's boot reads a
 * link without loading Music Literacy's code (the 1.12a boot budget); the
 * hand-off box matches on it, so a box left for another chart is never
 * played.
 */

export interface BandPracticeRef {
  band: string;
  variation: string;
  /** The chart's 1, as Part 2 spells it: 'D', 'Bb', 'F#'. */
  tonic: string;
  /** 'major' | 'minor'. */
  mode: string;
  /** 'triads' | 'sevenths'. */
  harmony: string;
  /** Scale degrees, one a bar, joined by '-': '1-4-5-6'. */
  chords: string;
}

/** The link's own keys for a ref, beside practiceGenre / Level / Section. */
export const BAND_REF_KEYS = {
  band: 'practiceBand',
  variation: 'practiceVariation',
  tonic: 'practiceKey',
  mode: 'practiceKeyMode',
  harmony: 'practiceHarmony',
  chords: 'practiceChords',
} as const satisfies Record<keyof BandPracticeRef, string>;

/** Two refs ask for the same track. */
export const sameBandRef = (
  a: BandPracticeRef | null | undefined,
  b: BandPracticeRef | null | undefined,
): boolean =>
  !a || !b
    ? !a && !b
    : (Object.keys(BAND_REF_KEYS) as (keyof BandPracticeRef)[]).every(
        (key) => a[key] === b[key],
      );

/**
 * The ref a link carries: a band and a variation make one, the chart's parts
 * read as given (triads when the harmony is left out). Null without a band.
 */
export function bandRefFromParams(
  get: (key: string) => string | null,
): BandPracticeRef | null {
  const band = get(BAND_REF_KEYS.band)?.trim();
  const variation = get(BAND_REF_KEYS.variation)?.trim();
  if (!band || !variation) return null;
  const text = (key: keyof BandPracticeRef) =>
    get(BAND_REF_KEYS[key])?.trim() ?? '';
  return {
    band,
    variation,
    tonic: text('tonic'),
    mode: text('mode'),
    harmony: text('harmony') || 'triads',
    chords: text('chords'),
  };
}

/** A ref's keys and values, in link order. */
export const bandRefParams = (ref: BandPracticeRef): [string, string][] =>
  (Object.keys(BAND_REF_KEYS) as (keyof BandPracticeRef)[]).map((key) => [
    BAND_REF_KEYS[key],
    ref[key],
  ]);
