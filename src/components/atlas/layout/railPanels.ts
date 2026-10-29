import {
  Info,
  Layers,
  Network,
  PanelRight,
  type LucideIcon,
} from 'lucide-react';
import type { InspectorPanelId } from '@/components/atlas/navigation/atlasFrame';

/**
 * The side rail's panels, one icon each, top to bottom (owner, 2026-10-29:
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
    id: 'legend',
    title: 'Legend',
    hint: 'Legend: what the marks on the map mean',
    icon: Info,
  },
  {
    id: 'mindmap',
    title: 'Mind map',
    hint: 'Mind map: your group project’s board',
    icon: Network,
  },
];

export const railPanel = (id: InspectorPanelId): RailPanel =>
  RAIL_PANELS.find((p) => p.id === id) ?? RAIL_PANELS[0];
