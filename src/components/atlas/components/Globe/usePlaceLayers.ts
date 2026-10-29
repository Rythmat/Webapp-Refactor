import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo } from 'react';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { haloLevel, musicWeights } from '@/components/atlas/stats/musicWeights';
import { useTimeCamera } from '@/components/atlas/timeline/TimeCamera';
import type { ArtistPoint, CityPoint } from './globeLayers';
import { addChipImages } from './mapChips';
import { feed } from './mapFeed';
import { artistPointCollection } from './mapGeometry';
import { SOURCE } from './mapStyle';
import { placeCollection } from './placeLayers';

const ERA_INDEX = new Map(MUSICAL_ERAS.map((era, i) => [era.id, i]));

/**
 * The places and an artist's points. A place's name chip and its events
 * line are rebuilt when the years shown settle or the stop changes
 * (placeCollection); its halo follows the era rail live, through
 * feature-state (`w`, its level; `era`, its busiest era), like the land.
 */
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
  // The chips' images, before any label asks for them.
  useEffect(() => {
    if (map) addChipImages(map);
  }, [map]);

  // The names and events lines, for the years the store holds (the rail's
  // settled window; all of time without one).
  const committed = useAtlasSelector((s) => s.timeWindow);
  const places = useMemo(
    () =>
      placeCollection(
        cityPoints,
        musicWeights(committed),
        selectedCityId,
        pinnedCityId,
      ),
    [cityPoints, committed, selectedCityId, pinnedCityId],
  );
  useEffect(() => {
    if (map) feed(map, SOURCE.cityPoints, places);
  }, [map, places]);

  // The halos, live.
  const camera = useTimeCamera();
  const filtered = committed !== null;
  const ids = useMemo(() => cityPoints.map((p) => p.id), [cityPoints]);
  useEffect(() => {
    if (!map || ids.length === 0) return;
    const written = new Map<string, string>();
    let raf = 0;
    const draw = () => {
      raf = 0;
      const weights = musicWeights(filtered ? camera.get() : null);
      for (const id of ids) {
        const place = weights.places.get(id);
        const w =
          Math.round(haloLevel(place?.events ?? 0, weights.maxPlace) * 100) /
          100;
        const era = place?.era ? (ERA_INDEX.get(place.era) ?? -1) : -1;
        const key = `${w}|${era}`;
        if (written.get(id) === key) continue;
        written.set(id, key);
        map.setFeatureState({ source: SOURCE.cityPoints, id }, { w, era });
      }
    };
    draw();
    const stop = camera.subscribe(() => {
      if (!raf) raf = requestAnimationFrame(draw);
    });
    return () => {
      stop();
      cancelAnimationFrame(raf);
    };
  }, [map, ids, filtered, camera]);

  useEffect(() => {
    if (map)
      feed(map, SOURCE.artistPoints, artistPointCollection(artistPoints));
  }, [map, artistPoints]);
}
