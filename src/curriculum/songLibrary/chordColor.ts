import { getChordColorFromNotes } from '@prism/engine';
import type { SongMode } from '@/curriculum/types/songLibrary';
import { chordNameToMidi } from './chordParser';

/**
 * Song chord → Studio key-colour, as a plain module (no React) so pages that
 * only need the colour don't pull in the chord diagram's keyboard.
 */

export type ChordRgb = readonly [number, number, number];

/** Map Song's SongMode to the Prism engine's parent-Ionian mode keys. */
export function normalizeMode(mode: SongMode): string {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
}

/**
 * The Studio key-colour for a chord name, routed through MIDI so callers don't
 * have to translate the song's degree strings ('1 maj', '♭7 maj') into Studio's
 * format. Null when the name doesn't parse.
 */
export function chordRgbFor(
  chordName: string,
  keyRoot: number,
  mode: SongMode,
): ChordRgb | null {
  const midis = chordNameToMidi(chordName);
  if (midis.length === 0) return null;
  const [r, g, b] = getChordColorFromNotes(midis, keyRoot, normalizeMode(mode));
  return [r, g, b] as const;
}
