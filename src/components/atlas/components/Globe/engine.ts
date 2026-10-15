/**
 * Which engine draws the Globe page's map (docs/globe-ui/ENGINE.md), read
 * at build time from VITE_ATLAS_ENGINE:
 *
 * - `maplibre` (the default): MapLibre GL's globe over a Protomaps vector
 *   basemap, from the whole planet down to street level;
 * - `three`: the earlier three.js globe (react-globe.gl), kept so the switch
 *   can be rolled back with `VITE_ATLAS_ENGINE=three` and a rebuild.
 */
export type GlobeEngine = 'maplibre' | 'three';

export const GLOBE_ENGINE: GlobeEngine =
  import.meta.env.VITE_ATLAS_ENGINE === 'three' ? 'three' : 'maplibre';

/**
 * How a city is marked: by its name on the MapLibre map (select the name to
 * open it), a raised column on the three.js globe. The legend and the Layers
 * popover describe this one.
 */
export type CityMark = 'name' | 'column';

export const CITY_MARK: CityMark = GLOBE_ENGINE === 'three' ? 'column' : 'name';
