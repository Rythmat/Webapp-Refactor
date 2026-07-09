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
  const { globeAltitude, pinnedEvent, selectedLocation, visibleArcDirections } =
    useAppState();
  const dispatch = useAppDispatch();
  const [GlobeModule, setGlobeModule] = useState<
    typeof import('react-globe.gl').default | null
  >(null);
  const [globeError, setGlobeError] = useState<string | null>(null);
  // True once react-globe.gl has fully initialised; gates the camera fly so a
  // deep-link fly target set before the globe loads is still applied.
  const [globeReady, setGlobeReady] = useState(false);
  // Ocean material — matte black so continents float on a dark sphere
  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x33d6ff,
        specular: 0x000000,
        shininess: 0,
      }),
    [],
  );

  // Day/night lighting (camera-attached directional light)
  useGlobeLighting(globeRef);

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

  // Pinned marker removed — the pinned city is shown via its highlighted hex.
  const pinnedPointData: PinnedPoint[] = useMemo(() => [], []);

  // Influence arcs for pinned event — filtered by which dropdowns are open
  const allArcs = useMemo(() => {
    if (!pinnedEvent) return [];
    return getRecursiveArcsForEvent(pinnedEvent.id);
  }, [pinnedEvent]);

  const influenceArcs = useMemo(() => {
    if (visibleArcDirections.size === 0) return []; // No dropdowns open → no arcs
    return allArcs.filter((arc: any) =>
      visibleArcDirections.has(arc.direction),
    );
  }, [allArcs, visibleArcDirections]);

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
        emissive: 0x1a1410,
        transparent: true,
        opacity: 0.86,
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
      if (isSelected(feat)) return 'rgba(255, 210, 140, 0.95)';
      if (feat.properties?._layer === 'state') return 'rgba(130, 110, 80, 0.6)';
      return 'rgba(90, 78, 58, 0.85)';
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
          <p style={{ color: '#f26255', fontSize: '14px' }}>
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
                border: '3px solid #60a5fa',
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
          atmosphereAltitude={0.18}
          atmosphereColor="#ffffff"
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
            return `${getContrastColor(base)}cc`;
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
          pointAltitude={0.03}
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
          // No mount intro animation — a deep-link fly would otherwise animate
          // to the default view first (disorienting). GlobeController positions
          // the camera directly over the target instead.
          animateIn={false}
          onGlobeReady={() => setGlobeReady(true)}
          // Country + state polygons (vector landmasses)
          polygonsData={polygonFeatures}
          onHexClick={handleHexClick}
          // Pinned event point
          pointsData={pinnedPointData}
        />
      )}

      <GlobeController globeRef={globeRef} ready={globeReady} />
    </div>
  );
}
