import { isMapView, isRingView, type AtlasFrame } from './atlasFrame';

/**
 * The Globe's four views, and the frame each one is (navigation/
 * atlasFrame.ts): Explore is the map; Connections the ring of places and
 * the links between them (owner, 2026-10-29); Eras the timeline of the world's four
 * great regions; Regions & Cities the same timeline opened into regions
 * (and, a click further, cities). Explore and Connections are the bottom
 * rail's view tabs, as the Studio's Create · Mix · Score (owner, 2026-10-29);
 * Eras and Regions & Cities lost their tabs (owner, 2026-11-09) and open
 * only from links (`?view=timeline`). Tours took a tab of its own the same
 * day: the map with the Tours panel in the Inspector (pathways and guided
 * tours together), or a pathway or tour running. Instruments is a panel.
 */
export type AtlasSectionId = 'explore' | 'ring' | 'tours' | 'eras' | 'regions';

export interface AtlasSection {
  id: AtlasSectionId;
  label: string;
}

/** The views with a tab on the bottom rail. */
export const ATLAS_SECTIONS: readonly AtlasSection[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'ring', label: 'Connections' },
  { id: 'tours', label: 'Tours' },
];

/** Every continent, opened: the Regions & Cities view (placeTree.ts). */
export const ALL_CONTINENTS = [
  'americas',
  'europe',
  'africa-me',
  'asia-pacific',
] as const;

export const getSection = (id: AtlasSectionId): AtlasSection =>
  ATLAS_SECTIONS.find((s) => s.id === id) ?? ATLAS_SECTIONS[0];

/** The frame patch that opens a view. */
export function sectionFrame(
  id: AtlasSectionId,
): Partial<Pick<AtlasFrame, 'view' | 'lens' | 'open' | 'panel'>> {
  switch (id) {
    case 'explore':
      return { view: 'map', lens: 'places' };
    case 'ring':
      return { view: 'ring', lens: 'places' };
    case 'tours':
      return { view: 'map', lens: 'places', panel: 'tours' };
    case 'eras':
      return { view: 'timeline', lens: 'places', open: [] };
    case 'regions':
      return { view: 'timeline', lens: 'places', open: [...ALL_CONTINENTS] };
  }
}

/**
 * The view a frame shows: the map is Explore, or Tours while its panel is
 * chosen; the timeline is Regions & Cities once a place is opened, else
 * Eras. (A running pathway or tour is Tours too, but that is the stop's:
 * BottomRail.)
 */
export function sectionOf(
  frame: Pick<AtlasFrame, 'view' | 'open'> & Partial<Pick<AtlasFrame, 'panel'>>,
): AtlasSectionId {
  if (isMapView(frame)) {
    return frame.panel === 'tours' ? 'tours' : 'explore';
  }
  if (isRingView(frame)) return 'ring';
  return frame.open.length ? 'regions' : 'eras';
}
