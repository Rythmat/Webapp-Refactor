import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import {
  formatJsonLines,
  JSON_LINES_LAYOUTS,
} from '@/scripts/repoContent/jsonLines';
import {
  type ArtistRow,
  composeArtists,
  composePlaces,
  placeHome,
  RecordComposeError,
  type RosterArtist,
  splitArtist,
  splitArtists,
  splitPlaces,
} from '../compose';
import type { ArtistRecord, PlaceRecord } from '../types';

/**
 * Artists and places each live in two files. The roster fields of a roster
 * artist live in artistRegistry.ts, everything else in artists.json; a
 * place's `pin` chooses between cities.ts and places.json. Composing and
 * splitting must be exact inverses, or a save would move data nobody edited.
 */

/** What the store holds: only what a JSON request could carry. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Fails unless `run` throws a RecordComposeError; returns its problems. */
function problemsOf(run: () => unknown): readonly string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof RecordComposeError) return error.problems;
    throw error;
  }
  throw new Error('expected a RecordComposeError');
}

const registry: RosterArtist[] = [
  { slug: 'abba', name: 'ABBA', aliases: ['Abba'] },
  { slug: 'adele', name: 'Adele' },
  { slug: 'a-ha', name: 'A-ha' },
];

const rows: ArtistRow[] = [
  {
    slug: 'abba',
    group: true,
    born: { date: '1972', placeId: 'stockholm' },
    externalIds: { mbid: 'd87e52c5' },
  },
  { slug: 'adele', genreIds: ['soul'], unverified: true, source: 'wikidata' },
  // Off the roster: the whole record.
  {
    slug: 'benny-andersson',
    name: 'Benny Andersson',
    aliases: ['Benny'],
    instrumentIds: ['piano'],
  },
];

const roster = new Set(registry.map((entry) => entry.slug));

describe('composing artists', () => {
  it('is a roster artist’s entry with its row’s other fields after it', () => {
    const [abba] = composeArtists(registry, rows);
    expect(abba).toEqual({
      slug: 'abba',
      name: 'ABBA',
      aliases: ['Abba'],
      group: true,
      born: { date: '1972', placeId: 'stockholm' },
      externalIds: { mbid: 'd87e52c5' },
    });
    // The roster's fields first, as the record schema declares them.
    expect(Object.keys(abba)).toEqual([
      'slug',
      'name',
      'aliases',
      'group',
      'born',
      'externalIds',
    ]);
  });

  it('keeps roster order, then the artists off the roster', () => {
    expect(composeArtists(registry, rows).map((a) => a.slug)).toEqual([
      'abba',
      'adele',
      'a-ha',
      'benny-andersson',
    ]);
  });

  it('is the entry alone for a roster artist with no row', () => {
    const artists = composeArtists(registry, rows);
    expect(artists.find((a) => a.slug === 'a-ha')).toEqual({
      slug: 'a-ha',
      name: 'A-ha',
    });
  });

  it('is the row, whole, for an artist off the roster', () => {
    const artists = composeArtists(registry, rows);
    expect(artists.find((a) => a.slug === 'benny-andersson')).toEqual(rows[2]);
  });

  it('matches the globe roster exactly when there are no rows', () => {
    // The live registry, compared with itself at this moment rather than
    // with fixed counts: other work edits it.
    expect(composeArtists(ARTIST_REGISTRY, [])).toEqual(plain(ARTIST_REGISTRY));
  });

  it('does not change its inputs', () => {
    const frozenRegistry = plain(registry).map((entry) => Object.freeze(entry));
    const frozenRows = plain(rows).map((row) => Object.freeze(row));
    const before = plain([frozenRegistry, frozenRows]);
    composeArtists(frozenRegistry, frozenRows);
    expect([frozenRegistry, frozenRows]).toEqual(before);
  });

  it('refuses a roster artist’s row that holds roster fields', () => {
    expect(
      problemsOf(() =>
        composeArtists(registry, [{ slug: 'adele', name: 'Adele Adkins' }]),
      ),
    ).toEqual([
      "artists.json's row for 'adele' holds name, which the roster (artistRegistry.ts) owns for a roster artist",
    ]);
    expect(
      problemsOf(() =>
        composeArtists(registry, [{ slug: 'a-ha', aliases: ['aha'] }]),
      )[0],
    ).toMatch(/row for 'a-ha' holds aliases/);
  });

  it('refuses a row off the roster with no name', () => {
    expect(
      problemsOf(() =>
        composeArtists(registry, [{ slug: 'gone', genreIds: ['pop'] }]),
      )[0],
    ).toMatch(/row for 'gone' has no name, and 'gone' is not on the roster/);
  });

  it('refuses a roster entry holding a field the roster does not keep', () => {
    const odd = { slug: 'odd', name: 'Odd', group: true } as RosterArtist;
    expect(problemsOf(() => composeArtists([odd], []))[0]).toMatch(
      /roster entry 'odd' holds fields that belong in artists.json: group/,
    );
  });

  it('lists every problem at once, duplicates included', () => {
    const problems = problemsOf(() =>
      composeArtists(
        [...registry, { slug: 'adele', name: 'Adele' }],
        [
          { slug: 'abba', name: 'ABBA' },
          { slug: 'x', genreIds: [] },
          { slug: 'x', genreIds: [] },
        ],
      ),
    );
    expect(problems).toEqual(
      expect.arrayContaining([
        "the roster lists 'adele' more than once",
        "artists.json has more than one row for 'x'",
        expect.stringMatching(/row for 'abba' holds name/),
        expect.stringMatching(/row for 'x' has no name/),
      ]),
    );
  });
});

describe('splitting an artist', () => {
  const abba = composeArtists(registry, rows)[0];

  it('sends only slug, name and aliases to the registry for a roster artist', () => {
    const { roster: entry, row } = splitArtist(abba, true);
    expect(entry).toEqual({ slug: 'abba', name: 'ABBA', aliases: ['Abba'] });
    expect(row).toEqual({
      slug: 'abba',
      group: true,
      born: { date: '1972', placeId: 'stockholm' },
      externalIds: { mbid: 'd87e52c5' },
    });
    expect(row).not.toHaveProperty('name');
    expect(row).not.toHaveProperty('aliases');
  });

  it('writes no row for a roster artist with nothing but roster fields', () => {
    expect(splitArtist({ slug: 'a-ha', name: 'A-ha' }, true)).toEqual({
      roster: { slug: 'a-ha', name: 'A-ha' },
      row: null,
    });
  });

  it('sends an artist off the roster whole to its row', () => {
    expect(splitArtist(abba, false)).toEqual({ roster: null, row: abba });
  });

  it('sends each edited field to the file that holds it', () => {
    const edited: ArtistRecord = {
      ...abba,
      name: 'ABBA (band)',
      aliases: ['Abba', 'A.B.B.A.'],
      activeFrom: 1972,
      born: { date: '1972-06' },
    };
    const { roster: entry, row } = splitArtist(edited, true);
    expect(entry).toEqual({
      slug: 'abba',
      name: 'ABBA (band)',
      aliases: ['Abba', 'A.B.B.A.'],
    });
    expect(row).toEqual({
      slug: 'abba',
      group: true,
      born: { date: '1972-06' },
      activeFrom: 1972,
      externalIds: { mbid: 'd87e52c5' },
    });
  });

  it('drops undefined fields rather than writing them', () => {
    const { roster: entry, row } = splitArtist(
      { slug: 'a', name: 'A', aliases: undefined, bio: undefined },
      true,
    );
    expect(entry).toEqual({ slug: 'a', name: 'A' });
    expect(entry).not.toHaveProperty('aliases');
    expect(row).toBeNull();
  });

  it('moves the roster fields between the files when it joins or leaves the roster', () => {
    const benny = composeArtists(registry, rows)[3];
    // Joining: name and aliases leave the row for the registry.
    const joined = splitArtist(benny, true);
    expect(joined.roster).toEqual({
      slug: 'benny-andersson',
      name: 'Benny Andersson',
      aliases: ['Benny'],
    });
    expect(joined.row).toEqual({
      slug: 'benny-andersson',
      instrumentIds: ['piano'],
    });
    // And composing the new files gives the same artist back.
    expect(
      composeArtists(
        [...registry, joined.roster as RosterArtist],
        [rows[0], rows[1], joined.row as ArtistRow],
      )[3],
    ).toEqual(benny);
    // Leaving: the row takes the whole record back.
    expect(splitArtist(benny, false)).toEqual({ roster: null, row: benny });
  });
});

describe('composing and splitting artists round-trips', () => {
  it('gives back the registry and the rows it was composed from', () => {
    const composed = composeArtists(registry, rows);
    const split = splitArtists(composed, roster);
    expect(split.registry).toEqual(registry);
    expect(split.rows).toEqual(rows);
    // Byte for byte, once written as the JSON-lines file.
    const layout = JSON_LINES_LAYOUTS.artist;
    expect(formatJsonLines(split.rows, layout)).toBe(
      formatJsonLines(rows, layout),
    );
  });

  it('gives back the live roster, with no rows, when nothing else is known', () => {
    const live = plain(ARTIST_REGISTRY);
    const split = splitArtists(
      composeArtists(live, []),
      new Set(live.map((entry) => entry.slug)),
    );
    expect(split.registry).toEqual(live);
    expect(split.rows).toEqual([]);
  });

  it('keeps a roster artist’s row fields in the live roster’s round trip', () => {
    const live = plain(ARTIST_REGISTRY);
    const [first] = live;
    const extra: ArtistRow = {
      slug: first.slug,
      born: { date: '1970' },
      genreIds: ['rock'],
    };
    const composed = composeArtists(live, [extra]);
    expect(composed[0]).toEqual({ ...first, ...extra });
    const split = splitArtists(composed, new Set(live.map((e) => e.slug)));
    expect(split.registry).toEqual(live);
    expect(split.rows).toEqual([extra]);
  });

  it('refuses two artists with one slug', () => {
    expect(
      problemsOf(() =>
        splitArtists(
          [
            { slug: 'a', name: 'A' },
            { slug: 'a', name: 'A again' },
          ],
          new Set(),
        ),
      ),
    ).toEqual(["more than one artist has the slug 'a'"]);
  });
});

// ── Places ──────────────────────────────────────────────────────────────────

const city = (id: string, extra: Partial<PlaceRecord> = {}): PlaceRecord => ({
  id,
  name: id,
  country: 'US',
  subdivision: '',
  region: 'north-america',
  coordinates: [0, 0],
  genres: [],
  description: '',
  activeDecades: [],
  ...extra,
});

const cities = [
  city('detroit'),
  city('new-york', { aliases: ['NYC'] }),
  city('memphis', { pin: true }),
];
const unpinned = [
  city('bearsville', { pin: false }),
  city('barnes', { pin: false, country: 'UK' }),
];

describe('where a place lives', () => {
  it('is the globe’s cities when pin is absent or true, places.json when false', () => {
    expect(placeHome({})).toBe('cities');
    expect(placeHome({ pin: undefined })).toBe('cities');
    expect(placeHome({ pin: true })).toBe('cities');
    expect(placeHome({ pin: false })).toBe('places');
  });
});

describe('composing places', () => {
  it('is the globe’s cities in order, then the unpinned places', () => {
    expect(composePlaces(cities, unpinned).map((p) => p.id)).toEqual([
      'detroit',
      'new-york',
      'memphis',
      'bearsville',
      'barnes',
    ]);
  });

  it('matches the globe’s cities exactly when nothing is unpinned', () => {
    expect(composePlaces(CITIES, [])).toEqual(plain(CITIES));
  });

  it('splits back into the files it came from', () => {
    const split = splitPlaces(composePlaces(cities, unpinned));
    expect(split.cities).toEqual(cities);
    expect(split.places).toEqual(unpinned);
  });

  it('splits the live cities back into cities.ts and nothing else', () => {
    const live = plain(CITIES);
    expect(splitPlaces(composePlaces(live, []))).toEqual({
      cities: live,
      places: [],
    });
  });

  it('moves a place to the other file when its pin flips', () => {
    const composed = composePlaces(cities, unpinned);
    const flipped = composed.map((place) => {
      if (place.id === 'detroit') return { ...place, pin: false };
      if (place.id === 'barnes') return { ...place, pin: true };
      if (place.id === 'bearsville') {
        // Deleting the field means pinned too.
        const unset = { ...place };
        delete unset.pin;
        return unset;
      }
      return place;
    });
    const split = splitPlaces(flipped);
    expect(split.cities.map((p) => p.id)).toEqual([
      'new-york',
      'memphis',
      'bearsville',
      'barnes',
    ]);
    expect(split.places).toEqual([{ ...cities[0], pin: false }]);
    // And the moved places compose again from their new files.
    expect(composePlaces(split.cities, split.places)).toHaveLength(5);
  });

  it('writes places.json as JSON lines keyed by id', () => {
    const { places } = splitPlaces(composePlaces(cities, unpinned));
    const text = formatJsonLines(places, JSON_LINES_LAYOUTS.globe_city);
    expect(text.split('\n').slice(1, 3)).toEqual([
      expect.stringMatching(/^ {2}\{"id":"barnes",/),
      expect.stringMatching(/^ {2}\{"id":"bearsville",.*"pin":false\}$/),
    ]);
  });

  it('refuses a place in the wrong file, or in two', () => {
    const problems = problemsOf(() =>
      composePlaces(
        [city('detroit'), city('flint', { pin: false })],
        [city('barnes'), city('detroit', { pin: false })],
      ),
    );
    expect(problems).toEqual([
      "more than one place has the id 'detroit'",
      "cities.ts holds 'flint' with pin: false; a place without a pin belongs in places.json",
      "places.json holds 'barnes' without pin: false; a place with a pin belongs in cities.ts",
    ]);
    expect(
      problemsOf(() => splitPlaces([city('a'), city('a', { pin: false })])),
    ).toEqual(["more than one place has the id 'a'"]);
  });

  it('does not change its inputs', () => {
    const frozen = plain(cities).map((c) => Object.freeze(c));
    const before = plain(frozen);
    composePlaces(frozen, []);
    splitPlaces(frozen);
    expect(frozen).toEqual(before);
  });
});
