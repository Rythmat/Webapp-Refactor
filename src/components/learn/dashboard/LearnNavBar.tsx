import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { LearnRoutes, WelcomeRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';

/**
 * The Learn dashboard's navigation, in the Arcade's look (ArcadeTabBar,
 * owner 2026-11-04): the Learn icon alone (its name for screen readers),
 * which opens the dashboard, then Explore and Tune as plain words at the same
 * size, the current one white.
 */
export function LearnNavBar({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const links = [
    {
      label: 'Explore',
      to: LearnRoutes.root(),
      current: pathname === LearnRoutes.root(),
    },
    {
      label: 'Tune',
      to: WelcomeRoutes.root(undefined, { edit: '1' }),
      current: false,
    },
  ];
  return (
    <nav
      aria-label="Learn"
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6',
        className,
      )}
    >
      <Link
        to={LearnRoutes.root()}
        aria-current={pathname === LearnRoutes.root() ? 'page' : undefined}
        className={cn(
          'flex items-center rounded-lg text-white/85 transition-opacity hover:opacity-90',
          FOCUS_RING,
        )}
      >
        <img
          src="/icons/learn-icon.svg"
          alt=""
          draggable={false}
          className="size-8 md:size-10"
        />
        <span className="sr-only">Learn</span>
      </Link>
      {links.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          aria-current={link.current ? 'page' : undefined}
          className={cn(
            'rounded-md text-xl font-medium transition-colors md:text-2xl',
            FOCUS_RING,
            link.current ? 'text-white' : 'text-white/55 hover:text-white',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
