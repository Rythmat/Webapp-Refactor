import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { StudioRoutes } from '@/constants/routes';

interface Tab {
  slug: string; // matches ?tab= for view tabs; 'Project' is an action, never active
  label: string;
  to: string;
}

// Project jumps straight to a blank editor; the rest switch the ?tab= view.
const TABS: Tab[] = [
  {
    slug: 'Project',
    label: 'Project',
    to: `${StudioRoutes.editor.definition}?new=1`,
  },
  { slug: 'Library', label: 'Library', to: '?tab=Library' },
  { slug: 'Templates', label: 'Templates', to: '?tab=Templates' },
  { slug: 'Demos', label: 'Demos', to: '?tab=Demos' },
];

/**
 * The Studio dashboard's tab bar — one inline row (mirrors LearnTabBar): the
 * "Studio" heading (which links back to the default dashboard), then Project /
 * Library / Templates / Demos as plain text links at the same size as the
 * heading (no pill chrome or highlight). "Project" opens a blank editor; the
 * others switch the in-page view via the `?tab=` param StudioInlet reads.
 */
export const StudioTabBar = () => {
  const [params] = useSearchParams();
  const active = params.get('tab') ?? '';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Studio heading — also the way back to the default dashboard. */}
      <Link
        to={StudioRoutes.root.definition}
        aria-current={active === '' ? 'page' : undefined}
        className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
      >
        <img
          src="/icons/studio-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">Studio</h2>
      </Link>

      {/* Tabs — plain text links at the same size as the "Studio" heading. */}
      {TABS.map(({ slug, label, to }) => (
        <Link
          key={slug}
          to={to}
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
    </div>
  );
};
