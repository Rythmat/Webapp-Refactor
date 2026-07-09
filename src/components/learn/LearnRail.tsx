import { Home, type LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { useUISound } from '@/hooks/useUISound';

interface RailItem {
  slug: string; // empty string == Home (no ?tab= param)
  label: string;
  icon?: LucideIcon;
  iconSrc?: string; // image icon (matches the Home section icons); wins over `icon`
}

const ITEMS: RailItem[] = [
  { slug: '', label: 'Home', icon: Home },
  {
    slug: 'Songs',
    label: 'Songs',
    iconSrc: '/icons/popular-releases-icon.svg',
  },
  { slug: 'Genre', label: 'Genre', iconSrc: '/icons/genre-icon.svg' },
  { slug: 'Theory', label: 'Theory', iconSrc: '/icons/theory-icon.svg' },
  {
    slug: 'Technique',
    label: 'Technique',
    iconSrc: '/icons/technique-icon.svg',
  },
];

/**
 * Shared tab-navigation for the Learn hub. Writes the same `?tab=<value>`
 * search-param LearnInlet's state machine reads (Home == no param).
 */
const useLearnTabNav = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const activeTab = searchParams.get('tab') ?? '';

  const go = (slug: string) => {
    play('click');
    const next = new URLSearchParams(searchParams);
    if (slug === '') next.delete('tab');
    else next.set('tab', slug);
    setSearchParams(next, { replace: true });
  };

  return { activeTab, go };
};

/**
 * Compact horizontal tab bar (mobile) — keeps the Learn hub navigable on small
 * screens until the full bottom tab bar lands. Hidden on desktop.
 */
export const LearnMobileTabs = () => {
  const { activeTab, go } = useLearnTabNav();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-3 md:hidden">
      {ITEMS.map(({ slug, label, icon: Icon, iconSrc }) => {
        const isActive = activeTab === slug;
        return (
          <button
            key={label}
            type="button"
            onClick={() => go(slug)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              isActive
                ? 'bg-white/10 font-medium text-white'
                : 'text-white/70 hover:bg-white/[0.05] hover:text-white',
            )}
          >
            {iconSrc ? (
              <img
                src={iconSrc}
                alt=""
                draggable={false}
                className={cn(
                  'h-4 w-4',
                  isActive ? 'opacity-100' : 'opacity-70',
                )}
              />
            ) : Icon ? (
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            ) : null}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
