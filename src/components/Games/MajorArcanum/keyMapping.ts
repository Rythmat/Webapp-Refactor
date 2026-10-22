import {
  formatNoteName,
  MIDI_ROOT_TO_KEY,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { MODES } from '@/curriculum/engine/majorArcanum/levels';
import type { ArcanumRun } from '@/curriculum/engine/majorArcanum/song';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { BUFFER_COLUMNS } from './constants';
import type { KeyGeometry } from './types';

/** The keys the canvas draws: from a C, so many white keys. */
export interface KeyboardDisplay {
  /** The lowest key drawn, always a C. */
  low: number;
  whiteKeys: number;
}

export const DEFAULT_DISPLAY: KeyboardDisplay = { low: 48, whiteKeys: 15 };

const WHITE_INDEX: Record<number, number> = {
  0: 0,
  2: 1,
  4: 2,
  5: 3,
  7: 4,
  9: 5,
  11: 6,
};
const BLACK_INDEX: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

/** The columns across the canvas: the keys drawn and a buffer each side. */
export const totalColumns = (display: KeyboardDisplay) =>
  display.whiteKeys + BUFFER_COLUMNS * 2;

/**
 * A key's place on the canvas: its x, width and whether it's black. Null for
 * a key outside the keys drawn.
 */
export function getKeyGeometry(
  midi: number,
  canvasWidth: number,
  display: KeyboardDisplay = DEFAULT_DISPLAY,
): KeyGeometry | null {
  // Divide the full width across all columns (playable + buffers) so the
  // playable lanes shrink and sit centered between the side buffers.
  const whiteKeyWidth = canvasWidth / totalColumns(display);
  const blackKeyWidth = whiteKeyWidth * 0.65;
  const offset = midi - display.low;
  if (offset < 0) return null;
  const octaves = Math.floor(offset / 12);
  const semitone = offset % 12;
  if (WHITE_INDEX[semitone] !== undefined) {
    const wIndex = octaves * 7 + WHITE_INDEX[semitone];
    if (wIndex >= display.whiteKeys) return null;
    return {
      x: (wIndex + BUFFER_COLUMNS) * whiteKeyWidth,
      width: whiteKeyWidth,
      isBlack: false,
    };
  }
  const wIndex = octaves * 7 + BLACK_INDEX[semitone];
  if (wIndex + 1 >= display.whiteKeys) return null;
  return {
    x:
      (wIndex + BUFFER_COLUMNS) * whiteKeyWidth +
      (whiteKeyWidth - blackKeyWidth / 2),
    width: blackKeyWidth,
    isBlack: true,
  };
}

// ── The computer keyboard ────────────────────────────────────────────────────

/** Melody: the 1 to the 8 on the home row, a gap between the hands. */
const MELODY_CODES = [
  ['KeyA', 'A'],
  ['KeyS', 'S'],
  ['KeyD', 'D'],
  ['KeyF', 'F'],
  ['KeyH', 'H'],
  ['KeyJ', 'J'],
  ['KeyK', 'K'],
  ['KeyL', 'L'],
] as const;

/** Chords: the 1 to the 11th along the home row… */
const HOME_ROW = [
  ['KeyA', 'A'],
  ['KeyS', 'S'],
  ['KeyD', 'D'],
  ['KeyF', 'F'],
  ['KeyG', 'G'],
  ['KeyH', 'H'],
  ['KeyJ', 'J'],
  ['KeyK', 'K'],
  ['KeyL', 'L'],
  ['Semicolon', ';'],
  ['Quote', "'"],
] as const;

/** …and the row above it an octave up, Q over A, for a 7th chord's top. */
const TOP_ROW = [
  ['KeyQ', 'Q'],
  ['KeyW', 'W'],
  ['KeyE', 'E'],
  ['KeyR', 'R'],
  ['KeyT', 'T'],
  ['KeyY', 'Y'],
  ['KeyU', 'U'],
  ['KeyI', 'I'],
  ['KeyO', 'O'],
  ['KeyP', 'P'],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
] as const;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const positionMidi = (root: number, position: number) =>
  root + MAJOR[((position % 7) + 7) % 7] + 12 * Math.floor(position / 7);

/** Everything a run needs to be drawn and played. */
export interface RunKeyboard {
  keyName: string;
  keyColor: string;
  /** The key's notes across the keys drawn. */
  scaleNotes: number[];
  /** Computer key code → note (none in Expert and Maestro: MIDI only). */
  keyboardMapping: Record<string, number>;
  /** Note → the computer key that plays it, as the keys show it. */
  keyLabels: Record<number, string>;
  display: KeyboardDisplay;
}

/** The keyboard for a run: its key, its range, and the keys that play it. */
export function runKeyboard(run: ArcanumRun): RunKeyboard {
  const keyAscii = MIDI_ROOT_TO_KEY[((run.keyPc % 12) + 12) % 12];
  const keyboardMapping: Record<string, number> = {};
  const keyLabels: Record<number, string> = {};
  const map = (code: string, label: string, midi: number) => {
    keyboardMapping[code] = midi;
    keyLabels[midi] ??= label;
  };
  if (!MODES[run.mode].midiRequired) {
    if (run.part === 'melody')
      MELODY_CODES.forEach(([code, label], i) =>
        map(code, label, positionMidi(run.rootMidi, i)),
      );
    else {
      HOME_ROW.forEach(([code, label], i) =>
        map(code, label, positionMidi(run.rootMidi, i)),
      );
      // The row above only where 7th chords reach it (Pro): Novice's
      // triads stay on the home row.
      if (MODES[run.mode].sevenths)
        TOP_ROW.forEach(([code, label], i) =>
          map(code, label, positionMidi(run.rootMidi, i + 7)),
        );
    }
  }
  // The keys drawn: whole octaves, C to C, around everything that falls
  // and every key the computer keyboard plays.
  const playable = Object.values(keyboardMapping);
  const lowest = Math.min(run.low, ...playable.filter((m) => m <= run.high));
  const highest = Math.max(run.high, ...playable.filter((m) => m <= run.high));
  const low = Math.floor(lowest / 12) * 12;
  const top = Math.ceil((highest + 1) / 12) * 12;
  const whiteKeys = ((top - low) / 12) * 7 + 1;
  const scaleNotes: number[] = [];
  for (let m = low; m <= top; m++)
    if (MAJOR.includes((((m - run.keyPc) % 12) + 12) % 12)) scaleNotes.push(m);
  return {
    keyName: `${formatNoteName(keyAscii)} Major`,
    keyColor: colorForKeyMode(keyAscii, 'ionian'),
    scaleNotes,
    keyboardMapping,
    keyLabels,
    display: { low, whiteKeys },
  };
}

/** The key's color and name, for a key picked on the Circle. */
export function keyLook(keyPc: number): { keyName: string; keyColor: string } {
  const keyAscii = MIDI_ROOT_TO_KEY[((keyPc % 12) + 12) % 12];
  return {
    keyName: `${formatNoteName(keyAscii)} Major`,
    keyColor: colorForKeyMode(keyAscii, 'ionian'),
  };
}
