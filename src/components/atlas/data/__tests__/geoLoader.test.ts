import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEO_FILES } from '../geoFiles';
import { GEOJSON_URLS } from '../menuItems';

const local = (url: string) =>
  readFileSync(join(process.cwd(), 'public', url), 'utf8');

const ok = (body: string) => new Response(body, { status: 200 });

/** A fresh geoLoader, so each test starts with nothing loaded. */
async function freshLoader() {
  vi.resetModules();
  return import('../geoLoader');
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('geoLoader', () => {
  it('fetches the same-origin countries file once, however many ask', async () => {
    fetchMock.mockImplementation(async () => ok(local(GEO_FILES.countries)));
    const { loadCountries } = await freshLoader();

    const [a, b] = await Promise.all([loadCountries(), loadCountries()]);
    expect(a).toBe(b);
    expect(await loadCountries()).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(GEO_FILES.countries);
    expect(a.length).toBeGreaterThan(170);
  });

  it('loads the states without waiting for the countries', async () => {
    fetchMock.mockImplementation(async () => ok(local(GEO_FILES.states)));
    const { loadAdmin1UsCa } = await freshLoader();
    const states = await loadAdmin1UsCa();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(GEO_FILES.states);
    expect(states.map((s) => s.properties?.iso_a2)).toSatisfy(
      (isos: string[]) => isos.every((iso) => iso === 'US' || iso === 'CA'),
    );
  });

  it('falls back to jsDelivr, with the fixes, when the local file fails', async () => {
    // A tiny stand-in for Natural Earth: France with French Guiana inside.
    const france = {
      type: 'Feature',
      properties: { NAME: 'France', ADM0_A3: 'FRA', ISO_A3: '-99' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [2, 46],
              [3, 46],
              [3, 47],
              [2, 46],
            ],
          ],
          [
            [
              [-53, 4],
              [-52, 4],
              [-52, 5],
              [-53, 4],
            ],
          ],
        ],
      },
    };
    fetchMock.mockImplementation(async (url: string) =>
      url === GEOJSON_URLS.countries
        ? ok(JSON.stringify({ type: 'FeatureCollection', features: [france] }))
        : new Response('', { status: 404 }),
    );
    const { loadCountries } = await freshLoader();

    const features = await loadCountries();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      GEO_FILES.countries,
      GEOJSON_URLS.countries,
    ]);
    expect(features.map((f) => f.properties?.ADM0_A3)).toEqual(['FRA', 'GUF']);
  });

  it('retries after a failure instead of remembering it', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { loadCountries } = await freshLoader();
    await expect(loadCountries()).rejects.toThrow('offline');

    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => ok(local(GEO_FILES.countries)));
    await expect(loadCountries()).resolves.toHaveLength(
      (await loadCountries()).length,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
