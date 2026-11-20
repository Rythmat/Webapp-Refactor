import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import type { ArcDatum } from '@/components/atlas/data';
import { guidesData } from '@/components/atlas/data/loaders';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import { scopeLinks } from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import type { StageSignals } from '@/components/atlas/state/stageSignals';
import { stopScope } from '@/components/atlas/stats/stopScope';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { afterFlight } from './afterFlight';
import { arcLines, parseColor } from './arcGeometry';
import { ARC_LAYER_ID, ArcLayer, setArcLayer, type ArcRamps } from './arcLayer';
import { DRAW_MS, drawOnPlan } from './drawOn';
import { journeyLeg } from './journeyLeg';
import { DOTS_MS, RISE_MS } from './liftLayers';
import { EMPTY, feed } from './mapFeed';
import {
  NO_LINKS,
  arcLinkFeatures,
  legLinkFeatures,
  scopeLinkFeatures,
  type LinkFeatures,
} from './networkFeatures';
import {
  NETWORK_LAYER,
  NETWORK_SOURCE,
  PULSE,
  pulsePaint,
} from './networkLayers';
import type { MotionGate } from './useMotionGate';

/** A lifted region's links draw on once its lid has risen and its dots come. */
const LINKS_AFTER_LIFT_MS = RISE_MS + DOTS_MS;

/** The arcs' colours along their length: came from cool, went to warm. */
const ARC_RAMPS: ArcRamps = {
  in: ROOTS_RAMP.map(parseColor),
  out: ROUTES_RAMP.map(parseColor),
};

/** How often the comets and the rings move on, ms (about 30 a second). */
const FRAME_MS = 33;

/**
 * The links on the map: with nothing chosen, none (the lines between whole
 * regions crossed the globe: owner, 2026-11-16); at a place or an artist,
 * where the music came from and went to in the years shown; at an event,
 * its own influences (the Layers switches and the event card's directions
 * apply); in a running tour or pathway, only its leg on to the next stop.
 * Each is a flight path off the globe (arcLayer.ts) with a comet flying
 * along it, and its far end pulses (a ring leaving a dot: networkLayers.ts).
 * A new stop's links draw on outward from it once the map has flown there;
 * weak ties' dashes flow; a card pointing at a link (`linkFocus`) brightens
 * it. Under reduced motion they appear drawn and hold still.
 */
export function useNetworkLayers(
  map: MapLibreMap | null,
  influenceArcs: ArcDatum[],
  gate: MotionGate,
  reducedMotion: boolean,
  signals: StageSignals,
  /** A region is lifting: the links come after its colour and dots. */
  lifting: boolean,
) {
  const stop = useAtlasStop();
  const w = useAtlasSelector((s) => s.timeWindow);
  const linksOn = useAtlasSelector((s) => s.layers.arcs);
  const network = useNetwork(!!map);
  const ix = network.index;
  // A running tour or pathway: its one leg on to the next stop. The guides
  // have loaded by then (a journey starts only once they have).
  const activeModule = useAtlasSelector((s) => s.activeModule);
  const activeTour = useAtlasSelector((s) => s.activeTour);
  const journey = stop.kind === 'pathway' || stop.kind === 'tour';
  const leg = useMemo(
    () =>
      journey ? journeyLeg(guidesData.peek(), activeModule, activeTour) : null,
    [journey, activeModule, activeTour],
  );
  // Each leg is a new stop for the links: it draws on afresh.
  const key = leg ? leg.key : stopKey(stop);

  const links: LinkFeatures = useMemo(() => {
    if (journey) return leg && linksOn ? legLinkFeatures(leg) : NO_LINKS;
    if (stop.kind === 'event') return arcLinkFeatures(influenceArcs);
    if (!ix || !linksOn) return NO_LINKS;
    if (stop.kind === 'home' || stop.kind === 'search') return NO_LINKS;
    const scope = stopScope(stop);
    if (!scope) return NO_LINKS;
    return scopeLinkFeatures(ix, scopeLinks(ix, scope.eventIds, w));
    // The stop by its key: the same stop parsed again is no new links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ix, key, w, influenceArcs, linksOn, journey, leg]);

  // The arc layer: one per map, over the land and under the far ends' dots.
  const arcs = useMemo(() => new ArcLayer(ARC_RAMPS), []);
  useEffect(() => {
    if (!map) return;
    arcs.lift = () => signals.lift.get();
    const add = () => {
      if (!map.getLayer(ARC_LAYER_ID) && map.getLayer(NETWORK_LAYER.endRing)) {
        map.addLayer(arcs, NETWORK_LAYER.endRing);
      }
    };
    add();
    map.on('styledata', add);
    setArcLayer(map, arcs);
    return () => {
      map.off('styledata', add);
      setArcLayer(map, null);
      try {
        if (map.getLayer(ARC_LAYER_ID)) map.removeLayer(ARC_LAYER_ID);
      } catch {
        // The map went first.
      }
    };
  }, [map, arcs, signals]);

  useEffect(() => {
    arcs.motion = !reducedMotion;
  }, [arcs, reducedMotion]);

  const lines = useMemo(
    () => arcLines(links.solid.features, links.dotted.features, drawOnPlan),
    [links],
  );

  // A new stop's links draw on; new years or a layer switch just swap.
  const drawnFor = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const showAll = () => {
      arcs.showAll();
      feed(map, NETWORK_SOURCE.ends, links.ends);
    };
    const fresh = drawnFor.current !== key;
    const any = lines.length > 0;
    if (any) drawnFor.current = key;
    if (!fresh || reducedMotion || !any) {
      arcs.setLines(lines, 'now');
      feed(map, NETWORK_SOURCE.ends, links.ends);
      return;
    }
    // Held back until the map has flown there; the far ends land once their
    // arcs have reached them.
    arcs.setLines(lines, 'wait');
    feed(map, NETWORK_SOURCE.ends, EMPTY);
    let delay = 0;
    let ends = 0;
    const cancel = afterFlight(signals.mapPhase, () => {
      delay = window.setTimeout(
        () => {
          arcs.drawOn(performance.now());
          ends = window.setTimeout(
            () => feed(map, NETWORK_SOURCE.ends, links.ends),
            DRAW_MS.total,
          );
        },
        lifting ? LINKS_AFTER_LIFT_MS : 0,
      );
    });
    return () => {
      cancel();
      window.clearTimeout(delay);
      window.clearTimeout(ends);
      showAll();
    };
  }, [map, arcs, lines, links, key, reducedMotion, signals, lifting]);

  // The motion: the comets fly and the weak ties' dashes flow (a repaint of
  // the arc layer, which reads the clock), and each far end's ring leaves
  // its dot, grows and fades at its own phase. About 30 times a second, and
  // not while the map is out of sight.
  const moving = lines.length > 0 || links.ends.features.length > 0;
  useEffect(() => {
    if (!map || !moving || reducedMotion) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < FRAME_MS || !gate.moving()) return;
      last = now;
      if (arcs.hasLines()) map.triggerRepaint();
      if (!map.getLayer(NETWORK_LAYER.endRing)) return;
      const { radius, opacity } = pulsePaint((now / PULSE.periodMs) % 1);
      map.setPaintProperty(NETWORK_LAYER.endRing, 'circle-radius', radius);
      map.setPaintProperty(
        NETWORK_LAYER.endRing,
        'circle-stroke-opacity',
        opacity,
      );
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [map, arcs, moving, reducedMotion, gate]);

  // A card's row (or the ring) pointing at a link brightens it.
  useEffect(() => {
    const sync = () => arcs.setFocus(signals.linkFocus.get());
    sync();
    const off = signals.linkFocus.subscribe(sync);
    return () => {
      off();
      arcs.setFocus(null);
    };
  }, [arcs, signals, lines]);
}
