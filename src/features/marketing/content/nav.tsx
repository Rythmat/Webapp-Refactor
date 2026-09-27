import { Logo } from '@/components/Logo';
import { appHref } from '@/constants/hosts';
import { AuthRoutes, MarketingRoutes } from '@/constants/routes';
import { moduleIcon } from '@/features/landing/sections/moduleIcons';

/** Nav-menu icon size; the app icons carry their own padding, the logo doesn't. */
const ICON = 'size-5';

/**
 * Home, module + audience pages surfaced in the nav "Features" menu. Icons match
 * the landing's module bento (the Music Atlas logo for Home).
 */
export const featureLinks = [
  {
    label: 'Home',
    href: '/',
    description: 'Music Atlas at a glance',
    icon: <Logo className="size-4" />,
  },
  {
    label: 'Studio',
    href: MarketingRoutes.studio(),
    description: 'Make music in your browser',
    icon: moduleIcon('studio', ICON),
  },
  {
    label: 'Learn',
    href: MarketingRoutes.learn(),
    description: 'Theory, technique & real songs',
    icon: moduleIcon('learn', ICON),
  },
  {
    label: 'Arcade',
    href: MarketingRoutes.arcade(),
    description: 'Train your ear through play',
    icon: moduleIcon('arcade', ICON),
  },
  {
    label: 'Globe',
    href: MarketingRoutes.globe(),
    description: 'Explore the world of music',
    icon: moduleIcon('globe', ICON),
  },
  {
    label: 'Teachers',
    href: MarketingRoutes.teachers(),
    description: 'Teach music in real time',
    icon: moduleIcon('teach', ICON),
  },
] as const;

/** Top-level nav links (besides the Features menu). */
export const navLinks = [
  { label: 'Blog', href: MarketingRoutes.blog() },
] as const;

/** The nav's single "Open" CTA (sign-in doubles as sign-up). */
export const OPEN_APP_HREF = appHref(AuthRoutes.signIn());
