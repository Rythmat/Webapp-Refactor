// Which keys the Learn on-screen keyboard shows.
//
// The on-screen keyboard starts from the player's own keyboard: the range
// they mapped in Settings → MIDI, or a 73-key layout when they haven't mapped
// one. When they press an octave button the window follows
// (`followPlayedNote`). Every target note is always shown, though: a lesson
// that reaches past their range widens the keyboard (`includeTargets`), and a
// mapped player is told to use their octave buttons (`outOfRangeDirection`).

export interface KeyRange {
  low: number;
  high: number;
}

/** 73 keys, E1–E7 — the Nord / Yamaha 73 layout. */
export const DEFAULT_LESSON_KEY_RANGE: KeyRange = { low: 28, high: 100 };

const MIDI_MIN = 0;
const MIDI_MAX = 127;

export const isBlackKey = (midi: number) =>
  [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

/** Both ends on white keys (a keyboard never starts or ends on a black key),
 *  low ≤ high, inside MIDI. */
export function normalizeKeyRange(range: KeyRange): KeyRange {
  let low = Math.max(MIDI_MIN, Math.min(range.low, range.high));
  let high = Math.min(MIDI_MAX, Math.max(range.low, range.high));
  if (isBlackKey(low)) low -= 1;
  if (isBlackKey(high)) high += 1;
  return { low, high };
}

export const shiftKeyRange = (
  range: KeyRange,
  semitones: number,
): KeyRange => ({
  low: range.low + semitones,
  high: range.high + semitones,
});

/**
 * The octave shift that keeps the window following the player's hands.
 *
 * - **Mapped** keyboard: the window is the hardware's width, so a note
 *   outside it means they pressed an octave button. Move by whole octaves,
 *   just far enough to show the note.
 * - **Unmapped**: we don't know the keyboard, so a note outside the 73-key
 *   default more likely means a bigger keyboard than an octave button.
 *   Widen instead of shifting (returned as `grow`), which can't flap back and
 *   forth when an 88-key player uses both ends.
 */
export function followPlayedNote(
  view: KeyRange,
  midi: number,
  mapped: boolean,
): { shift: number } | { grow: KeyRange } | null {
  if (midi >= view.low && midi <= view.high) return null;
  if (!mapped) {
    return {
      grow: normalizeKeyRange({
        low: Math.min(view.low, midi),
        high: Math.max(view.high, midi),
      }),
    };
  }
  if (midi < view.low) {
    return { shift: -12 * Math.ceil((view.low - midi) / 12) };
  }
  return { shift: 12 * Math.ceil((midi - view.high) / 12) };
}

export type OutOfRange = 'above' | 'below' | 'both' | null;

/** Keys kept beyond the outermost target note, so it never sits on the edge. */
const TARGET_MARGIN = 2;

/**
 * `range` widened, if needed, to show every target note (plus a couple of
 * keys' margin). Peter: we always need to see all the target notes on the
 * keyboard, whatever the player's keyboard size.
 */
export function includeTargets(
  range: KeyRange,
  targetMidis: Iterable<number>,
): KeyRange {
  let low = range.low;
  let high = range.high;
  for (const m of targetMidis) {
    if (m - TARGET_MARGIN < low) low = m - TARGET_MARGIN;
    if (m + TARGET_MARGIN > high) high = m + TARGET_MARGIN;
  }
  return low === range.low && high === range.high
    ? range
    : normalizeKeyRange({ low, high });
}

/** Which way the lesson's notes leave the window, if they do. */
export function outOfRangeDirection(
  view: KeyRange,
  targetMidis: Iterable<number>,
): OutOfRange {
  let above = false;
  let below = false;
  for (const m of targetMidis) {
    if (m > view.high) above = true;
    if (m < view.low) below = true;
  }
  if (above && below) return 'both';
  if (above) return 'above';
  if (below) return 'below';
  return null;
}

/** MIDI numbers of the white keys in the range, low to high. */
export function whiteKeysIn(range: KeyRange): number[] {
  const keys: number[] = [];
  for (let m = range.low; m <= range.high; m++) {
    if (!isBlackKey(m)) keys.push(m);
  }
  return keys;
}

/** A black key's width as a share of a white key's. */
export const BLACK_KEY_WIDTH_SHARE = 0.58;

/**
 * Where a key sits across the keyboard, as fractions of its full width —
 * the geometry the fill-mode PianoKeyboard draws with, so anything drawn
 * above it (the cascade) lines up key for key. Null outside the range.
 */
export function keyBox(
  range: KeyRange,
  midi: number,
): { left: number; width: number; black: boolean } | null {
  if (midi < range.low || midi > range.high) return null;
  const whites = whiteKeysIn(range);
  const n = Math.max(1, whites.length);
  if (!isBlackKey(midi)) {
    const i = whites.indexOf(midi);
    return { left: i / n, width: 1 / n, black: false };
  }
  // A black key straddles the line between the white key below it and the next.
  const column = whites.indexOf(midi - 1) + 1;
  const width = BLACK_KEY_WIDTH_SHARE / n;
  return { left: column / n - width / 2, width, black: true };
}
