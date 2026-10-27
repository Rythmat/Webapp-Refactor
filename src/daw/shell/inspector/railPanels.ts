import {
  GraduationCap,
  Library,
  Lightbulb,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { InspectorPanelId } from '../layout/layoutModel';

// ── The side rail's panels (B4a) ───────────────────────────────────────────
//
// One entry per icon, top to bottom (the owner's six, 2026-10-16; Effects moved
// to the Add effect picker, 2026-10-21; Chat went into People, renamed
// Collaborate, 2026-10-25): the rail's button and the Inspector's header both
// read it.

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
    hint: 'Library: your projects, stems and uploads',
    icon: Library,
  },
  {
    id: 'lessons',
    title: 'Lessons',
    hint: 'Lessons: learn production step by step',
    icon: GraduationCap,
  },
  {
    id: 'people',
    title: 'Collaborate',
    hint: 'Collaborate: invite people, see who is here and chat',
    icon: Users,
  },
];

export function railPanel(id: InspectorPanelId): RailPanel {
  return RAIL_PANELS.find((p) => p.id === id) ?? RAIL_PANELS[0];
}
