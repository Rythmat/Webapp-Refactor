import { describe, expect, it } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type { Suggestion, SuggestionSource } from '@/content/suggestions/types';
import type { SuggestionRow } from '@/hooks/data/admin/useSuggestions';
import {
  bulkBlocker,
  PENDING_REASON,
  SENT_BACK_REASON,
} from '../bulk/bulkAccept';
import { decisionsForWrite, GUESSED_FIELDS } from '../data/logWritten';
import { leadActOf, pinMoves, pinPlaceOf } from '../data/pinMoves';
import { TABLES } from '../model/categories';
import { valueText } from '../model/ghosts';

/**
 * What keeps the owner's review whole: a save that states a suggestion is
 * logged as the owner's decision; a City says which song pins it moves;
 * a sent-back proposal is named as one; a suggested instrument reads by
 * its name.
 */

const APP: SuggestionSource = { provider: 'app', label: 'evt-x tags' };
const MB: SuggestionSource = { provider: 'musicbrainz', label: 'area' };

const row = (
  over: Partial<Suggestion> & Pick<Suggestion, 'id' | 'path' | 'value'>,
  status: SuggestionRow['status'] = 'open',
  decided = false,
): SuggestionRow => ({
  suggestion: {
    target: { kind: 'globe_event', slug: 'evt-motown-detroit-1966' },
    op: 'set',
    display: String(over.value),
    sources: [APP],
    evidence: [],
    confidence: 0.9,
    tier: 'sure',
    batch: 'app',
    ...over,
  } as Suggestion,
  status,
  decision: decided
    ? ({ op: 'accept', method: 'single', at: '2026-10-01' } as never)
    : null,
  unreviewed: false,
});

describe('logging what a save stated', () => {
  const before = { id: 'evt-motown-detroit-1966', title: 'Motown' };

  it('accepts a suggestion the body now says; the server logs it as already there', () => {
    const rows = [
      row({ id: 'place', path: 'placeId', value: 'detroit' }, 'applied'),
    ];
    expect(
      decisionsForWrite(rows, before, { ...before, placeId: 'detroit' }),
    ).toEqual([{ suggestionId: 'place', op: 'accept', method: 'single' }]);
  });

  it('logs the author’s own list for the guesses they were shown, as their value', () => {
    const rows = [
      row(
        {
          id: 'artists',
          path: 'artistIds',
          value: ['diana-ross', 'marvin-gaye', 'temptations'],
        },
        'conflict',
      ),
    ];
    const after = { ...before, artistIds: ['diana-ross', 'marvin-gaye'] };
    expect(
      decisionsForWrite(rows, before, after, GUESSED_FIELDS.globe_event),
    ).toEqual([
      {
        suggestionId: 'artists',
        op: 'accept',
        method: 'single',
        value: ['diana-ross', 'marvin-gaye'],
      },
    ]);
    // Not a field whose guesses were shown: left open, a conflict.
    expect(decisionsForWrite(rows, before, after)).toEqual([]);
  });

  it('leaves alone what the save did not touch, what is decided, and an importer’s value written over', () => {
    const after = { ...before, year: 1967, placeId: 'chicago' };
    const rows = [
      row({ id: 'songs', path: 'songIds', value: ['my-girl'] }, 'open'),
      row({ id: 'year', path: 'year', value: 1967 }, 'applied', true),
      row(
        { id: 'mb-place', path: 'placeId', value: 'detroit', sources: [MB] },
        'conflict',
      ),
    ];
    expect(
      decisionsForWrite(rows, before, after, GUESSED_FIELDS.globe_event),
    ).toEqual([]);
  });
});

describe('the pin-move report', () => {
  const DETROIT = pinPlaceOf({
    name: 'Detroit',
    coordinates: [42.33, -83.05],
  })!;
  const songs = [
    {
      slug: 'whats_going_on',
      body: { title: 'What’s Going On', artist: 'Marvin Gaye' },
    },
    {
      slug: 'lets_get_it_on',
      body: {
        title: 'Let’s Get It On',
        origin: { artistGlobeId: 'marvin-gaye' },
      },
    },
    { slug: 'my_girl', body: { title: 'My Girl', artist: 'The Temptations' } },
    {
      slug: 'sexual_healing',
      body: { title: 'Sexual Healing', artist: 'Marvin Gaye' },
    },
  ];
  const events = new Map<string, Record<string, unknown> | null>([
    [
      'song-whats_going_on',
      { location: { lat: 38.9, lng: -77.03, city: 'Washington' } },
    ],
    [
      'song-lets_get_it_on',
      { location: { lat: 42.33, lng: -83.05, city: 'Detroit' } },
    ],
    [
      'song-my_girl',
      { location: { lat: 38.9, lng: -77.03, city: 'Washington' } },
    ],
  ]);

  it('lists each song the act leads that moves, and how far', () => {
    const report = pinMoves('marvin-gaye', DETROIT, songs, events);
    expect(report.moves).toEqual([
      {
        song: 'whats_going_on',
        title: 'What’s Going On',
        from: 'Washington',
        km: 635,
      },
    ]);
    // Pinned there already, and one with no pin yet.
    expect(report.staying).toBe(1);
    expect(report.unpinned).toBe(1);
  });

  it('reads the lead act as the server does', () => {
    expect(leadActOf({ artist: 'Marvin Gaye' })).toBe('marvin-gaye');
    expect(
      leadActOf({
        artist: 'Marvin Gaye & Tammi Terrell',
        credits: [{ primary: true, artistGlobeId: 'tammi-terrell' }],
      }),
    ).toBe('tammi-terrell');
    expect(pinPlaceOf({ name: 'Nowhere' })).toBeNull();
  });
});

describe('a bulk accept’s reasons', () => {
  it('names a sent-back proposal as one, not as waiting', () => {
    const suggested = row({ id: 'p', path: 'placeId', value: 'detroit' });
    const context = (sentBack: boolean) => ({
      itemOf: () => ({
        itemId: 'db-1',
        label: 'Motown',
        pending: true,
        sentBack,
      }),
      batches: [],
      standing: new Set<string>(),
    });
    expect(bulkBlocker(suggested, context(false))).toBe(PENDING_REASON);
    expect(bulkBlocker(suggested, context(true))).toBe(SENT_BACK_REASON);
  });
});

describe('a suggested value, named', () => {
  it('names an instrument no song credits yet by its vocabulary, not its id', () => {
    const graph = assembleGraph([], []);
    expect(
      valueText(graph, TABLES.artists, 'instrumentIds', [
        'lead-vocals',
        'percussion',
      ]),
    ).toBe('Lead Vocals, Percussion');
  });
});
