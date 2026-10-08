// ── A note's Score key ───────────────────────────────────────────────────
// The Score and the Lead Sheet key a note by where it sits:
// `${trackId}:${clipId}:${startTick}:${midi}`, the tick relative to the clip
// as the event stores it. The views draw notes under that key, the Score's
// edits and its clipboard find notes by it, and its marks (articulations,
// slurs, pinned spellings, slash notes) are kept under it in memory and in
// collab. The stored project keys the marks by note id instead
// (persistence/projectDocument/notationCodec.ts), translating with this same
// key, so every side composes and reads it here. Pure, with no React and no
// store, so the codec and the views can both import it.
//
// Two notes on one tick and pitch share a key. A key changes with any edit
// to its note's track, clip, tick or pitch; the note id (noteIds.ts) never
// does.

import {
  noteNameToPitchClass,
  parseNoteName,
  pitchNameToMidi,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';

/** Where a note sits, as its Score key names it. */
export interface NoteRef {
  trackId: string;
  clipId: string;
  /** Clip-relative, as stored on the event. */
  startTick: number;
  midi: number;
}

/** The Score key of the note at clip tick `startTick` and pitch `midi`. */
export function noteKey(
  trackId: string,
  clipId: string,
  startTick: number,
  midi: number,
): string {
  return `${trackId}:${clipId}:${startTick}:${midi}`;
}

/**
 * Where the note a Score key names sits; null when `id` isn't a Score key.
 * (The Score calls a drawn note's key its id.)
 */
export function parseNoteId(id: string): NoteRef | null {
  const parts = id.split(':');
  if (parts.length !== 4) return null;
  const [trackId, clipId, startTick, midi] = parts;
  if (!trackId || !clipId) return null;
  return {
    trackId,
    clipId,
    startTick: Number(startTick),
    midi: Number(midi),
  };
}

/**
 * A pinned spelling as it belongs on a note sounding `midi`: null when it
 * spells another pitch class, else the same name with its octave set to the
 * written letter's (C♭5 sounds as MIDI 71, B♯3 as 60), so a note moved an
 * octave keeps its spelling in the right octave. A name nothing can read is
 * left alone; the engraver skips it as well.
 *
 * The Score's edits (followNoteEdit) and the stored project both go by this
 * rule, so they agree on which spellings survive.
 */
export function spellingForPitch(spelled: string, midi: number): string | null {
  const pitchClass = noteNameToPitchClass(spelled);
  if (pitchClass === null) return spelled;
  if (pitchClass !== ((midi % 12) + 12) % 12) return null;
  const written = pitchNameToMidi(spelled);
  // No octave written, or already the right one.
  if (written === null || written === midi) return spelled;
  const octave = parseNoteName(spelled)?.octave ?? 0;
  return spelled
    .trim()
    .replace(/-?\d+$/, String(octave + (midi - written) / 12));
}
