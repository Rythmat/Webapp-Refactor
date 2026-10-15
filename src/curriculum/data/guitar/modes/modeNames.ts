// ── Guitar modes: names ───────────────────────────────────────────────────
// The modes guitar Theory teaches and what they are called. No data: the
// Learn hub imports this, and the key centers load only with a lesson.

import type { GuitarModalMode, GuitarMode } from '../types';

/** In scale-degree order: Ionian is the major scale, Book One's mode. */
export const GUITAR_MODES: readonly GuitarMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

export function isGuitarMode(mode: string | undefined): mode is GuitarMode {
  return (GUITAR_MODES as readonly string[]).includes(mode ?? '');
}

export function isGuitarModalMode(
  mode: string | undefined,
): mode is GuitarModalMode {
  return mode !== 'ionian' && isGuitarMode(mode);
}

/** 'Dorian'. */
export const GUITAR_MODE_NAME: Readonly<Record<GuitarMode, string>> = {
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
};

/** As the Theory tile and lesson headers name it: 'Ionian (Major)'. */
export const GUITAR_MODE_TITLE: Readonly<Record<GuitarMode, string>> = {
  ...GUITAR_MODE_NAME,
  ionian: 'Ionian (Major)',
};
