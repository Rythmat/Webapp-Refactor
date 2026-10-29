import type { Feature } from 'geojson';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';
import { MeshLambertMaterial } from 'three';
import type { ArcDatum } from '@/components/atlas/data';
import { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useGlobeLighting } from '@/components/atlas/hooks/useGlobeLighting';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { GlobeController } from './GlobeController';
import { GlobeStatus } from './GlobeStatus';
import {
  arcLabel,
  citiesLabel,
  featureName,
  getCentroid,
  isRegionSelected,
  placeOfRegion,
  pointLabel,
  regionLabel,
} from './globeLabels';
import {
  arcColors,
  cityBaseColor,
  cityColumnColors,
  isCityHighlighted,
  visiblePolygons,
  type ArtistPoint,
  type CityPoint,
} from './globeLayers';
import {
  ATMOSPHERE,
  createOceanMaterial,
  makePolygonMaterialAccessors,
} from './globeVisuals';
import { useGlobeClicks, useGlobeScene } from './useGlobeScene';

interface HexBin {
  points: CityPoint[];
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

const arcColorAccessor = (d: object): [string, string] =>
  arcColors(d as ArcDatum);

/* Hover labels (globeLabels.ts), shared with the MapLibre engine. globe.gl
 * puts them in its tooltip box, which index.css turns into a small panel. */
const arcLabelAccessor = (d: object): string => arcLabel(d as ArcDatum);

const polygonLabelAccessor = (polygon: object): string => {
  const feat = polygon as Feature;
  return regionLabel(featureName(feat), feat.properties?._layer === 'state');
};

const hexLabelAccessor = (d: object): string =>
  citiesLabel((d as HexBin).points.map((p) => p.name));

const pointLabelAccessor = (d: object): string =>
  pointLabel((d as ArtistPoint).name);

const pointColorAccessor = (d: object): string => (d as ArtistPoint).color;
const pointRadiusAccessor = (d: object): number => (d as ArtistPoint).size;

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

type GlobeComponent = typeof import('react-globe.gl').default;

/**
 * react-globe.gl with its `globeOffset` following the Inspector.
 *
 * While the Inspector is open it overlays the right, so the globe slides
 * left by half of what it covers and the centred region clears it.
 * On a phone the bottom sheet covers the bottom instead, and the globe rises
 * by half the sheet's height.
 * This lives in its own component, subscribed to that width alone, so a
 * resize — and every frame of the ~500 ms tween after it — re-renders only
 * this wrapper. react-kapsule then forwards just the one prop that changed;
 * BaseGlobe and every layer accessor are left alone.
 */
function OffsetGlobe({
  Globe,
  globeRef,
  ...props
}: GlobeProps & {
  Globe: GlobeComponent;
  globeRef: React.MutableRefObject<GlobeMethods | undefined>;
}) {
  const inspectorWidth = useAtlasSelector((s) => s.inspectorWidth);
  const sheetOcclusion = useAtlasSelector((s) => s.sheetOcclusion);
  const reducedMotion = usePrefersReducedMotion();
  // The Inspector covers the map's right edge: shift left by half of it.
  const targetShiftX = inspectorWidth
    ? -Math.round((16 + inspectorWidth) / 2)
    : 0;
  // A phone's bottom sheet covers the bottom: lift the globe by half of it.
  const targetShiftY = sheetOcclusion ? -Math.round(sheetOcclusion / 2) : 0;

  // Animate the lens-shift so the region glides into view instead of jumping
  // when a card or the sheet opens / closes / resizes. Tweens the offset over
  // ~500ms via rAF; a new target mid-tween eases from the current value (no
  // snap). Reduced motion moves it at once.
  const [shift, setShift] = useState<[number, number]>([0, 0]);
  const shiftRef = useRef<[number, number]>([0, 0]);
  const shiftRaf = useRef<number | null>(null);
  useEffect(() => {
    const from = shiftRef.current;
    const to: [number, number] = [targetShiftX, targetShiftY];
    if (
      (Math.abs(from[0] - to[0]) < 0.5 && Math.abs(from[1] - to[1]) < 0.5) ||
      reducedMotion
    ) {
      shiftRef.current = to;
      setShift(to);
      return;
    }
    const duration = 500;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      startTs ??= ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const value: [number, number] = [
        from[0] + (to[0] - from[0]) * eased,
        from[1] + (to[1] - from[1]) * eased,
      ];
      shiftRef.current = value;
      setShift(value);
      shiftRaf.current = p < 1 ? requestAnimationFrame(tick) : null;
    };
    if (shiftRaf.current) cancelAnimationFrame(shiftRaf.current);
    shiftRaf.current = requestAnimationFrame(tick);
    return () => {
      if (shiftRaf.current) cancelAnimationFrame(shiftRaf.current);
    };
  }, [targetShiftX, targetShiftY, reducedMotion]);

  // Off-axis lens-shift via react-globe.gl's globeOffset (px): positive x frames
  // the region to the right and negative y frames it higher, while the canvas
  // keeps rendering the full viewport.
  const globeOffset = shift;

  return <Globe ref={globeRef} {...props} globeOffset={globeOffset} />;
}

export function BaseGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { countries, adminRegions, loading, error } = useGeoData();
  const {
    layers,
    selectedLocation,
    cityPoints,
    artistPoints,
    influenceArcs,
    selectedCityId,
    pinnedCityId,
  } = useGlobeScene();
  const statesInView = useAtlasSelector((s) => s.statesInView);
  const dispatch = useAtlasDispatch();
  const clicks = useGlobeClicks();
  // Reduced motion: the arc dashes hold still and layers change without
  // tweening (camera flights cut, in GlobeController).
  const reducedMotion = usePrefersReducedMotion();
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
  // kept in a ref and only the boolean reaches the store (where the legend
  // reads it too).
  const altitudeRef = useRef(2.5);
  const statesInViewRef = useRef(statesInView);

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
    () => visiblePolygons(layers, countryFeatures, stateFeatures, statesInView),
    [layers, countryFeatures, stateFeatures, statesInView],
  );

  const countryColors = layers.countryColors;

  // Altitude tracking — ref-only, plus a hysteresis flip of the states layer.
  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => {
      altitudeRef.current = pov.altitude;
      const next = statesInViewRef.current
        ? pov.altitude <= SHOW_STATES_LEAVE
        : pov.altitude < SHOW_STATES_ENTER;
      if (next === statesInViewRef.current) return;
      statesInViewRef.current = next;
      dispatch({ type: 'SET_STATES_IN_VIEW', payload: next });
    },
    [dispatch],
  );

  // Country/state/province polygon click — fly to the polygon's own centroid,
  // then record the place as a stop (so it is a history entry and a bookmark).
  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      clicks.region(placeOfRegion(feat.properties), getCentroid(feat));
    },
    [clicks],
  );

  // Hex click — open the city
  const handleHexClick = useCallback(
    (hex: object) => {
      const h = hex as HexBin;
      if (h.points.length > 0) clicks.city(h.points[0].id);
    },
    [clicks],
  );

  const handlePointClick = useCallback(
    (d: object) => clicks.event((d as ArtistPoint).eventId),
    [clicks],
  );

  const handleArcClick = useCallback(
    (d: object) => clicks.event((d as ArcDatum).eventId),
    [clicks],
  );

  const handleGlobeReady = useCallback(() => {
    // The oversized full-viewport canvas is the single biggest GPU cost here,
    // and three-render-objects only clamps the ratio to 2.
    globeRef.current
      ?.renderer()
      .setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    // scripts/measureGlobe.mjs times the first globe frame from this mark.
    performance.mark('atlas:globe-ready');
    setGlobeReady(true);
  }, []);

  // Dev server only: lets scripts/measureGlobe.mjs aim the camera and find a
  // city on screen, so it can click a real hex. The literal DEV guard folds
  // the hook out of production builds (verifyProdBundle.mjs checks).
  useEffect(() => {
    if (!import.meta.env.DEV || !globeReady) return;
    const w = window as unknown as { __atlasGlobeDebug?: unknown };
    w.__atlasGlobeDebug = {
      screenOf: (lat: number, lng: number, altitude = 0) =>
        globeRef.current?.getScreenCoords(lat, lng, altitude) ?? null,
      pointOfView: (
        pov: { lat: number; lng: number; altitude: number },
        ms = 0,
      ) => globeRef.current?.pointOfView(pov, ms),
    };
    return () => {
      delete w.__atlasGlobeDebug;
    };
  }, [globeReady]);

  // Check if a polygon feature matches the current selection
  const isSelected = useCallback(
    (feat: Feature): boolean =>
      isRegionSelected(feat.properties, selectedLocation),
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
  // to the per-instance caches above (factories in globeVisuals).
  // Country colours switched off in Layers: new accessors, so the polygon
  // layer re-paints in place.
  const { polygonCapMaterial, polygonSideMaterial } = useMemo(
    () =>
      makePolygonMaterialAccessors(
        capMatCache.current,
        sideMatCache.current,
        countryColors,
      ),
    [countryColors],
  );

  const polygonStrokeColor = useCallback(
    (polygon: object) => {
      const feat = polygon as Feature;
      if (isSelected(feat)) return ATLAS_SCENE.strokeSelected;
      if (feat.properties?._layer === 'state') return ATLAS_SCENE.strokeState;
      return ATLAS_SCENE.strokeCountry;
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
  // city. useGlobeScene derives both to primitives, so the two colour
  // accessors below change identity once per selection, not once per render.
  const isHexHighlighted = useCallback(
    (points: CityPoint[]): boolean =>
      isCityHighlighted(points, selectedCityId, pinnedCityId),
    [selectedCityId, pinnedCityId],
  );

  const hexSideColor = useCallback(
    (d: object) => {
      const hex = d as HexBin;
      return cityColumnColors(
        hex.points[0]?.color ?? cityBaseColor(undefined, true),
        isHexHighlighted(hex.points),
      ).side;
    },
    [isHexHighlighted],
  );

  const hexTopColor = useCallback(
    (d: object) => {
      const hex = d as HexBin;
      return cityColumnColors(
        hex.points[0]?.color ?? cityBaseColor(undefined, true),
        isHexHighlighted(hex.points),
      ).top;
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-atlas-canvas"
    >
      {hasError && <GlobeStatus error={error || globeError} />}

      {!ready && !hasError && <GlobeStatus />}

      {ready && (
        <OffsetGlobe
          Globe={Globe}
          globeRef={globeRef}
          rendererConfig={RENDERER_CONFIG}
          arcAltitudeAutoScale={0.4}
          arcColor={arcColorAccessor}
          arcDashAnimateTime={reducedMotion ? 0 : 1500}
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
          atmosphereColor={ATMOSPHERE.color}
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
          hexBinPointsData={cityPoints}
          hexBinPointWeight={1}
          hexBinResolution={4}
          hexLabel={hexLabelAccessor}
          hexMargin={0.05}
          hexSideColor={hexSideColor}
          hexTopColor={hexTopColor}
          hexTransitionDuration={reducedMotion ? 0 : 800}
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
          polygonsTransitionDuration={reducedMotion ? 0 : 250}
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
          pointsData={artistPoints}
        />
      )}

      <GlobeController globeRef={globeRef} ready={globeReady} />
    </div>
  );
}
