import {
  MELODY_KEYS,
  HARMONY_KEYS,
  SCALE_DEFS,
  ROOTS,
  KEY_COLORS,
} from './constants';
import type { KeyGeometry } from './types';

/**
 * Compute the piano key geometry for a given MIDI note.
 * Returns position, width, and black/white status for canvas rendering.
 */
export function getKeyGeometry(
  midi: number,
  canvasWidth: number,
): KeyGeometry | null {
  const numWhiteKeys = 15;
  const startKey = 48;
  const whiteKeyWidth = canvasWidth / numWhiteKeys;
  const blackKeyWidth = whiteKeyWidth * 0.65;

  const offset = midi - startKey;
  if (offset < 0 || offset > 24) return null;

  const octaves = Math.floor(offset / 12);
  const semitone = offset % 12;

  const whiteIndexMap: Record<number, number> = {
    0: 0,
    2: 1,
    4: 2,
    5: 3,
    7: 4,
    9: 5,
    11: 6,
  };
  const blackIndexMap: Record<number, number> = {
    1: 0,
    3: 1,
    6: 3,
    8: 4,
    10: 5,
  };

  if (whiteIndexMap[semitone] !== undefined) {
    const wIndex = octaves * 7 + whiteIndexMap[semitone];
    return { x: wIndex * whiteKeyWidth, width: whiteKeyWidth, isBlack: false };
  } else if (blackIndexMap[semitone] !== undefined) {
    const wIndex = octaves * 7 + blackIndexMap[semitone];
    return {
      x: wIndex * whiteKeyWidth + (whiteKeyWidth - blackKeyWidth / 2),
      width: blackKeyWidth,
      isBlack: true,
    };
  }
  return null;
}

/**
 * Build the scale notes, keyboard mapping, and color for a given root and mode.
 */
export function buildKeyMapping(
  rootVal: number,
  gameMode: string,
): {
  keyName: string;
  keyColor: string;
  scaleNotes: number[];
  keyboardMapping: Record<string, number>;
} {
  const root = ROOTS.find((r) => r.val === rootVal) ?? ROOTS[0];
  const type = 'Major';
  const keyName = `${root.name} ${type}`;
  const keyColor = KEY_COLORS[root.val];
  const intervals = SCALE_DEFS[type];

  const scaleNotes: number[] = [];
  for (let i = 48; i <= 72; i++) {
    const normalizedPitch = (((i - root.val) % 12) + 12) % 12;
    if (intervals.includes(normalizedPitch)) scaleNotes.push(i);
  }

  // Find the first occurrence of the root note
  let rootIdx = 0;
  for (let i = 0; i < scaleNotes.length; i++) {
    if (scaleNotes[i] % 12 === root.val) {
      rootIdx = i;
      break;
    }
  }

  const keys = gameMode === 'Harmony' ? HARMONY_KEYS : MELODY_KEYS;
  const keyboardMapping: Record<string, number> = {};
  keys.forEach((code, kIdx) => {
    if (rootIdx + kIdx < scaleNotes.length) {
      keyboardMapping[code] = scaleNotes[rootIdx + kIdx];
    }
  });

  return { keyName, keyColor, scaleNotes, keyboardMapping };
}
