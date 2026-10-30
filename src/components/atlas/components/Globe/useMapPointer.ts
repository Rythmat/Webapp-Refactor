import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import type {
  HoverTarget,
  StageSignals,
} from '@/components/atlas/state/stageSignals';
import { targetOf, topFeature, type PickedFeature } from './mapPicking';
import { CLICK_LAYERS, LAYER, SOURCE } from './mapStyle';
import type { useGlobeClicks } from './useGlobeScene';

/**
 * What the pointer is on: the place, country or state under it lit
 * (feature-state 'hover'), the hover card told what it is and where to hang
 * (`placeHover`: a place from its dot, anything else from the pointer), the
 * pointer cursor over anything that opens; and what a click opens. Moves
 * are read once a frame.
 */
export function useMapPointer(
  map: MapLibreMap | null,
  clicks: ReturnType<typeof useGlobeClicks>,
  signals: StageSignals,
) {
  useEffect(() => {
    if (!map) return;
    const pick = (point: { x: number; y: number }) => {
      const layersHere = CLICK_LAYERS.filter((id) => map.getLayer(id));
      const features = map.queryRenderedFeatures([point.x, point.y], {
        layers: [...layersHere],
      }) as unknown as PickedFeature[];
      return topFeature(features);
    };
    type Lit = { source: string; id: string | number } | null;
    let lit: Lit = null;
    const light = (next: Lit) => {
      if (lit?.source === next?.source && lit?.id === next?.id) return;
      if (lit) map.setFeatureState(lit, { hover: false });
      if (next) map.setFeatureState(next, { hover: true });
      lit = next;
    };

    let frame = 0;
    let last: { x: number; y: number } | null = null;
    const read = () => {
      frame = 0;
      if (!last) return;
      const point = last;
      const feature = pick(point);
      const target = targetOf(feature);
      const opens = target && (target.kind !== 'link' || !!target.place);
      map.getCanvas().style.cursor = opens ? 'pointer' : '';
      const layer = feature?.layer.id;
      const box = map.getContainer().getBoundingClientRect();
      let hover: HoverTarget | null = null;
      let anchor = { x: box.left + point.x, y: box.top + point.y };
      if (target?.kind === 'city') {
        hover = { kind: 'place', id: target.cityId };
        light({ source: SOURCE.cityPoints, id: target.cityId });
        const at = feature?.geometry?.coordinates;
        if (Array.isArray(at) && typeof at[0] === 'number') {
          const p = map.project([at[0], at[1] as number]);
          anchor = { x: box.left + p.x, y: box.top + p.y };
        }
      } else if (target?.kind === 'region' && feature?.id !== undefined) {
        hover = { kind: 'region', place: target.place };
        light({
          source: layer === LAYER.statesFill ? SOURCE.states : SOURCE.countries,
          id: feature.id,
        });
      } else if (target?.kind === 'link') {
        const { id, title, detail } = target;
        hover = { kind: 'link', id, title, detail };
        light({
          source: layer === LAYER.linksHit ? SOURCE.solid : SOURCE.dotted,
          id,
        });
      } else if (target?.kind === 'event') {
        hover = { kind: 'event', eventId: target.eventId };
        light(null);
      } else {
        light(null);
      }
      signals.placeHover.set(hover ? { target: hover, anchor } : null);
    };
    const onMove = (e: { point: { x: number; y: number } }) => {
      last = e.point;
      if (!frame) frame = requestAnimationFrame(read);
    };
    const onLeave = () => {
      last = null;
      cancelAnimationFrame(frame);
      frame = 0;
      light(null);
      signals.placeHover.set(null);
      map.getCanvas().style.cursor = '';
    };
    // A flight or a drag moves the map out from under a still pointer.
    const onMoveStart = () => signals.placeHover.set(null);
    const onClick = (e: { point: { x: number; y: number } }) => {
      const target = targetOf(pick(e.point));
      if (!target) return;
      signals.placeHover.set(null);
      if (target.kind === 'event') clicks.event(target.eventId);
      else if (target.kind === 'city') clicks.city(target.cityId);
      else if (target.kind === 'link') {
        // A link opens its far place; one between regions opens nothing.
        if (target.place) clicks.place(target.place);
      } else clicks.region(target.place, target.centroid);
    };
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('movestart', onMoveStart);
    map.on('click', onClick);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('movestart', onMoveStart);
      map.off('click', onClick);
      onLeave();
    };
  }, [map, clicks, signals]);
}
