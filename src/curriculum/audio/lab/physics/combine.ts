// ── What happens when waves meet ───────────────────────────────────────────
// Two tones at a place simply add. Equal tones in step double; half a cycle out,
// they cancel. Close tones drift in and out of step, which is heard as beats.
// Each tone is at half the level, so the sum never passes a single full tone.

/** The sum's height, −1..1, `cycles` along, the second tone `phase` degrees behind. */
export const sumAt = (cycles: number, phase: number) =>
  (Math.sin(2 * Math.PI * cycles) +
    Math.sin(2 * Math.PI * cycles - (phase * Math.PI) / 180)) /
  2;

/** How tall the sum is, 0..1. */
export const sumAmplitude = (phase: number) =>
  Math.abs(Math.cos((phase * Math.PI) / 360));

/** How far a phase is from cancelling, in degrees. */
export const degreesFromCancelling = (phase: number) => Math.abs(phase - 180);

/** Beats a second: the distance between the two frequencies. */
export const beatRate = (a: number, b: number) => Math.abs(a - b);

/** How tall two close tones' sum is, 0..1, `seconds` after they were in step. */
export const beatEnvelope = (seconds: number, a: number, b: number) =>
  Math.abs(Math.cos(Math.PI * (a - b) * seconds));
