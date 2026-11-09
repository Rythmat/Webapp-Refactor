// ── The computer keyboard as the lesson's piano ────────────────────────────
// Music Literacy is for beginners and classrooms, where a school Chromebook
// has no MIDI keyboard, so the letter keys play too. The map is the
// Studio's musical typing (daw/commands/musicalTypingMap.ts): the home row
// is the white keys from C (A = C), the row above it the black keys, matched
// by where the key sits (e.code). Z and X move it down and up an octave
// between the two the on-screen keyboard shows (`typingOctavesFor`), so
// every key of its two octaves can be reached: C4–C6 (most steps, melodies
// and chords alike) with A = C4 or C5, C3–C5 with A = C3 or C4, and a
// widened keyboard by as many as it spans. Each step starts on the octave
// that reaches the most of its notes, wherever they were placed: A = C4
// (the 1 of a lesson in C) for Part 1.

import {
  TYPING_NOTES,
  octaveLabel,
  typingNote,
} from '@/daw/commands/musicalTypingMap';
import type { KeyRange } from '@/learn/keyboard/lessonKeyboardRange';

/** The octaves the A key may play on any step: C3 to C5. */
export const LOWEST_TYPING_OCTAVE = 3;
export const HIGHEST_TYPING_OCTAVE = 5;
/** A = C4 to start: the 1 of a lesson in C. */
export const START_TYPING_OCTAVE = 4;

/** The octaves Z and X move between on a step, and the one it starts on. */
export interface TypingOctaves {
  low: number;
  high: number;
  start: number;
}

/** The top row reaches 16 semitones above the A key's C (; is E). */
const TYPING_SPAN = 16;

/** The octave whose C `midi` is in (C4 = 60 is octave 4). */
const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;

/**
 * The A key's octaves on a keyboard of `range`: from the octave of its
 * lowest key to the one an octave below its top (C4–C6: C4 and C5), within
 * C3–C5. It starts on the one that reaches the most of `targets`, the lower
 * on a tie; with no targets, C4 if it can.
 */
export function typingOctavesFor(
  range: KeyRange,
  targets: Iterable<number> = [],
): TypingOctaves {
  const clamp = (octave: number) =>
    Math.max(LOWEST_TYPING_OCTAVE, Math.min(HIGHEST_TYPING_OCTAVE, octave));
  const low = clamp(octaveOf(range.low));
  const high = Math.max(low, clamp(octaveOf(range.high) - 1));
  const midis = [...targets];
  let start = Math.max(low, Math.min(high, START_TYPING_OCTAVE));
  if (midis.length) {
    let most = -1;
    for (let octave = low; octave <= high; octave++) {
      const c = (octave + 1) * 12;
      const reached = midis.filter(
        (midi) => midi >= c && midi <= c + TYPING_SPAN,
      ).length;
      if (reached > most) {
        most = reached;
        start = octave;
      }
    }
  }
  return { low, high, start };
}

export const OCTAVE_DOWN_CODE = 'KeyZ';
export const OCTAVE_UP_CODE = 'KeyX';

/** The MIDI note a key plays with A on `octave`'s C, or null. */
export function literacyTypingNote(
  code: string,
  octave: number,
): number | null {
  return typingNote(code, octave);
}

/**
 * The octave after Z or X (unchanged at either end of `bounds`, the step's
 * two octaves); null for another key.
 */
export function shiftedTypingOctave(
  code: string,
  octave: number,
  bounds: Pick<TypingOctaves, 'low' | 'high'> = {
    low: LOWEST_TYPING_OCTAVE,
    high: HIGHEST_TYPING_OCTAVE,
  },
): number | null {
  if (code === OCTAVE_DOWN_CODE) return Math.max(bounds.low, octave - 1);
  if (code === OCTAVE_UP_CODE) return Math.min(bounds.high, octave + 1);
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
