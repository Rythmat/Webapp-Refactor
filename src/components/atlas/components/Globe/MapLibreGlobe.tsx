import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import {
  Map as MapLibreMap,
  Popup,
  addProtocol,
  setWorkerUrl,
  type GeoJSONSource,
  type PaddingOptions,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Protocol } from 'pmtiles';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { GlobeStatus } from './GlobeStatus';
import { isRegionSelected } from './globeLabels';
import {
  ARC_DASH_STEPS,
  MAP_MAX_ZOOM,
  SPIN_DEGREES_PER_SECOND,
  altitudeToMapZoom,
  arcCollection,
  artistPointCollection,
  cityPointCollection,
  flightDuration,
  flyZoom,
  regionCollection,
  statesInViewAt,
  type RegionProps,
} from './mapGeometry';
import {
  labelOf,
  regionsClickable,
  targetOf,
  topFeature,
  type PickedFeature,
} from './mapPicking';
import {
  CLICK_LAYERS,
  LAYER,
  SOURCE,
  assetsUrlFromEnv,
  basemapFromEnv,
  basemapLang,
  buildStyle,
} from './mapStyle';
import { useGlobeClicks, useGlobeScene } from './useGlobeScene';

/**
 * The Globe page's map on MapLibre GL (docs/globe-ui/ENGINE.md): a 3-D globe
 * that zooms from the whole planet down to street level over a Protomaps
 * basemap, drawing what BaseGlobe (three.js) drew — coloured countries, the
 * US/Canada states, the music cities (as dots, where three.js raised
 * columns), an artist's points and influence arcs —
 * from the same state (useGlobeScene) and answering clicks the same way
 * (useGlobeClicks).
 *
 * The map is made once. Everything after that reaches it through setData,
 * feature-state and the camera, never a new map, so a selection or a layer
 * switch costs one source update.
 */

/** Full device pixel ratio on a full-viewport canvas is 2-3x the pixels we need. */
const MAX_PIXEL_RATIO = 1.5;

/** The camera before any fly: the three.js globe's default, altitude 2.5. */
const START = { lat: 20, lng: 0, altitude: 2.5 };

/** How often the arcs' dashes step along (MapLibre's line-animation example). */
const DASH_STEP_MS = 60;

let mapLibreSetUp = false;
/** One-off, process-wide: where the worker is, and the pmtiles:// protocol. */
function setUpMapLibre() {
  if (mapLibreSetUp) return;
  mapLibreSetUp = true;
  // Bundled, MapLibre would look for its worker beside the chunk it ended up
  // in; Vite emits the worker as its own file and hands us that file's URL.
  setWorkerUrl(workerUrl);
  addProtocol('pmtiles', new Protocol().tile);
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

const NO_PADDING: PaddingOptions = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The details card (desktop) or the bottom sheet (phones) covers part of the
 * map; padding moves the map's centre into what is left, as the three.js
 * globe's lens shift did. A component of its own, subscribed to the card's
 * width and the sheet's height alone, so dragging the card's edge re-renders
 * this and not the map's owner (the measuring script counts those renders).
 */
function MapPadding({
  map,
  paddingRef,
}: {
  map: MapLibreMap;
  /** Where flights read the padding to land with. */
  paddingRef: MutableRefObject<PaddingOptions>;
}) {
  const detailsPanelWidth = useAtlasSelector((s) => s.detailsPanelWidth);
  const sheetOcclusion = useAtlasSelector((s) => s.sheetOcclusion);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const left = detailsPanelWidth ? 16 + detailsPanelWidth : 0;
  const bottom = sheetOcclusion ?? 0;

  useEffect(() => {
    paddingRef.current = { top: 0, right: 0, left, bottom };
    const apply = () => {
      const now = map.getPadding();
      const to = paddingRef.current;
      if (now.left === to.left && now.bottom === to.bottom) return;
      map.easeTo({
        padding: to,
        duration: reducedMotionRef.current ? 0 : 500,
        essential: false,
      });
    };
    // A flight in progress carries the padding with it; any change after it
    // set off is applied once it lands.
    if (map.isMoving()) {
      map.once('moveend', apply);
      return () => {
        map.off('moveend', apply);
      };
    }
    apply();
  }, [map, paddingRef, left, bottom]);

  return null;
}

/** Feed a GeoJSON source, if the map (still) has it. */
function feed(map: MapLibreMap, id: string, data: FeatureCollection) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

export default function MapLibreGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const { countries, adminRegions, loading, error } = useGeoData();
  const {
    layers,
    selectedLocation,
    cityPoints,
    artistPoints,
    influenceArcs,
    selectedCityId,
    pinnedCityName,
  } = useGlobeScene();
  const clicks = useGlobeClicks();
  const dispatch = useAtlasDispatch();
  const reducedMotion = usePrefersReducedMotion();
  // Read when a flight starts; a change of setting alone flies nowhere.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const basemap = useMemo(
    () => basemapFromEnv(import.meta.env, window.location.href),
    [],
  );

  // Make the map, once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setUpMapLibre();
    const height = container.clientHeight || window.innerHeight;
    let created: MapLibreMap;
    try {
      created = new MapLibreMap({
        container,
        style: buildStyle({
          basemap,
          lang: basemapLang(document.documentElement.lang),
          assetsUrl: assetsUrlFromEnv(import.meta.env),
        }),
        center: [START.lng, START.lat],
        zoom: altitudeToMapZoom(START.altitude, height, START.lat),
        maxZoom: MAP_MAX_ZOOM,
        pixelRatio: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
        // The page draws the OpenStreetMap credit itself (MapCredit), in a
        // zone nothing covers; MapLibre's corner control sat under the
        // timeline and the phone's sheet.
        attributionControl: false,
        // A globe turns by being dragged; tilting and twisting it only
        // disorients, so those gestures are off.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : String(err));
      return;
    }
    created.touchZoomRotate.disableRotation();
    created.keyboard.disableRotation();
    // The map takes our data as soon as its style is parsed. 'load' waits
    // for every source, the basemap's too, and never comes if its tiles
    // cannot be reached; the globe must not wait on them.
    created.once('style.load', () => setMap(created));
    // scripts/measureGlobe.mjs times the first globe frame from this mark.
    created.once('load', () => performance.mark('atlas:globe-ready'));
    // A tile or a font that fails to load is not the page failing.
    created.on('error', (event) => {
      if (import.meta.env.DEV) console.warn('[atlas map]', event.error);
    });
    return () => {
      created.remove();
      setMap(null);
    };
  }, [basemap]);

  /* ── Sources ─────────────────────────────────────────────────────────── */

  const countryColors = layers.countryColors;
  const countryData = useMemo(
    () =>
      countries
        ? regionCollection(countries.features, 'country', countryColors)
        : null,
    [countries, countryColors],
  );
  const stateData = useMemo(
    () =>
      adminRegions && layers.states
        ? regionCollection(adminRegions.features, 'state', countryColors)
        : null,
    [adminRegions, layers.states, countryColors],
  );
  useEffect(() => {
    if (map) feed(map, SOURCE.countries, countryData ?? EMPTY);
  }, [map, countryData]);
  useEffect(() => {
    if (map) feed(map, SOURCE.states, stateData ?? EMPTY);
  }, [map, stateData]);

  // The selected country or state's outline, through feature-state, so a
  // selection never re-sends the outlines.
  useEffect(() => {
    if (!map) return;
    const mark = (
      source: string,
      data: {
        features: { id?: string | number; properties: RegionProps }[];
      } | null,
    ) => {
      map.removeFeatureState({ source });
      for (const feat of data?.features ?? []) {
        if (isRegionSelected(feat.properties, selectedLocation)) {
          map.setFeatureState({ source, id: feat.id }, { selected: true });
        }
      }
    };
    mark(SOURCE.countries, countryData);
    mark(SOURCE.states, stateData);
  }, [map, countryData, stateData, selectedLocation]);

  useEffect(() => {
    if (!map) return;
    feed(
      map,
      SOURCE.cityPoints,
      cityPointCollection(cityPoints, selectedCityId, pinnedCityName),
    );
  }, [map, cityPoints, selectedCityId, pinnedCityName]);

  useEffect(() => {
    if (map)
      feed(map, SOURCE.artistPoints, artistPointCollection(artistPoints));
  }, [map, artistPoints]);

  useEffect(() => {
    if (map) feed(map, SOURCE.arcs, arcCollection(influenceArcs));
  }, [map, influenceArcs]);

  /* ── Pointer ─────────────────────────────────────────────────────────── */

  // Hover labels and clicks, from the features under the pointer.
  useEffect(() => {
    if (!map) return;
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'atlas-map-label',
      offset: 12,
      maxWidth: '280px',
    });
    const withBasemap = basemap !== null;
    const pick = (point: { x: number; y: number }) => {
      const layersHere = CLICK_LAYERS.filter((id) => map.getLayer(id));
      const features = map.queryRenderedFeatures([point.x, point.y], {
        layers: [...layersHere],
      }) as unknown as PickedFeature[];
      return topFeature(features, regionsClickable(map.getZoom(), withBasemap));
    };
    const onMove = (e: {
      point: { x: number; y: number };
      lngLat: { lng: number; lat: number };
    }) => {
      const feature = pick(e.point);
      const label = labelOf(feature);
      map.getCanvas().style.cursor = targetOf(feature) ? 'pointer' : '';
      if (!label) {
        popup.remove();
        return;
      }
      popup.setLngLat(e.lngLat).setHTML(label);
      if (!popup.isOpen()) popup.addTo(map);
    };
    const onLeave = () => {
      popup.remove();
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: { point: { x: number; y: number } }) => {
      const target = targetOf(pick(e.point));
      if (!target) return;
      popup.remove();
      if (target.kind === 'event') clicks.event(target.eventId);
      else if (target.kind === 'city') clicks.city(target.cityId);
      else clicks.region(target.place, target.centroid);
    };
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('click', onClick);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('click', onClick);
      popup.remove();
    };
  }, [map, basemap, clicks]);

  /* ── Camera ──────────────────────────────────────────────────────────── */

  // The card or the sheet's padding (MapPadding, below), for flights to
  // land clear of it.
  const paddingRef = useRef<PaddingOptions>(NO_PADDING);

  // Fly to the search or stop target. Depends on `map` so a target set before
  // the map finished loading (a deep link) is applied once it has.
  const searchFlyTarget = useAtlasSelector((s) => s.searchFlyTarget);
  const flownBefore = useRef(false);
  useEffect(() => {
    if (!map || !searchFlyTarget) return;
    const height = map.getContainer().clientHeight;
    const { lat, lng, zoom } = searchFlyTarget;
    // The first flight is a deep link's: start over the target, zoomed out,
    // so the default view never shows, then fly in.
    if (!flownBefore.current) {
      map.jumpTo({
        center: [lng, lat],
        zoom: altitudeToMapZoom(START.altitude, height, lat),
        padding: paddingRef.current,
      });
    }
    flownBefore.current = true;
    map.flyTo({
      center: [lng, lat],
      zoom: flyZoom(zoom, height, lat),
      padding: paddingRef.current,
      duration: flightDuration(reducedMotionRef.current),
      // Not essential: MapLibre itself cuts the flight under reduced motion.
      essential: false,
    });
    dispatch({ type: 'CLEAR_FLY_TARGET' });
  }, [map, searchFlyTarget, dispatch]);

  // State outlines in view, for the legend: from STATES_MIN_ZOOM, with
  // hysteresis. 'zoom' fires every frame of a flight; only a change is sent.
  const statesInView = useAtlasSelector((s) => s.statesInView);
  const statesInViewRef = useRef(statesInView);
  useEffect(() => {
    if (!map) return;
    const check = () => {
      const next = statesInViewAt(map.getZoom(), statesInViewRef.current);
      if (next === statesInViewRef.current) return;
      statesInViewRef.current = next;
      dispatch({ type: 'SET_STATES_IN_VIEW', payload: next });
    };
    check();
    map.on('zoom', check);
    return () => {
      map.off('zoom', check);
    };
  }, [map, dispatch]);

  /* ── Motion: Spin and the arcs' dashes ───────────────────────────────── */

  // MapLibre draws only when something changes, so the only constant work is
  // ours: Spin and the dashes. Both stop while the tab is hidden or the map
  // is scrolled out of view.
  const onScreenRef = useRef(true);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let intersecting = true;
    const sync = () => {
      onScreenRef.current = intersecting && !document.hidden;
    };
    const io = new IntersectionObserver(([entry]) => {
      intersecting = !!entry?.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  /**
   * Spin: the centre drifts west at the three.js globe's pace while nothing
   * else moves the map. A drag, a zoom or a flight pauses it (MapLibre is
   * moving), and it carries on from wherever that left the globe. Only the
   * Spin control starts it; it starts off for everyone.
   */
  const globeRotating = useAtlasSelector((s) => s.globeRotating);
  useEffect(() => {
    if (!map || !globeRotating) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (onScreenRef.current && !map.isMoving()) {
        const center = map.getCenter();
        map.jumpTo({
          center: [center.lng - SPIN_DEGREES_PER_SECOND * dt, center.lat],
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, globeRotating]);

  // The arcs' dashes walk from head to tail; under reduced motion they hold.
  const hasArcs = influenceArcs.length > 0;
  useEffect(() => {
    if (!map || !hasArcs || reducedMotion) return;
    let step = 0;
    const timer = window.setInterval(() => {
      if (!onScreenRef.current) return;
      step = (step + 1) % ARC_DASH_STEPS.length;
      map.setPaintProperty(LAYER.arcsDash, 'line-dasharray', [
        ...ARC_DASH_STEPS[step],
      ]);
    }, DASH_STEP_MS);
    return () => window.clearInterval(timer);
  }, [map, hasArcs, reducedMotion]);

  // Dev server only: lets scripts/measureGlobe.mjs aim the camera and find a
  // city on screen, the same hook the three.js engine installs. The literal
  // DEV guard folds it out of production builds (verifyProdBundle.mjs checks).
  useEffect(() => {
    if (!import.meta.env.DEV || !map) return;
    const w = window as unknown as { __atlasGlobeDebug?: unknown };
    const height = () => map.getContainer().clientHeight;
    w.__atlasGlobeDebug = {
      engine: 'maplibre',
      screenOf: (lat: number, lng: number) => {
        const { x, y } = map.project([lng, lat]);
        return { x, y };
      },
      pointOfView: (
        pov: { lat: number; lng: number; altitude: number },
        ms = 0,
      ) =>
        map.easeTo({
          center: [pov.lng, pov.lat],
          zoom: altitudeToMapZoom(pov.altitude, height(), pov.lat),
          duration: ms,
        }),
      map,
    };
    return () => {
      delete w.__atlasGlobeDebug;
    };
  }, [map]);

  // Without a basemap the country outlines are the map; losing them is the
  // page failing. With one, the streets and places still show.
  const failure = mapError ?? (basemap === null ? error : null);

  return (
    <div className="absolute inset-0 overflow-hidden bg-atlas-canvas">
      {map && <MapPadding map={map} paddingRef={paddingRef} />}
      {/* Sized, not positioned: maplibre-gl.css makes the map position:
          relative, which would collapse an inset-0 box to no height. */}
      <div ref={containerRef} className="h-full w-full" />
      {failure ? (
        <GlobeStatus error={failure} />
      ) : (
        (!map || (loading && basemap === null)) && <GlobeStatus />
      )}
    </div>
  );
}
