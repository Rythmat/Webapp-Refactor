// @vitest-environment jsdom
/** A city's outline is fetched once, the first time it is wanted. */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cityOutlineFiles', () => ({
  CITY_OUTLINE_FILES: {
    vienna: '/geo/cities/vienna.abc.json',
    lagos: '/geo/cities/lagos.def.json',
  },
}));

const { cityOutline, hasCityOutline, loadCityOutline } = await import(
  './cityOutlines'
);

const VIENNA = {
  type: 'Feature',
  properties: { id: 'vienna' },
  geometry: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('city outlines', () => {
  it('knows which cities have one', () => {
    expect(hasCityOutline('vienna')).toBe(true);
    expect(hasCityOutline('kingston')).toBe(false);
    expect(cityOutline('kingston')).toBeNull();
  });

  it('fetches an outline once, however many ask, and keeps it', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => VIENNA,
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(cityOutline('vienna')).toBeUndefined();
    const [a, b] = await Promise.all([
      loadCityOutline('vienna'),
      loadCityOutline('vienna'),
    ]);
    expect(a).toEqual(VIENNA);
    expect(b).toEqual(VIENNA);
    expect(cityOutline('vienna')).toEqual(VIENNA);
    await loadCityOutline('vienna');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/geo/cities/vienna.abc.json');
  });

  it('tries again after a failed fetch', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', failing);
    expect(await loadCityOutline('lagos')).toBeNull();
    expect(cityOutline('lagos')).toBeUndefined();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ ...VIENNA }) })),
    );
    expect(await loadCityOutline('lagos')).not.toBeNull();
  });
});
