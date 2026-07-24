import {
  BookOpen,
  Compass,
  Gamepad2,
  Globe,
  GraduationCap,
  Mic2,
  Music,
  School,
  type LucideIcon,
} from 'lucide-react';
import type { SearchCategory } from './types';

/** Display label + glyph for each category. */
export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; icon: LucideIcon }
> = {
  songs: { label: 'Songs', icon: Music },
  artists: { label: 'Artists', icon: Mic2 },
  courses: { label: 'Courses', icon: GraduationCap },
  theory: { label: 'Theory', icon: BookOpen },
  globe: { label: 'Globe', icon: Globe },
  arcade: { label: 'Arcade', icon: Gamepad2 },
  classrooms: { label: 'Classrooms', icon: School },
  pages: { label: 'Pages', icon: Compass },
};

/** Order groups render in on the results page. */
export const CATEGORY_ORDER: SearchCategory[] = [
  'songs',
  'artists',
  'courses',
  'theory',
  'globe',
  'arcade',
  'classrooms',
  'pages',
];
