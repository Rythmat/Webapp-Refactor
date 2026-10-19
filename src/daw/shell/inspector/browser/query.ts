/**
 * query.ts — the Library's search, filters and tag chips (milestone 2.14).
 *
 * After Soundtrap's Sound library: one search, three filters (Instrument,
 * Genre, Type) whose choices show how many items each would leave, a row of
 * tag chips taken from what is listed, and the ♡ filter. A filter's counts
 * leave that filter itself out, so picking another genre is always one click
 * with its count in view.
 *
 * Pure: the panel holds the query (browserStore) and the items (useCatalog).
 */

export type BrowserType = 'part' | 'groove' | 'kit' | 'preset' | 'template';

export type BrowserInstrument =
  | 'drums'
  | 'bass'
  | 'keys'
  | 'guitar'
  | 'synth'
  | 'strings'
  | 'brass';

/** What the query reads of an item. */
export interface QueryItem {
  id: string;
  type: BrowserType;
  instrument: BrowserInstrument | null;
  /** A genre's display label (GENRES), or null. */
  genre: string | null;
  tags: readonly string[];
  /** Everything a search may match, lowercased. */
  search: string;
}

export interface BrowserQuery {
  text: string;
  instrument: BrowserInstrument | null;
  genre: string | null;
  type: BrowserType | null;
  tags: readonly string[];
  favouritesOnly: boolean;
}

export type Facet = 'instrument' | 'genre' | 'type';

export const EMPTY_QUERY: BrowserQuery = Object.freeze({
  text: '',
  instrument: null,
  genre: null,
  type: null,
  tags: Object.freeze([]) as readonly string[],
  favouritesOnly: false,
});

/** Whether nothing narrows the list (the "Fits your song" block shows). */
export function isEmptyQuery(q: BrowserQuery): boolean {
  return (
    q.text.trim() === '' &&
    q.instrument === null &&
    q.genre === null &&
    q.type === null &&
    q.tags.length === 0 &&
    !q.favouritesOnly
  );
}

const tokensOf = (text: string) =>
  text.toLowerCase().split(/\s+/).filter(Boolean);

function matches(
  item: QueryItem,
  q: BrowserQuery,
  tokens: readonly string[],
  favourites: ReadonlySet<string>,
  skip: Facet | null,
): boolean {
  if (skip !== 'type' && q.type !== null && item.type !== q.type) return false;
  if (
    skip !== 'instrument' &&
    q.instrument !== null &&
    item.instrument !== q.instrument
  ) {
    return false;
  }
  if (skip !== 'genre' && q.genre !== null && item.genre !== q.genre) {
    return false;
  }
  if (q.favouritesOnly && !favourites.has(item.id)) return false;
  for (const tag of q.tags) if (!item.tags.includes(tag)) return false;
  for (const token of tokens) if (!item.search.includes(token)) return false;
  return true;
}

/** The items the query keeps, in their order. */
export function matchItems<T extends QueryItem>(
  items: readonly T[],
  q: BrowserQuery,
  favourites: ReadonlySet<string>,
): T[] {
  const tokens = tokensOf(q.text);
  return items.filter((item) => matches(item, q, tokens, favourites, null));
}

/**
 * How many items each value of `facet` would leave: the query with that
 * filter cleared, counted by each item's value (an item with none for the
 * facet isn't counted).
 */
export function facetCounts(
  items: readonly QueryItem[],
  q: BrowserQuery,
  favourites: ReadonlySet<string>,
  facet: Facet,
): Map<string, number> {
  const tokens = tokensOf(q.text);
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = item[facet];
    if (value === null) continue;
    if (!matches(item, q, tokens, favourites, facet)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * The chip row: the active tags first, then the commonest among `matched`
 * (ties alphabetical), never the active genre again; at most `limit`.
 */
export function chipTags(
  matched: readonly QueryItem[],
  q: BrowserQuery,
  limit = 8,
): string[] {
  const counts = new Map<string, number>();
  for (const item of matched) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const genre = q.genre?.toLowerCase();
  const rest = [...counts]
    .filter(([tag]) => !q.tags.includes(tag) && tag.toLowerCase() !== genre)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
  return [...q.tags, ...rest].slice(0, Math.max(limit, q.tags.length));
}
