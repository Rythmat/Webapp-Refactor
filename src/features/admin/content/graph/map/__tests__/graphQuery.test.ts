import { describe, expect, it } from 'vitest';
import { graphFacets } from '../model/facets';
import {
  compileQuery,
  compileQueryText,
  parseQuery,
  type QueryNode,
} from '../model/graphQuery';
import { ATLAS } from './queryFixture';

/** The tree for a query that must read. */
const tree = (text: string): QueryNode | null => {
  const parsed = parseQuery(text);
  if (!parsed.ok) throw new Error(`${text}: ${parsed.error.message}`);
  return parsed.query;
};

/** The error for a query that must not read, as [start, end, message]. */
const problem = (text: string): [number, number, string] => {
  const parsed = parseQuery(text);
  if (parsed.ok) throw new Error(`${text} read without an error`);
  return [parsed.error.start, parsed.error.end, parsed.error.message];
};

describe('parseQuery: reading', () => {
  it('reads a blank query as nothing', () => {
    expect(tree('')).toBeNull();
    expect(tree('   ')).toBeNull();
  });

  it('reads kind: by id, plural or name', () => {
    expect(tree('kind:song')).toEqual({ type: 'kind', kind: 'song' });
    expect(tree('kind:songs')).toEqual({ type: 'kind', kind: 'song' });
    expect(tree('kind:Songs')).toEqual({ type: 'kind', kind: 'song' });
    expect(tree('kind:records')).toEqual({ type: 'kind', kind: 'release' });
    expect(tree('kind:record')).toEqual({ type: 'kind', kind: 'release' });
    expect(tree('kind:releases')).toEqual({ type: 'kind', kind: 'release' });
    expect(tree('kind:"globe event"')).toEqual({ type: 'kind', kind: 'event' });
    expect(tree('kind:events')).toEqual({ type: 'kind', kind: 'event' });
    expect(tree('kind:teach_day')).toEqual({
      type: 'kind',
      kind: 'teach_day',
    });
    expect(tree('kind:teach-days')).toEqual({
      type: 'kind',
      kind: 'teach_day',
    });
    expect(tree('KIND:Artist')).toEqual({ type: 'kind', kind: 'artist' });
  });

  it('reads a space as AND, and AND in capitals the same way', () => {
    const both = {
      type: 'and',
      items: [
        { type: 'kind', kind: 'song' },
        { type: 'genre', key: 'rock' },
      ],
    };
    expect(tree('kind:song genre:rock')).toEqual(both);
    expect(tree('kind:song AND genre:rock')).toEqual(both);
  });

  it('binds AND tighter than OR', () => {
    expect(tree('a b OR c')).toEqual({
      type: 'or',
      items: [
        {
          type: 'and',
          items: [
            { type: 'text', value: 'a' },
            { type: 'text', value: 'b' },
          ],
        },
        { type: 'text', value: 'c' },
      ],
    });
  });

  it('reads OR only in capitals; a lower-case "or" is a word', () => {
    expect(tree('this or that')).toEqual({
      type: 'and',
      items: [
        { type: 'text', value: 'this' },
        { type: 'text', value: 'or' },
        { type: 'text', value: 'that' },
      ],
    });
  });

  it('reads a leading "-" as not, including before a group', () => {
    expect(tree('-kind:song')).toEqual({
      type: 'not',
      item: { type: 'kind', kind: 'song' },
    });
    expect(tree('--rock')).toEqual({
      type: 'not',
      item: { type: 'not', item: { type: 'text', value: 'rock' } },
    });
    expect(tree('-(a OR b)')).toEqual({
      type: 'not',
      item: {
        type: 'or',
        items: [
          { type: 'text', value: 'a' },
          { type: 'text', value: 'b' },
        ],
      },
    });
    // A dash inside a word is part of it.
    expect(tree('hip-hop')).toEqual({ type: 'text', value: 'hip-hop' });
  });

  it('groups with parentheses', () => {
    expect(tree('kind:song (genre:soul OR genre:jazz)')).toEqual({
      type: 'and',
      items: [
        { type: 'kind', kind: 'song' },
        {
          type: 'or',
          items: [
            { type: 'genre', key: 'soul' },
            { type: 'genre', key: 'jazz' },
          ],
        },
      ],
    });
    expect(tree('((rock))')).toEqual({ type: 'text', value: 'rock' });
  });

  it('keeps quoted words together, for text and for a field', () => {
    expect(tree('"Rolling Stones"')).toEqual({
      type: 'text',
      value: 'rolling stones',
    });
    expect(tree('genre:"hip hop"')).toEqual({ type: 'genre', key: 'hiphop' });
    expect(tree('place:"North America"')).toEqual({
      type: 'place',
      key: 'northamerica',
    });
    expect(tree('"(not a group)"')).toEqual({
      type: 'text',
      value: '(not a group)',
    });
  });

  it('reads years, ranges and open ranges', () => {
    expect(tree('year:1982')).toEqual({ type: 'year', from: 1982, to: 1982 });
    expect(tree('year:1960..1969')).toEqual({
      type: 'year',
      from: 1960,
      to: 1969,
    });
    expect(tree('year:1969..1960')).toEqual({
      type: 'year',
      from: 1960,
      to: 1969,
    });
    expect(tree('year:1990..')).toEqual({
      type: 'year',
      from: 1990,
      to: Number.POSITIVE_INFINITY,
    });
    expect(tree('year:..1950')).toEqual({
      type: 'year',
      from: Number.NEGATIVE_INFINITY,
      to: 1950,
    });
  });

  it('reads decades with or without the "s"', () => {
    expect(tree('decade:1980s')).toEqual({ type: 'decade', decade: 1980 });
    expect(tree('decade:1980')).toEqual({ type: 'decade', decade: 1980 });
    expect(tree('decade:1985')).toEqual({ type: 'decade', decade: 1980 });
    expect(tree('decade:590s')).toEqual({ type: 'decade', decade: 590 });
  });

  it('reads short decades: 00s and 10s this century, 20s to 90s the last', () => {
    const decade = (text: string) => (tree(text) as { decade: number }).decade;
    expect(decade('decade:80s')).toBe(1980);
    expect(decade("decade:'80s")).toBe(1980);
    expect(decade('decade:\u201980s')).toBe(1980);
    expect(decade('decade:80')).toBe(1980);
    expect(decade('decade:85')).toBe(1980);
    expect(decade('decade:20s')).toBe(1920);
    expect(decade('decade:90s')).toBe(1990);
    expect(decade('decade:00s')).toBe(2000);
    expect(decade('decade:10s')).toBe(2010);
    expect(problem('decade:8s')[2]).toBe(
      '"decade:" takes a decade such as 1980s.',
    );
  });

  it('wants years in full, and suggests what a short one meant', () => {
    expect(tree('year:590')).toEqual({ type: 'year', from: 590, to: 590 });
    expect(problem('year:82')).toEqual([
      5,
      7,
      '"year:" takes the year in full. Did you mean year:1982?',
    ]);
    expect(problem('year:60..69')[2]).toBe(
      '"year:" takes the year in full. Did you mean year:1960..1969?',
    );
    expect(problem('year:05..')[2]).toContain('year:2005..');
    expect(problem('year:1960..69')[2]).toContain('year:1960..1969?');
  });

  it('reads era:, status:, is:, name: and label:', () => {
    expect(tree('era:"Postwar & Revolution"')).toEqual({
      type: 'era',
      key: 'postwarandrevolution',
    });
    expect(tree('status:Draft')).toEqual({ type: 'status', status: 'draft' });
    expect(tree('is:orphan')).toEqual({ type: 'is', what: 'orphan' });
    expect(tree('is:tags')).toEqual({ type: 'is', what: 'tag' });
    expect(tree('is:unresolved')).toEqual({ type: 'is', what: 'missing' });
    expect(tree('is:curriculum')).toEqual({ type: 'is', what: 'curriculum' });
    expect(tree('name:Beyoncé')).toEqual({ type: 'name', value: 'beyonce' });
    expect(tree('label:"Toto IV"')).toEqual({ type: 'name', value: 'toto iv' });
  });

  it('reads ids, whole or by their start, with or without id:', () => {
    expect(tree('id:artist:toto')).toEqual({
      type: 'id',
      value: 'artist:toto',
      prefix: false,
    });
    expect(tree('id:place:region-*')).toEqual({
      type: 'id',
      value: 'place:region-',
      prefix: true,
    });
    expect(tree('artist:Toto')).toEqual({
      type: 'id',
      value: 'artist:toto',
      prefix: false,
    });
    expect(tree('teach_day:unit-1-day-1')).toEqual({
      type: 'id',
      value: 'teach_day:unit-1-day-1',
      prefix: false,
    });
  });

  it('normalises free text', () => {
    expect(tree('Beyoncé')).toEqual({ type: 'text', value: 'beyonce' });
  });
});

describe('parseQuery: hints', () => {
  it('searches an unknown field as text and says so', () => {
    const parsed = parseQuery('kind:song mood:happy');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query).toEqual({
      type: 'and',
      items: [
        { type: 'kind', kind: 'song' },
        { type: 'text', value: 'mood:happy' },
      ],
    });
    expect(parsed.hints).toHaveLength(1);
    expect(parsed.hints[0]).toMatchObject({ start: 10, end: 15 });
    expect(parsed.hints[0].message).toContain('"mood:"');
    expect(parsed.hints[0].message).toContain('kind:');
  });

  it('gives no hint for a known field or an id', () => {
    expect(parseQuery('genre:rock artist:toto').hints).toEqual([]);
  });

  it('keeps hints found before an error', () => {
    const parsed = parseQuery('mood:happy (rock');
    expect(parsed.ok).toBe(false);
    expect(parsed.hints).toHaveLength(1);
  });
});

describe('parseQuery: errors, with their positions', () => {
  it('reports a quote never closed', () => {
    expect(problem('"hip hop')).toEqual([0, 8, 'This quote is never closed.']);
    expect(problem('genre:"hip')).toEqual([
      6,
      10,
      'This quote is never closed.',
    ]);
  });

  it('reports unbalanced and empty parentheses', () => {
    expect(problem('(kind:song')).toEqual([0, 1, 'This "(" is never closed.']);
    expect(problem('a (b (c)')).toEqual([2, 3, 'This "(" is never closed.']);
    expect(problem('kind:song)')).toEqual([
      9,
      10,
      'This ")" has no "(" to close.',
    ]);
    expect(problem(') a')).toEqual([0, 1, 'This ")" has no "(" to close.']);
    expect(problem('a ()')).toEqual([2, 4, 'These parentheses are empty.']);
    expect(problem('(')).toEqual([0, 1, 'This "(" is never closed.']);
  });

  it('reports an OR or AND with a side missing', () => {
    expect(problem('OR kind:song')).toEqual([
      0,
      2,
      '"OR" needs something before it.',
    ]);
    expect(problem('kind:song OR')).toEqual([
      10,
      12,
      '"OR" needs something after it.',
    ]);
    expect(problem('a OR OR b')).toEqual([
      2,
      4,
      '"OR" needs something after it.',
    ]);
    expect(problem('(a OR) b')).toEqual([
      3,
      5,
      '"OR" needs something after it.',
    ]);
    expect(problem('AND a')).toEqual([
      0,
      3,
      '"AND" needs something before it.',
    ]);
    expect(problem('a AND')).toEqual([2, 5, '"AND" needs something after it.']);
  });

  it('reports a "-" with nothing after it', () => {
    const message = 'Put what to leave out right after "-".';
    expect(problem('- a')).toEqual([0, 1, message]);
    expect(problem('a -')).toEqual([2, 3, message]);
    expect(problem('(a -)')).toEqual([3, 4, message]);
    expect(problem('-OR a')).toEqual([0, 1, message]);
  });

  it('reports empty quotes and a field with no value', () => {
    expect(problem('""')).toEqual([0, 2, 'These quotes are empty.']);
    expect(problem('kind:')).toEqual([0, 5, '"kind:" needs a value after it.']);
    expect(problem('genre:"" rock')).toEqual([
      0,
      8,
      '"genre:" needs a value after it.',
    ]);
  });

  it('reports values a field cannot take, at the value', () => {
    expect(problem('kind:sogn')).toEqual([
      5,
      9,
      'There is no kind "sogn". Try song, artist, event, place, record, label, studio or progression.',
    ]);
    expect(problem('a year:19x2')[0]).toBe(7);
    expect(problem('year:1990..2000..2010')[2]).toContain('"year:"');
    expect(problem('decade:eighties')[2]).toBe(
      '"decade:" takes a decade such as 1980s.',
    );
    expect(problem('status:live')[2]).toContain('published, draft');
    expect(problem('is:hub')).toEqual([
      3,
      6,
      '"is:" is one of tag, missing, orphan or curriculum.',
    ]);
    expect(problem('genre:--')[2]).toContain('letters or digits');
  });
});

describe('compileQuery over the fixture Atlas', () => {
  const facets = graphFacets(ATLAS);
  const all = [...facets.byId.values()];
  const matching = (text: string, orphans: readonly string[] = []) => {
    const query = tree(text);
    if (!query) throw new Error('blank');
    const match = compileQuery(query);
    return all
      .filter((f) => match(f, orphans.includes(f.id)))
      .map((f) => f.id)
      .sort();
  };

  it('kind:', () => {
    expect(matching('kind:song')).toEqual([
      'song:africa',
      'song:rosanna',
      'song:so_what',
    ]);
    expect(matching('kind:records')).toEqual(['release:toto-iv']);
  });

  it('genre: counts subgenres toward their parent and matches the genre itself', () => {
    expect(matching('genre:rock')).toEqual([
      'genre:rock',
      'song:africa',
      'song:rosanna',
      'subgenre:art-rock',
    ]);
    expect(matching('genre:"Art Rock"')).toEqual([
      'song:africa',
      'subgenre:art-rock',
    ]);
    expect(matching('genre:art-rock')).toEqual(matching('genre:"art rock"'));
    expect(matching('genre:jazz')).toEqual([
      'artist:miles-davis',
      'genre:jazz',
      'progression:ii-v-i',
      'song:so_what',
      'subgenre:modal-jazz',
    ]);
    expect(matching('genre:soul')).toEqual([
      'event:evt-motown-founded',
      'genre:soul',
      'place:detroit',
    ]);
  });

  it('place: matches the place and what is in it; a region its cities', () => {
    expect(matching('place:los-angeles')).toEqual([
      'artist:toto',
      'place:los-angeles',
      'song:africa',
      'studio:sunset-sound',
    ]);
    const northAmerica = [
      'artist:beyonce',
      'artist:toto',
      'event:evt-motown-founded',
      'place:detroit',
      'place:houston',
      'place:los-angeles',
      'place:region-north-america',
      'song:africa',
      'studio:sunset-sound',
    ];
    expect(matching('place:"North America"')).toEqual(northAmerica);
    expect(matching('place:region-north-america')).toEqual(northAmerica);
  });

  it('year:, decade: and era:', () => {
    expect(matching('year:1982')).toEqual([
      'release:toto-iv',
      'song:africa',
      'song:rosanna',
      'year:1982',
    ]);
    expect(matching('year:1959..1977')).toEqual([
      'artist:toto',
      'event:evt-motown-founded',
      'song:so_what',
      'year:1959',
      'year:1977',
    ]);
    expect(matching('year:..1960')).toEqual([
      'event:evt-motown-founded',
      'song:so_what',
      'year:1959',
    ]);
    expect(matching('decade:1980s')).toEqual([
      'artist:beyonce',
      'artist:toto',
      'decade:1980s',
      'release:toto-iv',
      'song:africa',
      'song:rosanna',
      'year:1981',
      'year:1982',
    ]);
    expect(matching('era:postwar')).toEqual([
      'artist:toto',
      'era:postwar',
      'event:evt-motown-founded',
      'song:so_what',
      'year:1959',
      'year:1977',
    ]);
    expect(matching('era:"Electronic & Hip Hop"')).toEqual(
      matching('era:electronic-hiphop'),
    );
  });

  it('status: and is:', () => {
    expect(matching('status:draft')).toEqual(['studio:sunset-sound']);
    expect(matching('is:missing')).toEqual(['artist:ghost']);
    expect(matching('status:missing')).toEqual(['artist:ghost']);
    expect(matching('is:curriculum')).toEqual([
      'pathway:jazz-age',
      'teach_day:unit-1-day-1',
    ]);
    expect(matching('is:orphan')).toEqual([]);
    expect(matching('is:orphan', ['artist:loner'])).toEqual(['artist:loner']);
    expect(matching('kind:place -is:tag')).toEqual([
      'place:detroit',
      'place:houston',
      'place:london',
      'place:los-angeles',
    ]);
  });

  it('id:, name: and free text', () => {
    expect(matching('id:artist:toto')).toEqual(['artist:toto']);
    expect(matching('artist:toto')).toEqual(['artist:toto']);
    expect(matching('id:toto')).toEqual(['artist:toto']);
    expect(matching('id:place:region-*')).toEqual([
      'place:region-europe',
      'place:region-north-america',
    ]);
    expect(matching('name:toto')).toEqual(['artist:toto', 'release:toto-iv']);
    expect(matching('toto')).toEqual(['artist:toto', 'release:toto-iv']);
    expect(matching('BEYONCÉ')).toEqual(['artist:beyonce']);
    expect(matching('"so what"')).toEqual(['song:so_what']);
    // Free text reads the id too; name: does not.
    expect(matching('evt-motown')).toEqual(['event:evt-motown-founded']);
    expect(matching('name:evt-motown')).toEqual([]);
  });

  it('combines with AND, OR, NOT and groups', () => {
    expect(matching('kind:song -genre:rock')).toEqual(['song:so_what']);
    expect(matching('kind:artist OR kind:event')).toEqual([
      'artist:beyonce',
      'artist:ghost',
      'artist:loner',
      'artist:miles-davis',
      'artist:toto',
      'event:evt-motown-founded',
    ]);
    expect(matching('kind:song (genre:jazz OR year:1982)')).toEqual([
      'song:africa',
      'song:rosanna',
      'song:so_what',
    ]);
    expect(matching('kind:song -(genre:jazz OR year:1982)')).toEqual([]);
    expect(matching('mood:happy')).toEqual([]);
  });
});

describe('compileQueryText', () => {
  it('has no test for a blank query', () => {
    const blank = compileQueryText('  ');
    expect(blank).toMatchObject({ match: null, empty: true, error: null });
  });

  it('has no test, and the error, for a query that cannot be read', () => {
    const bad = compileQueryText('kind:song OR');
    expect(bad.match).toBeNull();
    expect(bad.empty).toBe(false);
    expect(bad.error?.start).toBe(10);
  });

  it('compiles a good query', () => {
    const good = compileQueryText('kind:song');
    const facets = graphFacets(ATLAS);
    const africa = facets.get('song:africa');
    const toto = facets.get('artist:toto');
    if (!africa || !toto || !good.match) throw new Error('fixture');
    expect(good.match(africa, false)).toBe(true);
    expect(good.match(toto, false)).toBe(false);
  });
});
