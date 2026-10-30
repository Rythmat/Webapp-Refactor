import { midiNameInKey } from '@prism/engine';

/** "C#5" → "C♯5", for display. */
export const prettyNote = (name: string) =>
  name.replace(/#/g, '♯').replace(/(?<=[A-G])b/g, '♭');

/** A note spelled from the open string's key (A string: C♯, never D♭). */
export function noteName(midi: number, openMidi: number): string {
  return prettyNote(midiNameInKey(midi, openMidi % 12));
}
