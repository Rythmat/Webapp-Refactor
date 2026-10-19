/**
 * The year of each artist's earliest globe event, from the repo's event
 * bodies (the same `artistIds` the store holds): the identity guard's
 * reference. Writes `_work/first-events.json`.
 *
 *   npx tsx src/scripts/enrichment/research/firstEvents.ts
 */
import { join } from 'node:path';
import { loadRepoStore } from '@/scripts/repoContent/repoStore';
import { WORK_DIR, writeJson } from './shared';

const store = await loadRepoStore();
const first: Record<string, number> = {};
for (const item of store.items()) {
  if (item.kind !== 'globe_event') continue;
  const body = item.body as { year?: number; artistIds?: string[] };
  const year = Number(body.year);
  if (!year) continue;
  for (const a of body.artistIds ?? [])
    if (!(a in first) || year < first[a]) first[a] = year;
}
writeJson(join(WORK_DIR, 'first-events.json'), first);
console.log(`${Object.keys(first).length} artists with events.`);
