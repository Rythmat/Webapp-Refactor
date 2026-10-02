import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import ARTIST_ROWS from '@/content/data/artists.json';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  buildFacetIndex,
  deriveSongEdges,
  edgesForProgression,
  edgesForSong,
  nodesIn,
} from '../deriveEdges';
import { SUBGENRE_PARENT } from '../genreTags';
import { getGenre, PROGRESSION_STYLE_TO_GENRE } from '../genres';
import { canonicalId } from '../ids';
import { type Edge, isValidEdge, isWellFormed, parseEntityId } from '../types';

/**
 * The graph is derived from the records, so these guard the derivation rather
 * than any stored edge list: every edge it emits must be one the schema allows,
 * and the facet index must actually answer the question the globe will ask.
 */

// `_`-prefixed files are local build artifacts (the gitignored
// `_generated_index.ts`), not songs.
const songModules = import.meta.glob<Record<string, unknown>>(
  [
    '../../../curriculum/data/songs/*.ts',
    '!../../../curriculum/data/songs/_*.ts',
  ],
  { eager: true },
);

const songs: Song[] = Object.entries(songModules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (v): v is Song =>
        typeof v === 'object' &&
        v !== null &&
        'sections' in v &&
        'keyRoot' in v,
    ),
  );

const edges = deriveSongEdges(songs);

/**
 * Chicago the band cannot be registered while Chicago the city exists.
 *
 * The globe matches event TAGS to artist names, so a registered 'Chicago'
 * would attach all forty-three Chicago-the-city events to the band. The
 * namespace keeps `artist:chicago` and `place:chicago` apart in the graph;
 * what still cannot tell them apart is tag matching. Registering it needs the
 * index to skip tag-matching for place-colliding names first.
 */
const KNOWN_UNREGISTERED = new Set(['artist:chicago']);

describe('deriving edges from song records', () => {
  it('reads the library', () => {
    expect(songs.length).toBeGreaterThan(600);
    expect(edges.length).toBeGreaterThan(songs.length);
  });

  it('only emits edges the schema allows', () => {
    const invalid = edges
      .filter((e) => !isValidEdge(e))
      .slice(0, 10)
      .map((e) => `${e.from} -${e.kind}-> ${e.to}`);
    expect(invalid).toEqual([]);
  });

  it('gives every node a well-formed id', () => {
    const broken = [...nodesIn(edges)]
      .filter((id) => !parseEntityId(id))
      .slice(0, 10);
    expect(broken).toEqual([]);
  });

  it('connects a fully-credited song to everything its record states', () => {
    const song = songs.find((s) => s.id === 'aint_no_mountain_high_enough');
    expect(song).toBeDefined();
    const kinds = new Set(edgesForSong(song!).map((e) => e.kind));
    // Billed duet, sidemen, writers, producers, record, studio, city, covers.
    // The song has named its record (United) since the bulk import of 30
    // September 2026, and a song on a record takes its label from the
    // record: the label hangs off the release now, not the song
    // (`released_on` from the session's label before).
    expect(kinds).toContain('performed_by');
    expect(kinds).toContain('written_by');
    expect(kinds).toContain('produced_by');
    expect(kinds).toContain('on_release');
    expect(kinds).not.toContain('released_on');
    expect(kinds).toContain('recorded_at');
    expect(kinds).toContain('recorded_in');
    expect(kinds).toContain('covers');
    expect(kinds).toContain('in_genre');
    expect(kinds).toContain('in_key');
  });

  it('bills both halves of a duet, not just the first', () => {
    const song = songs.find((s) => s.id === 'aint_no_mountain_high_enough')!;
    const billed = edgesForSong(song)
      .filter((e) => e.kind === 'performed_by')
      .map((e) => e.to);
    expect(billed).toContain('artist:marvin-gaye');
    expect(billed).toContain('artist:tammi-terrell');
  });

  it('hangs an instrument off the player, on the record it was played on', () => {
    const song = songs.find((s) => s.id === 'africa')!;
    const plays = edgesForSong(song).filter(
      (e) => e.kind === 'plays_instrument',
    );
    expect(plays.length).toBeGreaterThan(0);
    // Every one must say WHICH record, or the graph can only say someone plays
    // an instrument somewhere.
    expect(plays.every((e) => e.on === 'song:africa')).toBe(true);
  });

  it('answers "which songs carry this facet"', () => {
    const index = buildFacetIndex(edges);
    const funk = index.get('genre:funk');
    expect(funk?.size).toBeGreaterThan(50);
    expect(funk).toContain('song:1999');
    // An instrument edge starts at the artist, so it only lands in the index
    // via `on` — this is the case that would silently drop out.
    expect(index.get('instrument:drum-kit')).toContain('song:africa');
    // A cover edge points AT the song (artist covers song), so the artist is
    // the facet — the other case that would silently drop out.
    expect(index.get('artist:cascada')).toContain(
      'song:aint_no_mountain_high_enough',
    );
    expect(index.get('artist:diana-ross')).toContain(
      'song:aint_no_mountain_high_enough',
    );
  });

  it('gives every artist in the graph a facet entry', () => {
    const index = buildFacetIndex(edges);
    const unindexed = [...nodesIn(edges)]
      .filter((n) => n.startsWith('artist:') && !index.has(n))
      .slice(0, 10);
    expect(unindexed).toEqual([]);
  });

  it('points every artist edge at a registered artist', () => {
    // An unregistered artist id is a connection that resolves to nothing: the
    // pill renders, the click goes nowhere. This is the check that keeps the
    // registry and the song library from drifting apart again — it is how the
    // '&' problem surfaced (song: 'Hall & Oates', globe: 'Hall and Oates').
    // An artist is registered on the globe's roster or, off it, as a record
    // in src/content/data/artists.json: the credits the bulk import of 30
    // September 2026 wrote link session players and engineers there.
    const registered = new Set(
      [...ARTIST_REGISTRY, ...ARTIST_ROWS].map((a) => `artist:${a.slug}`),
    );
    // A credit printed by name only, with no artist id, is a guess from the
    // name (integrity files the ones that match no record as unresolved).
    // Every other artist edge, stated or guessed from the billing, must land.
    const byPrintedName = (e: Edge) =>
      !!e.inferred &&
      (e.via?.path === 'credits[].name' ||
        e.via?.path === 'credits[].instrument');
    const unregistered = (some: readonly Edge[]) =>
      [...nodesIn(some)]
        .filter((n) => n.startsWith('artist:') && !registered.has(n))
        .filter((n) => !KNOWN_UNREGISTERED.has(n))
        .sort();
    expect(unregistered(edges.filter((e) => !byPrintedName(e)))).toEqual([]);
    // Every such name landed until the bulk import of 30 September 2026
    // credited 561 songs: 2,226 of its credits name a session player,
    // engineer or arranger who has no artist record, 1,319 people in all. A
    // person adds them as records, or links the credit to one, in the
    // console. Pinned, so a new unlanded name is seen.
    expect(unregistered(edges.filter(byPrintedName))).toHaveLength(1319);
  });

  it('does not invent a writer when a songwriter credit exists', () => {
    // `composer` is the display line; using both would double-count.
    const song = songs.find((s) => s.id === 'africa')!;
    const writers = edgesForSong(song).filter((e) => e.kind === 'written_by');
    expect(writers).toHaveLength(2); // Paich and Porcaro, once each
  });

  it('links a progression to the songs that use it', () => {
    // 'Dreams- Fleetwood Mac' resolved to the real chart, so the edge runs
    // song → progression and lands in the facet index like any other.
    const dreams = LIB.find((p) => p.id === 409)!;
    expect(dreams.songIds).toEqual(['dreams']);
    const edges = edgesForProgression(dreams);
    expect(edges).toContainEqual(
      expect.objectContaining({
        from: 'song:dreams',
        kind: 'uses_progression',
        to: 'progression:409',
      }),
    );
  });

  it('translates the progression library own style vocabulary', () => {
    const dreams = LIB.find((p) => p.id === 409)!;
    const genres = edgesForProgression(dreams)
      .filter((e) => e.kind === 'in_genre')
      .map((e) => e.to);
    // The library writes 'r&b'; the graph's genre is `rnb`.
    expect(genres).toContain('genre:rnb');
    expect(genres).toContain('genre:jazz');
  });

  it('files gospel under the Gospel subgenre, and african nowhere', () => {
    // The owner mapped gospel to the Atlas's existing Gospel (30 Sep 2026),
    // a subgenre: the edge lands there, never on a `genre:gospel` nothing
    // defines. 'african' stays unmapped.
    const genresOf = (styles: string[]) =>
      edgesForProgression({ id: 1, vibes: [], styles })
        .filter((e) => e.kind === 'in_genre')
        .map((e) => e.to);
    expect(genresOf(['jazz', 'gospel', 'african'])).toEqual([
      'genre:jazz',
      'subgenre:gospel',
    ]);
    expect(genresOf(['african'])).toEqual([]);

    const gospel = LIB.filter((p) => p.styles.includes('gospel'));
    expect(gospel.length).toBeGreaterThan(0);
    for (const p of gospel) {
      expect(genresOf(p.styles), String(p.id)).toContain('subgenre:gospel');
    }
    // Every mapped style names a genre or a subgenre the table has.
    const unknown = Object.entries(PROGRESSION_STYLE_TO_GENRE).filter(
      ([, id]) =>
        !getGenre(id) &&
        !Object.prototype.hasOwnProperty.call(SUBGENRE_PARENT, id),
    );
    expect(unknown).toEqual([]);
  });

  it('says where every edge came from', () => {
    // Provenance is what lets the console answer "why are these connected?"
    // and jump to the field that says so.
    const missing = edges.filter((e) => !e.via?.path || !e.via.item);
    expect(missing.slice(0, 5)).toEqual([]);
    const progressionEdges = LIB.flatMap(edgesForProgression);
    expect(progressionEdges.every((e) => e.via?.path)).toBe(true);
  });

  it('marks links guessed from free text, and only those', () => {
    const song = songs.find((s) => s.id === 'something')!;
    const own = edgesForSong(song);
    // No credit on this song carries an artist id yet, so every person link
    // is resolved from a display name.
    const people = own.filter((e) =>
      ['performed_by', 'written_by', 'produced_by', 'features'].includes(
        e.kind,
      ),
    );
    expect(people.length).toBeGreaterThan(0);
    expect(people.every((e) => e.inferred)).toBe(true);
    // Vocabulary fields are typed, not guessed.
    const typed = own.filter((e) =>
      ['in_genre', 'in_key', 'in_mode'].includes(e.kind),
    );
    expect(typed.length).toBeGreaterThan(0);
    expect(typed.some((e) => e.inferred)).toBe(false);
  });

  it('keeps the accidental on every key', () => {
    // E♭ used to fold into E: 153 songs across nine tonics.
    const flats = songs.filter((s) => s.key.startsWith('E♭'));
    expect(flats.length).toBeGreaterThan(30);
    for (const song of flats) {
      const key = edgesForSong(song).find((e) => e.kind === 'in_key');
      expect(key?.to, song.id).toBe('key:e-flat');
    }
    const keyNodes = [...nodesIn(edges)].filter((n) => n.startsWith('key:'));
    for (const n of [
      'key:e-flat',
      'key:b-flat',
      'key:a-flat',
      'key:f-sharp',
      'key:d-flat',
      'key:c-sharp',
    ]) {
      expect(keyNodes, n).toContain(n);
    }
  });

  it('points a cover from the artist who covered it', () => {
    // The record says Diana Ross's 1970 recording is a cover OF this song.
    const song = songs.find((s) => s.id === 'aint_no_mountain_high_enough')!;
    expect(edgesForSong(song)).toContainEqual(
      expect.objectContaining({
        from: 'artist:diana-ross',
        kind: 'covers',
        to: 'song:aint_no_mountain_high_enough',
        year: 1970,
      }),
    );
  });

  it('points an original from the song that covers it', () => {
    // Sinéad O'Connor's recording covers the song Prince wrote and The Family
    // released first.
    const song = songs.find((s) => s.id === 'nothing_compares_2_u')!;
    const covers = edgesForSong(song).filter((e) => e.kind === 'covers');
    expect(covers.map((e) => [e.from, e.to])).toEqual([
      ['song:nothing_compares_2_u', 'artist:prince'],
      ['song:nothing_compares_2_u', 'artist:the-family'],
    ]);
  });

  it('bills the linked lead act and does not also guess one', () => {
    const song = songs.find((s) => s.id === 'dont_stop_believin')!;
    const billed = edgesForSong(song).filter((e) => e.kind === 'performed_by');
    expect(billed).toEqual([
      expect.objectContaining({
        to: 'artist:journey',
        via: { item: 'song:dont_stop_believin', path: 'origin.artistGlobeId' },
      }),
    ]);
    expect(billed[0].inferred).toBeUndefined();
  });

  it('prefers a credit artist id over the printed name', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const song: Song = {
      ...base,
      credits: [
        {
          name: 'J. Porcaro',
          role: 'performer',
          instrument: 'drum-kit',
          artistGlobeId: 'jeff-porcaro',
        },
      ],
    };
    const [played, plays] = edgesForSong(song);
    expect(played).toMatchObject({
      kind: 'features',
      to: 'artist:jeff-porcaro',
      via: { path: 'credits[].artistGlobeId' },
    });
    expect(played.inferred).toBeUndefined();
    expect(plays).toMatchObject({
      from: 'artist:jeff-porcaro',
      kind: 'plays_instrument',
      on: 'song:africa',
    });
  });

  it('carries an unconfirmed session onto every edge it states', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    // Without africa's record (Toto IV, since the bulk import of 30 September
    // 2026), so the session's label is read, as it is on a song with none.
    const song: Song = {
      ...base,
      releases: undefined,
      session: { ...base.session, unverified: true },
    };
    const sessionEdges = edgesForSong(song).filter((e) =>
      ['released_on', 'recorded_at', 'recorded_in'].includes(e.kind),
    );
    expect(sessionEdges).toHaveLength(3);
    expect(sessionEdges.every((e) => e.unverified && e.inferred)).toBe(true);
  });

  it('reads the song v2 ids as stated, and the text beside each no more', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const v2: Song = {
      ...base,
      releases: [
        { releaseId: 'toto-toto-iv', track: 10, source: 'discogs' },
        { releaseId: '  ' },
      ],
      subgenreIds: ['soft-rock', ''],
      session: {
        ...base.session,
        studioId: 'sunset-sound',
        labelId: 'columbia',
        placeId: 'los-angeles',
        source: 'liner notes',
      },
    };
    const made = edgesForSong(v2).filter(
      (e) =>
        ['on_release', 'released_on', 'recorded_at', 'recorded_in'].includes(
          e.kind,
        ) || e.via?.path === 'subgenreIds[]',
    );
    expect(made).toEqual([
      {
        from: 'song:africa',
        kind: 'on_release',
        to: 'release:toto-toto-iv',
        via: { item: 'song:africa', path: 'releases[].releaseId' },
        source: 'discogs',
      },
      // A song on a record takes its label from the record, so the session's
      // label id and text are both left unread.
      {
        from: 'song:africa',
        kind: 'recorded_at',
        to: 'studio:sunset-sound',
        via: { item: 'song:africa', path: 'session.studioId' },
        source: 'liner notes',
      },
      {
        from: 'song:africa',
        kind: 'recorded_in',
        to: 'place:los-angeles',
        via: { item: 'song:africa', path: 'session.placeId' },
        source: 'liner notes',
      },
      {
        from: 'song:africa',
        kind: 'in_genre',
        to: 'subgenre:soft-rock',
        via: { item: 'song:africa', path: 'subgenreIds[]' },
      },
    ]);
    expect(made.every(isValidEdge)).toBe(true);
  });

  it("reads the session's label id only while the song names no record", () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const label = (session: Song['session'], releases?: Song['releases']) =>
      edgesForSong({ ...base, session, releases })
        .filter((e) => e.kind === 'released_on')
        .map((e) => `${e.to} ${e.via?.path}${e.inferred ? ' (guess)' : ''}`);
    expect(label({ label: 'Columbia', labelId: 'columbia' })).toEqual([
      'label:columbia session.labelId',
    ]);
    // An id with no text beside it is a link all the same (C20).
    expect(label({ labelId: 'columbia' })).toEqual([
      'label:columbia session.labelId',
    ]);
    expect(label({ label: 'Columbia' })).toEqual([
      'label:columbia session.label (guess)',
    ]);
    expect(
      label({ label: 'Columbia', labelId: 'columbia' }, [
        { releaseId: 'toto-toto-iv' },
      ]),
    ).toEqual([]);
    // A record row not yet filled in names no record.
    expect(label({ labelId: 'columbia' }, [{ releaseId: '' }])).toEqual([
      'label:columbia session.labelId',
    ]);
  });

  it('keeps an unconfirmed session unconfirmed on its ids, but no guess', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const sessionEdges = edgesForSong({
      ...base,
      // No record, so the session's label id is read (see above).
      releases: undefined,
      session: {
        studioId: 'sunset-sound',
        labelId: 'columbia',
        placeId: 'los-angeles',
        unverified: true,
      },
    }).filter((e) =>
      ['released_on', 'recorded_at', 'recorded_in'].includes(e.kind),
    );
    expect(sessionEdges).toHaveLength(3);
    expect(sessionEdges.every((e) => e.unverified && !e.inferred)).toBe(true);
  });

  it('reads a stored v2 id verbatim, so a malformed one shows', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const edge = edgesForSong({
      ...base,
      session: { studio: 'Sunset Sound', studioId: 'Sunset Sound ' },
    }).find((e) => e.kind === 'recorded_at');
    expect(edge).toMatchObject({
      to: 'studio:Sunset Sound',
      via: { path: 'session.studioId' },
    });
    // The graph refuses it and integrity names the field; a slugged id would
    // have passed as `studio:sunset-sound` without a word.
    expect(isWellFormed(edge!.to)).toBe(false);
  });

  it('lands a session city on the globe city it names', () => {
    const song = songs.find((s) => s.id === 'africa')!;
    expect(edgesForSong(song)).toContainEqual(
      expect.objectContaining({
        kind: 'recorded_in',
        to: 'place:los-angeles',
      }),
    );
  });

  it('resolves a session city through the registry, not a plain slug', () => {
    // 'Birmingham' slugs to an id neither registered Birmingham has; the
    // country says which one.
    const base = songs.find((s) => s.id === 'africa')!;
    const at = (city: string, country?: string) =>
      edgesForSong({ ...base, session: { city, country } }).find(
        (e) => e.kind === 'recorded_in',
      )?.to;
    expect(at('Birmingham', 'UK')).toBe('place:birmingham-uk');
    // Refused names never fall back onto another registered city.
    expect(at('London', 'Canada')).toBe('place:london-canada');
    expect(at('Portland')).toBe('place:portland-unplaced');
  });

  it('puts a collaborator on the record, not a cover of it', () => {
    const base = songs.find((s) => s.id === 'africa')!;
    const collab = (rel: Song['relatedRecordings']) =>
      edgesForSong({ ...base, relatedRecordings: rel }).filter((e) =>
        e.via?.path.startsWith('relatedRecordings'),
      );
    expect(
      collab([
        { artist: 'Guest', relation: 'collaboration', artistGlobeId: 'guest' },
      ]),
    ).toEqual([
      expect.objectContaining({
        from: 'song:africa',
        kind: 'features',
        to: 'artist:guest',
        via: { item: 'song:africa', path: 'relatedRecordings[].artistGlobeId' },
      }),
    ]);
    const [named] = collab([
      { artist: 'Some Guest', relation: 'collaboration' },
    ]);
    expect(named).toMatchObject({
      kind: 'features',
      to: 'artist:some-guest',
      inferred: true,
    });
  });

  it('meets the song where the globe knows it as an event', () => {
    expect(canonicalId('event:song-africa')).toBe('song:africa');
  });

  it('only emits progression edges the schema allows', () => {
    const all = LIB.flatMap(edgesForProgression);
    expect(all.filter((e) => !isValidEdge(e))).toEqual([]);
    expect(
      all.filter((e) => e.kind === 'uses_progression').length,
    ).toBeGreaterThan(10);
  });
});
