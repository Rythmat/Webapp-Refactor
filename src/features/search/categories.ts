import {
  type AppIconComponent,
  AppIcons,
  AppListIcons,
} from '@/components/icons/appIcons';
import type { SearchCategory } from './types';

/** Display label + glyph for each category. */
export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; icon: AppIconComponent }
> = {
  songs: { label: 'Songs', icon: AppIcons.songs },
  artists: { label: 'Artists', icon: AppListIcons.artists },
  courses: { label: 'Courses', icon: AppIcons.learn },
  theory: { label: 'Theory', icon: AppListIcons.theory },
  globe: { label: 'Globe', icon: AppIcons.globe },
  arcade: { label: 'Arcade', icon: AppIcons.arcade },
  classrooms: { label: 'Classrooms', icon: AppIcons.classroom },
  pages: { label: 'Pages', icon: AppListIcons.pages },
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
