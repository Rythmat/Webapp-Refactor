/**
 * Copy and paste in the Parts editor's roll: ⌘C copies the selected notes,
 * ⌘V pastes them at the playhead, the earliest copied note on it and the
 * rest as they were around it. The copy is kept for the session, so a
 * phrase goes from one part into another (another part's editor, or the same
 * part opened in a band).
 *
 * The Studio's roll has no note clipboard of its own (its copy and paste are
 * the arrange view's, for clips); this is the console's, over the selection
 * the roll reports.
 */

import type { PartNote } from '@/curriculum/engine/parts/part';

let copied: readonly PartNote[] = [];

/** The notes at `indices` (the roll's selection), kept to paste. */
export function copyNotes(
  notes: readonly PartNote[],
  indices: readonly number[],
): number {
  const picked = indices
    .map((i) => notes[i])
    .filter((n): n is PartNote => Boolean(n));
  if (picked.length) copied = picked.map((n) => ({ ...n }));
  return picked.length;
}

/** How many notes are waiting to be pasted. */
export const copiedCount = () => copied.length;

/** The copied notes moved to start at `tick`, in their spacing. */
export function notesAt(notes: readonly PartNote[], tick: number): PartNote[] {
  if (!notes.length) return [];
  const first = Math.min(...notes.map((n) => n.tick));
  const shift = Math.max(0, Math.round(tick)) - first;
  return notes.map((n) => ({ ...n, tick: n.tick + shift }));
}

/**
 * `notes` with the copy pasted at `tick`. A pasted note landing on one
 * already there (same pitch, same time) isn't doubled. The pasted notes go
 * after the others, so what the roll has selected stays the same notes.
 */
export function pasteNotes(
  notes: readonly PartNote[],
  tick: number,
): { notes: PartNote[]; pasted: number } {
  const there = new Set(notes.map((n) => `${n.tick}:${n.midi}`));
  const added = notesAt(copied, tick).filter(
    (n) => !there.has(`${n.tick}:${n.midi}`),
  );
  return { notes: [...notes, ...added], pasted: added.length };
}
