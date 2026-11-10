/**
 * The lesson globe's camera (owner, 2026-11-10: "the zoom … too far away. I
 * want the Globe to slowly zoom in and out. I still want the state or country
 * the event happened in to be highlighted and lift up").
 *
 * For each place of the story, in turn:
 *
 *   1. the region the last place lifted settles back (when the new place is
 *      in another one), as the Globe drops a selection;
 *   2. the camera flies there slowly, pulling out over the way and coming
 *      back in (a MapLibre flight's own curve), to the region framed as the
 *      Globe frames a lifted one: fitted beside the slide's card, a little
 *      pulled back, tilted;
 *   3. on landing the region is selected, so the Globe lifts it: the lid
 *      rises, its eras sweep along it, the comet runs round its edge;
 *   4. while the place is read the globe breathes: a slow zoom in and back
 *      out, until the next place (or a hand on the map).
 *
 * The Globe's own dots for the lifted region's events are hidden: on a
 * lesson's globe only the subject's places show. Under reduced motion every
 * move is a cut and nothing breathes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LIFT_LAYER,
  LIFT_PITCH,
  RISE_MS,
} from '@/components/atlas/components/Globe/liftLayers';
import {
  COUNTRY_MAX_ZOOM,
  STATE_MAX_ZOOM,
  findRegion,
  fitCamera,
  regionBounds,
  type Outlines,
} from '@/components/atlas/components/Globe/mapFraming';
import type { AtlasMapHandle } from '@/components/atlas/components/Globe/mapHandle';
import { FLIGHT_EVENT } from '@/components/atlas/components/Globe/useMapPhase';
import { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import {
  distanceKm,
  flightMs,
  regionAt,
  sameRegion,
  type RegionAt,
} from './storyCamera';

/** Room round a lifted region, px, as the Globe frames one. */
const LIFT_MARGIN_PX = 72;
/** A lifted region lands this far short of its fit, zoom levels, as the Globe's. */
const PULL_BACK_ZOOM = 0.4;
/** A place outside any outline: this close. */
const PLACE_ZOOM = 4.5;
/** How long the old region takes to settle back before the flight, ms. */
const SETTLE_MS = 700;
/** How far out a flight pulls over its way (MapLibre's curve; 1.42 is its own). */
const FLIGHT_CURVE = 1.7;
/** The breath: this much closer, over this long, then back. */
const BREATH_ZOOM = 0.35;
const BREATH_MS = 9000;
/** A little air above a lifted region, as a share of the map's height. */
const TOP_SHARE = 0.05;
/** States that never load are waited for this long, then countries do. */
const STATES_WAIT_MS = 4000;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** A move of the story's own (its flights and its breath), by its event data. */
const BREATH_EVENT = { storyBreath: true } as const;
const isOurs = (e: object, key: 'atlasFlight' | 'storyBreath') =>
  (e as Record<string, unknown>)[key] === true;

export interface StoryCamera {
  /** Each place's region, once the outlines are in (null: none, or not yet). */
  regions: (RegionAt | null)[] | null;
}

export function useStoryCamera({
  handle,
  path,
  at,
  cardShare,
  footShare,
}: {
  handle: AtlasMapHandle | null;
  path: readonly [number, number][];
  at: number;
  /** The share of the map's width the slide's card covers, on the left. */
  cardShare: number;
  /** The share of its height the slide's place controls cover, at the foot. */
  footShare: number;
}): StoryCamera {
  const dispatch = useAtlasDispatch();
  const reduced = usePrefersReducedMotion();
  const map = handle?.map?.() ?? null;

  // The Globe's outlines (shared with the map, loaded once).
  const { countries, adminRegions } = useGeoData();
  const [statesLate, setStatesLate] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setStatesLate(true), STATES_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const outlines = useMemo<Outlines>(
    () => ({
      countries: countries?.features ?? null,
      states: adminRegions?.features ?? null,
    }),
    [countries, adminRegions],
  );
  const ready = !!countries && (!!adminRegions || statesLate);
  const regions = useMemo(
    () => (ready ? path.map((place) => regionAt(place, outlines)) : null),
    [ready, path, outlines],
  );

  // Only the story on this globe: never the lifted region's other events.
  useEffect(() => {
    if (!map) return;
    const hide = () => {
      for (const id of [LIFT_LAYER.dots, LIFT_LAYER.dotsHit])
        if (
          map.getLayer(id) &&
          map.getLayoutProperty(id, 'visibility') !== 'none'
        )
          map.setLayoutProperty(id, 'visibility', 'none');
    };
    hide();
    map.on('styledata', hide);
    return () => {
      map.off('styledata', hide);
    };
  }, [map]);

  const last = useRef<{ at: number; region: RegionAt | null } | null>(null);
  useEffect(() => {
    if (!map || !regions) return;
    const target = path[at];
    if (!target) return;
    const region = regions[at] ?? null;
    const before = last.current;
    last.current = { at, region };

    let cancelled = false;
    let handedOver = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) =>
      timers.push(window.setTimeout(fn, ms));
    const listeners: [string, (e: object) => void][] = [];
    const on = (type: string, fn: (e: object) => void) => {
      map.on(type as 'moveend', fn);
      listeners.push([type, fn]);
    };

    // A hand on the map: the story stops moving it until the next place.
    const takeOver = () => {
      handedOver = true;
    };
    on('dragstart', takeOver);
    on('wheel', takeOver);

    // The region it lifts, as the Globe frames one beside the card.
    const container = map.getContainer();
    const view = {
      width: container.clientWidth,
      height: container.clientHeight,
    };
    // Clear of the slide's card (left) and its place controls (the foot).
    const padding = {
      top: Math.round(view.height * TOP_SHARE),
      right: 0,
      bottom: Math.round(view.height * footShare),
      left: Math.round(view.width * cardShare),
    };
    const found = region ? findRegion(region.place, outlines) : null;
    const bounds =
      found && found !== 'loading'
        ? regionBounds(found.feature.geometry, found.anchors)
        : null;
    const fit =
      bounds &&
      fitCamera(
        bounds,
        view,
        padding,
        region?.place.type === 'state' ? STATE_MAX_ZOOM : COUNTRY_MAX_ZOOM,
        LIFT_MARGIN_PX,
      );
    const camera = fit
      ? {
          center: fit.center,
          zoom: Math.max(0, fit.zoom - PULL_BACK_ZOOM),
          pitch: LIFT_PITCH,
        }
      : {
          center: [target[1], target[0]] as [number, number],
          zoom: PLACE_ZOOM,
          pitch: 0,
        };

    // 4. The breath: in, out, in…, until the next place or a hand.
    const breathe = (inward: boolean) => {
      if (cancelled || handedOver || reduced) return;
      map.easeTo(
        {
          zoom: camera.zoom + (inward ? BREATH_ZOOM : 0),
          duration: BREATH_MS,
          easing: easeInOutSine,
          essential: false,
        },
        BREATH_EVENT,
      );
      const next = (e: object) => {
        if (!isOurs(e, 'storyBreath')) return;
        map.off('moveend', next);
        breathe(!inward);
      };
      on('moveend', next);
    };

    // 3. Landed: the region lifts (the Globe waits for its flight to end).
    const land = () => {
      if (cancelled) return;
      if (region && !sameRegion(before?.region?.place, region.place))
        dispatch({ type: 'SELECT_LOCATION', payload: region.place });
      later(() => breathe(true), reduced ? 0 : RISE_MS + 900);
    };

    // 2. The flight, slow, out over the way and back in.
    const fly = () => {
      if (cancelled) return;
      const from = before ? path[before.at] : undefined;
      const km = from ? distanceKm(from, target) : 4000;
      const landed = (e: object) => {
        if (!isOurs(e, 'atlasFlight')) return;
        map.off('moveend', landed);
        land();
      };
      on('moveend', landed);
      map.flyTo(
        {
          center: camera.center,
          zoom: camera.zoom,
          pitch: camera.pitch,
          padding,
          duration: reduced ? 0 : flightMs(km),
          curve: FLIGHT_CURVE,
          essential: false,
        },
        FLIGHT_EVENT,
      );
    };

    map.stop();
    // 1. Another region: the old one settles back first.
    const leaving =
      !!before && !sameRegion(before.region?.place, region?.place);
    if (leaving) dispatch({ type: 'SELECT_LOCATION', payload: null });
    later(fly, leaving && !reduced ? SETTLE_MS : 0);

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
      for (const [type, fn] of listeners) map.off(type as 'moveend', fn);
    };
  }, [
    map,
    regions,
    path,
    at,
    outlines,
    cardShare,
    footShare,
    reduced,
    dispatch,
  ]);

  return { regions };
}
