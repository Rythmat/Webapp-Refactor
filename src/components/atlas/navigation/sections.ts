import type { AtlasFrame, AtlasLens, AtlasView } from './atlasFrame';

/**
 * The Globe's five sections, and the frame each one is (navigation/
 * atlasFrame.ts). One page shows them all: Explore is the map and Eras the
 * timeline of the music streams; Regions & Cities, Pathways and Instruments
 * are lenses that regroup the timeline's lanes.
 *
 * The /atlas dashboard's tab bar and the Globe page's own read this list, so
 * the two never disagree about the order or the names.
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
  view: AtlasView;
  lens: AtlasLens;
}

export const ATLAS_SECTIONS: readonly AtlasSection[] = [
  { id: 'explore', label: 'Explore', view: 'map', lens: 'streams' },
  { id: 'eras', label: 'Eras', view: 'timeline', lens: 'streams' },
  {
    id: 'regions',
    label: 'Regions & Cities',
    view: 'timeline',
    lens: 'regions',
  },
  { id: 'pathways', label: 'Pathways', view: 'timeline', lens: 'pathways' },
  {
    id: 'instruments',
    label: 'Instruments',
    view: 'timeline',
    lens: 'instruments',
  },
];

export const getSection = (id: AtlasSectionId): AtlasSection =>
  ATLAS_SECTIONS.find((s) => s.id === id) ?? ATLAS_SECTIONS[0];

/** The frame patch that opens a section. */
export const sectionFrame = (
  id: AtlasSectionId,
): Pick<AtlasFrame, 'view' | 'lens'> => {
  const { view, lens } = getSection(id);
  return { view, lens };
};

/**
 * The section a frame shows: its lens, or for the streams lens its view —
 * the map is Explore and the timeline Eras.
 */
export function sectionOf(
  frame: Pick<AtlasFrame, 'view' | 'lens'>,
): AtlasSectionId {
  if (frame.lens !== 'streams') return frame.lens;
  return frame.view === 'map' ? 'explore' : 'eras';
}

/** The dashboard's old `?tab=` values, and the section each one is now. */
export const LEGACY_TABS: Readonly<Record<string, AtlasSectionId>> = {
  Explore: 'explore',
  Regions: 'regions',
  Pathways: 'pathways',
  Eras: 'eras',
  Instruments: 'instruments',
};
