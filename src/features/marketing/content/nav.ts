import {
  Gamepad2,
  Globe,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';
import { AuthRoutes, MarketingRoutes } from '@/constants/routes';

/**
 * Module product pages surfaced in the nav "Product" menu. `accent` is the
 * module's app accent (dashboard.css `data-tab` colors).
 */
export const productLinks = [
  {
    label: 'Studio',
    href: MarketingRoutes.studio(),
    description: 'Make music in your browser',
    accent: '#ffcc33',
    Icon: SlidersHorizontal,
  },
  {
    label: 'Learn',
    href: MarketingRoutes.learn(),
    description: 'Theory, technique & real songs',
    accent: '#34d399',
    Icon: GraduationCap,
  },
  {
    label: 'Arcade',
    href: MarketingRoutes.arcade(),
    description: 'Train your ear through play',
    accent: '#a78bfa',
    Icon: Gamepad2,
  },
  {
    label: 'Globe',
    href: MarketingRoutes.globe(),
    description: 'Explore the world of music',
    accent: '#60a5fa',
    Icon: Globe,
  },
] as const;

/** Top-level nav links (besides the Product menu). */
export const navLinks = [
  { label: 'Blog', href: MarketingRoutes.blog() },
  { label: 'For Teachers', href: MarketingRoutes.teachers() },
] as const;

export const START_FREE_HREF = AuthRoutes.signIn();
export const LOGIN_HREF = AuthRoutes.signIn();
