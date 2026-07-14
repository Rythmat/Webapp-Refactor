import type { Feature, Position } from 'geojson';
import { useEffect, useMemo, useState, type FC } from 'react';
import { GEOJSON_URLS } from '@/components/atlas/data';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import './city-locator.css';

// ── Lightweight geo loaders (module-cached, shared by every thumbnail) ──────
// The Main Globe's useGeoData() also runs on its own route; these standalone
// loaders keep the dashboard thumbnails independent. Countries (110m) is the
// full-coverage base for every cap; the admin-1 states file only carries
// subdivisions for a handful of large countries, so it's an overlay on top of
// the country base (see CityPolygonThumb). Each is fetched once and reused.
function makeFeatureLoader(url: string) {
  let promise: Promise<Feature[]> | null = null;
  return () => {
    if (!promise) {
      promise = fetch(url)
        .then((r) => r.json())
        .then((fc: { features?: Feature[] }) => fc.features ?? [])
        .catch(() => []);
    }
    return promise;
  };
}

const loadCountries = makeFeatureLoader(GEOJSON_URLS.countries);
const loadStates = makeFeatureLoader(GEOJSON_URLS.admin1);

function useFeatures(load: () => Promise<Feature[]>): Feature[] | null {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  useEffect(() => {
    let alive = true;
    void load().then((f) => {
      if (alive) setFeatures(f);
    });
    return () => {
      alive = false;
    };
  }, [load]);
  return features;
}

/** The world countries GeoJSON features (null while loading). */
export const useCountryFeatures = (): Feature[] | null =>
  useFeatures(loadCountries);

/** The world states/provinces (admin-1) GeoJSON features (null while loading). */
export const useStateFeatures = (): Feature[] | null => useFeatures(loadStates);

// Natural Earth uses -99 for some countries; prefer ISO_A3, then ISO_A3_EH,
// then ADM0_A3 (matches BaseGlobe.resolveIso so colours line up with the globe).
function resolveIso(feat: Feature): string {
  const p = feat.properties as Record<string, string> | null;
  const a3 = p?.ISO_A3 ?? p?.iso_a3 ?? '';
  if (a3 && a3 !== '-99') return a3;
  const eh = p?.ISO_A3_EH;
  return eh && eh !== '-99' ? eh : (p?.ADM0_A3 ?? '');
}

// Country polygons carry their own ISO; admin-1 states carry the parent
// country's A3 as `adm0_a3`. Both colour through the same palette as the globe,
// so a country and its states share a hue (state borders show via the strokes).
const countryColorOf = (feat: Feature): string =>
  getCountryColor(resolveIso(feat));
const stateColorOf = (feat: Feature): string =>
  getCountryColor(
    (feat.properties as Record<string, string> | null)?.adm0_a3 ?? '',
  );

const VB = 200; // square viewBox; the tile crops it (slice)
const D2R = Math.PI / 180;
const OCEAN = '#0d1b2a';
const SPACE = '#070b12';
const CITY_ZOOM = 16; // city caps zoom past the region zooms (3–5) to the state

// Pointy-top hexagon points centred at (cx, cy) with circumradius r — the house
// hex orientation (cf. CustomCursor / SignalFlow). Used for the city locator.
const HEX_HALF_W = Math.sqrt(3) / 2; // 0.866
const hexPoints = (cx: number, cy: number, r: number): string => {
  const w = r * HEX_HALF_W;
  return `${cx},${cy - r} ${cx + w},${cy - r / 2} ${cx + w},${cy + r / 2} ${cx},${cy + r} ${cx - w},${cy + r / 2} ${cx - w},${cy - r / 2}`;
};

interface Projected {
  d: string;
  color: string;
}

/** Project the world onto an orthographic globe centred on `center` and build
 *  one SVG path per feature (front-facing rings only, coloured via `colorOf`). */
function buildPaths(
  features: Feature[],
  center: [number, number],
  zoom: number,
  colorOf: (feat: Feature) => string,
): Projected[] {
  const [lat0, lng0] = center;
  const φ0 = lat0 * D2R;
  const λ0 = lng0 * D2R;
  const sinφ0 = Math.sin(φ0);
  const cosφ0 = Math.cos(φ0);
  const cx = VB / 2;
  const cy = VB / 2;
  const R = (VB / 2) * (1.1 + zoom * 0.32); // zoom into the region/city cap

  const out: Projected[] = [];

  const cosCentral = (lng: number, lat: number): number => {
    const φ = lat * D2R;
    const Δ = lng * D2R - λ0;
    return sinφ0 * Math.sin(φ) + cosφ0 * Math.cos(φ) * Math.cos(Δ);
  };

  const projectRing = (ring: Position[]): string | null => {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const φ = lat * D2R;
      const Δ = lng * D2R - λ0;
      const sinφ = Math.sin(φ);
      const cosφ = Math.cos(φ);
      const cosΔ = Math.cos(Δ);
      if (sinφ0 * sinφ + cosφ0 * cosφ * cosΔ < 0) return null; // far-side vertex
      const x = cosφ * Math.sin(Δ);
      const y = cosφ0 * sinφ - sinφ0 * cosφ * cosΔ;
      const sx = (cx + x * R).toFixed(1);
      const sy = (cy - y * R).toFixed(1);
      d += `${i === 0 ? 'M' : 'L'}${sx} ${sy}`;
    }
    return d ? `${d}Z` : null;
  };

  for (const feat of features) {
    const geom = feat.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
      continue;
    }
    const polygons: Position[][][] =
      geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

    // Cheap O(1) cull: skip features whose first vertex sits well beyond the
    // visible horizon — keeps projection fast across many thumbnails (the ring
    // loop still culls edge geometry precisely).
    const first = polygons[0]?.[0]?.[0];
    if (first && cosCentral(first[0], first[1]) < -0.15) continue;

    let d = '';
    for (const rings of polygons) {
      for (const ring of rings) {
        const sub = projectRing(ring);
        if (sub) d += sub;
      }
    }
    if (d) out.push({ d, color: colorOf(feat) });
  }

  return out;
}

interface CapSvgProps {
  paths: Projected[] | null;
  zoom: number;
  /** Draw a marker dot at the cap centre (used for the city point). */
  marker?: boolean;
}

/** Shared orthographic globe-cap SVG: space + ocean disc + projected paths. */
const CapSvg: FC<CapSvgProps> = ({ paths, zoom, marker }) => {
  // Ocean-disc placeholder while the GeoJSON loads (or if it failed).
  if (!paths) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${OCEAN}, ${SPACE})`,
        }}
      />
    );
  }

  const R = (VB / 2) * (1.1 + zoom * 0.32);

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <rect x="0" y="0" width={VB} height={VB} fill={SPACE} />
      <circle cx={VB / 2} cy={VB / 2} r={R} fill={OCEAN} />
      {paths.map((p, i) => (
        <path
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          d={p.d}
          fill={p.color}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={0.3}
          fillRule="evenodd"
        />
      ))}
      {marker && (
        <g className="city-locator">
          <polygon
            className="city-locator__ping"
            points={hexPoints(VB / 2, VB / 2, 6.5)}
          />
          <polygon
            className="city-locator__ping city-locator__ping--2"
            points={hexPoints(VB / 2, VB / 2, 6.5)}
          />
          <polygon
            className="city-locator__core"
            points={hexPoints(VB / 2, VB / 2, 4.5)}
          />
        </g>
      )}
    </svg>
  );
};

interface RegionPolygonThumbProps {
  features?: Feature[] | null;
  center: [number, number];
  zoom: number;
}

/**
 * A per-region globe thumbnail — the same Natural-Earth country polygons the
 * Main Globe draws, coloured with the same `getCountryColor`, orthographically
 * projected onto a globe centred on the region.
 */
export const RegionPolygonThumb: FC<RegionPolygonThumbProps> = ({
  features,
  center,
  zoom,
}) => {
  const paths = useMemo(
    () =>
      features ? buildPaths(features, center, zoom, countryColorOf) : null,
    [features, center, zoom],
  );
  return <CapSvg paths={paths} zoom={zoom} />;
};

interface CityPolygonThumbProps {
  /** Global country outlines — the base layer, so every city sits on its land. */
  countries?: Feature[] | null;
  /** Admin-1 states/provinces — an overlay, drawn on top where the data has them. */
  states?: Feature[] | null;
  center: [number, number];
  zoom?: number;
}

/**
 * A per-city globe thumbnail — the same projection as the region thumb, zoomed to
 * the city. Draws country outlines as a base (full global coverage) with admin-1
 * states composited on top where available (the states data only covers a few
 * countries), so every city is correctly located and shows state detail where the
 * data has it — mirroring the Main Globe's country + state layers.
 */
export const CityPolygonThumb: FC<CityPolygonThumbProps> = ({
  countries,
  states,
  center,
  zoom = CITY_ZOOM,
}) => {
  const paths = useMemo(() => {
    if (!countries && !states) return null;
    const base = countries
      ? buildPaths(countries, center, zoom, countryColorOf)
      : [];
    const overlay = states
      ? buildPaths(states, center, zoom, stateColorOf)
      : [];
    return [...base, ...overlay];
  }, [countries, states, center, zoom]);
  return <CapSvg paths={paths} zoom={zoom} marker />;
};
