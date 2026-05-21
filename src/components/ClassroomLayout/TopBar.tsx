/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import type { FC } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useUISound } from '@/hooks/useUISound';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { useExperienceSummary } from '@/hooks/data/experience';
import { UserWidget } from '@/layouts/DashboardLayout/UserWidget';

type LearnTabKey = 'Songs' | 'Style' | 'Theory' | 'Technique';

const LEARN_TABS: LearnTabKey[] = ['Songs', 'Style', 'Theory', 'Technique'];

// Maps the user-facing tab label to the URL `tab` searchParam value.
// `Songs` is the default (no param).
const TAB_TO_PARAM: Record<LearnTabKey, string | null> = {
  Songs: null,
  Style: 'Courses',
  Theory: 'Theory',
  Technique: 'Technique',
};

const LearnTabs: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const currentParam = searchParams.get('tab');

  const isActive = (tab: LearnTabKey) => {
    const target = TAB_TO_PARAM[tab];
    if (target === null) {
      return !currentParam || currentParam === 'Songs';
    }
    return currentParam === target;
  };

  const handleClick = (tab: LearnTabKey) => {
    play('click');
    const target = TAB_TO_PARAM[tab];
    const next = new URLSearchParams(searchParams);
    if (target === null) {
      next.delete('tab');
    } else {
      next.set('tab', target);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      {LEARN_TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab}
            type="button"
            onClick={() => handleClick(tab)}
            className="rounded-full transition-colors"
            style={{
              height: 28,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 500,
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#000000' : 'rgba(255,255,255,0.55)',
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

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
  const location = useLocation();
  const { data: xpSummary } = useExperienceSummary();
  const { play } = useUISound();

  const xp = xpSummary?.totalExperience ?? 0;
  const level = xpSummary?.level ?? 1;
  const streak = 12;
  const awards = 60;

  const showLearnTabs = location.pathname === LearnRoutes.root.definition;

  return (
    <header className="relative h-[100px] flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20 max-w-full overflow-hidden">
      {showLearnTabs && (
        <div
          className="absolute left-1/2"
          style={{ transform: 'translateX(-50%)' }}
        >
          <LearnTabs />
        </div>
      )}
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
