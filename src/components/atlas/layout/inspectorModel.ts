import type {
  AtlasPanelChoice,
  InspectorPanelId,
} from '@/components/atlas/navigation/atlasFrame';

/**
 * The panel the Inspector shows (owner, 2026-10-29: the Globe in the Studio's
 * frame), one at a time: the one the student chose on the bottom rail; else a
 * running pathway's or tour's own card; else a lesson's mind map while it is open; else
 * the stop's details when there are any (a place, an event, an artist, a
 * search). In Story mode, the student's Stories until one is open, and the
 * open one where there are no details.
 * `none` — they closed it — shows nothing.
 */
export function resolveInspectorPanel({
  panel,
  journey = false,
  mindmap,
  hasDetails,
  story = null,
}: {
  panel: AtlasPanelChoice;
  /** A pathway or a tour is running (the stop is `?pathway=` or `?tour=`). */
  journey?: boolean;
  mindmap: boolean;
  hasDetails: boolean;
  /**
   * Story mode: `choose` while no Story is open (the student's Stories come
   * first), `build` once one is (the details come first; the Story when
   * there are none).
   */
  story?: 'choose' | 'build' | null;
}): InspectorPanelId | null {
  if (panel === 'none') return null;
  if (panel) return panel;
  if (journey) return 'tours';
  if (story === 'choose') return 'story';
  if (mindmap) return 'mindmap';
  if (hasDetails) return 'details';
  return story === 'build' ? 'story' : null;
}
