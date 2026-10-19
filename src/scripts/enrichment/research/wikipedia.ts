/**
 * Wikipedia pass: each gap artist's English Wikipedia infobox → fills for
 * the empty core cells, every one with the article and field it came from.
 *
 *   npx tsx src/scripts/enrichment/research/wikipedia.ts [--limit N] [--only slug,slug]
 *
 * Reads `_work/gaps.json` (gaps.ts), writes `_work/fills-wikipedia.json`.
 * Requests go one a second with the importer's polite client and are kept in
 * `enrichment/_cache/wikipedia/` (gitignored), so a rerun is offline.
 *
 * Finding the article: the Wikidata item the importer matched (its enwiki
 * sitelink) first, then the name, then the name with " (band)",
 * " (musician)", " (singer)", " (rapper)", " (group)". A page counts only if
 * it is not a disambiguation page, its lead has a music infobox, and its
 * title, infobox name or the redirect that reached it is the artist's name
 * (an importer-matched item is trusted as is).
 *
 * What is never guessed: an instrument the infobox names only generically
 * ("guitar", "keyboards", "saxophone") is handed to research as a hint; a
 * genre or place that maps to nothing is reported; a circa date is skipped.
 * A value that disagrees with an undecided importer suggestion is not
 * filled: it goes to research as a conflict, with both sources.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '@/components/atlas/data/cities';
import { normalizeArtistName } from '@/content/graph/slugs';
import { closeEnough, sameName } from '@/content/linking/samePlace';
import { cachedGetter, createFileCache } from '../import/fileCache';
import { genreIdOf, mapGenre } from '../import/genreMap';
import { mapInstrument } from '../import/instrumentMap';
import { MB_USER_AGENT } from '../import/musicbrainz';
import { CACHE_DIR } from '../import/paths';
import { createPlaceBook, type PlaceMatch } from '../import/placeMap';
import { createPoliteHttp } from '../import/politeHttp';
import {
  findInfobox,
  type Infobox,
  type Link,
  listItems,
  parseBirthDate,
  parsePlace,
  parseYearsActive,
  plain,
  saysGroup,
} from './infobox';
import {
  type CorePath,
  type Fill,
  GAPS_FILE,
  type GapsFile,
  type NewPlace,
  readJson,
  type Source,
  type Unresolved,
  WIKIPEDIA_FILE,
  WORK_DIR,
  writeJson,
} from './shared';

const WP_API = 'https://en.wikipedia.org/w/api.php';
const WD_API = 'https://www.wikidata.org/w/api.php';
const SUGGESTIONS = fileURLToPath(
  new URL('../suggestions/artists.json', import.meta.url),
);
const DECISIONS = fileURLToPath(
  new URL('../suggestions/decisions.json', import.meta.url),
);
const PLACES_JSON = fileURLToPath(
  new URL('../../../content/data/places.json', import.meta.url),
);

const http = createPoliteHttp({
  userAgent: `${MB_USER_AGENT.replace(/\/1\.0/, '-ContentResearch/1.0')}`,
  minIntervalMs: 1000,
  backoffMs: 5000,
  timeoutMs: 60_000,
  log: (line) => console.log(line),
});
const mediawikiError = (body: unknown): string | null => {
  const error = (body as { error?: { code?: string } } | null)?.error;
  return error ? (error.code ?? 'error') : null;
};
const get = cachedGetter(http, createFileCache(join(CACHE_DIR, 'wikipedia')), {
  refusal: mediawikiError,
});

const qs = (params: Record<string, string>) =>
  new URLSearchParams({
    format: 'json',
    formatversion: '2',
    ...params,
  }).toString();

async function json<T>(url: string): Promise<T> {
  const res = await get(url);
  if (!res || res.status !== 200) throw new Error(`no answer: ${url}`);
  return res.body as T;
}

const chunks = <T>(list: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const articleUrl = (title: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/* ── Importer hints ───────────────────────────────────────────────────── */

interface Suggestion {
  id: string;
  target: { slug: string };
  path: string;
  value: unknown;
  tier: string;
  sources: { url: string; label?: string }[];
}

function importerHints() {
  const { suggestions } = readJson<{ suggestions: Suggestion[] }>(SUGGESTIONS);
  const decided = new Set(
    readJson<{ decisions: { suggestionId: string }[] }>(
      DECISIONS,
    ).decisions.map((d) => d.suggestionId),
  );
  const qid = new Map<string, string>();
  const open = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    if (s.path === 'externalIds.wikidata' && typeof s.value === 'string')
      qid.set(s.target.slug, s.value);
    if (decided.has(s.id) || s.path.startsWith('externalIds')) continue;
    const list = open.get(s.target.slug) ?? [];
    list.push(s);
    open.set(s.target.slug, list);
  }
  return { qid, open };
}

/* ── Finding the article ──────────────────────────────────────────────── */

interface PageInfo {
  title: string;
  missing?: boolean;
  pageprops?: { disambiguation?: string; wikibase_item?: string };
  coordinates?: { lat: number; lon: number }[];
}

interface QueryAnswer {
  query?: {
    pages?: PageInfo[];
    redirects?: { from: string; to: string }[];
    normalized?: { from: string; to: string }[];
  };
}

/** Title → its page (after normalisation and redirects), for many titles. */
async function pagesFor(
  titles: readonly string[],
  props = 'pageprops',
): Promise<Map<string, { page: PageInfo; redirected: boolean }>> {
  const out = new Map<string, { page: PageInfo; redirected: boolean }>();
  for (const batch of chunks([...new Set(titles)].sort(), 50)) {
    const answer = await json<QueryAnswer>(
      `${WP_API}?${qs({
        action: 'query',
        redirects: '1',
        prop: props,
        ppprop: 'disambiguation|wikibase_item',
        titles: batch.join('|'),
      })}`,
    );
    const q = answer.query ?? {};
    const byTitle = new Map((q.pages ?? []).map((p) => [p.title, p]));
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((q.redirects ?? []).map((r) => [r.from, r.to]));
    for (const title of batch) {
      const normal = norm.get(title) ?? title;
      const final = redir.get(normal) ?? normal;
      const page = byTitle.get(final);
      if (page) out.set(title, { page, redirected: final !== normal });
    }
  }
  return out;
}

async function enwikiTitles(
  qids: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunks([...new Set(qids)].sort(), 50)) {
    const answer = await json<{
      entities?: Record<string, { sitelinks?: { enwiki?: { title: string } } }>;
    }>(
      `${WD_API}?${qs({
        action: 'wbgetentities',
        ids: batch.join('|'),
        props: 'sitelinks',
        sitefilter: 'enwiki',
      })}`,
    );
    for (const [id, entity] of Object.entries(answer.entities ?? {})) {
      const title = entity.sitelinks?.enwiki?.title;
      if (title) out.set(id, title);
    }
  }
  return out;
}

async function leadWikitext(title: string): Promise<string | null> {
  const res = await get(
    `${WP_API}?${qs({
      action: 'parse',
      page: title,
      prop: 'wikitext',
      section: '0',
      redirects: '1',
    })}`,
  ).catch(() => null);
  const body = res?.body as { parse?: { wikitext?: string } } | undefined;
  return body?.parse?.wikitext ?? null;
}

const SUFFIXES = [
  ' (band)',
  ' (musician)',
  ' (singer)',
  ' (rapper)',
  ' (group)',
];

const key = (s: string) =>
  normalizeArtistName(s.replace(/\s*\(.*\)\s*$/, '')).replace(/^the /, '');

const isMusicBox = (box: Infobox) =>
  /musical artist|band|musician|singer|rapper/.test(box.template) ||
  Boolean(
    box.params.genre ||
      box.params.instrument ||
      box.params.instruments ||
      box.params.years_active ||
      box.params.background,
  );

interface Article {
  title: string;
  box: Infobox;
  how: 'wikidata' | 'name' | 'suffix';
}

/* ── Places ───────────────────────────────────────────────────────────── */

const US_STATES = new Set(
  'alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada new-hampshire new-jersey new-mexico new-york north-carolina north-dakota ohio oklahoma oregon pennsylvania rhode-island south-carolina south-dakota tennessee texas utah vermont virginia washington west-virginia wisconsin wyoming d.c. dc washington-d.c.'
    .split(' ')
    .map((s) => s.replace(/-/g, ' ')),
);
const CA_PROVINCES = new Set([
  'ontario',
  'quebec',
  'british columbia',
  'alberta',
  'manitoba',
  'saskatchewan',
  'nova scotia',
  'new brunswick',
  'newfoundland and labrador',
  'prince edward island',
]);
const AU_STATES = new Set([
  'new south wales',
  'victoria',
  'queensland',
  'western australia',
  'south australia',
  'tasmania',
]);

/** The country a place's last written part names, as text. */
function countryFromParts(parts: readonly string[]): string | null {
  for (let i = parts.length - 1; i >= 1; i--) {
    const p = parts[i].toLowerCase().replace(/\.$/, '').trim();
    if (US_STATES.has(p) || /^u\.?s\.?a?$/.test(p)) return 'United States';
    if (CA_PROVINCES.has(p)) return 'Canada';
    if (AU_STATES.has(p) && i === parts.length - 1) return 'Australia';
    if (p && !/\d/.test(p)) return parts[i];
  }
  return null;
}

/**
 * The articles a place field points at: its links, or — for the many
 * infoboxes that write places unlinked ("Ariton, Alabama, U.S.") — the
 * titles Wikipedia gives such towns: "Ariton, Alabama", then "Ariton".
 */
function placeLinksOf(parsed: { links: Link[]; parts: string[] }): Link[] {
  if (parsed.links.length) return parsed.links;
  const [town, area] = parsed.parts;
  if (!town) return [];
  return [
    ...(area && parsed.parts.length > 2
      ? [{ target: `${town}, ${area}`, label: town }]
      : []),
    { target: town, label: town },
  ];
}

const NOT_A_TOWN =
  /hospital|clinic|infirmary|medical|maternity|county$|shire$|province$|parish$|region$|^(united states|england|scotland|wales|canada|australia)$/i;

interface PlacePick {
  match: PlaceMatch;
  name: string;
  source: Source;
}

interface KnownPlace {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
}

function knownPlaces(): KnownPlace[] {
  const extra = JSON.parse(readFileSync(PLACES_JSON, 'utf8')) as KnownPlace[];
  return [
    ...CITIES.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      coordinates: c.coordinates as [number, number],
    })),
    ...extra,
  ];
}

/** The country (P17) a Wikidata place is in today, as its English label. */
async function countryToday(item: string): Promise<string | null> {
  const claims = await json<{
    claims?: {
      P17?: { mainsnak?: { datavalue?: { value?: { id?: string } } } }[];
    };
  }>(
    `${WD_API}?${qs({ action: 'wbgetclaims', entity: item, property: 'P17' })}`,
  ).catch(() => null);
  const id = claims?.claims?.P17?.[0]?.mainsnak?.datavalue?.value?.id;
  if (!id) return null;
  const labels = await json<{
    entities?: Record<string, { labels?: { en?: { value: string } } }>;
  }>(
    `${WD_API}?${qs({ action: 'wbgetentities', ids: id, props: 'labels', languages: 'en' })}`,
  ).catch(() => null);
  return labels?.entities?.[id]?.labels?.en?.value ?? null;
}

/* ── Genres the importer's table spells otherwise ─────────────────────── */

const VOCAB_DIR = fileURLToPath(
  new URL('../../../content/vocabulary/', import.meta.url),
);
const vocabNames = new Map<string, string>();
for (const file of ['genres.json', 'subgenres.json']) {
  const { records } = JSON.parse(
    readFileSync(join(VOCAB_DIR, file), 'utf8'),
  ) as {
    records: { id: string; name: string }[];
  };
  for (const r of records) {
    vocabNames.set(normalizeArtistName(r.name).replace(/ music$/, ''), r.id);
    vocabNames.set(normalizeArtistName(r.id.replace(/-/g, ' ')), r.id);
  }
}
/** Wikipedia's article names for a vocabulary entry named otherwise. */
const GENRE_ALIASES: Record<string, string> = {
  'east coast hip hop': 'east-coast-rap',
};

/**
 * Ids whose name is also a plain word an infobox uses in another sense:
 * taken only when the field links the article that means our id ("Romantic"
 * for a pop balladeer is not the classical period).
 */
const NEEDS_LINK: Record<string, RegExp> = {
  romantic: /^romantic music$|^romanticism$/i,
};

function genreId(item: { text: string; link: Link | null }): string | null {
  const id = genreIdUnchecked(item);
  if (id && NEEDS_LINK[id] && !NEEDS_LINK[id].test(item.link?.target ?? ''))
    return null;
  return id;
}

function genreIdUnchecked(item: {
  text: string;
  link: Link | null;
}): string | null {
  for (const name of [item.link?.target, item.text]) {
    if (!name) continue;
    const resolved = mapGenre(name);
    if (resolved) return genreIdOf(resolved);
    const k = normalizeArtistName(name).replace(/ music$/, '');
    const id = GENRE_ALIASES[k] ?? vocabNames.get(k);
    if (id) return id;
  }
  return null;
}

/* ── The pass ─────────────────────────────────────────────────────────── */

interface ArtistResult {
  slug: string;
  title: string | null;
  url: string | null;
  how?: Article['how'];
  fills: Fill[];
  hints: Unresolved[];
  conflicts: Unresolved[];
  unmapped: { genres: string[]; instruments: string[]; places: string[] };
}

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args[args.indexOf('--limit') + 1]) || Infinity;
  const only = args.includes('--only')
    ? new Set(args[args.indexOf('--only') + 1].split(','))
    : null;

  const gaps = readJson<GapsFile>(GAPS_FILE);
  const FIRST_EVENTS = join(WORK_DIR, 'first-events.json');
  const firstEvents: Record<string, number> = existsSync(FIRST_EVENTS)
    ? readJson<Record<string, number>>(FIRST_EVENTS)
    : {};
  const artists = gaps.artists
    .filter((a) => !only || only.has(a.slug))
    .slice(0, limit);
  const { qid, open } = importerHints();
  console.log(`Wikipedia pass over ${artists.length} artists.`);

  // 1. Candidate titles.
  const titleOfQid = await enwikiTitles(
    artists.map((a) => qid.get(a.slug)).filter((q): q is string => !!q),
  );
  const candidates = new Map<
    string,
    { title: string; how: Article['how'] }[]
  >();
  for (const a of artists) {
    const list: { title: string; how: Article['how'] }[] = [];
    const q = qid.get(a.slug);
    if (q && titleOfQid.has(q))
      list.push({ title: titleOfQid.get(q)!, how: 'wikidata' });
    list.push({ title: a.name, how: 'name' });
    for (const s of SUFFIXES) list.push({ title: a.name + s, how: 'suffix' });
    candidates.set(a.slug, list);
  }
  const pages = await pagesFor(
    [...candidates.values()].flat().map((c) => c.title),
  );

  // 2. The article: the first candidate that is a music act with the name.
  const articles = new Map<string, Article>();
  let n = 0;
  for (const a of artists) {
    n++;
    if (n % 50 === 0) console.log(`  articles: ${n}/${artists.length}`);
    for (const c of candidates.get(a.slug)!) {
      const hit = pages.get(c.title);
      if (
        !hit ||
        hit.page.missing ||
        hit.page.pageprops?.disambiguation !== undefined
      )
        continue;
      const text = await leadWikitext(hit.page.title);
      const box = text ? findInfobox(text) : null;
      if (!box || !isMusicBox(box)) continue;
      const named =
        c.how === 'wikidata' ||
        key(hit.page.title) === key(a.name) ||
        key(plain(box.params.name ?? '')) === key(a.name) ||
        (c.how === 'name' && hit.redirected);
      if (!named) continue;
      articles.set(a.slug, { title: hit.page.title, box, how: c.how });
      break;
    }
  }
  console.log(`  found ${articles.size} of ${artists.length} articles.`);

  // 3. Places named in the infoboxes: their coordinates and items.
  const placeLinks = new Set<string>();
  for (const art of articles.values()) {
    for (const field of ['birth_place', 'origin']) {
      const v = art.box.params[field];
      if (!v) continue;
      const parsed = parsePlace(v);
      for (const l of parsed ? placeLinksOf(parsed) : [])
        placeLinks.add(l.target);
    }
  }
  const placePages = await pagesFor([...placeLinks], 'coordinates|pageprops');

  const known = knownPlaces();
  const reserved = new Set(known.map((p) => p.id));
  const book = createPlaceBook({ reserved });
  const newPlaceSources = new Map<string, Source[]>();

  const pickPlace = async (
    value: string,
    field: string,
    title: string,
  ): Promise<PlacePick | { none: string }> => {
    const parsed = parsePlace(value);
    if (!parsed) return { none: `${field}: empty` };
    const country = countryFromParts(parsed.parts);
    const source: Source = {
      url: articleUrl(title),
      field: `infobox ${field}`,
    };
    const synthetic = placeLinksOf(parsed);
    const links: (Link | null)[] = synthetic.length ? synthetic : [null];
    for (const link of links) {
      const name = link
        ? link.label.replace(/,.*$/, '').trim() ||
          link.target.replace(/,.*$/, '')
        : parsed.parts[0];
      if (
        !name ||
        NOT_A_TOWN.test(name) ||
        (link && NOT_A_TOWN.test(link.target))
      )
        continue;
      const info = link ? placePages.get(link.target)?.page : undefined;
      const c = info?.coordinates?.[0];
      const coordinates: [number, number] | null = c ? [c.lat, c.lon] : null;
      // One of ours already (a pin or a hometown made before)?
      const mine = known.find(
        (p) =>
          sameName(p.name, name) &&
          (coordinates
            ? closeEnough(
                { country: p.country, coordinates: p.coordinates },
                { country, coordinates },
              )
            : country
              ? normalizeArtistName(p.country) ===
                  normalizeArtistName(country) ||
                closeEnough(
                  { country: p.country, coordinates: p.coordinates },
                  { country, coordinates: p.coordinates },
                )
              : false),
      );
      if (mine)
        return {
          match: { kind: 'existing', placeId: mine.id, name: mine.name },
          name,
          source,
        };
      const item = info?.pageprops?.wikibase_item ?? null;
      let match = book.place({ name, country, coordinates, wikidata: item });
      // "British Nigeria", "West Germany": the place's country today.
      if (match.kind === 'none' && item) {
        const today = await countryToday(item);
        if (today)
          match = book.place({
            name,
            country: today,
            coordinates,
            wikidata: item,
          });
      }
      if (match.kind === 'none') continue;
      if (match.kind === 'create') {
        const list = newPlaceSources.get(match.place.slug) ?? [];
        list.push({
          url: articleUrl(info?.title ?? name),
          field: 'coordinates',
        });
        newPlaceSources.set(match.place.slug, list);
      }
      return { match, name, source };
    }
    return { none: `${field}: "${plain(value)}" maps to no place` };
  };

  // 4. Facts → fills, empty cells only.
  const results: ArtistResult[] = [];
  for (const a of artists) {
    const art = articles.get(a.slug);
    const result: ArtistResult = {
      slug: a.slug,
      title: art?.title ?? null,
      url: art ? articleUrl(art.title) : null,
      ...(art ? { how: art.how } : {}),
      fills: [],
      hints: [],
      conflicts: [],
      unmapped: { genres: [], instruments: [], places: [] },
    };
    results.push(result);
    if (!art) continue;
    const p = art.box.params;
    const src = (field: string): Source[] => [
      { url: articleUrl(art.title), field: `infobox ${field}` },
    ];
    const wants = (path: CorePath) => a.empty.includes(path);
    const said = saysGroup(art.box);
    const group = a.group || said === true;
    const fill = (
      path: CorePath,
      value: unknown,
      sources: Source[],
      note?: string,
    ) => {
      if (!wants(path)) return;
      result.fills.push({
        slug: a.slug,
        path,
        value,
        sources,
        via: 'wikipedia',
        ...(note ? { note } : {}),
      });
    };

    if (!a.group && said === true)
      fill(
        'group',
        true,
        src('background'),
        'Wikipedia files it as a group or band',
      );

    const years = p.years_active ? parseYearsActive(p.years_active) : null;
    if (years) {
      if (years.from !== null)
        fill('activeFrom', years.from, src('years_active'));
      if (years.to !== null) fill('activeTo', years.to, src('years_active'));
    }

    if (group) {
      const formed = p.formed ?? p.founded;
      const year = formed ? parseYearsActive(formed)?.from : years?.from;
      // (null when only a decade is given)
      if (year)
        fill(
          'born.date',
          String(year),
          src(formed ? 'formed' : 'years_active'),
          'year formed',
        );
    } else if (p.birth_date) {
      const date = parseBirthDate(p.birth_date);
      if (date) fill('born.date', date, src('birth_date'));
    }

    const settle = async (path: CorePath, field: string, value: string) => {
      const pick = await pickPlace(value, field, art.title);
      if ('none' in pick) {
        result.unmapped.places.push(pick.none);
        return;
      }
      if (pick.match.kind === 'none') return;
      fill(
        path,
        pick.match.placeId,
        [pick.source],
        pick.match.kind === 'create' ? `new place: ${pick.name}` : undefined,
      );
    };
    if (!group && p.birth_place && wants('born.placeId'))
      await settle('born.placeId', 'birth_place', p.birth_place);
    if (wants('basedInPlaceId')) {
      // A group's origin is where it formed. A person's City is where they
      // grew up (owner, 2026-10-16), which the infobox's origin (often the
      // scene) does not say: research reads the early-life section.
      if (p.origin && group) await settle('basedInPlaceId', 'origin', p.origin);
      else if (p.origin)
        result.hints.push({
          slug: a.slug,
          path: 'basedInPlaceId',
          why: `infobox origin is ${plain(p.origin)}, which may be the scene: find where they grew up`,
          sources: src('origin'),
        });
      else
        // No origin: the hometown or scene is the article's to say, not the
        // birthplace's (Dylan was born in Duluth, grew up in Hibbing, and his
        // scene was New York). Research reads the article for it.
        result.hints.push({
          slug: a.slug,
          path: 'basedInPlaceId',
          why: `infobox has no origin${p.birth_place ? `; born in ${plain(p.birth_place)}` : ''}: find where they grew up`,
          sources: src(p.birth_place ? 'birth_place' : 'name'),
        });
    }

    if (p.genre && wants('genreIds')) {
      const ids: string[] = [];
      for (const item of listItems(p.genre)) {
        const id = genreId(item);
        if (!id) {
          result.unmapped.genres.push(item.text);
          continue;
        }
        if (!ids.includes(id)) ids.push(id);
      }
      if (ids.length) fill('genreIds', ids.slice(0, 3), src('genre'));
    }

    if (!group && wants('instrumentIds')) {
      const raw = p.instrument ?? p.instruments;
      const ids: string[] = [];
      const generic: string[] = [];
      for (const item of raw ? listItems(raw) : []) {
        const id =
          (item.link && mapInstrument(item.link.target)) ||
          mapInstrument(item.text);
        if (id) {
          if (!ids.includes(id)) ids.push(id);
        } else if (
          /guitar|keyboard|sax|bass|synth|drum|horn|vocal/i.test(item.text)
        ) {
          generic.push(item.text);
        } else result.unmapped.instruments.push(item.text);
      }
      const occupation = listItems(p.occupation ?? p.occupations ?? '')
        .map((i) => i.text)
        .join(' ')
        .toLowerCase();
      const sings = /singer|vocalist|rapper|mc\b/.test(occupation);
      if (sings && !ids.includes('lead-vocals') && !generic.length && !raw)
        ids.push('lead-vocals');
      if (generic.length)
        result.hints.push({
          slug: a.slug,
          path: 'instrumentIds',
          why: `generic instrument(s) to make specific: ${generic.join(', ')}; mapped so far: ${ids.join(', ') || 'none'}`,
          sources: src('instrument'),
        });
      else if (ids.length)
        fill('instrumentIds', ids, src(raw ? 'instrument' : 'occupation'));
    }

    // A "Name (musician)" guess is another act unless its dates fit the
    // act's own events on the globe; with no dates to compare, it is only
    // a lead for research (the 2010s DJ "Berlioz (musician)" for Hector).
    if (art.how === 'suffix') {
      const first = firstEvents[a.slug];
      const years = result.fills
        .filter((f) => f.path === 'born.date' || f.path === 'activeFrom')
        .map((f) => Number(String(f.value).slice(0, 4)));
      const fits =
        first !== undefined &&
        years.length > 0 &&
        years.every((y) => y <= first + 10);
      if (!fits) {
        for (const f of result.fills)
          result.hints.push({
            slug: a.slug,
            path: f.path,
            why: `article "${art.title}" was found by guessing its title and its dates ${first === undefined ? 'cannot be checked' : `do not fit the act's first event (${first})`}: confirm it is this act before using ${JSON.stringify(f.value)}`,
            sources: f.sources,
          });
        result.fills = [];
      }
    }

    // An article under another name (a band's frontman, a duo for one of
    // its two) may be another act: its values are research's to confirm.
    if (key(art.title) !== key(a.name)) {
      for (const f of result.fills)
        result.hints.push({
          slug: a.slug,
          path: f.path,
          why: `article is titled "${art.title}", not "${a.name}": confirm it is this act before using ${JSON.stringify(f.value)}`,
          sources: f.sources,
        });
      result.fills = [];
    }

    // 5. Against the importer's undecided suggestions.
    const theirs = open.get(a.slug) ?? [];
    result.fills = result.fills.filter((f) => {
      const s = theirs.find((t) => t.path === f.path);
      if (!s) return true;
      const agree =
        JSON.stringify(s.value) === JSON.stringify(f.value) ||
        (f.path === 'born.date' &&
          String(s.value).slice(0, 4) === String(f.value).slice(0, 4) &&
          String(f.value).length >= String(s.value).length);
      if (agree) {
        f.sources.push(
          ...s.sources.map((x) => ({
            url: x.url,
            field: x.label ?? 'importer',
          })),
        );
        f.note = [f.note, 'agrees with the importer']
          .filter(Boolean)
          .join('; ');
        return true;
      }
      result.conflicts.push({
        slug: a.slug,
        path: f.path,
        why: `Wikipedia says ${JSON.stringify(f.value)}, the importer ${JSON.stringify(s.value)}`,
        sources: [
          ...f.sources,
          ...s.sources.map((x) => ({
            url: x.url,
            field: x.label ?? 'importer',
          })),
        ],
      });
      return false;
    });
  }

  const created = book.created();
  const newPlaces: NewPlace[] = created
    .filter((pl) =>
      results.some((r) => r.fills.some((f) => f.value === pl.slug)),
    )
    .map((pl) => ({
      slug: pl.slug,
      body: pl.body as unknown as Record<string, unknown>,
      sources: newPlaceSources.get(pl.slug) ?? [],
    }));

  writeJson(WIKIPEDIA_FILE, {
    generatedAt: new Date().toISOString(),
    gapsFrom: gaps.from,
    newPlaces,
    artists: results,
  });

  const byPath: Record<string, number> = {};
  for (const r of results)
    for (const f of r.fills) byPath[f.path] = (byPath[f.path] ?? 0) + 1;
  console.log(`  fills by column:`, byPath);
  console.log(
    `  conflicts: ${results.reduce((s, r) => s + r.conflicts.length, 0)}, instrument hints: ${results.reduce((s, r) => s + r.hints.length, 0)}, new places: ${newPlaces.length}`,
  );
  console.log(
    `  requests: ${http.stats.requests} (cache hits ${get.stats.hits})`,
  );
  console.log(`  → ${WIKIPEDIA_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
