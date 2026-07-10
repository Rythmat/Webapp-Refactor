import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';

interface SubItem {
  slug: string; // ?tab= value this icon activates
  label: string;
  icon?: LucideIcon;
  iconSrc?: string; // image icon (matches the Home section icons); wins over `icon`
  glyphClassName?: string; // per-item size override for the glyph
}

const ITEMS: SubItem[] = [
  {
    slug: 'Songs',
    label: 'Songs',
    iconSrc: '/icons/popular-releases-icon.svg',
    glyphClassName: 'h-8 w-8',
  },
  { slug: 'Genre', label: 'Genre', iconSrc: '/icons/genre-icon.svg' },
  { slug: 'Theory', label: 'Theory', iconSrc: '/icons/theory-icon.svg' },
  {
    slug: 'Technique',
    label: 'Technique',
    iconSrc: '/icons/technique-icon.svg',
  },
];

const TOOLTIP_CLASS =
  'border border-white/10 bg-black/90 text-sm text-white backdrop-blur';

/**
 * The whole "Learn" cluster in the main sidebar: the Learn parent icon plus its
 * four sub-tabs (Songs/Genre/Theory/Technique), wrapped in one shared panel so
 * it's clear the tabs belong to Learn. The panel chrome + sub-tabs appear only
 * once a specific Learn sub-tab is active — an animated grid-rows accordion, so
 * the icons below slide rather than jump. On the Learn Home hub (and off Learn
 * entirely) it collapses to just the Learn icon; the hub has its own navigation,
 * so the sidebar tabs would only duplicate it there.
 *
 * The Learn icon is also the Home entry, so it takes the active pill on the
 * Learn Home hub (no ?tab); otherwise the pill sits on the active sub-tab. It
 * renders the Learn icon inline (rather than via SidebarMainNavItem) so the icon
 * and its tabs can live inside a single panel <li>.
 */
export const SidebarLearnGroup = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const learnRoot = LearnRoutes.root();
  const inLearn =
    location.pathname === learnRoot ||
    location.pathname.startsWith(`${learnRoot}/`);
  const activeTab = searchParams.get('tab') ?? '';
  const homeActive = inLearn && activeTab === ''; // Learn icon == the Home entry
  // Sub-tabs are secondary nav for the individual Learn areas, so they show only
  // once a specific tab is active — hidden on the Learn Home hub itself, which
  // has its own navigation and would otherwise duplicate it.
  const showTabs = inLearn && activeTab !== '';

  return (
    <li>
      {/* One panel wraps the Learn icon + its sub-tabs; the chrome fades in only
          inside the Learn section. Padding is constant so nothing shifts. */}
      <div
        className={cn(
          'rounded-xl border p-1 transition-colors duration-300 ease-out',
          showTabs
            ? 'border-white/[0.06] bg-white/[0.04]'
            : 'border-transparent bg-transparent',
        )}
      >
        {/* Learn parent icon (also the Home entry) */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={learnRoot}
                aria-label="Learn"
                aria-current={homeActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center justify-center rounded-md py-2.5 outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-white/40',
                  homeActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/85 hover:bg-white/5 hover:text-white',
                )}
              >
                <img
                  src="/icons/learn-icon.svg"
                  alt=""
                  draggable={false}
                  className="h-7 w-7"
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className={TOOLTIP_CLASS}
            >
              Learn
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Sub-tabs — grid-rows 0fr→1fr animates height so items below slide. */}
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out',
            showTabs ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden" aria-hidden={!showTabs}>
            <ul className="flex flex-col gap-1 pt-1">
              {ITEMS.map(
                ({ slug, label, icon: Icon, iconSrc, glyphClassName }, i) => {
                  const isActive = activeTab === slug;
                  return (
                    <li
                      key={slug}
                      className={cn(
                        'transition-all duration-300 ease-out',
                        showTabs
                          ? 'translate-y-0 opacity-100'
                          : '-translate-y-1 opacity-0',
                      )}
                      style={{
                        transitionDelay: showTabs ? `${i * 50}ms` : '0ms',
                      }}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={`${learnRoot}?tab=${slug}`}
                              aria-label={label}
                              aria-current={isActive ? 'page' : undefined}
                              tabIndex={showTabs ? undefined : -1}
                              className={cn(
                                'group flex items-center justify-center rounded-md py-1.5 outline-none transition-colors',
                                'focus-visible:ring-2 focus-visible:ring-white/40',
                                isActive
                                  ? 'bg-white/10 text-white'
                                  : 'text-white/70 hover:bg-white/5 hover:text-white',
                              )}
                            >
                              {iconSrc ? (
                                <img
                                  src={iconSrc}
                                  alt=""
                                  draggable={false}
                                  className={cn(
                                    glyphClassName ?? 'h-6 w-6',
                                    isActive ? 'opacity-100' : 'opacity-80',
                                  )}
                                />
                              ) : Icon ? (
                                <Icon className="h-6 w-6" strokeWidth={1.75} />
                              ) : null}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            sideOffset={12}
                            className={TOOLTIP_CLASS}
                          >
                            {label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  );
                },
              )}
            </ul>
          </div>
        </div>
      </div>
    </li>
  );
};
