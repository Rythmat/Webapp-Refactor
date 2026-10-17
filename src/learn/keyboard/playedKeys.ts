// How the Learn keyboard shows the keys a student is holding, the same way on
// every surface (Theory, Genre, Fundamentals): the targets stay where they
// are, a right note lights up shiny on top in a brighter version of its
// colour, and a wrong note goes plain grey, so a wrong note never looks
// rewarding. Each surface decides what "right" means for itself.

import { colord } from 'colord';
import { WRONG_KEY_COLOR } from '@/components/Games/liveFeedback';
import type { PlayedKey } from '@/components/PianoKeyboard';

/**
 * Keys held right now: MIDI note -> the target colour it answers, or null
 * for a wrong note.
 */
export type PlayedKeys = ReadonlyMap<number, string | null>;

/** A target colour made more vivid and a little lighter, never washed out
 *  to white, so a played note reads on top of the target in the same hue. */
export function brightKeyColor(color: string): string {
  const parsed = colord(color);
  if (!parsed.isValid()) return color;
  const { l } = parsed.toHsl();
  return parsed
    .saturate(0.3)
    .lighten(Math.max(0, Math.min(0.12, (80 - l) / 100)))
    .toHex();
}

/** What the keyboard draws for each held key. */
export function toPlayedNotes(keys: PlayedKeys): Map<number, PlayedKey> {
  const notes = new Map<number, PlayedKey>();
  const bright = new Map<string, string>();
  for (const [midi, color] of keys) {
    if (color == null) {
      notes.set(midi, { color: WRONG_KEY_COLOR, shine: false });
      continue;
    }
    let shiny = bright.get(color);
    if (!shiny) {
      shiny = brightKeyColor(color);
      bright.set(color, shiny);
    }
    notes.set(midi, { color: shiny, shine: true });
  }
  return notes;
}
