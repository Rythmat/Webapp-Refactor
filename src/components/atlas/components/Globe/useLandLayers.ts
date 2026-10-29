import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo } from 'react';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import type { GlobeLayers, SelectedLocation } from '@/components/atlas/types';
import { isRegionSelected } from './globeLabels';
import { EMPTY, feed } from './mapFeed';
import { regionCollection, type RegionProps } from './mapGeometry';
import { SOURCE } from './mapStyle';

type Geo = Pick<ReturnType<typeof useGeoData>, 'countries' | 'adminRegions'>;

/**
 * The land: the countries and, with the layer on, the US and Canadian
 * states, coloured as Layers asks; the selected one marked through
 * feature-state, so a selection never re-sends the outlines.
 */
export function useLandLayers(
  map: MapLibreMap | null,
  { countries, adminRegions }: Geo,
  layers: GlobeLayers,
  selectedLocation: SelectedLocation | null,
) {
  const countryColors = layers.countryColors;
  const countryData = useMemo(
    () =>
      countries
        ? regionCollection(countries.features, 'country', countryColors)
        : null,
    [countries, countryColors],
  );
  const stateData = useMemo(
    () =>
      adminRegions && layers.states
        ? regionCollection(adminRegions.features, 'state', countryColors)
        : null,
    [adminRegions, layers.states, countryColors],
  );
  useEffect(() => {
    if (map) feed(map, SOURCE.countries, countryData ?? EMPTY);
  }, [map, countryData]);
  useEffect(() => {
    if (map) feed(map, SOURCE.states, stateData ?? EMPTY);
  }, [map, stateData]);

  useEffect(() => {
    if (!map) return;
    const mark = (
      source: string,
      data: {
        features: { id?: string | number; properties: RegionProps }[];
      } | null,
    ) => {
      map.removeFeatureState({ source });
      for (const feat of data?.features ?? []) {
        if (isRegionSelected(feat.properties, selectedLocation)) {
          map.setFeatureState({ source, id: feat.id }, { selected: true });
        }
      }
    };
    mark(SOURCE.countries, countryData);
    mark(SOURCE.states, stateData);
  }, [map, countryData, stateData, selectedLocation]);
}
