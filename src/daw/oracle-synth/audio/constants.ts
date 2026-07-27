// MIDI note number to frequency (A4 = 440Hz = MIDI 69)
export function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Smooth parameter update to avoid clicks. Pass `at` to anchor the change
// at a scheduled time (sequenced automation) instead of "now".
export function smoothParam(
  param: AudioParam,
  value: number,
  ctx: AudioContext,
  timeConstant: number = 0.01,
  at?: number,
): void {
  // Guard against non-finite targets: setTargetAtTime throws on NaN/Infinity,
  // and a NaN that reaches an AudioParam poisons the node — which, because
  // every voice sums into the shared DAW master (a NaN-latching compressor/
  // convolver chain), silences the ENTIRE Studio until reload. Drop it here,
  // the choke point most Oracle param writes flow through.
  if (!Number.isFinite(value)) return;
  const t = at ?? ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value, t, timeConstant);
}

// Default voice count
export const DEFAULT_VOICE_COUNT = 8;
export const MAX_VOICE_COUNT = 16;

// Anti-click fade time in seconds
export const ANTI_CLICK_TIME = 0.005;

// Note names for display
export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export function noteToName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  const name = NOTE_NAMES[note % 12];
  return `${name}${octave}`;
}
