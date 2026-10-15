/**
 * Every part in the Parts Library, read from the JSON files the console's
 * Parts editor writes into src/curriculum/data/parts/ (dev server only —
 * scripts/vite/devContentWriter.ts). Commit a file to ship it.
 *
 * Repo files for now; when the content API grows a `part` kind (and the Studio
 * reads it from the CDN) this is the one module that changes.
 */

import type { InstrumentPart } from './part';

const files = import.meta.glob<InstrumentPart>('../../data/parts/*.json', {
  eager: true,
  import: 'default',
});

const ALL: InstrumentPart[] = Object.values(files).sort((a, b) =>
  a.name.localeCompare(b.name),
);
const BY_ID = new Map(ALL.map((p) => [p.id, p]));

/** Every part file, drafts included — the back office. */
export function listParts(): readonly InstrumentPart[] {
  return ALL;
}

/** Published parts only — what the Studio and lessons may use. */
export function listLiveParts(): InstrumentPart[] {
  return ALL.filter((p) => p.status === 'live');
}

export function getPart(id: string): InstrumentPart | undefined {
  return BY_ID.get(id);
}
