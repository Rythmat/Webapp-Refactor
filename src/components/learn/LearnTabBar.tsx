import { Link, useSearchParams } from 'react-router-dom';
import { InstrumentSelector } from '@/components/ClassroomLayout/dashboard/InstrumentSelector';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';

interface Tab {
  slug: string; // ?tab= value this tab activates
  label: string;
}

const TABS: Tab[] = [
  { slug: 'Songs', label: 'Songs' },
  { slug: 'Genre', label: 'Genre' },
  { slug: 'Theory', label: 'Theory' },
  { slug: 'Technique', label: 'Technique' },
];

/**
 * The Learn hub's tab bar — one inline row shown at the top of every Learn tab:
 * the "Learn" heading (which links back to the Learn Home), the four sub-tab
 * links (Songs / Genre / Theory / Technique), and the InstrumentSelector. The
 * sub-tabs are plain text at the same size as the "Learn" heading (no pill
 * chrome or highlight) and navigate via the `?tab=` param LearnInlet reads.
 */
export const LearnTabBar = () => {
  const [params] = useSearchParams();
  const active = params.get('tab') ?? '';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Learn heading — also the way back to the Learn Home. */}
      <Link
        to={LearnRoutes.root()}
        aria-current={active === '' ? 'page' : undefined}
        className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
      >
        <img
          src="/icons/learn-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">Learn</h2>
      </Link>

      {/* Sub-tabs — plain text links at the same size as the "Learn" heading. */}
      {TABS.map(({ slug, label }) => (
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

      {/* Instrument selector, pushed to the far right. */}
      <div className="ml-auto">
        <InstrumentSelector />
      </div>
    </div>
  );
};
