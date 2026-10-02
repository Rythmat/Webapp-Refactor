import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  artistRecordSchema,
  externalIdsSchema,
  placeRecordSchema,
} from '@/scripts/apiContract/recordBodySchemas';
import {
  canonicalRecord,
  formatJsonLines,
  isCanonicalJsonLines,
  JSON_LINES_LAYOUTS,
  JsonLinesError,
  type JsonLinesKind,
  type JsonRecord,
  parseJsonLines,
} from '../jsonLines';

/**
 * The JSON-lines files repo mode keeps releases, studios, labels, unpinned
 * places and artist fields in: one record per line, sorted by identity, keys
 * in schema order at every depth, so the same records are always the same
 * bytes.
 */

const artists = JSON_LINES_LAYOUTS.artist;
const places = JSON_LINES_LAYOUTS.globe_city;

/** A group, its keys deliberately out of schema order at every depth. */
const abba = {
  source: 'musicbrainz',
  externalIds: { wikidata: 'Q42', mbid: 'd87e52c5' },
  influencedBy: [{ source: 'wikidata', artistId: 'the-beatles' }],
  members: [
    { to: 1982, from: 1972, artistId: 'agnetha-faltskog' },
    { instrumentIds: ['piano', 'keys'], artistId: 'benny-andersson' },
  ],
  born: { unverified: true, placeId: 'stockholm', date: '1972' },
  genreIds: ['pop', 'europop'],
  group: true,
  name: 'ABBA',
  slug: 'abba',
};

/** Its keys in the order the artist schema declares them. */
const abbaInOrder =
  '{"slug":"abba","name":"ABBA","group":true,' +
  '"members":[{"artistId":"agnetha-faltskog","from":1972,"to":1982},' +
  '{"artistId":"benny-andersson","instrumentIds":["piano","keys"]}],' +
  '"born":{"date":"1972","placeId":"stockholm","unverified":true},' +
  '"genreIds":["pop","europop"],' +
  '"influencedBy":[{"artistId":"the-beatles","source":"wikidata"}],' +
  '"externalIds":{"mbid":"d87e52c5","wikidata":"Q42"},' +
  '"source":"musicbrainz"}';

const place = {
  pin: false,
  activeDecades: [],
  description: '',
  genres: [],
  coordinates: [51.4741, -0.2352],
  region: 'west-europe',
  subdivision: '',
  country: 'UK',
  name: 'Barnes',
  aliases: ['Barnes, London'],
  id: 'barnes',
};

/** Fisher–Yates with a fixed seed, so a failure reproduces. */
function shuffled<T>(items: readonly T[], seed = 7): T[] {
  const out = [...items];
  let state = seed;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The same object with its keys reversed at every depth. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, field]) => [key, reversedKeys(field)]),
    );
  return value;
}

describe('canonical key order', () => {
  it('follows the schema, recursing into born, externalIds, members and influencedBy', () => {
    expect(JSON.stringify(canonicalRecord(abba, artistRecordSchema))).toBe(
      abbaInOrder,
    );
  });

  it('puts every top-level key where the schema declares it', () => {
    const declared = Object.keys(artistRecordSchema.shape);
    const keys = Object.keys(canonicalRecord(abba, artistRecordSchema));
    expect(keys).toEqual(declared.filter((key) => key in abba));
  });

  it('keeps a place’s City fields first and its record fields after', () => {
    expect(Object.keys(canonicalRecord(place, placeRecordSchema))).toEqual([
      'id',
      'name',
      'country',
      'subdivision',
      'region',
      'coordinates',
      'genres',
      'description',
      'activeDecades',
      'aliases',
      'pin',
    ]);
  });

  it('keeps array order, which means something (billing, members)', () => {
    const release = {
      slug: 'x',
      title: 'X',
      format: 'album',
      artistIds: ['b-act', 'a-act'],
    };
    expect(
      canonicalRecord(release, JSON_LINES_LAYOUTS.release.schema).artistIds,
    ).toEqual(['b-act', 'a-act']);
  });

  it('drops undefined fields at every depth, as a JSON round trip would', () => {
    const out = canonicalRecord(
      { slug: 'a', name: 'A', bio: undefined, born: { date: undefined } },
      artistRecordSchema,
    );
    expect(JSON.stringify(out)).toBe('{"slug":"a","name":"A","born":{}}');
  });

  it('sorts the keys of a shape the schema does not spell out', () => {
    const schema = z.object({
      id: z.string(),
      extra: z.record(z.object({ b: z.number(), a: z.number() })),
      loose: z.unknown(),
    });
    const out = canonicalRecord(
      {
        loose: { z: 1, a: { d: 1, c: 2 } },
        extra: { y: { a: 1, b: 2 }, x: { b: 3, a: 4 } },
        id: 'k',
      },
      schema,
    );
    expect(JSON.stringify(out)).toBe(
      '{"id":"k","extra":{"x":{"b":3,"a":4},"y":{"b":2,"a":1}},' +
        '"loose":{"a":{"c":2,"d":1},"z":1}}',
    );
  });

  it('refuses a key the schema does not declare, with its path', () => {
    expect(() =>
      canonicalRecord({ slug: 'a', name: 'A', city: 'x' }, artistRecordSchema),
    ).toThrow(/'city' is not a field/);
    expect(() =>
      canonicalRecord(
        { slug: 'a', name: 'A', members: [{ artistId: 'b', role: 'x' }] },
        artistRecordSchema,
      ),
    ).toThrow(/'members\[0\]\.role' is not a field/);
    expect(() =>
      canonicalRecord(
        { slug: 'a', name: 'A', born: { city: 'x', year: 1 } },
        artistRecordSchema,
      ),
    ).toThrow(/'born\.city', 'born\.year' are not fields/);
  });

  it('refuses what JSON cannot hold', () => {
    const bad = [
      { slug: 'a', name: 'A', activeFrom: Number.NaN },
      { slug: 'a', name: 'A', activeTo: Infinity },
      { slug: 'a', name: 'A', genreIds: ['pop', undefined] },
      { slug: 'a', name: 'A', bio: new Date(0) },
      { slug: 'a', name: 'A', bio: () => 'x' },
    ];
    for (const record of bad)
      expect(() => canonicalRecord(record, artistRecordSchema)).toThrow(
        JsonLinesError,
      );
  });
});

describe('the file layout', () => {
  it('is [, one record per line sorted by identity, ] and a newline', () => {
    const text = formatJsonLines(
      [
        { slug: 'b', name: 'B' },
        { name: 'A', slug: 'a' },
      ],
      artists,
    );
    expect(text).toBe(
      '[\n  {"slug":"a","name":"A"},\n  {"slug":"b","name":"B"}\n]\n',
    );
  });

  it('writes an empty file as []', () => {
    expect(formatJsonLines([], artists)).toBe('[]\n');
    expect(parseJsonLines('[]\n', artists)).toEqual([]);
  });

  it('sorts by code unit, not by locale', () => {
    const ids = ['b', 'ab', 'a-b', 'a', '9', '10', 'B', 'é', 'e'];
    const text = formatJsonLines(
      ids.map((slug) => ({ slug, name: slug })),
      artists,
    );
    expect(parseJsonLines(text, artists).map((row) => row.slug)).toEqual([
      '10',
      '9',
      'B',
      'a',
      'a-b',
      'ab',
      'b',
      'e',
      'é',
    ]);
  });

  it('identifies places by id', () => {
    const text = formatJsonLines(
      [place, { ...place, id: 'abalak', name: 'Abalak' }],
      places,
    );
    expect(parseJsonLines(text, places).map((row) => row.id)).toEqual([
      'abalak',
      'barnes',
    ]);
  });

  it('names the record that broke, and its identity', () => {
    expect(() =>
      formatJsonLines(
        [
          { slug: 'ok', name: 'Ok' },
          { slug: 'abba', name: 'ABBA', x: 1 },
        ],
        artists,
      ),
    ).toThrow(/slug 'abba': 'x' is not a field/);
    expect(() => formatJsonLines([{ name: 'No slug' }], artists)).toThrow(
      /record 1 has no slug/,
    );
    expect(() =>
      formatJsonLines(
        [
          { slug: 'a', name: 'A' },
          { slug: 'a', name: 'A again' },
        ],
        artists,
      ),
    ).toThrow(/more than one record has the slug 'a'/);
    expect(() => formatJsonLines([['not', 'a', 'record']], artists)).toThrow(
      /record 1 is not a plain object/,
    );
  });
});

describe('determinism', () => {
  const records: JsonRecord[] = [
    abba,
    { slug: 'adele', name: 'Adele', born: { date: '1988-05-05' } },
    { slug: 'a-ha', name: 'A-ha', group: true, aliases: ['a-ha'] },
    { slug: 'ace-of-base', name: 'Ace Of Base', activeFrom: 1990 },
  ];

  it('writes the same records twice as the same bytes', () => {
    expect(formatJsonLines(records, artists)).toBe(
      formatJsonLines(records, artists),
    );
  });

  it('writes the same bytes whatever order the records and their keys are in', () => {
    const text = formatJsonLines(records, artists);
    expect(formatJsonLines(shuffled(records), artists)).toBe(text);
    expect(
      formatJsonLines(
        records.map((record) => reversedKeys(record) as JsonRecord),
        artists,
      ),
    ).toBe(text);
  });

  it('reads back what it wrote, and writes that back byte for byte', () => {
    const text = formatJsonLines(records, artists);
    const read = parseJsonLines(text, artists);
    expect(formatJsonLines(read, artists)).toBe(text);
    expect(isCanonicalJsonLines(text, artists)).toBe(true);
    // Deep-equal to what went in, key order aside.
    const bySlug = new Map(read.map((row) => [row.slug, row]));
    for (const record of records)
      expect(bySlug.get(record.slug)).toEqual(record);
  });

  it('holds non-ASCII names byte for byte through a real file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'repo-content-jsonlines-'));
    try {
      const path = join(dir, 'artists.json');
      const text = formatJsonLines(
        [
          { slug: 'cesaria-evora', name: 'Cesária Évora' },
          { slug: 'bjork', name: 'Björk', aliases: ['Björk Guðmundsdóttir'] },
          { slug: 'christina', name: 'Lil’ Kim “quoted” \\ and  ' },
        ],
        artists,
      );
      writeFileSync(path, text, 'utf8');
      const bytes = readFileSync(path);
      expect(bytes.equals(Buffer.from(text, 'utf8'))).toBe(true);
      const again = formatJsonLines(
        parseJsonLines(bytes.toString('utf8'), artists, path),
        artists,
      );
      expect(Buffer.from(again, 'utf8').equals(bytes)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('says when a file is not in the canonical layout', () => {
    const text = formatJsonLines(records, artists);
    const read = parseJsonLines(text, artists);
    expect(isCanonicalJsonLines(JSON.stringify(read, null, 2), artists)).toBe(
      false,
    );
    expect(isCanonicalJsonLines(JSON.stringify(read), artists)).toBe(false);
    const unsorted = `[\n${[...read]
      .reverse()
      .map((row) => `  ${JSON.stringify(row)}`)
      .join(',\n')}\n]\n`;
    expect(isCanonicalJsonLines(unsorted, artists)).toBe(false);
    // Any JSON array of records still reads, whatever its layout.
    expect(parseJsonLines(unsorted, artists)).toHaveLength(records.length);
  });
});

describe('reading', () => {
  it('refuses what is not an array of identified, distinct records', () => {
    const cases: [string, RegExp][] = [
      ['[{"slug":"a",}]', /artists\.json is not JSON/],
      ['{"slug":"a"}', /artists\.json is not a JSON array/],
      ['[{"slug":"a"},"b"]', /artists\.json: record 2 is not an object/],
      ['[{"name":"A"}]', /artists\.json: record 1 has no slug/],
      ['[{"slug":""}]', /artists\.json: record 1 has no slug/],
      [
        '[{"slug":"a"},{"slug":"b"},{"slug":"a"}]',
        /artists\.json: more than one record has the slug 'a'/,
      ],
    ];
    for (const [text, message] of cases)
      expect(() => parseJsonLines(text, artists, 'artists.json')).toThrow(
        message,
      );
  });
});

describe('the importer’s records', () => {
  // The records the enrichment importer would create, as it last emitted
  // them: the real shapes (external ids, coordinates, unverified sources)
  // that the bulk import will write into these files. Read, never written;
  // compared with themselves, not with fixed counts, because the importer
  // may re-emit them at any time.
  const ARTIFACTS: [string, string, JsonLinesKind][] = [
    ['artists-created.json', 'artists', 'artist'],
    ['releases.json', 'releases', 'release'],
    ['studios.json', 'studios', 'studio'],
    ['labels.json', 'labels', 'label'],
    ['places.json', 'places', 'globe_city'],
    ['record-places.json', 'places', 'globe_city'],
  ];

  it.each(ARTIFACTS)(
    '%s round-trips byte for byte, in schema order',
    (file, key, kind) => {
      const layout = JSON_LINES_LAYOUTS[kind];
      const artifact = JSON.parse(
        readFileSync(`src/scripts/enrichment/suggestions/${file}`, 'utf8'),
      ) as Record<string, { body: JsonRecord }[]>;
      const bodies = artifact[key].map((entry) => entry.body);
      expect(bodies.length).toBeGreaterThan(0);

      const text = formatJsonLines(bodies, layout);
      const read = parseJsonLines(text, layout, file);
      expect(read).toHaveLength(bodies.length);
      expect(formatJsonLines(read, layout)).toBe(text);
      expect(formatJsonLines(shuffled(bodies), layout)).toBe(text);

      const declared = Object.keys(layout.schema.shape);
      const idsDeclared = Object.keys(externalIdsSchema.shape);
      const byId = new Map(read.map((row) => [row[layout.identity], row]));
      for (const body of bodies) {
        const row = byId.get(body[layout.identity]);
        expect(row).toEqual(body);
        // Keys where the schema declares them, at the top and nested.
        expect(Object.keys(row ?? {})).toEqual(
          declared.filter((field) => field in body),
        );
        const ids = row?.externalIds;
        if (ids && typeof ids === 'object')
          expect(Object.keys(ids)).toEqual(
            idsDeclared.filter((field) => field in ids),
          );
      }
      // One record per line, between the brackets.
      expect(text.split('\n')).toHaveLength(bodies.length + 3);
    },
  );
});
