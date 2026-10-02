import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import type { Song } from '@/curriculum/types/songLibrary';
import type { GlobeEventInput } from '../../graph/deriveGraph';
import type { EventMatch } from '../../graph/eventMatches';
import { applySuggestion } from '../../suggestions/apply';
import { suggestionId } from '../../suggestions/keys';
import { whyNotBulk } from '../../suggestions/status';
import { isOneWordName, planEventArtists } from '../eventArtists';
import { planEventPlaces } from '../eventPlaces';
import { planEventSongs } from '../eventSongs';
import { PLACEHOLDER_EVENT_YEAR, planSongYears } from '../songYears';
import { APP_BATCH } from '../types';

/**
 * The event planners, and song years: what each offers, how sure, and the
 * precondition it carries. The counts on the repo's data are pinned in
 * repo.test.ts; these pin the rules on small, readable fixtures.
 */

const artists = [
  { slug: 'marvin-gaye', name: 'Marvin Gaye' },
  { slug: 'tammi-terrell', name: 'Tammi Terrell' },
  { slug: 'prince', name: 'Prince' },
  { slug: 'etta-james', name: 'Etta James', aliases: ['Etta'] },
];

const event = (id: string, extra: Partial<GlobeEventInput> = {}) => ({
  id,
  title: 'Something happens',
  year: 1967,
  tags: [],
  genre: [],
  location: { city: 'Detroit', country: 'US', lat: 42.33, lng: -83.05 },
  ...extra,
});

const matched = (
  artistIds: [string, 'title' | 'tags[]'][],
  songIds: [string, 'title' | 'tags[]'][] = [],
): EventMatch => ({
  artists: artistIds.map(([artistId, path]) => ({ artistId, path })),
  songs: songIds.map(([songId, path]) => ({ songId, path })),
});

describe('event artists', () => {
  const events = [
    event('evt-duet', {
      title: 'Marvin Gaye and Tammi Terrell record a duet',
      tags: ['marvin gaye', 'tammi terrell'],
    }),
    event('evt-purple', { tags: ['prince', 'marvin gaye'] }),
    event('evt-nobody'),
    event('song-africa', { tags: ['toto'] }),
  ];
  const eventMatches = new Map([
    [
      'evt-duet',
      matched([
        ['marvin-gaye', 'tags[]'],
        ['tammi-terrell', 'tags[]'],
        ['marvin-gaye', 'title'],
        ['tammi-terrell', 'title'],
      ]),
    ],
    [
      'evt-purple',
      matched([
        ['prince', 'tags[]'],
        ['marvin-gaye', 'tags[]'],
      ]),
    ],
    ['song-africa', matched([['toto', 'title']])],
  ]);
  const plan = planEventArtists({ events, artists, eventMatches });

  it('offers each event its whole list of artists, once each', () => {
    expect(plan.planned.map((p) => p.suggestion.value)).toEqual([
      ['marvin-gaye', 'tammi-terrell'],
      ['prince', 'marvin-gaye'],
    ]);
    const [duet] = plan.planned;
    expect(duet.suggestion).toMatchObject({
      target: { kind: 'globe_event', slug: 'evt-duet' },
      // The whole list, so accepting it never narrows an inferred one.
      path: 'artistIds',
      op: 'set',
      display: 'About Marvin Gaye and Tammi Terrell',
      sources: [{ provider: 'app', label: 'evt-duet tags, title' }],
      evidence: [
        'the title opens on Marvin Gaye, and the tag "marvin gaye" confirms it',
        'the title opens on Tammi Terrell, and the tag "tammi terrell" confirms it',
      ],
      tier: 'sure',
      confidence: 0.9,
      batch: APP_BATCH,
    });
    expect(duet.precondition).toEqual({ state: 'empty' });
  });

  it('is only likely when a one-word name is in the list', () => {
    const purple = plan.planned[1].suggestion;
    expect(purple.tier).toBe('likely');
    expect(purple.confidence).toBe(0.7);
    expect(purple.evidence).toContain(
      '"Prince" is a one-word name, which a tag can mean something else by: a person checks',
    );
    expect(whyNotBulk(purple, 'open')).toBe('it is likely, not sure');
    expect(whyNotBulk(plan.planned[0].suggestion, 'open')).toBeNull();
    expect(isOneWordName('A-ha')).toBe(true);
    expect(isOneWordName('Hall & Oates')).toBe(false);
  });

  it('skips song events, and counts what it read', () => {
    expect(plan.report).toMatchObject({
      events: 3,
      matched: 2,
      pairs: 4,
      sure: { events: 1, pairs: 2 },
      likely: { events: 1, pairs: 2 },
      oneWordArtists: ['prince'],
      unmatched: 1,
    });
  });

  it('carries what the event stores as its precondition', () => {
    const stored = (artistIds: string[]) =>
      planEventArtists({
        events: [{ ...events[0], artistIds }],
        artists,
        eventMatches,
      }).planned[0].precondition;
    expect(stored(['marvin-gaye', 'tammi-terrell'])).toEqual({
      state: 'applied',
    });
    // A reviewer's "none", and a list they edited: a Replace at most.
    expect(stored([])).toEqual({
      state: 'conflict',
      seen: [],
      reason: 'it was set to none',
    });
    expect(stored(['marvin-gaye'])).toMatchObject({
      state: 'conflict',
      seen: ['marvin-gaye'],
    });
  });

  it('is only likely when a name in the list is a place, a genre, or the end of a sentence', () => {
    // Registry entries awaiting the owner (artistRegistry.test.ts), and
    // names carved out of a sentence.
    const doubtful = [
      { slug: 'portland-maine', name: 'Portland, Maine' },
      { slug: 'manila-sound', name: 'Manila Sound' },
      { slug: 'congo-square', name: 'Congo Square:' },
      { slug: 'phil-collins', name: "Phil Collins'" },
      { slug: 'keb-mo', name: "Keb' Mo'" },
      { slug: 'the-roots', name: 'The Roots' },
    ];
    const ids = doubtful.map((a) => a.slug);
    const planned = planEventArtists({
      events: ids.map((id) => event(`evt-${id}`)),
      artists: [...artists, ...doubtful],
      places: CITIES,
      eventMatches: new Map(
        ids.map((id) => [`evt-${id}`, matched([[id, 'tags[]']])]),
      ),
    });
    const tierOf = Object.fromEntries(
      planned.planned.map(({ suggestion }) => [
        suggestion.target.slug,
        suggestion.tier,
      ]),
    );
    expect(tierOf).toEqual({
      'evt-portland-maine': 'likely',
      'evt-manila-sound': 'likely',
      'evt-congo-square': 'likely',
      'evt-phil-collins': 'likely',
      // An apostrophe closing a name that has its own is the name's.
      'evt-keb-mo': 'sure',
      // "The" and one word is one word.
      'evt-the-roots': 'likely',
    });
    expect(planned.report.doubtfulArtists).toEqual([
      { slug: 'congo-square', why: 'spelling' },
      { slug: 'manila-sound', why: 'genre' },
      { slug: 'phil-collins', why: 'spelling' },
      { slug: 'portland-maine', why: 'place' },
    ]);
    expect(planned.report.oneWordArtists).toEqual(['the-roots']);
    expect(planned.planned[0].suggestion.evidence).toContain(
      '"Portland, Maine" is also the name of a place, which the event may be about instead: a person checks',
    );
    expect(planned.planned[2].suggestion.evidence).toContain(
      'the registry writes "Congo Square:" as the end of a sentence would, so it may be no act at all: a person checks',
    );
    expect(isOneWordName('The Internet')).toBe(true);
    expect(isOneWordName('The Rolling Stones')).toBe(false);
  });

  it('keeps its id across runs, and applies as a whole list', () => {
    const again = planEventArtists({ events, artists, eventMatches });
    expect(again.planned.map((p) => p.suggestion.id)).toEqual(
      plan.planned.map((p) => p.suggestion.id),
    );
    const { suggestion } = plan.planned[0];
    expect(suggestion.id).toBe(suggestionId(suggestion));
    const written = applySuggestion(events[0], suggestion);
    expect(written.ok && written.body.artistIds).toEqual([
      'marvin-gaye',
      'tammi-terrell',
    ]);
  });
});

describe('event songs', () => {
  const songs = [
    { id: 'at_last', title: 'At Last', artist: 'Etta James' },
  ] as Song[];
  const events = [
    event('evt-etta', { title: 'Etta James records "At Last"' }),
    event('evt-none'),
  ];
  const eventMatches = new Map([
    ['evt-etta', matched([['etta-james', 'tags[]']], [['at_last', 'title']])],
  ]);

  it('offers the songs an event names, as a sure whole list', () => {
    const plan = planEventSongs({ events, songs, eventMatches });
    expect(plan.planned).toHaveLength(1);
    expect(plan.planned[0].suggestion).toMatchObject({
      target: { kind: 'globe_event', slug: 'evt-etta' },
      path: 'songIds',
      op: 'set',
      value: ['at_last'],
      display: 'About "At Last"',
      evidence: [
        'the title quotes "At Last", and the event is about its artist, Etta James',
      ],
      tier: 'sure',
    });
    expect(plan.report).toMatchObject({ events: 2, matched: 1, pairs: 1 });
  });
});

describe('event places', () => {
  const plan = planEventPlaces({
    places: CITIES,
    events: [
      event('evt-detroit'),
      event('evt-maine', {
        location: {
          city: 'Portland',
          country: 'US',
          lat: 43.6591,
          lng: -70.2568,
        },
      }),
      event('evt-far', {
        location: {
          city: 'Clarksdale',
          country: 'US',
          lat: 32.3,
          lng: -90.18,
        },
      }),
      event('evt-woodstock', {
        location: { city: 'Bethel', country: 'US', lat: 41.7, lng: -74.88 },
      }),
      event('evt-woodstock-again', {
        location: { city: 'Bethel', country: 'US', lat: 41.71, lng: -74.87 },
      }),
      event('evt-nowhere', {
        location: { city: '', country: 'US', lat: 0, lng: 0 },
      }),
      event('song-africa'),
    ],
  });
  const byEvent = Object.fromEntries(
    plan.planned.map((p) => [p.suggestion.target.slug, p.suggestion]),
  );

  it('is sure of a registered city, alone or settled by the pin', () => {
    expect(byEvent['evt-detroit']).toMatchObject({
      path: 'placeId',
      op: 'set',
      value: 'detroit',
      display: 'Took place in Detroit',
      evidence: ['location.city "Detroit" (US) is our Detroit'],
      tier: 'sure',
    });
    expect(byEvent['evt-maine']).toMatchObject({
      value: 'portland-me',
      tier: 'sure',
    });
  });

  it('is only likely where the pin is far from the city it names', () => {
    expect(byEvent['evt-far']).toMatchObject({
      value: 'clarksdale-ms',
      tier: 'likely',
    });
    expect(plan.report.far).toEqual([
      {
        event: 'evt-far',
        city: 'Clarksdale',
        placeId: 'clarksdale-ms',
        km: 214,
      },
    ]);
  });

  it('makes a city none of ours first, once for every event there', () => {
    expect(byEvent['evt-woodstock']).toMatchObject({
      value: 'bethel',
      display: 'Took place in Bethel (a new place)',
      tier: 'likely',
      confidence: 0.65,
      requires: [{ kind: 'globe_city', slug: 'bethel' }],
    });
    expect(byEvent['evt-woodstock-again'].requires).toEqual(
      byEvent['evt-woodstock'].requires,
    );
    expect(whyNotBulk(byEvent['evt-woodstock'], 'open')).toBe(
      'it is likely, not sure',
    );
  });

  it('counts what it read, and skips song events', () => {
    expect(plan.report).toMatchObject({
      events: 6,
      noCity: 1,
      byName: 1,
      byCoordinates: 1,
      toCreate: { events: 2, places: 1 },
      sure: 2,
      likely: 3,
    });
    expect(byEvent['song-africa']).toBeUndefined();
  });
});

describe('song years', () => {
  const songs = [
    { id: 'dated', title: 'Dated', artist: 'A', year: 1971 },
    { id: 'undated', title: 'Undated', artist: 'A' },
    { id: 'placeholder', title: 'Placeholder', artist: 'A' },
    { id: 'no_event', title: 'No event', artist: 'A' },
  ] as Song[];
  const events = [
    event('song-dated', { year: 1971 }),
    event('song-undated', { year: 1980 }),
    event('song-placeholder', { year: PLACEHOLDER_EVENT_YEAR }),
  ];
  const plan = planSongYears({ songs, events });

  it('offers a song its event’s year, never the placeholder, never in bulk', () => {
    expect(plan.planned.map((p) => p.suggestion)).toEqual([
      expect.objectContaining({
        target: { kind: 'song', slug: 'undated' },
        path: 'year',
        op: 'set',
        value: 1980,
        display: 'Year: 1980',
        sources: [{ provider: 'app', label: 'song-undated year' }],
        tier: 'likely',
      }),
    ]);
    expect(whyNotBulk(plan.planned[0].suggestion, 'open')).not.toBeNull();
    expect(plan.report).toMatchObject({
      undated: 3,
      noEvent: 1,
      placeholder: 1,
      offered: 1,
    });
  });
});
