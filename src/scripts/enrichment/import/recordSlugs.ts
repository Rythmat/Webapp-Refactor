import { toSlug } from '@/content/graph/slugs';

/**
 * The slugs the song half hands the records it asks to have made — releases,
 * labels, studios and people — kept for good (finding: slugs that move
 * between runs).
 *
 * A record's slug is in its suggestion's id: an Album row's id is the
 * release's slug, a Studio or Label row's the value's, a Label row's target
 * the release's. Worked out from the whole set each run, a later import that
 * met a namesake or a second self-titled album would rename `x` to
 * `x-1982`: a rejected row would come back under a new id, and an accepted
 * one would return as a second `releases[]` entry or a duplicate record.
 *
 * So `emit` keeps a committed ledger (`suggestions/record-slugs.json`): each
 * MusicBrainz id with the slug it was given. It reads the ledger, gives every
 * id it already lists the same slug, gives a new id a slug nobody in the
 * ledger has, and writes the ledger back with the new ones added — never
 * one taken away, so a slug once handed out is never handed to another.
 */

export type SlugKind = 'release' | 'label' | 'studio' | 'artist';

/** MusicBrainz id (a release group's, for a release) → slug, per kind. */
export type SlugLedger = Record<SlugKind, Record<string, string>>;

export const SLUG_KINDS: readonly SlugKind[] = [
  'release',
  'label',
  'studio',
  'artist',
];

export const emptyLedger = (): SlugLedger => ({
  release: {},
  label: {},
  studio: {},
  artist: {},
});

const own = (record: Readonly<Record<string, string>>, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

/** The ledger read from its file's text; an unreadable one is refused, not guessed at. */
export function parseLedger(text: string): SlugLedger {
  const parsed = JSON.parse(text) as { slugs?: Partial<SlugLedger> };
  const ledger = emptyLedger();
  for (const kind of SLUG_KINDS) {
    const entries = parsed.slugs?.[kind] ?? {};
    for (const [mbid, slug] of Object.entries(entries)) {
      if (typeof slug !== 'string' || !slug)
        throw new Error(`record-slugs.json: ${kind} ${mbid} has no slug`);
      ledger[kind][mbid] = slug;
    }
  }
  return ledger;
}

/** The ledger with the slugs of this run added: never one taken away. */
export function mergeLedger(
  ledger: SlugLedger,
  added: Partial<Record<SlugKind, ReadonlyMap<string, string>>>,
): SlugLedger {
  const out = emptyLedger();
  for (const kind of SLUG_KINDS) {
    const all = { ...ledger[kind] };
    for (const [mbid, slug] of added[kind] ?? []) all[mbid] ??= slug;
    for (const mbid of Object.keys(all).sort()) out[kind][mbid] = all[mbid];
  }
  return out;
}

/** The ledger's file: sorted, so the same ledger is always the same bytes. */
export function ledgerJson(ledger: SlugLedger, artifactsVersion: number) {
  return `${JSON.stringify(
    {
      artifactsVersion,
      about:
        'The slug each MusicBrainz id was given when emit first asked for its record: ' +
        'read and only ever added to, so suggestion ids stay put between imports.',
      slugs: mergeLedger(ledger, {}),
    },
    null,
    2,
  )}\n`;
}

/** 'GB' → 'uk', as the globe spells the country; other codes lowercased. */
const countryPart = (code: string | null | undefined) =>
  code ? (code.toUpperCase() === 'GB' ? 'uk' : toSlug(code)) : '';

export interface SlugOptions {
  /** Slugs an earlier emit gave, by MusicBrainz id (the ledger's). */
  known?: Readonly<Record<string, string>>;
  /** Slugs other records have already: the ones the backend holds. */
  taken?: ReadonlySet<string>;
}

/**
 * Hand out slugs: a known id keeps its slug (unless another record has
 * since taken it); the rest get one nobody uses, from the whole set at once
 * so none depends on the order they were met. `suffixes` lists what a new
 * one may add to its base to tell it from a namesake, first choice first;
 * the first 8 of its MusicBrainz id is always the last.
 */
function assignSlugs<T extends { mbid: string }>(
  items: readonly T[],
  baseOf: (item: T) => string,
  suffixOf: (item: T, group: readonly T[]) => string,
  { known = {}, taken = new Set() }: SlugOptions,
): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set([...taken, ...Object.values(known)]);
  const byBase = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.mbid.localeCompare(b.mbid))) {
    const slug = own(known, item.mbid);
    if (slug && !taken.has(slug)) {
      out.set(item.mbid, slug);
      continue;
    }
    const base = baseOf(item) || item.mbid.slice(0, 8);
    byBase.set(base, [...(byBase.get(base) ?? []), item]);
  }
  for (const [base, group] of byBase) {
    if (group.length === 1 && !used.has(base)) {
      out.set(group[0].mbid, base);
      used.add(base);
      continue;
    }
    const wanted = group.map((item) => suffixOf(item, group));
    for (const [n, item] of group.entries()) {
      const suffix = wanted[n];
      const alone = !!suffix && wanted.filter((w) => w === suffix).length === 1;
      let slug =
        alone && !used.has(`${base}-${suffix}`)
          ? `${base}-${suffix}`
          : `${base}-${item.mbid.slice(0, 8)}`;
      if (used.has(slug)) slug = `${base}-${item.mbid}`;
      out.set(item.mbid, slug);
      used.add(slug);
    }
  }
  return out;
}

/**
 * Slugs for labels or studios: `toSlug(name)` alone; a namesake (Columbia
 * in the US and in the UK, or a record the backend already has under that
 * name) takes `-<country>`; still two, `-<first 8 of the MBID>`.
 */
export function assignRecordSlugs(
  items: readonly { mbid: string; name: string; country?: string | null }[],
  options: SlugOptions = {},
): Map<string, string> {
  return assignSlugs(
    items,
    (item) => toSlug(item.name),
    (item) => countryPart(item.country),
    options,
  );
}

/**
 * Release slugs: `<first billed artist>-<title>`; two albums that slug alike
 * (self-titled records a year apart) add `-<year>`, then `-<first 8 of the
 * release group's MBID>`.
 */
export function assignReleaseSlugs(
  items: readonly { mbid: string; base: string; year?: number }[],
  options: SlugOptions = {},
): Map<string, string> {
  return assignSlugs(
    items,
    (item) => item.base,
    (item) => (item.year !== undefined ? String(item.year) : ''),
    options,
  );
}
