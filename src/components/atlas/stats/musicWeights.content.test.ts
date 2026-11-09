/**
 * On the real content: a country is lit by exactly the events its panel
 * lists, for every country Natural Earth draws.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GEO_FILES } from '@/components/atlas/data/geoFiles';
import { decodeTopology } from '@/components/atlas/data/geoLoader';
import { countryKey } from '@/components/atlas/utils/country';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { ensureAtlasContent } from '@/content/contentStore';
import { musicWeights } from './musicWeights';

beforeAll(() => ensureAtlasContent(), 60_000);

const countries = decodeTopology(
  JSON.parse(
    readFileSync(join(process.cwd(), 'public', GEO_FILES.countries), 'utf8'),
  ),
  'countries',
);

describe('the land lit by music, on the real content', () => {
  it('lights each country by the events its panel lists', () => {
    const weights = musicWeights(null);
    let lit = 0;
    for (const feature of countries) {
      const name = String(feature.properties?.NAME ?? '');
      const listed = getEventsForLocation({
        type: 'country',
        name,
        iso: '',
      }).length;
      expect(weights.countries.get(countryKey(name)) ?? 0, name).toBe(listed);
      if (listed > 0) lit += 1;
    }
    // Most of the music is somewhere Natural Earth draws.
    expect(lit).toBeGreaterThan(80);
  });
});
