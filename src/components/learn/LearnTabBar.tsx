import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { InstrumentSelector } from '@/components/ClassroomLayout/dashboard/InstrumentSelector';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';

interface Tab {
  slug: string; // ?tab= value this tab activates
  label: string;
}

const TABS: Tab[] = [
  { slug: 'Songs', label: 'Songs' },
  { slug: 'Genre', label: 'Genre' },
  { slug: 'Theory', label: 'Theory' },
  { slug: 'Technique', label: 'Technique' },
  { slug: 'WorldHarmony', label: 'World Harmony' },
];

/**
 * The Learn hub's tab bar — one inline row shown at the top of every Learn tab:
 * the "Learn" heading (which links back to the Learn Home), the five sub-tab
 * links (Songs / Genre / Theory / Technique / World Harmony), and the
 * InstrumentSelector. The
 * sub-tabs are plain text at the same size as the "Learn" heading (no pill
 * chrome or highlight) and navigate via the `?tab=` param LearnInlet reads.
 * Guitar has no Technique lessons yet, so its Technique tab is hidden.
 */
export const LearnTabBar = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const active = params.get('tab') ?? '';
  const instrument = useLearnInstrument();
  const tabs =
    instrument === 'guitar' ? TABS.filter((t) => t.slug !== 'Technique') : TABS;

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
      {tabs.map(({ slug, label }) => (
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

      {/* Instrument selector, pushed to the far right. Songs serve both
          instruments, so switching there stays put; elsewhere it opens a tab
          with that instrument's lessons: guitar lives in Theory; piano stays
          on Theory, or else opens Technique. */}
      <div className="ml-auto">
        <InstrumentSelector
          onChange={(next) => {
            if (active === 'Songs') return;
            const tab =
              next === 'guitar' || active === 'Theory' ? 'Theory' : 'Technique';
            if (active !== tab) navigate(`?tab=${tab}`);
          }}
        />
      </div>
    </div>
  );
};
