import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { GameRoutes } from '@/constants/routes';
import type { ArcadeCategory } from '../arcadeGames';

export interface ArcadeTab {
  /** `?tab=` value this tab activates. */
  slug: string;
  /** Display text. */
  label: string;
  /** The Arcade category this tab shows. */
  category: ArcadeCategory;
}

/**
 * The Arcade dashboard's category tabs. Multiplayer is omitted (its only
 * game is the featured hero).
 */
export const ARCADE_TABS: ArcadeTab[] = [
  { slug: 'EarTraining', label: 'Ear Training', category: 'Ear Training' },
  { slug: 'Skill', label: 'Skill', category: 'Skill' },
  { slug: 'Puzzles', label: 'Puzzles', category: 'Puzzles' },
  { slug: 'Rhythm', label: 'Rhythm', category: 'Rhythm' },
  { slug: 'SoundLab', label: 'Sound Lab', category: 'Sound Lab' },
];

/**
 * The Arcade's navigation, as the Learn page's (LearnTabBar with
 * `instrumentHeading`, owner 2026-10-28: "match /learn"): centred, the
 * Arcade icon alone (its name for screen readers), which opens the whole
 * Arcade, then the categories as plain words at the same size, the current
 * one white. Tabs navigate by `?tab=`, which ArcadeInlet reads.
 */
export const ArcadeTabBar = () => {
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? '';
  const active = ARCADE_TABS.some((t) => t.slug === tab) ? tab : '';

  return (
    <nav
      aria-label="Arcade"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-6"
    >
      <Link
        to={GameRoutes.root()}
        aria-current={active === '' ? 'page' : undefined}
        className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
      >
        <img
          src="/icons/arcade-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="sr-only">Arcade</h2>
      </Link>
      {ARCADE_TABS.map(({ slug, label }) => (
        <Link
          key={slug}
          to={`?tab=${slug}`}
          aria-label={`Open ${label}`}
          aria-current={active === slug ? 'page' : undefined}
          className={cn(
            'text-xl font-medium transition-colors md:text-2xl',
            active === slug ? 'text-white' : 'text-white/55 hover:text-white',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
};
