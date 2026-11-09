// ── The range of hearing, in names ─────────────────────────────────────────
// Band names and edges vary from book to book; these are common ones.

export const HEARING_LOW = 20;
export const HEARING_HIGH = 20_000;

export interface Band {
  name: string;
  low: number;
  high: number;
}

export const BANDS: readonly Band[] = [
  { name: 'Sub-bass', low: 20, high: 60 },
  { name: 'Bass', low: 60, high: 250 },
  { name: 'Low mids', low: 250, high: 500 },
  { name: 'Mids', low: 500, high: 2000 },
  { name: 'Upper mids', low: 2000, high: 4000 },
  { name: 'Presence', low: 4000, high: 6000 },
  { name: 'Brilliance', low: 6000, high: 20_000 },
];

export const bandOf = (hz: number) =>
  BANDS.find((band) => hz < band.high) ?? BANDS[BANDS.length - 1];

/** The three everyone can tell apart by ear, for naming a tone. */
export const BROAD_BANDS = [
  { id: 'lows', name: 'Lows', high: 250, example: 100 },
  { id: 'mids', name: 'Mids', high: 2000, example: 700 },
  { id: 'highs', name: 'Highs', high: Infinity, example: 4000 },
] as const;
export type BroadBandId = (typeof BROAD_BANDS)[number]['id'];

export const broadBandOf = (hz: number): BroadBandId =>
  (BROAD_BANDS.find((band) => hz < band.high) ?? BROAD_BANDS[2]).id;

/** 0..1 across the range of hearing, equal travel per octave. */
export const hearingPosition = (hz: number) =>
  Math.log(hz / HEARING_LOW) / Math.log(HEARING_HIGH / HEARING_LOW);

/**
 * The notes an instrument plays: their fundamentals, lowest to highest. Its
 * sound reaches well above these in harmonics, so this isn't where it sits in a
 * mix, which is about its character rather than its notes. The top of a guitar,
 * bass or violin depends on the instrument and the player.
 */
export const INSTRUMENT_RANGES = [
  { id: 'piano', name: 'Piano', low: 27.5, high: 4186 },
  { id: 'bass', name: 'Bass guitar', low: 41.2, high: 392 },
  { id: 'guitar', name: 'Guitar', low: 82.4, high: 1319 },
  { id: 'violin', name: 'Violin', low: 196, high: 3520 },
  { id: 'flute', name: 'Flute', low: 262, high: 2093 },
] as const;
export type InstrumentRangeId = (typeof INSTRUMENT_RANGES)[number]['id'];
