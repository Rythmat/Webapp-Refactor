// ── The computer keyboard as the lesson's piano ────────────────────────────
// Music Literacy is for beginners and classrooms, where a school Chromebook
// has no MIDI keyboard, so the letter keys play too. The map is the
// Studio's musical typing (daw/commands/musicalTypingMap.ts): the home row
// is the white keys from C (A = C), the row above it the black keys, matched
// by where the key sits (e.code). Z and X move it down and up an octave
// between the two the on-screen keyboard shows, so every key of C3–C5 can
// be reached: A = C4 (the series' 1 in C) to start, A = C3 an octave down.

import {
  TYPING_NOTES,
  octaveLabel,
  typingNote,
} from '@/daw/commands/musicalTypingMap';

/** The octaves the A key may play: C3 and C4. */
export const LOWEST_TYPING_OCTAVE = 3;
export const HIGHEST_TYPING_OCTAVE = 4;
/** A = C4 to start: the 1 of a lesson in C. */
export const START_TYPING_OCTAVE = 4;

export const OCTAVE_DOWN_CODE = 'KeyZ';
export const OCTAVE_UP_CODE = 'KeyX';

/** The MIDI note a key plays with A on `octave`'s C, or null. */
export function literacyTypingNote(
  code: string,
  octave: number,
): number | null {
  return typingNote(code, octave);
}

/** The octave after Z or X (unchanged at either end); null for another key. */
export function shiftedTypingOctave(
  code: string,
  octave: number,
): number | null {
  if (code === OCTAVE_DOWN_CODE)
    return Math.max(LOWEST_TYPING_OCTAVE, octave - 1);
  if (code === OCTAVE_UP_CODE)
    return Math.min(HIGHEST_TYPING_OCTAVE, octave + 1);
  return null;
}

/** The letter that plays `midi` with A on `octave`'s C ("A", ";"), or null. */
export function typingLetterFor(midi: number, octave: number): string | null {
  const offset = midi - (octave + 1) * 12;
  const code = Object.keys(TYPING_NOTES).find(
    (key) => TYPING_NOTES[key] === offset,
  );
  if (!code) return null;
  return code === 'Semicolon' ? ';' : code.replace(/^Key/, '');
}

/** "A = C4", the hint under the keyboard. */
export function typingOctaveLabel(octave: number): string {
  return `A = ${octaveLabel(octave)}`;
}

/** Focus in any of these keeps the letter keys for itself. */
const TYPING_IGNORE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="menu"], [role="listbox"]';

/** A key event the lesson should play (not one typed into a field, or a shortcut). */
export function isPlayableKeyEvent(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  return !(target instanceof Element && target.closest(TYPING_IGNORE_SELECTOR));
}
