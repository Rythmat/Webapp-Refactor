/**
 * The library browser's search, filters and chips are one pure query
 * (milestone 2.14). These tests are written from the 15c contract, not from
 * the module.
 *
 * An item matches when every word typed is somewhere in its lowercased
 * haystack, and every set filter (instrument, genre, type, tags, the ♡
 * filter) agrees; the list keeps its order. A filter menu's counts answer
 * "how many would I see if I picked this", so each facet is counted with its
 * own filter cleared and everything else kept. The chip row shows the active
 * tags first, then the commonest tags among the results, never the genre
 * that is already picked.
 */
import { describe, expect, it } from 'vitest';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import {
  chipTags,
  EMPTY_QUERY,
  facetCounts,
  isEmptyQuery,
  matchItems,
  type BrowserInstrument,
  type BrowserQuery,
  type QueryItem,
} from '../query';

const item = (
  id: string,
  patch: Partial<QueryItem> & { name?: string } = {},
): QueryItem & { name: string } => {
  const name = patch.name ?? id;
  const tags = patch.tags ?? [];
  return {
    id,
    type: 'part',
    instrument: null,
    genre: null,
    search: [name, ...tags].join(' ').toLowerCase(),
    ...patch,
    tags,
    name,
  };
};

const ITEMS = [
  item('part:funk-bass', {
    name: 'Funk bass line',
    instrument: 'bass',
    genre: 'funk',
    tags: ['slap', 'syncopated'],
  }),
  item('part:funk-keys', {
    name: 'Funk clav stabs',
    instrument: 'keys',
    genre: 'funk',
    tags: ['syncopated', 'stabs'],
  }),
  item('groove:boom-bap', {
    name: 'Boom bap groove',
    type: 'groove',
    instrument: 'drums',
    genre: 'hip-hop',
    tags: ['swing', 'dusty'],
  }),
  item('part:pop-keys', {
    name: 'Pop piano chords',
    instrument: 'keys',
    genre: 'pop',
    tags: ['chords', 'syncopated'],
  }),
  item('kit:808', {
    name: '808 kit',
    type: 'kit',
    instrument: 'drums',
    genre: null,
    tags: ['trap'],
  }),
  item('preset:oracle:Warm pad', {
    name: 'Warm pad',
    type: 'preset',
    instrument: 'synth',
    genre: null,
    tags: ['pad', 'warm'],
  }),
  item('template:project-pop', {
    name: 'Pop song',
    type: 'template',
    instrument: null,
    genre: 'pop',
    tags: [],
  }),
];

const q = (patch: Partial<BrowserQuery> = {}): BrowserQuery => ({
  ...EMPTY_QUERY,
  ...patch,
});
const NONE = new Set<string>();
/** The query with one facet set to a value (the menus' "pick this"). */
const withFacet = (
  query: BrowserQuery,
  facet: 'instrument' | 'genre' | 'type',
  value: string | null,
) => ({ ...query, [facet]: value }) as BrowserQuery;
const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);

describe('EMPTY_QUERY and isEmptyQuery', () => {
  it('the empty query has nothing set', () => {
    expect(EMPTY_QUERY).toEqual({
      text: '',
      instrument: null,
      genre: null,
      type: null,
      tags: [],
      favouritesOnly: false,
    });
    expect(isEmptyQuery(EMPTY_QUERY)).toBe(true);
    expect(isEmptyQuery(q())).toBe(true);
  });

  it('any one thing set makes it not empty', () => {
    expect(isEmptyQuery(q({ text: 'funk' }))).toBe(false);
    expect(isEmptyQuery(q({ instrument: 'bass' }))).toBe(false);
    expect(isEmptyQuery(q({ genre: 'funk' }))).toBe(false);
    expect(isEmptyQuery(q({ type: 'groove' }))).toBe(false);
    expect(isEmptyQuery(q({ tags: ['slap'] }))).toBe(false);
    expect(isEmptyQuery(q({ favouritesOnly: true }))).toBe(false);
  });
});

describe('matchItems', () => {
  it('the empty query keeps every item, in order', () => {
    expect(ids(matchItems(ITEMS, EMPTY_QUERY, NONE))).toEqual(ids(ITEMS));
  });

  it('every typed word must be in the haystack, in any order and any case', () => {
    expect(ids(matchItems(ITEMS, q({ text: 'funk' }), NONE))).toEqual([
      'part:funk-bass',
      'part:funk-keys',
    ]);
    expect(ids(matchItems(ITEMS, q({ text: 'LINE funk' }), NONE))).toEqual([
      'part:funk-bass',
    ]);
    expect(
      ids(matchItems(ITEMS, q({ text: '  funk   bass  ' }), NONE)),
    ).toEqual(['part:funk-bass']);
    expect(matchItems(ITEMS, q({ text: 'funk trap' }), NONE)).toEqual([]);
  });

  it('a word matches inside a word (substring, not whole word)', () => {
    expect(ids(matchItems(ITEMS, q({ text: 'synco' }), NONE))).toEqual([
      'part:funk-bass',
      'part:funk-keys',
      'part:pop-keys',
    ]);
  });

  it('searches the haystack, not the other fields', () => {
    const odd = item('part:odd', {
      name: 'Odd',
      genre: 'funk',
      instrument: 'bass',
      search: 'nothing here',
    });
    expect(matchItems([odd], q({ text: 'funk' }), NONE)).toEqual([]);
    expect(matchItems([odd], q({ text: 'here' }), NONE)).toEqual([odd]);
  });

  it('instrument, genre and type filter by equality', () => {
    expect(ids(matchItems(ITEMS, q({ instrument: 'keys' }), NONE))).toEqual([
      'part:funk-keys',
      'part:pop-keys',
    ]);
    expect(ids(matchItems(ITEMS, q({ genre: 'pop' }), NONE))).toEqual([
      'part:pop-keys',
      'template:project-pop',
    ]);
    expect(ids(matchItems(ITEMS, q({ type: 'groove' }), NONE))).toEqual([
      'groove:boom-bap',
    ]);
    expect(
      ids(matchItems(ITEMS, q({ instrument: 'drums', type: 'kit' }), NONE)),
    ).toEqual(['kit:808']);
    expect(
      matchItems(ITEMS, q({ instrument: 'bass', genre: 'pop' }), NONE),
    ).toEqual([]);
  });

  it('every active tag must be on the item', () => {
    expect(ids(matchItems(ITEMS, q({ tags: ['syncopated'] }), NONE))).toEqual([
      'part:funk-bass',
      'part:funk-keys',
      'part:pop-keys',
    ]);
    expect(
      ids(matchItems(ITEMS, q({ tags: ['syncopated', 'stabs'] }), NONE)),
    ).toEqual(['part:funk-keys']);
    expect(matchItems(ITEMS, q({ tags: ['slap', 'stabs'] }), NONE)).toEqual([]);
  });

  it('the ♡ filter keeps favourites only, and only when it is on', () => {
    const favs = new Set(['kit:808', 'part:funk-bass', 'not-in-the-list']);
    expect(ids(matchItems(ITEMS, q({ favouritesOnly: true }), favs))).toEqual([
      'part:funk-bass',
      'kit:808',
    ]);
    expect(ids(matchItems(ITEMS, q(), favs))).toEqual(ids(ITEMS));
    expect(matchItems(ITEMS, q({ favouritesOnly: true }), NONE)).toEqual([]);
  });

  it('combines everything', () => {
    const favs = new Set(['part:funk-keys', 'part:pop-keys']);
    expect(
      ids(
        matchItems(
          ITEMS,
          q({
            text: 'chords',
            instrument: 'keys',
            type: 'part',
            tags: ['syncopated'],
            favouritesOnly: true,
          }),
          favs,
        ),
      ),
    ).toEqual(['part:pop-keys']);
  });

  it('returns the items themselves (extra fields kept)', () => {
    const [first] = matchItems(ITEMS, q({ text: 'boom' }), NONE);
    expect(first).toBe(ITEMS[2]);
    expect(first.name).toBe('Boom bap groove');
  });
});

describe('facetCounts', () => {
  it('counts each value over the whole list when nothing is set', () => {
    const byInstrument = facetCounts(ITEMS, EMPTY_QUERY, NONE, 'instrument');
    expect(byInstrument.get('keys')).toBe(2);
    expect(byInstrument.get('drums')).toBe(2);
    expect(byInstrument.get('bass')).toBe(1);
    expect(byInstrument.get('synth')).toBe(1);
    expect(byInstrument.get('guitar') ?? 0).toBe(0);

    const byType = facetCounts(ITEMS, EMPTY_QUERY, NONE, 'type');
    expect(byType.get('part')).toBe(3);
    expect(byType.get('groove')).toBe(1);
    expect(byType.get('kit')).toBe(1);
    expect(byType.get('preset')).toBe(1);
    expect(byType.get('template')).toBe(1);
  });

  it('does not count items with no value for the facet', () => {
    const byGenre = facetCounts(ITEMS, EMPTY_QUERY, NONE, 'genre');
    expect(byGenre.get('funk')).toBe(2);
    expect(byGenre.get('pop')).toBe(2);
    expect(byGenre.get('hip-hop')).toBe(1);
    expect([...byGenre.keys()].sort()).toEqual(['funk', 'hip-hop', 'pop']);
    const total = [...byGenre.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(5); // the kit and the preset have no genre
    const byInstrument = facetCounts(ITEMS, EMPTY_QUERY, NONE, 'instrument');
    expect([...byInstrument.keys()]).not.toContain(null);
    expect([...byInstrument.keys()]).not.toContain('null');
  });

  it('clears its own facet: picking keys still shows what bass would give', () => {
    const counts = facetCounts(
      ITEMS,
      q({ instrument: 'keys' }),
      NONE,
      'instrument',
    );
    expect(counts.get('keys')).toBe(2);
    expect(counts.get('bass')).toBe(1);
    expect(counts.get('drums')).toBe(2);
  });

  it('keeps every other part of the query', () => {
    // Text 'funk': only the two funk parts are left, whatever the instrument.
    const byInstrument = facetCounts(
      ITEMS,
      q({ text: 'funk', instrument: 'drums' }),
      NONE,
      'instrument',
    );
    expect(byInstrument.get('bass')).toBe(1);
    expect(byInstrument.get('keys')).toBe(1);
    expect(byInstrument.get('drums') ?? 0).toBe(0);

    // The instrument filter narrows the genre counts.
    const byGenre = facetCounts(
      ITEMS,
      q({ instrument: 'keys' }),
      NONE,
      'genre',
    );
    expect(byGenre.get('funk')).toBe(1);
    expect(byGenre.get('pop')).toBe(1);
    expect(byGenre.get('hip-hop') ?? 0).toBe(0);

    // Tags narrow the type counts.
    const byType = facetCounts(
      ITEMS,
      q({ tags: ['syncopated'] }),
      NONE,
      'type',
    );
    expect(byType.get('part')).toBe(3);
    expect(byType.get('groove') ?? 0).toBe(0);
  });

  it('respects the ♡ filter', () => {
    const favs = new Set(['part:funk-bass', 'groove:boom-bap']);
    const byType = facetCounts(
      ITEMS,
      q({ favouritesOnly: true, type: 'kit' }),
      favs,
      'type',
    );
    expect(byType.get('part')).toBe(1);
    expect(byType.get('groove')).toBe(1);
    expect(byType.get('kit') ?? 0).toBe(0);
  });

  it('each count is what picking that value would show', () => {
    const query = q({ text: 'syncopated', genre: 'funk' });
    for (const facet of ['instrument', 'genre', 'type'] as const) {
      const counts = facetCounts(ITEMS, query, NONE, facet);
      for (const [value, count] of counts) {
        expect(
          matchItems(ITEMS, withFacet(query, facet, value), NONE),
          `${facet}=${value}`,
        ).toHaveLength(count);
      }
    }
  });
});

describe('chipTags', () => {
  const tagged = [
    item('a', { tags: ['dusty', 'swing', 'lofi'] }),
    item('b', { tags: ['swing', 'lofi'] }),
    item('c', { tags: ['swing', 'bright'] }),
    item('d', { tags: ['lofi', 'Funk'] }),
    item('e', { tags: ['alpha', 'zeta', 'Funk'] }),
  ];

  it('orders the commonest tags first, ties alphabetically', () => {
    // lofi 3, swing 3, Funk 2, then alpha bright dusty zeta 1 each.
    const chips = chipTags(tagged, EMPTY_QUERY);
    expect(chips.slice(0, 3)).toEqual(['lofi', 'swing', 'Funk']);
    expect(chips).toHaveLength(7);
    expect(new Set(chips)).toEqual(
      new Set(['lofi', 'swing', 'alpha', 'bright', 'dusty', 'Funk', 'zeta']),
    );
    expect(chips.slice(3)).toEqual(['alpha', 'bright', 'dusty', 'zeta']);
  });

  it('puts the active tags first, in the query’s order, without repeating them', () => {
    const chips = chipTags(tagged, q({ tags: ['zeta', 'dusty'] }));
    expect(chips.slice(0, 2)).toEqual(['zeta', 'dusty']);
    expect(chips.filter((t) => t === 'zeta')).toHaveLength(1);
    expect(chips.filter((t) => t === 'dusty')).toHaveLength(1);
    expect(chips.slice(2, 5)).toEqual(['lofi', 'swing', 'Funk']);
  });

  it('keeps an active tag even when no matched item has it', () => {
    const chips = chipTags(tagged, q({ tags: ['nowhere'] }));
    expect(chips[0]).toBe('nowhere');
  });

  it('stops at the limit, 8 by default', () => {
    const many = [
      item('x', {
        tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
      }),
    ];
    expect(chipTags(many, EMPTY_QUERY)).toHaveLength(8);
    expect(chipTags(many, EMPTY_QUERY, 3)).toHaveLength(3);
    expect(chipTags(tagged, q({ tags: ['zeta'] }), 2)).toEqual([
      'zeta',
      'lofi',
    ]);
  });

  it('never offers the active genre as a chip, whatever its case', () => {
    const chips = chipTags(tagged, q({ genre: 'funk' }));
    expect(chips.map((t) => t.toLowerCase())).not.toContain('funk');
    // Without the genre picked, the tag is offered.
    expect(chipTags(tagged, EMPTY_QUERY)).toContain('Funk');
  });

  it('is empty with nothing matched and nothing active', () => {
    expect(chipTags([], EMPTY_QUERY)).toEqual([]);
  });
});

describe('over the live parts', () => {
  const INSTRUMENT: Record<string, BrowserInstrument> = {
    piano: 'keys',
    bass: 'bass',
    guitar: 'guitar',
    drums: 'drums',
  };
  const live: QueryItem[] = listLiveParts().map((p) => ({
    id: `part:${p.id}`,
    type: 'part' as const,
    instrument: INSTRUMENT[p.instrument],
    genre: p.genre ?? null,
    tags: p.tags,
    search: [p.name, p.genre ?? '', p.style ?? '', ...p.tags]
      .join(' ')
      .toLowerCase(),
  }));

  it('the counts for each facet add up to what the rest of the query shows', () => {
    for (const query of [
      EMPTY_QUERY,
      q({ text: 'bass' }),
      q({ text: 'funk' }),
    ]) {
      for (const facet of ['instrument', 'genre', 'type'] as const) {
        const counts = facetCounts(live, query, NONE, facet);
        const shown = matchItems(live, withFacet(query, facet, null), NONE);
        const withValue = shown.filter((i) => i[facet] != null);
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        expect(total, `${facet} for "${query.text}"`).toBe(withValue.length);
        for (const [value, count] of counts) {
          expect(
            matchItems(live, withFacet(query, facet, value), NONE),
          ).toHaveLength(count);
        }
      }
    }
  });

  it('searching a genre keeps only items whose haystack names it', () => {
    const funk = matchItems(live, q({ text: 'Funk' }), NONE);
    expect(funk.length).toBeGreaterThan(0);
    expect(funk.every((i) => i.search.includes('funk'))).toBe(true);
    const order = live.map((i) => i.id);
    const positions = funk.map((i) => order.indexOf(i.id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
