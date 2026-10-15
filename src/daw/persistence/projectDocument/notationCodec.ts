// ── Score and Lead Sheet marks in the stored project ────────────────────
// The Score and the Lead Sheet key a note's marks by where the note sits,
// `${trackId}:${clipId}:${startTick}:${midi}` (model/noteKeys.ts). That key
// changes with any edit to the note, so the stored project keys marks by
// note id instead, which only the note itself carries (model/noteIds.ts).
// This module translates: Score keys to note ids on save, note ids back to
// Score keys on load. Memory and collab keep the Score keys.
//
// Stored, by note id:
// - articulations `${noteId}|${kind}`
// - slurs         `${fromId}|${toId}`
// - spellings     `${noteId}|${spelled}`, a pinned spelling such as "F♯4"
// - slashNotes    `${noteId}`
//
// Marks whose note is gone (orphans) are dropped on save and counted, never
// stored. In memory they used to pile up and could come back on a new note
// that landed where the old one sat. A spelling whose pitch class no longer
// matches its note's is dropped too: the engraver ignores it anyway. One that
// still fits is written in the octave its note sounds (spellingForPitch). Two
// notes on one tick and pitch share a Score key; the first of them in
// (startTick, note) order owns it, which, that order being a stable sort, is
// the first in the clip.
//
// A mark is stored under the id ensureProjectNoteIds(tracks) gives its note.
// For a project whose ids are whole, as the store keeps them, that is the id
// the note has; a note without a whole id (none yet, or one an earlier note
// also has) gets the id that call derives for it. So a codec must store those
// same ids with the notes: pass the tracks through ensureProjectNoteIds once,
// then write their ids and hand the same tracks here. It is deterministic and
// hands back the same array when the ids are whole, so a save still mints
// nothing.
//
// Both directions are pure and never mint: saving the same project twice
// gives the same marks.

import {
  ensureProjectNoteIds,
  isNoteId,
  type NoteId,
} from '@/daw/model/noteIds';
import { noteKey, spellingForPitch } from '@/daw/model/noteKeys';
import type { Track } from '@/daw/store/tracksSlice';

/** The note-keyed marks as the project document stores them. */
export interface PersistedNoteMarks {
  articulations: string[];
  slurs: string[];
  spellings: string[];
  slashNotes: string[];
}

/** The same marks as the store holds them, keyed by Score note key. */
export interface NoteMarksInMemory {
  scoreArticulations: string[];
  scoreSlurs: string[];
  scoreSpellings: string[];
  scoreSlashNotes: string[];
}

/** A note as the marks see it: who it is, where it sits, what it sounds. */
interface MarkedNote {
  id: NoteId;
  key: string;
  midi: number;
}

/**
 * Every note, indexed by `by`, under the id ensureProjectNoteIds gives it
 * (see the top of this file). The first note to claim an index keeps it: for
 * Score keys that is the first of two notes on one tick and pitch.
 */
function indexNotes(
  tracks: readonly Track[],
  by: 'id' | 'key',
): Map<string, MarkedNote> {
  const index = new Map<string, MarkedNote>();
  // It never changes the tracks: a copy, when it makes one, is only read here.
  for (const track of ensureProjectNoteIds(tracks as Track[])) {
    for (const clip of track.midiClips) {
      for (const event of clip.events) {
        // Every id is whole by now; this only narrows the type.
        if (!isNoteId(event.id)) continue;
        const note: MarkedNote = {
          id: event.id,
          key: noteKey(track.id, clip.id, event.startTick, event.note),
          midi: event.note,
        };
        if (!index.has(note[by])) index.set(note[by], note);
      }
    }
  }
  return index;
}

/** A stored list, whatever shape it arrived in: only its strings count. */
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/** `head|tail` split at the '|' found by `bar`; null when there is none. */
function split(
  entry: string,
  bar: number,
): { head: string; tail: string } | null {
  return bar < 0
    ? null
    : { head: entry.slice(0, bar), tail: entry.slice(bar + 1) };
}

/** No marks in any of the four lists: nothing to translate. */
const noEntries = (...lists: unknown[]) =>
  lists.every((list) => !Array.isArray(list) || list.length === 0);

/**
 * Translate each entry; `translate` returns null for an entry it can't place
 * (an orphan). A translated entry that repeats is kept once, where it first
 * appeared.
 */
function translateAll(
  entries: readonly string[],
  translate: (entry: string) => string | null,
  onOrphan: () => void,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const next = translate(entry);
    if (next === null) {
      onOrphan();
      continue;
    }
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

/**
 * One spelling per note: the last, which is the one the Score reads
 * (spellingMap lets a later entry win). `owner` reads an entry's note.
 */
function lastSpellingPerNote(
  entries: readonly string[],
  owner: (entry: string) => string,
): string[] {
  const owners = new Set<string>();
  const kept: string[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const note = owner(entries[i]);
    if (owners.has(note)) continue;
    owners.add(note);
    kept.push(entries[i]);
  }
  return kept.reverse();
}

/**
 * The marks in memory, keyed by note id for the stored project, and how many
 * were dropped because their note is gone (or, for a spelling, because the
 * note no longer sounds that pitch class). Each mark goes under the id
 * `ensureProjectNoteIds(tracks)` gives its note, so store those ids with the
 * notes (see the top of this file).
 */
export function encodeNoteMarks(
  marks: NoteMarksInMemory,
  tracks: readonly Track[],
): { marks: PersistedNoteMarks; orphans: number } {
  // Most projects have no marks: no need to index their notes on every save.
  if (
    noEntries(
      marks.scoreArticulations,
      marks.scoreSlurs,
      marks.scoreSpellings,
      marks.scoreSlashNotes,
    )
  ) {
    return {
      marks: { articulations: [], slurs: [], spellings: [], slashNotes: [] },
      orphans: 0,
    };
  }
  const byKey = indexNotes(tracks, 'key');
  let orphans = 0;
  const orphan = () => {
    orphans++;
  };
  // In memory an entry's Score key comes first and its kind or spelling
  // last, neither of which holds a '|', so the last '|' is the split (as the
  // Score reads them: parseArticulation, parseSlur, spellingMap).
  const parts = (entry: string) => split(entry, entry.lastIndexOf('|'));

  const articulations = translateAll(
    strings(marks.scoreArticulations),
    (entry) => {
      const mark = parts(entry);
      const note = mark && byKey.get(mark.head);
      return mark && note ? `${note.id}|${mark.tail}` : null;
    },
    orphan,
  );
  const slurs = translateAll(
    strings(marks.scoreSlurs),
    (entry) => {
      const mark = parts(entry);
      const from = mark && byKey.get(mark.head);
      const to = mark && byKey.get(mark.tail);
      return from && to && from.id !== to.id ? `${from.id}|${to.id}` : null;
    },
    orphan,
  );
  const spellings = lastSpellingPerNote(
    translateAll(
      strings(marks.scoreSpellings),
      (entry) => {
        const mark = parts(entry);
        const note = mark && byKey.get(mark.head);
        if (!mark || !note) return null;
        const spelled = spellingForPitch(mark.tail, note.midi);
        return spelled === null ? null : `${note.id}|${spelled}`;
      },
      orphan,
    ),
    (entry) => entry.slice(0, entry.indexOf('|')),
  );
  const slashNotes = translateAll(
    strings(marks.scoreSlashNotes),
    (entry) => byKey.get(entry)?.id ?? null,
    orphan,
  );
  return { marks: { articulations, slurs, spellings, slashNotes }, orphans };
}

/**
 * Stored marks back onto the Score's note keys of the loaded `tracks`, whose
 * notes already carry their ids (settled by ensureProjectNoteIds, as the
 * encoder settles them). A mark whose note didn't come back (or, for a
 * spelling, no longer sounds that pitch class) is dropped.
 */
export function decodeNoteMarks(
  marks: PersistedNoteMarks,
  tracks: readonly Track[],
): NoteMarksInMemory {
  const stored: Partial<PersistedNoteMarks> = marks ?? {};
  if (
    noEntries(
      stored.articulations,
      stored.slurs,
      stored.spellings,
      stored.slashNotes,
    )
  ) {
    return {
      scoreArticulations: [],
      scoreSlurs: [],
      scoreSpellings: [],
      scoreSlashNotes: [],
    };
  }
  const byId = indexNotes(tracks, 'id');
  const ignore = () => {};
  // A stored entry starts with a note id, which never holds a '|', so the
  // first '|' is the split.
  const parts = (entry: string) => split(entry, entry.indexOf('|'));

  const scoreArticulations = translateAll(
    strings(stored.articulations),
    (entry) => {
      const mark = parts(entry);
      const note = mark && byId.get(mark.head);
      return mark && note ? `${note.key}|${mark.tail}` : null;
    },
    ignore,
  );
  const scoreSlurs = translateAll(
    strings(stored.slurs),
    (entry) => {
      const mark = parts(entry);
      const from = mark && byId.get(mark.head);
      const to = mark && byId.get(mark.tail);
      return from && to && from.key !== to.key ? `${from.key}|${to.key}` : null;
    },
    ignore,
  );
  const scoreSpellings = lastSpellingPerNote(
    translateAll(
      strings(stored.spellings),
      (entry) => {
        const mark = parts(entry);
        const note = mark && byId.get(mark.head);
        if (!mark || !note) return null;
        const spelled = spellingForPitch(mark.tail, note.midi);
        return spelled === null ? null : `${note.key}|${spelled}`;
      },
      ignore,
    ),
    (entry) => entry.slice(0, entry.lastIndexOf('|')),
  );
  const scoreSlashNotes = translateAll(
    strings(stored.slashNotes),
    (entry) => byId.get(entry)?.key ?? null,
    ignore,
  );
  return { scoreArticulations, scoreSlurs, scoreSpellings, scoreSlashNotes };
}
