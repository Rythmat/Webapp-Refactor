/**
 * Which of the globe roster's core cells are empty: Born, City, Genres,
 * Years Active, Instruments (see shared.ts for the whole run).
 *
 *   npx tsx src/scripts/enrichment/research/gaps.ts            # the live store
 *   npx tsx src/scripts/enrichment/research/gaps.ts --repo     # the repo's files
 *
 * The live store is the source of truth since the cutover; `--repo` reads
 * `artistRegistry.ts` + `artists.json` instead, for working offline before a
 * token is at hand (its gaps are re-checked against the store at push time).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { exportKind } from './contentApi';
import {
  coreOf,
  emptyPaths,
  GAPS_FILE,
  type GapArtist,
  type GapsFile,
  writeJson,
} from './shared';

const ARTISTS_JSON = fileURLToPath(
  new URL('../../../content/data/artists.json', import.meta.url),
);

async function main() {
  const fromRepo = process.argv.includes('--repo');
  const bodies = new Map<
    string,
    { body: Record<string, unknown>; id?: string; revision?: number }
  >();

  if (fromRepo) {
    const rows = JSON.parse(readFileSync(ARTISTS_JSON, 'utf8')) as Record<
      string,
      unknown
    >[];
    for (const row of rows) bodies.set(String(row.slug), { body: row });
  } else {
    for (const row of await exportKind('artist')) {
      const body = row.pendingBody ?? row.body;
      if (body)
        bodies.set(row.slug, { body, id: row.id, revision: row.revision });
    }
  }

  const artists: GapArtist[] = [];
  let missingFromStore = 0;
  for (const entry of ARTIST_REGISTRY) {
    const stored = bodies.get(entry.slug);
    if (!stored && !fromRepo) missingFromStore++;
    const body = stored?.body ?? { slug: entry.slug };
    const current = coreOf(body);
    const group = current.group === true;
    const empty = emptyPaths(current, group);
    // `group` and `activeTo` alone are not gaps worth a lookup.
    if (!empty.some((p) => p !== 'group' && p !== 'activeTo')) continue;
    artists.push({
      slug: entry.slug,
      name: String(body.name ?? entry.name),
      group,
      ...(stored?.id ? { id: stored.id } : {}),
      ...(stored?.revision !== undefined ? { revision: stored.revision } : {}),
      current,
      empty,
    });
  }

  const out: GapsFile = {
    generatedAt: new Date().toISOString(),
    from: fromRepo ? 'repo' : 'api',
    artists,
  };
  writeJson(GAPS_FILE, out);

  const counts: Record<string, number> = {};
  for (const a of artists)
    for (const p of a.empty) counts[p] = (counts[p] ?? 0) + 1;
  console.log(
    `${artists.length} of ${ARTIST_REGISTRY.length} roster artists have a gap (from ${out.from}).`,
  );
  if (missingFromStore)
    console.log(
      `  ${missingFromStore} roster artists are not in the store at all.`,
    );
  console.log('  empty cells:', counts);
  console.log(`  → ${GAPS_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
