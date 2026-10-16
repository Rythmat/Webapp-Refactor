import {
  GraduationCap,
  LayoutTemplate,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { InspectorPanelId } from '../layout/layoutModel';

// ── The side rail's panels (B4a) ───────────────────────────────────────────
//
// One entry per icon, top to bottom (the owner's six, 2026-10-16): the
// rail's button and the Inspector's header both read it.

export interface RailPanel {
  id: InspectorPanelId;
  /** The header's title and the icon's name. */
  title: string;
  /** The icon's tooltip, a little longer than the title. */
  hint: string;
  icon: LucideIcon;
}

export const RAIL_PANELS: readonly RailPanel[] = [
  {
    id: 'insight',
    title: 'Insight',
    hint: 'Insight: the key and chords of what you play',
    icon: Lightbulb,
  },
  {
    id: 'library',
    title: 'Library',
    hint: 'Library: start from a template',
    icon: LayoutTemplate,
  },
  {
    id: 'fx',
    title: 'Effects',
    hint: 'Effects: add one to the selected track',
    icon: Sparkles,
  },
  {
    id: 'lessons',
    title: 'Lessons',
    hint: 'Lessons: learn production step by step',
    icon: GraduationCap,
  },
  {
    id: 'people',
    title: 'People',
    hint: 'People: who is in this session',
    icon: Users,
  },
  {
    id: 'chat',
    title: 'Chat',
    hint: 'Chat with the people in this session',
    icon: MessageSquare,
  },
];

export function railPanel(id: InspectorPanelId): RailPanel {
  return RAIL_PANELS.find((p) => p.id === id) ?? RAIL_PANELS[0];
}
