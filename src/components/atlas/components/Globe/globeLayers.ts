import {
  getContrastColor,
  getCountryColor,
} from '@/components/atlas/data/continentColors';
import type { ArcDatum } from '@/components/atlas/data/eventConnections';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { GlobeLayers } from '@/components/atlas/types';

/**
 * What the globe draws, and in which colours, as plain functions: BaseGlobe
 * draws from them and the legend (legendModel.ts) explains them from the
 * same values, so the two cannot drift apart.
 *
 * The Layers control switches a layer off by handing the globe no data for
 * it, never by remounting the globe. Each function gives back the very array
 * it was handed (or one shared empty array), so a layer that did not change
 * keeps its identity and react-globe.gl leaves it alone.
 */

/** One shared empty layer, so "off" is the same array every time. */
const NONE: readonly never[] = Object.freeze([]);
const none = <T>(): T[] => NONE as unknown as T[];

/* ── Colours ─────────────────────────────────────────────────────────────── */

/**
 * The colour a piece of land is painted: its country's, from the continent
 * palette, or one plain grey with country colours off.
 */
export function landColor(iso: string, countryColors: boolean): string {
  return countryColors ? getCountryColor(iso) : ATLAS_SCENE.landPlain;
}

/** A city column's base: its country's colour (or the plain land's). */
export function cityBaseColor(
  iso: string | undefined,
  countryColors: boolean,
): string {
  if (!countryColors) return ATLAS_SCENE.landPlain;
  return iso ? getCountryColor(iso) : ATLAS_SCENE.fallback;
}

/**
 * A city column stands out from its own land: a lighter shade on dark land,
 * a darker one on light land. The selected city is white.
 */
export function cityColumnColors(
  base: string,
  highlighted = false,
): { top: string; side: string } {
  if (highlighted) {
    return { top: ATLAS_SCENE.highlight, side: ATLAS_SCENE.highlightSide };
  }
  const shade = getContrastColor(base);
  return { top: shade, side: `${shade}cc` };
}

/** An artist's moments: small white points. */
export const ARTIST_POINT = { color: ATLAS_SCENE.highlight, radius: 0.45 };

const ARC_DOWNSTREAM: [string, string] = [...ATLAS_SCENE.arcDownstream];

/**
 * An influence arc, head to tail. "Influenced by" arcs come in from the
 * earlier music, in a shade of where it came from; "Influenced" arcs go out
 * to later music, in white.
 */
export function arcColors(
  arc: Pick<ArcDatum, 'direction' | 'color'>,
): [string, string] {
  if (arc.direction === 'downstream') return ARC_DOWNSTREAM;
  const c = getContrastColor(arc.color);
  return [`${c}e6`, `${c}66`];
}

/* ── Layers ──────────────────────────────────────────────────────────────── */

/** Country polygons, with the state outlines added while they are in view. */
export function visiblePolygons<F>(
  layers: GlobeLayers,
  countries: F[],
  states: F[],
  statesInView: boolean,
): F[] {
  return layers.states && statesInView && states.length > 0
    ? [...countries, ...states]
    : countries;
}

/** The city columns, or none. */
export function visibleCityPoints<P>(layers: GlobeLayers, points: P[]): P[] {
  return layers.cities ? points : none<P>();
}

/** An artist's points, or none. */
export function visibleArtistPoints<P>(layers: GlobeLayers, points: P[]): P[] {
  return layers.artistPoints ? points : none<P>();
}

/**
 * The pinned event's arcs in the directions open in its card (or the Layers
 * popover), or none with the arcs layer off.
 */
export function visibleArcs<A extends Pick<ArcDatum, 'direction'>>(
  layers: GlobeLayers,
  arcs: A[],
  directions: ReadonlySet<ArcDatum['direction']>,
): A[] {
  if (!layers.arcs || directions.size === 0 || arcs.length === 0) {
    return none<A>();
  }
  return directions.size === 2
    ? arcs
    : arcs.filter((arc) => directions.has(arc.direction));
}
