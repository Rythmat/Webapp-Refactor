import { describe, expect, it } from 'vitest';
import { suggestionId, valueHash } from '../keys';
import {
  AMBIGUOUS_REASON,
  BULK_FLOOR,
  canReopen,
  decisionState,
  decisionsBySuggestion,
  dependencyStands,
  EXTERNAL_ID_REASON,
  identityTaken,
  isExternalIdPath,
  makeDecision,
  isSongPinCity,
  recordsNamedBy,
  RESTS_ON_REASON,
  SONG_PIN_REASON,
  SONG_YEAR_REASON,
  suggestionStatus,
  whyNotBulk,
  whyNotImported,
} from '../status';
import type { Suggestion, SuggestionDecision } from '../types';

const base = {
  target: { kind: 'artist', slug: 'marvin-gaye' },
  path: 'basedInPlaceId',
  op: 'set' as const,
  value: 'detroit',
  display: 'City: Detroit',
  sources: [{ provider: 'musicbrainz' as const }],
  evidence: [],
  confidence: 0.9,
  tier: 'sure' as const,
  batch: 'mb-2026-10-02',
};
const detroit: Suggestion = { id: suggestionId(base), ...base };

let clock = 0;
const decide = (
  op: SuggestionDecision['op'],
  method: SuggestionDecision['method'] = 'single',
  suggestion = detroit,
) =>
  makeDecision(suggestion, op, {
    by: 'owner',
    method,
    at: new Date(Date.UTC(2026, 9, 2, 0, 0, clock++)).toISOString(),
  });

describe('the decisions log', () => {
  it('is open until someone decides', () => {
    expect(decisionState(detroit, [])).toEqual({
      state: 'open',
      unreviewed: false,
    });
  });

  it('follows the latest decision', () => {
    const log = [decide('reject'), decide('accept')];
    expect(decisionState(detroit, log).state).toBe('accepted');
    expect(decisionState(detroit, [...log, decide('drop')]).state).toBe(
      'dropped',
    );
  });

  it('orders by time, whatever order the log arrives in', () => {
    const accept = decide('accept');
    const reject = decide('reject');
    expect(decisionState(detroit, [reject, accept]).state).toBe('rejected');
  });

  it('keeps a bulk accept unreviewed until someone looks (C29)', () => {
    const bulk = decide('accept', 'bulk');
    expect(decisionState(detroit, [bulk])).toMatchObject({
      state: 'accepted',
      unreviewed: true,
    });
    expect(decisionState(detroit, [bulk, decide('review')])).toMatchObject({
      state: 'accepted',
      unreviewed: false,
    });
    // A review before the accept is about an earlier one.
    expect(
      decisionState(detroit, [decide('review'), decide('accept', 'bulk')])
        .unreviewed,
    ).toBe(true);
  });

  it('reopens a reject or a drop, and nothing else', () => {
    for (const against of ['reject', 'drop'] as const)
      expect(
        decisionState(detroit, [decide(against), decide('reopen')]),
      ).toEqual({ state: 'open', unreviewed: false });
    // An accept is taken back by editing the item, never by the log.
    expect(
      decisionState(detroit, [decide('accept', 'bulk'), decide('reopen')]),
    ).toMatchObject({ state: 'accepted', unreviewed: true });
    // Rejected again since, it is rejected again.
    expect(
      decisionState(detroit, [
        decide('reject'),
        decide('reopen'),
        decide('reject'),
      ]).state,
    ).toBe('rejected');
    expect(
      (['rejected', 'dropped', 'open', 'accepted', 'applied'] as const).map(
        canReopen,
      ),
    ).toEqual([true, true, false, false, false]);
    // A reopen writes nothing, so it keeps no value.
    expect(decide('reopen')).not.toHaveProperty('value');
  });

  it('offers a reopened suggestion again, in bulk too', () => {
    const log = [decide('reject'), decide('reopen')];
    expect(suggestionStatus(detroit, {}, log)).toBe('open');
    expect(
      whyNotBulk(detroit, suggestionStatus(detroit, {}, log), {
        isCalibrated: () => true,
      }),
    ).toBeNull();
  });

  it('ignores a decision about a value that has since changed', () => {
    const stale = { ...decide('reject'), valueHash: valueHash('washington') };
    expect(decisionState(detroit, [stale]).state).toBe('open');
  });

  it('reads a grouped log the same as a flat one', () => {
    const log = [decide('accept', 'bulk'), decide('review')];
    expect(decisionState(detroit, decisionsBySuggestion(log))).toEqual(
      decisionState(detroit, log),
    );
  });

  it('keeps the value only for decisions that write', () => {
    expect(decide('accept')).toMatchObject({
      suggestionId: detroit.id,
      value: 'detroit',
      valueHash: valueHash('detroit'),
      target: detroit.target,
      path: 'basedInPlaceId',
    });
    expect(decide('reject')).not.toHaveProperty('value');
  });

  it('keeps what a replace wrote over, so a replay can write over it again', () => {
    const replace = makeDecision(detroit, 'replace', {
      by: 'owner',
      at: '2026-10-02T00:00:00.000Z',
      method: 'single',
      seen: 'washington',
    });
    expect(replace.seenHash).toBe(valueHash('washington'));
    expect(decide('accept')).not.toHaveProperty('seenHash');
    const anchored = { ...detroit, anchor: 'producer|quincy-jones' };
    expect(decide('accept', 'single', anchored).anchor).toBe(
      'producer|quincy-jones',
    );
  });

  it('keeps the records the value needs, so a replay can make them without the suggestion', () => {
    const place = (slug: string) => ({
      kind: 'globe_city',
      slug,
      body: { id: slug, name: slug, pin: false },
    });
    const artist = {
      kind: 'artist',
      slug: 'kenny-loggins',
      body: { slug: 'kenny-loggins', basedInPlaceId: 'everett' },
    };
    const needs: Suggestion = {
      ...detroit,
      value: 'bethel',
      requires: [place('bethel')],
    };
    expect(decide('accept', 'single', needs).requires).toEqual([
      place('bethel'),
    ]);
    // Nothing is kept for what does not write.
    expect(decide('reject', 'single', needs)).not.toHaveProperty('requires');
    // Nor its own item: a Label row carries the release it labels, which an
    // Album row made.
    const release = {
      kind: 'release',
      slug: 'marvin-gaye-whats-going-on',
      body: { slug: 'marvin-gaye-whats-going-on' },
    };
    const label = {
      ...detroit,
      target: { kind: 'release', slug: release.slug },
      path: 'labelId',
      value: 'tamla',
      requires: [release, { kind: 'label', slug: 'tamla', body: {} }],
    };
    expect(decide('accept', 'single', label).requires).toEqual([
      { kind: 'label', slug: 'tamla', body: {} },
    ]);
    // Pointed somewhere else first: the place it named is not needed now.
    const edited = makeDecision(needs, 'accept', {
      by: 'owner',
      at: '2026-10-02T00:00:00.000Z',
      method: 'single',
      value: 'detroit',
    });
    expect(edited).not.toHaveProperty('requires');
    // What a kept record names is needed too.
    expect(
      recordsNamedBy(
        [place('bethel'), place('everett'), artist],
        ['kenny-loggins'],
      ),
    ).toEqual([place('everett'), artist]);
  });
});

describe('a suggestion’s status', () => {
  it('puts the log and the body together', () => {
    expect(suggestionStatus(detroit, {}, [])).toBe('open');
    expect(suggestionStatus(detroit, { basedInPlaceId: 'detroit' }, [])).toBe(
      'applied',
    );
    expect(
      suggestionStatus(detroit, { basedInPlaceId: 'washington' }, []),
    ).toBe('conflict');
    // Accepted as an editor's proposal: decided, not in the live body yet.
    expect(suggestionStatus(detroit, {}, [decide('accept')])).toBe('accepted');
    // A rejection stands whatever the body says.
    expect(
      suggestionStatus(detroit, { basedInPlaceId: 'detroit' }, [
        decide('reject'),
      ]),
    ).toBe('rejected');
    expect(suggestionStatus(detroit, null, [])).toBe('open');
  });

  it('shows a replace awaiting review as accepted, not as a conflict', () => {
    // An editor replaced Washington; the admin's live body still says it.
    const replace = makeDecision(detroit, 'replace', {
      by: 'editor',
      at: '2026-10-02T00:00:00.000Z',
      method: 'single',
      seen: 'washington',
    });
    expect(
      suggestionStatus(detroit, { basedInPlaceId: 'washington' }, [replace], {
        pending: true,
        savedAt: '2026-10-03T00:00:00.000Z',
      }),
    ).toBe('accepted');
  });

  it('counts the value the owner accepted instead as applied', () => {
    const born = { ...detroit, path: 'born', value: { date: '1939' } };
    const edited = makeDecision(born, 'accept', {
      by: 'owner',
      at: '2026-10-02T00:00:00.000Z',
      method: 'single',
      value: { date: '1939-04-02' },
    });
    const status = suggestionStatus(born, { born: { date: '1939-04-02' } }, [
      edited,
    ]);
    expect(status).toBe('applied');
    expect(whyNotBulk(born, status)).toBe('the item says it already');
  });

  it('notices an accept taken out by hand since, and never offers it in bulk', () => {
    const accept = decide('accept', 'bulk');
    const later = new Date(Date.parse(accept.at) + 60_000).toISOString();
    const earlier = new Date(Date.parse(accept.at) - 60_000).toISOString();
    expect(suggestionStatus(detroit, {}, [accept], { savedAt: later })).toBe(
      'removed',
    );
    expect(whyNotBulk(detroit, 'removed')).toMatch(/taken out by hand/);
    // Written over by hand: the owner's value against the suggestion.
    expect(
      suggestionStatus(detroit, { basedInPlaceId: 'chicago' }, [accept], {
        savedAt: later,
      }),
    ).toBe('conflict');
    // Saved before the decision, beside a proposal, or not known: on its way.
    for (const context of [
      { savedAt: earlier },
      { savedAt: later, pending: true },
      {},
    ])
      expect(suggestionStatus(detroit, {}, [accept], context)).toBe('accepted');
  });

  it('reports an element that is gone as unreachable, not as a conflict', () => {
    const link = {
      ...detroit,
      target: { kind: 'song', slug: 'africa' },
      path: 'credits[2].artistGlobeId',
      anchor: 'primary|toto',
      value: 'toto',
    };
    expect(suggestionStatus(link, { credits: [] }, [])).toBe('unreachable');
    expect(whyNotBulk(link, 'unreachable')).toMatch(/cannot be written/);
  });
});

describe('bulk accept', () => {
  const calibrated = {
    isCalibrated: (batch: string) => batch === 'mb-2026-10-02',
  };

  it('takes only open, sure, confident suggestions on an identity that stands', () => {
    expect(whyNotBulk(detroit, 'open', calibrated)).toBeNull();
    expect(whyNotBulk(detroit, 'conflict')).toBe(
      'it conflicts with what the item says',
    );
    expect(whyNotBulk({ ...detroit, tier: 'likely' }, 'open')).toMatch(
      /likely/,
    );
    expect(whyNotBulk({ ...detroit, confidence: 0.8 }, 'open')).toMatch(
      /below 85%/,
    );
    expect(
      whyNotBulk({ ...detroit, dependsOn: 'identity' }, 'open', {
        ...calibrated,
        isAccepted: () => false,
      }),
    ).toBe(RESTS_ON_REASON);
    expect(
      whyNotBulk({ ...detroit, dependsOn: 'identity' }, 'open', {
        ...calibrated,
        isAccepted: (id) => id === 'identity',
      }),
    ).toBeNull();
  });

  it("takes the importer's sure rows only once their batch is calibrated", () => {
    // Not said, or another batch's: "sure" has not been measured.
    expect(whyNotBulk(detroit, 'open')).toMatch(/not calibrated/);
    expect(
      whyNotBulk({ ...detroit, batch: 'mb-2026-11-01' }, 'open', calibrated),
    ).toMatch(/not calibrated/);
    // A Wikidata source is the importer's too.
    expect(
      whyNotBulk(
        { ...detroit, sources: [{ provider: 'wikidata' as const }] },
        'open',
      ),
    ).toMatch(/not calibrated/);
    // The app's own suggestions (Stage 1) need no calibration.
    const planner = {
      ...detroit,
      sources: [{ provider: 'app' as const, label: 'evt-1 tags' }],
      batch: 'app-2026-10-01',
    };
    expect(whyNotBulk(planner, 'open')).toBeNull();
  });

  it('never takes a City read from song pins, however sure (C23)', () => {
    const pins = {
      provider: 'app' as const,
      label: 'artist_location "marvin gaye" city',
    };
    // Alone, or agreeing with the importer: a person checks it.
    for (const sources of [
      [pins],
      [{ provider: 'musicbrainz' as const }, pins],
    ])
      expect(
        whyNotBulk({ ...detroit, sources }, 'open', {
          isCalibrated: () => true,
        }),
      ).toBe(SONG_PIN_REASON);
    // The importer's City on its own, or a song pin read as a birthplace,
    // is not a song-pin City.
    expect(isSongPinCity(detroit)).toBe(false);
    expect(
      isSongPinCity({ ...detroit, path: 'born.placeId', sources: [pins] }),
    ).toBe(false);
  });

  it('never takes a song’s year, however sure (C15)', () => {
    const year: Suggestion = {
      ...detroit,
      target: { kind: 'song', slug: 'whats_going_on' },
      path: 'year',
      value: 1971,
    };
    expect(whyNotBulk(year, 'open', { isCalibrated: () => true })).toBe(
      SONG_YEAR_REASON,
    );
    // An event's year is not a song's.
    expect(
      whyNotBulk(
        { ...year, target: { kind: 'globe_event', slug: 'evt-x' } },
        'open',
        { isCalibrated: () => true },
      ),
    ).toBeNull();
  });

  it('rests only on what the item says now, in its live body', () => {
    const identity = {
      ...detroit,
      path: 'externalIds.mbid',
      value: 'afdb7919',
    };
    // Accepted and there, or typed by hand: the item says it.
    expect(
      dependencyStands(identity, { externalIds: { mbid: 'afdb7919' } }),
    ).toBe(true);
    // Taken out since, never there, or another artist picked instead.
    expect(dependencyStands(identity, { externalIds: {} })).toBe(false);
    expect(dependencyStands(identity, null)).toBe(false);
    expect(
      dependencyStands(identity, { externalIds: { mbid: 'another' } }),
    ).toBe(false);
  });

  it('never goes below the floor, whatever the owner sets', () => {
    const low = { ...detroit, confidence: 0.65 };
    expect(whyNotBulk(low, 'open', { ...calibrated, threshold: 0.5 })).toMatch(
      new RegExp(`below ${BULK_FLOOR * 100}%`),
    );
    expect(
      whyNotBulk({ ...detroit, confidence: 0.75 }, 'open', {
        ...calibrated,
        threshold: 0.7,
      }),
    ).toBeNull();
  });
});

describe('the bulk import', () => {
  const make = (over: Partial<Suggestion>): Suggestion => {
    const row = { ...base, ...over };
    return { ...row, id: suggestionId(row) };
  };
  const identity = make({ path: 'externalIds.mbid', value: 'mbid-1' });

  it('counts an imported accept as reviewed: its values are plain data', () => {
    const imported = decide('accept', 'import');
    expect(decisionState(detroit, [imported])).toEqual({
      state: 'accepted',
      decision: imported,
      unreviewed: false,
    });
    // Only a bulk accept waits to be looked at.
    expect(decisionState(detroit, [decide('accept', 'bulk')]).unreviewed).toBe(
      true,
    );
  });

  it('takes what is open and sure or likely, song years and song-pin Cities too', () => {
    expect(whyNotImported(detroit, 'open')).toBeNull();
    expect(
      whyNotImported(make({ tier: 'likely', confidence: 0.4 }), 'open'),
    ).toBeNull();
    const year = make({
      target: { kind: 'song', slug: 'abc' },
      path: 'year',
      value: 1970,
    });
    expect(whyNotBulk(year, 'open')).toBe(SONG_YEAR_REASON);
    expect(whyNotImported(year, 'open')).toBeNull();
    const pinCity = make({
      sources: [{ provider: 'app', label: 'artist_location "x"' }],
    });
    expect(whyNotBulk(pinCity, 'open')).toBe(SONG_PIN_REASON);
    expect(whyNotImported(pinCity, 'open')).toBeNull();
    // Uncalibrated batches are no bar either.
    expect(
      whyNotImported(make({ batch: 'mb-uncalibrated' }), 'open'),
    ).toBeNull();
  });

  it('leaves out the ambiguous, what is decided or in conflict, and every external id', () => {
    expect(whyNotImported(make({ tier: 'ambiguous' }), 'open')).toBe(
      AMBIGUOUS_REASON,
    );
    expect(whyNotImported(detroit, 'rejected')).toBe('it was rejected');
    expect(whyNotImported(detroit, 'applied')).toBe('the item says it already');
    expect(whyNotImported(detroit, 'conflict')).toBe(
      'it conflicts with what the item says',
    );
    expect(whyNotImported(identity, 'open')).toBe(EXTERNAL_ID_REASON);
    expect(
      whyNotImported(
        make({ path: 'externalIds.wikidata', value: 'Q1' }),
        'open',
      ),
    ).toBe(EXTERNAL_ID_REASON);
    expect(isExternalIdPath('externalIds')).toBe(true);
    expect(isExternalIdPath('externalIdsNote')).toBe(false);
  });

  it('rests on what stands, as the caller says', () => {
    const resting = make({
      path: 'activeFrom',
      value: 1961,
      dependsOn: 'id-1',
    });
    expect(whyNotImported(resting, 'open')).toBe(RESTS_ON_REASON);
    expect(whyNotImported(resting, 'open', { stands: () => false })).toBe(
      RESTS_ON_REASON,
    );
    expect(whyNotImported(resting, 'open', { stands: () => true })).toBeNull();
  });

  it('takes an identity without writing it, unless someone decided against it', () => {
    for (const status of ['open', 'accepted', 'applied'] as const)
      expect(identityTaken(identity, status)).toBe(true);
    for (const status of [
      'rejected',
      'dropped',
      'removed',
      'conflict',
      'unreachable',
    ] as const)
      expect(identityTaken(identity, status)).toBe(false);
    expect(identityTaken({ ...identity, tier: 'ambiguous' }, 'open')).toBe(
      false,
    );
    // Only an external id is an identity the import takes unwritten.
    expect(identityTaken(detroit, 'open')).toBe(false);
  });
});
