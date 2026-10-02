import { describe, expect, it } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import { SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { eraForYear } from '@/content/graph/time';
import type { EntityId } from '@/content/graph/types';
import { graphFacets, type NodeFacets } from '../model/facets';
import { textKey } from '../model/text';
import { ATLAS, EDGES, NODES, fixtureGraph } from './queryFixture';

const facets = graphFacets(ATLAS);
const of = (id: string): NodeFacets => {
  const f = facets.get(id);
  if (!f) throw new Error(`no facets for ${id}`);
  return f;
};
const sorted = (set: ReadonlySet<string | number>) => [...set].sort();

describe('graphFacets', () => {
  it('has one entry per node', () => {
    expect(facets.byId.size).toBe(NODES.length);
    expect(facets.get('artist:nobody')).toBeUndefined();
  });

  it('keeps the kind, status, id and the normalised name', () => {
    const f = of('artist:beyonce');
    expect(f.kind).toBe('artist');
    expect(f.status).toBe('published');
    expect(f.name).toBe('beyonce');
    expect(f.idKey).toBe('artist:beyonce');
    expect(f.slugKey).toBe('beyonce');
    expect(of('artist:ghost').status).toBe('missing');
  });

  it('walks a subgenre up to its genre', () => {
    expect(sorted(of('song:africa').genres)).toEqual(['artrock', 'rock']);
    expect(sorted(of('song:rosanna').genres)).toEqual(['rock']);
    expect(sorted(of('subgenre:art-rock').genres)).toEqual(['artrock', 'rock']);
    expect(sorted(of('genre:rock').genres)).toEqual(['rock']);
  });

  it("files a city under its scene's genres", () => {
    expect(sorted(of('place:detroit').genres)).toEqual(['soul']);
  });

  it('collects places through based, born, recorded and took place in, with regions', () => {
    const la = ['losangeles', 'northamerica', 'regionnorthamerica'];
    expect(sorted(of('song:africa').places)).toEqual(la);
    expect(sorted(of('artist:toto').places)).toEqual(la);
    expect(sorted(of('studio:sunset-sound').places)).toEqual(la);
    expect(of('artist:beyonce').places.has('houston')).toBe(true);
    expect(of('event:evt-motown-founded').places.has('detroit')).toBe(true);
    expect(sorted(of('place:london').places)).toEqual([
      'europe',
      'london',
      'regioneurope',
    ]);
    // A song's label is not a place it belongs to.
    expect(of('song:so_what').places.size).toBe(0);
  });

  it('dates from from_year, born_year and formed_year, with decades and eras', () => {
    expect(of('song:africa').years).toEqual([1982]);
    expect(of('artist:toto').years).toEqual([1977]);
    expect(of('artist:beyonce').years).toEqual([1981]);
    expect(of('artist:toto').firstYear).toBe(1977);
    expect(of('place:detroit').firstYear).toBeNull();
    // An artist's active decades count as its decades too.
    expect(sorted(of('artist:toto').decades)).toEqual([1970, 1980]);
    expect(sorted(of('song:africa').eras)).toEqual([
      'electronicandhiphop',
      'electronichiphop',
    ]);
    expect(sorted(of('artist:toto').eras)).toEqual([
      'postwar',
      'postwarandrevolution',
    ]);
  });

  it('gives a year, a decade and an era node their own values', () => {
    expect(of('year:1982').years).toEqual([1982]);
    expect(sorted(of('year:1982').decades)).toEqual([1980]);
    expect(of('year:1982').eras.has('electronichiphop')).toBe(true);
    expect(sorted(of('decade:1980s').decades)).toEqual([1980]);
    expect(of('decade:1980s').years).toEqual([]);
    expect(of('era:postwar').eras.has('postwar')).toBe(true);
  });

  it('marks tags and curriculum, with regions as tags and cities as notes', () => {
    const tags = [...facets.byId.values()]
      .filter((f) => f.tag)
      .map((f) => f.id)
      .sort();
    expect(tags).toEqual(
      [
        'decade:1950s',
        'decade:1970s',
        'decade:1980s',
        'era:electronic-hiphop',
        'era:postwar',
        'genre:hip-hop',
        'genre:jazz',
        'genre:rock',
        'genre:soul',
        'key:c',
        'mode:dorian',
        'place:region-europe',
        'place:region-north-america',
        'subgenre:art-rock',
        'subgenre:modal-jazz',
        'year:1959',
        'year:1977',
        'year:1981',
        'year:1982',
      ].sort(),
    );
    const curriculum = [...facets.byId.values()]
      .filter((f) => f.curriculum)
      .map((f) => f.id)
      .sort();
    expect(curriculum).toEqual(['pathway:jazz-age', 'teach_day:unit-1-day-1']);
    expect(of('place:detroit').tag).toBe(false);
  });

  it('is worked out once per graph object', () => {
    expect(graphFacets(ATLAS)).toBe(facets);
    const copy = fixtureGraph(NODES, EDGES);
    const other = graphFacets(copy);
    expect(other).not.toBe(facets);
    expect(graphFacets(copy)).toBe(other);
  });

  it('survives a loop in the data', () => {
    const looped = fixtureGraph(
      [
        ['subgenre:a', 'A'],
        ['subgenre:b', 'B'],
        ['place:x', 'X'],
        ['place:y', 'Y'],
      ],
      [
        ['subgenre:a', 'in_genre', 'subgenre:b'],
        ['subgenre:b', 'in_genre', 'subgenre:a'],
        ['place:x', 'located_in', 'place:y'],
        ['place:y', 'located_in', 'place:x'],
      ],
    );
    const f = graphFacets(looped);
    expect(sorted(f.get('subgenre:a')?.genres ?? new Set())).toEqual([
      'a',
      'b',
    ]);
    expect(f.get('place:y')?.places.has('x')).toBe(true);
  });

  it('reads a graph the real assembler built', () => {
    const subgenre = 'art-rock';
    const parent = SUBGENRE_PARENT[subgenre];
    expect(parent).toBeTruthy();
    const via = { item: 'song:africa' as EntityId, path: 'test' };
    const graph = assembleGraph(
      [
        {
          id: 'song:africa',
          kind: 'song',
          label: 'Africa',
          status: 'published',
          origin: 'api',
        },
      ],
      [
        {
          from: 'song:africa',
          kind: 'in_genre',
          to: `subgenre:${subgenre}`,
          via,
        },
        { from: 'song:africa', kind: 'from_year', to: 'year:1982', via },
      ],
    );
    const f = graphFacets(graph).get('song:africa');
    expect(f?.genres.has(textKey(subgenre))).toBe(true);
    expect(f?.genres.has(textKey(parent))).toBe(true);
    expect(f?.years).toEqual([1982]);
    expect(f?.decades.has(1980)).toBe(true);
    const era = eraForYear(1982);
    expect(era).toBeTruthy();
    expect(f?.eras.has(textKey(era ?? ''))).toBe(true);
  });
});
