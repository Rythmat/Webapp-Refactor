import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo } from 'react';
import { getCityById } from '@/components/atlas/data/lookups';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { EMPTY, feed } from './mapFeed';
import { SUN_SOURCE } from './placeLayers';

export interface Sun {
  /** Changes with the place, so its burst plays again. */
  key: string;
  lat: number;
  lng: number;
}

/**
 * Where the stop's light is: the pinned event's place while an event is
 * pinned, else the selected city's; none for a country or a state (their
 * outline glows instead). Fed to the map's sun layers; the page draws its
 * burst and pulses (SunFx).
 */
export function useSun(
  map: MapLibreMap | null,
  selectedCityId: string | null,
): Sun | null {
  const pinned = useAtlasSelector((s) => s.pinnedEvent);
  const sun = useMemo<Sun | null>(() => {
    if (pinned) {
      return {
        key: `event:${pinned.id}`,
        lat: pinned.location.lat,
        lng: pinned.location.lng,
      };
    }
    const city = selectedCityId ? getCityById(selectedCityId) : undefined;
    return city
      ? {
          key: `city:${city.id}`,
          lat: city.coordinates[0],
          lng: city.coordinates[1],
        }
      : null;
  }, [pinned, selectedCityId]);

  useEffect(() => {
    if (!map) return;
    feed(
      map,
      SUN_SOURCE,
      sun
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [sun.lng, sun.lat] },
                properties: {},
              },
            ],
          }
        : EMPTY,
    );
  }, [map, sun]);

  return sun;
}
