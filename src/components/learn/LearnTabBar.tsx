import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { InstrumentSelector } from '@/components/ClassroomLayout/dashboard/InstrumentSelector';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { START_HERE_TAB } from '@/curriculum/musicLiteracy/literacyPath';
import {
  isLearnTab,
  learnTabOfPath,
  learnTabRoute,
} from '@/features/learn/learnPaths';
import {
  learnPageRoute,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { CompassTourButton } from '@/features/learnTour/CompassTourButton';

interface Tab {
  slug: string; // ?tab= value this tab activates
  label: string;
}

/** The heading's name for each instrument, as Home's instrument row calls it. */
const INSTRUMENT_HEADINGS: Record<LearnInstrument, string> = {
  piano: 'Keyboard',
  guitar: 'Guitar',
  bass: 'Bass',
  ukulele: 'Ukulele',
};

const TABS: Tab[] = [
  // First: the path a beginner (or a class) starts on, on either instrument.
  { slug: START_HERE_TAB, label: 'Start Here' },
  { slug: 'Songs', label: 'Songs' },
  { slug: 'Genre', label: 'Genre' },
  { slug: 'Theory', label: 'Theory' },
  { slug: 'Technique', label: 'Technique' },
  { slug: 'WorldHarmony', label: 'World Harmony' },
];

/**
 * The Learn hub's tab bar — one inline row shown at the top of every Learn tab:
 * the "Learn" heading (which links back to the Learn Home), the six sub-tab
 * links (Start Here / Songs / Genre / Theory / Technique / World Harmony), and
 * the InstrumentSelector. The
 * sub-tabs are plain text at the same size as the "Learn" heading (no pill
 * chrome or highlight) and navigate via the `?tab=` param LearnInlet reads.
 * Guitar has no Technique lessons yet, so its Technique tab is hidden.
 *
 * `only` keeps just those tabs (by slug), on either instrument, and `extras={false}` drops the tour
 * button and the InstrumentSelector: the Learn page shows Learn, Songs,
 * Genre, Theory and Technique alone (owner, 2026-10-24). `instrumentHeading`
 * shows the heading's icon alone, its name (the chosen instrument: Keyboard,
 * Guitar) for screen readers only, and opens that instrument's Learn page;
 * its tabs are then that instrument's tab pages, /learn/keyboard/songs…
 * (owner, 2026-10-24).
 */
export const LearnTabBar = ({
  only,
  extras = true,
  instrumentHeading = false,
  current,
}: {
  only?: readonly string[];
  extras?: boolean;
  instrumentHeading?: boolean;
  /** The tab to show as current when the path isn't a tab's (Set Lists,
   *  under Songs). */
  current?: string;
} = {}) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const instrument = useLearnInstrument();
  // On the Learn page each tab is a path (/learn/keyboard/songs); the hub
  // reads ?tab=.
  const active =
    current ??
    (instrumentHeading
      ? (learnTabOfPath(pathname) ?? '')
      : (params.get('tab') ?? ''));
  const tabTo = (slug: string) =>
    instrumentHeading && isLearnTab(slug)
      ? learnTabRoute(instrument, slug)
      : `?tab=${slug}`;
  // A bar given its tabs (`only`: the Learn page) shows just those. Both
  // instruments have Technique (guitar's Harmonics, 2026-10-27).
  const tabs = only ? TABS.filter((t) => only.includes(t.slug)) : TABS;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Learn heading — also the way back to the Learn Home. */}
      <div className="flex items-center gap-1">
        <Link
          to={
            instrumentHeading ? learnPageRoute(instrument) : LearnRoutes.root()
          }
          aria-current={active === '' ? 'page' : undefined}
          className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
        >
          <img
            src="/icons/learn-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          {/* With `instrumentHeading`, the icon alone shows (owner,
            2026-10-24); the name stays for screen readers. */}
          <h2
            className={cn(
              'text-xl font-medium text-white md:text-2xl',
              instrumentHeading && 'sr-only',
            )}
          >
            {instrumentHeading ? INSTRUMENT_HEADINGS[instrument] : 'Learn'}
          </h2>
        </Link>
      </div>

      {/* Sub-tabs — plain text links at the same size as the "Learn" heading. */}
      {/* Bass teaches Theory alone so far (The Bass Atlas); ukulele Theory
          and Songs (its chord boxes). */}
      {tabs
        .filter((t) =>
          instrument === 'bass'
            ? t.slug === 'Theory'
            : instrument === 'ukulele'
              ? t.slug === 'Theory' || t.slug === 'Songs'
              : true,
        )
        .map(({ slug, label }) => (
          <Link
            key={slug}
            to={tabTo(slug)}
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

      {/* The tour of the page it's on (the whole of Learn on the dashboard). */}
      {extras && <CompassTourButton />}

      {/* Instrument selector, pushed to the far right. Start Here and Songs
          serve both instruments, so switching there stays put, as do Theory
          and Technique (both have each); elsewhere it opens guitar's Theory
          or piano's Technique. */}
      {extras && (
        <div className="ml-auto">
          <InstrumentSelector
            onChange={(next) => {
              if (active === 'Songs' || active === START_HERE_TAB) return;
              const tab =
                active === 'Theory' ||
                (next === 'guitar' && active !== 'Technique')
                  ? 'Theory'
                  : 'Technique';
              if (active !== tab) navigate(`?tab=${tab}`);
            }}
          />
        </div>
      )}
    </div>
  );
};
