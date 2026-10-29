import type { AtlasFrame } from './atlasFrame';

/**
 * The Globe's three views, and the frame each one is (navigation/
 * atlasFrame.ts): Explore is the map; Eras the timeline of the world's four
 * great regions; Regions & Cities the same timeline opened into regions
 * (and, a click further, cities). They are the bottom rail's view tabs, as
 * the Studio's Create · Mix · Score (owner, 2026-10-29); Pathways and
 * Instruments are panels in the Inspector.
 */
export type AtlasSectionId = 'explore' | 'eras' | 'regions';

export interface AtlasSection {
  id: AtlasSectionId;
  label: string;
}

export const ATLAS_SECTIONS: readonly AtlasSection[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'eras', label: 'Eras' },
  { id: 'regions', label: 'Regions & Cities' },
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
): Partial<Pick<AtlasFrame, 'view' | 'lens' | 'open'>> {
  switch (id) {
    case 'explore':
      return { view: 'map', lens: 'places' };
    case 'eras':
      return { view: 'timeline', lens: 'places', open: [] };
    case 'regions':
      return { view: 'timeline', lens: 'places', open: [...ALL_CONTINENTS] };
  }
}

/**
 * The view a frame shows: the map is Explore, and the timeline is Regions &
 * Cities once a place is opened, else Eras.
 */
export function sectionOf(
  frame: Pick<AtlasFrame, 'view' | 'open'>,
): AtlasSectionId {
  if (frame.view === 'map') return 'explore';
  return frame.open.length ? 'regions' : 'eras';
}
