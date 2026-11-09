// ── Amplitude and decibels ─────────────────────────────────────────────────
// Pure. These are decibels relative to a reference (here, a lab's own maximum),
// not the sound pressure levels a real room has: a web page can't know how loud
// the student's speakers are.

/** Amplitude (0..1 of the maximum) as decibels below that maximum. */
export const ampToDb = (amplitude: number) =>
  amplitude <= 0 ? -Infinity : 20 * Math.log10(amplitude);

export const dbToAmp = (db: number) => 10 ** (db / 20);

/** "0 dB", "−6 dB", "Silent". */
export function formatDb(db: number): string {
  if (!Number.isFinite(db)) return 'Silent';
  const rounded = Math.round(db);
  if (rounded === 0) return '0 dB';
  return `${rounded < 0 ? '−' : '+'}${Math.abs(rounded)} dB`;
}
