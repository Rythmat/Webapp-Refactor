import { describe, expect, it } from 'vitest';
import {
  extractCacheStage,
  isAlternateTake,
  isWeakBilling,
  legacyKeyPart,
  legacyKeys,
  type MbCache,
  nameKey,
  type RegistryArtist,
  stripVersion,
} from '../cacheStage';
import type { MbArtistCredit, MbArtistRef } from '../musicbrainz';

// ── A small `_mb_cache.json`, shaped like the real one ──────────────────

const MARVIN: MbArtistRef = {
  id: 'afdb7919-059d-43c1-b668-ba1d265e7e42',
  name: 'Marvin Gaye',
  aliases: [{ name: 'Marvin Pentz Gay Jr.' }],
};
const TRIBUTE: MbArtistRef = {
  id: 'tribute',
  name: 'Marvin Gaye Tribute Band',
};
const VARIOUS: MbArtistRef = { id: 'various', name: 'Various Artists' };
const KOOL: MbArtistRef = { id: 'kool', name: 'Kool & the Gang' };
const JIMI: MbArtistRef = { id: 'jimi', name: 'Jimi Hendrix' };
const POINTERS: MbArtistRef = { id: 'pointers', name: 'The Pointer Sisters' };
const MJ: MbArtistRef = { id: 'mj', name: 'Michael Jackson' };
const JT: MbArtistRef = { id: 'jt', name: 'Justin Timberlake' };
const COMMON: MbArtistRef = {
  id: 'common-rapper',
  name: 'Common',
  disambiguation: 'US rapper',
};
const COMMON_BAND: MbArtistRef = {
  id: 'common-band',
  name: 'Common',
  disambiguation: 'Finnish band',
};
const KARAOKE: MbArtistRef = { id: 'karaoke', name: 'Karaoke Co' };
const ROD: MbArtistRef = { id: 'rod', name: 'Rod Stewart' };
// The band, and a 50s rockabilly group of the same name that turns up on a
// hits compilation.
const COMMODORES: MbArtistRef = { id: 'commodores', name: 'Commodores' };
const ROCKABILLY: MbArtistRef = {
  id: 'rockabilly',
  name: 'The Commodores',
  disambiguation: '50s US rockabilly group',
};
const BOB: MbArtistRef = { id: 'bob', name: 'Bob Marley' };
const WAILERS: MbArtistRef = {
  id: 'wailers',
  name: 'Bob Marley & The Wailers',
};

const credit = (...artists: MbArtistRef[]): MbArtistCredit[] =>
  artists.map((artist, i) => ({
    name: artist.name,
    joinphrase: i < artists.length - 1 ? ' & ' : '',
    artist,
  }));

const ALBUM_RG = {
  id: 'rg-album',
  title: 'Let’s Get It On',
  'primary-type': 'Album',
};

const MB_CACHE: MbCache = {
  'marvin gaye|lets get it on': {
    recordings: [
      {
        id: 'rec-studio',
        title: 'Let’s Get It On',
        'artist-credit': credit(MARVIN),
        'first-release-date': '1973-06-15',
        releases: [
          {
            id: 'r1',
            title: 'Let’s Get It On',
            status: 'Official',
            date: '1973-08-28',
            'release-group': ALBUM_RG,
          },
          {
            id: 'r2',
            title: 'Greatest Hits',
            status: 'Official',
            date: '1976',
            'release-group': {
              id: 'rg-hits',
              title: 'Greatest Hits',
              'primary-type': 'Album',
              'secondary-types': ['Compilation'],
            },
          },
          {
            // Typed a plain Album, but it's a Various Artists compilation.
            id: 'r3',
            title: 'Now That’s What I Call Soul',
            status: 'Official',
            date: '1990',
            'artist-credit': credit(VARIOUS),
            'release-group': {
              id: 'rg-now',
              title: 'Now That’s What I Call Soul',
              'primary-type': 'Album',
            },
          },
          {
            id: 'r4',
            title: 'Let’s Get It On',
            status: 'Bootleg',
            date: '1972',
            'release-group': {
              id: 'rg-boot',
              title: 'x',
              'primary-type': 'Album',
            },
          },
          {
            id: 'r5',
            title: 'Let’s Get It On',
            status: 'Official',
            date: '1973-06-15',
            'release-group': {
              id: 'rg-single',
              title: 'Let’s Get It On',
              'primary-type': 'Single',
            },
          },
        ],
      },
      {
        // Still says who Marvin Gaye is; says nothing about his albums.
        id: 'rec-live',
        title: 'Let’s Get It On',
        disambiguation: 'live, 1974',
        'artist-credit': credit(MARVIN),
        'first-release-date': '1974',
        releases: [
          {
            id: 'r6',
            title: 'Marvin Gaye Live!',
            status: 'Official',
            date: '1974',
            'release-group': {
              id: 'rg-live',
              title: 'Marvin Gaye Live!',
              'primary-type': 'Album',
            },
          },
        ],
      },
      {
        id: 'rec-remaster',
        title: 'Let’s Get It On (Remastered 2003)',
        'artist-credit': credit(MARVIN),
        'first-release-date': '2003',
        releases: [
          {
            id: 'r7',
            title: 'Let’s Get It On',
            status: 'Official',
            date: '2003',
            'release-group': ALBUM_RG,
          },
        ],
      },
      {
        id: 'rec-tribute',
        title: 'Let’s Get It On',
        'artist-credit': credit(TRIBUTE),
        'first-release-date': '1999',
      },
      {
        id: 'rec-other',
        title: 'Sexual Healing',
        'artist-credit': credit(MARVIN),
      },
    ],
    releaseGroups: [
      {
        id: 'rg-single',
        title: 'Let’s Get It On',
        'primary-type': 'Single',
        'first-release-date': '1973-06-15',
        'artist-credit': credit(MARVIN),
      },
      {
        id: 'rg-album',
        title: 'Let’s Get It On',
        'primary-type': 'Album',
        'first-release-date': '1973-08-28',
        'artist-credit': credit(MARVIN),
      },
    ],
  },
  // May's song file said "Kool and the Gang"; today's says "Kool & the Gang".
  'kool and the gang|celebration': {
    recordings: [
      { id: 'rec-kool', title: 'Celebration', 'artist-credit': credit(KOOL) },
    ],
  },
  // May's song file misspelled the artist; only the title still matches.
  'jimmy hendrix|fire': {
    recordings: [
      { id: 'rec-jimi', title: 'Fire', 'artist-credit': credit(JIMI) },
    ],
  },
  'the pointer sisters|fire': {
    recordings: [
      { id: 'rec-pointers', title: 'Fire', 'artist-credit': credit(POINTERS) },
    ],
  },
  'michael jackson and justin timberlake|love never felt so good': {
    recordings: [
      {
        id: 'rec-duet',
        title: 'Love Never Felt So Good',
        'artist-credit': credit(MJ, JT),
      },
    ],
  },
  'common|the light': {
    recordings: [
      // Karaoke labels credit themselves "as" the act they imitate.
      {
        id: 'rec-karaoke',
        title: 'The Light',
        'artist-credit': [{ name: 'Common', artist: KARAOKE }],
      },
      { id: 'rec-light', title: 'The Light', 'artist-credit': credit(COMMON) },
    ],
  },
  'common|go': {
    recordings: [
      { id: 'rec-go', title: 'Go', 'artist-credit': credit(COMMON_BAND) },
    ],
  },
  'talking heads|air': { recordings: [], releaseGroups: [], error: 'HTTP 503' },
  // Asked in May for another artist's song of the same name; ours isn't in it.
  'rod stewart|forever young': {
    recordings: [
      { id: 'rec-rod', title: 'Forever Young', 'artist-credit': credit(ROD) },
    ],
  },
  'the commodores|brick house': {
    recordings: [
      {
        id: 'rec-brick',
        title: 'Brick House',
        'artist-credit': credit(COMMODORES),
        releases: [
          {
            id: 'r-brick',
            title: 'Commodores',
            status: 'Official',
            date: '1977-03',
            'release-group': {
              id: 'rg-commodores',
              title: 'Commodores',
              'primary-type': 'Album',
            },
          },
        ],
      },
      ...['rec-rb-1', 'rec-rb-2'].map((id) => ({
        id,
        title: 'Brick House',
        'artist-credit': credit(ROCKABILLY),
        releases: [
          {
            id: `r-${id}`,
            title: 'Golden Hits',
            status: 'Official',
            'release-group': {
              id: 'rg-golden',
              title: 'Golden Hits',
              'primary-type': 'Album',
              'secondary-types': ['Compilation'],
            },
          },
        ],
      })),
    ],
  },
  'the commodores|easy': {
    recordings: [
      { id: 'rec-easy', title: 'Easy', 'artist-credit': credit(COMMODORES) },
      {
        id: 'rec-rb-easy',
        title: 'Easy',
        'artist-credit': credit(ROCKABILLY),
      },
    ],
  },
  // The song names Bob Marley; most recordings of it credit the Wailers act.
  'bob marley|stir it up': {
    recordings: [
      { id: 'rec-bob', title: 'Stir It Up', 'artist-credit': credit(BOB) },
      ...['rec-w1', 'rec-w2', 'rec-w3'].map((id) => ({
        id,
        title: 'Stir It Up',
        'artist-credit': credit(WAILERS),
      })),
    ],
  },
};

const SONGS = [
  {
    id: 'lets_get_it_on',
    title: 'Let’s Get It On',
    artist: 'Marvin Gaye',
    year: 1973,
  },
  {
    id: 'celebration',
    title: 'Celebration',
    artist: 'Kool & the Gang',
    year: 1980,
  },
  { id: 'fire', title: 'Fire', artist: 'Jimi Hendrix', year: 1967 },
  {
    id: 'duet',
    title: 'Love Never Felt So Good',
    artist: 'Michael Jackson and Justin Timberlake',
  },
  { id: 'the_light', title: 'The Light', artist: 'Common' },
  { id: 'go', title: 'Go', artist: 'Common' },
  { id: 'air', title: 'Air', artist: 'Talking Heads' },
  { id: 'nowhere', title: 'Nowhere', artist: 'Traditional' },
  { id: 'forever_young', title: 'Forever Young', artist: 'Bob Dylan' },
  { id: 'brick_house', title: 'Brick House', artist: 'The Commodores' },
  { id: 'easy', title: 'Easy', artist: 'The Commodores' },
  { id: 'stir_it_up', title: 'Stir It Up', artist: 'Bob Marley' },
];

const REGISTRY: RegistryArtist[] = [
  { slug: 'bob-dylan', name: 'Bob Dylan' },
  { slug: 'bob-marley', name: 'Bob Marley' },
  { slug: 'common', name: 'Common' },
  { slug: 'jimi-hendrix', name: 'Jimi Hendrix' },
  { slug: 'kool-and-the-gang', name: 'Kool & the Gang' },
  { slug: 'marvin-gaye', name: 'Marvin Gaye' },
  {
    slug: 'michael-jackson-and-justin-timberlake',
    name: 'Michael Jackson and Justin Timberlake',
  },
  { slug: 'talking-heads', name: 'Talking Heads' },
  { slug: 'the-commodores', name: 'The Commodores' },
  { slug: 'toto', name: 'Toto' },
];

const run = () =>
  extractCacheStage({
    songs: SONGS,
    registry: REGISTRY,
    mbCache: MB_CACHE,
    yearAudit: [
      { slug: 'celebration', decision: 'accept', year: 1980 },
      // Accepted in May, corrected by hand since: the song's 1967 is not
      // MusicBrainz's 1968.
      { slug: 'fire', decision: 'accept', year: 1968 },
      { slug: 'lets_get_it_on', decision: 'skip', year: 1973 },
    ],
  });

const song = (id: string) => {
  const row = run().songs.find((r) => r.songId === id);
  if (!row) throw new Error(`no row for ${id}`);
  return row;
};

describe('the cache stage', () => {
  it('finds the song-billed artist, the studio album and the single', () => {
    expect(song('lets_get_it_on')).toEqual({
      songId: 'lets_get_it_on',
      title: 'Let’s Get It On',
      artist: 'Marvin Gaye',
      artistSlug: 'marvin-gaye',
      cacheKeys: ['marvin gaye|lets get it on'],
      byTitle: false,
      status: 'matched',
      // Studio, live and remaster; not the tribute band, not another title.
      exactRecordings: 3,
      billed: [
        {
          mbid: MARVIN.id,
          name: 'Marvin Gaye',
          recordings: 3,
          onRelease: true,
        },
      ],
      jointCredit: false,
      // Not the compilation, not Various Artists, not the bootleg, not the
      // live album; the remaster's later pressing doesn't move the date.
      albums: [
        {
          releaseGroupId: 'rg-album',
          title: 'Let’s Get It On',
          firstDate: '1973-08-28',
        },
      ],
      singles: [
        {
          releaseGroupId: 'rg-single',
          title: 'Let’s Get It On',
          firstDate: '1973-06-15',
        },
      ],
      firstReleaseDate: '1973-06-15',
      yearFromMusicBrainz: false,
    });
  });

  it('reads the old key when May spelled "&" as "and"', () => {
    expect(song('celebration')).toMatchObject({
      cacheKeys: ['kool and the gang|celebration'],
      byTitle: false,
      status: 'matched',
      billed: [{ mbid: 'kool' }],
    });
  });

  it('marks a year as MusicBrainz’s only while the song still has it', () => {
    expect(song('celebration').yearFromMusicBrainz).toBe(true);
    expect(song('fire').yearFromMusicBrainz).toBe(false);
    expect(song('lets_get_it_on').yearFromMusicBrainz).toBe(false);
  });

  it('falls back to the title when the artist was misspelled, trusting only credits', () => {
    expect(song('fire')).toMatchObject({
      cacheKeys: ['jimmy hendrix|fire', 'the pointer sisters|fire'],
      byTitle: true,
      status: 'matched',
      exactRecordings: 1,
      billed: [{ mbid: 'jimi', name: 'Jimi Hendrix' }],
    });
  });

  it('counts a song as never asked when only other artists’ answers carry its title', () => {
    expect(song('forever_young')).toMatchObject({
      cacheKeys: ['rod stewart|forever young'],
      byTitle: true,
      status: 'missing',
      billed: [],
    });
    expect(song('forever_young')).not.toHaveProperty('topCredit');
  });

  it('marks a joint billing instead of picking one of the two', () => {
    expect(song('duet')).toMatchObject({
      status: 'unmatched',
      billed: [],
      jointCredit: true,
    });
  });

  it('ignores a karaoke credit "as" our artist', () => {
    expect(song('the_light').billed).toEqual([
      {
        mbid: 'common-rapper',
        name: 'Common',
        disambiguation: 'US rapper',
        recordings: 1,
        onRelease: false,
      },
    ]);
  });

  it('keeps the evidence behind each billed id, the band’s own record first', () => {
    expect(song('brick_house').billed).toEqual([
      {
        mbid: 'commodores',
        name: 'Commodores',
        recordings: 1,
        onRelease: true,
      },
      {
        mbid: 'rockabilly',
        name: 'The Commodores',
        disambiguation: '50s US rockabilly group',
        recordings: 2,
        onRelease: false,
      },
    ]);
  });

  it('warns when the title is credited more often to someone unbilled', () => {
    expect(song('stir_it_up')).toMatchObject({
      billed: [{ mbid: 'bob', recordings: 1 }],
      topCredit: {
        mbid: 'wailers',
        name: 'Bob Marley & The Wailers',
        recordings: 3,
      },
    });
    // Billed to the artist most credited: nothing to say.
    expect(song('lets_get_it_on')).not.toHaveProperty('topCredit');
  });

  it('tells a refused query from one never asked', () => {
    expect(song('air')).toMatchObject({
      status: 'error',
      cacheKeys: ['talking heads|air'],
    });
    expect(song('nowhere')).toMatchObject({
      status: 'missing',
      cacheKeys: [],
      artistSlug: null,
    });
  });

  it('reaches a billing that is no registry name through its linked lead act', () => {
    // "Rufus and Chaka Khan" is the band Rufus's billing; the song file links
    // it with `origin.artistGlobeId`, and the graph reads that link too.
    const RUFUS: MbArtistRef = { id: 'rufus', name: 'Rufus' };
    const CHAKA: MbArtistRef = { id: 'chaka', name: 'Chaka Khan' };
    const aintNobody = {
      id: 'aint_nobody',
      title: 'Ain’t Nobody',
      artist: 'Rufus and Chaka Khan',
    };
    const stage = (artistGlobeId?: string) =>
      extractCacheStage({
        songs: [{ ...aintNobody, ...(artistGlobeId ? { artistGlobeId } : {}) }],
        registry: [
          { slug: 'chaka-khan', name: 'Chaka Khan' },
          { slug: 'rufus', name: 'Rufus' },
        ],
        mbCache: {
          'rufus and chaka khan|aint nobody': {
            recordings: [
              {
                id: 'rec-aint-nobody',
                title: 'Ain’t Nobody',
                'artist-credit': credit(RUFUS, CHAKA),
              },
            ],
          },
        },
      });

    const linked = stage('rufus');
    expect(linked.songs[0]).toMatchObject({
      artist: 'Rufus and Chaka Khan',
      artistSlug: 'rufus',
      status: 'matched',
      billed: [{ mbid: 'rufus', name: 'Rufus' }],
    });
    // The band gets the song's title as its own evidence.
    expect(linked.artists).toEqual([
      expect.objectContaining({
        slug: 'rufus',
        songIds: ['aint_nobody'],
        candidates: [expect.objectContaining({ mbid: 'rufus' })],
      }),
    ]);
    // Without the link the billing names nobody in the registry.
    expect(stage().songs[0]).toMatchObject({ artistSlug: null, billed: [] });
    expect(stage().artists).toEqual([]);
  });

  it('gathers each registry artist’s candidates, best supported first', () => {
    const { artists } = run();

    expect(artists.map((a) => a.slug)).toEqual([
      'bob-dylan',
      'bob-marley',
      'common',
      'jimi-hendrix',
      'kool-and-the-gang',
      'marvin-gaye',
      'michael-jackson-and-justin-timberlake',
      'talking-heads',
      'the-commodores',
    ]);
    const common = artists.find((a) => a.slug === 'common');
    expect(common).toEqual({
      slug: 'common',
      name: 'Common',
      songIds: ['the_light', 'go'],
      // One song each, neither on a record: the two Commons are the
      // ambiguity scoring must settle.
      candidates: [
        {
          mbid: 'common-band',
          name: 'Common',
          disambiguation: 'Finnish band',
          recordings: 1,
          songIds: ['go'],
          releaseSongIds: [],
        },
        {
          mbid: 'common-rapper',
          name: 'Common',
          disambiguation: 'US rapper',
          recordings: 1,
          songIds: ['the_light'],
          releaseSongIds: [],
        },
      ],
    });
    expect(common && isWeakBilling(common)).toBe(true);
  });

  it('ranks a tie on songs by the evidence behind them', () => {
    const commodores = run().artists.find((a) => a.slug === 'the-commodores');
    // Both are billed on both songs, and the rockabilly group has more
    // recordings; only the band is on a record of its own.
    expect(
      commodores?.candidates.map(({ mbid, songIds, recordings }) => ({
        mbid,
        songs: songIds.length,
        recordings,
      })),
    ).toEqual([
      { mbid: 'commodores', songs: 2, recordings: 2 },
      { mbid: 'rockabilly', songs: 2, recordings: 3 },
    ]);
    expect(commodores?.candidates[0].releaseSongIds).toEqual(['brick_house']);
    expect(commodores && isWeakBilling(commodores)).toBe(false);
  });

  it('counts what it found', () => {
    expect(run().counts).toEqual({
      songs: 12,
      // Not "nowhere" (never asked) or "forever_young" (only Rod Stewart's).
      cached: 10,
      errors: 1,
      exactMatch: 8,
      withBilledArtist: 8,
      jointCredits: 1,
      withAlbum: 2,
      withSingle: 1,
      byTitle: 2,
      topCreditElsewhere: 1,
      yearsFromMusicBrainz: 1,
      songArtistNames: 10,
      songArtistNamesWithId: 6,
      songArtistNamesWithSeveralIds: 2,
      songsOutsideRegistry: 1,
      registryArtists: 10,
      registryArtistsWithSongs: 9,
      registryArtistsWithId: 6,
      registryArtistsWithSeveralIds: 2,
      // Billed on bare recordings, no record behind them: Common, Bob
      // Marley, Kool & the Gang and Jimi Hendrix. Not Marvin Gaye or the
      // Commodores.
      registryArtistsWeak: 4,
    });
  });
});

describe('keys and titles', () => {
  it('makes a leading article optional, but not the "a" of a two-letter name', () => {
    expect(nameKey('The Beatles')).toBe('beatles');
    expect(nameKey('A Taste of Honey')).toBe(nameKey('Taste Of Honey'));
    expect(nameKey('a‐ha')).toBe('a ha');
    expect(nameKey('A Tribe Called Quest')).toBe('tribe called quest');
  });

  it('reproduces enrichSongYears.mjs’s key, accents dropped', () => {
    expect(legacyKeyPart('Beyoncé')).toBe('beyonc');
    expect(legacyKeyPart('Don’t Stop Believin’')).toBe('dont stop believin');
    expect(legacyKeys({ artist: 'Hall & Oates', title: 'Maneater' })).toEqual([
      'hall oates|maneater',
      'hall amp oates|maneater',
      'hall and oates|maneater',
    ]);
  });

  it('drops pressing suffixes, and nothing else', () => {
    expect(stripVersion('Gimme Shelter (Remastered 2019)')).toBe(
      'Gimme Shelter',
    );
    expect(stripVersion('Superstition - Single Version')).toBe('Superstition');
    expect(stripVersion('Uptown Funk (feat. Bruno Mars) [Radio Edit]')).toBe(
      'Uptown Funk',
    );
    expect(stripVersion('(Sittin’ On) The Dock of the Bay')).toBe(
      '(Sittin’ On) The Dock of the Bay',
    );
    expect(stripVersion('I Can’t Go For That (No Can Do)')).toBe(
      'I Can’t Go For That (No Can Do)',
    );
  });

  it('knows a live take or a remix when it sees one', () => {
    expect(
      isAlternateTake({
        id: '1',
        title: 'Africa',
        disambiguation: 'live, 1993',
      }),
    ).toBe(true);
    expect(isAlternateTake({ id: '2', title: 'Africa (Remix)' })).toBe(true);
    expect(
      isAlternateTake({ id: '3', title: 'Africa (Live) (Remastered)' }),
    ).toBe(true);
    expect(isAlternateTake({ id: '4', title: 'Africa' })).toBe(false);
    expect(isAlternateTake({ id: '5', title: 'Live and Let Die' })).toBe(false);
  });
});
