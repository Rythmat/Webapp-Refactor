// ── MIDI Note Utilities ───────────────────────────────────────────────────

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Convert a MIDI note number to a note name string (e.g., 60 → "C4"). */
export function midiToNoteName(midi: number): string {
  const note = NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

/** Convert a note name string to a MIDI note number (e.g., "C4" → 60). */
export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G]#?)(-?\d)$/);
  if (!match) return 60;
  const noteIndex = NOTES.indexOf(match[1] as (typeof NOTES)[number]);
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + noteIndex;
}
