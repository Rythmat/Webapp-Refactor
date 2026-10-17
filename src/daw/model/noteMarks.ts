import { parseNoteId, spellingForPitch } from './noteKeys';

// ── Marks that follow their notes ──────────────────────────────────────────
// The Score's articulations, slurs, pinned spellings and slash notes are
// kept under each note's Score key (`track:clip:startTick:midi`, noteKeys),
// so an edit that moves or re-pitches a note must carry its marks to the new
// key, or they point at nothing and the next save drops them. The Score's
// edits and the clip menu's Transpose and Quantize (milestone 2.12) both do
// it here. Pure, with no store, so the timeline can load it without the
// Score.

/** What an edit did to notes: old key → new key, and the keys it removed. */
export interface NoteMoves {
  renamed: ReadonlyMap<string, string>;
  removed: ReadonlySet<string>;
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
  { renamed, removed }: NoteMoves,
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
