import { normalizeArtistName } from '@/content/graph/slugs';
import type { EntityId, EntityKind } from '@/content/graph/types';

/**
 * Ranking for the entity pickers (design §3.4): what the author typed → the
 * records it most likely means.
 *
 * Tiers, best first:
 *  - `exact` — the name, the slug or the id, as typed (case aside);
 *  - `alias` — one of the record's other spellings ("Andy Grammar" → Andy
 *    Grammer), so the picker can say which record the alias belongs to;
 *  - `normalized` — equal once accents, case, apostrophes and '&'/'and' are
 *    folded ("Hall and Oates" → Hall & Oates);
 *  - `prefix`, `word` — a name or alias starts with it, or one of its words
 *    does;
 *  - `contains` — anywhere in the folded name;
 *  - `fuzzy` — within one or two edits of the whole name, for typos.
 *
 * Within a tier, entities in `context` (the song's other artists, say) come
 * first, then the shorter name, then alphabetical: the order is total, so
 * the same query always lists the same way. Pure: the index is the caller's.
 */

export type EntitySource = 'repo' | 'published' | 'draft' | 'pending';

export interface EntityEntry {
  /** Canonical `<kind>:<slug>`. */
  id: EntityId;
  kind: EntityKind;
  slug: string;
  name: string;
  aliases?: readonly string[];
  /** Where the entry comes from: code, the API's published or draft copy. */
  source: EntitySource;
  /** A second line: a city's country, a song's artist. */
  hint?: string;
}

export type MatchTier =
  | 'exact'
  | 'alias'
  | 'normalized'
  | 'prefix'
  | 'word'
  | 'contains'
  | 'fuzzy';

const TIER_RANK: Record<MatchTier, number> = {
  exact: 0,
  alias: 1,
  normalized: 2,
  prefix: 3,
  word: 4,
  contains: 5,
  fuzzy: 6,
};

export interface RankedEntity {
  entry: EntityEntry;
  tier: MatchTier;
  /** The spelling that matched: the name, or the alias. */
  matched: string;
}

export interface RankOptions {
  limit?: number;
  /** Entities to lift within their tier. */
  context?: ReadonlySet<string>;
}

/** Levenshtein distance, or Infinity once it must exceed `max`. */
export function boundedDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    if (best > max) return Infinity;
    prev = row;
  }
  return prev[b.length] <= max ? prev[b.length] : Infinity;
}

/** How one spelling matches the query, or null. `folded` is the query folded. */
function tierOf(
  spelling: string,
  isAlias: boolean,
  typed: string,
  folded: string,
): MatchTier | null {
  const lower = spelling.toLowerCase();
  if (lower === typed) return isAlias ? 'alias' : 'exact';
  const name = normalizeArtistName(spelling);
  if (!folded || !name) return null;
  if (name === folded) return isAlias ? 'alias' : 'normalized';
  if (name.startsWith(folded)) return 'prefix';
  if (name.includes(` ${folded}`)) return 'word';
  if (name.includes(folded)) return 'contains';
  if (folded.length >= 4) {
    const max = folded.length <= 6 ? 1 : 2;
    if (boundedDistance(name, folded, max) <= max) return 'fuzzy';
  }
  return null;
}

export function rankEntities(
  entries: readonly EntityEntry[],
  query: string,
  { limit = 12, context }: RankOptions = {},
): RankedEntity[] {
  const typed = query.trim().toLowerCase();
  if (!typed) return [];
  const folded = normalizeArtistName(typed);

  const hits: RankedEntity[] = [];
  for (const entry of entries) {
    if (entry.id === typed || entry.slug === typed) {
      hits.push({ entry, tier: 'exact', matched: entry.name });
      continue;
    }
    let best: RankedEntity | null = null;
    for (const [spelling, isAlias] of [
      [entry.name, false] as const,
      ...(entry.aliases ?? []).map((a) => [a, true] as const),
    ]) {
      const tier = tierOf(spelling, isAlias, typed, folded);
      if (tier && (!best || TIER_RANK[tier] < TIER_RANK[best.tier])) {
        best = { entry, tier, matched: spelling };
      }
    }
    if (best) hits.push(best);
  }

  const inContext = (r: RankedEntity) => (context?.has(r.entry.id) ? 0 : 1);
  return hits
    .sort(
      (a, b) =>
        TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
        inContext(a) - inContext(b) ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name) ||
        a.entry.id.localeCompare(b.entry.id),
    )
    .slice(0, limit);
}
