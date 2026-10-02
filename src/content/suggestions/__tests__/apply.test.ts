import { describe, expect, it } from 'vitest';
import {
  applySuggestion,
  applySuggestions,
  checkSuggestion,
  importNote,
  musicBrainzIdOf,
  replayDecision,
  revisionNote,
  sourceOf,
  withoutProvenance,
} from '../apply';
import { elementAnchor, suggestionId } from '../keys';
import { makeDecision } from '../status';
import type { Suggestion } from '../types';

/**
 * Accepting a suggestion is a save built from the body as it is now: written
 * where the path is empty, or over exactly what the owner saw; a conflict
 * anywhere else. These pin that rule and what an accept stamps on the value.
 */

const suggest = (
  over: Partial<Suggestion> & Pick<Suggestion, 'path' | 'value'>,
): Suggestion => {
  const base = {
    target: { kind: 'artist', slug: 'marvin-gaye' },
    op: (over.path.endsWith('[]') ? 'add' : 'set') as Suggestion['op'],
    display: 'x',
    sources: [
      { provider: 'musicbrainz' as const, url: 'https://musicbrainz.org/x' },
    ],
    evidence: ['name exact'],
    confidence: 0.92,
    tier: 'sure' as const,
    batch: 'mb-2026-10-02',
    ...over,
  };
  return { id: suggestionId(base), ...base };
};

const detroit = suggest({ path: 'basedInPlaceId', value: 'detroit' });

describe('the precondition', () => {
  it('writes where the path is empty', () => {
    for (const empty of [
      {},
      { basedInPlaceId: '' },
      { basedInPlaceId: null },
    ]) {
      const result = applySuggestion(empty, detroit);
      expect(result).toMatchObject({
        ok: true,
        changed: true,
        replaced: false,
      });
      expect(result.ok && result.body.basedInPlaceId).toBe('detroit');
    }
  });

  it('writes nothing where the body already says it', () => {
    const body = { basedInPlaceId: 'detroit' };
    const result = applySuggestion(body, detroit);
    expect(result).toEqual({ ok: true, body, changed: false, replaced: false });
  });

  it('never writes over a different value it was not shown', () => {
    const body = { basedInPlaceId: 'washington' };
    expect(checkSuggestion(body, detroit)).toMatchObject({
      state: 'conflict',
      current: 'washington',
    });
    expect(applySuggestion(body, detroit)).toMatchObject({
      ok: false,
      state: 'conflict',
    });
    // A replace names what the owner saw; anything else there still refuses.
    expect(applySuggestion(body, detroit, { seen: 'new-york' }).ok).toBe(false);
  });

  it('replaces exactly the value the owner saw beside it', () => {
    const result = applySuggestion({ basedInPlaceId: 'washington' }, detroit, {
      seen: 'washington',
    });
    expect(result).toMatchObject({ ok: true, changed: true, replaced: true });
    expect(result.ok && result.body.basedInPlaceId).toBe('detroit');
  });

  it('does not touch the body it was given', () => {
    const body = { name: 'Marvin Gaye' };
    const result = applySuggestion(body, detroit);
    expect(body).toEqual({ name: 'Marvin Gaye' });
    expect(result.ok && result.body).toEqual({
      name: 'Marvin Gaye',
      basedInPlaceId: 'detroit',
    });
  });

  it('refuses a path and an op that disagree', () => {
    expect(
      checkSuggestion({}, { ...detroit, path: 'genreIds[]', op: 'set' }).state,
    ).toBe('unreachable');
    expect(
      checkSuggestion({}, { ...detroit, path: 'genreIds', op: 'add' }).state,
    ).toBe('unreachable');
    expect(
      checkSuggestion({}, { ...detroit, path: 'credits[].name' }).state,
    ).toBe('unreachable');
  });

  it('reads only what the body itself holds', () => {
    // Not `{}.toString`, and nothing that would write a prototype.
    expect(checkSuggestion({}, { ...detroit, path: 'toString' }).state).toBe(
      'empty',
    );
    for (const path of ['__proto__.polluted', 'constructor'])
      expect(checkSuggestion({}, { ...detroit, path }).state).toBe(
        'unreachable',
      );
  });
});

describe('an element named by its position', () => {
  const toto = { name: 'Toto', role: 'primary' };
  const quincy = { name: 'Quincy Jones', role: 'producer' };
  const porcaro = { name: 'Jeff Porcaro', role: 'performer' };
  const link = suggest({
    target: { kind: 'song', slug: 'africa' },
    path: 'credits[2].artistGlobeId',
    anchor: elementAnchor('credits[]', toto),
    value: 'toto',
  });

  it('is found by its anchor, never taken on trust', () => {
    // Where it was:
    const there = applySuggestion({ credits: [quincy, porcaro, toto] }, link);
    expect(there.ok && there.body.credits).toEqual([
      quincy,
      porcaro,
      { ...toto, artistGlobeId: 'toto' },
    ]);
    // …and where it moved to. The third credit now is someone else's.
    const moved = applySuggestion({ credits: [toto, porcaro, quincy] }, link);
    expect(moved.ok && moved.body.credits).toEqual([
      { ...toto, artistGlobeId: 'toto' },
      porcaro,
      quincy,
    ]);
  });

  it('is unreachable once its element is gone, or when it cannot be told apart', () => {
    for (const credits of [[], [porcaro, quincy], [porcaro, quincy, quincy]])
      expect(checkSuggestion({ credits }, link).state).toBe('unreachable');
    expect(
      applySuggestion({ credits: [porcaro, quincy, quincy] }, link),
    ).toMatchObject({
      ok: false,
      state: 'unreachable',
    });
    const twice = checkSuggestion(
      { credits: [toto, porcaro, porcaro, toto] },
      link,
    );
    expect(twice).toMatchObject({ state: 'unreachable' });
    // At its own index it is not in doubt.
    expect(
      checkSuggestion({ credits: [toto, porcaro, toto] }, link).state,
    ).toBe('empty');
  });

  it('needs an anchor, and reaches through one list at most', () => {
    expect(
      checkSuggestion(
        { credits: [quincy, porcaro, toto] },
        { ...link, anchor: undefined },
      ),
    ).toMatchObject({
      state: 'unreachable',
      reason: expect.stringMatching(/anchor/),
    });
    expect(
      checkSuggestion({ a: [{ b: [{}] }] }, { ...link, path: 'a[0].b[0].c' })
        .state,
    ).toBe('unreachable');
  });

  it('keeps its id when the list around it is reordered', () => {
    const at = (index: number) =>
      suggestionId({ ...link, path: `credits[${index}].artistGlobeId` });
    expect(at(0)).toBe(at(2));
  });
});

describe('adding to a list', () => {
  const toto = suggest({
    target: { kind: 'globe_event', slug: 'evt-africa-1982' },
    path: 'artistIds[]',
    value: 'toto',
  });
  const soul = suggest({ path: 'genreIds[]', value: 'soul' });

  it('appends, and makes the list when there is none', () => {
    const made = applySuggestion({}, soul);
    expect(made.ok && made.body.genreIds).toEqual(['soul']);
    const added = applySuggestion({ artistIds: ['david-paich'] }, toto);
    expect(added.ok && added.body.artistIds).toEqual(['david-paich', 'toto']);
  });

  it('adds nothing that is already there', () => {
    const body = { artistIds: ['toto'] };
    expect(applySuggestion(body, toto)).toMatchObject({
      ok: true,
      changed: false,
    });
  });

  it('never starts an event’s list with one of its inferred artists', () => {
    // Until `artistIds` is stored the graph guesses from the tags; storing
    // one id would say "exactly this one" and drop Michael Jackson.
    const body = { tags: ['toto', 'michael-jackson'] };
    expect(checkSuggestion(body, toto)).toMatchObject({
      state: 'unreachable',
      reason: expect.stringMatching(/whole list/),
    });
    // The whole set, as a `set`, is how the list starts.
    const all = suggest({
      target: toto.target,
      path: 'artistIds',
      value: ['toto', 'michael-jackson'],
    });
    const result = applySuggestion(body, all);
    expect(result.ok && result.body.artistIds).toEqual([
      'toto',
      'michael-jackson',
    ]);
  });

  it('respects an event the owner said has no artists at all', () => {
    // On a globe event `[]` means "exactly none" (decision 5).
    expect(checkSuggestion({ artistIds: [] }, toto)).toMatchObject({
      state: 'conflict',
      reason: 'it was set to none',
    });
    // Unless the owner saw that and added anyway: a replace of their answer.
    const result = applySuggestion({ artistIds: [] }, toto, { seen: [] });
    expect(result).toMatchObject({ ok: true, replaced: true });
    expect(result.ok && result.body.artistIds).toEqual(['toto']);
    // Elsewhere an empty list is only empty.
    expect(checkSuggestion({ genreIds: [] }, soul).state).toBe('empty');
  });

  it('meets a credit written as a bare name, and replaces it only when shown', () => {
    const producer = suggest({
      target: { kind: 'song', slug: 'thriller' },
      path: 'credits[]',
      value: {
        name: 'Quincy Jones',
        role: 'producer',
        artistGlobeId: 'quincy-jones',
      },
    });
    const body = { credits: [{ name: 'Quincy Jones', role: 'producer' }] };
    // What a replace writes over is the element, not the list.
    expect(checkSuggestion(body, producer)).toMatchObject({
      state: 'conflict',
      current: body.credits[0],
    });
    const result = applySuggestion(body, producer, { seen: body.credits[0] });
    expect(result).toMatchObject({ ok: true, replaced: true });
    expect(result.ok && result.body.credits).toEqual([
      { name: 'Quincy Jones', role: 'producer', artistGlobeId: 'quincy-jones' },
    ]);
  });

  it('tells a player’s two instruments apart', () => {
    const bass = {
      name: 'James Jamerson',
      role: 'performer',
      instrument: 'bass',
    };
    const upright = suggest({
      target: { kind: 'song', slug: 'whats_going_on' },
      path: 'credits[]',
      value: { ...bass, instrument: 'double_bass' },
    });
    const result = applySuggestion({ credits: [bass] }, upright);
    expect(result.ok && (result.body.credits as unknown[]).length).toBe(2);
  });
});

// Most suggestions here come from an outside provider, which an accept now
// writes bare by default (owner decision of 30 September 2026, `fromOutside`).
// The tests of how a value cites its source pass `cite: true`, the mechanism
// an app suggestion still uses.
describe('what an accept says about the value', () => {
  it('marks a value that carries RefMeta confirmed, and from where', () => {
    const born = suggest({
      path: 'born',
      value: { date: '1939-04-02', placeId: 'washington', unverified: true },
      sources: [
        { provider: 'musicbrainz', url: 'https://musicbrainz.org/a' },
        { provider: 'wikidata', url: 'https://www.wikidata.org/wiki/Q1' },
      ],
    });
    const result = applySuggestion({}, born, { cite: true });
    expect(result.ok && result.body.born).toEqual({
      date: '1939-04-02',
      placeId: 'washington',
      source: 'musicbrainz, wikidata',
    });
  });

  it('writes a song’s `source` only once its schema has one', () => {
    const credit = suggest({
      target: { kind: 'song', slug: 'thriller' },
      path: 'credits[]',
      value: { name: 'Bruce Swedien', role: 'engineer', unverified: true },
    });
    const v1 = applySuggestion({ credits: [] }, credit);
    expect(v1.ok && v1.body.credits).toEqual([
      { name: 'Bruce Swedien', role: 'engineer' },
    ]);
    const v2 = applySuggestion({ credits: [] }, credit, {
      schemaLevel: 2,
      cite: true,
    });
    expect(v2.ok && v2.body.credits).toEqual([
      { name: 'Bruce Swedien', role: 'engineer', source: 'musicbrainz' },
    ]);
  });

  it('adds its source to the holder it is written inside, and leaves the rest unconfirmed', () => {
    const studio = suggest({
      target: { kind: 'song', slug: 'whats_going_on' },
      path: 'session.studioId',
      value: 'hitsville-usa',
    });
    const session = {
      studio: 'Hitsville U.S.A.',
      unverified: true,
      source: 'liner notes',
    };
    const result = applySuggestion({ session }, studio, {
      schemaLevel: 2,
      cite: true,
    });
    expect(result.ok && result.body.session).toEqual({
      ...session,
      studioId: 'hitsville-usa',
      source: 'liner notes, musicbrainz',
    });
  });

  it('confirms a value that was there already, unverified', () => {
    // Accepted means confirmed (C9), even when nothing else changes.
    const born = suggest({ path: 'born', value: { date: '1939' } });
    const result = applySuggestion(
      { born: { date: '1939', unverified: true, source: 'liner notes' } },
      born,
      { cite: true },
    );
    expect(result).toMatchObject({ ok: true, changed: true, replaced: false });
    expect(result.ok && result.body.born).toEqual({
      date: '1939',
      source: 'liner notes, musicbrainz',
    });
    // A v1 song credit has `unverified` but no `source` yet.
    const credit = suggest({
      target: { kind: 'song', slug: 'thriller' },
      path: 'credits[]',
      value: { name: 'Bruce Swedien', role: 'engineer' },
    });
    const v1 = applySuggestion(
      {
        credits: [
          { name: 'Bruce Swedien', role: 'engineer', unverified: true },
        ],
      },
      credit,
    );
    expect(v1.ok && v1.body.credits).toEqual([
      { name: 'Bruce Swedien', role: 'engineer' },
    ]);
    // Confirmed already: nothing to save.
    expect(
      applySuggestion({ born: { date: '1939', source: 'wikidata' } }, born),
    ).toMatchObject({ ok: true, changed: false });
  });

  it('keeps RefMeta off a value with nowhere to put it', () => {
    const place = suggest({
      target: { kind: 'globe_event', slug: 'evt-x' },
      path: 'location',
      value: { city: 'Detroit', source: 'musicbrainz' },
    });
    const result = applySuggestion({}, place);
    expect(result.ok && result.body.location).toEqual({ city: 'Detroit' });
  });
});

describe('what an accept keeps of the value, and fills beside it', () => {
  const MBID = '8f08eb4f-873e-4d63-8271-fa7a5563c2d1';
  const link = `https://musicbrainz.org/artist/${MBID}`;
  /** The credit as accepted: confirmed, its link kept. */
  const confirmed = {
    name: 'Bosco Mann',
    role: 'songwriter',
    artistGlobeId: 'bosco-mann',
    source: link,
  };
  const bosco = { ...confirmed, unverified: true };
  const credit = (sources: Suggestion['sources']) =>
    suggest({
      target: { kind: 'song', slug: '100_days_100_nights' },
      path: 'credits[]',
      value: bosco,
      sources,
    });

  it("drops an outside credit's link by default; cited, keeps it and names each provider once (C30)", () => {
    const bare = withoutProvenance(confirmed);
    // Owner decision of 30 September 2026: an outside suggestion goes in
    // bare, its catalogue link and id dropped, whoever accepts it.
    const plain = applySuggestion(
      { credits: [] },
      credit([
        { provider: 'musicbrainz', url: 'https://musicbrainz.org/work/x' },
      ]),
      { schemaLevel: 2 },
    );
    expect(plain.ok && plain.body.credits).toEqual([bare]);
    const mb = applySuggestion(
      { credits: [] },
      credit([
        { provider: 'musicbrainz', url: 'https://musicbrainz.org/work/x' },
      ]),
      {
        schemaLevel: 2,
        cite: true,
      },
    );
    // The link already names MusicBrainz: nothing is added beside it.
    expect(mb.ok && mb.body.credits).toEqual([confirmed]);
    const both = applySuggestion(
      { credits: [] },
      credit([
        { provider: 'musicbrainz' },
        { provider: 'wikidata', url: 'https://www.wikidata.org/wiki/Q1' },
      ]),
      { schemaLevel: 2, cite: true },
    );
    expect(both.ok && both.body.credits).toEqual([
      { ...confirmed, source: `${link}, wikidata` },
    ]);
    // Replayed without its sources, it still goes in bare: the link in its
    // own value says it came from outside.
    const replayed = replayDecision(
      { credits: [] },
      makeDecision(credit([{ provider: 'musicbrainz' }]), 'accept', {
        by: 'owner',
        at: '2026-10-02T00:00:00.000Z',
        method: 'single',
      }),
      { schemaLevel: 2 },
    );
    expect(replayed?.ok && replayed.body.credits).toEqual([bare]);
    // A v1 song has no `source` yet, and the id cannot go in.
    const v1 = applySuggestion(
      { credits: [] },
      credit([{ provider: 'musicbrainz' }]),
    );
    expect(v1.ok && v1.body.credits).toEqual([
      { name: 'Bosco Mann', role: 'songwriter', artistGlobeId: 'bosco-mann' },
    ]);
  });

  it('bills the song’s own act on its performing credits, as SongCredits reads them', () => {
    const clavinet = (value: Record<string, unknown>) =>
      suggest({
        target: { kind: 'song', slug: 'superstition' },
        path: 'credits[]',
        value,
      });
    const played = {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'clavinet',
      artistGlobeId: 'stevie-wonder',
      unverified: true,
    };
    const song = { artist: 'Stevie Wonder', credits: [] };
    const accepted = applySuggestion(song, clavinet(played));
    // A solo act is billed on the recording, not credited: without this
    // the page lists them as a sideman on their own song.
    expect(accepted.ok && accepted.body.credits).toEqual([
      {
        name: 'Stevie Wonder',
        role: 'performer',
        instrument: 'clavinet',
        artistGlobeId: 'stevie-wonder',
        primary: true,
      },
    ]);
    // Written so, it reads as applied — and a replay writes it the same.
    if (!accepted.ok) throw new Error(accepted.reason);
    expect(checkSuggestion(accepted.body, clavinet(played)).state).toBe(
      'applied',
    );
    const replayed = replayDecision(
      song,
      makeDecision(clavinet(played), 'accept', {
        by: 'owner',
        at: '2026-10-02T00:00:00.000Z',
        method: 'single',
      }),
    );
    expect(replayed?.ok && replayed.body).toEqual(accepted.body);
    // The lead act by its origin, too; anyone else is a sideman still, and
    // a songwriter is not billed.
    const byOrigin = applySuggestion(
      { origin: { artistGlobeId: 'stevie-wonder' }, credits: [] },
      clavinet(played),
    );
    expect(byOrigin.ok && byOrigin.body.credits).toMatchObject([
      { primary: true },
    ]);
    for (const other of [
      { ...played, name: 'Ray Parker Jr.', artistGlobeId: 'ray-parker-jr' },
      { ...played, role: 'songwriter', instrument: undefined },
    ]) {
      const written = applySuggestion(song, clavinet(other));
      expect(
        written.ok && (written.body.credits as { primary?: boolean }[])[0],
      ).not.toHaveProperty('primary');
    }
  });

  describe("a studio's or a label's name beside its id (C20)", () => {
    const NAMES: Record<string, string> = {
      'studio:hitsville-usa': 'Hitsville U.S.A.',
      'studio:sunset-sound': 'Sunset Sound',
      'label:tamla': 'Tamla',
    };
    const nameOf = (kind: string, slug: string) => NAMES[`${kind}:${slug}`];
    const onSong = (path: string, value: string) =>
      suggest({
        target: { kind: 'song', slug: 'whats_going_on' },
        path,
        value,
      });
    const studio = onSong('session.studioId', 'hitsville-usa');

    it('fills the text from the record where it is empty', () => {
      for (const session of [undefined, {}, { studio: '' }]) {
        const result = applySuggestion(session ? { session } : {}, studio, {
          nameOf,
        });
        expect(result.ok && result.body.session).toEqual({
          studioId: 'hitsville-usa',
          studio: 'Hitsville U.S.A.',
        });
      }
      const label = applySuggestion({}, onSong('session.labelId', 'tamla'), {
        nameOf,
      });
      expect(label.ok && label.body.session).toEqual({
        labelId: 'tamla',
        label: 'Tamla',
      });
    });

    it('never writes over text someone typed', () => {
      const result = applySuggestion(
        { session: { studio: 'Studio A, Detroit' } },
        studio,
        { nameOf },
      );
      expect(result.ok && result.body.session).toEqual({
        studio: 'Studio A, Detroit',
        studioId: 'hitsville-usa',
      });
    });

    it("follows the record it replaces: text that was that record's name moves on", () => {
      const session = { studioId: 'sunset-sound', studio: 'Sunset Sound' };
      const result = applySuggestion({ session }, studio, {
        nameOf,
        seen: 'sunset-sound',
      });
      expect(result.ok && result.body.session).toEqual({
        studioId: 'hitsville-usa',
        studio: 'Hitsville U.S.A.',
      });
    });

    it('leaves the text alone with no names to read, or no name for the record', () => {
      const blind = applySuggestion({}, studio);
      expect(blind.ok && blind.body.session).toEqual({
        studioId: 'hitsville-usa',
      });
      const unnamed = applySuggestion({}, onSong('session.studioId', 'x'), {
        nameOf,
      });
      expect(unnamed.ok && unnamed.body.session).toEqual({ studioId: 'x' });
    });
  });

  it("reads a record's MusicBrainz id: its externalIds, or a label's and a studio's source link", () => {
    const id = '2182a316-c4bd-4605-936a-5e2fac52bdd2';
    expect(musicBrainzIdOf('artist', { externalIds: { mbid: id } })).toBe(id);
    expect(musicBrainzIdOf('release', { externalIds: { mbid: id } })).toBe(id);
    expect(
      musicBrainzIdOf('label', {
        source: `https://musicbrainz.org/label/${id.toUpperCase()}`,
      }),
    ).toBe(id);
    // A studio is a place on MusicBrainz; the link may sit beside others.
    expect(
      musicBrainzIdOf('studio', {
        source: `liner notes, https://musicbrainz.org/place/${id}, wikidata`,
      }),
    ).toBe(id);
    // A link to another kind of page is not the record's id.
    expect(
      musicBrainzIdOf('studio', {
        source: `https://musicbrainz.org/label/${id}`,
      }),
    ).toBeNull();
    expect(musicBrainzIdOf('label', { source: 'musicbrainz' })).toBeNull();
    expect(musicBrainzIdOf('label', { externalIds: { mbid: 'x' } })).toBeNull();
    expect(
      musicBrainzIdOf('globe_city', {
        source: `https://musicbrainz.org/area/${id}`,
      }),
    ).toBeNull();
    expect(musicBrainzIdOf('label', null)).toBeNull();
  });
});

describe('several at once', () => {
  it('builds one body, and lets only the first of two rival values in', () => {
    const mb = suggest({ path: 'activeFrom', value: 1957 });
    const wd = suggest({
      path: 'activeFrom',
      value: 1961,
      sources: [{ provider: 'wikidata', url: 'https://www.wikidata.org/x' }],
    });
    const out = applySuggestions({ name: 'Marvin Gaye' }, [
      { suggestion: detroit },
      { suggestion: mb },
      { suggestion: wd },
    ]);
    expect(out.body).toEqual({
      name: 'Marvin Gaye',
      basedInPlaceId: 'detroit',
      activeFrom: 1957,
    });
    expect(out.accepted.map((s) => s.id)).toEqual([detroit.id, mb.id]);
    expect(out.refused).toMatchObject([
      { suggestion: { id: wd.id }, state: 'conflict', current: 1957 },
    ]);
  });

  it('lets several replaces and adds into one list share a save', () => {
    const quincy = { name: 'Quincy Jones', role: 'producer' };
    const bruce = { name: 'Bruce Swedien', role: 'engineer' };
    const credit = (value: object) =>
      suggest({
        target: { kind: 'song', slug: 'thriller' },
        path: 'credits[]',
        value,
      });
    const linkQuincy = credit({ ...quincy, artistGlobeId: 'quincy-jones' });
    const linkBruce = credit({ ...bruce, artistGlobeId: 'bruce-swedien' });
    const lukather = credit({
      name: 'Steve Lukather',
      role: 'performer',
      instrument: 'guitar',
    });
    const out = applySuggestions({ credits: [quincy, bruce] }, [
      { suggestion: lukather },
      { suggestion: linkQuincy, seen: quincy },
      { suggestion: linkBruce, seen: bruce },
    ]);
    expect(out.refused).toEqual([]);
    expect(out.replaced).toHaveLength(2);
    expect(out.body.credits).toEqual([
      { ...quincy, artistGlobeId: 'quincy-jones' },
      { ...bruce, artistGlobeId: 'bruce-swedien' },
      { name: 'Steve Lukather', role: 'performer', instrument: 'guitar' },
    ]);
  });

  it('sorts what was there already from what was written', () => {
    const out = applySuggestions({ basedInPlaceId: 'detroit' }, [
      { suggestion: detroit },
    ]);
    expect(out.already).toHaveLength(1);
    expect(out.accepted).toHaveLength(0);
  });
});

describe('replaying a decision after the store is reset', () => {
  const at = '2026-10-02T00:00:00.000Z';
  const log = (
    suggestion: Suggestion,
    op: 'accept' | 'replace' | 'reject',
    seen?: unknown,
  ) =>
    makeDecision(suggestion, op, { by: 'owner', at, method: 'single', seen });

  it('writes an accept again where the path is empty, and nothing where it is there', () => {
    const accept = log(detroit, 'accept');
    const again = replayDecision({ name: 'Marvin Gaye' }, accept);
    expect(again).toMatchObject({ ok: true, changed: true });
    expect(again?.ok && again.body.basedInPlaceId).toBe('detroit');
    expect(replayDecision({ basedInPlaceId: 'detroit' }, accept)).toMatchObject(
      {
        ok: true,
        changed: false,
      },
    );
    expect(replayDecision({}, log(detroit, 'reject'))).toBeNull();
  });

  it('writes a replace over the value it replaced, which the reset put back', () => {
    const replace = log(detroit, 'replace', 'washington');
    const again = replayDecision({ basedInPlaceId: 'washington' }, replace);
    expect(again).toMatchObject({ ok: true, replaced: true });
    expect(again?.ok && again.body.basedInPlaceId).toBe('detroit');
    // Anything newer is a conflict, never forced.
    expect(
      replayDecision({ basedInPlaceId: 'chicago' }, replace),
    ).toMatchObject({ ok: false, state: 'conflict' });
    // A replace logged without what it replaced cannot be replayed over it.
    expect(
      replayDecision({ basedInPlaceId: 'washington' }, log(detroit, 'replace')),
    ).toMatchObject({ ok: false });
  });

  it('replays into a list by element, with the sources it is handed', () => {
    const producer = suggest({
      target: { kind: 'artist', slug: 'michael-jackson' },
      path: 'members[]',
      value: { artistId: 'quincy-jones', role: 'producer' },
    });
    const replace = log(producer, 'replace', {
      artistId: 'quincy-jones',
      unverified: true,
    });
    const again = replayDecision(
      { members: [{ artistId: 'quincy-jones', unverified: true }] },
      replace,
      { sources: producer.sources },
    );
    // Its sources are outside ones, so it goes in bare (`fromOutside`).
    expect(again?.ok && again.body.members).toEqual([
      { artistId: 'quincy-jones', role: 'producer' },
    ]);
    // An app suggestion's replay still names its source.
    const app = [{ provider: 'app' as const }];
    const fromApp = replayDecision(
      { members: [{ artistId: 'quincy-jones', unverified: true }] },
      log({ ...producer, sources: app }, 'replace', {
        artistId: 'quincy-jones',
        unverified: true,
      }),
      { sources: app },
    );
    expect(fromApp?.ok && fromApp.body.members).toEqual([
      { artistId: 'quincy-jones', role: 'producer', source: 'app' },
    ]);
    // Without its sources the value still goes in, saying none.
    const blind = replayDecision({ members: [] }, log(producer, 'accept'));
    expect(blind?.ok && blind.body.members).toEqual([
      { artistId: 'quincy-jones', role: 'producer' },
    ]);
  });
});

describe('the revision note', () => {
  it('names the suggestion, its sources and its run', () => {
    // The site names no outside catalogue: the importer's are "an outside
    // source" (owner decision of 30 September 2026).
    expect(revisionNote([detroit])).toBe(
      `Accepted suggestion ${detroit.id} from an outside source (batch mb-2026-10-02)`,
    );
    const app = suggest({
      path: 'genreIds[]',
      value: 'soul',
      sources: [{ provider: 'app', label: 'songs' }],
      batch: 'app-2026-10-01',
    });
    expect(revisionNote([detroit, app])).toBe(
      `Accepted 2 suggestions from an outside source and the app (batches mb-2026-10-02, app-2026-10-01): ${detroit.id}, ${app.id}`,
    );
    const both = suggest({
      path: 'activeFrom',
      value: 1961,
      sources: [{ provider: 'musicbrainz' }, { provider: 'wikidata' }],
    });
    expect(revisionNote([both])).toMatch(/ from an outside source \(/);
    expect(revisionNote([], [detroit])).toMatch(
      /; it replaced what was there$/,
    );
    expect(revisionNote([])).toBe('');
  });

  it('spells a body’s source from the providers, once each', () => {
    expect(
      sourceOf({
        sources: [
          { provider: 'wikidata' },
          { provider: 'musicbrainz' },
          { provider: 'wikidata' },
        ],
      }),
    ).toBe('wikidata, musicbrainz');
  });
});

describe('confirming, and citing', () => {
  const MB_LINK =
    'https://musicbrainz.org/artist/8f08eb4f-873e-4d63-8271-fa7a5563c2d1';
  const credit = suggest({
    target: { kind: 'song', slug: '100_days_100_nights' },
    path: 'credits[]',
    value: {
      name: 'Bosco Mann',
      role: 'songwriter',
      artistGlobeId: 'bosco-mann',
      unverified: true,
      source: MB_LINK,
    },
  });
  const studio = suggest({
    target: { kind: 'song', slug: 'whats_going_on' },
    path: 'session.studioId',
    value: 'hitsville-usa',
  });

  it('confirms by default, cites an app suggestion, and writes an outside one bare', () => {
    // Owner decision of 30 September 2026: no outside catalogue is named in
    // the site's data, whoever accepts the suggestion and however.
    const result = applySuggestion({ credits: [] }, credit, { schemaLevel: 2 });
    expect(result.ok && result.body.credits).toEqual([
      { name: 'Bosco Mann', role: 'songwriter', artistGlobeId: 'bosco-mann' },
    ]);
    const cited = applySuggestion({ credits: [] }, credit, {
      schemaLevel: 2,
      cite: true,
    });
    expect(cited.ok && cited.body.credits).toEqual([
      {
        name: 'Bosco Mann',
        role: 'songwriter',
        artistGlobeId: 'bosco-mann',
        source: MB_LINK,
      },
    ]);
    const fromApp = suggest({
      ...studio,
      sources: [{ provider: 'app' }],
    });
    const app = applySuggestion({ session: {} }, fromApp, { schemaLevel: 2 });
    expect(app.ok && app.body.session).toEqual({
      studioId: 'hitsville-usa',
      source: 'app',
    });
  });

  it('writes a value bare when it does not cite: no source, no unverified, holder untouched', () => {
    const result = applySuggestion({ credits: [] }, credit, {
      schemaLevel: 2,
      cite: false,
    });
    expect(result.ok && result.body.credits).toEqual([
      { name: 'Bosco Mann', role: 'songwriter', artistGlobeId: 'bosco-mann' },
    ]);
    // Written inside a holder: the holder names no source for it, and what
    // it said before stays as it was.
    const session = { studio: 'Hitsville U.S.A.', source: 'liner notes' };
    const inside = applySuggestion({ session }, studio, {
      schemaLevel: 2,
      cite: false,
    });
    expect(inside.ok && inside.body.session).toEqual({
      ...session,
      studioId: 'hitsville-usa',
    });
    // A born value with its own provenance goes in as a person would type it.
    const born = suggest({
      path: 'born',
      value: { date: '1939', unverified: true, source: 'wikidata' },
    });
    const bare = applySuggestion({}, born, { cite: false });
    expect(bare.ok && bare.body.born).toEqual({ date: '1939' });
  });

  it('marks the value, and a holder it lands in, unverified when it does not confirm', () => {
    const result = applySuggestion({ credits: [] }, credit, {
      schemaLevel: 2,
      confirm: false,
      cite: true,
    });
    expect(result.ok && result.body.credits).toEqual([
      {
        name: 'Bosco Mann',
        role: 'songwriter',
        artistGlobeId: 'bosco-mann',
        source: MB_LINK,
        unverified: true,
      },
    ]);
    const inside = applySuggestion({ session: {} }, studio, {
      schemaLevel: 2,
      confirm: false,
      cite: true,
    });
    expect(inside.ok && inside.body.session).toEqual({
      studioId: 'hitsville-usa',
      source: 'musicbrainz',
      unverified: true,
    });
    // Unconfirmed and uncited: marked, and naming nothing.
    const quiet = applySuggestion({ credits: [] }, credit, {
      schemaLevel: 2,
      confirm: false,
      cite: false,
    });
    expect(quiet.ok && quiet.body.credits).toEqual([
      {
        name: 'Bosco Mann',
        role: 'songwriter',
        artistGlobeId: 'bosco-mann',
        unverified: true,
      },
    ]);
    // A plain field has nowhere to say it.
    const plain = applySuggestion({}, detroit, { confirm: false });
    expect(plain.ok && plain.body).toEqual({ basedInPlaceId: 'detroit' });
  });

  it('leaves a value already there as it is when it does not confirm', () => {
    const born = suggest({ path: 'born', value: { date: '1939' } });
    expect(
      applySuggestion({ born: { date: '1939', unverified: true } }, born, {
        confirm: false,
      }),
    ).toMatchObject({ ok: true, changed: false });
    // Confirming without citing takes the mark off and names nothing new.
    const confirmed = applySuggestion(
      { born: { date: '1939', unverified: true, source: 'liner notes' } },
      born,
      { cite: false },
    );
    expect(confirmed.ok && confirmed.body.born).toEqual({
      date: '1939',
      source: 'liner notes',
    });
  });

  it('strips provenance at any depth, and hands back what has none', () => {
    const record = {
      slug: 'bosco-mann',
      name: 'Bosco Mann',
      externalIds: { mbid: '8f08eb4f-873e-4d63-8271-fa7a5563c2d1' },
      unverified: true,
      source: 'musicbrainz',
      born: { date: '1970', source: 'wikidata' },
      members: [{ artistId: 'x', unverified: true }],
    };
    expect(withoutProvenance(record)).toEqual({
      slug: 'bosco-mann',
      name: 'Bosco Mann',
      born: { date: '1970' },
      members: [{ artistId: 'x' }],
    });
    const clean = { slug: 'x', list: [1, { a: 'b' }] };
    expect(withoutProvenance(clean)).toBe(clean);
    expect(withoutProvenance('detroit')).toBe('detroit');
  });

  it('replays an imported decision as the import wrote it: bare, with no text filled', () => {
    const at = '2026-10-02T00:00:00.000Z';
    const imported = makeDecision(credit, 'accept', {
      by: 'repo-import',
      at,
      method: 'import',
      value: withoutProvenance(credit.value),
    });
    const again = replayDecision({ credits: [] }, imported, {
      sources: credit.sources,
      schemaLevel: 2,
    });
    expect(again?.ok && again.body.credits).toEqual([
      { name: 'Bosco Mann', role: 'songwriter', artistGlobeId: 'bosco-mann' },
    ]);
    const studioDecision = makeDecision(studio, 'accept', {
      by: 'repo-import',
      at,
      method: 'import',
    });
    const named = replayDecision({}, studioDecision, {
      sources: studio.sources,
      schemaLevel: 2,
      nameOf: () => 'Hitsville U.S.A.',
    });
    expect(named?.ok && named.body.session).toEqual({
      studioId: 'hitsville-usa',
    });
    // A person's accept, replayed, fills the text beside the id as before,
    // and names no outside source either.
    const person = replayDecision(
      {},
      makeDecision(studio, 'accept', { by: 'owner', at, method: 'single' }),
      { sources: studio.sources, schemaLevel: 2, nameOf: () => 'Hitsville' },
    );
    expect(person?.ok && person.body.session).toEqual({
      studioId: 'hitsville-usa',
      studio: 'Hitsville',
    });
  });

  it('notes an imported save by suggestion id alone', () => {
    expect(importNote([])).toBe('');
    expect(importNote([detroit])).toBe(`Imported suggestion ${detroit.id}`);
    const note = importNote([detroit, credit]);
    expect(note).toBe(`Imported 2 suggestions: ${detroit.id}, ${credit.id}`);
    expect(note).not.toMatch(/musicbrainz|wikidata|batch/i);
  });
});
