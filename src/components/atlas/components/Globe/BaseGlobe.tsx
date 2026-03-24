import type { Feature } from 'geojson';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial, MeshLambertMaterial, DoubleSide } from 'three';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  CITIES,
  MUSIC_HISTORY,
  getRecursiveArcsForEvent,
  CITY_COUNTRY_TO_ISO,
  type ArcDatum,
} from '@/components/atlas/data';
import {
  getCountryColor,
  getContrastColor,
} from '@/components/atlas/data/continentColors';
import { useGeoData, useGlobeLighting } from '@/components/atlas/hooks';
import { GlobeController } from './GlobeController';

const ICE_COUNTRIES = new Set(['ATA', 'GRL']);

// Natural Earth uses -99 for some countries (France, Norway, disputed territories).
// Prefer ISO_A3_EH, then ADM0_A3, then ISO_A3.
function resolveIso(feat: Feature): string {
  const p = feat.properties;
  const a3 = p?.ISO_A3 ?? p?.iso_a3 ?? '';
  if (a3 !== '-99') return a3;
  return p?.ISO_A3_EH !== '-99' && p?.ISO_A3_EH
    ? p.ISO_A3_EH
    : (p?.ADM0_A3 ?? '');
}

interface HexPoint {
  lat: number;
  lng: number;
  id: string;
  name: string;
  color: string;
}

interface PinnedPoint {
  lat: number;
  lng: number;
  name: string;
  color: string;
  size: number;
}

// 12 zodiac constellations — star positions in a 2000×1400 coordinate space
interface ZStar {
  x: number;
  y: number;
  mag: 1 | 2 | 3;
}
interface ZConstellation {
  stars: ZStar[];
  lines: [number, number][];
}

// 12 zodiac constellations — star positions relative to constellation center (0,0)
const ZODIAC: ZConstellation[] = [
  // Aries — curved arc
  {
    stars: [
      { x: -55, y: 20, mag: 2 },
      { x: -20, y: -5, mag: 1 },
      { x: 20, y: -20, mag: 1 },
      { x: 55, y: -5, mag: 2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },

  // Taurus — V-shape (Hyades) + Aldebaran + Pleiades
  {
    stars: [
      { x: 5, y: 80, mag: 1 }, // Aldebaran
      { x: -25, y: 45, mag: 2 },
      { x: -50, y: 15, mag: 2 }, // V left
      { x: 35, y: 45, mag: 2 },
      { x: 60, y: 15, mag: 2 }, // V right
      { x: -65, y: -25, mag: 2 },
      { x: 75, y: -25, mag: 2 }, // horn tips
      { x: -75, y: -70, mag: 3 },
      { x: -65, y: -60, mag: 3 },
      { x: -55, y: -75, mag: 3 },
      { x: -60, y: -65, mag: 3 },
      { x: -70, y: -80, mag: 3 }, // Pleiades
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 5],
      [0, 3],
      [3, 4],
      [4, 6],
    ],
  },

  // Gemini — two parallel chains from Castor & Pollux
  {
    stars: [
      { x: -10, y: -80, mag: 1 }, // Castor
      { x: 40, y: -70, mag: 1 }, // Pollux
      { x: -20, y: -30, mag: 2 },
      { x: -30, y: 20, mag: 2 },
      { x: -40, y: 70, mag: 3 },
      { x: 30, y: -20, mag: 2 },
      { x: 20, y: 30, mag: 2 },
      { x: 10, y: 80, mag: 3 },
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [1, 5],
      [5, 6],
      [6, 7],
    ],
  },

  // Cancer — small inverted Y
  {
    stars: [
      { x: 0, y: -40, mag: 3 },
      { x: -20, y: 0, mag: 2 },
      { x: 20, y: 0, mag: 2 },
      { x: -30, y: 40, mag: 3 },
      { x: 30, y: 40, mag: 3 },
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
    ],
  },

  // Leo — sickle + triangle body
  {
    stars: [
      { x: -75, y: 35, mag: 1 }, // Regulus
      { x: -65, y: -5, mag: 2 },
      { x: -45, y: -35, mag: 2 },
      { x: -15, y: -50, mag: 2 },
      { x: 15, y: -35, mag: 2 },
      { x: 45, y: -5, mag: 2 },
      { x: 75, y: 25, mag: 2 },
      { x: 45, y: 50, mag: 2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 0],
    ],
  },

  // Virgo — Y-shape with Spica
  {
    stars: [
      { x: -22, y: 70, mag: 1 }, // Spica
      { x: -22, y: 30, mag: 2 },
      { x: -2, y: -10, mag: 2 },
      { x: 28, y: -40, mag: 2 },
      { x: 58, y: -70, mag: 2 },
      { x: -32, y: -40, mag: 2 },
      { x: -57, y: -70, mag: 3 },
      { x: 58, y: -10, mag: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [5, 6],
      [3, 7],
    ],
  },

  // Libra — scales
  {
    stars: [
      { x: -30, y: -50, mag: 2 },
      { x: 30, y: -50, mag: 2 },
      { x: 0, y: 0, mag: 2 },
      { x: -40, y: 40, mag: 3 },
      { x: 0, y: 50, mag: 2 },
      { x: 40, y: 40, mag: 3 },
    ],
    lines: [
      [0, 2],
      [1, 2],
      [2, 4],
      [3, 4],
      [4, 5],
    ],
  },

  // Scorpius — long S-curve with stinger
  {
    stars: [
      { x: -80, y: -67, mag: 2 },
      { x: -60, y: -87, mag: 2 },
      { x: -40, y: -77, mag: 2 },
      { x: -20, y: -47, mag: 2 },
      { x: -10, y: -7, mag: 1 }, // Antares
      { x: -5, y: 33, mag: 2 },
      { x: 10, y: 63, mag: 2 },
      { x: 30, y: 83, mag: 2 },
      { x: 55, y: 88, mag: 2 },
      { x: 75, y: 73, mag: 2 },
      { x: 80, y: 48, mag: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ],
  },

  // Sagittarius — teapot
  {
    stars: [
      { x: -22, y: 53, mag: 2 },
      { x: 48, y: 53, mag: 2 },
      { x: -22, y: -7, mag: 2 },
      { x: 48, y: -7, mag: 2 },
      { x: 3, y: -32, mag: 2 },
      { x: 28, y: -32, mag: 2 },
      { x: 16, y: -52, mag: 3 },
      { x: -47, y: 23, mag: 3 },
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
      [4, 6],
      [5, 6],
      [2, 7],
    ],
  },

  // Capricornus — triangle
  {
    stars: [
      { x: -45, y: -37, mag: 2 },
      { x: -5, y: -47, mag: 2 },
      { x: 35, y: -27, mag: 2 },
      { x: -35, y: 8, mag: 3 },
      { x: 5, y: 18, mag: 2 },
      { x: 45, y: 28, mag: 3 },
      { x: -15, y: 48, mag: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 4],
      [4, 5],
      [2, 5],
      [3, 6],
      [4, 6],
    ],
  },

  // Aquarius — body + water stream zigzag
  {
    stars: [
      { x: -27, y: -77, mag: 2 },
      { x: 3, y: -67, mag: 2 },
      { x: 28, y: -47, mag: 2 },
      { x: 3, y: -27, mag: 2 },
      { x: -17, y: -2, mag: 3 },
      { x: 3, y: 18, mag: 3 },
      { x: -17, y: 38, mag: 3 },
      { x: 3, y: 58, mag: 3 },
      { x: -17, y: 78, mag: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
  },

  // Pisces — two fish connected by cord
  {
    stars: [
      { x: -57, y: -7, mag: 3 },
      { x: -47, y: -27, mag: 2 },
      { x: -27, y: -27, mag: 2 },
      { x: -17, y: -7, mag: 3 },
      { x: -37, y: 3, mag: 2 },
      { x: -7, y: 23, mag: 3 },
      { x: 23, y: 28, mag: 3 },
      { x: 43, y: 13, mag: 2 },
      { x: 58, y: -7, mag: 2 },
      { x: 43, y: -22, mag: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 7],
    ],
  },
];

// Position 12 constellations in a circle around the globe center
const ZODIAC_POSITIONS: { x: number; y: number }[] = [];
for (let i = 0; i < 12; i++) {
  const angle = ((-90 + i * 30) * Math.PI) / 180;
  ZODIAC_POSITIONS.push({
    x: Math.round(1000 + 1000 * Math.cos(angle)),
    y: Math.round(700 + 1000 * Math.sin(angle)),
  });
}

// Random dim background stars (generated once at module level)
const BACKGROUND_STARS: { x: number; y: number; r: number }[] = [];
for (let i = 0; i < 400; i++) {
  BACKGROUND_STARS.push({
    x: Math.floor(Math.random() * 2000),
    y: Math.floor(Math.random() * 1400),
    r: Math.random() < 0.15 ? 1.2 : Math.random() < 0.4 ? 0.9 : 0.6,
  });
}

// Rough centroid from GeoJSON feature coordinates
function getCentroid(feat: Feature): { lat: number; lng: number } | null {
  const coords: number[][] = [];
  function collect(arr: unknown) {
    if (Array.isArray(arr)) {
      if (typeof arr[0] === 'number') coords.push(arr as number[]);
      else for (const item of arr) collect(item);
    }
  }
  if (feat.geometry && 'coordinates' in feat.geometry) {
    collect(feat.geometry.coordinates);
  }
  if (coords.length === 0) return null;
  let sLat = 0,
    sLng = 0;
  for (const [lng, lat] of coords) {
    sLng += lng;
    sLat += lat;
  }
  return { lat: sLat / coords.length, lng: sLng / coords.length };
}

export function BaseGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { countries, adminRegions, loading, error } = useGeoData();
  const { globeAltitude, pinnedEvent, selectedLocation } = useAppState();
  const dispatch = useAppDispatch();
  const [GlobeModule, setGlobeModule] = useState<
    typeof import('react-globe.gl').default | null
  >(null);
  const [globeError, setGlobeError] = useState<string | null>(null);
  // Ocean material — low emissive so night side darkens
  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: 0x89cff0,
        emissive: 0x112233,
        shininess: 15,
      }),
    [],
  );

  // Day/night lighting (camera-attached directional light)
  useGlobeLighting(globeRef);

  // Constellations scale in sync with the globe's apparent size on screen.
  // Globe apparent size ∝ 1/(1+altitude), so we normalize to the default altitude.
  const constellationScale = useMemo(() => {
    const baseAlt = 2.5;
    return (1 + baseAlt) / (1 + globeAltitude);
  }, [globeAltitude]);

  // Measure container with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dynamically import react-globe.gl
  useEffect(() => {
    let cancelled = false;
    import('react-globe.gl')
      .then((mod) => {
        if (!cancelled) setGlobeModule(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) setGlobeError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showStates = globeAltitude < 2.2;

  // Merge country + admin region (US state / CA province) polygons
  const polygonFeatures = useMemo(() => {
    const countryFeatures = (countries?.features ?? []).map((f) => ({
      ...f,
      properties: { ...f.properties, _layer: 'country' },
    }));
    if (!showStates || !adminRegions?.features) return countryFeatures;
    const regionFeatures = adminRegions.features.map((f) => ({
      ...f,
      properties: { ...f.properties, _layer: 'state' },
    }));
    return [...countryFeatures, ...regionFeatures];
  }, [countries, adminRegions, showStates]);

  // City hex data — always show all cities that have events
  const hexPoints: HexPoint[] = useMemo(() => {
    return CITIES.map((city) => {
      const iso = CITY_COUNTRY_TO_ISO[city.country];
      return {
        lat: city.coordinates[0],
        lng: city.coordinates[1],
        id: city.id,
        name: city.name,
        color: iso ? getCountryColor(iso) : '#ffffff',
      };
    });
  }, []);

  // Pinned event as a single point marker
  const pinnedPointData: PinnedPoint[] = useMemo(() => {
    if (!pinnedEvent) return [];
    return [
      {
        lat: pinnedEvent.location.lat,
        lng: pinnedEvent.location.lng,
        name: pinnedEvent.title,
        color: '#d63031',
        size: 0.2,
      },
    ];
  }, [pinnedEvent]);

  // Influence arcs for pinned event (full recursive chain)
  const influenceArcs = useMemo(() => {
    if (!pinnedEvent) return [];
    return getRecursiveArcsForEvent(pinnedEvent.id);
  }, [pinnedEvent]);

  // Altitude tracking
  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => {
      dispatch({ type: 'SET_ALTITUDE', payload: pov.altitude });
    },
    [dispatch],
  );

  // Country/state/province polygon click — select + fly to centroid
  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      const name = feat.properties?.NAME ?? feat.properties?.name ?? 'Unknown';
      const centroid = getCentroid(feat);

      if (feat.properties?._layer === 'state') {
        const isoA2 = feat.properties?.iso_a2 ?? '';
        const country = isoA2 === 'CA' ? 'Canada' : 'United States';
        dispatch({
          type: 'SELECT_LOCATION',
          payload: { type: 'state', name, country },
        });
        if (centroid) {
          dispatch({
            type: 'EXECUTE_SEARCH',
            payload: { lat: centroid.lat, lng: centroid.lng, zoom: 10 },
          });
        }
        return;
      }

      const iso = feat.properties?.ISO_A3 ?? feat.properties?.iso_a3 ?? '';
      dispatch({
        type: 'SELECT_LOCATION',
        payload: { type: 'country', name, iso },
      });
      if (centroid) {
        dispatch({
          type: 'EXECUTE_SEARCH',
          payload: { lat: centroid.lat, lng: centroid.lng, zoom: 10 },
        });
      }
    },
    [dispatch],
  );

  // Hex click — select city
  const handleHexClick = useCallback(
    (hex: object) => {
      const h = hex as { points: HexPoint[] };
      if (h.points.length > 0) {
        dispatch({
          type: 'SELECT_LOCATION',
          payload: { type: 'city', id: h.points[0].id },
        });
      }
    },
    [dispatch],
  );

  // Check if a polygon feature matches the current selection
  const isSelected = useCallback(
    (feat: Feature): boolean => {
      if (!selectedLocation) return false;
      if (
        feat.properties?._layer === 'state' &&
        selectedLocation.type === 'state'
      ) {
        return (
          (feat.properties?.NAME ?? feat.properties?.name) ===
          selectedLocation.name
        );
      }
      if (
        feat.properties?._layer !== 'state' &&
        selectedLocation.type === 'country'
      ) {
        return (
          (feat.properties?.ISO_A3 ?? feat.properties?.iso_a3) ===
          selectedLocation.iso
        );
      }
      return false;
    },
    [selectedLocation],
  );

  // Material caches (keyed by color) so we don't recreate every render
  const capMatCache = useRef(new Map<string, MeshLambertMaterial>());
  const sideMatCache = useRef(new Map<string, MeshLambertMaterial>());

  // Dispose cached materials on unmount
  useEffect(() => {
    return () => {
      capMatCache.current.forEach((m) => m.dispose());
      sideMatCache.current.forEach((m) => m.dispose());
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  // Polygon cap materials — light-responsive for day/night shading
  const polygonCapMaterial = useCallback((polygon: object) => {
    const feat = polygon as Feature;
    let colorHex: string;
    if (feat.properties?._layer === 'state') {
      const parentIso = feat.properties?.iso_a2 === 'CA' ? 'CAN' : 'USA';
      colorHex = getCountryColor(parentIso);
    } else {
      const iso = resolveIso(feat);
      colorHex = ICE_COUNTRIES.has(iso) ? '#ffffff' : getCountryColor(iso);
    }
    let mat = capMatCache.current.get(colorHex);
    if (!mat) {
      mat = new MeshLambertMaterial({
        color: colorHex,
        emissive: 0x0a0a12,
        transparent: true,
        opacity: 0.92,
        side: DoubleSide,
        depthWrite: true,
      });
      capMatCache.current.set(colorHex, mat);
    }
    return mat;
  }, []);

  // Polygon side materials
  const polygonSideMaterial = useCallback((polygon: object) => {
    const feat = polygon as Feature;
    let colorHex: string;
    if (feat.properties?._layer === 'state') {
      const parentIso = feat.properties?.iso_a2 === 'CA' ? 'CAN' : 'USA';
      colorHex = getCountryColor(parentIso);
    } else {
      const iso = resolveIso(feat);
      colorHex = ICE_COUNTRIES.has(iso) ? '#dcdcdc' : getCountryColor(iso);
    }
    const key = colorHex + '_s';
    let mat = sideMatCache.current.get(key);
    if (!mat) {
      mat = new MeshLambertMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide,
        depthWrite: true,
      });
      sideMatCache.current.set(key, mat);
    }
    return mat;
  }, []);

  const polygonStrokeColor = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      if (isSelected(feat)) return 'rgba(255, 255, 255, 0.9)';
      if (feat.properties?._layer === 'state')
        return 'rgba(120, 120, 120, 0.6)';
      return 'rgba(60, 60, 60, 0.9)';
    },
    [isSelected],
  );

  const polygonAltitude = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      if (isSelected(feat)) return 0.014;
      if (feat.properties?._layer === 'state') return 0.009;
      return 0.008;
    },
    [isSelected],
  );

  const Globe = GlobeModule;
  const hasError = error || globeError;
  const ready =
    !loading && !hasError && size.width > 0 && size.height > 0 && Globe;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000005',
        overflow: 'hidden',
      }}
    >
      {/* Zodiac constellation star field */}
      <svg
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox="0 0 2000 1400"
      >
        <style>{`
          @keyframes twinkle-bright { 0%,100%{opacity:.85} 50%{opacity:1} }
          @keyframes twinkle-med   { 0%,100%{opacity:.55} 50%{opacity:.85} }
          @keyframes twinkle-dim   { 0%,100%{opacity:.3}  50%{opacity:.55} }
          .star-1 { animation: twinkle-bright 4s ease-in-out infinite; }
          .star-2 { animation: twinkle-med 5s ease-in-out infinite 1s; }
          .star-3 { animation: twinkle-dim 6s ease-in-out infinite 2s; }
          .bg-star { animation: twinkle-dim 7s ease-in-out infinite; }
        `}</style>

        {/* Background scatter */}
        {BACKGROUND_STARS.map((s, i) => (
          <circle
            key={`bg${i}`}
            className="bg-star"
            cx={s.x}
            cy={s.y}
            fill="#fff"
            r={s.r}
            style={{ animationDelay: `${(i * 0.37) % 7}s` }}
          />
        ))}

        {/* Constellation lines + stars — scale from SVG center for parallax */}
        <g
          transform={`translate(1000,700) scale(${constellationScale}) translate(-1000,-700)`}
        >
          {ZODIAC.map((c, ci) => (
            <g
              key={ci}
              transform={`translate(${ZODIAC_POSITIONS[ci].x},${ZODIAC_POSITIONS[ci].y})`}
            >
              {c.lines.map(([a, b], li) => (
                <line
                  key={`l${ci}-${li}`}
                  opacity={0.35}
                  stroke="#fff"
                  strokeWidth={0.8}
                  x1={c.stars[a].x}
                  x2={c.stars[b].x}
                  y1={c.stars[a].y}
                  y2={c.stars[b].y}
                />
              ))}
              {c.stars.map((s, si) => (
                <circle
                  key={`s${ci}-${si}`}
                  className={`star-${s.mag}`}
                  cx={s.x}
                  cy={s.y}
                  fill="#fff"
                  r={s.mag === 1 ? 2.5 : s.mag === 2 ? 1.8 : 1.2}
                  style={{ animationDelay: `${(ci * 0.7 + si * 0.4) % 6}s` }}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#f87171', fontSize: '14px' }}>
            Failed to load globe: {error || globeError}
          </p>
        </div>
      )}

      {!ready && !hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #4da6ff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 500 }}>
              Loading globe...
            </p>
          </div>
        </div>
      )}

      {ready && (
        <Globe
          ref={globeRef}
          arcAltitudeAutoScale={0.4}
          arcColor={(d: object) => {
            const arc = d as ArcDatum;
            if (arc.direction === 'downstream')
              return ['#ffffffe6', '#ffffff66'];
            const c = getContrastColor(arc.color);
            return [`${c}e6`, `${c}66`];
          }}
          arcDashAnimateTime={1500}
          arcDashGap={0.2}
          arcDashLength={0.4}
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcLabel={(d: object) => {
            const arc = d as ArcDatum;
            const arrow = arc.direction === 'upstream' ? '\u2192' : '\u2190';
            return `<span style="color:#fff;font-size:12px">${arc.label} ${arrow}</span>`;
          }}
          arcsData={influenceArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcsTransitionDuration={800}
          arcStroke={0.5}
          atmosphereAltitude={0.25}
          atmosphereColor="#4da6ff"
          polygonLabel={(polygon: object) => {
            const feat = polygon as Feature;
            const isState = feat.properties?._layer === 'state';
            const name = feat.properties?.NAME ?? feat.properties?.name ?? '';
            if (isState) {
              return `<span style="color: #d4d4d8; font-size: 12px;">${name}</span>`;
            }
            return `<span style="color: #fff; font-size: 13px; font-weight: 600;">${name}</span>`;
          }}
          // City hexagons
          backgroundColor="rgba(0,0,0,0)"
          enablePointerInteraction={true}
          globeImageUrl=""
          globeMaterial={globeMaterial}
          height={size.height}
          hexAltitude={0.018}
          hexBinMerge={false}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinPointsData={hexPoints}
          hexBinPointWeight={1}
          hexBinResolution={4}
          hexLabel={(d: object) => {
            const hex = d as { points: HexPoint[] };
            const names = hex.points.map((p) => p.name).join(', ');
            return `<span style="color:#fff;font-size:12px;font-weight:600">${names}</span>`;
          }}
          hexMargin={0.05}
          hexSideColor={(d: object) => {
            const hex = d as { points: HexPoint[] };
            const isCitySelected =
              selectedLocation?.type === 'city' &&
              hex.points.some((p) => p.id === selectedLocation.id);
            const isPinnedCity =
              pinnedEvent &&
              hex.points.some(
                (p) =>
                  p.name.toLowerCase() ===
                  pinnedEvent.location.city.toLowerCase(),
              );
            if (isCitySelected || isPinnedCity)
              return 'rgba(255, 255, 255, 0.8)';
            const base = hex.points[0]?.color ?? '#ffffff';
            return `${getContrastColor(base)}99`;
          }}
          hexTopColor={(d: object) => {
            const hex = d as { points: HexPoint[] };
            const isCitySelected =
              selectedLocation?.type === 'city' &&
              hex.points.some((p) => p.id === selectedLocation.id);
            const isPinnedCity =
              pinnedEvent &&
              hex.points.some(
                (p) =>
                  p.name.toLowerCase() ===
                  pinnedEvent.location.city.toLowerCase(),
              );
            if (isCitySelected || isPinnedCity) return '#ffffff';
            const base = hex.points[0]?.color ?? '#ffffff';
            return getContrastColor(base);
          }}
          hexTransitionDuration={800}
          pointAltitude={0.01}
          pointLabel={(d: object) => {
            const p = d as PinnedPoint;
            return `<span style="color:#fff;font-size:12px;font-weight:600">${p.name}</span>`;
          }}
          // Influence arcs
          pointColor={(d: object) => (d as PinnedPoint).color}
          pointLat="lat"
          pointLng="lng"
          pointRadius={(d: object) => (d as PinnedPoint).size}
          polygonAltitude={polygonAltitude}
          polygonCapMaterial={polygonCapMaterial}
          polygonGeoJsonGeometry="geometry"
          polygonSideMaterial={polygonSideMaterial}
          polygonStrokeColor={polygonStrokeColor}
          showAtmosphere={true}
          width={size.width}
          onPolygonClick={handlePolygonClick}
          onZoom={handleZoom}
          onArcClick={(d: object) => {
            const arc = d as ArcDatum;
            const event = MUSIC_HISTORY.find((e) => e.id === arc.eventId);
            if (event) {
              dispatch({ type: 'PIN_EVENT', payload: event });
              dispatch({
                type: 'EXECUTE_SEARCH',
                payload: {
                  lat: event.location.lat,
                  lng: event.location.lng,
                  zoom: 10,
                },
              });
            }
          }}
          // Controls
          animateIn={true}
          // Country + state polygons (vector landmasses)
          polygonsData={polygonFeatures}
          onHexClick={handleHexClick}
          // Pinned event point
          pointsData={pinnedPointData}
        />
      )}

      <GlobeController globeRef={globeRef} />
    </div>
  );
}
