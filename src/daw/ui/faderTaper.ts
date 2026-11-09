// ── A fader's travel and the gain it sets (the track header, 2026-10-21) ───
//
// Suno's volume pill puts unity gain (0 dB) four-fifths of the way along and
// the top at +6 dB, our tracks' most (a gain of 2). Between, the gain is a
// power of the travel, so the top half of the pill is where the ear works
// (−6 dB is about two-thirds along, −20 dB about two-fifths) and silence is
// at the left edge. The track's meter uses the same scale, so a signal at
// the fader's level fills the pill to the fader.

/** Where unity gain sits along the travel. */
export const UNITY_AT = 0.8;
/** The gain at the top of the travel: +6 dB. */
export const TOP_GAIN = 2;

/** The power that puts TOP_GAIN at the top: (1 / UNITY_AT) ** EXPONENT. */
const EXPONENT = Math.log(TOP_GAIN) / Math.log(1 / UNITY_AT);

/** The gain at `position` (0–1 along the travel). */
export function gainAtPosition(position: number): number {
  const p = Math.min(1, Math.max(0, position));
  return (p / UNITY_AT) ** EXPONENT;
}

/** Where `gain` sits along the travel (0–1); beyond TOP_GAIN is the top. */
export function positionOfGain(gain: number): number {
  if (!(gain > 0)) return 0;
  return Math.min(1, UNITY_AT * gain ** (1 / EXPONENT));
}
