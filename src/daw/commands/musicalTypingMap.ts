// ── The computer keyboard as a piano (milestone 1.6) ───────────────────────
//
// One note map for every instrument, as in Ableton's Computer MIDI Keyboard
// and Logic's Musical Typing: the home row is the white keys from C, the row
// above it the black keys. Keys are matched where they sit (e.code), so the
// same fingers play the same notes on any keyboard layout.

/** Semitones above the octave's C, by e.code. */
export const TYPING_NOTES: Readonly<Record<string, number>> = {
  KeyA: 0, // C
  KeyW: 1,
  KeyS: 2, // D
  KeyE: 3,
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6,
  KeyG: 7, // G
  KeyY: 8,
  KeyH: 9, // A
  KeyU: 10,
  KeyJ: 11, // B
  KeyK: 12, // C
  KeyO: 13,
  KeyL: 14, // D
  KeyP: 15,
  Semicolon: 16, // E
};

export const TYPING_NOTE_CODES = Object.keys(TYPING_NOTES);

/** A on C4 (middle C) to start with. */
export const DEFAULT_TYPING_OCTAVE = 4;
export const MIN_TYPING_OCTAVE = 0;
/** The highest octave whose top note (E, 16 above C) is still MIDI. */
export const MAX_TYPING_OCTAVE = 8;

export const DEFAULT_TYPING_VELOCITY = 100;
export const TYPING_VELOCITY_STEP = 20;

/** The MIDI note a key plays in `octave`, or null for a key that isn't one. */
export function typingNote(code: string, octave: number): number | null {
  const offset = TYPING_NOTES[code];
  if (offset === undefined) return null;
  const note = (octave + 1) * 12 + offset;
  return note >= 0 && note <= 127 ? note : null;
}

/** C4, C-1: the name of the note the A key plays. */
export function octaveLabel(octave: number): string {
  return `C${octave}`;
}

export function clampVelocity(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round(velocity)));
}
