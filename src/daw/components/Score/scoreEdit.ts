import type { MidiNoteEvent } from '@prism/engine';
import { keySignatureAlterations } from '@/lib/notation';
import type { Track } from '@/daw/store/tracksSlice';

// ── Editing the score ──────────────────────────────────────────────────────
// A drawn note carries the id `track:clip:startTick:midi`, which is enough to
// find the event it came from. Edits are collected per clip so each one is
// written once.

const LETTER_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];

export interface NoteRef {
  trackId: string;
  clipId: string;
  /** Clip-relative, as stored on the event. */
  startTick: number;
  midi: number;
}

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

/** The note `steps` staff positions away, kept in the key signature. */
export function stepPitch(
  midi: number,
  steps: number,
  keyFifths: number,
): number {
  if (steps === 0) return midi;
  const signature = keySignatureAlterations(keyFifths);
  const pitchClass = ((midi % 12) + 12) % 12;

  // The letter the key would write this note with: an exact match, else the
  // nearest one below (a chromatic note leans on the letter under it).
  let letter = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < 7; i++) {
    const pc = (((LETTER_PITCH_CLASS[i] + signature[i]) % 12) + 12) % 12;
    const distance = (((pitchClass - pc) % 12) + 12) % 12;
    if (distance < bestDistance) {
      bestDistance = distance;
      letter = i;
    }
  }

  // Which octave that letter sits in, then walk by letters and rebuild.
  const written = LETTER_PITCH_CLASS[letter] + signature[letter];
  const octave = Math.round((midi - written) / 12) - 1;
  const absolute = (octave + 1) * 7 + letter + steps;
  const newLetter = ((absolute % 7) + 7) % 7;
  const newOctave = Math.floor(absolute / 7) - 1;
  const next =
    LETTER_PITCH_CLASS[newLetter] + signature[newLetter] + (newOctave + 1) * 12;
  return Math.min(127, Math.max(0, next));
}

/**
 * Break a held note in two at `splitTick` (absolute). Deleting a tie means
 * the note is no longer held through, so the sound becomes two notes.
 */
export function applyNoteSplit(
  tracks: Track[],
  noteId: string,
  splitTick: number,
  write: (trackId: string, clipId: string, events: MidiNoteEvent[]) => void,
): string[] {
  const ref = parseNoteId(noteId);
  if (!ref) return [];
  const track = tracks.find((t) => t.id === ref.trackId);
  const clip = track?.midiClips.find((c) => c.id === ref.clipId);
  const event = clip?.events.find(
    (e) => e.startTick === ref.startTick && e.note === ref.midi,
  );
  if (!clip || !event) return [];
  const relative = splitTick - clip.startTick;
  const end = event.startTick + event.durationTicks;
  if (relative <= event.startTick || relative >= end) return [];

  const events = clip.events.flatMap((candidate) =>
    candidate === event
      ? [
          { ...event, durationTicks: relative - event.startTick },
          { ...event, startTick: relative, durationTicks: end - relative },
        ]
      : [candidate],
  );
  write(ref.trackId, ref.clipId, events);
  return [
    `${ref.trackId}:${ref.clipId}:${event.startTick}:${event.note}`,
    `${ref.trackId}:${ref.clipId}:${relative}:${event.note}`,
  ];
}

export interface NoteEdit {
  /** Staff steps to move, positive upward. */
  steps?: number;
  /** Ticks to shift, positive later. */
  deltaTicks?: number;
  /** Write this note length, in ticks. */
  durationTicks?: number;
  /**
   * Write this exact pitch. An accidental uses it: the notehead stays on its
   * line and only the sounding pitch moves, which `steps` cannot express.
   */
  midi?: number;
  /** Remove the note. */
  remove?: boolean;
}

/**
 * Apply one edit to every note in `ids`, writing each touched clip once.
 * Returns the ids the notes have after the edit, so a selection survives it.
 */
export function applyNoteEdit(
  tracks: Track[],
  ids: Iterable<string>,
  edit: NoteEdit,
  keyFifths: number,
  write: (trackId: string, clipId: string, events: MidiNoteEvent[]) => void,
): string[] {
  const edits = new Map<string, NoteEdit>();
  for (const id of ids) edits.set(id, edit);
  return applyNoteEdits(tracks, edits, keyFifths, write);
}

/**
 * Apply a different edit to each note in one pass. Anything that both changes
 * some notes and removes others — a tie, for one — has to go through here:
 * two separate passes would each start from the same unedited clip, and the
 * second would undo the first.
 */
export function applyNoteEdits(
  tracks: Track[],
  edits: ReadonlyMap<string, NoteEdit>,
  keyFifths: number,
  write: (trackId: string, clipId: string, events: MidiNoteEvent[]) => void,
): string[] {
  const byClip = new Map<string, NoteRef[]>();
  const editFor = new Map<string, NoteEdit>();
  for (const [id, edit] of edits) {
    const ref = parseNoteId(id);
    if (!ref) continue;
    const key = `${ref.trackId}:${ref.clipId}`;
    byClip.set(key, [...(byClip.get(key) ?? []), ref]);
    editFor.set(
      `${ref.trackId}:${ref.clipId}:${ref.startTick}:${ref.midi}`,
      edit,
    );
  }

  const nextIds: string[] = [];
  for (const [key, refs] of byClip) {
    const [trackId, clipId] = key.split(':');
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.midiClips.find((c) => c.id === clipId);
    if (!track || !clip) continue;
    const wanted = new Set(refs.map((r) => `${r.startTick}:${r.midi}`));
    const events: MidiNoteEvent[] = [];
    for (const event of clip.events) {
      if (!wanted.has(`${event.startTick}:${event.note}`)) {
        events.push(event);
        continue;
      }
      const edit =
        editFor.get(`${trackId}:${clipId}:${event.startTick}:${event.note}`) ??
        {};
      if (edit.remove) continue;
      const note =
        edit.midi !== undefined
          ? edit.midi
          : edit.steps === undefined || edit.steps === 0
            ? event.note
            : stepPitch(event.note, edit.steps, keyFifths);
      const startTick = Math.max(0, event.startTick + (edit.deltaTicks ?? 0));
      events.push({
        ...event,
        note,
        startTick,
        ...(edit.durationTicks !== undefined
          ? { durationTicks: edit.durationTicks }
          : {}),
      });
      nextIds.push(`${trackId}:${clipId}:${startTick}:${note}`);
    }
    write(trackId, clipId, events);
  }
  return nextIds;
}
