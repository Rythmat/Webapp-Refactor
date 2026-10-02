import { describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type { Suggestion } from '@/content/suggestions/types';
import type { WikidataView } from '../artistFields';
import { emitArtifacts } from '../emit';
import {
  EXISTING_RECORDS,
  type ExistingRecord,
  existingRecordFor,
  existingSlugs,
} from '../existingRecords';
import type { MbAreaFull, MbArtist } from '../musicbrainz';
import { createPlaceBook } from '../placeMap';
import {
  assignRecordSlugs,
  assignReleaseSlugs,
  emptyLedger,
  ledgerJson,
  parseLedger,
  type SlugLedger,
} from '../recordSlugs';
import {
  emitSongArtifacts,
  manifestJson,
  strandedSongRows,
  withSongs,
} from '../songEmit';
import {
  planSongFetch,
  requerySet,
  type SongClients,
  type SongToFetch,
  walkSongs,
} from '../songFetch';
import { registryIndex } from '../songMatch';
import {
  GONE,
  type Looked,
  type MbLabel,
  type MbPlace,
  type MbRecordingFull,
  type MbRecordingSearch,
  type MbReleaseFull,
  type MbSearchRecording,
  type MbWork,
  placeLookupUrl,
  recordingLookupUrl,
  recordingNameSearchUrl,
  recordingSearchUrl,
  releaseLookupUrl,
  type SongMusicBrainz,
  wholePlaceOf,
  workLookupUrl,
} from '../songSources';
import { buildSongSuggestions } from '../songSuggestions';
import {
  artistRel,
  credit,
  fullRecording,
  id,
  MARVIN,
  pick,
  recording,
  release,
  song,
  TAMMI,
} from './songFixtures';

const DETROIT_AREA = id(700);
const HITSVILLE = id(600);
const TAMLA = id(500);
const MOTOWN_DISTRIBUTION = id(501);
const WORK = id(4000);
const TOWNSEND = id(21);
const HARRIS = id(11);

describe('the song requests', () => {
  it('search by title and the act’s id, a page at a time, and look up with what each needs', () => {
    expect(recordingSearchUrl("Let's Get It On", MARVIN)).toBe(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
        `recording:"Let's Get It On" AND arid:${MARVIN}`,
      )}&limit=100&fmt=json`,
    );
    expect(recordingSearchUrl('Say "Hi"', MARVIN, 100)).toContain(
      '&offset=100&fmt=json',
    );
    expect(
      decodeURIComponent(recordingNameSearchUrl('Sweet Dreams', 'Eurythmics')),
    ).toContain('recording:"Sweet Dreams" AND artist:"Eurythmics"');
    expect(recordingLookupUrl(id(1))).toBe(
      `https://musicbrainz.org/ws/2/recording/${id(1)}?inc=artist-credits+artist-rels+work-rels+place-rels&fmt=json`,
    );
    expect(workLookupUrl(id(1))).toContain('/work/');
    expect(releaseLookupUrl(id(1))).toContain(
      'inc=labels+release-groups+artist-rels+place-rels',
    );
    expect(placeLookupUrl(id(1))).toBe(
      `https://musicbrainz.org/ws/2/place/${id(1)}?inc=place-rels&fmt=json`,
    );
    // The act and its bands at once; one id keeps the one-id spelling.
    expect(recordingSearchUrl("Let's Get It On", [MARVIN])).toBe(
      recordingSearchUrl("Let's Get It On", MARVIN),
    );
    expect(
      decodeURIComponent(recordingSearchUrl('Bustin Loose', [MARVIN, TAMMI])),
    ).toContain(
      `recording:"Bustin Loose" AND (arid:${MARVIN} OR arid:${TAMMI})&limit=100`,
    );
    expect(() => recordingSearchUrl('x', 'marvin')).toThrow(
      /not a MusicBrainz id/,
    );
    for (const url of [
      recordingSearchUrl('x', MARVIN),
      recordingNameSearchUrl('x', 'y'),
    ])
      expect(url).not.toMatch(/@/);
  });
});

/** A fake MusicBrainz: answers from maps; a missing key is a dry-run miss (null). */
function fakeMb(answers: {
  searches?: Record<string, MbRecordingSearch>;
  recordings?: Record<string, MbRecordingFull | typeof GONE>;
  works?: Record<string, MbWork>;
  releases?: Record<string, MbReleaseFull>;
  labels?: Record<string, MbLabel>;
  places?: Record<string, MbPlace>;
  areas?: Record<string, MbAreaFull>;
  artists?: Record<string, MbArtist>;
}) {
  const calls: string[] = [];
  const from =
    <T>(kind: string, map: Record<string, T | typeof GONE> | undefined) =>
    async (key: string): Promise<Looked<T>> => {
      calls.push(`${kind} ${key}`);
      return map && key in map ? map[key] : null;
    };
  const songs: SongMusicBrainz = {
    searchRecordings: async (title, artist, offset = 0) => {
      calls.push(`search ${title} ${artist} ${offset}`);
      return answers.searches?.[`${title}|${artist}|${offset}`] ?? null;
    },
    searchRecordingsByName: async (title, name, offset = 0) => {
      calls.push(`name ${title} ${name} ${offset}`);
      return answers.searches?.[`${title}|${name}|${offset}`] ?? null;
    },
    lookupRecording: from('recording', answers.recordings),
    lookupWork: from('work', answers.works),
    lookupRelease: from('release', answers.releases),
    lookupLabel: from('label', answers.labels),
    lookupPlace: from('place', answers.places),
  };
  const clients: SongClients = {
    songs,
    mb: {
      lookupArea: async (key) => {
        calls.push(`area ${key}`);
        return answers.areas?.[key] ?? null;
      },
      lookupArtist: async (key) => answers.artists?.[key] ?? null,
    },
    wikidata: {
      getEntities: async () => new Map(),
      inHand: async () => new Map(),
    },
  };
  return { clients, calls };
}

const noWikidata: WikidataView = {
  item: () => undefined,
  place: () => undefined,
  label: () => null,
};

const searchOf = (...recordings: MbSearchRecording[]): MbRecordingSearch => ({
  count: recordings.length,
  offset: 0,
  recordings,
});

/** "Let's Get It On": the album, its label and studio, and who made it. */
function motown() {
  const album = release(5, {
    title: "Let's Get It On",
    date: '1973-08-28',
    track: '1',
  });
  const take = recording(1, {
    date: '1973-06-15',
    releases: [
      release(8, {
        title: "Let's Get It On",
        type: 'Single',
        date: '1973-06-15',
      }),
      album,
      release(9, {
        title: 'Anthology',
        secondary: ['Compilation'],
        date: '1974',
      }),
    ],
  });
  const second = recording(2, {
    title: 'Distant Lover',
    date: '1973-08-28',
    releases: [
      release(10, {
        title: "Let's Get It On",
        group: 5,
        date: '1973-08-28',
        track: '6',
      }),
    ],
  });
  const detroit = {
    id: DETROIT_AREA,
    name: 'Detroit',
    'iso-3166-2-codes': ['US-MI'],
  };
  return {
    take,
    second,
    answers: {
      searches: {
        [`Let's Get It On|${MARVIN}|0`]: searchOf(
          take,
          recording(3, { disambiguation: 'live' }),
        ),
        [`Distant Lover|${MARVIN}|0`]: searchOf(second),
        [`Sweet Dreams|Eurythmics|0`]: searchOf(
          recording(4, {
            title: 'Sweet Dreams (Are Made of This)',
            date: '1983-01-04',
            credit: [credit(id(60), 'Eurythmics')],
            releases: [
              release(11, {
                type: 'Single',
                date: '1983-01-04',
                credit: [credit(id(60), 'Eurythmics')],
              }),
            ],
          }),
        ),
      },
      recordings: {
        [take.id]: fullRecording(1, [
          artistRel('producer', MARVIN, 'Marvin Gaye'),
          artistRel('engineer', HARRIS, 'Cal Harris'),
          artistRel('instrument', id(14), 'James Jamerson', [
            'electric bass guitar',
          ]),
          {
            type: 'performance',
            'target-type': 'work',
            direction: 'forward',
            work: { id: WORK, title: "Let's Get It On" },
          },
          {
            type: 'recorded at',
            'target-type': 'place',
            direction: 'forward',
            place: { id: HITSVILLE, name: 'Hitsville U.S.A.' },
          },
        ]),
        [second.id]: {
          ...fullRecording(2, [
            artistRel('vocal', TAMMI, 'Tammi Terrell', ['lead vocals']),
          ]),
          title: 'Distant Lover',
          'artist-credit': [
            credit(MARVIN, 'Marvin Gaye', { joinphrase: ' & ' }),
            credit(TAMMI, 'Tammi Terrell', { type: 'Person' }),
          ],
        },
      },
      works: {
        [WORK]: {
          id: WORK,
          title: "Let's Get It On",
          relations: [
            artistRel('composer', MARVIN, 'Marvin Gaye'),
            artistRel('writer', TOWNSEND, 'Ed Townsend'),
          ],
        },
      },
      releases: {
        [album.id]: {
          id: album.id,
          title: "Let's Get It On",
          'release-group': {
            id: album['release-group']!.id,
            title: "Let's Get It On",
            'primary-type': 'Album',
            'first-release-date': '1973-08-28',
          },
          'label-info': [
            {
              'catalog-number': 'T 329V1',
              label: { id: TAMLA, name: 'Tamla', type: 'Imprint' },
            },
            {
              label: {
                id: MOTOWN_DISTRIBUTION,
                name: 'Motown Distribution',
                type: 'Distributor',
              },
            },
          ],
          relations: [],
        },
      },
      labels: {
        [TAMLA]: {
          id: TAMLA,
          name: 'Tamla',
          area: detroit,
          'life-span': { begin: '1959', ended: true, end: '1988' },
        },
      },
      places: {
        [HITSVILLE]: {
          id: HITSVILLE,
          name: 'Hitsville U.S.A.',
          type: 'Studio',
          area: detroit,
          coordinates: { latitude: '42.3641', longitude: '-83.0885' },
          'life-span': { begin: '1959' },
        },
      },
      areas: {
        [DETROIT_AREA]: { id: DETROIT_AREA, name: 'Detroit', type: 'City' },
      },
    },
  };
}

function queueOf(extra: Partial<SongToFetch>[] = []): SongToFetch[] {
  const marvin = pick();
  return planSongFetch({
    songs: [
      song({ year: 1973 }),
      song({ id: 'distant_lover', title: 'Distant Lover', year: 1973 }),
      song({ id: 'sweet_dreams', title: 'Sweet Dreams', artist: 'Eurythmics' }),
      song({
        id: 'traditional',
        title: 'Auld Lang Syne',
        artist: 'Traditional',
      }),
    ],
    registry: registryIndex([
      { slug: 'marvin-gaye', name: 'Marvin Gaye' },
      { slug: 'eurythmics', name: 'Eurythmics' },
    ]),
    picks: new Map([['marvin-gaye', marvin]]),
    requery: new Set(['sweet_dreams']),
    oldAnswer: () => null,
  }).map((s, n) => ({ ...s, ...(extra[n] ?? {}) }));
}

const slots = [
  { slug: 'marvin-gaye', mbid: MARVIN },
  { slug: 'eurythmics', mbid: null },
];

/**
 * The walk and its rows. The backend's own labels and studios are left out
 * unless asked for (`existing`): Tamla and Hitsville are among them.
 */
async function build(
  answers: Parameters<typeof fakeMb>[0] = motown().answers,
  batch = 'mb-songs-2026-10-01',
  {
    existing = [],
    ledger,
    queue = queueOf(),
  }: {
    existing?: readonly ExistingRecord[];
    ledger?: SlugLedger;
    queue?: SongToFetch[];
  } = {},
) {
  const { clients, calls } = fakeMb(answers);
  const walk = await walkSongs(queue, clients);
  const built = buildSongSuggestions({
    queue,
    walk,
    picks: new Map([['marvin-gaye', pick()]]),
    registry: slots,
    artistPlaces: createPlaceBook(),
    wd: noWikidata,
    batch,
    existing,
    ...(ledger ? { ledger } : {}),
  });
  return { queue, walk, built, calls };
}

const rowsFor = (rows: Suggestion[], slug: string, path?: string) =>
  rows.filter((s) => s.target.slug === slug && (!path || s.path === path));

describe('the fetch plan', () => {
  it('looks for the year again of songs with none that were missed or sit at the placeholder year', () => {
    const songs = [
      { id: 'missed' },
      { id: 'placeholder' },
      { id: 'real_event_year' },
      { id: 'has_year', year: 1970 },
    ];
    const events = [
      { id: 'song-placeholder', year: 2000 },
      { id: 'song-real_event_year', year: 1968 },
      { id: 'song-has_year', year: 2000 },
      { id: 'evt-2000', year: 2000 },
    ];
    expect(
      [...requerySet(songs, ['missed', 'has_year', 'gone'], events)].sort(),
    ).toEqual(['missed', 'placeholder']);
  });

  it('rests each song on its lead act, searches the year of the rest by name, and skips the others', () => {
    const queue = queueOf();
    expect(
      queue.map((s) => [
        s.id,
        s.lead?.slug ?? null,
        s.byName,
        s.requery,
        s.skip ?? null,
      ]),
    ).toEqual([
      ['distant_lover', 'marvin-gaye', null, false, null],
      ['lets_get_it_on', 'marvin-gaye', null, false, null],
      ['sweet_dreams', null, 'Eurythmics', true, null],
      ['traditional', null, null, false, 'no artist of ours is billed'],
    ]);
  });

  it("uses the old cache's whole answer only when its earliest take is the act's own record, from our year", () => {
    const plan = (year: number | undefined, answer: MbSearchRecording[]) =>
      planSongFetch({
        songs: [song({ ...(year ? { year } : {}) })],
        registry: registryIndex([{ slug: 'marvin-gaye', name: 'Marvin Gaye' }]),
        picks: new Map([['marvin-gaye', pick()]]),
        requery: new Set(),
        oldAnswer: () => answer,
      })[0].oldRecordings;
    const own = [recording(1)];
    expect(plan(1973, own)).toBe(own);
    expect(plan(undefined, own)).toBe(own);
    expect(plan(1980, own)).toBeNull();
    expect(
      plan(1973, [
        recording(1, {
          releases: [release(1, { secondary: ['Compilation'] })],
        }),
      ]),
    ).toBeNull();
    expect(
      plan(1973, [recording(1, { credit: [credit(id(99), 'Marvin Gaye')] })]),
    ).toBeNull();
  });
});

describe('the walk', () => {
  it('looks up each match, each album once, record labels only, and the studios and areas', async () => {
    const { walk, calls } = await build();
    expect(walk.missing).toEqual({});
    expect(walk.albums.size).toBe(1);
    expect([...walk.albums.values()][0].songIds).toEqual([
      'distant_lover',
      'lets_get_it_on',
    ]);
    expect(calls.filter((c) => c.startsWith('release '))).toHaveLength(1);
    expect(calls).toContain(`label ${TAMLA}`);
    expect(calls).not.toContain(`label ${MOTOWN_DISTRIBUTION}`);
    expect(calls).toContain(`place ${HITSVILLE}`);
    expect(calls).toContain(`area ${DETROIT_AREA}`);
    expect(calls.some((c) => c.startsWith('search Auld Lang Syne'))).toBe(
      false,
    );
  });

  it('counts what is not in the cache yet, and stops each song at its first gap', async () => {
    const { answers } = motown();
    const { clients } = fakeMb({ ...answers, recordings: {} });
    const walk = await walkSongs(queueOf(), clients);
    expect(walk.missing).toMatchObject({ recording: 2 });
    expect(walk.rows.find((r) => r.songId === 'lets_get_it_on')?.pending).toBe(
      'recording',
    );
    const empty = await walkSongs(queueOf(), fakeMb({}).clients);
    expect(empty.rows.map((r) => r.pending ?? r.skipped)).toEqual([
      'search',
      'search',
      'search',
      'no artist of ours is billed',
    ]);
  });
});

describe('the song rows', () => {
  it('suggest the album, which needs its release made, resting on the act’s identity', async () => {
    const { built } = await build();
    const [album] = rowsFor(built.suggestions, 'lets_get_it_on', 'releases[]');
    expect(album).toMatchObject({
      op: 'add',
      value: {
        releaseId: 'marvin-gaye-lets-get-it-on',
        track: 1,
        unverified: true,
        source: 'musicbrainz',
      },
      tier: 'sure',
      confidence: 1,
      dependsOn: 'identity-marvin',
      display: "Album: Let's Get It On (1973)",
    });
    expect(album.requires).toEqual([
      {
        kind: 'release',
        slug: 'marvin-gaye-lets-get-it-on',
        body: {
          slug: 'marvin-gaye-lets-get-it-on',
          title: "Let's Get It On",
          artistIds: ['marvin-gaye'],
          format: 'album',
          year: 1973,
          catalogNumber: 'T 329V1',
          externalIds: { mbid: id(2005) },
          unverified: true,
          source: 'musicbrainz',
        },
      },
    ]);
    // Two songs, one album: made once, needed by both — and by its label.
    expect(built.releases).toHaveLength(1);
    expect(built.releases[0].neededBy).toHaveLength(3);
  });

  it('are only likely for an album issued years after the recording', async () => {
    const { answers, take } = motown();
    const albumId = take.releases![1].id;
    const late = {
      ...answers,
      releases: {
        [albumId]: {
          ...answers.releases[albumId],
          'release-group': {
            ...answers.releases[albumId]['release-group']!,
            'first-release-date': '1976-03-01',
          },
        },
      },
    };
    const { built } = await build(late);
    const [album] = rowsFor(built.suggestions, 'lets_get_it_on', 'releases[]');
    expect(album).toMatchObject({
      tier: 'likely',
      display: "Album: Let's Get It On (1976)",
    });
    expect(album.evidence).toContain(
      'the album came out in 1976, 3 years after the recording',
    );
  });

  it("suggest the label on the release, resting on the album's row, with the label and its town", async () => {
    const { built } = await build();
    const [label] = built.suggestions.filter(
      (s) => s.target.kind === 'release',
    );
    const albumRows = built.suggestions.filter((s) => s.path === 'releases[]');
    expect(label).toMatchObject({
      target: { kind: 'release', slug: 'marvin-gaye-lets-get-it-on' },
      path: 'labelId',
      op: 'set',
      value: 'tamla',
      tier: 'sure',
      display: 'Label: Tamla (T 329V1)',
      dependsOn: albumRows.find((s) => s.target.slug === 'distant_lover')!.id,
    });
    expect(label.evidence[0]).toMatch(/as first issued/);
    // Its target too: accepted after another song's Album row, or none.
    const [release] = albumRows[0].requires!;
    expect(label.requires).toEqual([
      release,
      {
        kind: 'label',
        slug: 'tamla',
        body: {
          slug: 'tamla',
          name: 'Tamla',
          placeId: 'detroit',
          foundedYear: 1959,
          defunctYear: 1988,
          unverified: true,
          source: `https://musicbrainz.org/label/${TAMLA}`,
        },
      },
    ]);
  });

  it('suggest the studio the recording was made at, in one of our cities', async () => {
    const { built } = await build();
    const [studio] = rowsFor(
      built.suggestions,
      'lets_get_it_on',
      'session.studioId',
    );
    expect(studio).toMatchObject({ value: 'hitsville-u-s-a', tier: 'sure' });
    expect(studio.requires).toEqual([
      {
        kind: 'studio',
        slug: 'hitsville-u-s-a',
        body: {
          slug: 'hitsville-u-s-a',
          name: 'Hitsville U.S.A.',
          placeId: 'detroit',
          openedYear: 1959,
          coordinates: [42.3641, -83.0885],
          unverified: true,
          source: `https://musicbrainz.org/place/${HITSVILLE}`,
        },
      },
    ]);
    expect(built.places).toEqual([]);
  });

  it('link credits to our artists, make records per C30, and leave the rest a name with its MusicBrainz page', async () => {
    const { built } = await build();
    const credits = Object.fromEntries(
      rowsFor(built.suggestions, 'lets_get_it_on', 'credits[]').map((s) => [
        s.display,
        s,
      ]),
    );
    expect(Object.keys(credits).sort()).toEqual([
      'Electric Bass: James Jamerson',
      'Engineer: Cal Harris',
      'Producer: Marvin Gaye',
      'Songwriter: Ed Townsend',
      'Songwriter: Marvin Gaye',
    ]);
    expect(credits['Producer: Marvin Gaye'].value).toEqual({
      name: 'Marvin Gaye',
      role: 'producer',
      artistGlobeId: 'marvin-gaye',
      unverified: true,
      source: `https://musicbrainz.org/artist/${MARVIN}`,
    });
    expect(credits['Producer: Marvin Gaye'].requires).toBeUndefined();
    expect(credits['Songwriter: Ed Townsend'].requires).toEqual([
      {
        kind: 'artist',
        slug: 'ed-townsend',
        body: {
          slug: 'ed-townsend',
          name: 'Ed Townsend',
          externalIds: { mbid: TOWNSEND },
          unverified: true,
          source: 'musicbrainz',
        },
      },
    ]);
    expect(credits['Engineer: Cal Harris'].value).toEqual({
      name: 'Cal Harris',
      role: 'engineer',
      unverified: true,
      source: `https://musicbrainz.org/artist/${HARRIS}`,
    });
    expect(credits['Electric Bass: James Jamerson'].requires).toBeUndefined();
    // A duet: both billed, the partner made (C30 billed performer).
    const duet = rowsFor(built.suggestions, 'distant_lover', 'credits[]');
    expect(duet.map((s) => s.display).sort()).toEqual([
      'Performer (billed): Marvin Gaye',
      'Vocals (billed): Tammi Terrell',
    ]);
    expect(built.artists.map((a) => [a.slug, a.because])).toEqual([
      ['ed-townsend', ['songwriter']],
      ['tammi-terrell', ['billed']],
    ]);
  });

  it('search the year again by id or by name: sure only when its first record agrees', async () => {
    const { built } = await build();
    const [year] = rowsFor(built.suggestions, 'sweet_dreams', 'year');
    expect(year).toMatchObject({
      value: 1983,
      tier: 'likely',
      confidence: 0.6,
    });
    expect(year.dependsOn).toBeUndefined();
    // Songs with a year keep it: no year row for them.
    expect(rowsFor(built.suggestions, 'lets_get_it_on', 'year')).toEqual([]);
  });

  it("offer a year by id only from the act's own dated record: sure when it agrees", async () => {
    const { answers } = motown();
    const noYear = queueOf().map((s) =>
      s.id === 'lets_get_it_on' ? { ...s, year: undefined, requery: true } : s,
    );
    const walk = await walkSongs(noYear, fakeMb(answers).clients);
    const built = buildSongSuggestions({
      queue: noYear,
      walk,
      picks: new Map([['marvin-gaye', pick()]]),
      registry: slots,
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
    });
    expect(rowsFor(built.suggestions, 'lets_get_it_on', 'year')).toMatchObject([
      { value: 1973, tier: 'sure', dependsOn: 'identity-marvin' },
    ]);

    const reissued = {
      ...answers,
      searches: {
        ...answers.searches,
        [`Let's Get It On|${MARVIN}|0`]: searchOf(
          recording(1, {
            releases: [
              release(9, { secondary: ['Compilation'], date: '1974' }),
            ],
          }),
        ),
      },
    };
    const again = buildSongSuggestions({
      queue: noYear,
      walk: await walkSongs(noYear, fakeMb(reissued).clients),
      picks: new Map([['marvin-gaye', pick()]]),
      registry: slots,
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
    });
    expect(rowsFor(again.suggestions, 'lets_get_it_on', 'year')).toEqual([]);
    expect(again.unmapped.years).toEqual(['lets_get_it_on']);
  });

  it('offer nothing for an ambiguous match, and only likely rows for a likely one', async () => {
    const { answers } = motown();
    const later = recording(5, {
      date: '1985',
      releases: [release(12, { date: '1985' })],
    });
    const ambiguous = {
      ...answers,
      searches: {
        ...answers.searches,
        [`Let's Get It On|${MARVIN}|0`]: searchOf(
          answers.searches[`Let's Get It On|${MARVIN}|0`].recordings[0],
          later,
        ),
      },
    };
    const queue = queueOf().map((s) =>
      s.id === 'lets_get_it_on' ? { ...s, year: 1985 } : s,
    );
    const { clients } = fakeMb(ambiguous);
    const walk = await walkSongs(queue, clients);
    const built = buildSongSuggestions({
      queue,
      walk,
      picks: new Map([['marvin-gaye', pick()]]),
      registry: slots,
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
    });
    expect(rowsFor(built.suggestions, 'lets_get_it_on')).toEqual([]);
    expect(
      built.matches.find((m) => m.songId === 'lets_get_it_on')?.status,
    ).toBe('ambiguous');

    const likelyQueue = queueOf().map((s) =>
      s.lead
        ? {
            ...s,
            lead: { ...s.lead, tier: 'likely' as const, confidence: 0.7 },
          }
        : s,
    );
    const likelyWalk = await walkSongs(likelyQueue, fakeMb(answers).clients);
    const likely = buildSongSuggestions({
      queue: likelyQueue,
      walk: likelyWalk,
      picks: new Map([
        ['marvin-gaye', pick({ tier: 'likely', confidence: 0.7 })],
      ]),
      registry: slots,
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
    });
    expect(likely.suggestions.length).toBeGreaterThan(0);
    expect(
      likely.suggestions.every(
        (s) => s.tier === 'likely' && s.confidence <= 0.84,
      ),
    ).toBe(true);
  });

  it('keep their ids whatever the batch or the sources, and change them with the value', async () => {
    const a = (await build(undefined, 'mb-songs-2026-10-01')).built.suggestions;
    const b = (await build(undefined, 'mb-songs-2026-12-24')).built.suggestions;
    expect(b.map((s) => s.id)).toEqual(a.map((s) => s.id));
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
    for (const s of a)
      expect(s.id).toBe(
        suggestionId({
          target: s.target,
          path: s.path,
          op: s.op,
          value: s.value,
        }),
      );
    // A credit keeps its id when its record id or its source changes…
    const [producer] = a.filter((s) => s.display === 'Producer: Marvin Gaye');
    expect(
      suggestionId({
        ...producer,
        value: {
          ...(producer.value as object),
          artistGlobeId: 'someone-else',
          source: 'x',
        },
      }),
    ).toBe(producer.id);
    // …and an album row with another release is another row.
    const [album] = a.filter((s) => s.path === 'releases[]');
    expect(suggestionId({ ...album, value: { releaseId: 'other' } })).not.toBe(
      album.id,
    );
  });
});

describe('the song artifacts', () => {
  const artistManifest = () => {
    const places = createPlaceBook();
    const built = {
      suggestions: [],
      places: [],
      counts: {
        suggestions: 0,
        byTier: { sure: 0, likely: 0, ambiguous: 0 },
        byField: {},
        identity: {
          sure: 0,
          likely: 0,
          ambiguous: 0,
          weak: 0,
          none: 0,
          pending: 0,
        },
        artistsWithFields: 0,
        placesToCreate: 0,
        placesMapped: 0,
      },
      unmapped: { genres: [], instruments: [], places: [], residences: [] },
      shared: [],
      placeBook: places,
    };
    return emitArtifacts({
      built,
      batch: 'mb-2026-09-30',
      registryArtists: 0,
      cache: { digest: 'd', responses: 1, byHost: {} },
      inputs: {},
      stageFingerprint: null,
      now: () => new Date('2026-10-01T00:00:00Z'),
    });
  };

  it('write one row per line, no timestamps, the same bytes every time', async () => {
    const { built } = await build();
    const first = emitSongArtifacts(built, 'mb-songs-2026-10-01', 1);
    const again = emitSongArtifacts(
      (await build()).built,
      'mb-songs-2026-10-01',
      1,
    );
    expect(again.files).toEqual(first.files);
    expect(Object.keys(first.files)).toEqual([
      'songs.json',
      'matches.json',
      'releases.json',
      'labels.json',
      'studios.json',
      'artists-created.json',
      'record-places.json',
      'record-slugs.json',
    ]);
    const songs = JSON.parse(first.files['songs.json']) as {
      batch: string;
      suggestions: Suggestion[];
    };
    expect(songs.batch).toBe('mb-songs-2026-10-01');
    expect(songs.suggestions).toEqual(built.suggestions);
    expect(
      first.files['songs.json']
        .split('\n')
        .filter((l) => l.startsWith('    {"id":')),
    ).toHaveLength(built.suggestions.length);
    for (const text of Object.values(first.files))
      expect(text).not.toMatch(/generatedAt|@/);
    expect(JSON.parse(first.files['labels.json']).labels[0]).toMatchObject({
      slug: 'tamla',
      mbid: TAMLA,
    });
    expect(first.part).toMatchObject({
      batch: 'mb-songs-2026-10-01',
      requery: 1,
      calibrated: false,
      counts: {
        suggestions: built.suggestions.length,
        records: { releases: 1, labels: 1, studios: 1 },
      },
    });
  });

  it("add their files and part to the manifest, never touching the artist half's", async () => {
    const artist = artistManifest();
    const song = emitSongArtifacts(
      (await build()).built,
      'mb-songs-2026-10-01',
      1,
    );
    const manifest = withSongs(artist.manifest, song);
    expect(manifest.files.slice(0, 2)).toEqual(artist.manifest.files);
    expect(manifest.files.map((f) => f.file).slice(2)).toEqual(
      Object.keys(song.files),
    );
    expect(manifest.songs).toEqual(song.part);
    const rest = (m: object) => {
      const copy: Record<string, unknown> = { ...m };
      delete copy.files;
      delete copy.songs;
      return copy;
    };
    expect(rest(manifest)).toEqual(rest(artist.manifest));
    // Emitting the artist half alone keeps the song half's entries on disk.
    const carried = withSongs(artist.manifest, null, manifest);
    expect(carried).toEqual(manifest);
    expect(withSongs(artist.manifest, null, null).files).toEqual(
      artist.manifest.files,
    );
    expect(JSON.parse(manifestJson(manifest))).toEqual(manifest);
  });
});

describe('the towns of studios and labels', () => {
  const BEARSVILLE_AREA = id(701);
  const UTOPIA = id(601);
  /** A studio in a town that is none of our cities. */
  function upstate() {
    const { answers } = motown();
    const area = {
      id: BEARSVILLE_AREA,
      name: 'Bearsville',
      'iso-3166-2-codes': ['US-NY'],
    };
    return {
      ...answers,
      recordings: {
        ...answers.recordings,
        [recording(1).id]: fullRecording(1, [
          {
            type: 'recorded at',
            'target-type': 'place',
            direction: 'forward',
            place: { id: UTOPIA, name: 'Utopia Sound' },
          },
        ]),
      },
      places: {
        [UTOPIA]: {
          id: UTOPIA,
          name: 'Utopia Sound',
          type: 'Studio',
          area,
          coordinates: { latitude: 42.04, longitude: -74.15 },
        },
      },
      areas: {
        ...answers.areas,
        [BEARSVILLE_AREA]: {
          id: BEARSVILLE_AREA,
          name: 'Bearsville',
          type: 'City',
        },
      },
    };
  }

  it("never takes a slug the artist half's places have, and are made pin:false", () => {
    const reserved = createPlaceBook({ reserved: new Set(['tottenham']) });
    expect(
      reserved.place({
        name: 'Tottenham',
        country: 'GB',
        coordinates: [51.5975, -0.0681],
      }),
    ).toMatchObject({ kind: 'create', placeId: 'tottenham-uk' });
  });

  it('make a town that is none of ours, listed once in record-places', async () => {
    const queue = queueOf();
    const walk = await walkSongs(queue, fakeMb(upstate()).clients);
    const built = buildSongSuggestions({
      queue,
      walk,
      picks: new Map([['marvin-gaye', pick()]]),
      registry: slots,
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
    });
    const [studio] = rowsFor(
      built.suggestions,
      'lets_get_it_on',
      'session.studioId',
    );
    expect(studio.requires?.map((r) => `${r.kind}:${r.slug}`)).toEqual([
      'globe_city:bearsville',
      'studio:utopia-sound',
    ]);
    expect(studio.requires?.[0].body).toMatchObject({
      id: 'bearsville',
      pin: false,
      country: 'US',
    });
    expect(built.places.map((p) => [p.slug, p.neededBy])).toEqual([
      ['bearsville', [studio.id]],
    ]);
  });

  it("reuse a town the artist half makes, under the artist half's slug, and list it there only", async () => {
    const artistPlaces = createPlaceBook();
    artistPlaces.place({
      name: 'Bearsville',
      country: 'US',
      coordinates: [42.04, -74.15],
      wikidata: 'Q9',
    });
    const queue = queueOf();
    const walk = await walkSongs(queue, fakeMb(upstate()).clients);
    const built = buildSongSuggestions({
      queue,
      walk,
      picks: new Map([['marvin-gaye', pick()]]),
      registry: slots,
      artistPlaces,
      wd: noWikidata,
      batch: 'b',
    });
    const [studio] = rowsFor(
      built.suggestions,
      'lets_get_it_on',
      'session.studioId',
    );
    expect(studio.requires?.[0]).toMatchObject({
      kind: 'globe_city',
      slug: 'bearsville',
    });
    expect(built.places).toEqual([]);
    // Looking in the artist half's places never adds to them.
    expect(artistPlaces.created()).toHaveLength(1);
  });
});

describe('records the backend already has', () => {
  it('are linked, never made again', async () => {
    const { built } = await build(undefined, 'b', {
      existing: EXISTING_RECORDS,
    });
    const [label] = built.suggestions.filter((s) => s.path === 'labelId');
    expect(label).toMatchObject({ value: 'tamla', tier: 'sure' });
    expect(label.requires?.map((r) => `${r.kind}:${r.slug}`)).toEqual([
      'release:marvin-gaye-lets-get-it-on',
    ]);
    expect(label.evidence).toContain('the label we already have as tamla');
    const [studio] = rowsFor(
      built.suggestions,
      'lets_get_it_on',
      'session.studioId',
    );
    expect(studio).toMatchObject({ value: 'hitsville-u-s-a', tier: 'sure' });
    expect(studio.requires).toBeUndefined();
    expect(built.labels).toEqual([]);
    expect(built.studios).toEqual([]);
    expect(built.counts.existing).toEqual({ labels: 1, studios: 1 });
  });

  it('are the ones the repo holds for the pilot songs (src/content/data), which the mock seeds', async () => {
    // Each file is sorted by slug and grows as records are added, so each
    // existing record is found in it by slug.
    const files: Record<
      ExistingRecord['kind'],
      readonly Record<string, unknown>[]
    > = {
      label: (await import('@/content/data/labels.json')).default,
      studio: (await import('@/content/data/studios.json')).default,
    };
    for (const { kind, slug, name, placeId } of EXISTING_RECORDS)
      expect(
        files[kind].find((row) => row.slug === slug),
        `${kind} ${slug}`,
      ).toMatchObject({ slug, name, placeId });
  });

  it('match by name and town, or country where MusicBrainz names no town of ours; a namesake elsewhere is another', () => {
    const label = (facts: Parameters<typeof existingRecordFor>[1]) =>
      existingRecordFor('label', facts)?.slug ?? null;
    const studio = (facts: Parameters<typeof existingRecordFor>[1]) =>
      existingRecordFor('studio', facts)?.slug ?? null;
    expect(label({ name: 'Apple Records', placeId: 'london' })).toBe('apple');
    expect(label({ name: 'Columbia', country: 'US' })).toBe('columbia');
    expect(label({ name: 'Columbia', country: 'GB' })).toBeNull();
    expect(label({ name: 'Columbia', placeId: 'london', country: 'GB' })).toBe(
      null,
    );
    expect(studio({ name: 'Abbey Road Studios', placeId: 'london' })).toBe(
      'abbey-road-studios',
    );
    expect(studio({ name: 'Britannia Row Studios', placeId: 'london' })).toBe(
      'britannia-row',
    );
    expect(studio({ name: 'Sunset Sound', placeId: 'nashville' })).toBeNull();
    // The UK's Columbia never takes the slug of ours.
    expect(
      Object.fromEntries(
        assignRecordSlugs([{ mbid: id(1), name: 'Columbia', country: 'GB' }], {
          taken: existingSlugs('label'),
        }),
      ),
    ).toEqual({ [id(1)]: 'columbia-uk' });
  });
});

describe('the slug ledger', () => {
  it('gives a record the slug it was given before, whoever turns up since', () => {
    // A second self-titled album, met by a later import.
    const toto = { mbid: id(1), base: 'toto-toto', year: 1978 };
    const later = { mbid: id(2), base: 'toto-toto', year: 1999 };
    expect(assignReleaseSlugs([toto]).get(id(1))).toBe('toto-toto');
    expect(
      Object.fromEntries(
        assignReleaseSlugs([toto, later], {
          known: { [id(1)]: 'toto-toto' },
        }),
      ),
    ).toEqual({ [id(1)]: 'toto-toto', [id(2)]: 'toto-toto-1999' });
    // Without the ledger the first would be renamed: what it prevents.
    expect(assignReleaseSlugs([toto, later]).get(id(1))).toBe('toto-toto-1978');
    // A slug in the ledger is never handed to another, met this run or not.
    expect(
      Object.fromEntries(
        assignRecordSlugs([{ mbid: id(3), name: 'Columbia', country: 'US' }], {
          known: { [id(4)]: 'columbia' },
        }),
      ),
    ).toEqual({ [id(3)]: 'columbia-us' });
  });

  it('is written by emit, read back the same, and only ever added to', async () => {
    const { built } = await build(undefined, 'b');
    expect(built.ledger.release).toEqual({
      [id(2005)]: 'marvin-gaye-lets-get-it-on',
    });
    expect(built.ledger.label).toEqual({ [TAMLA]: 'tamla' });
    expect(built.ledger.studio).toEqual({ [HITSVILLE]: 'hitsville-u-s-a' });
    expect(Object.values(built.ledger.artist).sort()).toEqual([
      'ed-townsend',
      'tammi-terrell',
    ]);
    const text = emitSongArtifacts(built, 'b', 0).files['record-slugs.json'];
    expect(parseLedger(text)).toEqual(built.ledger);
    expect(ledgerJson(parseLedger(text), 1)).toBe(text);
    // An earlier emit named the album otherwise: its rows keep that name.
    const ledger = emptyLedger();
    ledger.release[id(2005)] = 'lets-get-it-on-1973';
    ledger.artist[id(99)] = 'someone-gone';
    const again = (await build(undefined, 'b', { ledger })).built;
    const [album] = rowsFor(again.suggestions, 'lets_get_it_on', 'releases[]');
    expect(album.value).toMatchObject({ releaseId: 'lets-get-it-on-1973' });
    expect(again.ledger.artist[id(99)]).toBe('someone-gone');
    // Emitting again from the ledger it wrote: the same bytes.
    const twice = (await build(undefined, 'b', { ledger: built.ledger })).built;
    expect(emitSongArtifacts(twice, 'b', 0).files).toEqual(
      emitSongArtifacts(built, 'b', 0).files,
    );
  });
});

describe('the label and the album, as first issued', () => {
  it("rest on the release's surest Album row, whichever song's comes first", async () => {
    // Distant Lover's own year is years off: its Album row is only likely.
    const queue = queueOf().map((s) =>
      s.id === 'distant_lover' ? { ...s, year: 1976 } : s,
    );
    const { built } = await build(undefined, 'b', { queue });
    const albums = built.suggestions.filter((s) => s.path === 'releases[]');
    const sure = albums.find((s) => s.target.slug === 'lets_get_it_on')!;
    expect(albums.find((s) => s.target.slug === 'distant_lover')!.tier).toBe(
      'likely',
    );
    const [label] = built.suggestions.filter((s) => s.path === 'labelId');
    expect(label).toMatchObject({ dependsOn: sure.id, tier: 'sure' });
  });

  it('are only likely from a later issue: no catalog number, and a bonus track is said to be one', async () => {
    const { answers, take } = motown();
    const albumId = take.releases![1].id;
    const deluxe = {
      ...answers,
      releases: {
        [albumId]: {
          ...answers.releases[albumId],
          'release-group': {
            ...answers.releases[albumId]['release-group']!,
            'first-release-date': '1970-01-01',
          },
        },
      },
    };
    const { built } = await build(deluxe);
    const [album] = rowsFor(built.suggestions, 'lets_get_it_on', 'releases[]');
    expect(album.tier).toBe('likely');
    expect(album.evidence).toContain(
      'the album first came out in 1970, but the recording is only on its issues from 1973 on: a bonus track?',
    );
    const body = album.requires!.at(-1)!.body as { catalogNumber?: string };
    expect(body.catalogNumber).toBeUndefined();
    const [label] = built.suggestions.filter((s) => s.path === 'labelId');
    expect(label).toMatchObject({ tier: 'likely', display: 'Label: Tamla' });
    expect(label.evidence[0]).toMatch(
      /^the label of a later issue of "Let's Get It On" \(release .*\): MusicBrainz has no issue from 1970/,
    );
  });
});

describe('studio rooms', () => {
  it('are their building: the studio is the building, the room its evidence', async () => {
    const { answers, take } = motown();
    const ROOM = id(602);
    const room: MbPlace = {
      id: ROOM,
      name: 'Hitsville U.S.A.: Studio A',
      type: 'Studio',
      area: answers.places[HITSVILLE].area,
      relations: [
        {
          type: 'parts',
          'target-type': 'place',
          direction: 'backward',
          place: { id: HITSVILLE, name: 'Hitsville U.S.A.', type: 'Studio' },
        },
      ],
    };
    const rooms = {
      ...answers,
      recordings: {
        ...answers.recordings,
        [take.id]: fullRecording(1, [
          {
            type: 'recorded at',
            'target-type': 'place',
            direction: 'forward',
            place: { id: ROOM, name: room.name },
          },
        ]),
      },
      places: { ...answers.places, [ROOM]: room },
    };
    expect(wholePlaceOf(room)?.id).toBe(HITSVILLE);
    expect(wholePlaceOf(answers.places[HITSVILLE] as MbPlace)).toBeNull();
    const { built, calls, walk } = await build(rooms);
    expect(calls).toEqual(
      expect.arrayContaining([`place ${ROOM}`, `place ${HITSVILLE}`]),
    );
    expect(walk.wholes.get(ROOM)).toBe(HITSVILLE);
    const studios = rowsFor(
      built.suggestions,
      'lets_get_it_on',
      'session.studioId',
    );
    expect(studios).toHaveLength(1);
    expect(studios[0]).toMatchObject({
      value: 'hitsville-u-s-a',
      tier: 'sure',
    });
    expect(studios[0].evidence).toContain(
      'in Hitsville U.S.A.: Studio A, part of Hitsville U.S.A.',
    );
    expect(built.studios.map((s) => s.slug)).toEqual(['hitsville-u-s-a']);
  });
});

describe('the search', () => {
  it('asks for the act and its bands at once, and marks one cut short: its match only likely', async () => {
    const queue = queueOf().map((s) =>
      s.lead
        ? {
            ...s,
            lead: {
              ...s.lead,
              bands: [
                { id: TAMMI, name: 'Marvin Gaye and the Band', backing: true },
              ],
            },
          }
        : s,
    );
    expect((await build(undefined, 'b', { queue })).calls).toContain(
      `search Let's Get It On ${MARVIN},${TAMMI} 0`,
    );
    const { answers } = motown();
    const first = answers.searches[`Let's Get It On|${MARVIN}|0`];
    const cut = {
      ...answers,
      searches: {
        ...answers.searches,
        [`Let's Get It On|${MARVIN}|0`]: { ...first, count: 412 },
      },
    };
    const { walk } = await build(cut);
    const row = walk.rows.find((r) => r.songId === 'lets_get_it_on')!;
    expect(row.cutOff).toEqual({ count: 412, read: 2 });
    expect(row.match).toMatchObject({ status: 'matched', tier: 'likely' });
  });
});

describe('credits that say less than they seem to', () => {
  it('are only likely: an instrument not in our list, a link to another of our artists', async () => {
    const { answers, take } = motown();
    const WHITE = id(15);
    const guitars = {
      ...answers,
      recordings: {
        ...answers.recordings,
        [take.id]: fullRecording(1, [
          artistRel('instrument', WHITE, 'Robert White', ['guitar']),
          artistRel('instrument', WHITE, 'Robert White', ['cymbal']),
        ]),
      },
    };
    const queue = queueOf();
    const walk = await walkSongs(queue, fakeMb(guitars).clients);
    const built = buildSongSuggestions({
      queue,
      walk,
      picks: new Map([
        ['marvin-gaye', pick()],
        [
          'tammi-terrell',
          pick({
            slug: 'tammi-terrell',
            name: 'Tammi Terrell',
            mbid: TAMMI,
            identityId: 'identity-tammi',
          }),
        ],
      ]),
      registry: [...slots, { slug: 'tammi-terrell', mbid: TAMMI }],
      artistPlaces: createPlaceBook(),
      wd: noWikidata,
      batch: 'b',
      existing: [],
    });
    const [white] = rowsFor(built.suggestions, 'lets_get_it_on', 'credits[]');
    expect(white).toMatchObject({
      display: 'Performer (cymbal, guitar, not in our list): Robert White',
      tier: 'likely',
      value: { name: 'Robert White', role: 'performer' },
    });
    const duet = Object.fromEntries(
      rowsFor(built.suggestions, 'distant_lover', 'credits[]').map((s) => [
        s.display,
        s,
      ]),
    );
    // Marvin is the lead act: his identity is the row's own.
    expect(duet['Performer (billed): Marvin Gaye'].tier).toBe('sure');
    expect(duet['Vocals (billed): Tammi Terrell']).toMatchObject({
      tier: 'likely',
      value: { artistGlobeId: 'tammi-terrell' },
    });
    expect(duet['Vocals (billed): Tammi Terrell'].evidence).toContain(
      "links our tammi-terrell: accept tammi-terrell's MusicBrainz identity (row identity-tammi) first",
    );
  });
});

describe('song files kept from an earlier emit', () => {
  it('are kept only while every identity row they rest on is still there', async () => {
    const { built } = await build();
    const text = emitSongArtifacts(built, 'b', 0).files['songs.json'];
    expect(strandedSongRows(text, new Set(['identity-marvin']))).toBe(0);
    expect(strandedSongRows(text, new Set())).toBe(
      built.suggestions.filter((s) => s.dependsOn === 'identity-marvin').length,
    );
  });
});
