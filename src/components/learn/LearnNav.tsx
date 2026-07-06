import { BookOpen, LayoutGrid, Music, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { useUISound } from '@/hooks/useUISound';

interface NavItem {
  slug: string; // empty string == Songs default (no ?tab= param)
  label: string;
  icon: typeof Music;
}

const ITEMS: NavItem[] = [
  { slug: '', label: 'Songs', icon: Music },
  { slug: 'Genre', label: 'Genre', icon: LayoutGrid },
  { slug: 'Theory', label: 'Theory', icon: BookOpen },
  { slug: 'Technique', label: 'Technique', icon: Sparkles },
];

/**
 * Secondary left-rail for the Learn hub. Replaces the horizontal pill bar
 * that used to render inside LearnSubheader. Writes the same `?tab=<value>`
 * search-param so LearnInlet's downstream state machine is unchanged.
 */
export const LearnNav = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const activeTab = searchParams.get('tab') ?? '';

  const handleClick = (slug: string) => {
    play('click');
    const next = new URLSearchParams(searchParams);
    if (slug === '') next.delete('tab');
    else next.set('tab', slug);
    setSearchParams(next, { replace: true });
  };

  return (
    <nav
      aria-label="Learn navigation"
      className="hidden w-[240px] flex-shrink-0 flex-col gap-6 border-r border-white/[0.06] p-6 md:flex"
    >
      <div className="flex flex-col gap-1.5">
        <div className="px-3 text-xs uppercase tracking-wider text-white/50">
          Sections
        </div>
        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const isActive = activeTab === item.slug;
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => handleClick(item.slug)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                    isActive
                      ? 'bg-white/5 font-medium text-white'
                      : 'text-white/80 hover:bg-white/[0.03] hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
