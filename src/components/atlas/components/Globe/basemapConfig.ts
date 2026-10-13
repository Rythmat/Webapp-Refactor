import { GLOBE_ENGINE } from './engine';

/**
 * Where the MapLibre engine's street basemap comes from, read from the
 * environment (docs/globe-ui/ENGINE.md, "Tiles"). Kept apart from the style
 * (mapStyle.ts), which brings @protomaps/basemaps with it, so the page can
 * ask whether there is a street map, and credit it, without loading that.
 */

/**
 * The basemap's tiles: a self-hosted .pmtiles file, Protomaps' hosted API, or
 * none (the globe then draws its own country outlines on a plain sea).
 */
export type Basemap =
  | { kind: 'pmtiles'; url: string }
  | { kind: 'api'; key: string }
  | null;

/**
 * import.meta.env, or a test's stand-in: VITE_BASEMAP_PMTILES_URL,
 * VITE_PROTOMAPS_API_KEY and VITE_BASEMAP_ASSETS_URL are read.
 */
export type BasemapEnv = Readonly<Record<string, unknown>>;

const envString = (env: BasemapEnv, key: string): string => {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * A self-hosted file wins over the hosted API when both are set. A file on
 * this site (`/__protomaps/latest.pmtiles`, the dev server's; ENGINE.md) is
 * made absolute against `base`, the page's address.
 */
export function basemapFromEnv(env: BasemapEnv, base?: string): Basemap {
  const url = envString(env, 'VITE_BASEMAP_PMTILES_URL');
  if (url) {
    return {
      kind: 'pmtiles',
      url: base && url.startsWith('/') ? new URL(url, base).href : url,
    };
  }
  const key = envString(env, 'VITE_PROTOMAPS_API_KEY');
  if (key) return { kind: 'api', key };
  return null;
}

/** Protomaps' fonts and sprites, unless VITE_BASEMAP_ASSETS_URL says otherwise. */
export const DEFAULT_ASSETS_URL = 'https://protomaps.github.io/basemaps-assets';

export const assetsUrlFromEnv = (env: BasemapEnv): string =>
  (envString(env, 'VITE_BASEMAP_ASSETS_URL') || DEFAULT_ASSETS_URL).replace(
    /\/+$/,
    '',
  );

/**
 * The language the basemap's labels are in. The app has no language switch
 * of its own outside a classroom's settings, so the page's `<html lang>`
 * decides: Spanish when it is `es…`, English otherwise.
 */
export const basemapLang = (
  htmlLang: string | null | undefined,
): 'en' | 'es' => (/^es\b/i.test(htmlLang ?? '') ? 'es' : 'en');

/** The OpenStreetMap credit the basemap's licence requires on the map. */
export const BASEMAP_ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** The credit's two links, for the page's own credit line (MapCredit). */
export const MAP_CREDIT = {
  protomaps: 'https://protomaps.com',
  openStreetMap: 'https://www.openstreetmap.org/copyright',
} as const;

/** Whether this build draws Protomaps' street map: MapLibre with a tile source. */
export const HAS_STREET_MAP =
  GLOBE_ENGINE === 'maplibre' && basemapFromEnv(import.meta.env) !== null;

/**
 * Whether this build draws OpenStreetMap's data, and so must credit it
 * (MapCredit): the MapLibre engine always may, since a selected city's
 * outline comes from OpenStreetMap (scripts/buildCityOutlines.mjs) even on
 * the plain map without the street map.
 */
export const SHOWS_OSM_DATA = GLOBE_ENGINE === 'maplibre';
