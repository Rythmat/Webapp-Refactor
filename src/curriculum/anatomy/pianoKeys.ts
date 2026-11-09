import { roundedRect, type Solid } from './iso';

// ── The 88 keys ────────────────────────────────────────────────────────────
// A piano's keyboard, to its real layout: A0 at the bass end to C8 at the
// treble end, 52 white keys and 36 black, the black ones falling in twos and
// threes. Shorter ranges take the same layout, for a keyboard or a synth. In
// inches, across the v axis.

export const LOWEST_MIDI = 21; // A0
export const HIGHEST_MIDI = 108; // C8
export const WHITE_KEY_WIDTH = 0.927;
export const WHITE_KEY_COUNT = 52;
export const KEYBOARD_HALF = (WHITE_KEY_COUNT * WHITE_KEY_WIDTH) / 2;

const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export const isBlackKey = (midi: number) => BLACK_CLASSES.has(midi % 12);

export interface PianoKey {
  midi: number;
  black: boolean;
  /** Its centre across the keyboard. */
  v: number;
}

/** How many white keys a range has. */
const whiteCount = (low: number, high: number) => {
  let whites = 0;
  for (let midi = low; midi <= high; midi++) if (!isBlackKey(midi)) whites++;
  return whites;
};

/** Half the width of a range of keys, centred on v = 0. */
export const keyboardHalf = (low = LOWEST_MIDI, high = HIGHEST_MIDI) =>
  (whiteCount(low, high) * WHITE_KEY_WIDTH) / 2;

/** Every key of a range, lowest first. A black key sits on the line between
 *  two white. Without a range, the 88 of a piano. */
export function pianoKeys(low = LOWEST_MIDI, high = HIGHEST_MIDI): PianoKey[] {
  const half = keyboardHalf(low, high);
  const keys: PianoKey[] = [];
  let whites = 0;
  for (let midi = low; midi <= high; midi++) {
    if (isBlackKey(midi)) {
      keys.push({ midi, black: true, v: -half + whites * WHITE_KEY_WIDTH });
    } else {
      keys.push({
        midi,
        black: false,
        v: -half + (whites + 0.5) * WHITE_KEY_WIDTH,
      });
      whites++;
    }
  }
  return keys;
}

export interface KeyboardSpec {
  /** The keys' front edge, toward the player. */
  frontU: number;
  /** The top of the white keys. */
  z: number;
  /** The range; without one, the 88 of a piano. */
  low?: number;
  high?: number;
}

const WHITE_LENGTH = 6;
const WHITE_DEPTH = 0.9;
const BLACK_LENGTH = 3.75;
const BLACK_WIDTH = 0.5;
const BLACK_HEIGHT = 0.45;

export const whiteKeySolids = ({
  frontU,
  z,
  low,
  high,
}: KeyboardSpec): Solid[] =>
  pianoKeys(low, high)
    .filter((key) => !key.black)
    .map((key) => ({
      outer: roundedRect(
        frontU + WHITE_LENGTH / 2,
        key.v,
        WHITE_LENGTH / 2,
        WHITE_KEY_WIDTH / 2 - 0.015,
      ),
      z0: z - WHITE_DEPTH,
      z1: z,
      hatch: false,
    }));

export const blackKeySolids = ({
  frontU,
  z,
  low,
  high,
}: KeyboardSpec): Solid[] =>
  pianoKeys(low, high)
    .filter((key) => key.black)
    .map((key) => ({
      outer: roundedRect(
        frontU + WHITE_LENGTH - BLACK_LENGTH / 2,
        key.v,
        BLACK_LENGTH / 2,
        BLACK_WIDTH / 2,
      ),
      z0: z,
      z1: z + BLACK_HEIGHT,
      hatch: false,
    }));

/** Where each of the 88 notes crosses the action, lowest first. */
export const noteOffsets = (): number[] => pianoKeys().map((key) => key.v);
