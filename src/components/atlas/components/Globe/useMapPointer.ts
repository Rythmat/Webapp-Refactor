import { Popup, type Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import {
  labelOf,
  targetOf,
  topFeature,
  type PickedFeature,
} from './mapPicking';
import { CLICK_LAYERS, LAYER, SOURCE } from './mapStyle';
import type { useGlobeClicks } from './useGlobeScene';

/**
 * What the pointer is on: a hover label, the city name under it warm
 * (feature-state 'hover'), the pointer cursor over anything that opens; and
 * what a click opens.
 */
export function useMapPointer(
  map: MapLibreMap | null,
  clicks: ReturnType<typeof useGlobeClicks>,
) {
  useEffect(() => {
    if (!map) return;
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'atlas-map-label',
      offset: 12,
      maxWidth: '280px',
    });
    const pick = (point: { x: number; y: number }) => {
      const layersHere = CLICK_LAYERS.filter((id) => map.getLayer(id));
      const features = map.queryRenderedFeatures([point.x, point.y], {
        layers: [...layersHere],
      }) as unknown as PickedFeature[];
      return topFeature(features);
    };
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
  }, [map, clicks]);
}
