import type {
  AtlasPanelChoice,
  InspectorPanelId,
} from '@/components/atlas/navigation/atlasFrame';

/**
 * The panel the Inspector shows (owner, 2026-10-29: the Globe in the Studio's
 * frame), one at a time: the one the student chose on the bottom rail; else a
 * lesson's mind map while it is open; else the stop's details when there are
 * any (a place, an event, an artist, a search, a pathway or tour running).
 * `none` — they closed it — shows nothing.
 */
export function resolveInspectorPanel({
  panel,
  mindmap,
  hasDetails,
}: {
  panel: AtlasPanelChoice;
  mindmap: boolean;
  hasDetails: boolean;
}): InspectorPanelId | null {
  if (panel === 'none') return null;
  if (panel) return panel;
  if (mindmap) return 'mindmap';
  return hasDetails ? 'details' : null;
}
