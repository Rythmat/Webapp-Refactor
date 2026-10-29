import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import type { ArtistPoint, CityPoint } from './globeLayers';
import { feed } from './mapFeed';
import { artistPointCollection, cityPointCollection } from './mapGeometry';
import { SOURCE } from './mapStyle';

/** The music cities and an artist's points (useGlobeScene's). */
export function usePlaceLayers(
  map: MapLibreMap | null,
  {
    cityPoints,
    artistPoints,
    selectedCityId,
    pinnedCityId,
  }: {
    cityPoints: CityPoint[];
    artistPoints: ArtistPoint[];
    selectedCityId: string | null;
    pinnedCityId: string | null;
  },
) {
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
}
