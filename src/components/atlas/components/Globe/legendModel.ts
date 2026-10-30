import {
  getContinentSwatches,
  type ContinentSwatch,
} from '@/components/atlas/data/continentColors';
import { ERA_HEX } from '@/components/atlas/data/musicalEras';
import {
  ROOTS_RAMP,
  ROUTES_RAMP,
  SUN_WHITE,
} from '@/components/atlas/theme/marks';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { GlobeLayers } from '@/components/atlas/types';
import { ARTIST_POINT } from './globeLayers';
import { compactCount } from './networkFeatures';

/**
 * The legend's rows: one per kind of mark on the globe right now, each with
 * a name, a sentence, and a swatch drawn from the very values the globe
 * paints with (globeLayers.ts, ATLAS_SCENE, marks.ts, the continent palette).
 */

/** The swatch a row draws. */
export type LegendSwatch =
  | { shape: 'continents'; continents: ContinentSwatch[] }
  | { shape: 'fill'; color: string }
  /** A range from least to most, left to right (the land lit by music). */
  | { shape: 'ramp'; colors: string[] }
  | { shape: 'point'; color: string }
  /** A sample of a city's name, in the colour the map writes it. */
  | { shape: 'label'; color: string }
  | { shape: 'outline'; color: string }
  /** A place's dot in halos of three sizes, in eras' colours. */
  | { shape: 'halos'; colors: string[] }
  /** The selected place's white light. */
  | { shape: 'sun'; color: string }
  /** A solid link, its gradient from where it starts to where it ends. */
  | { shape: 'line'; colors: string[] }
  /** A weak tie or a link between regions: dotted, flowing. */
  | { shape: 'dotted'; color: string }
  /** The count on a link. */
  | { shape: 'pill'; text: string };

export type LegendEntryId =
  | 'countries'
  | 'selected-region'
  | 'states'
  | 'cities'
  | 'selected-city'
  | 'artist-points'
  | 'links-world'
  | 'links-in'
  | 'links-out'
  | 'links-weak'
  | 'link-count';

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
  /**
   * Which links the map draws (useNetworkLayers): the world's between
   * regions, a place's or an artist's, an event's own, or none.
   */
  links: 'world' | 'focus' | 'event' | null;
}

/** Three halos, as the busiest eras of three places might colour them. */
const HALO_SAMPLE = ['postwar', 'electronic-hiphop', 'early-modern'] as const;

export function legendEntries(ctx: LegendContext): LegendEntry[] {
  const { layers } = ctx;
  const entries: LegendEntry[] = [];

  entries.push(
    layers.landColor === 'music'
      ? {
          id: 'countries',
          label: 'Music',
          detail:
            'A country lights up the more music happened there in the years shown.',
          swatch: {
            shape: 'ramp',
            colors: [ATLAS_SCENE.landPlain, ...ATLAS_SCENE.landLit],
          },
        }
      : layers.landColor === 'continent'
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
            detail: 'One plain color, chosen in Layers.',
            swatch: { shape: 'fill', color: ATLAS_SCENE.landPlain },
          },
  );

  if (ctx.regionSelected) {
    entries.push({
      id: 'selected-region',
      label: 'Selected country or state',
      detail: 'Outlined in white, with a soft glow.',
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
      label: 'Music places',
      detail:
        'A dot for each place, its halo as big as its music in the years shown, in the colour of its busiest era. The busiest are named; select one to open it.',
      swatch: {
        shape: 'halos',
        colors: HALO_SAMPLE.map((id) => ERA_HEX[id]),
      },
    });
    if (ctx.cityHighlighted) {
      entries.push({
        id: 'selected-city',
        label: 'Selected place',
        detail: 'It glows white, and its links grow out of it.',
        swatch: { shape: 'sun', color: SUN_WHITE },
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

  if (layers.arcs && ctx.links === 'world') {
    entries.push({
      id: 'links-world',
      label: 'Links between regions',
      detail:
        'The strongest flows of influence between regions in the years shown, flowing the way the music went.',
      swatch: { shape: 'dotted', color: ROUTES_RAMP[0] },
    });
  }
  const event = ctx.links === 'event';
  const cameIn =
    ctx.links === 'focus' || (event && ctx.arcDirections.has('upstream'));
  const wentOut =
    ctx.links === 'focus' || (event && ctx.arcDirections.has('downstream'));
  if (layers.arcs && cameIn) {
    entries.push({
      id: 'links-in',
      label: event ? 'Shaped it' : 'Came from',
      detail: event
        ? 'Earlier music that shaped this event, cool where it began, white where it arrives.'
        : 'Where its music came from: cool at the far place, white where it arrives.',
      swatch: { shape: 'line', colors: [...ROOTS_RAMP] },
    });
  }
  if (layers.arcs && wentOut) {
    entries.push({
      id: 'links-out',
      label: event ? 'It shaped' : 'Went to',
      detail: event
        ? 'Later music this event shaped, white as it leaves, warm where it lands.'
        : 'Where its music went: white as it leaves, warm at the far place.',
      swatch: { shape: 'line', colors: [...ROUTES_RAMP] },
    });
  }
  if (layers.arcs && ctx.links === 'focus') {
    entries.push({
      id: 'links-weak',
      label: 'One influence',
      detail: 'A link carrying a single influence is dotted, flowing its way.',
      swatch: { shape: 'dotted', color: ROOTS_RAMP[1] },
    });
  }
  if (layers.arcs && (ctx.links === 'world' || ctx.links === 'focus')) {
    entries.push({
      id: 'link-count',
      label: 'How many',
      detail: 'The number on a link: the influences it carries.',
      swatch: { shape: 'pill', text: compactCount(14) },
    });
  }

  return entries;
}
