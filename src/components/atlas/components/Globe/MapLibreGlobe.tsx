import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import {
  Map as MapLibreMap,
  Popup,
  addProtocol,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Protocol } from 'pmtiles';
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  cityOutline,
  loadCityOutline,
} from '@/components/atlas/data/cityOutlines';
import { selectableCities } from '@/components/atlas/data/lookups';
import { useGeoData } from '@/components/atlas/hooks/useGeoData';
import {
  useIsPhone,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import { useAtlasFrame } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { MapInsets } from '@/components/atlas/types';
import { GlobeStatus } from './GlobeStatus';
import { isRegionSelected } from './globeLabels';
import {
  NO_INSETS,
  findRegion,
  fitCamera,
  frameCamera,
  landingInsets,
  type Outlines,
} from './mapFraming';
import {
  ARC_DASH_STEPS,
  MAP_MAX_ZOOM,
  SPIN_DEGREES_PER_SECOND,
  altitudeToMapZoom,
  arcCollection,
  artistPointCollection,
  cityPointCollection,
  flightDuration,
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

/** How long a framed flight waits for the panel it opens to be measured. */
const SETTLE_MS = 80;
/** How long a country or state flight waits for its outlines before going anyway. */
const OUTLINE_WAIT_MS = 2500;
/**
 * How long a city flight waits for the city's outline (one small file)
 * before going to its centre anyway; the outline is drawn when it comes.
 */
const CITY_OUTLINE_WAIT_MS = 800;

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

/**
 * The page's overlays cover the map's edges (the left panel, the controls,
 * the timeline, the phone's sheet; MapInsets, measured by the layout); the
 * map's padding keeps its centre in what is left, as the three.js globe's
 * lens shift did. Flights land with the same padding (mapFraming.ts), so
 * once a panel they opened is measured, nothing moves. A component of its
 * own, subscribed to the insets alone, so dragging the card's edge
 * re-renders this and not the map's owner (the measuring script counts
 * those renders).
 */
function MapPadding({
  map,
  paddingRef,
}: {
  map: MapLibreMap;
  /** Where flights read the padding to land with. */
  paddingRef: MutableRefObject<MapInsets>;
}) {
  const { top, right, bottom, left } = useAtlasSelector((s) => s.mapInsets);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    paddingRef.current = { top, right, bottom, left };
    const apply = () => {
      const now = map.getPadding();
      const to = paddingRef.current;
      if (
        now.top === to.top &&
        now.right === to.right &&
        now.bottom === to.bottom &&
        now.left === to.left
      ) {
        return;
      }
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
  }, [map, paddingRef, top, right, bottom, left]);

  return null;
}

/** Feed a GeoJSON source, if the map (still) has it. */
/**
 * Whether the timeline covers the map (the page keeps the map mounted under
 * it), told to the map's motion through a ref so the map never re-renders
 * for it; drawn again as it comes back into view.
 */
function MapCovered({
  map,
  coveredRef,
}: {
  map: MapLibreMap;
  coveredRef: MutableRefObject<boolean>;
}) {
  const covered = useAtlasFrame((frame) => frame.view === 'timeline');
  useEffect(() => {
    const uncovered = coveredRef.current && !covered;
    coveredRef.current = covered;
    if (uncovered) map.triggerRepaint();
  }, [covered, map, coveredRef]);
  return null;
}

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
    pinnedCityId,
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
          // The basemap leaves these names to the Globe, which shows them.
          cityNames: selectableCities().map((c) => c.name),
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
      cityPointCollection(cityPoints, selectedCityId, pinnedCityId),
    );
  }, [map, cityPoints, selectedCityId, pinnedCityId]);

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
    // The city name under the pointer turns warm (feature-state 'hover').
    let hovered: string | null = null;
    const hover = (cityId: string | null) => {
      if (cityId === hovered) return;
      if (hovered) {
        map.setFeatureState(
          { source: SOURCE.cityPoints, id: hovered },
          { hover: false },
        );
      }
      if (cityId) {
        map.setFeatureState(
          { source: SOURCE.cityPoints, id: cityId },
          { hover: true },
        );
      }
      hovered = cityId;
    };
    const onMove = (e: {
      point: { x: number; y: number };
      lngLat: { lng: number; lat: number };
    }) => {
      const feature = pick(e.point);
      const target = targetOf(feature);
      hover(
        feature?.layer.id === LAYER.cityLabels && target?.kind === 'city'
          ? target.cityId
          : null,
      );
      const label = labelOf(feature);
      map.getCanvas().style.cursor = target ? 'pointer' : '';
      if (!label) {
        popup.remove();
        return;
      }
      popup.setLngLat(e.lngLat).setHTML(label);
      if (!popup.isOpen()) popup.addTo(map);
    };
    const onLeave = () => {
      popup.remove();
      hover(null);
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
      hover(null);
    };
  }, [map, basemap, clicks]);

  /* ── Camera ──────────────────────────────────────────────────────────── */

  // The card or the sheet's padding (MapPadding, below), for flights to
  // land clear of it.
  const paddingRef = useRef<MapInsets>(NO_INSETS);

  // Fly to the search or stop target, framed (mapFraming.ts): a country or
  // a state fitted to its outline, a city centred, an artist's events fitted
  // together, inside the part of the map the overlays leave clear. Depends
  // on `map` so a target set before the map finished loading (a deep link)
  // is applied once it has, and on the outlines so a region waits for them.
  const searchFlyTarget = useAtlasSelector((s) => s.searchFlyTarget);
  const isPhone = useIsPhone();
  const isPhoneRef = useRef(isPhone);
  isPhoneRef.current = isPhone;
  const flownBefore = useRef(false);
  const flightTimer = useRef<number | undefined>(undefined);
  const waitingSince = useRef<{ target: object; at: number } | null>(null);

  // A city's outline loads when the city is selected or flown to: drawn
  // round the selected city, and fitted by a flight to it. Each arrival
  // bumps the version, which the effects below read the outlines by.
  const [outlinesVersion, outlineArrived] = useReducer((n: number) => n + 1, 0);
  const flyCityId =
    searchFlyTarget?.frame?.kind === 'city'
      ? searchFlyTarget.frame.cityId
      : undefined;
  useEffect(() => {
    for (const id of [selectedCityId, flyCityId]) {
      if (id && cityOutline(id) === undefined) {
        void loadCityOutline(id).then(outlineArrived);
      }
    }
  }, [selectedCityId, flyCityId]);
  useEffect(() => {
    if (!map) return;
    const outline = selectedCityId ? cityOutline(selectedCityId) : null;
    feed(
      map,
      SOURCE.cityOutline,
      outline ? { type: 'FeatureCollection', features: [outline] } : EMPTY,
    );
  }, [map, selectedCityId, outlinesVersion]);

  useEffect(() => {
    if (!map || !searchFlyTarget) return;
    const target = searchFlyTarget;
    const outlines: Outlines = {
      countries: countries?.features ?? null,
      states: adminRegions?.features ?? null,
      city: cityOutline,
    };
    const frame = target.frame;
    const cityWait =
      frame?.kind === 'city' &&
      !!frame.cityId &&
      cityOutline(frame.cityId) === undefined;
    const loading =
      cityWait ||
      (frame?.kind === 'region' &&
        findRegion(frame.place, outlines) === 'loading');

    const fly = () => {
      waitingSince.current = null;
      const container = map.getContainer();
      const view = {
        phone: isPhoneRef.current,
        width: container.clientWidth,
        height: container.clientHeight,
      };
      const padding = landingInsets(paddingRef.current, view, !!frame);
      const camera = frameCamera(
        target,
        outlines,
        (bounds, maxZoom) => fitCamera(bounds, view, padding, maxZoom),
        view.height,
      );
      // The first flight is a deep link's: start over the target, zoomed
      // out, so the default view never shows, then fly in.
      if (!flownBefore.current) {
        map.jumpTo({
          center: camera.center,
          zoom: altitudeToMapZoom(
            START.altitude,
            view.height,
            camera.center[1],
          ),
          padding,
        });
      }
      flownBefore.current = true;
      map.flyTo({
        center: camera.center,
        zoom: camera.zoom,
        padding,
        duration: flightDuration(reducedMotionRef.current),
        // Not essential: MapLibre itself cuts the flight under reduced motion.
        essential: false,
      });
    };

    window.clearTimeout(flightTimer.current);
    if (loading) {
      // Wait for the outlines, but not for ever: if they never come, fly to
      // the target's own centre.
      if (waitingSince.current?.target !== target) {
        waitingSince.current = { target, at: Date.now() };
      }
      const wait = cityWait ? CITY_OUTLINE_WAIT_MS : OUTLINE_WAIT_MS;
      const left = wait - (Date.now() - waitingSince.current.at);
      flightTimer.current = window.setTimeout(
        () => {
          dispatch({ type: 'CLEAR_FLY_TARGET' });
          fly();
        },
        Math.max(0, left),
      );
      return;
    }
    dispatch({ type: 'CLEAR_FLY_TARGET' });
    // A framed flight opens a panel; give it a moment to be on the page and
    // measured, so the flight lands clear of it (landingInsets).
    flightTimer.current = window.setTimeout(fly, frame ? SETTLE_MS : 0);
  }, [
    map,
    searchFlyTarget,
    countries,
    adminRegions,
    outlinesVersion,
    dispatch,
  ]);
  useEffect(() => () => window.clearTimeout(flightTimer.current), []);

  // The viewer's first press, scroll or key on the map itself, which folds
  // the map's credit (MapCredit) away. Flights and Spin are not the viewer.
  useEffect(() => {
    if (!map) return;
    const target = map.getCanvasContainer();
    const kinds = ['pointerdown', 'wheel', 'keydown'] as const;
    const touched = () => {
      for (const kind of kinds) target.removeEventListener(kind, touched);
      dispatch({ type: 'MAP_TOUCHED' });
    };
    for (const kind of kinds) {
      target.addEventListener(kind, touched, { passive: true });
    }
    return () => {
      for (const kind of kinds) target.removeEventListener(kind, touched);
    };
  }, [map, dispatch]);

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
  const coveredRef = useRef(false);
  const moving = () => onScreenRef.current && !coveredRef.current;
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
      if (moving() && !map.isMoving()) {
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
      if (!moving()) return;
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
      {map && <MapCovered coveredRef={coveredRef} map={map} />}
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
