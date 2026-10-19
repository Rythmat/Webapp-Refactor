/**
 * Every fill checked, then merged into one plan for the push.
 *
 *   npx tsx src/scripts/enrichment/research/validateFills.ts
 *
 * Reads `_work/fills-wikipedia.json` and every `_work/fills/batch-*.json`
 * (the research agents' `{ fills, newPlaces, unresolved }`), writes
 * `_work/merged.json` (what pushFills sends) and `_work/report.md` (what the
 * owner reads: counts, what is still empty and why, new places, and a random
 * sample to spot-check against its sources).
 *
 * A fill is refused, with its reason in the report, when it is not one of the
 * artist's empty cells; when its value breaks the artist contract (the date
 * pattern, a real day, years 1850–2026, from ≤ to, born before active); when
 * it names a genre, instrument or place that does not exist; when it gives a
 * group a birthplace; when it has no source; or when it names an outside
 * catalogue. Two sources that disagree on one cell fill nothing: the cell
 * goes to the unresolved list with both.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '@/components/atlas/data/cities';
import { closeEnough, sameName } from '@/content/linking/samePlace';
import { placeRecordSchema } from '@/scripts/apiContract/recordBodySchemas';
import { createPlaceBook } from '../import/placeMap';
import {
  AGENT_FILLS_DIR,
  CORE_PATHS,
  type CorePath,
  type Fill,
  GAPS_FILE,
  type GapArtist,
  type GapsFile,
  MERGED_FILE,
  PART_OF_CITY,
  type NewPlace,
  readJson,
  REPORT_FILE,
  RESEARCH_DIR,
  type Unresolved,
  valueAt,
  WIKIPEDIA_FILE,
  WORK_DIR,
  writeJson,
} from './shared';

const VOCAB = fileURLToPath(
  new URL('../../../content/vocabulary/', import.meta.url),
);
const PLACES_JSON = fileURLToPath(
  new URL('../../../content/data/places.json', import.meta.url),
);

const idsOf = (file: string) =>
  new Set(
    (
      JSON.parse(readFileSync(join(VOCAB, file), 'utf8')) as {
        records: { id: string }[];
      }
    ).records.map((r) => r.id),
  );

const GENRES = new Set([...idsOf('genres.json'), ...idsOf('subgenres.json')]);
const INSTRUMENTS = idsOf('instruments.json');
interface KnownPlace {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
}
const KNOWN: KnownPlace[] = [
  ...CITIES.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    coordinates: c.coordinates as [number, number],
  })),
  ...(JSON.parse(readFileSync(PLACES_JSON, 'utf8')) as KnownPlace[]),
];
// Places this job already made in the store (push and City plans).
for (const file of readdirSync(join(RESEARCH_DIR, '_work')).filter((f) =>
  /^(push-\d+|pilot-plan|city-plan)\.json$/.test(f),
))
  for (const p of (
    JSON.parse(readFileSync(join(RESEARCH_DIR, '_work', file), 'utf8')) as {
      places?: KnownPlace[];
    }
  ).places ?? [])
    if (!KNOWN.some((k) => k.id === p.id)) KNOWN.push(p);
const PLACES = new Set(KNOWN.map((p) => p.id));

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
/** Every country the globe's places name, as written there. */
const COUNTRY_NAMES = new Set(KNOWN.map((p) => normalize(p.country)));

/** What a research agent writes for a place none of ours is. */
interface ProposedPlace {
  newPlace: { name: string; country: string; lat: number; lng: number };
}
const isProposed = (v: unknown): v is ProposedPlace =>
  !!v && typeof v === 'object' && 'newPlace' in (v as object);

const OUTSIDE = /musicbrainz|wikidata|wikipedia|discogs|allmusic|https?:/i;
const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
// The roster reaches back to Alfonso X (1221) and the classical composers.
const YEAR_MIN = 1000;
const YEAR_MAX = new Date().getUTCFullYear();

const realDay = (date: string): boolean => {
  const [y, m, d] = date.split('-').map(Number);
  if (!d) return true;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
};

const isYear = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= YEAR_MIN && (v as number) <= YEAR_MAX;

export interface Checked {
  ok: Fill[];
  refused: { fill: Fill; why: string }[];
}

/** One fill's own checks, in the context of the artist and the new places. */
export function checkFill(
  fill: Fill,
  artist: GapArtist | undefined,
  newPlaces: ReadonlySet<string>,
  isGroup: boolean,
): string | null {
  if (!artist) return 'not a gap artist';
  if (!CORE_PATHS.includes(fill.path)) return `not a core path: ${fill.path}`;
  if (!artist.empty.includes(fill.path)) return 'cell is not empty';
  if (
    !fill.sources?.length ||
    !fill.sources.every((s) => /^https?:\/\//.test(s.url))
  )
    return 'no source';
  const v = fill.value;
  if (typeof v === 'string' && OUTSIDE.test(v))
    return 'names an outside catalogue';
  switch (fill.path) {
    case 'group':
      return v === true ? null : 'group must be true';
    case 'born.date': {
      if (typeof v !== 'string' || !DATE.test(v))
        return `bad date ${JSON.stringify(v)}`;
      if (!realDay(v)) return `no such day ${v}`;
      const y = Number(v.slice(0, 4));
      return y >= YEAR_MIN && y <= YEAR_MAX ? null : `year out of range ${v}`;
    }
    case 'born.placeId':
    case 'basedInPlaceId':
      if (fill.path === 'born.placeId' && isGroup)
        return 'a group has no birthplace';
      if (typeof v !== 'string') return 'place id must be a string';
      return PLACES.has(v) || newPlaces.has(v) ? null : `unknown place ${v}`;
    case 'activeFrom':
    case 'activeTo':
      if (!isYear(v)) return `bad year ${JSON.stringify(v)}`;
      // "–2026" in an infobox this year is as likely a stale "present" as an
      // end; only research, citing the end, may say an act ended this year.
      if (
        fill.path === 'activeTo' &&
        v === YEAR_MAX &&
        fill.via === 'wikipedia'
      )
        return `ends this year (${v}): needs a cited end`;
      return null;
    case 'genreIds':
      if (!Array.isArray(v) || !v.length || v.length > 3)
        return 'genres: 1–3 ids';
      return v.every((g) => GENRES.has(g))
        ? null
        : `unknown genre in ${v.join(', ')}`;
    case 'instrumentIds':
      if (!Array.isArray(v) || !v.length) return 'instruments: at least one id';
      return v.every((i) => INSTRUMENTS.has(i))
        ? null
        : `unknown instrument in ${v.join(', ')}`;
  }
  return null;
}

/** Cross-cell checks on an artist's final values: years in order. */
function crossCheck(
  artist: GapArtist,
  fills: Fill[],
  _isGroup: boolean,
): { fill: Fill; why: string }[] {
  const at = (path: CorePath) =>
    fills.find((f) => f.path === path)?.value ?? valueAt(artist.current, path);
  const from = at('activeFrom') as number | undefined;
  const to = at('activeTo') as number | undefined;
  const born = at('born.date') as string | undefined;
  const bornYear = born ? Number(born.slice(0, 4)) : undefined;
  const out: { fill: Fill; why: string }[] = [];
  const blame = (paths: CorePath[], why: string) => {
    for (const f of fills)
      if (paths.includes(f.path)) out.push({ fill: f, why });
  };
  if (from !== undefined && to !== undefined && to < from)
    blame(['activeFrom', 'activeTo'], `active ${from}–${to} runs backwards`);
  if (bornYear !== undefined && from !== undefined) {
    if (bornYear > from)
      blame(
        ['born.date', 'activeFrom'],
        `born ${bornYear}, active from ${from}`,
      );
  }
  return out;
}

interface AgentBatch {
  /** Artists whose Wikipedia article the agent found to be another act. */
  rejectWikipedia?: string[];
  fills?: Fill[];
  newPlaces?: NewPlace[];
  unresolved?: Unresolved[];
}

function main() {
  const gaps = readJson<GapsFile>(GAPS_FILE);
  // Credited people (queue batch-101…) are gap artists too: their queue
  // entry says which cells are empty.
  const QUEUE = join(WORK_DIR, 'queue');
  for (const file of existsSync(QUEUE)
    ? readdirSync(QUEUE).filter((f) => /^batch-1\d\d\.json$/.test(f))
    : [])
    for (const q of readJson<
      {
        slug: string;
        name: string;
        group: boolean;
        known: GapArtist['current'];
        todo: CorePath[];
      }[]
    >(join(QUEUE, file)))
      if (!gaps.artists.some((a) => a.slug === q.slug))
        gaps.artists.push({
          slug: q.slug,
          name: q.name,
          group: q.group,
          current: q.known,
          empty: [...q.todo, ...(q.group ? [] : (['group'] as CorePath[]))],
        });
  const bySlug = new Map(gaps.artists.map((a) => [a.slug, a]));

  const fills: Fill[] = [];
  const newPlaces = new Map<string, NewPlace>();
  const unresolved: Unresolved[] = [];
  const rejected = new Set<string>();
  const refused: { fill: Fill; why: string }[] = [];

  if (existsSync(WIKIPEDIA_FILE)) {
    const wp = readJson<{
      newPlaces: NewPlace[];
      artists: {
        fills: Fill[];
        hints: Unresolved[];
        conflicts: Unresolved[];
      }[];
    }>(WIKIPEDIA_FILE);
    for (const p of wp.newPlaces) newPlaces.set(p.slug, p);
    for (const a of wp.artists) fills.push(...a.fills);
  }
  const batches = existsSync(AGENT_FILLS_DIR)
    ? readdirSync(AGENT_FILLS_DIR)
        .filter((f) => /^batch-.*\.json$/.test(f))
        .sort()
    : [];
  for (const file of batches) {
    const batch = readJson<AgentBatch>(join(AGENT_FILLS_DIR, file));
    for (const slug of batch.rejectWikipedia ?? []) rejected.add(slug);
    for (const f of batch.fills ?? []) {
      if (/wrong identity|\bnot the same (act|person)\b/i.test(f.note ?? ''))
        rejected.add(f.slug);
      fills.push({ ...f, via: 'research' });
    }
    for (const p of batch.newPlaces ?? []) {
      const parsed = placeRecordSchema.safeParse(p.body);
      if (!parsed.success) {
        unresolved.push({
          slug: p.slug,
          path: 'basedInPlaceId',
          why: `new place ${p.slug} refused: ${parsed.error.issues[0]?.message}`,
        });
        continue;
      }
      if (PLACES.has(p.slug)) continue; // already ours: the fill just points at it
      newPlaces.set(p.slug, p);
    }
    for (const u of batch.unresolved ?? []) unresolved.push(u);
  }

  // Places an agent proposed by name: one of ours if it is, else made once.
  const book = createPlaceBook({
    reserved: new Set([...PLACES, ...newPlaces.keys()]),
  });
  const candidates: KnownPlace[] = [
    ...KNOWN,
    ...[...newPlaces.values()].map((p) => ({
      id: p.slug,
      name: String(p.body.name),
      country: String(p.body.country),
      coordinates: p.body.coordinates as [number, number],
    })),
  ];
  for (const f of fills) {
    if (!isProposed(f.value)) continue;
    const { name, country, lat, lng } = f.value.newPlace;
    const coordinates: [number, number] = [lat, lng];
    const mine = candidates.find(
      (p) =>
        sameName(p.name, name) &&
        closeEnough(
          { country: p.country, coordinates: p.coordinates },
          { country, coordinates },
        ),
    );
    if (mine) {
      f.value = mine.id;
      continue;
    }
    const match = book.place({ name, country, coordinates });
    if (match.kind === 'none') {
      unresolved.push({
        slug: f.slug,
        path: f.path,
        why: `place ${name}, ${country}: ${match.reason}`,
        sources: f.sources,
      });
      f.value = undefined;
      continue;
    }
    f.value = match.placeId;
  }
  // A country is never a City or a birthplace ("Mali", "China"): those are
  // the infobox saying it doesn't know the town.
  const isCountry = (p: { body: Record<string, unknown> }) =>
    normalize(String(p.body.name)) === normalize(String(p.body.country)) ||
    COUNTRY_NAMES.has(normalize(String(p.body.name)));
  for (const [slug, place] of [...newPlaces]) {
    if (!isCountry(place)) continue;
    newPlaces.delete(slug);
    for (const f of fills)
      if (f.value === slug) {
        unresolved.push({
          slug: f.slug,
          path: f.path,
          why: `source gives only a country (${String(place.body.name)})`,
          sources: f.sources,
        });
        f.value = undefined;
      }
  }
  for (const place of book.created())
    if (!newPlaces.has(place.slug))
      newPlaces.set(place.slug, {
        slug: place.slug,
        body: place.body as unknown as Record<string, unknown>,
        sources: fills
          .filter((f) => f.value === place.slug)
          .flatMap((f) => f.sources),
      });
  for (const slug of [...newPlaces.keys()])
    if (isCountry(newPlaces.get(slug)!))
      for (const f of fills)
        if (f.value === slug) {
          unresolved.push({
            slug: f.slug,
            path: f.path,
            why: `source gives only a country (${String(newPlaces.get(slug)!.body.name)})`,
            sources: f.sources,
          });
          f.value = undefined;
        }
  for (const slug of [...newPlaces.keys()])
    if (isCountry(newPlaces.get(slug)!)) newPlaces.delete(slug);
  for (let i = fills.length - 1; i >= 0; i--)
    if (fills[i].value === undefined) fills.splice(i, 1);

  // A City or birthplace is the city: a borough or neighbourhood becomes
  // the city it is in (owner, 2026-10-16).
  for (const f of fills) {
    const city =
      (f.path === 'basedInPlaceId' || f.path === 'born.placeId') &&
      typeof f.value === 'string'
        ? PART_OF_CITY[f.value]
        : undefined;
    if (!city) continue;
    f.note = [f.note, `${f.value} is part of ${city}`]
      .filter(Boolean)
      .join('; ');
    f.value = city;
  }

  // Cells checked by hand and found wrong: `_work/exclude.json`, a list of
  // { slug, path?, why } (no path: every cell of that artist).
  const EXCLUDE = join(WORK_DIR, 'exclude.json');
  const excluded = existsSync(EXCLUDE)
    ? readJson<{ slug: string; path?: CorePath; why: string }[]>(EXCLUDE)
    : [];
  for (let i = fills.length - 1; i >= 0; i--) {
    const f = fills[i];
    const hit = excluded.find(
      (x) => x.slug === f.slug && (!x.path || x.path === f.path),
    );
    if (!hit) continue;
    unresolved.push({
      slug: f.slug,
      path: f.path,
      why: `excluded by hand: ${hit.why}`,
      sources: f.sources,
    });
    fills.splice(i, 1);
  }

  // One value per cell: agreeing sources merge, disagreeing ones fill nothing.
  const cells = new Map<string, Fill[]>();
  for (const f of fills) {
    const k = `${f.slug}\u0000${f.path}`;
    cells.set(k, [...(cells.get(k) ?? []), f]);
  }
  const merged: Fill[] = [];
  for (const list of cells.values()) {
    const distinct = new Set(list.map((f) => JSON.stringify(f.value)));
    if (distinct.size === 1) {
      merged.push({
        ...list[0],
        sources: list.flatMap((f) => f.sources),
        via: list.some((f) => f.via === 'research') ? 'research' : list[0].via,
      });
    } else {
      // Research ran after Wikipedia and saw its value: an agent's answer for
      // a cell Wikipedia filled stands only when the agent says why.
      const research = list.filter((f) => f.via === 'research' && f.note);
      if (research.length === 1) merged.push(research[0]);
      else
        unresolved.push({
          slug: list[0].slug,
          path: list[0].path,
          why: `sources disagree: ${[...distinct].join(' vs ')}`,
          sources: list.flatMap((f) => f.sources),
        });
    }
  }

  // Identity guard: an act cannot have an event on the globe from before it
  // was born or began. A Wikipedia article whose years start well after the
  // act's first event is another act (the 2008 "Franco" for Franco Luambo,
  // a DJ for Hector Berlioz): every Wikipedia value for it goes to research.
  // A year or three off is a disagreement about one year, not identity.
  const FIRST_EVENTS = join(WORK_DIR, 'first-events.json');
  const firstEvent: Record<string, number> = existsSync(FIRST_EVENTS)
    ? readJson<Record<string, number>>(FIRST_EVENTS)
    : {};
  const yearOf = (f: Fill): number | null =>
    f.path === 'born.date'
      ? Number(String(f.value).slice(0, 4))
      : f.path === 'activeFrom'
        ? Number(f.value)
        : null;
  const wrongAct = new Set<string>(rejected);
  // Research that replaced a Wikipedia birth or start year by more than ten
  // years found the article was another act (Hector Berlioz, not the DJ).
  for (const list of cells.values()) {
    const wp = list.find((f) => f.via === 'wikipedia');
    const rs = list.find((f) => f.via === 'research');
    if (!wp || !rs || (wp.path !== 'born.date' && wp.path !== 'activeFrom'))
      continue;
    const a = Number(String(wp.value).slice(0, 4));
    const b = Number(String(rs.value).slice(0, 4));
    if (Math.abs(a - b) > 10) wrongAct.add(wp.slug);
  }
  for (const f of merged) {
    const y = yearOf(f);
    const first = firstEvent[f.slug];
    if (y === null || first === undefined || y <= first) continue;
    // A person born after their own event cannot be them; a group's "born"
    // is when it formed, which a predecessor band's event can precede.
    const isGroup = Boolean(
      bySlug.get(f.slug)?.group ||
        merged.some((g) => g.slug === f.slug && g.path === 'group'),
    );
    const impossible =
      f.path === 'born.date' && !isGroup ? y > first : y - first > 10;
    if (impossible && f.via === 'wikipedia') wrongAct.add(f.slug);
    else
      refused.push({
        fill: f,
        why: `${y} is after the act's first event (${first})`,
      });
  }
  for (let i = merged.length - 1; i >= 0; i--) {
    const f = merged[i];
    const tooLate = (yearOf(f) ?? 0) > (firstEvent[f.slug] ?? Infinity);
    if (
      (wrongAct.has(f.slug) && f.via === 'wikipedia') ||
      (tooLate && !wrongAct.has(f.slug))
    ) {
      if (wrongAct.has(f.slug) && f.via === 'wikipedia')
        unresolved.push({
          slug: f.slug,
          path: f.path,
          why: `Wikipedia article is likely another act (its years start after the act's first event, ${firstEvent[f.slug]}): ${JSON.stringify(f.value)} not used`,
          sources: f.sources,
        });
      merged.splice(i, 1);
    }
  }

  const placeIds = new Set(newPlaces.keys());
  const ok: Fill[] = [];
  const perArtist = new Map<string, Fill[]>();
  for (const f of merged) {
    const artist = bySlug.get(f.slug);
    const groupFill = merged.some(
      (g) => g.slug === f.slug && g.path === 'group',
    );
    const isGroup = Boolean(artist?.group || groupFill);
    const why = checkFill(f, artist, placeIds, isGroup);
    if (why) refused.push({ fill: f, why });
    else perArtist.set(f.slug, [...(perArtist.get(f.slug) ?? []), f]);
  }
  for (const [slug, list] of perArtist) {
    const artist = bySlug.get(slug)!;
    const isGroup = artist.group || list.some((f) => f.path === 'group');
    const bad = crossCheck(artist, list, isGroup);
    const badSet = new Set(bad.map((b) => b.fill));
    refused.push(...bad);
    ok.push(...list.filter((f) => !badSet.has(f)));
  }

  // Only the new places a kept fill points at.
  const used = new Set(
    ok.map((f) => f.value).filter((v) => typeof v === 'string'),
  );
  const places = [...newPlaces.values()].filter((p) => used.has(p.slug));

  writeJson(MERGED_FILE, {
    generatedAt: new Date().toISOString(),
    gapsFrom: gaps.from,
    newPlaces: places,
    fills: ok,
  });

  // ── The report ──
  const filled = new Set(ok.map((f) => `${f.slug}\u0000${f.path}`));
  const stillEmpty: Record<string, string[]> = {};
  for (const a of gaps.artists)
    for (const p of a.empty) {
      if (p === 'activeTo' || p === 'group') continue; // absent can be right
      if (!filled.has(`${a.slug}\u0000${p}`))
        (stillEmpty[p] ??= []).push(a.slug);
    }
  const count = (path: string) => ok.filter((f) => f.path === path).length;
  const sample = [...ok].sort(() => Math.random() - 0.5).slice(0, 30);
  const lines = [
    `# Artist research fill: report`,
    '',
    `Generated ${new Date().toISOString()} from gaps of the ${gaps.from === 'api' ? 'live store' : 'repo files'}; ${gaps.artists.length} roster artists had a gap.`,
    '',
    '## Fills by column',
    '',
    '| Column | Filled | Still empty |',
    '|---|---|---|',
    ...CORE_PATHS.map(
      (p) =>
        `| ${p} | ${count(p)} | ${p === 'activeTo' || p === 'group' ? '— (absent can be right)' : (stillEmpty[p]?.length ?? 0)} |`,
    ),
    '',
    `By source: ${['wikipedia', 'research', 'importer'].map((v) => `${v} ${ok.filter((f) => f.via === v).length}`).join(', ')}. New places to create: ${places.length}. Refused: ${refused.length}. Unresolved: ${unresolved.length}.`,
    '',
    '## Spot-check sample (30 at random)',
    '',
    ...sample.map(
      (f) =>
        `- **${f.slug}** ${f.path} = \`${JSON.stringify(f.value)}\` — ${f.sources.map((s) => `[${s.field}](${s.url})`).join(', ')}${f.note ? ` (${f.note})` : ''}`,
    ),
    '',
    '## New places',
    '',
    ...places.map(
      (p) =>
        `- ${p.slug}: ${String(p.body.name)}, ${String(p.body.country)} ${JSON.stringify(p.body.coordinates)}`,
    ),
    '',
    '## Unresolved (for the owner)',
    '',
    ...unresolved.map((u) => `- **${u.slug}** ${u.path}: ${u.why}`),
    '',
    '## Refused by validation',
    '',
    ...refused.map(
      (r) =>
        `- **${r.fill.slug}** ${r.fill.path} = \`${JSON.stringify(r.fill.value)}\` (${r.fill.via}): ${r.why}`,
    ),
    '',
    '## Still empty',
    '',
    ...Object.entries(stillEmpty).map(
      ([p, slugs]) => `- **${p}** (${slugs.length}): ${slugs.join(', ')}`,
    ),
    '',
  ];
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, lines.join('\n'));

  console.log(
    `${ok.length} fills kept, ${refused.length} refused, ${unresolved.length} unresolved, ${places.length} new places.`,
  );
  for (const p of CORE_PATHS)
    console.log(
      `  ${p}: ${count(p)} filled, ${stillEmpty[p]?.length ?? '-'} still empty`,
    );
  console.log(`  → ${MERGED_FILE}\n  → ${REPORT_FILE}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
