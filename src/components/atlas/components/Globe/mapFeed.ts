import type { FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

export const EMPTY: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/** Feed a GeoJSON source, if the map (still) has it. */
export function feed(map: MapLibreMap, id: string, data: FeatureCollection) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}
