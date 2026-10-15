import { describe, expect, it } from 'vitest';
import {
  buildSeedExport,
  type SeedItem,
  seedProblems,
} from '@/scripts/apiContract/exportSeed';

/**
 * The cutover seed refuses anything the API would refuse, or should never
 * hold: a body off its schema, an identity off its slug or pattern, and any
 * outside catalogue's name, link or id.
 */

const genre = (over: Record<string, unknown> = {}): SeedItem => ({
  kind: 'genre',
  slug: 'jam-band',
  body: {
    id: 'jam-band',
    name: 'Jam Band',
    taught: false,
    tags: ['Jam Band'],
    ...over,
  },
});

const studio = (body: Record<string, unknown>): SeedItem => ({
  kind: 'studio',
  slug: body.slug as string,
  body,
});

describe('seedProblems', () => {
  it('passes a body that meets the contract', () => {
    expect(seedProblems(genre())).toEqual([]);
    expect(
      seedProblems(studio({ slug: 'sunset-sound', name: 'Sunset Sound' })),
    ).toEqual([]);
  });

  it('refuses an identity that is not the slug, or off its pattern', () => {
    expect(seedProblems({ ...genre(), slug: 'jam' })).toEqual([
      'its id "jam-band" is not its slug',
    ]);
    const shouted = genre({ id: 'Jam_Band' });
    expect(
      seedProblems({ ...shouted, slug: 'Jam_Band' }).some((p) =>
        p.startsWith('its slug does not match'),
      ),
    ).toBe(true);
  });

  it('refuses a body off its schema', () => {
    expect(seedProblems(genre({ extra: 1 })).join()).toMatch(/extra/i);
  });

  it('refuses an outside catalogue, by name, link or id', () => {
    for (const bio of [
      'From MusicBrainz',
      'https://www.wikidata.org/wiki/Q1',
      '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
    ]) {
      expect(
        seedProblems(
          studio({
            slug: 'sunset-sound',
            name: 'Sunset Sound',
            aliases: [bio],
          }),
        ),
      ).toContain('names an outside catalogue or carries one of its ids (1)');
    }
  });
});

describe('buildSeedExport', () => {
  it('writes each kind as slug-ordered lines, in publish order', () => {
    const items: SeedItem[] = [
      studio({ slug: 'sunset-sound', name: 'Sunset Sound' }),
      studio({ slug: 'abbey-road-studios', name: 'Abbey Road Studios' }),
      genre(),
    ];
    const seed = buildSeedExport(items);
    expect(seed.problems).toEqual([]);
    expect(Object.keys(seed.files)).toEqual(['genre.ndjson', 'studio.ndjson']);
    const lines = seed.files['studio.ndjson'].trim().split('\n');
    expect(lines.map((line) => JSON.parse(line).slug)).toEqual([
      'abbey-road-studios',
      'sunset-sound',
    ]);
    expect(JSON.parse(lines[0])).toEqual({
      kind: 'studio',
      slug: 'abbey-road-studios',
      status: 'published',
      body: { slug: 'abbey-road-studios', name: 'Abbey Road Studios' },
    });
    expect(seed.kinds.studio).toMatchObject({
      file: 'studio.ndjson',
      count: 2,
      identity: 'slug',
    });
  });

  it('reports every problem with its item', () => {
    const seed = buildSeedExport([genre({ name: '' })]);
    expect(seed.problems).toEqual([
      expect.objectContaining({ kind: 'genre', slug: 'jam-band' }),
    ]);
  });
});
