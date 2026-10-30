import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import type { StageSignals } from '@/components/atlas/state/stageSignals';
import { eraSplit } from '@/components/atlas/stats/eraSplit';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { useTimeCamera } from '@/components/atlas/timeline/TimeCamera';
import { inWindow } from '@/components/atlas/timeline/timeWindow';
import type { LandColor, SelectedLocation } from '@/components/atlas/types';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { afterFlight } from './afterFlight';
import { LAND_LAYER, landPaint } from './landLayers';
import { LIFT_LAYER, LIFT_PX, LIFT_SOURCE, liftShare } from './liftLayers';
import { EMPTY, feed } from './mapFeed';
import { findRegion, regionBounds, type Outlines } from './mapFraming';
import { LAYER, RAISED_LAYERS } from './mapStyle';
import {
  busiestColor,
  cssRgb,
  edgeGradient,
  eraRamp,
  liftPlaceOf,
  rampAt,
  sliceRegion,
  type LiftShape,
  type RampStop,
} from './regionLift';
import type { MotionGate } from './useMotionGate';

/** How long the lid takes to rise and to settle back, ms. */
const RISE_MS = 500;
const FALL_MS = 300;
/** How long colour takes to sweep along the strips, ms. */
const SWEEP_MS = 700;
/** The comet: once round in this long, moved this often. */
const COMET_LOOP_MS = 5000;
const COMET_STEP_MS = 33;
/** What the rest of the land keeps of its light beside a lifted region. */
const LAND_DIMMED = 0.5;

/** The land's name layers, which step back with it. */
const NAME_LAYERS = [LAYER.regionLabels, ...LAND_LAYER.countryLabels];

/**
 * The place a selection lifts, its identity steady while the selection is. A
 * tour or a pathway keeps its own camera and doesn't lift.
 */
export function useLiftPlace(selected: SelectedLocation | null) {
  const journey = useAtlasSelector(
    (s) => s.activeModule !== null || s.activeTour !== null,
  );
  const place = journey ? null : liftPlaceOf(selected);
  const key = place ? JSON.stringify(place) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => place, [key]);
}

/** Every raised layer to `px`, over `ms`. Constant paint: nothing is laid out. */
function setLift(map: MapLibreMap, px: number, ms: number) {
  const paint = map.setPaintProperty.bind(map) as (
    id: string,
    prop: string,
    value: unknown,
  ) => void;
  for (const { id, props } of RAISED_LAYERS) {
    if (!map.getLayer(id)) continue;
    for (const prop of props) {
      paint(id, `${prop}-transition`, { duration: ms, delay: 0 });
      paint(id, prop, [0, -px * liftShare(id)]);
    }
  }
}

/**
 * The selected region, lifted (owner, 2026-10-30, after the DHCS map): when
 * the map has flown there the lid rises on its walls, a gradient of its events'
 * eras sweeps along it and follows the era rail live, and a comet runs round
 * its edge; the rest of the land steps back. Under reduced motion it is simply
 * there, with a still edge.
 */
export function useRegionLift(
  map: MapLibreMap | null,
  geo: Pick<ReturnType<typeof useGeoData>, 'countries' | 'adminRegions'>,
  place: ReturnType<typeof liftPlaceOf>,
  landColor: LandColor,
  gate: MotionGate,
  reducedMotion: boolean,
  signals: StageSignals,
) {
  const outlines = useMemo<Outlines>(
    () => ({
      countries: geo.countries?.features ?? null,
      states: geo.adminRegions?.features ?? null,
    }),
    [geo.countries, geo.adminRegions],
  );
  const shape = useMemo<LiftShape | null>(() => {
    if (!place) return null;
    const region = findRegion(place, outlines);
    if (!region || region === 'loading') return null;
    const bounds = regionBounds(region.feature.geometry, region.anchors);
    return bounds ? sliceRegion(region.feature.geometry, bounds) : null;
  }, [place, outlines]);

  // Its events' years. A state's towns are placed by the outlines on demand.
  const states = useLazyResource(stateBoundariesData, place?.type === 'state');
  const statesReady = place?.type !== 'state' || states.status === 'ready';
  const years = useMemo(
    () =>
      place && statesReady
        ? getEventsForLocation(place).map((e) => e.year)
        : [],
    [place, statesReady],
  );

  // The land steps back as soon as a region is chosen.
  const lifted = shape !== null;
  useEffect(() => {
    if (!map) return;
    const base = landPaint(landColor)['fill-opacity'];
    const ms = reducedMotion ? 0 : RISE_MS;
    map.setPaintProperty(LAYER.countriesFill, 'fill-opacity-transition', {
      duration: ms,
      delay: 0,
    });
    map.setPaintProperty(
      LAYER.countriesFill,
      'fill-opacity',
      lifted ? base * LAND_DIMMED : base,
    );
    for (const id of NAME_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setPaintProperty(id, 'text-opacity-transition', {
        duration: ms,
        delay: 0,
      });
      map.setPaintProperty(id, 'text-opacity', lifted ? 0.35 : 1);
    }
  }, [map, lifted, landColor, reducedMotion]);

  // A new region: the old one gone at once; the new one rises on landing.
  const [landed, setLanded] = useState<LiftShape | null>(null);
  useEffect(() => {
    if (!map) return;
    const clear = () => {
      feed(map, LIFT_SOURCE.strips, EMPTY);
      feed(map, LIFT_SOURCE.outline, EMPTY);
      map.removeFeatureState({ source: LIFT_SOURCE.strips });
    };
    setLanded(null);
    if (!shape) {
      setLift(map, 0, reducedMotion ? 0 : FALL_MS);
      signals.lift.set(0);
      const timer = window.setTimeout(clear, reducedMotion ? 0 : FALL_MS);
      if (map.getPitch() > 0) {
        map.easeTo({ pitch: 0, duration: reducedMotion ? 0 : 600 });
      }
      return () => window.clearTimeout(timer);
    }
    clear();
    setLift(map, 0, 0);
    signals.lift.set(0);
    return afterFlight(signals.mapPhase, () => {
      feed(map, LIFT_SOURCE.strips, shape.strips);
      feed(map, LIFT_SOURCE.outline, shape.outline);
      setLift(map, LIFT_PX, reducedMotion ? 0 : RISE_MS);
      signals.lift.set(LIFT_PX);
      setLanded(shape);
    });
  }, [map, shape, reducedMotion, signals]);

  // The gradient: swept along the strips, then following the era rail.
  const camera = useTimeCamera();
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  const rampRef = useRef<RampStop[] | null>(null);
  // The sweep plays once per landing, not again when the years start moving.
  const sweep = useRef<{ for: LiftShape; start: number } | null>(null);
  useEffect(() => {
    if (!map || !landed) return;
    if (sweep.current?.for !== landed) {
      sweep.current = { for: landed, start: performance.now() };
    }
    const { start } = sweep.current;
    const written = new Map<number, string>();
    let glow: string | null = null;
    let raf = 0;
    const draw = (now: number) => {
      raf = 0;
      const w = filtered ? camera.get() : null;
      const eras = eraSplit(years.filter((y) => inWindow(w, y)));
      const ramp = eraRamp(eras);
      rampRef.current = ramp;
      const swept = reducedMotion ? 1 : (now - start) / SWEEP_MS;
      for (const { properties } of landed.strips.features) {
        const { i, t } = properties;
        const color =
          ramp && t <= swept
            ? cssRgb(rampAt(ramp, t))
            : ATLAS_SCENE.liftNeutral;
        if (written.get(i) === color) continue;
        written.set(i, color);
        map.setFeatureState(
          { source: LIFT_SOURCE.strips, id: i },
          { c: color },
        );
      }
      const next = busiestColor(eras) ?? ATLAS_SCENE.liftNeutral;
      if (next !== glow) {
        glow = next;
        map.setPaintProperty(LIFT_LAYER.ground, 'line-color', next);
        map.setPaintProperty(LIFT_LAYER.edgeGlow, 'line-color', next);
      }
      if (reducedMotion) {
        map.setPaintProperty(
          LIFT_LAYER.edge,
          'line-gradient',
          edgeGradient(ramp, null) as never,
        );
      }
      if (swept < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const stop = camera.subscribe(() => {
      if (!raf) raf = requestAnimationFrame(draw);
    });
    return () => {
      stop();
      cancelAnimationFrame(raf);
    };
  }, [map, landed, years, filtered, camera, reducedMotion]);

  // The comet round the edge, stopped when the map is hidden or covered.
  useEffect(() => {
    if (!map || !landed || reducedMotion) return;
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < COMET_STEP_MS || !gate.moving()) return;
      last = now;
      map.setPaintProperty(
        LIFT_LAYER.edge,
        'line-gradient',
        edgeGradient(rampRef.current, (now / COMET_LOOP_MS) % 1) as never,
      );
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, landed, reducedMotion, gate]);
}
