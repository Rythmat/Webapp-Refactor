import type { RailPanel } from '@/components/atlas/layout/railPanels';
import { useInspectorState } from '@/components/atlas/layout/useInspector';
import {
  isMapView,
  type InspectorPanelId,
} from '@/components/atlas/navigation/atlasFrame';
import {
  useAtlasFrame,
  useAtlasNavigate,
  useAtlasParams,
} from '@/components/atlas/navigation/useAtlasNavigate';

/**
 * Which of the Inspector's panels apply right now: the stop's details only when it has
 * some; the map's layers only on the map; a lesson's mind map only
 * while its lesson has the Globe open.
 */
export function usePanelAvailability() {
  const { hasDetails } = useInspectorState();
  const offMap = useAtlasFrame((frame) => !isMapView(frame));
  const mindmap = useAtlasParams((params) => params.get('mindmap') === '1');
  return {
    shown: (panel: RailPanel) => panel.id !== 'mindmap' || mindmap,
    disabled: (id: InspectorPanelId) =>
      (id === 'details' && !hasDetails) || (id === 'layers' && offMap),
  };
}

/** Open a panel in the Inspector, or close the Inspector on its own panel. */
export function useTogglePanel() {
  const { slot } = useInspectorState();
  const navigate = useAtlasNavigate();
  return {
    active: slot?.panel ?? null,
    toggle: (id: InspectorPanelId) =>
      navigate.setFrame({ panel: slot?.panel === id ? 'none' : id }),
  };
}
