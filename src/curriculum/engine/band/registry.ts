/**
 * Every band, read from the JSON files the console's Band editor writes into
 * src/curriculum/data/bands/ (dev server only — scripts/vite/devContentWriter.ts).
 * Commit a file to ship it. Repo files for now; this is the one module that
 * changes when the content API carries bands.
 */

import { getBassLine, getLiveBassLine } from '../bassLines/registry';
import { getComping, getLiveComping } from '../chordComping/registry';
import { getAnyGroove, getLiveGroove } from '../drumGrooves/registry';
import { getPart } from '../parts/registry';
import type { Band } from './band';
import type { BandItems } from './realize';

const files = import.meta.glob<Band>('../../data/bands/*.json', {
  eager: true,
  import: 'default',
});

export function byOrder(a: Band, b: Band): number {
  return (
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

const BANDS = new Map<string, Band>(
  Object.values(files).map((band) => [band.id, band]),
);

/** Every band file, drafts included — the back office. */
export function listBands(): Band[] {
  return [...BANDS.values()].sort(byOrder);
}

export function getBand(id: string | undefined): Band | undefined {
  return id ? BANDS.get(id) : undefined;
}

/** Published bands only, so a draft never reaches a student. */
export function getLiveBand(id: string | undefined): Band | undefined {
  const band = getBand(id);
  return band?.status === 'live' ? band : undefined;
}

/**
 * The console's save, applied here at once so lessons opened in the same
 * session hear it before the dev server's reload; `null` forgets a deleted one.
 */
export function rememberBand(id: string, band: Band | null): void {
  if (band) BANDS.set(id, band);
  else BANDS.delete(id);
}

/** What lessons and Practice Tracks may play: published items only. */
export const LIVE_ITEMS: BandItems = {
  groove: (id) => getLiveGroove(id),
  bassLine: (id) => getLiveBassLine(id),
  comping: (id) => getLiveComping(id),
  part: (id) => {
    const part = getPart(id);
    return part?.status === 'live' ? part : undefined;
  },
};

/** What the console previews: drafts too. */
export const ALL_ITEMS: BandItems = {
  groove: (id) => getAnyGroove(id),
  bassLine: (id) => getBassLine(id),
  comping: (id) => getComping(id),
  part: (id) => getPart(id),
};
