/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useUISound } from '@/hooks/useUISound';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { useExperienceSummary } from '@/hooks/data/experience';
import { UserWidget } from '@/layouts/DashboardLayout/UserWidget';

const Icon: FC<{ src: string; className?: string }> = ({ src, className = 'w-4 h-4 lg:w-5 lg:h-5' }) => (
  <img src={src} alt="" className={className} draggable={false} />
);

const NAV_ITEMS = [
  { icon: '/icons/music-atlas-logo.svg', label: 'Home', route: '/' },
  { icon: '/icons/learn-icon.svg', label: 'Learn', route: LearnRoutes.root.definition },
  { icon: '/icons/studio-icon.svg', label: 'Studio', route: StudioRoutes.root.definition },
  { icon: '/icons/arcade-icon.svg', label: 'Arcade', route: GameRoutes.root.definition },
  { icon: '/icons/globe-icon.svg', label: 'Globe', route: AtlasRoutes.root.definition },
];

export const TopBar: FC = () => {
  const navigate = useNavigate();
  const { data: xpSummary } = useExperienceSummary();
  const { play } = useUISound();

  const xp = xpSummary?.totalExperience ?? 0;
  const streak = 12;
  const awards = 60;

  return (
    <header className="h-12 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20">
      {/* Left: 5 nav icons */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => { play('click'); navigate(item.route); }}
            aria-label={item.label}
            className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Icon src={item.icon} className="w-4 h-4 lg:w-5 lg:h-5 opacity-60" />
          </button>
        ))}
      </nav>

      {/* Right: stats + user */}
      <div className="flex items-center gap-3 text-xs lg:text-sm" style={{ color: 'var(--color-text-dim)' }}>
        <span className="font-bold text-white">{xp.toLocaleString()}</span>
        <span>XP</span>
        <Icon src="/icons/credits-icon.svg" className="w-3.5 h-3.5 opacity-50" />
        <span className="font-bold text-white">{streak}</span>
        <Icon src="/icons/awards-icon.svg" className="w-3.5 h-3.5 opacity-50" />
        <span className="font-bold text-white">{awards}</span>
        <Icon src="/icons/share-icon.svg" className="w-3.5 h-3.5 opacity-50" />
        <div className="pl-3 border-l" style={{ borderColor: 'var(--color-border)' }}>
          <UserWidget variant="header" />
        </div>
      </div>
    </header>
  );
};
