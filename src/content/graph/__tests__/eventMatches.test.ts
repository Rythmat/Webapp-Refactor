import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createEventMatcher,
  eventsByArtist,
  type MatchableArtist,
  type MatchableSong,
  matchEventSubjects,
} from '../eventMatches';

const ARTISTS: MatchableArtist[] = [
  { slug: 'etta-james', name: 'Etta James' },
  { slug: 'toto', name: 'Toto' },
  { slug: 'charlie-parker', name: 'Charlie Parker', aliases: ['Bird'] },
  { slug: 'dizzy-gillespie', name: 'Dizzy Gillespie' },
  { slug: 'bts', name: 'BTS' },
  { slug: 'blackpink', name: 'BLACKPINK' },
  { slug: 'youssou-ndour', name: 'Youssou N’Dour' },
];

const SONGS: MatchableSong[] = [
  { id: 'at_last', title: 'At Last', artistIds: ['etta-james'] },
  { id: 'africa', title: 'Africa', artistIds: ['toto'] },
  { id: 'air', title: 'Air', artistIds: ['etta-james'] },
];

const matcher = createEventMatcher({ artists: ARTISTS, songs: SONGS });

describe('who an event is about', () => {
  it('reads a song event’s artist after the em dash', () => {
    expect(
      matcher.match({ id: 'song-africa', title: 'Africa — Toto', tags: [] })
        .artists,
    ).toEqual([{ artistId: 'toto', path: 'title' }]);
  });

  it('takes a title’s subject only when a tag confirms it', () => {
    const confirmed = matcher.match({
      id: 'evt-a',
      title: 'Etta James records "At Last"',
      tags: ['etta james', 'soul'],
    });
    expect(confirmed.artists).toEqual([
      { artistId: 'etta-james', path: 'tags[]' },
      { artistId: 'etta-james', path: 'title' },
    ]);

    const mentioned = matcher.match({
      id: 'evt-b',
      title: 'Etta James is sampled on a dance record',
      tags: ['dance'],
    });
    expect(mentioned.artists).toEqual([]);
  });

  it('splits a title that opens on two names', () => {
    const { artists } = matcher.match({
      id: 'evt-k',
      title: 'BTS and BLACKPINK make K-pop a global force',
      tags: ['bts', 'blackpink'],
    });
    expect(artists.filter((a) => a.path === 'title')).toEqual([
      { artistId: 'bts', path: 'title' },
      { artistId: 'blackpink', path: 'title' },
    ]);
  });

  it('matches a tag by name or alias, accents folded', () => {
    const { artists } = matcher.match({
      id: 'evt-c',
      title: 'Bebop is born on 52nd Street',
      tags: ['bebop', 'bird', 'dizzy gillespie', 'youssou ndour'],
    });
    expect(artists).toEqual([
      { artistId: 'charlie-parker', path: 'tags[]' },
      { artistId: 'dizzy-gillespie', path: 'tags[]' },
      { artistId: 'youssou-ndour', path: 'tags[]' },
    ]);
  });

  it('names an artist by name, alias or slug', () => {
    expect(matcher.artistNamed('Charlie Parker')).toBe('charlie-parker');
    expect(matcher.artistNamed('bird')).toBe('charlie-parker');
    expect(matcher.artistNamed('charlie-parker')).toBe('charlie-parker');
    expect(matcher.artistNamed('Chicago')).toBeUndefined();
  });

  it('reads an event with no title or tags as about no one', () => {
    expect(matcher.match({ id: 'evt-empty' })).toEqual({
      artists: [],
      songs: [],
    });
  });
});

describe('a name that is also a place or a genre', () => {
  const withChicago = [
    ...ARTISTS,
    {
      slug: 'chicago',
      name: 'Chicago',
      aliases: ['Chicago Transit Authority'],
    },
  ];
  const guarded = createEventMatcher({
    artists: withChicago,
    placeNames: ['Chicago', 'Detroit'],
    genreNames: ['Jazz'],
  });
  const unguarded = createEventMatcher({ artists: withChicago });

  const blues = {
    id: 'evt-chicago-blues',
    title: 'Muddy Waters plugs in on the South Side',
    tags: ['chicago', 'blues'],
  };
  const band = {
    id: 'evt-chicago-band',
    title: 'Chicago release their debut',
    tags: ['chicago', 'horns'],
  };

  it('never matches on a tag alone', () => {
    expect(guarded.match(blues).artists).toEqual([]);
    // Without the sets, the city's tag is the band's: the ambiguity the
    // registry's guard test keeps out.
    expect(unguarded.match(blues).artists).toEqual([
      { artistId: 'chicago', path: 'tags[]' },
    ]);
  });

  it('still matches a title that opens on it with a tag that confirms it', () => {
    expect(guarded.match(band).artists).toEqual([
      { artistId: 'chicago', path: 'title' },
    ]);
  });

  it('still matches a song event that credits it', () => {
    expect(
      guarded.match({ id: 'song-saturday', title: 'Saturday — Chicago' })
        .artists,
    ).toEqual([{ artistId: 'chicago', path: 'title' }]);
  });

  it('still matches through a tag that is not a place or genre', () => {
    expect(
      guarded.match({ id: 'evt-cta', tags: ['chicago transit authority'] })
        .artists,
    ).toEqual([{ artistId: 'chicago', path: 'tags[]' }]);
  });

  it('accepts the sets as written or already normalised', () => {
    const normalised = createEventMatcher({
      artists: withChicago,
      placeNames: ['chicago'],
    });
    expect(normalised.match(blues).artists).toEqual([]);
  });
});

describe('the songs an event is about', () => {
  it('matches a tag that is a song title when its artist is matched too', () => {
    expect(
      matcher.match({
        id: 'evt-a',
        title: 'Etta James signs to Argo',
        tags: ['etta james', 'at last'],
      }).songs,
    ).toEqual([{ songId: 'at_last', path: 'tags[]' }]);
  });

  it('matches a phrase the title quotes', () => {
    expect(
      matcher.match({
        id: 'evt-a',
        title: 'Etta James records "At Last"',
        tags: ['etta james'],
      }).songs,
    ).toEqual([{ songId: 'at_last', path: 'title' }]);
    expect(
      matcher.match({
        id: 'evt-b',
        title: 'Etta James records ‘At Last’ in Chicago',
        tags: ['etta james'],
      }).songs,
    ).toEqual([{ songId: 'at_last', path: 'title' }]);
  });

  it('lists a song the title and a tag both name once for each', () => {
    expect(
      matcher.match({
        id: 'evt-a',
        title: 'Etta James records "At Last"',
        tags: ['etta james', 'at last'],
      }).songs,
    ).toEqual([
      { songId: 'at_last', path: 'tags[]' },
      { songId: 'at_last', path: 'title' },
    ]);
  });

  it('needs the song’s artist among the event’s', () => {
    // 'africa' on a highlife event is the continent, not Toto's song.
    expect(
      matcher.match({
        id: 'evt-highlife',
        title: 'Highlife sweeps West Africa',
        tags: ['africa', 'highlife'],
      }).songs,
    ).toEqual([]);
  });

  it('ignores titles shorter than four characters', () => {
    expect(
      matcher.match({ id: 'evt-a', tags: ['etta james', 'air'] }).songs,
    ).toEqual([]);
  });

  it('does not read an apostrophe as a quote', () => {
    expect(
      matcher.match({
        id: 'evt-a',
        title: "Etta James's 'At Last' sessions and Bustin' Loose",
        tags: ['etta james'],
      }).songs,
    ).toEqual([{ songId: 'at_last', path: 'title' }]);
    expect(
      matcher.match({
        id: 'evt-b',
        title: "Etta James's At Last' session",
        tags: ['etta james'],
      }).songs,
    ).toEqual([]);
  });

  it('gives a song event no songs: it is its song', () => {
    expect(
      matcher.match({
        id: 'song-africa',
        title: 'Africa — Toto',
        tags: ['africa', 'toto'],
      }).songs,
    ).toEqual([]);
  });

  it('reads the artists an event stores, once confirmed, for its songs', () => {
    // Etta James rejected (an empty list): the song only she admitted goes
    // with her, while the text still reports her as found.
    const rejected = matcher.match({
      id: 'evt-a',
      title: 'Etta James records "At Last"',
      tags: ['etta james'],
      artistIds: [],
    });
    expect(rejected.songs).toEqual([]);
    expect(rejected.artists).toEqual([
      { artistId: 'etta-james', path: 'tags[]' },
      { artistId: 'etta-james', path: 'title' },
    ]);
    // Toto confirmed where the text names no one: his song counts.
    expect(
      matcher.match({
        id: 'evt-b',
        title: 'A night of "Africa"',
        tags: ['africa'],
        artistIds: ['toto'],
      }).songs,
    ).toEqual([
      { songId: 'africa', path: 'tags[]' },
      { songId: 'africa', path: 'title' },
    ]);
  });

  it('matches no songs when the caller passes none', () => {
    const artistsOnly = createEventMatcher({ artists: ARTISTS });
    expect(
      artistsOnly.match({
        id: 'evt-a',
        title: 'Etta James records "At Last"',
        tags: ['etta james', 'at last'],
      }).songs,
    ).toEqual([]);
  });
});

describe('the student globe’s copy', () => {
  it('uses no lookbehind, which Safari before 16.4 cannot parse', () => {
    // The globe route imports this module (and its one import) statically:
    // a lookbehind anywhere in them stops the whole chunk loading there,
    // whether or not the code that holds it ever runs.
    for (const file of [
      'src/content/graph/eventMatches.ts',
      'src/content/graph/slugs.ts',
    ]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\(\?<[=!]/);
    }
  });

  it('skips a quote inside a word and reads on', () => {
    // "l'Africa'" opens inside a word, so it quotes nothing, even with Toto
    // among the event's artists; the phrase after it still counts.
    expect(
      matcher.match({
        id: 'evt-a',
        title: "Etta James and Toto: l'Africa' and 'At Last'",
        tags: ['etta james', 'toto'],
      }).songs,
    ).toEqual([{ songId: 'at_last', path: 'title' }]);
  });
});

describe('every event at once', () => {
  it('keys each match by event id', () => {
    const matches = matchEventSubjects(
      [
        { id: 'song-africa', title: 'Africa — Toto' },
        { id: 'evt-c', tags: ['dizzy gillespie'] },
      ],
      { artists: ARTISTS },
    );
    expect([...matches.keys()]).toEqual(['song-africa', 'evt-c']);
    expect(matches.get('evt-c')?.artists).toEqual([
      { artistId: 'dizzy-gillespie', path: 'tags[]' },
    ]);
  });
});

describe('the events an artist appears in', () => {
  it('lists them earliest first, same-year events in the order the rules found them', () => {
    const events = [
      // Only tags her, and comes first in the data.
      {
        id: 'evt-tagged',
        year: 1960,
        title: 'Chess Records',
        tags: ['etta james'],
      },
      { id: 'evt-late', year: 1967, title: 'Tell Mama', tags: ['etta james'] },
      // Her title, the same year as the tagged one.
      {
        id: 'evt-subject',
        year: 1960,
        title: 'Etta James records "At Last"',
        tags: ['etta james'],
      },
      {
        id: 'song-at_last',
        year: 1960,
        title: 'At Last — Etta James',
        tags: [],
      },
      {
        id: 'evt-early',
        year: 1954,
        title: 'Roll with me',
        tags: ['etta james'],
      },
    ];
    const index = eventsByArtist(events, matcher);
    expect(index.get('etta-james')).toEqual([
      'evt-early',
      'song-at_last',
      'evt-subject',
      'evt-tagged',
      'evt-late',
    ]);
  });

  it('leaves out an artist no event names', () => {
    const index = eventsByArtist(
      [{ id: 'evt-a', year: 1990, tags: ['toto'] }],
      matcher,
    );
    expect([...index.keys()]).toEqual(['toto']);
  });
});
