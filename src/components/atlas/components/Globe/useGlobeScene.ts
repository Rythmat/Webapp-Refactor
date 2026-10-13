import { useCallback, useMemo } from 'react';
import { CITIES, CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import { getEventsForArtist } from '@/components/atlas/data/artists';
import { connectionsData } from '@/components/atlas/data/loaders';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { regionFrame } from '@/components/atlas/navigation/flyFrames';
import { markFlown } from '@/components/atlas/navigation/focusEvent';
import {
  useAtlasNavigate,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { SelectedLocation } from '@/components/atlas/types';
import { resolveFocusCities } from '@/components/atlas/utils/resolveFocusCities';
import {
  ARTIST_POINT,
  cityBaseColor,
  visibleArcs,
  visibleArtistPoints,
  visibleCityPoints,
  type ArtistPoint,
  type CityPoint,
} from './globeLayers';

/**
 * What the globe shows, whichever engine draws it (three.js in BaseGlobe,
 * MapLibre in MapLibreGlobe): the cities, an artist's points, a pinned
 * event's arcs, and what is selected. Each value keeps its identity until
 * what it depends on changes, which react-globe.gl relies on (a new array
 * rebuilds a layer) and MapLibre's sources are spared a needless setData.
 */

export function useGlobeScene() {
  const pinnedEvent = useAtlasSelector((s) => s.pinnedEvent);
  const selectedLocation = useAtlasSelector((s) => s.selectedLocation);
  const visibleArcDirections = useAtlasSelector((s) => s.visibleArcDirections);
  const layers = useAtlasSelector((s) => s.layers);
  const activeModule = useAtlasSelector((s) => s.activeModule);
  const activeTour = useAtlasSelector((s) => s.activeTour);

  // While a guided sequence (Pathway / Region tour / City tour) is active, the
  // globe is simplified to just that selection's cities; otherwise all cities.
  const focusCities = useMemo(
    () => resolveFocusCities(activeModule, activeTour),
    [activeModule, activeTour],
  );

  // City data — all cities, or only the focus set during a sequence.
  const countryColors = layers.countryColors;
  const allCityPoints: CityPoint[] = useMemo(() => {
    const source = focusCities
      ? CITIES.filter((c) => focusCities.has(c.id))
      : CITIES;
    return source.map((city) => ({
      lat: city.coordinates[0],
      lng: city.coordinates[1],
      id: city.id,
      name: city.name,
      color: cityBaseColor(CITY_COUNTRY_TO_ISO[city.country], countryColors),
    }));
  }, [focusCities, countryColors]);
  const cityPoints = useMemo(
    () => visibleCityPoints(layers, allCityPoints),
    [layers, allCityPoints],
  );

  // An artist stop lights up every place that artist's events happened, so the
  // globe shows the shape of a career (Wes Montgomery: Indianapolis → New York).
  const artist = useAtlasStopSelector((stop) =>
    stop.kind === 'artist' ? stop.artist : null,
  );
  const allArtistPoints: ArtistPoint[] = useMemo(() => {
    if (!artist) return [];
    return getEventsForArtist(artist).map((e) => ({
      lat: e.location.lat,
      lng: e.location.lng,
      name: `${e.title} · ${e.year}`,
      color: ARTIST_POINT.color,
      size: ARTIST_POINT.radius,
      eventId: e.id,
    }));
  }, [artist]);
  const artistPoints = useMemo(
    () => visibleArtistPoints(layers, allArtistPoints),
    [layers, allArtistPoints],
  );

  // Influence arcs for the pinned event. The influence graph loads with the
  // first pin; the arcs follow it in.
  const connections = useLazyResource(connectionsData, !!pinnedEvent).data;
  const allArcs = useMemo(() => {
    if (!pinnedEvent || !connections) return [];
    return connections.getRecursiveArcsForEvent(pinnedEvent.id);
  }, [connections, pinnedEvent]);

  // Only the directions open in the event card (or Layers), and none with the
  // arcs layer off.
  const influenceArcs = useMemo(
    () => visibleArcs(layers, allArcs, visibleArcDirections),
    [layers, allArcs, visibleArcDirections],
  );

  // A city is highlighted when it is selected or holds the pinned event.
  // Primitives, so what derives from them changes once per selection.
  const selectedCityId =
    selectedLocation?.type === 'city' ? selectedLocation.id : null;
  const pinnedCityName = pinnedEvent
    ? pinnedEvent.location.city.toLowerCase()
    : null;

  return {
    layers,
    selectedLocation,
    cityPoints,
    artistPoints,
    influenceArcs,
    selectedCityId,
    pinnedCityName,
  };
}

/**
 * What a click on the globe does, the same from either engine: a country or
 * state flies to its centre and becomes the stop; a city opens; an artist's
 * point or an arc opens its event.
 */
export function useGlobeClicks() {
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();

  // Fly to the region's own centroid, then record the place as a stop (so it
  // is a history entry and a bookmark).
  const region = useCallback(
    (
      place: SelectedLocation,
      centroid: { lat: number; lng: number } | null,
    ) => {
      if (centroid) {
        dispatch({
          type: 'EXECUTE_SEARCH',
          payload: {
            lat: centroid.lat,
            lng: centroid.lng,
            zoom: 10,
            frame: regionFrame(place),
          },
        });
        markFlown(stopKey({ kind: 'place', place }));
      }
      navigate.toPlace(place);
    },
    [dispatch, navigate],
  );
  const city = useCallback(
    (id: string) => navigate.toPlace({ type: 'city', id }),
    [navigate],
  );
  const event = useCallback(
    (eventId: string) => navigate.toEvent(eventId),
    [navigate],
  );
  return useMemo(() => ({ region, city, event }), [region, city, event]);
}
