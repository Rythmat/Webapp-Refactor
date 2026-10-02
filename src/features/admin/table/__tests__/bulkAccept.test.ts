import { describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import {
  isSongPinCity,
  RESTS_ON_REASON,
  SONG_PIN_REASON,
  SONG_YEAR_REASON,
} from '@/content/suggestions/status';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import type {
  DecisionResult,
  SuggestionBatch,
  SuggestionRow,
} from '@/hooks/data/admin/useSuggestions';
import {
  type BulkContext,
  type BulkItem,
  bulkBlocker,
  bulkDecisions,
  CALIBRATION_REASON,
  chunksOf,
  clampThreshold,
  itemOutcome,
  PENDING_REASON,
  planBulkAccept,
  recordsToMake,
  skippedByReason,
  standingIds,
  waitingForCalibration,
} from '../bulk/bulkAccept';

/**
 * Which suggestions a bulk accept takes (design §5.1): sure, confident, the
 * importer's only once calibrated and resting on a suggestion that stands —
 * as the server reports it beside the row, since it is often another
 * item's — never a song-pin City nor a song's year, never over a proposal;
 * and the dry run it shows, and what becomes of each item from the
 * server's answers.
 */

const APP = (label: string): SuggestionSource => ({ provider: 'app', label });
const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: 'https://musicbrainz.org/artist/afdb7919',
  label: 'area',
};

const suggest = (parts: {
  kind?: string;
  slug: string;
  path: string;
  value: unknown;
  tier?: SuggestionTier;
  confidence?: number;
  sources?: SuggestionSource[];
  batch?: string;
  requires?: RequiredRecord[];
  dependsOn?: string;
}): Suggestion => {
  const target = { kind: parts.kind ?? 'globe_event', slug: parts.slug };
  return {
    id: suggestionId({
      target,
      path: parts.path,
      op: 'set',
      value: parts.value,
    }),
    target,
    path: parts.path,
    op: 'set',
    value: parts.value,
    display: `${parts.path} ${JSON.stringify(parts.value)}`,
    sources: parts.sources ?? [APP(`${parts.slug} ${parts.path}`)],
    evidence: ['read from the event'],
    confidence: parts.confidence ?? 0.9,
    tier: parts.tier ?? 'sure',
    ...(parts.requires ? { requires: parts.requires } : {}),
    ...(parts.dependsOn ? { dependsOn: parts.dependsOn } : {}),
    batch: parts.batch ?? 'app-stage1',
  };
};

const open = (
  suggestion: Suggestion,
  over: Partial<SuggestionRow> = {},
): SuggestionRow => ({
  suggestion,
  status: 'open',
  decision: null,
  unreviewed: false,
  ...over,
});

const GARY: RequiredRecord = {
  kind: 'globe_city',
  slug: 'gary',
  body: { id: 'gary', name: 'Gary', country: 'US', pin: false },
};

const ITEMS: Record<string, BulkItem> = {
  'evt-live-aid': {
    itemId: 'db-1',
    label: 'Live Aid',
    body: { id: 'evt-live-aid', title: 'Live Aid' },
    pending: false,
  },
  'evt-woodstock': {
    itemId: 'db-2',
    label: 'Woodstock',
    body: { id: 'evt-woodstock', title: 'Woodstock' },
    pending: false,
  },
  'evt-proposed': {
    itemId: 'db-3',
    label: 'Proposed',
    body: { id: 'evt-proposed' },
    pending: true,
  },
  'evt-repo-only': { label: 'Only in the repo', pending: false },
  'marvin-gaye': {
    itemId: 'db-4',
    label: 'Marvin Gaye',
    body: { slug: 'marvin-gaye', name: 'Marvin Gaye' },
    pending: false,
  },
};

const BATCHES: SuggestionBatch[] = [
  {
    batch: 'app-stage1',
    providers: ['app'],
    count: 9,
    calibrated: null,
    measuredPrecision: null,
  },
  {
    batch: 'mb-2026-09-30',
    providers: ['musicbrainz'],
    count: 3,
    calibrated: false,
    measuredPrecision: null,
  },
];

const context = (over: Partial<BulkContext> = {}): BulkContext => ({
  itemOf: (slug) => ITEMS[slug],
  batches: BATCHES,
  standing: new Set(),
  ...over,
});

const identity = suggest({
  kind: 'artist',
  slug: 'marvin-gaye',
  path: 'externalIds.mbid',
  value: 'afdb7919',
  sources: [MB],
  batch: 'mb-2026-09-30',
  confidence: 1,
});
const born = suggest({
  kind: 'artist',
  slug: 'marvin-gaye',
  path: 'born.date',
  value: '1939-04-02',
  sources: [MB],
  batch: 'mb-2026-09-30',
  confidence: 1,
  dependsOn: identity.id,
});

describe('what a bulk accept takes', () => {
  it("takes the app's sure suggestions at 85% and up", () => {
    const place = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'gary',
    });
    expect(bulkBlocker(open(place), context())).toBeNull();
  });

  it('leaves out what is not sure, or not sure enough', () => {
    const likely = suggest({
      slug: 'evt-live-aid',
      path: 'artistIds',
      value: ['prince'],
      tier: 'likely',
      confidence: 0.7,
    });
    expect(bulkBlocker(open(likely), context())).toBe('it is likely, not sure');
    const shaky = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'gary',
      confidence: 0.8,
    });
    expect(bulkBlocker(open(shaky), context())).toBe(
      'its confidence is below 85%',
    );
    // Raised by the owner, a 0.9 no longer passes…
    const place = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'x',
    });
    expect(bulkBlocker(open(place), context({ threshold: 0.95 }))).toBe(
      'its confidence is below 95%',
    );
    // …and lowered, never below the floor.
    expect(clampThreshold(0.5)).toBe(0.7);
    const low = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'y',
      confidence: 0.65,
    });
    expect(bulkBlocker(open(low), context({ threshold: 0.5 }))).toBe(
      'its confidence is below 70%',
    );
  });

  it("holds the importer's back until its run is calibrated, and its identity accepted", () => {
    expect(bulkBlocker(open(identity), context())).toBe(CALIBRATION_REASON);
    expect(bulkBlocker(open(born), context())).toBe(CALIBRATION_REASON);
    const calibrated = context({
      batches: BATCHES.map((b) =>
        b.batch === 'mb-2026-09-30' ? { ...b, calibrated: true } : b,
      ),
    });
    expect(bulkBlocker(open(identity), calibrated)).toBeNull();
    expect(bulkBlocker(open(born), calibrated)).toBe(RESTS_ON_REASON);
    expect(
      bulkBlocker(open(born), {
        ...calibrated,
        standing: new Set([identity.id]),
      }),
    ).toBeNull();
  });

  it('rests on what the server says of another item’s suggestion', () => {
    // A song's rows rest on its lead act's identity, which a songs list
    // never holds: the server says how it stands, beside the row.
    const calibrated = context({
      batches: [
        ...BATCHES,
        {
          batch: 'mb-songs-2026-09-30',
          providers: ['musicbrainz'],
          count: 2,
          calibrated: true,
          measuredPrecision: 0.99,
        },
      ],
      itemOf: (slug) =>
        slug === 'superstition'
          ? { itemId: 'db-9', label: 'Superstition', body: {}, pending: false }
          : ITEMS[slug],
    });
    const clavinet = suggest({
      kind: 'song',
      slug: 'superstition',
      path: 'session.studioId',
      value: 'electric-lady-studios',
      sources: [MB],
      batch: 'mb-songs-2026-09-30',
      confidence: 1,
      dependsOn: identity.id,
    });
    const dependency = {
      id: identity.id,
      target: identity.target,
      path: identity.path,
      display: identity.display,
      status: 'applied' as const,
      stands: true,
    };
    expect(bulkBlocker(open(clavinet), calibrated)).toBe(RESTS_ON_REASON);
    expect(bulkBlocker(open(clavinet, { dependency }), calibrated)).toBeNull();
    // What the server says wins over a list that holds the row too.
    expect(
      bulkBlocker(
        open(clavinet, { dependency: { ...dependency, stands: false } }),
        {
          ...calibrated,
          standing: new Set([identity.id]),
        },
      ),
    ).toBe(RESTS_ON_REASON);
  });

  it('never takes a song’s year, however sure (C15)', () => {
    const year = suggest({
      kind: 'song',
      slug: 'superstition',
      path: 'year',
      value: 1972,
      confidence: 1,
    });
    expect(bulkBlocker(open(year), context())).toBe(SONG_YEAR_REASON);
    // An event's year is not a song's.
    expect(
      bulkBlocker(
        open(suggest({ slug: 'evt-live-aid', path: 'year', value: 1985 })),
        context(),
      ),
    ).toBeNull();
  });

  it('never takes a City read from song pins, however sure', () => {
    const pinned = suggest({
      kind: 'artist',
      slug: 'marvin-gaye',
      path: 'basedInPlaceId',
      value: 'washington-dc',
      // Merged with the importer's: sure, calibrated — still a song pin.
      sources: [MB, APP('artist_location "marvin gaye" city')],
      batch: 'mb-2026-09-30',
    });
    expect(isSongPinCity(pinned)).toBe(true);
    const calibrated = context({
      batches: [{ ...BATCHES[1], calibrated: true }],
    });
    expect(bulkBlocker(open(pinned), calibrated)).toBe(SONG_PIN_REASON);
    // A birthplace the song pins agree with is not a City.
    expect(isSongPinCity({ ...pinned, path: 'born.placeId' })).toBe(false);
  });

  it('leaves out what is decided, or no longer fits', () => {
    const place = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'z',
    });
    expect(bulkBlocker(open(place, { status: 'conflict' }), context())).toBe(
      'it conflicts with what the item says',
    );
    expect(bulkBlocker(open(place, { status: 'removed' }), context())).toBe(
      'it was accepted once and taken out by hand since',
    );
    expect(bulkBlocker(open(place, { status: 'rejected' }), context())).toBe(
      'it was rejected',
    );
  });

  it('leaves out an item with a proposal waiting, or not in the API', () => {
    const proposed = suggest({
      slug: 'evt-proposed',
      path: 'placeId',
      value: 'a',
    });
    expect(bulkBlocker(open(proposed), context())).toBe(PENDING_REASON);
    const repo = suggest({
      slug: 'evt-repo-only',
      path: 'placeId',
      value: 'a',
    });
    expect(bulkBlocker(open(repo), context())).toBe(
      'its item is not in the content API yet',
    );
  });

  it('leaves out one whose record to make has no body', () => {
    const broken = suggest({
      slug: 'evt-live-aid',
      path: 'placeId',
      value: 'gary',
      requires: [{ kind: 'globe_city', slug: 'gary', body: null }],
    });
    expect(bulkBlocker(open(broken), context())).toBe(
      'a record it needs has no body to make it from',
    );
  });

  it('knows an accept that stands from one waiting in a proposal, or taken out since', () => {
    const decision = {
      suggestionId: identity.id,
      op: 'accept' as const,
      target: identity.target,
      path: identity.path,
      valueHash: 'x',
      method: 'single' as const,
      by: 'me',
      at: '2026-09-30T00:00:00.000Z',
    };
    const rows = [
      open(identity, { status: 'applied', decision }),
      open(born, {
        status: 'accepted',
        decision: { ...decision, suggestionId: born.id },
      }),
    ];
    expect([...standingIds(rows)]).toEqual([identity.id]);
    // Accepted, then taken out by hand: it no longer stands.
    expect([
      ...standingIds([open(identity, { status: 'removed', decision })]),
    ]).toEqual([]);
    // Typed by hand, with no decision at all: the item says it.
    expect([...standingIds([open(identity, { status: 'applied' })])]).toEqual([
      identity.id,
    ]);
  });

  it('never counts a Label row’s own release as a record to make', () => {
    const release = {
      kind: 'release',
      slug: 'stevie-wonder-talking-book',
      body: { slug: 'stevie-wonder-talking-book', title: 'Talking Book' },
    };
    const tamla = {
      kind: 'label',
      slug: 'tamla',
      body: { slug: 'tamla', name: 'Tamla' },
    };
    const label = suggest({
      kind: 'release',
      slug: 'stevie-wonder-talking-book',
      path: 'labelId',
      value: 'tamla',
      requires: [release, tamla],
    });
    expect(recordsToMake(label)).toEqual([tamla]);
  });
});

describe('the dry run', () => {
  const liveAidPlace = suggest({
    slug: 'evt-live-aid',
    path: 'placeId',
    value: 'gary',
    requires: [GARY],
  });
  const liveAidArtists = suggest({
    slug: 'evt-live-aid',
    path: 'artistIds',
    value: ['toto', 'queen'],
  });
  const woodstockPlace = suggest({
    slug: 'evt-woodstock',
    path: 'placeId',
    value: 'bethel',
  });
  // A second value for a field another suggestion fills: it cannot land.
  const woodstockOther = suggest({
    slug: 'evt-woodstock',
    path: 'placeId',
    value: 'white-lake',
  });
  const proposed = suggest({
    slug: 'evt-proposed',
    path: 'placeId',
    value: 'q',
  });
  const likely = suggest({
    slug: 'evt-woodstock',
    path: 'artistIds',
    value: ['santana'],
    tier: 'likely',
    confidence: 0.7,
  });
  const rows = [
    liveAidPlace,
    liveAidArtists,
    woodstockPlace,
    woodstockOther,
    proposed,
    likely,
    born,
  ].map((s) => open(s));

  it('counts the items and suggestions, with each body before and after', () => {
    const plan = planBulkAccept(rows, context());
    expect(plan.items.map((item) => item.slug)).toEqual([
      'evt-live-aid',
      'evt-woodstock',
    ]);
    expect(plan.count).toBe(3);
    const [liveAid, woodstock] = plan.items;
    expect(liveAid.itemId).toBe('db-1');
    expect(liveAid.before).toEqual({ id: 'evt-live-aid', title: 'Live Aid' });
    expect(liveAid.after).toEqual({
      id: 'evt-live-aid',
      title: 'Live Aid',
      placeId: 'gary',
      artistIds: ['toto', 'queen'],
    });
    expect(woodstock.after.placeId).toBe('bethel');
    expect(plan.records).toEqual([GARY]);
  });

  it('lists what it leaves out, with the row and why', () => {
    const plan = planBulkAccept(rows, context());
    const why = new Map(
      plan.skipped.map((s) => [s.suggestion.id, `${s.label}: ${s.reason}`]),
    );
    expect(why.get(woodstockOther.id)).toBe(
      'Woodstock: it conflicts with another suggestion for placeId',
    );
    expect(why.get(proposed.id)).toBe(`Proposed: ${PENDING_REASON}`);
    expect(why.get(likely.id)).toBe('Woodstock: it is likely, not sure');
    expect(why.get(born.id)).toBe(`Marvin Gaye: ${CALIBRATION_REASON}`);
    expect(skippedByReason(plan.skipped).map((g) => g.entries.length)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(waitingForCalibration(plan.skipped)).toEqual({
      count: 1,
      batches: ['mb-2026-09-30'],
    });
  });

  it('takes only the fields ticked', () => {
    const plan = planBulkAccept(rows, context(), (s) => s.path === 'artistIds');
    expect(plan.count).toBe(1);
    expect(plan.items.map((item) => item.slug)).toEqual(['evt-live-aid']);
    expect(plan.records).toEqual([]);
    // What is not ticked is not "left out": it was never asked for.
    expect(plan.skipped.map((s) => s.suggestion.id)).toEqual([likely.id]);
  });

  it('orders the records to make places first, each once', () => {
    const artist: RequiredRecord = {
      kind: 'artist',
      slug: 'new-act',
      body: { slug: 'new-act', name: 'New Act' },
    };
    const plan = planBulkAccept(
      [
        open(
          suggest({
            slug: 'evt-live-aid',
            path: 'artistIds',
            value: ['new-act'],
            requires: [artist],
          }),
        ),
        open(liveAidPlace),
        open(
          suggest({
            slug: 'evt-woodstock',
            path: 'placeId',
            value: 'gary',
            requires: [GARY],
          }),
        ),
      ],
      context(),
    );
    expect(plan.records.map((r) => `${r.kind}:${r.slug}`)).toEqual([
      'globe_city:gary',
      'artist:new-act',
    ]);
  });
});

describe('sending and reading back', () => {
  it('sends each accept in bulk, as offered', () => {
    const plan = planBulkAccept(
      [
        open(suggest({ slug: 'evt-live-aid', path: 'placeId', value: 'gary' })),
        open(
          suggest({ slug: 'evt-live-aid', path: 'artistIds', value: ['toto'] }),
        ),
      ],
      context(),
    );
    expect(bulkDecisions(plan.items[0])).toEqual([
      { suggestionId: expect.any(String), op: 'accept', method: 'bulk' },
      { suggestionId: expect.any(String), op: 'accept', method: 'bulk' },
    ]);
    expect(chunksOf([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  const saved = (id: string): DecisionResult => ({
    suggestionId: id,
    outcome: 'saved',
    decision: {
      suggestionId: id,
      op: 'accept',
      target: { kind: 'globe_event', slug: 'x' },
      path: 'placeId',
      valueHash: 'h',
      method: 'bulk',
      by: 'me',
      at: '2026-09-30T00:00:00.000Z',
    },
  });
  const refused = (
    id: string,
    status: number,
    code: string,
    error: string,
  ): DecisionResult => ({
    suggestionId: id,
    outcome: 'refused',
    status,
    code,
    error,
  });

  it('reads an item as written when any accept went in, the refused listed', () => {
    expect(
      itemOutcome([
        saved('a'),
        refused(
          'b',
          409,
          'SUGGESTION_CONFLICT',
          'placeId holds something else',
        ),
      ]),
    ).toEqual({
      state: 'written',
      accepted: 1,
      refused: ['placeId holds something else'],
    });
  });

  it('reads a proposal in the way as skipped, a refusal as a conflict, a crash as a failure', () => {
    expect(
      itemOutcome([
        refused('a', 409, 'PENDING_PROPOSAL', 'A proposal waits from Eddie.'),
      ]),
    ).toEqual({ state: 'skipped', reason: 'A proposal waits from Eddie.' });
    expect(
      itemOutcome([
        refused('a', 422, 'NOT_BULK', 'Not accepted in bulk: it was rejected.'),
        refused('b', 409, 'REQUIRED_RECORD_TAKEN', 'A different place has it.'),
      ]),
    ).toEqual({
      state: 'conflict',
      reasons: [
        'Not accepted in bulk: it was rejected.',
        'A different place has it.',
      ],
    });
    expect(
      itemOutcome([refused('a', 500, 'FAILED', 'The save failed.')]),
    ).toEqual({ state: 'failed', reason: 'The save failed.' });
  });
});
