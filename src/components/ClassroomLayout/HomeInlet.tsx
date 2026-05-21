import { useNavigate } from 'react-router';
import { getChordScales } from '@/components/learn/chordScaleData';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import { useProgressSummary } from '@/hooks/data';
import { type PrismModeSlug } from '@/hooks/data/prism';
import { useUISound } from '@/hooks/useUISound';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { ChallengesCard } from './dashboard/ChallengesCard';
import { HoneycombCarousel } from './dashboard/HoneycombCarousel';
import { QuickStartCard } from './dashboard/QuickStartCard';
import { RecentProjects, type RecentProject } from './dashboard/RecentProjects';
import { XpCalendar } from './dashboard/XpCalendar';

const BANNER_SLIDES: string[] = [
  '/backgrounds/banner1.svg',
  '/backgrounds/banner2.svg',
  '/backgrounds/banner3.svg',
  '/backgrounds/banner4.svg',
];

const SAMPLE_PROJECTS: RecentProject[] = [
  {
    title: 'Untitled 1',
    artist: 'Artist Name',
    icon: '/icons/file-icon-1.svg',
  },
  {
    title: 'Untitled 2',
    artist: 'Artist Name',
    icon: '/icons/file-icon-2.svg',
  },
  {
    title: 'Untitled 1',
    artist: 'Artist Name',
    icon: '/icons/file-icon-1.svg',
  },
  {
    title: 'Untitled 2',
    artist: 'Artist Name',
    icon: '/icons/file-icon-2.svg',
  },
];

export const HomeInlet = () => {
  const navigate = useNavigate();
  const { play } = useUISound();
  const { data: progressSummary } = useProgressSummary(true);

  const latestContinue = (() => {
    const latest = progressSummary?.lessons?.find(
      (l) =>
        l.lessonId.startsWith('mode-lesson-flow') &&
        !!l.mode &&
        !!l.root &&
        (l.completedCount ?? 0) > 0,
    );
    if (!latest?.mode || !latest.root) return null;
    const mode = latest.mode;
    const root = latest.root;
    return {
      modeTitle: getChordScales(mode as PrismModeSlug)?.modeName ?? mode,
      rootTitle: urlParamToKeyLabel(root),
      route: LearnRoutes.lesson({
        mode: mode as PrismModeSlug,
        key: keyLabelToUrlParam(root),
      }),
    };
  })();

  return (
    <div
      className="flex h-full flex-col"
      style={{ padding: 'clamp(0.5rem, 0.75vw, 1rem)' }}
    >
      <div className="relative min-h-0 flex-[3]">
        <HoneycombCarousel slides={BANNER_SLIDES} />
        <div
          className="absolute bottom-11 left-5"
          style={{ width: 'min(36rem, 30%)' }}
        >
          <QuickStartCard
            onContinue={() => {
              play('click');
              navigate(latestContinue?.route ?? LearnRoutes.root.definition);
            }}
            onNewSession={() => {
              play('click');
              navigate(StudioRoutes.root.definition);
            }}
          />
        </div>
      </div>

      <div style={{ height: 'clamp(0.5rem, 1vw, 1rem)', flexShrink: 0 }} />

      <div
        className="grid min-h-0 flex-[2] grid-cols-1 lg:grid-cols-3"
        style={{ gap: 'clamp(0.75rem, 1.3vw, 1.5rem)' }}
      >
        <XpCalendar />
        <RecentProjects projects={SAMPLE_PROJECTS} />
        <ChallengesCard />
      </div>
    </div>
  );
};
