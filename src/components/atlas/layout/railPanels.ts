import {
  Layers,
  Network,
  PanelRight,
  Route,
  type LucideIcon,
} from 'lucide-react';
import type { InspectorPanelId } from '@/components/atlas/navigation/atlasFrame';

/**
 * The Inspector's panels, one icon each on the bottom rail (owner, 2026-10-29:
 * the Globe in the Studio's frame; its rail is src/daw/shell/inspector/
 * railPanels.ts). The rail's buttons and the Inspector's names read it.
 */
export interface RailPanel {
  id: InspectorPanelId;
  /** The panel's name: the button's and the Inspector's. */
  title: string;
  /** The tooltip, a little longer than the name. */
  hint: string;
  icon: LucideIcon;
}

export const RAIL_PANELS: readonly RailPanel[] = [
  {
    id: 'details',
    title: 'Details',
    hint: 'Details: the place, event or artist you are on',
    icon: PanelRight,
  },
  {
    id: 'layers',
    title: 'Layers',
    hint: 'Layers: show or hide what the map draws',
    icon: Layers,
  },
  {
    id: 'mindmap',
    title: 'Mind map',
    hint: 'Mind map: your group project’s board',
    icon: Network,
  },
];

/** Tours: a view tab on the rail rather than an icon (navigation/sections.ts). */
export const TOURS_PANEL: RailPanel = {
  id: 'tours',
  title: 'Tours',
  hint: 'Tours: pathways and guided tours through music history',
  icon: Route,
};

export const railPanel = (id: InspectorPanelId): RailPanel =>
  [...RAIL_PANELS, TOURS_PANEL].find((p) => p.id === id) ?? RAIL_PANELS[0];
