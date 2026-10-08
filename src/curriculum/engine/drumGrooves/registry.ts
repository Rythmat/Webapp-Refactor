/**
 * Every designed groove, read from the JSON files the console's Drum Grooves
 * designer writes into src/curriculum/data/drumGrooves/ (dev server only —
 * scripts/vite/devContentWriter.ts). Commit a file to ship it.
 *
 * Repo files for now; when the content API grows a drum_groove kind this is
 * the one module that changes.
 */

import type { DrumGroove } from './drumGroove';

const files = import.meta.glob<DrumGroove>('../../data/drumGrooves/*.json', {
  eager: true,
  import: 'default',
});

const ALL: DrumGroove[] = Object.values(files).sort((a, b) =>
  a.name.localeCompare(b.name),
);

const BY_ID = new Map(ALL.map((g) => [g.id, g]));

/** Every groove file, drafts included — the designer and pickers. */
export function listDesignedGrooves(): readonly DrumGroove[] {
  return ALL;
}

/**
 * The groove lessons and Practice Tracks play for an id: published grooves
 * only, so a draft never reaches a student. Undefined means "use the code".
 */
export function getLiveGroove(id: string | undefined): DrumGroove | undefined {
  if (!id) return undefined;
  const groove = BY_ID.get(id);
  return groove?.status === 'live' ? groove : undefined;
}

export function getDesignedGroove(id: string): DrumGroove | undefined {
  return BY_ID.get(id);
}

// ── The Studio's grooves ───────────────────────────────────────────────────
// The Studio's Grooves-tab performances, imported from its .mid files into
// data/drumGrooves/studio/. They are real played takes (hundreds of hits with
// feel), so they load on demand rather than ride in every lesson's bundle.

const studioFiles = import.meta.glob<DrumGroove>(
  '../../data/drumGrooves/studio/*.json',
  { import: 'default' },
);

let studioCache: Promise<DrumGroove[]> | null = null;

/** The Studio's grooves, drafts included. */
export function loadStudioGrooves(): Promise<DrumGroove[]> {
  studioCache ??= Promise.all(
    Object.values(studioFiles).map((load) => load()),
  ).then((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
  return studioCache;
}

/** A published groove by id from either set — what the Studio plays. */
export async function loadLiveGroove(
  id: string,
): Promise<DrumGroove | undefined> {
  const lesson = getLiveGroove(id);
  if (lesson) return lesson;
  const studio = (await loadStudioGrooves()).find((g) => g.id === id);
  return studio?.status === 'live' ? studio : undefined;
}
