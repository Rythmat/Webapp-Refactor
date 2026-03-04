// MIDI note number to frequency (A4 = 440Hz = MIDI 69)
export function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Smooth parameter update to avoid clicks
export function smoothParam(
  param: AudioParam,
  value: number,
  ctx: AudioContext,
  timeConstant: number = 0.01
): void {
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, timeConstant);
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
