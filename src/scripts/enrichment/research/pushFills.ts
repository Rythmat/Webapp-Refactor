/**
 * The merged fills into the live store, through the content API: the same
 * `PUT /items` a Table cell sends, one item at a time.
 *
 *   CONTENT_API_TOKEN=… npx tsx src/scripts/enrichment/research/pushFills.ts
 *       [--apply] [--only slug,slug] [--limit N]
 *
 * A dry run (the default) reads the store and prints every change it would
 * make; `--apply` makes them. Before anything it checks `/capabilities`: the
 * store must serve `artist` (schema 2 for Born) and `globe_city`, and have
 * `/export`; otherwise it stops.
 *
 * Never over a stored value: each artist is re-read just before its write and
 * only cells still empty are set, with `expectedRevision` (one retry on a
 * conflict, re-reading first). An item with a proposal waiting is passed
 * over and listed, as the Table's bulk writer does, since approving the
 * proposal would undo the write. New hometowns (`pin: false` places) are
 * made first, never over a place already there. Each save carries a note
 * for the item's history; nothing is published — the owner releases.
 */
import {
  capabilities,
  ContentApiError,
  exportKind,
  getItem,
  type ItemDetail,
  lookupItem,
  saveItem,
} from './contentApi';
import {
  type CorePath,
  type Fill,
  isEmpty,
  MERGED_FILE,
  type NewPlace,
  PUSH_LOG,
  readJson,
  setPath,
  valueAt,
  coreOf,
  writeJson,
} from './shared';

const NOTE =
  'Research fill 2026-10: Born, City, Genres, Years Active, Instruments (sourced)';

interface Merged {
  newPlaces: NewPlace[];
  fills: Fill[];
}

interface LogEntry {
  slug: string;
  kind: 'artist' | 'globe_city';
  outcome: 'written' | 'would-write' | 'skipped' | 'failed';
  set?: Partial<Record<CorePath, unknown>>;
  why?: string;
}

async function gate() {
  let caps: Awaited<ReturnType<typeof capabilities>>;
  try {
    caps = await capabilities();
  } catch (error) {
    throw new Error(
      `No /capabilities from the content API: ${(error as Error).message}`,
    );
  }
  const kinds = new Map(
    (caps.kinds ?? []).map((k) =>
      typeof k === 'string' ? [k, 1] : [k.kind, k.schemaVersion ?? 1],
    ),
  );
  const problems: string[] = [];
  if (!caps.features?.export) problems.push('features.export is off');
  if (!kinds.has('artist')) problems.push('the store does not serve `artist`');
  else if ((kinds.get('artist') ?? 1) < 2)
    problems.push(
      `artist.schemaVersion is ${kinds.get('artist')}, Born needs 2`,
    );
  if (!kinds.has('globe_city'))
    problems.push('the store does not serve `globe_city`');
  const canMakePlaces = Boolean(caps.features?.create || caps.features?.lookup);
  console.log(
    `Capabilities: kinds ${[...kinds].map(([k, v]) => `${k}@${v}`).join(', ')}; features ${
      Object.entries(caps.features ?? {})
        .filter(([, on]) => on)
        .map(([f]) => f)
        .join(', ') || 'none'
    }.`,
  );
  if (problems.length)
    throw new Error(
      `Stopping, the store is not ready:\n  - ${problems.join('\n  - ')}`,
    );
  return { create: Boolean(caps.features?.create), canMakePlaces };
}

/** The body with only still-empty cells set; null when nothing changes. */
function planBody(
  body: Record<string, unknown>,
  fills: Fill[],
): {
  body: Record<string, unknown>;
  set: Partial<Record<CorePath, unknown>>;
} | null {
  const next = structuredClone(body);
  const current = coreOf(body);
  const isGroup = body.group === true || fills.some((f) => f.path === 'group');
  const set: Partial<Record<CorePath, unknown>> = {};
  for (const f of fills) {
    if (f.path === 'group' && body.group === true) continue;
    if (f.path !== 'group' && !isEmpty(valueAt(current, f.path))) continue;
    if (f.path === 'born.placeId' && isGroup) continue;
    setPath(next, f.path, f.value);
    set[f.path] = f.value;
  }
  return Object.keys(set).length ? { body: next, set } : null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const only = args.includes('--only')
    ? new Set(args[args.indexOf('--only') + 1].split(','))
    : null;
  const limit = Number(args[args.indexOf('--limit') + 1]) || Infinity;

  const flags = await gate();
  const merged = readJson<Merged>(MERGED_FILE);
  const bySlug = new Map<string, Fill[]>();
  for (const f of merged.fills) {
    if (only && !only.has(f.slug)) continue;
    bySlug.set(f.slug, [...(bySlug.get(f.slug) ?? []), f]);
  }
  const slugs = [...bySlug.keys()].sort().slice(0, limit);
  const rows = new Map((await exportKind('artist')).map((r) => [r.slug, r]));
  const log: LogEntry[] = [];

  // 1. The places the chosen fills point at, made first.
  const wanted = new Set(
    slugs.flatMap((s) =>
      bySlug
        .get(s)!
        .filter((f) => f.path === 'born.placeId' || f.path === 'basedInPlaceId')
        .map((f) => f.value as string),
    ),
  );
  const unmade = new Set<string>();
  const storedPlaces = new Set(
    (await exportKind('globe_city')).map((r) => r.slug),
  );
  for (const place of merged.newPlaces.filter((p) => wanted.has(p.slug))) {
    if (storedPlaces.has(place.slug)) continue;
    if (!flags.canMakePlaces) {
      unmade.add(place.slug);
      log.push({
        slug: place.slug,
        kind: 'globe_city',
        outcome: 'skipped',
        why: 'store cannot create safely',
      });
      continue;
    }
    if (!apply) {
      log.push({
        slug: place.slug,
        kind: 'globe_city',
        outcome: 'would-write',
      });
      console.log(
        `  + place ${place.slug}: ${String(place.body.name)}, ${String(place.body.country)}`,
      );
      continue;
    }
    try {
      if (!flags.create) {
        const there = await lookupItem('globe_city', place.slug).catch(
          (e: unknown) => {
            if (e instanceof ContentApiError && e.status === 404) return null;
            throw e;
          },
        );
        if (there) {
          unmade.add(place.slug);
          log.push({
            slug: place.slug,
            kind: 'globe_city',
            outcome: 'skipped',
            why: 'slug taken by another place',
          });
          continue;
        }
      }
      await saveItem({
        kind: 'globe_city',
        slug: place.slug,
        body: place.body,
        note: NOTE,
        ...(flags.create ? { create: true } : {}),
      });
      log.push({ slug: place.slug, kind: 'globe_city', outcome: 'written' });
      console.log(`  + place ${place.slug}`);
    } catch (error) {
      unmade.add(place.slug);
      log.push({
        slug: place.slug,
        kind: 'globe_city',
        outcome: 'failed',
        why: (error as Error).message,
      });
      console.log(`  ! place ${place.slug}: ${(error as Error).message}`);
    }
  }

  // 2. The artists, one at a time.
  let written = 0;
  for (const slug of slugs) {
    const row = rows.get(slug);
    const fills = bySlug
      .get(slug)!
      .filter((f) => !(typeof f.value === 'string' && unmade.has(f.value)));
    if (!row?.body) {
      log.push({
        slug,
        kind: 'artist',
        outcome: 'skipped',
        why: 'not in the store',
      });
      continue;
    }
    if (row.editState === 'pending' || row.pendingBody) {
      log.push({
        slug,
        kind: 'artist',
        outcome: 'skipped',
        why: 'a proposal is waiting',
      });
      continue;
    }
    const write = async (attempt: number): Promise<void> => {
      const fresh: ItemDetail = apply
        ? await getItem(row.id)
        : { id: row.id, body: row.body!, revision: row.revision };
      const plan = planBody(fresh.body, fills);
      if (!plan) {
        log.push({
          slug,
          kind: 'artist',
          outcome: 'skipped',
          why: 'nothing left empty',
        });
        return;
      }
      if (!apply) {
        log.push({
          slug,
          kind: 'artist',
          outcome: 'would-write',
          set: plan.set,
        });
        console.log(
          `  ~ ${slug}: ${Object.entries(plan.set)
            .map(([p, v]) => `${p}=${JSON.stringify(v)}`)
            .join('  ')}`,
        );
        return;
      }
      try {
        await saveItem({
          kind: 'artist',
          slug,
          body: plan.body,
          note: NOTE,
          ...(fresh.revision !== undefined
            ? { expectedRevision: fresh.revision }
            : {}),
        });
        written++;
        log.push({ slug, kind: 'artist', outcome: 'written', set: plan.set });
        console.log(`  ✓ ${slug}: ${Object.keys(plan.set).join(', ')}`);
      } catch (error) {
        if (
          error instanceof ContentApiError &&
          error.code === 'REVISION_CONFLICT' &&
          attempt === 0
        )
          return write(1);
        log.push({
          slug,
          kind: 'artist',
          outcome: 'failed',
          why: (error as Error).message,
        });
        console.log(`  ! ${slug}: ${(error as Error).message}`);
      }
    };
    await write(0);
  }

  writeJson(PUSH_LOG, { at: new Date().toISOString(), apply, log });
  const tally: Record<string, number> = {};
  for (const e of log)
    tally[`${e.kind} ${e.outcome}`] =
      (tally[`${e.kind} ${e.outcome}`] ?? 0) + 1;
  console.log(
    apply ? `Written: ${written} artists.` : 'Dry run: nothing written.',
    tally,
  );
  console.log(`  → ${PUSH_LOG}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
