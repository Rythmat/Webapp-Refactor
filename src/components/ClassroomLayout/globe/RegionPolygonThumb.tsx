import type { Feature, Position } from 'geojson';
import { useEffect, useMemo, useState, type FC } from 'react';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import { loadCountries } from '@/components/atlas/data/geoLoader';

// Countries (110m) come from the shared module-level loader in
// atlas/data/geoLoader.ts, so the thumbnails reuse the same download (and
// Cache Storage entry) as the Main Globe rather than issuing their own.
const loadCountryFeatures = () => loadCountries().catch(() => []);

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
  useFeatures(loadCountryFeatures);

// Natural Earth uses -99 for some countries; prefer ISO_A3, then ISO_A3_EH,
// then ADM0_A3 (matches the Globe's resolveIso so colours line up with the map).
function resolveIso(feat: Feature): string {
  const p = feat.properties as Record<string, string> | null;
  const a3 = p?.ISO_A3 ?? p?.iso_a3 ?? '';
  if (a3 && a3 !== '-99') return a3;
  const eh = p?.ISO_A3_EH;
  return eh && eh !== '-99' ? eh : (p?.ADM0_A3 ?? '');
}

// Country polygons carry their own ISO and colour through the same palette as
// the globe.
const countryColorOf = (feat: Feature): string =>
  getCountryColor(resolveIso(feat));

const VB = 200; // square viewBox; the tile crops it (slice)
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const OCEAN = '#0d1b2a';
const SPACE = '#070b12';

interface Projected {
  d: string;
  color: string;
}

/** Degrees of slack on the cull, so a polygon edge never pops in at the rim. */
const CULL_MARGIN_DEG = 5;

type Box = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Feature geometry is static, so each bbox is computed once and kept on a
// WeakMap keyed by the feature itself (entries die with the GeoJSON).
const boxCache = new WeakMap<Feature, Box>();

function featureBox(feat: Feature): Box {
  const cached = boxCache.get(feat);
  if (cached) return cached;
  const box: Box = {
    minLat: 90,
    maxLat: -90,
    minLng: 180,
    maxLng: -180,
  };
  const geom = feat.geometry;
  if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
    const polygons: Position[][][] =
      geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const rings of polygons) {
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
          if (lat < box.minLat) box.minLat = lat;
          if (lat > box.maxLat) box.maxLat = lat;
          if (lng < box.minLng) box.minLng = lng;
          if (lng > box.maxLng) box.maxLng = lng;
        }
      }
    }
  }
  boxCache.set(feat, box);
  return box;
}

/** Great-circle degrees from a point to the nearest point of a lat/lng box. */
function angularDistanceToBox(lat: number, lng: number, box: Box): number {
  const clampedLat = Math.min(box.maxLat, Math.max(box.minLat, lat));
  // Longitude is periodic: measure to whichever edge is nearer the wrap.
  let clampedLng = lng;
  if (lng < box.minLng || lng > box.maxLng) {
    const dMin = Math.abs(((lng - box.minLng + 540) % 360) - 180);
    const dMax = Math.abs(((lng - box.maxLng + 540) % 360) - 180);
    clampedLng = dMin < dMax ? box.minLng : box.maxLng;
  }
  const φ1 = lat * D2R;
  const φ2 = clampedLat * D2R;
  const Δ = (clampedLng - lng) * D2R;
  const cos = Math.min(
    1,
    Math.max(
      -1,
      Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δ),
    ),
  );
  return Math.acos(cos) * R2D;
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

  // Everything beyond this angular radius from the cap centre projects outside
  // the square viewBox and can be skipped whole. At a city zoom that is ~13
  // degrees, so the overwhelming majority of the world's polygons never need
  // projecting at all — before this, every tile built a path for all ~180
  // countries and the browser held tens of thousands of invisible <path> nodes.
  const maxAngleDeg =
    Math.asin(Math.min(1, ((VB / 2) * Math.SQRT2) / R)) * R2D + CULL_MARGIN_DEG;

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

    // Conservative bbox cull: if the closest point of the feature's bounding
    // box is further than the visible radius, no vertex of it can be on screen.
    // Features that straddle the antimeridian have a bbox spanning the globe,
    // so they are never culled here — the per-vertex test below still handles
    // them exactly.
    if (angularDistanceToBox(lat0, lng0, featureBox(feat)) > maxAngleDeg) {
      continue;
    }

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
}

/** Shared orthographic globe-cap SVG: space + ocean disc + projected paths. */
const CapSvg: FC<CapSvgProps> = ({ paths, zoom }) => {
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
