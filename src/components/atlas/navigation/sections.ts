import type { AtlasFrame } from './atlasFrame';

/**
 * The Globe's five sections, and the frame each one is (navigation/
 * atlasFrame.ts). One page shows them all: Explore is the map; Eras the
 * timeline of the world's four great regions; Regions & Cities the same
 * timeline opened into regions (and, a click further, cities); Pathways and
 * Instruments regroup the timeline's lanes.
 *
 * The Globe page's tabs read this list, in this order and with these names.
 */
export type AtlasSectionId =
  | 'explore'
  | 'eras'
  | 'regions'
  | 'pathways'
  | 'instruments';

export interface AtlasSection {
  id: AtlasSectionId;
  label: string;
}

export const ATLAS_SECTIONS: readonly AtlasSection[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'eras', label: 'Eras' },
  { id: 'regions', label: 'Regions & Cities' },
  { id: 'pathways', label: 'Pathways' },
  { id: 'instruments', label: 'Instruments' },
];

/** Every continent, opened: the Regions & Cities section (placeTree.ts). */
export const ALL_CONTINENTS = [
  'americas',
  'europe',
  'africa-me',
  'asia-pacific',
] as const;

export const getSection = (id: AtlasSectionId): AtlasSection =>
  ATLAS_SECTIONS.find((s) => s.id === id) ?? ATLAS_SECTIONS[0];

/** The frame patch that opens a section. */
export function sectionFrame(
  id: AtlasSectionId,
): Partial<Pick<AtlasFrame, 'view' | 'lens' | 'open'>> {
  switch (id) {
    case 'explore':
      return { view: 'map', lens: 'places' };
    case 'eras':
      return { view: 'timeline', lens: 'places', open: [] };
    case 'regions':
      return { view: 'timeline', lens: 'places', open: [...ALL_CONTINENTS] };
    case 'pathways':
      return { view: 'timeline', lens: 'pathways' };
    case 'instruments':
      return { view: 'timeline', lens: 'instruments' };
  }
}

/**
 * The section a frame shows: the pathways and instruments lenses are their
 * own; on places, the map is Explore, and the timeline is Regions & Cities
 * once a place is opened, else Eras.
 */
export function sectionOf(
  frame: Pick<AtlasFrame, 'view' | 'lens' | 'open'>,
): AtlasSectionId {
  if (frame.lens !== 'places') return frame.lens;
  if (frame.view === 'map') return 'explore';
  return frame.open.length ? 'regions' : 'eras';
}
