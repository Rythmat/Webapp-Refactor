// Pitch class to note name (0-11)
export const NOTES: Record<number, string> = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};

// Reverse lookup: note name to pitch class
const NOTE_TO_PC: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

/**
 * Convert a note name string to MIDI number.
 * Supports: "C4", "C#4", "Db4", "C\u266F4", "D\u266D4"
 */
export function getMidi(name: string): number {
  const normalized = name.replace(/\u266F/g, '#').replace(/\u266D/g, 'b');
  const match = normalized.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octaveStr] = match;
  const base = NOTE_TO_PC[letter];
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const octave = parseInt(octaveStr);
  return (octave + 1) * 12 + base + offset;
}

/** Convert MIDI number to note name: e.g. 60 -> "C4" */
export function noteName(midi: number): string {
  return NOTES[midi % 12] + String(Math.floor(midi / 12) - 1);
}

/** Convert MIDI number to note letter only: e.g. 60 -> "C" */
export function noteNameLetter(midi: number): string {
  return NOTES[midi % 12];
}

// ── Key-aware enharmonic spelling ──────────────────────────────────────────

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Sharp side of circle of fifths: G(7), D(2), A(9), E(4), B(11), F#(6)
const SHARP_KEY_PCS = new Set([2, 4, 6, 7, 9, 11]);

/**
 * Key-aware note naming. Sharp keys use sharps, flat keys use flats,
 * key of C uses the default mixed mapping.
 */
export function noteNameInKey(pc: number, keyPc: number): string {
  const idx = ((pc % 12) + 12) % 12;
  if (keyPc === 0) return NOTES[idx];
  return SHARP_KEY_PCS.has(keyPc) ? SHARP_NAMES[idx] : FLAT_NAMES[idx];
}

/** Ticks per quarter note */
export const BEAT_VAL = 480;
