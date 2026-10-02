import type { Feature } from 'geojson';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshLambertMaterial } from 'three';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  CITIES,
  getRecursiveArcsForEvent,
  CITY_COUNTRY_TO_ISO,
  type ArcDatum,
} from '@/components/atlas/data';
import { getEventsForArtist } from '@/components/atlas/data/artists';
import {
  getCountryColor,
  getContrastColor,
} from '@/components/atlas/data/continentColors';
import { useGeoData, useGlobeLighting } from '@/components/atlas/hooks';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { markFlown } from '@/components/atlas/navigation/focusEvent';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import type { SelectedLocation } from '@/components/atlas/types';
import { resolveFocusCities } from '@/components/atlas/utils/resolveFocusCities';
import { GlobeController } from './GlobeController';
import {
  createOceanMaterial,
  makePolygonMaterialAccessors,
} from './globeVisuals';

interface HexPoint {
  lat: number;
  lng: number;
  id: string;
  name: string;
  color: string;
}

interface HexBin {
  points: HexPoint[];
}

interface PinnedPoint {
  lat: number;
  lng: number;
  name: string;
  color: string;
  size: number;
  /** The event the point stands for — clicking it opens that event. */
  eventId: string;
}

/** Event titles carry quotes and ampersands; globe.gl sets labels as HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Stable accessors ───────────────────────────────────────────────────────
 *
 * react-kapsule forwards any prop whose REFERENCE changed (react-kapsule.mjs:
 * "filter(p => prevPropsRef.current[p] !== props[p])"), and three-globe declares
 * arcColor / hexTopColor / hexSideColor / pointColor / pointRadius WITHOUT
 * `triggerUpdate: false` — so an inline arrow re-runs that layer's update on
 * every React render, rebuilding ~300 hex geometries and re-uploading every
 * arc's vertex colours. Anything that depends only on its datum therefore lives
 * out here, where its identity never changes. Accessors that depend on the
 * current selection are useCallback'd on the selection itself, so they change
 * once per selection (which is the digest we actually want).
 */

const arcColorAccessor = (d: object): [string, string] => {
  const arc = d as ArcDatum;
  if (arc.direction === 'downstream') return ['#ffffffe6', '#ffffff66'];
  const c = getContrastColor(arc.color);
  return [`${c}e6`, `${c}66`];
};

const arcLabelAccessor = (d: object): string => {
  const arc = d as ArcDatum;
  const arrow = arc.direction === 'upstream' ? '→' : '←';
  return `<span style="color:#fff;font-size:12px">${escapeHtml(arc.label)} ${arrow}</span>`;
};

const polygonLabelAccessor = (polygon: object): string => {
  const feat = polygon as Feature;
  const isState = feat.properties?._layer === 'state';
  const name = feat.properties?.NAME ?? feat.properties?.name ?? '';
  if (isState) {
    return `<span style="color: #d4d4d8; font-size: 12px;">${name}</span>`;
  }
  return `<span style="color: #fff; font-size: 13px; font-weight: 600;">${name}</span>`;
};

const hexLabelAccessor = (d: object): string => {
  const hex = d as HexBin;
  const names = hex.points.map((p) => p.name).join(', ');
  return `<span style="color:#fff;font-size:12px;font-weight:600">${names}</span>`;
};

const pointLabelAccessor = (d: object): string => {
  const p = d as PinnedPoint;
  return `<span style="color:#fff;font-size:12px;font-weight:600">${escapeHtml(p.name)}</span>`;
};

const pointColorAccessor = (d: object): string => (d as PinnedPoint).color;
const pointRadiusAccessor = (d: object): number => (d as PinnedPoint).size;

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

/**
 * State/province polygons appear below this altitude. Hysteresis: the camera
 * has to travel past the far edge of the band to flip the layer back, so a
 * fly that settles near the threshold cannot oscillate.
 */
const SHOW_STATES_ENTER = 2.1;
const SHOW_STATES_LEAVE = 2.3;

/** Full device pixel ratio on a full-viewport canvas is 2-3x the pixels we need. */
const MAX_PIXEL_RATIO = 1.5;

/**
 * Must be passed on the first mount — globe.gl reads it when it constructs the
 * WebGLRenderer and ignores later changes.
 */
const RENDERER_CONFIG = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' as const,
};

type AnimatableGlobe = GlobeMethods & {
  pauseAnimation: () => void;
  resumeAnimation: () => void;
};

export function BaseGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { countries, adminRegions, loading, error } = useGeoData();
  const {
    pinnedEvent,
    selectedLocation,
    visibleArcDirections,
    activeModule,
    activeTour,
    detailsPanelWidth,
  } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useAtlasNavigate();
  const [GlobeModule, setGlobeModule] = useState<
    typeof import('react-globe.gl').default | null
  >(null);
  const [globeError, setGlobeError] = useState<string | null>(null);
  // True once react-globe.gl has fully initialised; gates the camera fly so a
  // deep-link fly target set before the globe loads is still applied.
  const [globeReady, setGlobeReady] = useState(false);
  // Ocean material — matte black so continents float on a dark sphere
  const globeMaterial = useMemo(() => createOceanMaterial(), []);

  // Day/night lighting (camera-attached directional light). Keyed on
  // globeReady: the globe element does not exist on the first render, so an
  // effect that ran only on mount would never find a camera to attach to.
  useGlobeLighting(globeRef, globeReady);

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

  // Altitude drives exactly one thing: whether state/province polygons show.
  // globe.gl calls onZoom from the OrbitControls 'change' handler, i.e. on
  // EVERY frame while flying, dragging or auto-rotating, so the raw number is
  // kept in a ref and only the boolean reaches React.
  const altitudeRef = useRef(2.5);
  const [showStates, setShowStates] = useState(false);

  // Country polygons and state polygons are memoised SEPARATELY and never
  // rebuilt: three-globe stamps a random `__id` on each feature object and
  // diffs on it (three-globe.mjs:2244), so re-spreading the features would
  // make it tear down and rebuild all ~620 conic geometries every time the
  // camera crossed the threshold.
  const countryFeatures = useMemo(
    () =>
      (countries?.features ?? []).map((f) => ({
        ...f,
        properties: { ...f.properties, _layer: 'country' },
      })),
    [countries],
  );

  const stateFeatures = useMemo(
    () =>
      (adminRegions?.features ?? []).map((f) => ({
        ...f,
        properties: { ...f.properties, _layer: 'state' },
      })),
    [adminRegions],
  );

  const polygonFeatures = useMemo(
    () =>
      showStates && stateFeatures.length > 0
        ? [...countryFeatures, ...stateFeatures]
        : countryFeatures,
    [countryFeatures, stateFeatures, showStates],
  );

  // While a guided sequence (Pathway / Region tour / City tour) is active, the
  // globe is simplified to just that selection's cities; otherwise all cities.
  const focusCities = useMemo(
    () => resolveFocusCities(activeModule, activeTour),
    [activeModule, activeTour],
  );

  // City hex data — all cities, or only the focus set during a sequence.
  const hexPoints: HexPoint[] = useMemo(() => {
    const source = focusCities
      ? CITIES.filter((c) => focusCities.has(c.id))
      : CITIES;
    return source.map((city) => {
      const iso = CITY_COUNTRY_TO_ISO[city.country];
      return {
        lat: city.coordinates[0],
        lng: city.coordinates[1],
        id: city.id,
        name: city.name,
        color: iso ? getCountryColor(iso) : '#ffffff',
      };
    });
  }, [focusCities]);

  // Pinned marker removed — the pinned city is shown via its highlighted hex.
  // An artist stop lights up every place that artist's events happened, so the
  // globe shows the shape of a career (Wes Montgomery: Indianapolis → New York).
  const stop = useAtlasStop();
  const artist = stop.kind === 'artist' ? stop.artist : null;
  const pinnedPointData: PinnedPoint[] = useMemo(() => {
    if (!artist) return [];
    return getEventsForArtist(artist).map((e) => ({
      lat: e.location.lat,
      lng: e.location.lng,
      name: `${e.title} · ${e.year}`,
      color: '#ffffff',
      size: 0.45,
      eventId: e.id,
    }));
  }, [artist]);

  // Influence arcs for pinned event — filtered by which dropdowns are open
  const allArcs = useMemo(() => {
    if (!pinnedEvent) return [];
    return getRecursiveArcsForEvent(pinnedEvent.id);
  }, [pinnedEvent]);

  const influenceArcs = useMemo(() => {
    if (visibleArcDirections.size === 0) return []; // No dropdowns open → no arcs
    return allArcs.filter((arc) => visibleArcDirections.has(arc.direction));
  }, [allArcs, visibleArcDirections]);

  // Altitude tracking — ref-only, plus a hysteresis flip of the states layer.
  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => {
      altitudeRef.current = pov.altitude;
      setShowStates((current) =>
        current
          ? pov.altitude <= SHOW_STATES_LEAVE
          : pov.altitude < SHOW_STATES_ENTER,
      );
    },
    [],
  );

  // Country/state/province polygon click — fly to the polygon's own centroid,
  // then record the place as a stop (so it is a history entry and a bookmark).
  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      const name = feat.properties?.NAME ?? feat.properties?.name ?? 'Unknown';
      const centroid = getCentroid(feat);

      const place: SelectedLocation =
        feat.properties?._layer === 'state'
          ? {
              type: 'state',
              name,
              country:
                (feat.properties?.iso_a2 ?? '') === 'CA'
                  ? 'Canada'
                  : 'United States',
            }
          : {
              type: 'country',
              name,
              iso: feat.properties?.ISO_A3 ?? feat.properties?.iso_a3 ?? '',
            };

      if (centroid) {
        dispatch({
          type: 'EXECUTE_SEARCH',
          payload: { lat: centroid.lat, lng: centroid.lng, zoom: 10 },
        });
        markFlown(stopKey({ kind: 'place', place }));
      }
      navigate.toPlace(place);
    },
    [dispatch, navigate],
  );

  // Hex click — open the city
  const handleHexClick = useCallback(
    (hex: object) => {
      const h = hex as HexBin;
      if (h.points.length > 0) {
        navigate.toPlace({ type: 'city', id: h.points[0].id });
      }
    },
    [navigate],
  );

  const handlePointClick = useCallback(
    (d: object) => navigate.toEvent((d as PinnedPoint).eventId),
    [navigate],
  );

  const handleArcClick = useCallback(
    (d: object) => navigate.toEvent((d as ArcDatum).eventId),
    [navigate],
  );

  const handleGlobeReady = useCallback(() => {
    // The oversized full-viewport canvas is the single biggest GPU cost here,
    // and three-render-objects only clamps the ratio to 2.
    globeRef.current
      ?.renderer()
      .setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    setGlobeReady(true);
  }, []);

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

  // Polygon cap/side materials (light-responsive for day/night shading), bound
  // to the per-instance caches above and shared with HeroGlobe via globeVisuals.
  const { polygonCapMaterial, polygonSideMaterial } = useMemo(
    () =>
      makePolygonMaterialAccessors(capMatCache.current, sideMatCache.current),
    [],
  );

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

  // A hex is highlighted when it holds the selected city or the pinned event's
  // city. Derived to primitives so the two colour accessors below change
  // identity once per selection instead of once per render.
  const selectedCityId =
    selectedLocation?.type === 'city' ? selectedLocation.id : null;
  const pinnedCityName = pinnedEvent
    ? pinnedEvent.location.city.toLowerCase()
    : null;

  const isHexHighlighted = useCallback(
    (points: HexPoint[]): boolean =>
      (selectedCityId !== null &&
        points.some((p) => p.id === selectedCityId)) ||
      (pinnedCityName !== null &&
        points.some((p) => p.name.toLowerCase() === pinnedCityName)),
    [selectedCityId, pinnedCityName],
  );

  const hexSideColor = useCallback(
    (d: object) => {
      const hex = d as HexBin;
      if (isHexHighlighted(hex.points)) return 'rgba(255, 255, 255, 0.8)';
      const base = hex.points[0]?.color ?? '#ffffff';
      return `${getContrastColor(base)}cc`;
    },
    [isHexHighlighted],
  );

  const hexTopColor = useCallback(
    (d: object) => {
      const hex = d as HexBin;
      if (isHexHighlighted(hex.points)) return '#ffffff';
      const base = hex.points[0]?.color ?? '#ffffff';
      return getContrastColor(base);
    },
    [isHexHighlighted],
  );

  const Globe = GlobeModule;
  const hasError = error || globeError;
  const ready =
    !loading && !hasError && size.width > 0 && size.height > 0 && Globe;

  // Stop rendering entirely while the tab is hidden or the globe is scrolled
  // out of view — otherwise the arc dash animation and the globe's rotation
  // keep the GPU busy behind a background tab.
  useEffect(() => {
    if (!globeReady) return;
    const globe = globeRef.current as AnimatableGlobe | undefined;
    const el = containerRef.current;
    if (!globe || !el) return;

    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden) globe.resumeAnimation();
      else globe.pauseAnimation();
    };

    const io = new IntersectionObserver(([entry]) => {
      onScreen = !!entry?.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      globe.resumeAnimation();
    };
  }, [globeReady]);

  // When an event card is expanded it overlays the left; slide the globe right
  // by half the card's occluding width so the centred region clears the card.
  const targetShiftX = detailsPanelWidth
    ? Math.round((16 + detailsPanelWidth) / 2)
    : 0;

  // Animate the lens-shift so the region glides into view instead of jumping
  // when a card opens / closes / resizes. Tweens the offset over ~500ms via rAF;
  // a new target mid-tween eases from the current value (no snap).
  const [shiftX, setShiftX] = useState(0);
  const shiftRef = useRef(0);
  const shiftRaf = useRef<number | null>(null);
  useEffect(() => {
    const from = shiftRef.current;
    const to = targetShiftX;
    if (Math.abs(from - to) < 0.5) {
      shiftRef.current = to;
      setShiftX(to);
      return;
    }
    const duration = 500;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      startTs ??= ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const value = from + (to - from) * eased;
      shiftRef.current = value;
      setShiftX(value);
      shiftRaf.current = p < 1 ? requestAnimationFrame(tick) : null;
    };
    if (shiftRaf.current) cancelAnimationFrame(shiftRaf.current);
    shiftRaf.current = requestAnimationFrame(tick);
    return () => {
      if (shiftRaf.current) cancelAnimationFrame(shiftRaf.current);
    };
  }, [targetShiftX]);

  // Off-axis lens-shift via react-globe.gl's globeOffset (px): positive x frames
  // the region to the right while the canvas keeps rendering the full viewport.
  const globeOffset = useMemo<[number, number]>(() => [shiftX, 0], [shiftX]);

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
          globeOffset={globeOffset}
          rendererConfig={RENDERER_CONFIG}
          arcAltitudeAutoScale={0.4}
          arcColor={arcColorAccessor}
          arcDashAnimateTime={1500}
          arcDashGap={0.2}
          arcDashLength={0.4}
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcLabel={arcLabelAccessor}
          arcsData={influenceArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          // 0, not 800: the entrance tween rebuilds a TubeGeometry per arc per
          // frame, which is what made opening a dense influence web stall. The
          // shader dash animation still supplies the sense of motion.
          arcsTransitionDuration={0}
          arcStroke={0.5}
          atmosphereAltitude={0.18}
          atmosphereColor="#ffffff"
          polygonLabel={polygonLabelAccessor}
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
          hexLabel={hexLabelAccessor}
          hexMargin={0.05}
          hexSideColor={hexSideColor}
          hexTopColor={hexTopColor}
          hexTransitionDuration={800}
          pointAltitude={0.03}
          pointLabel={pointLabelAccessor}
          // Influence arcs
          pointColor={pointColorAccessor}
          onPointClick={handlePointClick}
          pointLat="lat"
          pointLng="lng"
          pointRadius={pointRadiusAccessor}
          polygonAltitude={polygonAltitude}
          polygonCapMaterial={polygonCapMaterial}
          polygonGeoJsonGeometry="geometry"
          polygonSideMaterial={polygonSideMaterial}
          polygonStrokeColor={polygonStrokeColor}
          polygonsTransitionDuration={250}
          showAtmosphere={true}
          width={size.width}
          onPolygonClick={handlePolygonClick}
          onZoom={handleZoom}
          onArcClick={handleArcClick}
          // Controls
          // No mount intro animation — a deep-link fly would otherwise animate
          // to the default view first (disorienting). GlobeController positions
          // the camera directly over the target instead.
          animateIn={false}
          onGlobeReady={handleGlobeReady}
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
