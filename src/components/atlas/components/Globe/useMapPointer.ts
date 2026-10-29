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
 * What the pointer is on: a hover label, the city name or the country or
 * state under it lit (feature-state 'hover'), the pointer cursor over
 * anything that opens; and what a click opens.
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
    // The country or state under the pointer: its border brightens and
    // glows (landLayers.ts).
    let region: { source: string; id: string | number } | null = null;
    const hoverRegion = (next: typeof region) => {
      if (region?.source === next?.source && region?.id === next?.id) return;
      if (region) map.setFeatureState(region, { hover: false });
      if (next) map.setFeatureState(next, { hover: true });
      region = next;
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
        (feature?.layer.id === LAYER.cityLabels ||
          feature?.layer.id === LAYER.placeHit) &&
          target?.kind === 'city'
          ? target.cityId
          : null,
      );
      hoverRegion(
        feature?.id !== undefined &&
          (feature.layer.id === LAYER.countriesFill ||
            feature.layer.id === LAYER.statesFill)
          ? {
              source:
                feature.layer.id === LAYER.statesFill
                  ? SOURCE.states
                  : SOURCE.countries,
              id: feature.id,
            }
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
      hoverRegion(null);
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
      hoverRegion(null);
    };
  }, [map, clicks]);
}
