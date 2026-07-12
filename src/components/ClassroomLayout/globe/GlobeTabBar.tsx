import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { AtlasRoutes } from '@/constants/routes';

interface Tab {
  slug: string; // matches ?tab=; 'Explore' is the default (no param) view
  label: string;
  to: string;
}

const TABS: Tab[] = [
  { slug: 'Explore', label: 'Explore', to: AtlasRoutes.globe() },
  { slug: 'Regions', label: 'Regions & Cities', to: '?tab=Regions' },
  { slug: 'Pathways', label: 'Pathways', to: '?tab=Pathways' },
  { slug: 'Eras', label: 'Eras', to: '?tab=Eras' },
  { slug: 'Instruments', label: 'Instruments', to: '?tab=Instruments' },
];

/**
 * The Globe dashboard's tab bar — one inline row (mirrors StudioTabBar): the
 * "Globe" heading (links back to the default dashboard view), then Explore /
 * Pathways / Eras / Instruments as plain text links at the heading's
 * size. "Explore" opens the full interactive 3D globe at `/atlas/globe`; the
 * rest switch the in-page view via the `?tab=` param GlobeInlet reads.
 */
export const GlobeTabBar = () => {
  const [params] = useSearchParams();
  const active = params.get('tab') ?? '';
  // "Explore" links out to the full globe (/atlas/globe), so it is never the
  // current in-page tab; the `?tab=` views highlight when selected.
  const isActive = (slug: string) => slug !== 'Explore' && active === slug;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Globe heading — also the way back to the default Explore view. */}
      <Link
        to={AtlasRoutes.root.definition}
        className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
      >
        <img
          src="/icons/globe-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">Globe</h2>
      </Link>

      {/* Tabs — plain text links at the same size as the "Globe" heading. */}
      {TABS.map(({ slug, label, to }) => (
        <Link
          key={slug}
          to={to}
          aria-label={`Open ${label}`}
          aria-current={isActive(slug) ? 'page' : undefined}
          className={cn(
            'text-xl font-medium transition-colors md:text-2xl',
            isActive(slug) ? 'text-white' : 'text-white/55 hover:text-white',
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
};
