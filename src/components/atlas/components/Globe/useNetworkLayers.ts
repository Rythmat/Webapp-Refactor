import type { Feature, LineString } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import type { ArcDatum } from '@/components/atlas/data';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  scopeLinks,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import type { StageSignals } from '@/components/atlas/state/stageSignals';
import { stopScope } from '@/components/atlas/stats/stopScope';
import {
  DRAW_MS,
  drawOnPlan,
  drawProgress,
  lineLength,
  sliceLine,
} from './drawOn';
import { EMPTY, feed } from './mapFeed';
import {
  NO_LINKS,
  arcLinkFeatures,
  scopeLinkFeatures,
  worldLinkFeatures,
  type LinkFeatures,
  type LinkProps,
} from './networkFeatures';
import {
  FLOW_PHASES,
  FLOW_STEP_MS,
  NETWORK_LAYER,
  NETWORK_SOURCE,
} from './networkLayers';
import type { MotionGate } from './useMotionGate';

/**
 * A new stop's links wait for the flight there: `graceMs` for one to
 * start, and never longer than `capMs` in all.
 */
const DRAW_WAIT = { graceMs: 150, capMs: 2600 } as const;

/** How many links between regions the world shows. */
const WORLD_LINKS = 24;

/**
 * The links on the map (networkLayers.ts): with nothing chosen, the
 * strongest links between regions; at a place or an artist, where the
 * music came from and went to in the years shown; at an event, its own
 * influences (the Layers switches and the event card's directions apply).
 * A new stop's links draw on outward from it once the map has flown there;
 * dotted links flow; a card
 * pointing at a link (`linkFocus`) brightens it. Under reduced motion they
 * appear drawn and hold still.
 */
export function useNetworkLayers(
  map: MapLibreMap | null,
  influenceArcs: ArcDatum[],
  gate: MotionGate,
  reducedMotion: boolean,
  signals: StageSignals,
) {
  const stop = useAtlasStop();
  const w = useAtlasSelector((s) => s.timeWindow);
  const linksOn = useAtlasSelector((s) => s.layers.arcs);
  const network = useNetwork(!!map);
  const ix = network.index;
  const key = stopKey(stop);

  const links: LinkFeatures = useMemo(() => {
    if (stop.kind === 'event') return arcLinkFeatures(influenceArcs);
    if (!ix || !linksOn) return NO_LINKS;
    if (stop.kind === 'home' || stop.kind === 'search') {
      return worldLinkFeatures(ix, worldLinks(ix, w, { limit: WORLD_LINKS }));
    }
    const scope = stopScope(stop);
    if (!scope) return NO_LINKS;
    return scopeLinkFeatures(ix, scopeLinks(ix, scope.eventIds, w));
    // The stop by its key: the same stop parsed again is no new links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ix, key, w, influenceArcs, linksOn]);

  // A new stop's links draw on; new years or a layer switch just swap.
  const drawnFor = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const showAll = () => {
      feed(map, NETWORK_SOURCE.solid, links.solid);
      feed(map, NETWORK_SOURCE.dotted, links.dotted);
      feed(map, NETWORK_SOURCE.pills, links.pills);
      feed(map, NETWORK_SOURCE.draw, EMPTY);
    };
    const fresh = drawnFor.current !== key;
    if (links.solid.features.length) drawnFor.current = key;
    if (!fresh || reducedMotion || links.solid.features.length === 0) {
      showAll();
      return;
    }
    feed(map, NETWORK_SOURCE.solid, EMPTY);
    feed(map, NETWORK_SOURCE.dotted, EMPTY);
    feed(map, NETWORK_SOURCE.pills, EMPTY);
    const lines = links.solid.features;
    const lengths = lines.map((f) => lineLength(f.geometry.coordinates));
    const delays = drawOnPlan(lengths);
    let start = 0;
    let frame = 0;
    const step = (now: number) => {
      const t = now - start;
      if (t >= DRAW_MS.total) {
        showAll();
        return;
      }
      const drawn: Feature<LineString, LinkProps>[] = [];
      lines.forEach((f, i) => {
        const p = drawProgress(t, delays[i]);
        if (p <= 0) return;
        drawn.push({
          ...f,
          geometry: {
            type: 'LineString',
            // Into the stop: drawn from the stop's end, so all grow out of it.
            coordinates: sliceLine(
              f.geometry.coordinates,
              p,
              f.properties.side === 'in',
            ),
          },
        });
      });
      feed(map, NETWORK_SOURCE.draw, {
        type: 'FeatureCollection',
        features: drawn,
      });
      frame = requestAnimationFrame(step);
    };
    // After the flight there: a moment for one to start, then its end
    // (or, whatever happens, DRAW_WAIT.capMs).
    let begun = false;
    const begin = () => {
      if (begun) return;
      begun = true;
      start = performance.now();
      frame = requestAnimationFrame(step);
    };
    const phase = signals.mapPhase;
    const grace = window.setTimeout(() => {
      if (phase.get() !== 'flying') begin();
    }, DRAW_WAIT.graceMs);
    const cap = window.setTimeout(begin, DRAW_WAIT.capMs);
    const off = phase.subscribe(() => {
      if (phase.get() === 'settled') begin();
    });
    return () => {
      off();
      window.clearTimeout(grace);
      window.clearTimeout(cap);
      cancelAnimationFrame(frame);
      showAll();
    };
  }, [map, links, key, reducedMotion, signals]);

  // The flow: one dotted phase shown at a time, the next every step.
  const flowing = links.dotted.features.length > 0;
  useEffect(() => {
    if (!map || !flowing || reducedMotion) return;
    let phase = 0;
    let last = performance.now();
    let frame = 0;
    const show = (k: number, on: boolean) => {
      const id = NETWORK_LAYER.flow[k];
      if (map.getLayer(id))
        map.setPaintProperty(id, 'line-opacity', on ? 1 : 0);
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < FLOW_STEP_MS || !gate.moving()) return;
      last = now;
      show(phase, false);
      phase = (phase + 1) % FLOW_PHASES;
      show(phase, true);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      show(phase, false);
      show(0, true);
    };
  }, [map, flowing, reducedMotion, gate]);

  // A card's row (or the ring) pointing at a link brightens it.
  useEffect(() => {
    if (!map) return;
    let lit: string | null = null;
    const set = (id: string, on: boolean) => {
      for (const source of [NETWORK_SOURCE.solid, NETWORK_SOURCE.dotted]) {
        if (map.getSource(source))
          map.setFeatureState({ source, id }, { focus: on });
      }
    };
    const sync = () => {
      const next = signals.linkFocus.get();
      if (next === lit) return;
      if (lit) set(lit, false);
      if (next) set(next, true);
      lit = next;
    };
    sync();
    const off = signals.linkFocus.subscribe(sync);
    return () => {
      off();
      if (lit) set(lit, false);
    };
  }, [map, signals]);
}
