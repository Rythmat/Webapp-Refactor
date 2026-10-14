/**
 * Every bass line, read from the JSON files the console's Bass Lines editor
 * writes into src/curriculum/data/bassLines/ (dev server only —
 * scripts/vite/devContentWriter.ts). Commit a file to ship it.
 *
 * Repo files for now; when the content API grows a bass_line kind this is the
 * one module that changes.
 */

import type { BassLine } from './bassLine';

const files = import.meta.glob<BassLine>('../../data/bassLines/*.json', {
  eager: true,
  import: 'default',
});

const ALL: BassLine[] = Object.values(files).sort(byOrder);

/** The order Peter keeps them in, then by name; new lines go last. */
export function byOrder(a: BassLine, b: BassLine): number {
  return (
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

/** Every bass line file, drafts included. */
export function listBassLines(): readonly BassLine[] {
  return ALL;
}

const BY_ID = new Map(ALL.map((l) => [l.id, l]));

/**
 * The line lessons and Practice Tracks play for an id: published lines only,
 * so a draft never reaches a student.
 */
export function getLiveBassLine(id: string | undefined): BassLine | undefined {
  if (!id) return undefined;
  const line = BY_ID.get(id);
  return line?.status === 'live' ? line : undefined;
}
