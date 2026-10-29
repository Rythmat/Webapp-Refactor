import {
  getContinentSwatches,
  type ContinentSwatch,
} from '@/components/atlas/data/continentColors';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { GlobeLayers } from '@/components/atlas/types';
import { ARTIST_POINT, arcColors, cityBaseColor } from './globeLayers';

/**
 * The legend's rows: one per kind of mark on the globe right now, each with
 * a name, a sentence, and a swatch drawn from the very values the globe
 * paints with (globeLayers.ts, ATLAS_SCENE, the continent palette).
 */

/** The swatch a row draws. */
export type LegendSwatch =
  | { shape: 'continents'; continents: ContinentSwatch[] }
  | { shape: 'fill'; color: string }
  | { shape: 'point'; color: string }
  /** A sample of a city's name, in the colour the map writes it. */
  | { shape: 'label'; color: string }
  | { shape: 'outline'; color: string }
  | { shape: 'arc'; colors: [string, string] };

export type LegendEntryId =
  | 'countries'
  | 'selected-region'
  | 'states'
  | 'cities'
  | 'selected-city'
  | 'artist-points'
  | 'arcs-in'
  | 'arcs-out';

export interface LegendEntry {
  id: LegendEntryId;
  label: string;
  detail: string;
  swatch: LegendSwatch;
}

/** What is on the globe, as far as the legend needs to know. */
export interface LegendContext {
  layers: GlobeLayers;
  /** The camera is close enough for state outlines. */
  statesInView: boolean;
  /** A country or state is selected (its outline is bright). */
  regionSelected: boolean;
  /** A city's mark is white: the selected city, or the pinned event's. */
  cityHighlighted: boolean;
  /** An artist's panel is open, so their moments are points on the globe. */
  artistShown: boolean;
  /** The influence directions open on the pinned event. */
  arcDirections: ReadonlySet<'upstream' | 'downstream'>;
}

/**
 * A sample city mark and arc: what a city in the United States looks
 * like. Any country would do; the shade rule is the same for all.
 */
const SAMPLE_COUNTRY = 'USA';

export function legendEntries(ctx: LegendContext): LegendEntry[] {
  const { layers } = ctx;
  const entries: LegendEntry[] = [];

  entries.push(
    layers.countryColors
      ? {
          id: 'countries',
          label: 'Countries by continent',
          detail:
            'Each continent has its own hue, shading from light to dark across it.',
          swatch: { shape: 'continents', continents: getContinentSwatches() },
        }
      : {
          id: 'countries',
          label: 'Countries',
          detail: 'One plain color: country colors are off in Layers.',
          swatch: { shape: 'fill', color: ATLAS_SCENE.landPlain },
        },
  );

  if (ctx.regionSelected) {
    entries.push({
      id: 'selected-region',
      label: 'Selected country or state',
      detail: 'Outlined in a bright, warm line.',
      swatch: { shape: 'outline', color: ATLAS_SCENE.strokeSelected },
    });
  }

  if (layers.states && ctx.statesInView) {
    entries.push({
      id: 'states',
      label: 'States and provinces',
      detail: 'US states and Canadian provinces, once you zoom in.',
      swatch: { shape: 'outline', color: ATLAS_SCENE.strokeState },
    });
  }

  if (layers.cities) {
    entries.push({
      id: 'cities',
      label: 'Music cities',
      detail:
        'Each city by its name: select a name to open the city. Towns with events are named too, closer in.',
      swatch: { shape: 'label', color: ATLAS_SCENE.label },
    });
    if (ctx.cityHighlighted) {
      entries.push({
        id: 'selected-city',
        label: 'Selected city',
        detail: 'Its name turns warm, and its boundary is outlined.',
        swatch: { shape: 'label', color: ATLAS_SCENE.strokeSelected },
      });
    }
  }

  if (layers.artistPoints && ctx.artistShown) {
    entries.push({
      id: 'artist-points',
      label: 'Artist’s moments',
      detail: 'A white point wherever the open artist’s events happened.',
      swatch: { shape: 'point', color: ARTIST_POINT.color },
    });
  }

  if (layers.arcs && ctx.arcDirections.has('upstream')) {
    entries.push({
      id: 'arcs-in',
      label: 'Influenced by',
      detail:
        'Arcs flowing in from earlier music, in a shade of where it began.',
      swatch: {
        shape: 'arc',
        colors: arcColors({
          direction: 'upstream',
          color: cityBaseColor(SAMPLE_COUNTRY, true),
        }),
      },
    });
  }
  if (layers.arcs && ctx.arcDirections.has('downstream')) {
    entries.push({
      id: 'arcs-out',
      label: 'Influenced',
      detail: 'White arcs flowing out to the music it shaped.',
      swatch: {
        shape: 'arc',
        colors: arcColors({ direction: 'downstream', color: '' }),
      },
    });
  }

  return entries;
}
