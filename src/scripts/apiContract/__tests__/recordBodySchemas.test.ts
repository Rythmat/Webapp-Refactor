import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { resolvePlace } from '@/content/graph/places';
import { toSlug } from '@/content/graph/slugs';
import { generateRecordSchema } from '@/scripts/apiContract/generateRecordSchema';
import {
  generateBodySchema,
  UnsupportedType,
} from '@/scripts/apiContract/generateSongSchema';
import { recordBodySchemas } from '@/scripts/apiContract/recordBodySchemas';

/**
 * The record kinds' contract, kept honest the same two ways as the song's:
 * the committed schemas are regenerated from the type files and must match,
 * and the data the API will be seeded with must pass them.
 */

const OUT = 'src/scripts/apiContract/recordBodySchemas.ts';

const pretty = async (source: string) =>
  format(source, { ...(await resolveConfig(OUT)), parser: 'typescript' });

describe('the generated record schemas', () => {
  it('match what the type files say today', async () => {
    const wanted = await pretty(
      generateRecordSchema({
        records: {
          name: 'records/types.ts',
          text: readFileSync('src/content/records/types.ts', 'utf8'),
        },
        atlas: {
          name: 'atlas/types/index.ts',
          text: readFileSync('src/components/atlas/types/index.ts', 'utf8'),
        },
        songs: {
          name: 'songLibrary.ts',
          text: readFileSync('src/curriculum/types/songLibrary.ts', 'utf8'),
        },
      }),
    );
    if (process.env.WRITE_CONTRACT) writeFileSync(OUT, wanted);
    expect(readFileSync(OUT, 'utf8')).toBe(wanted);
  });
});

describe('the generator', () => {
  const generate = (members: string) =>
    generateBodySchema({
      sources: [{ name: 't.ts', text: `export interface T {\n${members}\n}` }],
      wanted: ['T'],
      header: '',
      footer: '',
    });

  it('turns a @pattern tag into a regex, and keeps the rest of the comment', () => {
    const out = generate(`
  /**
   * A path.
   * @pattern ^a/b\\d$
   */
  path?: string;`);
    expect(out).toContain('path: z.string().regex(/^a\\/b\\d$/).optional(),');
    expect(out).toContain('/** A path. */');
    expect(out).not.toContain('@pattern');
  });

  it('writes unknown as z.unknown()', () => {
    expect(generate('value: unknown;')).toContain('value: z.unknown(),');
  });

  it('refuses a @pattern it cannot honour', () => {
    const tagged =
      (type: string, pattern = '^\\d+$') =>
      () =>
        generate(`/** @pattern ${pattern} */\n  x: ${type};`);
    expect(tagged('number')).toThrow(UnsupportedType);
    expect(tagged('string[]')).toThrow(UnsupportedType);
    expect(tagged('string', '(')).toThrow(UnsupportedType);
    expect(tagged('string', '')).toThrow(UnsupportedType);
    expect(tagged('string')).not.toThrow();
    // A tag inside a sentence would stay in the comment, unenforced.
    expect(() =>
      generate(`/** A year. @pattern ^\\d{4}$ */\n  x: string;`),
    ).toThrow(UnsupportedType);
    expect(() =>
      generate(
        `/**\n   * @pattern ^a$\n   * @pattern ^b$\n   */\n  x: string;`,
      ),
    ).toThrow(UnsupportedType);
  });
});

const problems = (
  schema: (typeof recordBodySchemas)[keyof typeof recordBodySchemas],
  bodies: readonly unknown[],
  label: (b: never) => string,
) =>
  bodies
    .map((body) => ({ body, result: schema.safeParse(body) }))
    .filter((r) => !r.result.success)
    .slice(0, 5)
    .map(
      (r) =>
        `${label(r.body as never)}: ${r.result.error?.issues
          .slice(0, 2)
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')}`,
    );

describe('the seed data against the schemas', () => {
  it('accepts every registered artist as an artist body', () => {
    expect(ARTIST_REGISTRY.length).toBeGreaterThan(880);
    expect(
      problems(
        recordBodySchemas.artist,
        ARTIST_REGISTRY,
        (a: { slug: string }) => a.slug,
      ),
    ).toEqual([]);
  });

  it('accepts every globe city as a place body', () => {
    expect(CITIES.length).toBeGreaterThan(250);
    expect(
      problems(
        recordBodySchemas.globe_city,
        CITIES,
        (c: { id: string }) => c.id,
      ),
    ).toEqual([]);
  });

  it('accepts every bundled globe event as a globe_event body', () => {
    // Both kinds: the hand-authored `evt-` events and the `song-` events
    // derived from the charts. Body v2 only adds optional fields, so the
    // events as the globe has them today pass unchanged.
    expect(BUNDLED_MUSIC_HISTORY).toHaveLength(1725);
    expect(
      problems(
        recordBodySchemas.globe_event,
        BUNDLED_MUSIC_HISTORY,
        (e: { id: string }) => e.id,
      ),
    ).toEqual([]);
  });

  it('accepts the pilot sessions as studio and label bodies', () => {
    // The four credited songs name these; they seed the new kinds.
    const sessions = [
      {
        studio: 'Hitsville U.S.A.',
        label: 'Tamla',
        city: 'Detroit',
        country: 'USA',
      },
      {
        studio: 'Sunset Sound',
        label: 'Columbia',
        city: 'Los Angeles',
        country: 'USA',
      },
      {
        studio: 'Britannia Row',
        label: 'Chrysalis',
        city: 'London',
        country: 'UK',
      },
      {
        studio: 'Abbey Road Studios',
        label: 'Apple',
        city: 'London',
        country: 'UK',
      },
    ];
    for (const s of sessions) {
      const placeId = resolvePlace(s.city, s.country) ?? undefined;
      expect(placeId, s.city).toBeDefined();
      expect(
        recordBodySchemas.studio.safeParse({
          slug: toSlug(s.studio),
          name: s.studio,
          placeId,
        }).success,
      ).toBe(true);
      expect(
        recordBodySchemas.label.safeParse({
          slug: toSlug(s.label),
          name: s.label,
          placeId,
        }).success,
      ).toBe(true);
    }
  });

  it('accepts a fully described artist, group and record', () => {
    expect(
      recordBodySchemas.artist.safeParse({
        slug: 'the-funk-brothers',
        name: 'The Funk Brothers',
        group: true,
        members: [
          {
            artistId: 'james-jamerson',
            from: 1959,
            to: 1972,
            instrumentIds: ['electric-bass'],
          },
        ],
        basedInPlaceId: 'detroit',
        activeFrom: 1959,
        activeTo: 1972,
        genreIds: ['rnb'],
        labelIds: ['motown'],
        influencedBy: [
          { artistId: 'ray-charles', unverified: true, source: 'wikipedia' },
        ],
        externalIds: { mbid: 'x', wikidata: 'Q1' },
        born: { date: '1959' },
      }).success,
    ).toBe(true);
    expect(
      recordBodySchemas.release.safeParse({
        slug: 'marvin-gaye-and-tammi-terrell-united',
        title: 'United',
        artistIds: ['marvin-gaye', 'tammi-terrell'],
        format: 'album',
        year: 1967,
        labelId: 'tamla',
      }).success,
    ).toBe(true);
  });
});

describe('the event body (v2)', () => {
  const [event] = BUNDLED_MUSIC_HISTORY.filter((e) => e.id.startsWith('evt-'));
  const parse = (body: object) =>
    recordBodySchemas.globe_event.safeParse({ ...event, ...body }).success;

  it('takes the stored ids, and [] for "reviewed: none"', () => {
    expect(
      parse({
        artistIds: ['marvin-gaye'],
        songIds: ['whats_going_on'],
        placeId: 'detroit',
        releaseIds: ['marvin-gaye-whats-going-on'],
        studioIds: ['hitsville-u-s-a'],
        labelIds: ['tamla'],
        unverified: true,
        source: 'console',
      }),
    ).toBe(true);
    expect(
      parse({
        artistIds: [],
        songIds: [],
        releaseIds: [],
        studioIds: [],
        labelIds: [],
      }),
    ).toBe(true);
  });

  it("takes what a song- event carries of its song's recording", () => {
    expect(
      parse({
        id: 'song-aint_no_mountain_high_enough',
        label: 'Tamla',
        studio: 'Hitsville U.S.A.',
        recordedYear: 1966,
        credits: [
          {
            name: 'Marvin Gaye',
            role: 'vocals',
            primary: true,
            artistGlobeId: 'marvin-gaye',
            source: 'musicbrainz',
          },
          { name: 'The Funk Brothers', role: 'performer', ensemble: true },
        ],
      }),
    ).toBe(true);
  });

  it('refuses a typo, a bare id and a credit role nobody has', () => {
    expect(parse({ artistId: 'marvin-gaye' })).toBe(false);
    expect(parse({ placeId: ['detroit'] })).toBe(false);
    expect(parse({ credits: [{ name: 'X', role: 'drummer' }] })).toBe(false);
    expect(parse({ location: { ...event.location, town: 'x' } })).toBe(false);
  });
});

describe("an artist's born", () => {
  const born = (date: string) =>
    recordBodySchemas.artist.safeParse({
      slug: 'marvin-gaye',
      name: 'Marvin Gaye',
      born: { date, placeId: 'washington-dc' },
    }).success;

  it('takes a year, a year and month, or a full date', () => {
    expect(born('1939')).toBe(true);
    expect(born('1939-04')).toBe(true);
    expect(born('1939-04-02')).toBe(true);
    expect(born('1939-12-31')).toBe(true);
    expect(born('1939-10-10')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(born('1939-4-2')).toBe(false);
    expect(born('39')).toBe(false);
    expect(born('1939-04-02T00:00')).toBe(false);
    expect(born('April 2, 1939')).toBe(false);
    expect(born('')).toBe(false);
    // No such month, and no such day in any month. Whether the 30th is in
    // February is integrity's to say; the pattern keeps to what a regex can.
    expect(born('1939-13')).toBe(false);
    expect(born('1939-00')).toBe(false);
    expect(born('1939-00-00')).toBe(false);
    expect(born('1939-04-00')).toBe(false);
    expect(born('1939-04-32')).toBe(false);
    expect(born('1939-02-30')).toBe(true);
  });

  it('keeps its flags and refuses a stray field', () => {
    const parse = (value: object) =>
      recordBodySchemas.artist.safeParse({
        slug: 'x',
        name: 'X',
        born: value,
      }).success;
    expect(parse({ date: '1977', unverified: true, source: 'wikidata' })).toBe(
      true,
    );
    expect(parse({ year: 1977 })).toBe(false);
  });
});

describe('the schemas are strict', () => {
  it('refuse a typo rather than keep it as a silent field', () => {
    expect(
      recordBodySchemas.artist.safeParse({ slug: 'x', name: 'X', aliasses: [] })
        .success,
    ).toBe(false);
    expect(
      recordBodySchemas.globe_city.safeParse({ ...CITIES[0], pinn: false })
        .success,
    ).toBe(false);
  });

  it('refuse values outside their vocabulary or shape', () => {
    expect(
      recordBodySchemas.release.safeParse({
        slug: 'x',
        title: 'X',
        artistIds: [],
        format: 'cassette',
      }).success,
    ).toBe(false);
    expect(
      recordBodySchemas.studio.safeParse({
        slug: 'x',
        name: 'X',
        coordinates: [1],
      }).success,
    ).toBe(false);
    expect(
      recordBodySchemas.globe_city.safeParse({ ...CITIES[0], region: 'mars' })
        .success,
    ).toBe(false);
  });
});
