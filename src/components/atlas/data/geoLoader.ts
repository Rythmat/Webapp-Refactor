import type { Feature, FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { GEO_FILES } from './geoFiles';
import { lazyResource } from './lazyResource';
import { GEOJSON_URLS } from './menuItems';

/**
 * The one place the globe's country and state outlines are fetched.
 *
 * There used to be four independent loaders — `useGeoData` (mounted twice, by
 * BaseGlobe and HeroGlobe), `globe-country-texture.ts` and the module-level
 * pair in `RegionPolygonThumb.tsx` — so opening /atlas fetched and parsed the
 * same countries file more than once. These loads are module-scoped and
 * shared, and the two files are independent: a surface that only needs
 * countries is never made to wait for the states.
 *
 * The files are TopoJSON built from Natural Earth by scripts/buildGeo.mjs and
 * served from this origin (public/geo/): 113 kB for the countries and 165 kB
 * for the US/CA states, where the browser used to download 839 kB and 2.3 MB
 * of GeoJSON from jsDelivr and fix it up on arrival. Those jsDelivr files are
 * now only a fallback for when the local ones fail; the fixes they need load
 * with them (geoFixes.ts).
 *
 * Results are cached in Cache Storage as well as in memory, so a repeat visit
 * (and an offline classroom session) skips the network. Every URL names fixed
 * content (the local files carry a hash of theirs), so a hit is never stale.
 */

const CACHE_NAME = 'ma-geo-v2';
/** Earlier caches: v1 held the 3 MB of GeoJSON. */
const OLD_CACHES = ['ma-geo-v1'];

let cachePromise: Promise<Cache | null> | null = null;

/** The geo cache, once per page: dropping old caches and stale entries. */
function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return Promise.resolve(null);
  cachePromise ??= (async () => {
    for (const name of OLD_CACHES) await caches.delete(name).catch(() => false);
    const cache = await caches.open(CACHE_NAME);
    // A rebuilt file is a new URL; let go of the ones nothing asks for now.
    const current = new Set<string>(Object.values(GEO_FILES));
    for (const request of await cache.keys()) {
      const { origin, pathname } = new URL(request.url);
      if (origin === location.origin && !current.has(pathname)) {
        await cache.delete(request);
      }
    }
    return cache;
  })().catch(() => null);
  return cachePromise;
}

async function fetchJson(url: string): Promise<unknown> {
  const cache = await openCache();

  if (cache) {
    const hit = await cache.match(url).catch(() => undefined);
    if (hit) return hit.json();
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map data request failed (HTTP ${response.status})`);
  }
  if (cache) {
    // Clone before reading the body; a quota failure must not break the load.
    cache.put(url, response.clone()).catch(() => undefined);
  }
  return response.json();
}

/** The features of one object in a TopoJSON file. */
export function decodeTopology(topo: Topology, object: string): Feature[] {
  const geometries = topo.objects[object];
  if (!geometries) throw new Error(`Map data has no "${object}" outlines`);
  return (feature(topo, geometries) as FeatureCollection).features;
}

/** The local file, or else the original jsDelivr file. */
async function localOrRemote(
  local: () => Promise<Feature[]>,
  remote: () => Promise<Feature[]>,
): Promise<Feature[]> {
  try {
    return await local();
  } catch (error) {
    console.warn('Map outlines: falling back to jsDelivr', error);
    return remote();
  }
}

const countriesData = lazyResource(() =>
  localOrRemote(
    async () =>
      decodeTopology(
        (await fetchJson(GEO_FILES.countries)) as Topology,
        'countries',
      ),
    async () => {
      const [raw, { splitFrenchGuiana }] = await Promise.all([
        fetchJson(GEOJSON_URLS.countries),
        import('./geoFixes'),
      ]);
      return splitFrenchGuiana((raw as FeatureCollection).features);
    },
  ),
);

const statesData = lazyResource(() =>
  localOrRemote(
    async () =>
      decodeTopology((await fetchJson(GEO_FILES.states)) as Topology, 'states'),
    async () => {
      const [raw, { fixMichigan }] = await Promise.all([
        fetchJson(GEOJSON_URLS.admin1),
        import('./geoFixes'),
      ]);
      return fixMichigan(
        (raw as FeatureCollection).features.filter(
          (f) => f.properties?.iso_a2 === 'US' || f.properties?.iso_a2 === 'CA',
        ),
      );
    },
  ),
);

/**
 * World country polygons, French Guiana already split out. A failed load is
 * retried by the next call.
 */
export function loadCountries(): Promise<Feature[]> {
  return countriesData.load();
}

/** US states + Canadian provinces only, with the Michigan geometry corrected. */
export function loadAdmin1UsCa(): Promise<Feature[]> {
  return statesData.load();
}

/**
 * Warm both files without rendering anything — called at boot alongside the
 * content prefetch so the download overlaps auth and hydration instead of
 * starting after them.
 */
export function prefetchGeoData(): void {
  void loadCountries().catch(() => undefined);
  void loadAdmin1UsCa().catch(() => undefined);
}
