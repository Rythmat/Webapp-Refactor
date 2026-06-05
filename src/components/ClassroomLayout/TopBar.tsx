/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUISound } from '@/hooks/useUISound';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { useExperienceSummary } from '@/hooks/data/experience';
import { UserWidget } from '@/layouts/DashboardLayout/UserWidget';

const Icon: FC<{ src: string; className?: string }> = ({
  src,
  className = 'w-4 h-4 lg:w-5 lg:h-5',
}) => <img src={src} alt="" className={className} draggable={false} />;

const NAV_ITEMS = [
  { icon: '/icons/music-atlas-logo.svg', label: 'Home', route: '/' },
  {
    icon: '/icons/learn-icon.svg',
    label: 'Learn',
    route: LearnRoutes.root.definition,
  },
  {
    icon: '/icons/studio-icon.svg',
    label: 'Studio',
    route: StudioRoutes.root.definition,
  },
  {
    icon: '/icons/arcade-icon.svg',
    label: 'Arcade',
    route: GameRoutes.root.definition,
  },
  {
    icon: '/icons/globe-icon.svg',
    label: 'Globe',
    route: AtlasRoutes.root.definition,
  },
];

export const TopBar: FC = () => {
  const navigate = useNavigate();
  const { data: xpSummary } = useExperienceSummary();
  const { play } = useUISound();

  const xp = xpSummary?.totalExperience ?? 0;
  const level = xpSummary?.level ?? 1;
  const streak = 12;
  const awards = 60;

  return (
    <header className="h-[100px] flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20 max-w-full overflow-hidden">
      {/* Left: 5 nav icons */}
      <nav className="flex items-center gap-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              play('click');
              navigate(item.route);
            }}
            aria-label={item.label}
            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <Icon
              src={item.icon}
              className="w-6 h-6 lg:w-8 lg:h-8 opacity-90"
            />
          </button>
        ))}
      </nav>

      {/* Right: stats + user */}
      <div
        className="flex items-center gap-4 text-sm lg:text-base"
        style={{ color: 'var(--color-text-dim)' }}
      >
        <span className="font-bold text-white">{xp.toLocaleString()}</span>
        <span>XP</span>
        <span className="text-white/30">·</span>
        <span className="font-bold text-white">Lvl {level}</span>
        <Icon src="/icons/credits-icon.svg" className="w-5 h-5 opacity-60" />
        <span className="font-bold text-white">{streak}</span>
        <Icon src="/icons/awards-icon.svg" className="w-5 h-5 opacity-60" />
        <span className="font-bold text-white">{awards}</span>
        <Icon src="/icons/share-icon.svg" className="w-5 h-5 opacity-60" />
        <div
          className="pl-4 border-l"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <UserWidget variant="header" />
        </div>
      </div>
    </header>
  );
};
