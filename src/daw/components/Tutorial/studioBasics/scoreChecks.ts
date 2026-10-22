import type { AllSlices } from '@/daw/store';
import type { StepCheck } from '../tutorials';

// ── The Score lesson's checks (Studio Basics 6) ────────────────────────────
// What a student did to the notes since the step armed, read by each note's
// own stored id (MidiNoteEvent.id), which an edit keeps and a new note gets
// fresh. Counting notes would miss a note written in the Score over another
// one (note input overwrites what starts under it), and a song may be the
// student's own, so nothing here asks for a track by name.

/** Each stored note's pitch and length (`note:durationTicks`), by its id. */
type NoteShapes = ReadonlyMap<string, string>;

/** Per track list: a check runs on every store change, the armed side once. */
const shapesOf = new WeakMap<AllSlices['tracks'], NoteShapes>();

function noteShapes(tracks: AllSlices['tracks']): NoteShapes {
  const cached = shapesOf.get(tracks);
  if (cached) return cached;
  const shapes = new Map<string, string>();
  for (const track of tracks) {
    for (const clip of track.midiClips) {
      for (const event of clip.events) {
        if (event.id)
          shapes.set(event.id, `${event.note}:${event.durationTicks}`);
      }
    }
  }
  shapesOf.set(tracks, shapes);
  return shapes;
}

/** A note is there that wasn't when the step armed. */
export const noteAdded: StepCheck = (s, armed) => {
  if (s.tracks === armed.tracks) return false;
  const before = noteShapes(armed.tracks);
  for (const id of noteShapes(s.tracks).keys()) {
    if (!before.has(id)) return true;
  }
  return false;
};

/** A note that was there when the step armed has a new pitch or length. */
export const noteChanged: StepCheck = (s, armed) => {
  if (s.tracks === armed.tracks) return false;
  const before = noteShapes(armed.tracks);
  for (const [id, shape] of noteShapes(s.tracks)) {
    const was = before.get(id);
    if (was !== undefined && was !== shape) return true;
  }
  return false;
};
