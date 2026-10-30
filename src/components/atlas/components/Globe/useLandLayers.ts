import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo } from 'react';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { landLevel, musicWeights } from '@/components/atlas/stats/musicWeights';
import { useTimeCamera } from '@/components/atlas/timeline/TimeCamera';
import type {
  GlobeLayers,
  LandColor,
  SelectedLocation,
} from '@/components/atlas/types';
import { countryKey } from '@/components/atlas/utils/country';
import { isRegionSelected } from './globeLabels';
import { countryLabelCollection, landPaint } from './landLayers';
import { EMPTY, feed } from './mapFeed';
import { regionCollection, type RegionProps } from './mapGeometry';
import { LAYER, SOURCE } from './mapStyle';

type Geo = Pick<ReturnType<typeof useGeoData>, 'countries' | 'adminRegions'>;

/**
 * The land: the countries and, with the layer on, the US and Canadian
 * states, set once; their colour as Layers asks (landPaint); the countries'
 * names; the selected one marked through feature-state, so a selection
 * never re-sends the outlines.
 */
export function useLandLayers(
  map: MapLibreMap | null,
  { countries, adminRegions }: Geo,
  layers: GlobeLayers,
  selectedLocation: SelectedLocation | null,
) {
  const countryData = useMemo(
    () => (countries ? regionCollection(countries.features, 'country') : null),
    [countries],
  );
  const stateData = useMemo(
    () =>
      adminRegions && layers.states
        ? regionCollection(adminRegions.features, 'state')
        : null,
    [adminRegions, layers.states],
  );
  const countryLabels = useMemo(
    () => (countries ? countryLabelCollection(countries.features) : null),
    [countries],
  );
  useEffect(() => {
    if (map) feed(map, SOURCE.countries, countryData ?? EMPTY);
  }, [map, countryData]);
  useEffect(() => {
    if (map) feed(map, SOURCE.states, stateData ?? EMPTY);
  }, [map, stateData]);
  useEffect(() => {
    if (map) feed(map, SOURCE.countryLabels, countryLabels ?? EMPTY);
  }, [map, countryLabels]);

  // The land's colour: a rare change, so a style change is fine (the map
  // re-lays the countries once).
  const mode = layers.landColor;
  useEffect(() => {
    if (!map) return;
    const paint = landPaint(mode);
    map.setPaintProperty(
      LAYER.countriesFill,
      'fill-color',
      paint['fill-color'],
    );
    map.setPaintProperty(
      LAYER.countriesFill,
      'fill-opacity',
      paint['fill-opacity'],
    );
  }, [map, mode]);

  useEffect(() => {
    if (!map) return;
    const mark = (
      source: string,
      data: {
        features: { id?: string | number; properties: RegionProps }[];
      } | null,
    ) => {
      for (const feat of data?.features ?? []) {
        const on = isRegionSelected(feat.properties, selectedLocation);
        if (feat.id === undefined) continue;
        // Only `selected` changes here: the music level and hover stay.
        if (map.getFeatureState({ source, id: feat.id })?.selected !== on) {
          map.setFeatureState({ source, id: feat.id }, { selected: on });
        }
      }
    };
    mark(SOURCE.countries, countryData);
    mark(SOURCE.states, stateData);
  }, [map, countryData, stateData, selectedLocation]);

  return countryData;
}

/**
 * The land lit by music: each country's level (landLevel of its events in
 * the years shown, musicWeights) as feature-state `music`, which the land's
 * fill reads (landPaint). The years are the era rail's: all of time until
 * some are chosen, then the time camera's, followed frame by frame while the
 * rail is dragged or the camera eases after Back or a link. Only levels that
 * changed are written, so a still rail costs nothing.
 */
export function useLandMusic(
  map: MapLibreMap | null,
  countryData: FeatureCollection<
    FeatureCollection['features'][number]['geometry'],
    RegionProps
  > | null,
  mode: LandColor,
) {
  const camera = useTimeCamera();
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  const keys = useMemo(
    () =>
      (countryData?.features ?? []).flatMap((f) =>
        f.id === undefined
          ? []
          : [{ id: f.id, key: countryKey(f.properties.NAME ?? '') }],
      ),
    [countryData],
  );
  useEffect(() => {
    if (!map || mode !== 'music' || keys.length === 0) return;
    const written = new Map<string | number, number>();
    let raf = 0;
    const draw = () => {
      raf = 0;
      const weights = musicWeights(filtered ? camera.get() : null);
      for (const { id, key } of keys) {
        const level =
          Math.round(
            landLevel(weights.countries.get(key) ?? 0, weights.maxCountry) *
              100,
          ) / 100;
        if (written.get(id) === level) continue;
        written.set(id, level);
        map.setFeatureState({ source: SOURCE.countries, id }, { music: level });
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
  }, [map, mode, keys, filtered, camera]);
}
