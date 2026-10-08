import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { allConnections } from '@/components/atlas/data/eventConnections';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import ARTIST_ROWS from '@/content/data/artists.json';
import LABEL_ROWS from '@/content/data/labels.json';
import PLACE_ROWS from '@/content/data/places.json';
import RELEASE_ROWS from '@/content/data/releases.json';
import STUDIO_ROWS from '@/content/data/studios.json';
import {
  type ArtistRow,
  composeArtists,
  composePlaces,
} from '@/content/records/compose';
import type {
  ArtistRecord,
  LabelRecord,
  PlaceRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import type { ContentRef, Song } from '@/curriculum/types/songLibrary';
import { CANONICAL_ANNUAL_TEMPLATE } from '@/features/classroom/annual/curriculumTemplate';
import { REF_PATHS } from '@/scripts/apiContract/refPaths';
import ARTIST_LOCATIONS from '@/scripts/artistLocations.json';
import { edgesForProgression, edgesForSong } from '../deriveEdges';
import {
  assembleGraph,
  buildGraph,
  type GraphSnapshot,
  INFLUENCE_ARC_PATH,
  type ItemStatus,
  matchSnapshotEvents,
} from '../deriveGraph';
import { INSTRUMENT_GENRES } from '../instrumentGenres';
import {
  ACYCLIC_EDGES,
  checkIntegrity,
  CONTENT_KINDS,
  type CoverageRow,
  INTEGRITY_CHECKS,
  type IntegrityCheck,
  type IntegrityRow,
  LINKED_BY,
  SLUGGED_VOCAB,
  withinEditDistance,
} from '../integrity';
import { EDGE_KINDS, type EntityId } from '../types';

/**
 * The Integrity page is where the graph's promises are kept: nothing invalid
 * is dropped silently and nothing referenced is invented, so every bad
 * reference, loop, look-alike and disagreement must come out here as a row
 * pointing at the field to fix. Each check is pinned on a small fixture, then
 * the whole thing is run over the repo's own data.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list. Stubbing the store keeps it out of this test.
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

const africa = BUNDLED_SONGS.africa;

/** A song with nothing but what the test gives it (plus africa's key/mode). */
const song = (id: string, over: Partial<Song> = {}): Song => ({
  ...africa,
  id,
  title: id,
  artist: 'Unknown Artist',
  composer: undefined,
  year: undefined,
  genreTags: [],
  session: undefined,
  credits: undefined,
  // africa has named its record (Toto IV) since the bulk import of 30
  // September 2026; a fixture song names none unless the test gives it.
  releases: undefined,
  origin: undefined,
  relatedRecordings: undefined,
  contentRefs: undefined,
  ...over,
});

const artist = (slug: string, over: Partial<ArtistRecord> = {}) => ({
  slug,
  name: slug,
  ...over,
});

/** A song's "X on the Globe" link, a reference the graph does not derive. */
const globeRef = (globeArtistId: string): ContentRef => ({
  module: 'globe',
  globeArtistId,
  displayLabel: 'On the Globe',
  refType: 'globe_artist',
});

const rowsOf = (snapshot: GraphSnapshot, check: IntegrityCheck) =>
  checkIntegrity(snapshot).rows.filter((r) => r.check === check);

/**
 * Every row but the orphans (records a fixture defines only to be pointed
 * at), so a test sees a double report whichever check it comes from.
 */
const allRows = (snapshot: GraphSnapshot) =>
  checkIntegrity(snapshot).rows.filter((r) => r.check !== 'orphan');

/** The row without its prose, for exact comparison. */
const shape = ({ message: _message, ...rest }: IntegrityRow) => rest;

describe('the integrity module', () => {
  it('stays pure: no store, no globe artist index, no React', () => {
    const source = readFileSync('src/content/graph/integrity.ts', 'utf8');
    expect(source).not.toMatch(
      /from '@\/(content\/contentStore|components\/atlas\/data\/(artists|eventConnections))'/,
    );
    expect(source).not.toMatch(/from 'react'/);
  });

  it('builds the graph itself when not handed one', () => {
    const snapshot = { artists: [artist('toto', { labelIds: ['nobody'] })] };
    expect(checkIntegrity(snapshot)).toEqual(
      checkIntegrity(snapshot, buildGraph(snapshot)),
    );
  });
});

describe('references to nothing', () => {
  it('points a stored id that names nothing at the field that holds it', () => {
    const rows = rowsOf(
      { artists: [artist('toto', { labelIds: ['no-such-label'] })] },
      'dangling',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'dangling',
        severity: 'error',
        kind: 'artist',
        id: 'artist:toto',
        path: 'labelIds[]',
        fix: { kind: 'artist', id: 'artist:toto', path: 'labelIds[]' },
        related: ['label:no-such-label'],
      },
    ]);
    expect(rows[0].message).toContain('label:no-such-label');
  });

  it('holds vocabulary values to the vocabulary', () => {
    const rows = rowsOf(
      { artists: [artist('toto', { genreIds: ['rock', 'not-a-genre'] })] },
      'dangling',
    );
    expect(rows.map((r) => r.related)).toEqual([['genre:not-a-genre']]);
  });

  it('names a code list that points at a missing song, and a globe event with no song', () => {
    const report = checkIntegrity({
      songs: [song('real')],
      events: [
        { id: 'song-real', title: 'Real' },
        { id: 'song-ghost', title: 'Ghost — Nobody' },
        { id: 'song-lonely_ghost', title: 'Lonely Ghost — Nobody' },
      ],
      influenceArcs: [{ from: 'song-ghost', to: 'song-real' }],
    });
    const dangling = report.rows.filter((r) => r.check === 'dangling');
    expect(dangling.map(shape)).toEqual([
      {
        check: 'dangling',
        severity: 'error',
        kind: 'song',
        id: 'song:ghost',
        path: INFLUENCE_ARC_PATH,
        fix: { kind: 'song', id: 'song:ghost', path: INFLUENCE_ARC_PATH },
        related: ['song:ghost'],
      },
      // Nothing points at it, so the event itself is the finding.
      {
        check: 'dangling',
        severity: 'warning',
        kind: 'song',
        id: 'song:lonely_ghost',
      },
    ]);
    expect(dangling[1].message).toContain('Lonely Ghost — Nobody');
  });

  it('never takes a missing song named like a year for the year', () => {
    // The dated song puts 1982 and the 1980s on the graph. Songs called
    // '1982' and '1980s' are still songs nothing defines, not the wrong kind.
    const rows = allRows({
      songs: [song('real', { year: 1982 })],
      influenceArcs: [
        { from: 'song-1982', to: 'song-real' },
        { from: 'song-1980s', to: 'song-real' },
      ],
    });
    expect(rows.map((r) => [r.check, r.severity, r.related])).toEqual([
      ['dangling', 'error', ['song:1980s']],
      ['dangling', 'error', ['song:1982']],
    ]);
    expect(rows[1].message).toContain('which nothing defines');
  });

  it('files a guess from display text that matches no record as unresolved, quoting it', () => {
    const rows = rowsOf(
      {
        songs: [
          song('africa', {
            artist: 'Toto',
            session: { label: 'Columbia', studio: 'Sunset Sound' },
          }),
        ],
        artists: [artist('toto', { name: 'Toto' })],
      },
      'unresolved',
    );
    expect(rows.map((r) => [r.severity, r.path, r.related])).toEqual([
      ['info', 'session.label', ['label:columbia']],
      ['info', 'session.studio', ['studio:sunset-sound']],
    ]);
    expect(rows[0].message).toContain("'Columbia'");
    expect(rows[1].message).toContain("'Sunset Sound'");
  });

  it("reports a missing credited artist on the credit's artist field only, never its instrument", () => {
    // The instrument edge runs from the player, on the song, via the
    // instrument field: it touches the artist but does not name them.
    const guessed = allRows({
      songs: [
        song('s', {
          credits: [
            { name: 'Jeff Porcaro', role: 'performer', instrument: 'drum-kit' },
          ],
        }),
      ],
      artists: [artist('toto')],
    });
    expect(guessed.map(shape)).toEqual([
      {
        check: 'unresolved',
        severity: 'info',
        kind: 'song',
        id: 'song:s',
        path: 'credits[].name',
        fix: { kind: 'song', id: 'song:s', path: 'credits[].name' },
        related: ['artist:jeff-porcaro'],
      },
    ]);
    expect(guessed[0].message).toContain("'Jeff Porcaro'");

    // A missing instrument is still the instrument field's own row.
    const linked = allRows({
      songs: [
        song('s', {
          credits: [
            {
              name: 'Nobody',
              artistGlobeId: 'nobody',
              role: 'performer',
              instrument: 'not-an-instrument',
            },
          ],
        }),
      ],
      artists: [artist('toto')],
    });
    expect(linked.map((r) => [r.check, r.path, r.related])).toEqual([
      ['dangling', 'credits[].artistGlobeId', ['artist:nobody']],
      ['dangling', 'credits[].instrument', ['instrument:not-an-instrument']],
    ]);
  });

  it('judges each source of a merged edge on its own: a name is a guess beside a stored id', () => {
    const rows = allRows({
      songs: [
        song('s', {
          origin: { artistGlobeId: 'toto' },
          credits: [{ name: 'Toto', role: 'performer', primary: true }],
        }),
      ],
    });
    expect(rows.map((r) => [r.severity, r.check, r.path])).toEqual([
      ['error', 'dangling', 'origin.artistGlobeId'],
      ['info', 'unresolved', 'credits[].name'],
    ]);
  });

  it('checks a stored related-recording artist the deriver passes over', () => {
    // With a song id the edge runs to the recording, and a sample with no
    // song id draws nothing, so the artist id reaches no node: read it here.
    const relations = ['original', 'cover', 'sample', 'interpolation'] as const;
    for (const relation of relations) {
      const rows = allRows({
        songs: [
          song('s', {
            relatedRecordings: [
              {
                songId: 'other',
                artist: 'Nobody',
                artistGlobeId: 'nobody',
                relation,
              },
            ],
          }),
          song('other'),
        ],
        artists: [artist('toto')],
      });
      expect(
        rows.map((r) => [r.check, r.id, r.path]),
        relation,
      ).toEqual([['dangling', 'song:s', 'relatedRecordings[].artistGlobeId']]);
      expect(rows[0].message).toContain('artist:nobody');
    }
    expect(
      allRows({
        songs: [
          song('s', {
            relatedRecordings: [
              { artist: 'Nobody', artistGlobeId: 'nobody', relation: 'sample' },
            ],
          }),
        ],
        artists: [artist('toto')],
      }).map((r) => [r.check, r.path]),
    ).toEqual([['dangling', 'relatedRecordings[].artistGlobeId']]);
    // Drawn as an edge, it is the missing node's row, once.
    expect(
      allRows({
        songs: [
          song('s', {
            relatedRecordings: [
              {
                artist: 'Nobody',
                artistGlobeId: 'nobody',
                relation: 'collaboration',
              },
            ],
          }),
        ],
        artists: [artist('toto')],
      }).map((r) => [r.check, r.path, r.related]),
    ).toEqual([
      ['dangling', 'relatedRecordings[].artistGlobeId', ['artist:nobody']],
    ]);
  });

  it('checks id fields the graph does not derive, against the records it has', () => {
    const songs = [
      song('a', { contentRefs: [globeRef('toto')] }),
      song('b', { contentRefs: [globeRef('nobody')] }),
      song('c', { contentRefs: [globeRef('Some One')] }),
    ];
    const report = checkIntegrity({ songs, artists: [artist('toto')] });
    const rows = report.rows.filter(
      (r) => r.path === 'contentRefs[].globeArtistId',
    );
    expect(rows.map((r) => [r.check, r.id])).toEqual([
      ['dangling', 'song:b'],
      ['malformed', 'song:c'],
    ]);
    expect(rows[1].message).toContain("Did you mean 'some-one'?");
    // Without artists in the snapshot there is nothing to check against.
    expect(
      checkIntegrity({ songs }).rows.filter(
        (r) => r.path === 'contentRefs[].globeArtistId',
      ),
    ).toEqual([expect.objectContaining({ check: 'malformed', id: 'song:c' })]);
  });
});

describe('wrong kinds, bad grammar and refused edges', () => {
  it("calls another kind's id in a field the wrong kind", () => {
    const rows = checkIntegrity({
      artists: [
        artist('toto', { labelIds: ['artist:journey', 'label:motown'] }),
      ],
      dayStubs: [{ slug: 'aug-day-1', label: 'Day 1', songId: 'song-africa' }],
    }).rows;
    expect(rows.map((r) => [r.check, r.id, r.path])).toEqual([
      ['wrong-kind', 'artist:toto', 'labelIds[]'],
      ['wrong-kind', 'teach_day:aug-day-1', 'songId'],
      ['malformed', 'artist:toto', 'labelIds[]'],
      ['orphan', 'artist:toto', undefined],
      ['orphan', 'teach_day:aug-day-1', undefined],
    ]);
    expect(rows[0].message).toContain('an artist id');
    expect(rows[1].message).toContain("the song id 'africa'");
    expect(rows[2].message).toContain("the bare slug 'motown'");
  });

  it('names the song a second recording’s event id stands for', () => {
    // `song-valerie_bbc_live_version` is the song `valerie`
    // (songEventAliases.ts), not a song of its own.
    const [row] = rowsOf(
      {
        dayStubs: [
          {
            slug: 'aug-day-2',
            label: 'Day 2',
            songId: 'song-valerie_bbc_live_version',
          },
        ],
      },
      'wrong-kind',
    );
    expect(row.message).toContain("the song id 'valerie'");
  });

  it('suspects the wrong field when a stored id names another kind of thing', () => {
    const rows = rowsOf(
      {
        artists: [artist('toto', { labelIds: ['journey'] }), artist('journey')],
      },
      'wrong-kind',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'wrong-kind',
        severity: 'error',
        kind: 'artist',
        id: 'artist:toto',
        path: 'labelIds[]',
        fix: { kind: 'artist', id: 'artist:toto', path: 'labelIds[]' },
        related: ['label:journey', 'artist:journey'],
      },
    ]);
  });

  it('reports a malformed id once, with the slug it probably meant', () => {
    const report = checkIntegrity({
      artists: [
        artist('toto', { basedInPlaceId: 'Los Angeles' }),
        artist('Journey', { labelIds: ['columbia'] }),
      ],
    });
    const rows = report.rows.filter((r) => r.check === 'malformed');
    expect(rows.map((r) => [r.id, r.path])).toEqual([
      ['artist:Journey', 'slug'],
      ['artist:toto', 'basedInPlaceId'],
    ]);
    expect(rows[0].message).toContain("Did you mean 'journey'?");
    expect(rows[1].message).toContain("Did you mean 'los-angeles'?");
  });

  it('keeps one malformed credit artist to one row, on its own field', () => {
    // The deriver slugs it into artist:jeff-porcaro, which nothing defines;
    // saying so again would claim the field holds an id it does not.
    const rows = allRows({
      songs: [
        song('s', {
          credits: [
            {
              name: 'Jeff Porcaro',
              role: 'performer',
              instrument: 'drum-kit',
              artistGlobeId: 'Jeff Porcaro',
            },
          ],
        }),
      ],
    });
    expect(rows.map((r) => [r.check, r.id, r.path])).toEqual([
      ['malformed', 'song:s', 'credits[].artistGlobeId'],
    ]);
  });

  it('keeps a malformed lead act to its malformed row', () => {
    const rows = allRows({
      songs: [song('s', { origin: { artistGlobeId: 'Toto' } })],
    });
    expect(rows.map((r) => [r.check, r.path])).toEqual([
      ['malformed', 'origin.artistGlobeId'],
    ]);
    expect(rows[0].message).toContain("Did you mean 'toto'?");
  });

  it('holds the vocabulary fields the deriver slugs to the slug grammar', () => {
    const rows = allRows({
      songs: [
        song('s', {
          mode: 'Dorian' as string as Song['mode'],
          credits: [
            {
              name: 'X',
              artistGlobeId: 'x',
              role: 'performer',
              instrument: 'Electric Bass',
            },
          ],
        }),
      ],
      artists: [artist('x')],
      progressions: [{ id: 1, vibes: ['Dark Moody'], styles: [] }],
    });
    // Malformed only: the slugged id it resolves to is not reported again.
    expect(rows.map((r) => [r.check, r.id, r.path])).toEqual([
      ['malformed', 'progression:1', 'vibes[]'],
      ['malformed', 'song:s', 'credits[].instrument'],
      ['malformed', 'song:s', 'mode'],
    ]);
    expect(rows[1].message).toContain("Did you mean 'electric-bass'?");
  });

  it('lists exactly the vocabulary fields whose deriver slugs the stored value', () => {
    const vocab = new Set(
      REF_PATHS.filter((r) => r.vocab).map((r) => `${r.kind}|${r.path}`),
    );
    for (const key of SLUGGED_VOCAB) expect(vocab.has(key), key).toBe(true);
    // Each really is slugged on the way in, which is what hides a bad value.
    const edges = [
      ...edgesForSong(
        song('s', {
          mode: 'Dorian' as string as Song['mode'],
          credits: [
            { name: 'X', role: 'performer', instrument: 'Electric Bass' },
          ],
        }),
      ),
      ...edgesForProgression({ id: 1, vibes: ['Dark Moody'], styles: [] }),
    ];
    const slugged = edges.map((e) => `${e.via?.path} ${e.to}`);
    expect(slugged).toEqual(
      expect.arrayContaining([
        'mode mode:dorian',
        'credits[].instrument instrument:electric-bass',
        'vibes[] vibe:dark-moody',
      ]),
    );
  });

  it('reports edges that join the wrong kinds after folding, and edges with no source', () => {
    const graph = assembleGraph(
      [],
      [
        {
          from: 'event:song-africa',
          kind: 'plays_instrument',
          to: 'instrument:drum-kit',
          via: { item: 'teach_day:aug-day-1', path: 'songId' },
        },
        { from: 'artist:a', kind: 'influenced', to: 'artist:b' },
      ],
    );
    const rows = checkIntegrity({}, graph).rows.filter(
      (r) => r.check === 'endpoints',
    );
    expect(rows.map((r) => [r.severity, r.id, r.path])).toEqual([
      ['error', 'artist:a', undefined],
      ['error', 'teach_day:aug-day-1', 'songId'],
    ]);
    expect(rows[1].message).toContain('song:africa');
  });
});

describe('orphans', () => {
  it('lists what nothing connects to, but never a vocabulary or a missing node', () => {
    const rows = rowsOf(
      {
        songs: [song('s', { artist: 'Connected', year: 1965 })],
        artists: [artist('connected'), artist('lonely', { name: 'Lonely' })],
        events: [{ id: 'song-ghost' }, { id: 'evt-quiet', title: 'Quiet' }],
      },
      'orphan',
    );
    expect(rows.map((r) => r.id)).toEqual(['artist:lonely', 'event:evt-quiet']);
    expect(rows[0]).toMatchObject({ severity: 'info', kind: 'artist' });
  });

  it("never lists a year or a decade, which are the calendar's to point at", () => {
    const calendar = (id: EntityId, kind: 'year' | 'decade') => ({
      id,
      kind,
      label: id.slice(id.indexOf(':') + 1),
      status: 'code' as const,
      origin: 'code' as const,
    });
    const graph = assembleGraph(
      [calendar('year:1982', 'year'), calendar('decade:1980s', 'decade')],
      [],
    );
    const rows = checkIntegrity({}, graph).rows;
    expect(rows.filter((r) => r.check === 'orphan')).toEqual([]);
    // A dated song brings its year, decade and era in, and nothing to fix.
    const dated = checkIntegrity({
      songs: [song('s', { artist: 'Connected', year: 1965 })],
      artists: [artist('connected')],
    });
    expect(dated.rows).toEqual([]);
  });
});

describe('duplicates and alias candidates', () => {
  it('pairs names that are the same once normalized, and an alias used as a name', () => {
    const rows = rowsOf(
      {
        artists: [
          artist('the-temptations', { name: 'The Temptations' }),
          artist('temptations', { name: 'Temptations' }),
          artist('andy-grammer', {
            name: 'Andy Grammer',
            aliases: ['Andy Grammar'],
          }),
          artist('andy-grammar', { name: 'Andy Grammar' }),
        ],
      },
      'duplicate',
    );
    expect(rows.map((r) => [r.severity, r.id, r.related])).toEqual([
      ['warning', 'artist:andy-grammar', ['artist:andy-grammer']],
      ['warning', 'artist:the-temptations', ['artist:temptations']],
    ]);
    expect(rows[0].message).toContain("alias 'Andy Grammar'");
  });

  it('hints at near misses, keeping the better-connected spelling', () => {
    const rows = rowsOf(
      {
        songs: [song('s', { artist: 'Marvin Gaye' })],
        artists: [
          artist('marvin-gaye', { name: 'Marvin Gaye' }),
          artist('marivn-gaye', { name: 'Marivn Gaye' }),
          // Short names are two letters apart too easily.
          artist('cher', { name: 'Cher' }),
          artist('chic', { name: 'Chic' }),
        ],
      },
      'duplicate',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'duplicate',
        severity: 'info',
        kind: 'artist',
        id: 'artist:marivn-gaye',
        related: ['artist:marvin-gaye'],
      },
    ]);
  });

  it('flags a combined billing whose halves are both artists', () => {
    const rows = rowsOf(
      {
        artists: [
          artist('alicia-keys', { name: 'Alicia Keys' }),
          artist('justin-timberlake', { name: 'Justin Timberlake' }),
          artist('alicia-keys-and-justin-timberlake', {
            name: 'Alicia Keys & Justin Timberlake',
          }),
          // Not two artists: neither half is one.
          artist('earth-wind-and-fire', { name: 'Earth, Wind & Fire' }),
          artist('fire', { name: 'Fire' }),
        ],
      },
      'duplicate',
    );
    expect(rows.map((r) => [r.id, r.related])).toEqual([
      [
        'artist:alicia-keys-and-justin-timberlake',
        ['artist:alicia-keys', 'artist:justin-timberlake'],
      ],
    ]);
  });

  it('flags a name led by a quotation mark', () => {
    const rows = rowsOf(
      { artists: [artist('black-panther', { name: '"Black Panther' })] },
      'duplicate',
    );
    expect(rows.map((r) => [r.severity, r.id])).toEqual([
      ['warning', 'artist:black-panther'],
    ]);
  });

  it('checks studios and labels too, each only against its own kind', () => {
    const labels: LabelRecord[] = [{ slug: 'motown', name: 'Motown' }];
    const rows = rowsOf(
      {
        studios: [
          {
            slug: 'hitsville-u-s-a',
            name: 'Hitsville U.S.A.',
            aliases: ['Motown Studio A'],
          },
          { slug: 'motown-studio-a', name: 'Motown Studio A' },
        ],
        labels,
        artists: [artist('motown', { name: 'Motown' })],
      },
      'duplicate',
    );
    expect(rows.map((r) => [r.kind, r.id, r.related])).toEqual([
      ['studio', 'studio:motown-studio-a', ['studio:hitsville-u-s-a']],
    ]);
  });

  it('measures edit distance with an early exit', () => {
    expect(withinEditDistance('marvin gaye', 'marivn gaye', 2)).toBe(true);
    expect(withinEditDistance('eurythmics', 'eurhythmics', 2)).toBe(true);
    expect(withinEditDistance('kitten', 'sitting', 2)).toBe(false);
    expect(withinEditDistance('abc', 'abcdef', 2)).toBe(false);
    expect(withinEditDistance('same', 'same', 0)).toBe(true);
  });
});

describe('cycles', () => {
  it('finds a group that is, through another, its own member', () => {
    const rows = rowsOf(
      {
        artists: [
          artist('a', { group: true, members: [{ artistId: 'b' }] }),
          artist('b', { group: true, members: [{ artistId: 'a' }] }),
          // A plain chain is fine.
          artist('c', { group: true, members: [{ artistId: 'd' }] }),
          artist('d'),
        ],
      },
      'cycle',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'cycle',
        severity: 'error',
        kind: 'artist',
        id: 'artist:a',
        path: 'members[].artistId',
        // The loop closes on b's membership of a, which a's record states.
        fix: { kind: 'artist', id: 'artist:a', path: 'members[].artistId' },
        related: ['artist:a', 'artist:b'],
      },
    ]);
    expect(rows[0].message).toContain('artist:a → artist:b → artist:a');
  });

  it('finds a label that is its own parent, and leaves a real imprint alone', () => {
    const rows = rowsOf(
      {
        labels: [
          { slug: 'loop', name: 'Loop', parentLabelId: 'loop' },
          { slug: 'tamla', name: 'Tamla', parentLabelId: 'motown' },
          { slug: 'motown', name: 'Motown' },
        ],
      },
      'cycle',
    );
    expect(rows.map((r) => [r.id, r.fix?.path, r.related])).toEqual([
      ['label:loop', 'parentLabelId', ['label:loop']],
    ]);
  });

  it('finds a place inside itself', () => {
    const graph = assembleGraph(
      [],
      [
        {
          from: 'place:a',
          kind: 'located_in',
          to: 'place:b',
          via: { item: 'place:a', path: 'region' },
        },
        {
          from: 'place:b',
          kind: 'located_in',
          to: 'place:c',
          via: { item: 'place:b', path: 'region' },
        },
        {
          from: 'place:c',
          kind: 'located_in',
          to: 'place:a',
          via: { item: 'place:c', path: 'region' },
        },
      ],
    );
    const rows = checkIntegrity({}, graph).rows.filter(
      (r) => r.check === 'cycle',
    );
    expect(rows.map((r) => r.message)).toEqual([
      'located_in goes round in a circle: place:a → place:b → place:c → place:a.',
    ]);
  });

  it('names both loops of a tangle that share a node', () => {
    const rows = rowsOf(
      {
        artists: [
          artist('a', { members: [{ artistId: 'b' }, { artistId: 'c' }] }),
          artist('b', { members: [{ artistId: 'a' }] }),
          artist('c', { members: [{ artistId: 'a' }] }),
        ],
      },
      'cycle',
    );
    expect(rows.map((r) => [r.id, r.fix?.id, r.related])).toEqual([
      ['artist:a', 'artist:a', ['artist:a', 'artist:b']],
      ['artist:c', 'artist:c', ['artist:a', 'artist:c']],
    ]);
  });

  it('checks every edge REF_PATHS marks acyclic, and places', () => {
    const marked = REF_PATHS.flatMap((r) => (r.acyclic ? [r.acyclic] : []));
    expect(marked.length).toBeGreaterThan(0);
    for (const kind of marked) {
      expect(EDGE_KINDS, kind).toContain(kind);
      expect(ACYCLIC_EDGES, kind).toContain(kind);
    }
    expect([...ACYCLIC_EDGES].sort()).toEqual(
      [...new Set([...marked, 'located_in'])].sort(),
    );
  });
});

describe('conflicting owners', () => {
  const credit = (artistGlobeId?: string, primary = true) => ({
    name: artistGlobeId ?? 'Someone',
    role: 'vocals' as const,
    primary,
    ...(artistGlobeId ? { artistGlobeId } : {}),
  });

  it('flags a lead act missing from the linked billing', () => {
    const rows = rowsOf(
      {
        songs: [
          song('wrong', {
            origin: { artistGlobeId: 'toto' },
            credits: [credit('bobby-kimball'), credit('toto', false)],
          }),
          song('right', {
            origin: { artistGlobeId: 'toto' },
            credits: [credit('toto'), credit('bobby-kimball')],
          }),
          // Billing not linked yet: nothing to disagree with.
          song('unlinked', {
            origin: { artistGlobeId: 'toto' },
            credits: [credit()],
          }),
        ],
      },
      'conflicting-owners',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'conflicting-owners',
        severity: 'warning',
        kind: 'song',
        id: 'song:wrong',
        path: 'origin.artistGlobeId',
        fix: { kind: 'song', id: 'song:wrong', path: 'origin.artistGlobeId' },
        related: ['artist:toto', 'artist:bobby-kimball'],
      },
    ]);
  });

  it('counts a primary credit still written as a name as billing', () => {
    expect(
      rowsOf(
        {
          songs: [
            song('s', {
              origin: { artistGlobeId: 'toto' },
              credits: [
                credit('bobby-kimball'),
                { name: 'Toto', role: 'vocals', primary: true },
              ],
            }),
          ],
        },
        'conflicting-owners',
      ),
    ).toEqual([]);
  });

  it('compares the artists the graph resolves, and leaves a malformed lead act to its own row', () => {
    const rows = allRows({
      songs: [
        song('s', {
          origin: { artistGlobeId: 'Toto' },
          credits: [credit('toto')],
        }),
      ],
      artists: [artist('toto')],
    });
    expect(rows.map((r) => [r.check, r.path])).toEqual([
      ['malformed', 'origin.artistGlobeId'],
    ]);
  });

  const cities = (...ids: string[]) => CITIES.filter((c) => ids.includes(c.id));

  it("flags a hand-authored event whose stored place is not its city's", () => {
    const at = (city: string) => ({ lat: 0, lng: 0, city, country: 'US' });
    const snapshot: GraphSnapshot = {
      places: cities('detroit', 'los-angeles'),
      events: [
        { id: 'evt-wrong', location: at('Detroit'), placeId: 'los-angeles' },
        { id: 'evt-right', location: at('Detroit'), placeId: 'detroit' },
        // A city the registry cannot place gives nothing to compare.
        { id: 'evt-unplaced', location: at('Slab Fork'), placeId: 'detroit' },
        // Nothing stored: the city is the place, as a guess.
        { id: 'evt-guessed', location: at('Detroit') },
        // A song's event is its song: its fields are not the event's own.
        { id: 'song-x', location: at('Detroit'), placeId: 'los-angeles' },
      ],
    };
    const rows = rowsOf(snapshot, 'conflicting-owners');
    expect(rows.map(shape)).toEqual([
      {
        check: 'conflicting-owners',
        severity: 'warning',
        kind: 'event',
        id: 'event:evt-wrong',
        path: 'placeId',
        fix: { kind: 'event', id: 'event:evt-wrong', path: 'placeId' },
        related: ['place:los-angeles', 'place:detroit'],
      },
    ]);
    expect(rows[0].message).toContain("'Detroit'");
  });

  it("leaves an event's malformed stored place to its malformed row", () => {
    const rows = allRows({
      places: cities('los-angeles'),
      events: [
        {
          id: 'evt-a',
          location: { lat: 0, lng: 0, city: 'Detroit', country: 'US' },
          placeId: 'Los Angeles',
        },
      ],
    });
    expect(rows.map((r) => [r.check, r.id, r.path])).toEqual([
      ['malformed', 'event:evt-a', 'placeId'],
    ]);
  });

  it("notes song pins away from the act's City, which publishing it moves", () => {
    const snapshot: GraphSnapshot = {
      places: cities('detroit', 'new-york'),
      artists: [
        artist('madonna', { name: 'Madonna', basedInPlaceId: 'new-york' }),
        artist('the-stooges', { basedInPlaceId: 'detroit' }),
        // Pinned in 'Washington', which the registry cannot place.
        artist('marvin-gaye', { basedInPlaceId: 'detroit' }),
        // No City yet: the pins stand in for one.
        artist('toto'),
      ],
      artistLocations: [
        { id: 'madonna', city: 'Detroit', country: 'US' },
        { id: 'the stooges', city: 'Detroit', country: 'US' },
        { id: 'marvin gaye', city: 'Washington', country: 'US' },
        { id: 'toto', city: 'New York', country: 'US' },
      ],
    };
    const rows = rowsOf(snapshot, 'conflicting-owners');
    expect(rows.map(shape)).toEqual([
      {
        check: 'conflicting-owners',
        severity: 'info',
        kind: 'artist',
        id: 'artist:madonna',
        path: 'basedInPlaceId',
        fix: { kind: 'artist', id: 'artist:madonna', path: 'basedInPlaceId' },
        related: ['place:detroit', 'place:new-york'],
      },
    ]);
    expect(rows[0].message).toContain("pinned in 'Detroit'");
  });

  it('flags years active the calendar cannot read as a span', () => {
    const artists = [
      artist('backwards', { activeFrom: 1985, activeTo: 1979 }),
      artist('typo', { activeFrom: 1065, activeTo: 1985 }),
      // Still active, from a year still to come.
      artist('early', { activeFrom: 2031 }),
      artist('fine', { activeFrom: 1965, activeTo: 1982 }),
      artist('still-going', { activeFrom: 1990 }),
      artist('one-year', { activeFrom: 1977, activeTo: 1977 }),
    ];
    const rows = rowsOf({ artists, asOfYear: 2026 }, 'impossible-years');
    expect(rows.map((r) => [r.id, r.severity, r.fix?.path])).toEqual([
      ['artist:backwards', 'warning', 'activeFrom'],
      ['artist:early', 'warning', 'activeFrom'],
      ['artist:typo', 'warning', 'activeFrom'],
    ]);
    expect(rows.map((r) => r.message)).toEqual([
      'Active from 1985 to 1979: the span ends before it starts.',
      'Active from 2031, a year still to come (it is 2026).',
      expect.stringContaining('one of the years is probably mistyped'),
    ]);
    // An open span needs the snapshot's year to be read at all.
    expect(rowsOf({ artists }, 'impossible-years').map((r) => r.id)).toEqual([
      'artist:backwards',
      'artist:typo',
    ]);
    // A span is one field's business, not two fields disagreeing.
    expect(rowsOf({ artists, asOfYear: 2026 }, 'conflicting-owners')).toEqual(
      [],
    );
  });

  it('flags a year active that is set but is no year', () => {
    const artists = [
      // The schema takes any number; the calendar reads no year from these.
      artist('zero', { activeFrom: 1965, activeTo: 0 }),
      artist('fraction', { activeFrom: 1982.5 }),
      artist('both', { activeFrom: -1, activeTo: 1e6 }),
      // Null is unset, as in a JSON body: an open span.
      artist('open', {
        activeFrom: 1990,
        activeTo: null as unknown as undefined,
      }),
    ];
    const rows = rowsOf({ artists, asOfYear: 2026 }, 'impossible-years');
    expect(rows.map((r) => [r.id, r.fix?.path, r.message])).toEqual([
      [
        'artist:both',
        'activeFrom',
        'Its first year active is -1, which is not a year.',
      ],
      [
        'artist:both',
        'activeTo',
        'Its last year active is 1000000, which is not a year.',
      ],
      [
        'artist:fraction',
        'activeFrom',
        'Its first year active is 1982.5, which is not a year.',
      ],
      [
        'artist:zero',
        'activeTo',
        'Its last year active is 0, which is not a year.',
      ],
    ]);
  });
});

describe('births, group birthplaces and session labels', () => {
  it('flags a birth the calendar cannot place beside the years active', () => {
    const artists = [
      artist('born-late', {
        born: { date: '1960-05-01' },
        activeFrom: 1957,
        activeTo: 1984,
      }),
      artist('formed-late', {
        group: true,
        born: { date: '1970' },
        activeFrom: 1965,
      }),
      artist('no-such-day', { born: { date: '1939-02-30' } }),
      artist('no-such-month', { born: { date: '1939-13' } }),
      artist('not-written', { born: { date: '1939-4-2' } }),
      artist('padded', { born: { date: ' 1939' } }),
      artist('year-zero', { born: { date: '0000' } }),
      artist('to-come', { born: { date: '2031-01-01' } }),
      // All fine: a birth the year the career began, a month, a year alone,
      // a leap day, and a birth with no years active to compare.
      artist('child-star', { born: { date: '1950' }, activeFrom: 1950 }),
      artist('month', { born: { date: '1939-04' }, activeFrom: 1957 }),
      artist('leap', { born: { date: '1944-02-29' } }),
      artist('no-span', { born: { date: '1939-04-02' } }),
      artist('no-date', { born: { placeId: 'detroit' } }),
    ];
    const rows = rowsOf({ artists, asOfYear: 2026 }, 'impossible-years');
    expect(rows.map((r) => [r.id, r.severity, r.path, r.message])).toEqual([
      [
        'artist:born-late',
        'warning',
        'born.date',
        'Born in 1960, after its first year active, 1957.',
      ],
      [
        'artist:formed-late',
        'warning',
        'born.date',
        'Formed in 1970, after its first year active, 1965.',
      ],
      [
        'artist:no-such-day',
        'warning',
        'born.date',
        "Its birth date is '1939-02-30', which is not a date the calendar has.",
      ],
      // The API's pattern refuses these, so they are said as it says them.
      [
        'artist:no-such-month',
        'warning',
        'born.date',
        'Its birth date is "1939-13", which is not written as a date: a year, a year and month, or a full date (1939, 1939-04, 1939-04-02).',
      ],
      [
        'artist:not-written',
        'warning',
        'born.date',
        'Its birth date is "1939-4-2", which is not written as a date: a year, a year and month, or a full date (1939, 1939-04, 1939-04-02).',
      ],
      [
        'artist:padded',
        'warning',
        'born.date',
        'Its birth date is " 1939", which is not written as a date: a year, a year and month, or a full date (1939, 1939-04, 1939-04-02).',
      ],
      [
        'artist:to-come',
        'warning',
        'born.date',
        'Born in 2031, a year still to come (it is 2026).',
      ],
      [
        'artist:year-zero',
        'warning',
        'born.date',
        "Its birth date is '0000', which is not a date the calendar has.",
      ],
    ]);
    expect(rows.every((r) => r.fix?.path === 'born.date')).toBe(true);
    // A birth still to come needs the snapshot's year to be seen.
    expect(
      rowsOf({ artists }, 'impossible-years').map((r) => r.id),
    ).not.toContain('artist:to-come');
  });

  it('reads a record with members as a group, and asks for the flag', () => {
    const snapshot: GraphSnapshot = {
      artists: [
        // Members, no flag: a group to the graph, so its birthplace is
        // noted as a group's is, and its Born is a forming.
        artist('toto', {
          members: [{ artistId: 'jeff-porcaro' }, { artistId: 'david-paich' }],
          born: { date: '1977', placeId: 'los-angeles' },
          activeFrom: 1976,
        }),
        artist('jeff-porcaro'),
        artist('david-paich'),
        // Marked, or with no members: nothing to say.
        artist('flagged', {
          group: true,
          members: [{ artistId: 'david-paich' }],
        }),
        artist('empty', { members: [] }),
      ],
      places: CITIES.filter((c) => c.id === 'los-angeles'),
      asOfYear: 2026,
    };
    const rows = rowsOf(snapshot, 'conflicting-owners');
    expect(rows.map((r) => [r.id, r.severity, r.path, r.fix?.path])).toEqual([
      ['artist:toto', 'info', 'born.placeId', 'basedInPlaceId'],
      ['artist:toto', 'info', 'group', 'group'],
    ]);
    expect(rows[1].message).toBe(
      'It lists 2 members but is not marked a group, so the graph reads it as one: its Born is the year it formed, and a birthplace on it is not read.',
    );
    expect(rowsOf(snapshot, 'impossible-years').map((r) => r.message)).toEqual([
      'Formed in 1977, after its first year active, 1976.',
    ]);
  });

  it("notes a group's birthplace, which the graph reads as nothing", () => {
    const snapshot: GraphSnapshot = {
      artists: [
        artist('no-city', {
          group: true,
          born: { date: '1959', placeId: 'detroit' },
        }),
        artist('same-city', {
          group: true,
          born: { placeId: 'detroit' },
          basedInPlaceId: 'detroit',
        }),
        artist('other-city', {
          group: true,
          born: { placeId: 'detroit' },
          basedInPlaceId: 'los-angeles',
        }),
        // A person's birthplace is theirs; a malformed one is its own row.
        artist('a-person', { born: { placeId: 'detroit' } }),
        artist('malformed', { group: true, born: { placeId: 'Detroit' } }),
      ],
      places: CITIES.filter((c) => ['detroit', 'los-angeles'].includes(c.id)),
    };
    const rows = rowsOf(snapshot, 'conflicting-owners');
    expect(rows.map(shape)).toEqual([
      {
        check: 'conflicting-owners',
        severity: 'info',
        kind: 'artist',
        id: 'artist:no-city',
        path: 'born.placeId',
        fix: { kind: 'artist', id: 'artist:no-city', path: 'basedInPlaceId' },
        related: ['place:detroit'],
      },
      {
        check: 'conflicting-owners',
        severity: 'info',
        kind: 'artist',
        id: 'artist:other-city',
        path: 'born.placeId',
        fix: { kind: 'artist', id: 'artist:other-city', path: 'born.placeId' },
        related: ['place:detroit', 'place:los-angeles'],
      },
      {
        check: 'conflicting-owners',
        severity: 'info',
        kind: 'artist',
        id: 'artist:same-city',
        path: 'born.placeId',
        fix: { kind: 'artist', id: 'artist:same-city', path: 'born.placeId' },
        related: ['place:detroit'],
      },
    ]);
    expect(rows.map((r) => r.message)).toEqual([
      expect.stringContaining('It has no City'),
      expect.stringContaining('Its City is place:los-angeles.'),
      expect.stringContaining('Its City says the same'),
    ]);
    // The group's birthplace draws nothing, the person's draws their birth.
    const graph = buildGraph(snapshot);
    expect(
      graph.edges
        .filter((e) => e.kind === 'born_in')
        .map((e) => `${e.from} ${e.to}`),
    ).toEqual(['artist:a-person place:detroit']);
    expect(
      rowsOf(snapshot, 'malformed').map((r) => [r.id, r.path]),
    ).toContainEqual(['artist:malformed', 'born.placeId']);
  });

  it("flags a song's label id that its records overrule", () => {
    const snapshot: GraphSnapshot = {
      songs: [
        song('other_label', {
          releases: [{ releaseId: 'toto-toto-iv' }],
          session: { label: 'Tamla', labelId: 'tamla' },
        }),
        song('same_label', {
          releases: [{ releaseId: 'toto-toto-iv' }],
          session: { labelId: 'columbia' },
        }),
        song('unlabelled_record', {
          releases: [{ releaseId: 'a-record-with-no-label' }],
          session: { labelId: 'columbia' },
        }),
        // No record: the session's label id is the song's label.
        song('no_record', { session: { labelId: 'tamla' } }),
      ],
      releases: [
        {
          slug: 'toto-toto-iv',
          title: 'Toto IV',
          artistIds: ['toto'],
          format: 'album',
          labelId: 'columbia',
        },
        {
          slug: 'a-record-with-no-label',
          title: 'A Record',
          artistIds: ['toto'],
          format: 'album',
        },
      ],
      labels: [
        { slug: 'columbia', name: 'Columbia' },
        { slug: 'tamla', name: 'Tamla' },
      ],
    };
    const rows = rowsOf(snapshot, 'conflicting-owners');
    expect(rows.map((r) => [r.id, r.severity, r.path])).toEqual([
      ['song:other_label', 'warning', 'session.labelId'],
      ['song:unlabelled_record', 'info', 'session.labelId'],
    ]);
    expect(rows[0].message).toBe(
      'Its session names label:tamla, but its records (release:toto-toto-iv) are on label:columbia. A song on a record takes its label from the record, so label:tamla is not read.',
    );
    expect(rows[0].related).toEqual([
      'label:tamla',
      'label:columbia',
      'release:toto-toto-iv',
    ]);
    expect(rows[1].message).toContain('these name none');
  });
});

describe('artist influence the globe already states', () => {
  const songs = [
    song('by_b', { origin: { artistGlobeId: 'b' } }),
    song('by_a', { artist: 'A' }),
  ];

  it('flags an influencedBy that an arc between their songs restates', () => {
    const rows = rowsOf(
      {
        songs,
        artists: [
          artist('a', { name: 'A', influencedBy: [{ artistId: 'b' }] }),
          artist('b'),
        ],
        influenceArcs: [{ from: 'song-by_b', to: 'song-by_a' }],
      },
      'restated-influence',
    );
    expect(rows.map(shape)).toEqual([
      {
        check: 'restated-influence',
        severity: 'info',
        kind: 'artist',
        id: 'artist:a',
        path: 'influencedBy[].artistId',
        fix: {
          kind: 'artist',
          id: 'artist:a',
          path: 'influencedBy[].artistId',
        },
        related: ['artist:b'],
      },
    ]);
    expect(rows[0].message).toContain('song:by_b → song:by_a');
  });

  it('leaves an influence the arcs do not state', () => {
    expect(
      rowsOf(
        {
          songs,
          artists: [artist('a', { influencedBy: [{ artistId: 'b' }] })],
          // The other way round: A's song influenced B's.
          influenceArcs: [{ from: 'song-by_a', to: 'song-by_b' }],
        },
        'restated-influence',
      ),
    ).toEqual([]);
  });

  it("reaches arcs between the globe's own events through what they are about", () => {
    const snapshot: GraphSnapshot = {
      artists: [
        artist('a', { name: 'A', influencedBy: [{ artistId: 'b' }] }),
        artist('b'),
      ],
      events: [
        { id: 'evt-b-live', title: 'B live' },
        { id: 'evt-a-debut', title: 'A debut' },
      ],
      influenceArcs: [{ from: 'evt-b-live', to: 'evt-a-debut' }],
    };
    const restated = (report: ReturnType<typeof checkIntegrity>) =>
      report.rows.filter((r) => r.check === 'restated-influence');
    // With nothing saying who the events are about, nothing is restated.
    expect(restated(checkIntegrity(snapshot))).toEqual([]);
    // One event's artist guessed from its title, the other's stored.
    const attributed: GraphSnapshot = {
      ...snapshot,
      events: [
        { id: 'evt-b-live', title: 'B live' },
        { id: 'evt-a-debut', title: 'A debut', artistIds: ['a'] },
      ],
      eventMatches: new Map([
        [
          'evt-b-live',
          { artists: [{ artistId: 'b', path: 'title' }], songs: [] },
        ],
      ]),
    };
    const rows = restated(checkIntegrity(attributed));
    expect(rows.map((r) => [r.id, r.fix?.path, r.related])).toEqual([
      ['artist:a', 'influencedBy[].artistId', ['artist:b']],
    ]);
    expect(rows[0].message).toContain('event:evt-b-live → event:evt-a-debut');
  });
});

describe('draft references and unverified claims', () => {
  it('flags published content that names a draft', () => {
    const rows = rowsOf(
      {
        artists: [
          artist('toto', { labelIds: ['columbia'] }),
          artist('journey', { labelIds: ['columbia'] }),
        ],
        labels: [{ slug: 'columbia', name: 'Columbia' }],
        statuses: new Map<EntityId, ItemStatus>([
          ['artist:toto', 'published'],
          ['artist:journey', 'draft'],
          ['label:columbia', 'draft'],
        ]),
      },
      'draft-reference',
    );
    expect(rows.map((r) => [r.id, r.path, r.related])).toEqual([
      ['artist:toto', 'labelIds[]', ['label:columbia']],
    ]);
  });

  it('files a draft once per field that names it, and never on the instrument beside it', () => {
    const rows = rowsOf(
      {
        songs: [
          song('s', {
            credits: [
              {
                name: 'X',
                artistGlobeId: 'x',
                role: 'performer',
                instrument: 'electric-bass',
              },
              { name: 'X', artistGlobeId: 'x', role: 'producer' },
            ],
          }),
        ],
        artists: [artist('x')],
        statuses: new Map<EntityId, ItemStatus>([
          ['song:s', 'published'],
          ['artist:x', 'draft'],
        ]),
      },
      'draft-reference',
    );
    expect(rows.map((r) => [r.id, r.path, r.related])).toEqual([
      ['song:s', 'credits[].artistGlobeId', ['artist:x']],
    ]);
  });

  it('lists unconfirmed records and connections, and counts them', () => {
    const report = checkIntegrity({
      artists: [
        artist('toto', { unverified: true, labelIds: ['columbia'] }),
        artist('journey', {
          labelIds: ['columbia'],
          influencedBy: [{ artistId: 'toto', unverified: true, source: 'x' }],
        }),
      ],
      labels: [{ slug: 'columbia', name: 'Columbia' }],
    });
    const rows = report.rows.filter((r) => r.check === 'unverified');
    expect(rows.map((r) => [r.id, r.path])).toEqual([
      ['artist:journey', 'influencedBy[].artistId'],
      ['artist:toto', undefined],
      ['artist:toto', 'labelIds[]'],
    ]);
    expect(rows[0].message).toContain('(source: x)');
    expect(report.unverified).toEqual({ nodes: 1, edges: 2 });
  });
});

describe('the report', () => {
  it('puts errors first, then warnings, then hints, and counts every check', () => {
    const report = checkIntegrity({
      artists: [
        artist('toto', { labelIds: ['nobody'] }),
        artist('temptations', { name: 'Temptations' }),
        artist('the-temptations', { name: 'The Temptations' }),
      ],
    });
    const severities = report.rows.map((r) => r.severity);
    expect(severities).toEqual(
      [...severities].sort(
        (a, b) =>
          ['error', 'warning', 'info'].indexOf(a) -
          ['error', 'warning', 'info'].indexOf(b),
      ),
    );
    expect(Object.keys(report.counts)).toEqual([...INTEGRITY_CHECKS]);
    expect(Object.values(report.counts).reduce((sum, n) => sum + n, 0)).toBe(
      report.rows.length,
    );
    expect(report.counts).toMatchObject({
      dangling: 1,
      duplicate: 1,
      orphan: 2,
    });
  });

  it('breaks ties by code unit, the same for every viewer whatever their locale', () => {
    const rows = rowsOf(
      {
        songs: [
          song('s', {
            credits: [
              { name: 'Émile', role: 'performer' },
              { name: 'Zed', role: 'performer' },
            ],
          }),
        ],
      },
      'unresolved',
    );
    // Same severity, check, node and field: the messages decide. A locale
    // collation would put 'É' with the E's; by code unit it follows 'Z'.
    expect(rows.map((r) => r.related)).toEqual([
      ['artist:zed'],
      ['artist:emile'],
    ]);
  });

  it('names only nodes the graph has, even for values it could not place', () => {
    const snapshot: GraphSnapshot = {
      songs: [
        // A malformed lead act beside the billing that spells it right.
        song('s', {
          origin: { artistGlobeId: 'Toto' },
          credits: [
            {
              name: 'Toto',
              role: 'vocals',
              primary: true,
              artistGlobeId: 'toto',
            },
          ],
        }),
        // A lead act the billing leaves out, and a globe ref to nobody.
        song('t', {
          origin: { artistGlobeId: 'journey' },
          credits: [
            {
              name: 'Bobby',
              role: 'vocals',
              primary: true,
              artistGlobeId: 'bobby',
            },
          ],
          contentRefs: [globeRef('nobody')],
        }),
      ],
      artists: [artist('toto')],
      events: [{ id: 'evt-ok', title: 'OK' }],
      // An arc from an event id no list defines, and could not.
      influenceArcs: [{ from: 'evt-Bad', to: 'evt-ok' }],
    };
    const graph = buildGraph(snapshot);
    const { rows } = checkIntegrity(snapshot, graph);
    expect(rows.map((r) => r.check)).toEqual(
      expect.arrayContaining(['malformed', 'dangling', 'conflicting-owners']),
    );
    for (const row of rows) {
      expect(graph.nodes.has(row.id), row.id).toBe(true);
      for (const id of row.related ?? []) {
        expect(graph.nodes.has(id), `${row.id} → ${id}`).toBe(true);
      }
    }
    // The arc's row is about the end the map can show, fixed where it is filed.
    expect(rows.find((r) => r.path === INFLUENCE_ARC_PATH)).toMatchObject({
      check: 'malformed',
      id: 'event:evt-ok',
      fix: { id: 'event:evt-Bad', path: INFLUENCE_ARC_PATH },
    });
    // The wrong lead act is still flagged, with the ids it compared.
    expect(rows.find((r) => r.check === 'conflicting-owners')).toMatchObject({
      id: 'song:t',
      related: ['artist:journey', 'artist:bobby'],
    });
  });
});

describe('coverage', () => {
  const credit = (name: string, artistGlobeId?: string) => ({
    name,
    role: 'performer' as const,
    ...(artistGlobeId ? { artistGlobeId } : {}),
  });
  const row = (rows: CoverageRow[], kind: string, path: string) =>
    rows.find((r) => r.kind === kind && r.path === path);

  it('counts each field linked by id or only guessed from text', () => {
    const { coverage } = checkIntegrity({
      songs: [
        song('linked', {
          artist: 'Toto',
          origin: { artistGlobeId: 'toto' },
          credits: [credit('Jeff Porcaro', 'jeff-porcaro')],
        }),
        song('partly', {
          artist: 'Toto',
          credits: [
            credit('Jeff Porcaro', 'jeff-porcaro'),
            credit('David Paich'),
            credit('  '),
          ],
          session: { studio: 'Sunset Sound' },
        }),
        song('bare', { artist: 'Journey' }),
      ],
    });
    expect(row(coverage, 'song', 'credits[].artistGlobeId')).toEqual({
      kind: 'song',
      path: 'credits[].artistGlobeId',
      target: 'artist',
      legacyPaths: ['credits[].name'],
      items: 3,
      set: 2,
      linked: 1,
      inferred: 1,
      values: { linked: 2, inferred: 1 },
    });
    // The lead act, linked on one song, the display line alone on two.
    expect(row(coverage, 'song', 'origin.artistGlobeId')).toMatchObject({
      legacyPaths: ['artist'],
      set: 3,
      linked: 1,
      inferred: 2,
    });
    // The studio written as text is a guess until the session stores its id.
    expect(row(coverage, 'song', 'session.studioId')).toMatchObject({
      legacyPaths: ['session.studio'],
      set: 1,
      linked: 0,
      inferred: 1,
    });
    // A text field with no id field is all guesses.
    expect(row(coverage, 'song', 'composer')).toMatchObject({
      legacyPaths: [],
      set: 0,
    });
    // Record kinds with no records yet still get their rows.
    expect(row(coverage, 'label', 'parentLabelId')).toMatchObject({
      items: 0,
      set: 0,
    });
  });

  it('does not count a billing line that names no artist as a guess to link', () => {
    const { coverage } = checkIntegrity({
      songs: [
        song('auld_lang_syne', { artist: 'Traditional' }),
        song('mixtape', { artist: 'Various Artists' }),
        song('africa', { artist: 'Toto' }),
      ],
    });
    expect(row(coverage, 'song', 'origin.artistGlobeId')).toMatchObject({
      items: 3,
      set: 1,
      linked: 0,
      inferred: 1,
      values: { linked: 0, inferred: 1 },
    });
  });

  it("counts a globe event's own fields, and only a hand-authored event's", () => {
    const at = { lat: 0, lng: 0, city: 'Detroit', country: 'US' };
    const snapshot: GraphSnapshot = {
      events: [
        {
          id: 'evt-a',
          title: 'Toto release "Africa"',
          location: at,
          genre: ['Soft Rock', 'Not A Genre'],
          tags: ['toto', 'africa', 'rock'],
        },
        {
          id: 'evt-b',
          title: 'Nobody in particular',
          // A city the registry cannot place.
          location: { ...at, city: 'Slab Fork' },
          genre: ['World Music'],
          tags: ['nobody'],
        },
        // A song's event is its song: none of its fields are the event's.
        { id: 'song-africa', title: 'Africa — Toto', genre: ['Rock'] },
      ],
      eventMatches: new Map([
        [
          'evt-a',
          {
            artists: [
              { artistId: 'toto', path: 'tags[]' as const },
              { artistId: 'toto', path: 'title' as const },
            ],
            songs: [{ songId: 'africa', path: 'title' as const }],
          },
        ],
        ['evt-b', { artists: [], songs: [] }],
      ]),
    };
    const { coverage } = checkIntegrity(snapshot);
    // The title and tags state only what the matcher found in them.
    expect(row(coverage, 'globe_event', 'title')).toMatchObject({
      items: 2,
      set: 1,
      linked: 0,
      inferred: 1,
      values: { linked: 0, inferred: 2 },
    });
    expect(row(coverage, 'globe_event', 'tags[]')).toMatchObject({
      set: 1,
      inferred: 1,
      values: { linked: 0, inferred: 1 },
    });
    // A genre string the table resolves is linked; one it does not know
    // states nothing, and is no guess to link either.
    expect(row(coverage, 'globe_event', 'genre[]')).toMatchObject({
      items: 2,
      set: 1,
      linked: 1,
      inferred: 0,
      values: { linked: 1, inferred: 0 },
    });
    // The city as written is a guess until the event stores its place, but
    // only where the graph draws one: a city it cannot place states nothing.
    expect(row(coverage, 'globe_event', 'placeId')).toMatchObject({
      legacyPaths: ['location.city'],
      items: 2,
      set: 1,
      linked: 0,
      inferred: 1,
    });
    // Nor is the city a guess once the event stores its place, or a match
    // once the event stores who and what it is about.
    const stored = checkIntegrity({
      ...snapshot,
      events: [
        {
          ...snapshot.events![0],
          placeId: 'detroit',
          artistIds: [],
          songIds: ['africa'],
        },
      ],
    }).coverage;
    expect(row(stored, 'globe_event', 'placeId')).toMatchObject({
      items: 1,
      set: 1,
      linked: 1,
      inferred: 0,
    });
    expect(row(stored, 'globe_event', 'title')).toMatchObject({ set: 0 });
    expect(row(stored, 'globe_event', 'tags[]')).toMatchObject({ set: 0 });
    // The stored lists are rows of their own: `songIds` links one song, and
    // `[]` answers "about no one", which leaves nothing to link.
    expect(row(stored, 'globe_event', 'songIds[]')).toMatchObject({
      set: 1,
      linked: 1,
    });
    expect(row(stored, 'globe_event', 'artistIds[]')).toMatchObject({
      set: 0,
    });
  });

  it("counts a song's session text on its id's row, and a label beside records as no guess", () => {
    const { coverage } = checkIntegrity({
      songs: [
        song('linked', {
          session: {
            studio: 'Sunset Sound',
            studioId: 'sunset-sound',
            label: 'Columbia',
            labelId: 'columbia',
            city: 'Los Angeles',
            placeId: 'los-angeles',
          },
        }),
        // An id with no text beside it is linked all the same (C20).
        song('ids_only', {
          session: { studioId: 'sunset-sound', placeId: 'los-angeles' },
        }),
        song('text_only', {
          session: { studio: 'Sunset Sound', label: 'Columbia', city: 'LA' },
        }),
        // On a record, the song's label is the record's: the text is no guess.
        song('on_a_record', {
          releases: [{ releaseId: 'toto-toto-iv' }],
          session: { label: 'Columbia' },
        }),
      ],
    });
    expect(row(coverage, 'song', 'session.studioId')).toMatchObject({
      legacyPaths: ['session.studio'],
      set: 3,
      linked: 2,
      inferred: 1,
    });
    expect(row(coverage, 'song', 'session.placeId')).toMatchObject({
      legacyPaths: ['session.city'],
      set: 3,
      linked: 2,
      inferred: 1,
    });
    expect(row(coverage, 'song', 'session.labelId')).toMatchObject({
      legacyPaths: ['session.label'],
      set: 2,
      linked: 1,
      inferred: 1,
    });
    expect(row(coverage, 'song', 'releases[].releaseId')).toMatchObject({
      set: 1,
      linked: 1,
    });
  });

  it('never holds display text read through a table to the id grammar', () => {
    const rows = allRows({
      places: [
        {
          ...CITIES.find((c) => c.id === 'detroit')!,
          genres: ['Motown', 'Not A Genre'],
        },
      ],
      events: [{ id: 'evt-x', genre: ['Hip Hop', 'Delta Blues'] }],
    });
    expect(rows.map((r) => `${r.check} ${r.id} ${r.path ?? ''}`)).toEqual([]);
  });

  it("reads an act's song pins as guesses about the artist, never as errors", () => {
    const snapshot: GraphSnapshot = {
      artists: [artist('marvin-gaye', { name: 'Marvin Gaye' })],
      places: CITIES.filter((c) => ['detroit', 'los-angeles'].includes(c.id)),
      artistLocations: [
        { id: 'marvin gaye', city: 'Detroit', country: 'US' },
        // No artist record: the pin states nothing the graph can draw, so
        // coverage does not count it as a guess either.
        { id: 'toto', city: 'Los Angeles', country: 'US' },
      ],
    };
    const report = checkIntegrity(snapshot);
    expect(row(report.coverage, 'artist_location', 'city')).toMatchObject({
      items: 2,
      set: 1,
      inferred: 1,
    });
    // Nor does a pin for an act with a City of its own, which it no longer
    // stands in for.
    const withCity = checkIntegrity({
      ...snapshot,
      artists: [
        artist('marvin-gaye', {
          name: 'Marvin Gaye',
          basedInPlaceId: 'detroit',
        }),
      ],
    });
    expect(row(withCity.coverage, 'artist_location', 'city')).toMatchObject({
      items: 2,
      set: 0,
    });
    expect(allRows(snapshot)).toEqual([]);
    // The pin connects the artist, so it is not listed as unconnected.
    expect(
      report.rows.filter((r) => r.check === 'orphan').map((r) => r.id),
    ).toEqual([]);
  });

  it('gives every REF_PATHS path exactly one home', () => {
    const { coverage } = checkIntegrity({});
    const counted = coverage.flatMap((r) =>
      [r.path, ...r.legacyPaths].map((p) => `${r.kind}|${p}`),
    );
    expect([...counted].sort()).toEqual(
      REF_PATHS.map((r) => `${r.kind}|${r.path}`).sort(),
    );
  });

  it('pairs each text field with an id field REF_PATHS declares', () => {
    const declared = (kind: string, path: string) =>
      REF_PATHS.find((r) => r.kind === kind && r.path === path);
    for (const [key, idPath] of Object.entries(LINKED_BY)) {
      const [kind, textPath] = key.split('|');
      const text = declared(kind, textPath);
      const id = declared(kind, idPath);
      expect(text?.legacy, key).toBe(true);
      expect(id, `${kind}|${idPath}`).toBeDefined();
      expect(id?.legacy, `${kind}|${idPath}`).toBeUndefined();
      expect(id?.target, key).toBe(text?.target);
    }
  });

  it('knows where every content kind lives in a snapshot', () => {
    const kinds = new Set(REF_PATHS.map((r) => r.kind));
    expect(Object.keys(CONTENT_KINDS).sort()).toEqual([...kinds].sort());
  });
});

describe('integrity on the repo data', () => {
  const units = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  const songs = Object.values(BUNDLED_SONGS);
  // What the console's loader passes (repoSnapshot.ts): the roster and the
  // cities composed with the console's records in src/content/data (every
  // artist and place off the globe, the releases, studios and labels), the
  // song pins as `artist_location` items, the instrument table, the year and
  // the matches. The records were all but empty until the bulk import of 30
  // September 2026; since then the songs' credits, records and studios name
  // them, so without them every such link would read as dangling. JSON
  // modules type only what their values show, so they are cast as the
  // loader casts them.
  const lists: GraphSnapshot = {
    songs,
    progressions: LIB,
    artists: composeArtists(
      ARTIST_REGISTRY,
      ARTIST_ROWS as unknown as readonly ArtistRow[],
    ),
    releases: RELEASE_ROWS as unknown as readonly ReleaseRecord[],
    studios: STUDIO_ROWS as unknown as readonly StudioRecord[],
    labels: LABEL_ROWS as unknown as readonly LabelRecord[],
    places: composePlaces(
      CITIES,
      PLACE_ROWS as unknown as readonly PlaceRecord[],
    ),
    events: BUNDLED_MUSIC_HISTORY,
    artistLocations: Object.entries(ARTIST_LOCATIONS).map(([id, pin]) => ({
      id,
      ...pin,
    })),
    dayStubs: units.flatMap((u) => u.dayStubs),
    pathways: HISTORICAL_MODULES,
    influenceArcs: allConnections(),
    instrumentGenres: INSTRUMENT_GENRES,
    asOfYear: 2026,
  };
  const snapshot = { ...lists, eventMatches: matchSnapshotEvents(lists) };
  const graph = buildGraph(snapshot);
  const started = performance.now();
  const report = checkIntegrity(snapshot, graph);
  const elapsed = performance.now() - started;

  it('runs well inside the page budget', () => {
    expect(elapsed).toBeLessThan(2000);
  });

  it('counts credits on the songs that have them, every one an artist of its own or a name', () => {
    // Four researched songs had credits, all by name only (set 4, linked 0,
    // inferred 4), until the bulk import of 30 September 2026 credited 561
    // songs that had none. 566 now hold credits: on 170 every credit links
    // to an artist, and on the other 396 at least one is a name only (a
    // session player with no record), which the graph matches by name.
    const credits = report.coverage.find(
      (r) => r.kind === 'song' && r.path === 'credits[].artistGlobeId',
    );
    expect(credits).toMatchObject({
      items: songs.length,
      set: 566,
      linked: 170,
      inferred: 396,
    });
  });

  it('keeps traditional songs off the lead-act worklist', () => {
    const lead = report.coverage.find(
      (r) => r.kind === 'song' && r.path === 'origin.artistGlobeId',
    );
    const traditional = songs.filter((s) => s.artist === 'Traditional');
    expect(traditional.length).toBeGreaterThan(0);
    expect(lead!.items - lead!.set).toBeGreaterThanOrEqual(traditional.length);
  });

  it('surfaces the globe events whose songs the library lacks', () => {
    // None is an error. The one there was, the BBC live Valerie (a globe
    // event with influence arcs and no chart of its own), is the song
    // valerie now: songEventAliases.ts folds it there (the owner's call,
    // 30 Sep 2026).
    expect(
      report.rows
        .filter((r) => r.severity === 'error')
        .map((r) => `${r.check} ${r.id}`),
    ).toEqual([]);
    expect(
      report.rows
        .filter((r) => r.check === 'dangling' && r.severity === 'warning')
        .map((r) => r.id),
    ).toEqual(['song:thank_you', 'song:this_must_be_the_place']);
  });

  it('lists as unconnected only what nothing in the repo reaches', () => {
    // Every hand-authored event has its year at least, and all but two
    // artists a song, event or song pin. What is left: progressions no song
    // uses, the one registry entry nothing names (a placeholder), and the
    // joint billing "Michael Jackson and Justin Timberlake": its one song,
    // Love Never Felt So Good, has credited both acts by their own records
    // since the bulk import of 30 September 2026, so no guess from the
    // billing reaches it. The import's song links on progressions took the
    // unused ones from 102 to 99, and every artist it made is credited on a
    // song. (Six artists until the owner's duplicate merge of 30 Sep 2026
    // removed the misspellings, the twin, the billing and "CCR", a short
    // form of Creedence Clearwater Revival.)
    const orphans = report.rows.filter((r) => r.check === 'orphan');
    const byKind: Record<string, number> = {};
    for (const r of orphans) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    expect(byKind).toEqual({ artist: 2, progression: 99 });
    expect(orphans.filter((r) => r.kind === 'artist').map((r) => r.id)).toEqual(
      ['artist:michael-jackson-and-justin-timberlake', 'artist:unknown-artist'],
    );
  });

  it('finds where an artist states a City its song pins do not, and no career too long', () => {
    // None until the bulk import of 30 September 2026 stated a City on 332
    // artists. Fourteen differ from the city their song pins sit in (Toto in
    // Van Nuys, pinned in Los Angeles; Parliament in Plainfield, pinned in
    // Newark). Both can be true; the students' globe keeps reading the pins.
    const disagreeing = report.rows.filter(
      (r) => r.check === 'conflicting-owners',
    );
    expect(disagreeing).toHaveLength(14);
    expect(
      disagreeing.every(
        (r) => r.kind === 'artist' && r.path === 'basedInPlaceId',
      ),
    ).toBe(true);
    // The import also gave two composers the year their career began and no
    // end, so they read as active to this day; its review gave them the
    // years they died (Handel 1759, Palestrina 1594), and none is left.
    expect(
      report.rows
        .filter((r) => r.check === 'impossible-years')
        .map((r) => `${r.id} ${r.path}`),
    ).toEqual([]);
  });

  it("counts an event's subjects from what the matcher found, and its genres as linked", () => {
    // The matcher's finds count on the title or the tags only for an event
    // that stores no artists of its own. The bulk import of 30 September
    // 2026 stored them on 693 events (title 602 and tags 685 before), which
    // leaves three titles and two tag lists as the guess.
    const events = (path: string) =>
      report.coverage.find((r) => r.kind === 'globe_event' && r.path === path);
    expect(events('artistIds[]')).toMatchObject({
      items: 1083,
      set: 693,
      linked: 693,
    });
    expect(events('title')).toMatchObject({ items: 1083, set: 3 });
    expect(events('tags[]')).toMatchObject({ items: 1083, set: 2 });
    expect(events('genre[]')).toMatchObject({
      set: 1071,
      linked: 1071,
      inferred: 0,
    });
  });

  it('counts as guesses only the cities and song pins the graph draws', () => {
    // Every event stores its place since the bulk import of 30 September
    // 2026, so no city is a guess. (Before it none did: 149 events named a
    // city the registry could not place, and the other 934 were counted as
    // the guess on `placeId`'s row.)
    const city = report.coverage.find(
      (r) => r.kind === 'globe_event' && r.path === 'placeId',
    );
    expect(city).toMatchObject({
      legacyPaths: ['location.city'],
      items: 1083,
      set: 1083,
      linked: 1083,
      inferred: 0,
    });
    // 113 pins name a city it cannot place, or an act with no record. (362
    // pins and 244 drawn until the owner's duplicate merge of 30 Sep 2026
    // removed thirteen: twelve under a removed spelling, eleven of them in
    // the same city as the act's own and Joe Legend's Ottawa beside John
    // Legend's Springfield, and Remind In Light's, which repeated Talking
    // Heads'. Andy Grammer's pin, filed under a misspelling, is drawn now
    // that it is keyed by his name.)
    // The graph draws a pin only for an act that states no City of its own;
    // the bulk import of 30 September 2026 stated one on 332 acts, which
    // leaves 58 drawn (236 before). The students' globe draws every pin, as
    // before: it reads artistLocations.json, which the import never touches.
    const pins = report.coverage.find(
      (r) => r.kind === 'artist_location' && r.path === 'city',
    );
    expect(pins).toMatchObject({ items: 349, set: 58, inferred: 58 });
  });

  it('finds the registry look-alikes a person should review', () => {
    // Since the owner's duplicate merge (30 Sep 2026) every one left among
    // the roster's acts is two acts, kept apart on purpose: a joint billing
    // beside its halves, or two names a letter or two apart. The
    // misspellings and the acts held with and without "The" are gone, their
    // tags and titles moved to the name kept (the fixtures above still pin
    // how a misspelling is paired). Six pairs until the bulk import of 30
    // September 2026 made 1,022 artists, 133 labels and 105 studios; the 31
    // pairs it added are two people or places of one name, told apart by
    // their slugs (two Mick Joneses, the Record Plants in Sausalito and Los
    // Angeles, A&R Recording's two New York rooms, by their years; the review
    // re-slugged those studios, whose slugs ended in an outside id's first
    // characters), and names a letter or
    // two apart (Paul Simon and Paul Simonon). The records hold each pair
    // as two; the list is pinned so a new one is seen.
    const pairs = report.rows
      .filter((r) => r.check === 'duplicate')
      .map((r) => [r.id, ...(r.related ?? [])].sort().join(' '));
    expect(pairs).toEqual([
      'artist:alicia-keys artist:alicia-keys-and-justin-timberlake artist:justin-timberlake',
      'artist:justin-timberlake artist:michael-jackson artist:michael-jackson-and-justin-timberlake',
      'artist:mick-jones-foreigner-spooky-tooth-worked-in-france artist:mick-jones-the-clash-big-audio-dynamite',
      'artist:paul-williams-member-of-the-temptations artist:paul-williams-us-songwriter-soft-rock-vocalist',
      'artist:ryan-mcmahon-canadian-singer-songwriter artist:ryan-mcmahon-la-based-producer-and-songwriter',
      'artist:steve-smith-70s-producer-engineer-mainly-island-records artist:steve-smith-us-drummer-most-associated-with-journey',
      'studio:a-r-recording-studio-1958-1967 studio:a-r-recording-studio-1958-1989',
      'studio:the-record-plant-los-angeles studio:the-record-plant-sausalito',
      'artist:carl-smith artist:curt-smith',
      'artist:chet-baker artist:chet-faker',
      'artist:david-porter artist:david-prater',
      'artist:don-law artist:don-was',
      'artist:j-cole artist:jj-cale',
      'artist:jill-scott artist:jim-scott',
      'artist:al-green artist:karl-green',
      'artist:ed-townsend artist:lee-townsend',
      'artist:mike-stock artist:mike-stone',
      'artist:nick-mason artist:nick-monson',
      'artist:boris-williams artist:otis-williams',
      'artist:paul-simon artist:paul-simonon',
      'artist:peter-tork artist:peter-tosh',
      'artist:rebelution artist:the-revolution',
      'artist:redbone artist:redone',
      'artist:robert-palmer artist:robert-waller',
      'artist:sam-cooke artist:sam-moore',
      'artist:al-stone artist:sly-stone',
      'artist:steve-lacy artist:steve-mac',
      'artist:hanson artist:tansen',
      'artist:the-beatles artist:the-eagles',
      'artist:toby-keith artist:toby-smith',
      'artist:bob-johnston artist:tom-johnston',
      'label:abc-records label:atco-records',
      'label:djm-records label:j-records',
      'label:hi-records label:j-records',
      'label:djm-records label:mgm-records',
      'label:mca-records label:mgm-records',
      'studio:rca-studio-b studio:rca-studios',
    ]);
  });

  it("holds no act twice, with and without 'The'", () => {
    // One act split over two nodes, the songs on one and the events on the
    // other: ten were, until the merge, each now under its own billing.
    // Accepting event artists (checkpoint E) would write a split into stored
    // ids, so a new twin must not go unseen.
    const flagged = new Set<string>(
      report.rows
        .filter((r) => r.check === 'duplicate')
        .flatMap((r) => [r.id, ...(r.related ?? [])]),
    );
    const twins = [...flagged].filter(
      (id) =>
        id.startsWith('artist:the-') &&
        flagged.has(id.replace('artist:the-', 'artist:')),
    );
    expect(twins).toEqual([]);
  });

  it('names only nodes the graph has', () => {
    for (const row of report.rows) {
      expect(graph.nodes.has(row.id), row.id).toBe(true);
      for (const id of row.related ?? []) {
        expect(graph.nodes.has(id), `${row.id} → ${id}`).toBe(true);
      }
    }
  });
});
