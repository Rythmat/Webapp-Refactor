import {
  Gamepad2,
  Globe,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';
import { AuthRoutes, MarketingRoutes } from '@/constants/routes';

/** Module product pages surfaced in the nav "Product" menu. */
export const productLinks = [
  {
    label: 'Studio',
    href: MarketingRoutes.studio(),
    description: 'Make music in your browser',
    Icon: SlidersHorizontal,
  },
  {
    label: 'Learn',
    href: MarketingRoutes.learn(),
    description: 'Theory, technique & real songs',
    Icon: GraduationCap,
  },
  {
    label: 'Arcade',
    href: MarketingRoutes.arcade(),
    description: 'Train your ear through play',
    Icon: Gamepad2,
  },
  {
    label: 'Globe',
    href: MarketingRoutes.globe(),
    description: 'Explore the world of music',
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
