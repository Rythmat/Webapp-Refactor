// ── A sound wave's numbers ─────────────────────────────────────────────────
// Pure, so what a lab teaches can be tested. Frequencies are in hertz and
// distances in metres, in air at room temperature.

/** The speed of sound in air at about 20 °C, in metres per second. */
export const SPEED_OF_SOUND_AIR = 343;

const A4_HZ = 440;
const A4_MIDI = 69;
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** How far one cycle reaches: λ = speed / frequency. */
export const wavelength = (hz: number, speed = SPEED_OF_SOUND_AIR) =>
  speed / hz;

/** How many cycles pass in a stretch of time. */
export const cyclesIn = (hz: number, milliseconds: number) =>
  (hz * milliseconds) / 1000;

export const hzToMidi = (hz: number) => A4_MIDI + 12 * Math.log2(hz / A4_HZ);

export const midiToHz = (midi: number) => A4_HZ * 2 ** ((midi - A4_MIDI) / 12);

export const noteName = (midi: number) =>
  `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** The nearest note to a frequency, and how far off it is, in cents. */
export function nearestNote(hz: number): {
  midi: number;
  name: string;
  cents: number;
} {
  const exact = hzToMidi(hz);
  const midi = Math.round(exact);
  return {
    midi,
    name: noteName(midi),
    cents: Math.round((exact - midi) * 100),
  };
}

/** How far apart two frequencies are, in cents (positive: `hz` is higher). */
export const centsBetween = (hz: number, reference: number) =>
  1200 * Math.log2(hz / reference);

/** Close enough to count when matching a pitch: within a quarter tone. */
export const MATCH_CENTS = 50;

export type MatchResult = 'match' | 'higher' | 'lower';

/** Which way the student's tone has to go to reach the target. */
export function matchResult(
  mine: number,
  target: number,
  within = MATCH_CENTS,
): MatchResult {
  const cents = centsBetween(mine, target);
  if (Math.abs(cents) <= within) return 'match';
  return cents < 0 ? 'higher' : 'lower';
}

/** A slider's 0..1 as a frequency: equal travel for each octave, as the ear
 *  hears them. The wave itself is always drawn to a linear time scale. */
export const positionToHz = (position: number, low: number, high: number) =>
  low * (high / low) ** position;

export const hzToPosition = (hz: number, low: number, high: number) =>
  Math.log(hz / low) / Math.log(high / low);

/**
 * The stretch of time a wave is drawn over. Fixed, so doubling the frequency
 * visibly doubles the cycles, and only zoomed, a whole decade, when the cycles
 * would be too fine to tell apart at this width. (A screen can't show a sound
 * wave moving at its real speed: 440 Hz would alias at 60 frames a second.)
 */
export function windowMsFor(hz: number, widthPx: number): number {
  const MIN_PX_PER_CYCLE = 8;
  return cyclesIn(hz, 20) <= widthPx / MIN_PX_PER_CYCLE ? 20 : 2;
}

/** A length said the way a person would: "78 cm", "1.56 m", "9.7 cm". */
export function formatLength(metres: number): string {
  if (metres >= 1) return `${metres.toFixed(2)} m`;
  const cm = metres * 100;
  return `${cm >= 10 ? Math.round(cm) : cm.toFixed(1)} cm`;
}

/** A frequency to the precision that reads naturally: "55 Hz", "1.76 kHz". */
export function formatHz(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(2).replace(/\.?0+$/, '')} kHz`;
  }
  return `${hz >= 100 ? Math.round(hz) : hz.toFixed(1).replace(/\.0$/, '')} Hz`;
}
