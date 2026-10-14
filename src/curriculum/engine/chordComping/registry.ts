/**
 * Every chord comping pattern, read from the JSON files the console's Chord
 * Comping editor writes into src/curriculum/data/chordComping/ (dev server
 * only — scripts/vite/devContentWriter.ts). Commit a file to ship it.
 */

import type { ChordComping } from './chordComping';

const files = import.meta.glob<ChordComping>('../../data/chordComping/*.json', {
  eager: true,
  import: 'default',
});

const ALL: ChordComping[] = Object.values(files).sort(byOrder);
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function byOrder(a: ChordComping, b: ChordComping): number {
  return (
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

/** Every pattern file, drafts included. */
export function listCompings(): readonly ChordComping[] {
  return ALL;
}

export function getComping(id: string): ChordComping | undefined {
  return BY_ID.get(id);
}

/** Published patterns only, so a draft never reaches a student. */
export function getLiveComping(
  id: string | undefined,
): ChordComping | undefined {
  if (!id) return undefined;
  const c = BY_ID.get(id);
  return c?.status === 'live' ? c : undefined;
}
