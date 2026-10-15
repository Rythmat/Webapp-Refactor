import type { MidiNoteEvent } from '@prism/engine';
import { keySignatureAlterations } from '@/lib/notation';
import { mintNoteId } from '@/daw/model/noteIds';
import {
  noteKey,
  parseNoteId,
  spellingForPitch,
  type NoteRef,
} from '@/daw/model/noteKeys';
import type { Track } from '@/daw/store/tracksSlice';

// ── Editing the score ──────────────────────────────────────────────────────
// A drawn note carries the id `track:clip:startTick:midi`, which is enough to
// find the event it came from. Edits are collected per clip so each one is
// written once. (That id is the Score's key for where a note sits, composed
// and read in model/noteKeys. The event also carries its own stored id, which
// an edit keeps; the project document stores marks by that one, see
// persistence/projectDocument/notationCodec.)

const LETTER_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];

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
 * the note is no longer held through, so the sound becomes two notes: the
 * first keeps the note's id (and with it the note's marks), the second is a
 * new note with an id of its own.
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
          {
            ...event,
            id: mintNoteId(),
            startTick: relative,
            durationTicks: end - relative,
          },
        ]
      : [candidate],
  );
  write(ref.trackId, ref.clipId, events);
  return [
    noteKey(ref.trackId, ref.clipId, event.startTick, event.note),
    noteKey(ref.trackId, ref.clipId, relative, event.note),
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

/** What an edit did to the notes it touched, by Score id. */
export interface NoteEditResult {
  /**
   * The edited notes' ids afterwards, in each clip's event order, without the
   * removed ones: what the selection becomes.
   */
  ids: string[];
  /**
   * Old id → new id for every note the edit moved or re-pitched, so its marks
   * can follow it. A note whose id didn't change isn't listed.
   */
  renamed: Map<string, string>;
  /** The ids of the notes the edit took out. */
  removed: Set<string>;
}

/**
 * Apply one edit to every note in `ids`, writing each touched clip once.
 * Returns where the notes went, so a selection and the marks survive it.
 */
export function applyNoteEdit(
  tracks: Track[],
  ids: Iterable<string>,
  edit: NoteEdit,
  keyFifths: number,
  write: (trackId: string, clipId: string, events: MidiNoteEvent[]) => void,
): NoteEditResult {
  const edits = new Map<string, NoteEdit>();
  for (const id of ids) edits.set(id, edit);
  return applyNoteEdits(tracks, edits, keyFifths, write);
}

/**
 * Apply a different edit to each note in one pass. Anything that both changes
 * some notes and removes others — a tie, for one — has to go through here:
 * two separate passes would each start from the same unedited clip, and the
 * second would undo the first.
 *
 * The result maps each note's old id to its new one explicitly. Pairing the
 * ids by position instead (the selection's order against the clips' order)
 * moved one note's staccato onto another whenever the two orders differed.
 */
export function applyNoteEdits(
  tracks: Track[],
  edits: ReadonlyMap<string, NoteEdit>,
  keyFifths: number,
  write: (trackId: string, clipId: string, events: MidiNoteEvent[]) => void,
): NoteEditResult {
  const byClip = new Map<string, NoteRef[]>();
  const editFor = new Map<string, NoteEdit>();
  for (const [id, edit] of edits) {
    const ref = parseNoteId(id);
    if (!ref) continue;
    const key = `${ref.trackId}:${ref.clipId}`;
    byClip.set(key, [...(byClip.get(key) ?? []), ref]);
    editFor.set(
      noteKey(ref.trackId, ref.clipId, ref.startTick, ref.midi),
      edit,
    );
  }

  const ids: string[] = [];
  const renamed = new Map<string, string>();
  const removed = new Set<string>();
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
      const oldId = noteKey(trackId, clipId, event.startTick, event.note);
      const edit = editFor.get(oldId) ?? {};
      if (edit.remove) {
        removed.add(oldId);
        continue;
      }
      const note =
        edit.midi !== undefined
          ? edit.midi
          : edit.steps === undefined || edit.steps === 0
            ? event.note
            : stepPitch(event.note, edit.steps, keyFifths);
      const startTick = Math.max(0, event.startTick + (edit.deltaTicks ?? 0));
      // The spread keeps the event's stored id: an edit moves a note, it
      // doesn't make a new one.
      events.push({
        ...event,
        note,
        startTick,
        ...(edit.durationTicks !== undefined
          ? { durationTicks: edit.durationTicks }
          : {}),
      });
      const newId = noteKey(trackId, clipId, startTick, note);
      if (newId !== oldId) renamed.set(oldId, newId);
      ids.push(newId);
    }
    write(trackId, clipId, events);
  }
  return { ids, renamed, removed };
}

/**
 * The marks the Score keys by note: what an edit has to carry along. The
 * store's own arrays; followNoteEdit never changes one in place.
 */
export interface NoteKeyedMarks {
  /** `noteId|kind` */
  articulations: string[];
  /** `fromId|toId` */
  slurs: string[];
  /** `noteId|spelled`, a spelling pinned by writing an accidental */
  spellings: string[];
  /** `noteId` */
  slashNotes: string[];
}

/** The MIDI pitch a Score id names (`…:startTick:midi`). */
const midiOf = (noteId: string) => parseNoteId(noteId)?.midi ?? NaN;

/**
 * Carry the note-keyed marks through an edit: a mark on a moved note moves
 * to its new id, and marks on removed notes go. A pinned spelling follows
 * only while its note keeps the pitch class it spells, re-octaved when the
 * note jumped an octave (B♯4 on C5 becomes B♯5 on C6); a note moved to
 * another pitch is spelled by the key again. The stored project applies the
 * same rule (spellingForPitch).
 *
 * Each list comes back as the same array when the edit left it alone, so a
 * caller writes only what changed.
 */
export function followNoteEdit(
  marks: NoteKeyedMarks,
  { renamed, removed }: Pick<NoteEditResult, 'renamed' | 'removed'>,
): NoteKeyedMarks {
  if (renamed.size === 0 && removed.size === 0) return marks;
  const to = (id: string) => renamed.get(id) ?? id;

  /**
   * Rebuild a list entry by entry: `next` returns the entry after the edit,
   * or null to drop it. Entries the edit merged into one are kept once.
   */
  const follow = (
    entries: string[],
    next: (entry: string) => string | null,
  ): string[] => {
    let changed = false;
    const out: string[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      const moved = next(entry);
      if (moved !== entry) changed = true;
      if (moved === null) continue;
      if (seen.has(moved)) {
        changed = true;
        continue;
      }
      seen.add(moved);
      out.push(moved);
    }
    return changed ? out : entries;
  };

  /** `head|tail`, split at the last '|' the way the Score reads marks. */
  const parts = (entry: string) => {
    const bar = entry.lastIndexOf('|');
    return bar < 0
      ? null
      : { head: entry.slice(0, bar), tail: entry.slice(bar + 1) };
  };

  return {
    articulations: follow(marks.articulations, (entry) => {
      const mark = parts(entry);
      if (!mark || removed.has(mark.head)) return null;
      return renamed.has(mark.head) ? `${to(mark.head)}|${mark.tail}` : entry;
    }),
    slurs: follow(marks.slurs, (entry) => {
      const mark = parts(entry);
      if (!mark || removed.has(mark.head) || removed.has(mark.tail)) {
        return null;
      }
      if (!renamed.has(mark.head) && !renamed.has(mark.tail)) return entry;
      const [from, until] = [to(mark.head), to(mark.tail)];
      // Two ends that landed on one note no longer join anything.
      return from === until ? null : `${from}|${until}`;
    }),
    spellings: follow(marks.spellings, (entry) => {
      const mark = parts(entry);
      if (!mark || removed.has(mark.head)) return null;
      const id = renamed.get(mark.head);
      if (id === undefined) return entry;
      const spelled = spellingForPitch(mark.tail, midiOf(id));
      return spelled === null ? null : `${id}|${spelled}`;
    }),
    slashNotes: follow(marks.slashNotes, (id) =>
      removed.has(id) ? null : to(id),
    ),
  };
}
