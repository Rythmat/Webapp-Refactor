import { describe, expect, it } from 'vitest';
import type { EntityId, EntityKind } from '@/content/graph/types';
import type { EntityEntry } from '../rankEntities';
import {
  linkBody,
  linksBySong,
  resolveLegacyArtists,
  unlinkedArtistNames,
} from '../resolveLegacy';

const artist = (
  slug: string,
  name: string,
  aliases?: string[],
): EntityEntry => ({
  id: `artist:${slug}` as EntityId,
  kind: 'artist' as EntityKind,
  slug,
  name,
  aliases,
  source: 'repo',
});

const ARTISTS = [
  artist('toto', 'Toto'),
  artist('jeff-porcaro', 'Jeff Porcaro'),
  artist('hall-and-oates', 'Hall And Oates'),
  artist('stevie-wonder', 'Stevie Wonder'),
  artist('andy-grammer', 'Andy Grammer', ['Andy Grammar']),
];

const SONGS = [
  {
    id: 'africa',
    artist: 'Toto',
    credits: [
      { name: 'Jeff Porcaro' },
      { name: 'Jeff Porcaro', artistGlobeId: 'jeff-porcaro' },
      { name: 'Greg Ladanyi' },
    ],
  },
  { id: 'rosanna', artist: 'Toto', origin: { artistGlobeId: 'toto' } },
  { id: 'kiss_on_my_list', artist: 'Hall & Oates' },
  { id: 'ebony', artist: 'Stevie Wonder & Paul McCartney' },
  { id: 'fine', artist: 'Andy Grammar' },
  { id: 'trad', artist: 'Traditional' },
  { id: 'wondr', artist: 'Stevie Wondr' },
];

describe('finding unlinked names', () => {
  it('lists each name whose id field is empty, with both paths', () => {
    const found = unlinkedArtistNames(SONGS).filter(
      (f) => f.occurrence.item === 'africa',
    );
    expect(found).toEqual([
      {
        text: 'Toto',
        occurrence: {
          item: 'africa',
          textPath: 'artist',
          idPath: 'origin.artistGlobeId',
        },
      },
      {
        text: 'Jeff Porcaro',
        occurrence: {
          item: 'africa',
          textPath: 'credits[0].name',
          idPath: 'credits[0].artistGlobeId',
        },
      },
      {
        text: 'Greg Ladanyi',
        occurrence: {
          item: 'africa',
          textPath: 'credits[2].name',
          idPath: 'credits[2].artistGlobeId',
        },
      },
    ]);
  });

  it('skips what is linked and what is not an artist', () => {
    const items = unlinkedArtistNames(SONGS).map((f) => f.occurrence.item);
    expect(items).not.toContain('rosanna');
    expect(items).not.toContain('trad');
  });
});

describe('grading the groups', () => {
  const groups = resolveLegacyArtists(SONGS, ARTISTS);
  const tierOf = (text: string) => groups.find((g) => g.text === text)?.tier;

  it('is sure of names, aliases and folded names', () => {
    expect(tierOf('Toto')).toBe('sure');
    expect(tierOf('Andy Grammar')).toBe('sure');
    expect(tierOf('Hall & Oates')).toBe('sure');
    expect(
      groups.find((g) => g.text === 'Andy Grammar')?.candidates[0].entry.slug,
    ).toBe('andy-grammer');
  });

  it('leaves a near spelling to a person', () => {
    expect(tierOf('Stevie Wondr')).toBe('close');
  });

  it('never links a joint billing as one artist', () => {
    expect(tierOf('Stevie Wonder & Paul McCartney')).toBe('combined');
  });

  it('says when nothing matches', () => {
    expect(tierOf('Greg Ladanyi')).toBe('none');
  });

  it('lists sure groups first', () => {
    expect(groups[0].tier).toBe('sure');
    expect(groups.at(-1)?.tier).toBe('none');
  });
});

describe('writing the links', () => {
  it('writes only the id fields, creating origin when absent', () => {
    const body = {
      id: 'africa',
      artist: 'Toto',
      credits: [{ name: 'Jeff Porcaro', role: 'performer' }],
    };
    expect(
      linkBody(body, [
        { idPath: 'origin.artistGlobeId', slug: 'toto' },
        { idPath: 'credits[0].artistGlobeId', slug: 'jeff-porcaro' },
      ]),
    ).toEqual({
      id: 'africa',
      artist: 'Toto',
      origin: { artistGlobeId: 'toto' },
      credits: [
        {
          name: 'Jeff Porcaro',
          role: 'performer',
          artistGlobeId: 'jeff-porcaro',
        },
      ],
    });
    // The input is untouched.
    expect(body).not.toHaveProperty('origin');
  });

  it('skips an index the body no longer has', () => {
    const body = { credits: [{ name: 'A' }] };
    expect(
      linkBody(body, [{ idPath: 'credits[4].artistGlobeId', slug: 'x' }]),
    ).toEqual(body);
  });

  it('gathers each song’s links from the chosen groups', () => {
    const groups = resolveLegacyArtists(SONGS, ARTISTS);
    const toto = groups.find((g) => g.text === 'Toto')!;
    const jeff = groups.find((g) => g.text === 'Jeff Porcaro')!;
    const bySong = linksBySong([
      { group: toto, slug: 'toto' },
      { group: jeff, slug: 'jeff-porcaro' },
    ]);
    expect(bySong.get('africa')).toEqual([
      { idPath: 'origin.artistGlobeId', slug: 'toto' },
      { idPath: 'credits[0].artistGlobeId', slug: 'jeff-porcaro' },
    ]);
  });
});
