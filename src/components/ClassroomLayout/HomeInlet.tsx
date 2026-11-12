/**
 * Home Dashboard — being rebuilt from scratch (started 2026-10-23).
 * The side rail (ClassroomSidebar) and top rail (TopRail) live in
 * ClassroomDashboard. The previous sections (AnnouncementsRow, WelcomeHeader,
 * QuickStartSection, RecentActivitySection, ChallengesCard, PathwaysSection,
 * SongsSection, GlobeSection, DashboardFooter) are still in ./dashboard/ —
 * unmounted, not deleted. So is ./home/HomeSongsRow; the Catalog
 * (learn/GenreCatalogRow) moved to Learn's Genre page, then came off it too
 * (owner 2026-10-26).
 */
import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { PerStudent } from '@/components/ui/PerStudent';
import { useWelcomeRedirect } from '@/features/welcome/useWelcomeGate';
import { HomeGlobeArc } from './home/HomeGlobeArc';
import { HomeGlow } from './home/HomeGlow';
import { HomePromptBar } from './home/HomePromptBar';
import { HomeSearchPill } from './home/HomeSearchPill';
import { StudioPreviewCard } from './home/StudioPreviewCard';

const HomeProgressColumn = lazy(() =>
  import('@/components/learn/dashboard/ProgressColumn').then((m) => ({
    default: m.HomeProgressColumn,
  })),
);
// The Library row reads the Studio's draft store: its own chunk too.
const HomeLibraryShelf = lazy(() =>
  import('@/features/library/home/HomeLibraryShelf').then((m) => ({
    default: m.HomeLibraryShelf,
  })),
);
const LearnDiscoverColumns = lazy(() =>
  import('@/components/learn/dashboard/LearnDiscoverColumns').then((m) => ({
    default: m.LearnDiscoverColumns,
  })),
);

export const HomeInlet = () => {
  // A first visit asks what they want from Learn (owner, 2026-11-04).
  const welcome = useWelcomeRedirect();
  if (welcome) return <Navigate replace to={welcome} />;
  return (
    <div className="flex min-h-full w-full flex-col">
      {/* `isolate`, so the glow's -z-10 puts it behind everything here but
        still in front of the panel's background. */}
      <div className="relative isolate flex w-full flex-col items-center px-4 pt-[clamp(3rem,12vh,8.75rem)] pb-10 md:px-10">
        {/* The glow across the top of the page: two complementary key-center
          colors, one in each top corner, slowly shifting. */}
        <HomeGlow />
        {/* Search, top right, where Suno keeps it: 16px in from the
          panel's corner (the scroll area's 8px padding plus top-2). */}
        <div className="absolute right-2 top-2 z-10">
          <HomeSearchPill stopAtId="home-columns" avoidId="home-prompt" />
        </div>
        {/* A tenth smaller than it was, and "Music Atlas" in the top bar once
          the page scrolls (owner, 2026-11-10). */}
        <h1
          data-toolbar-title="Music Atlas"
          className="relative mb-7 text-center text-[clamp(1.8rem,1.26rem+2.16vw,2.925rem)] leading-[1.05] -tracking-wide text-white"
        >
          Play. Create. Explore.
        </h1>
        <HomePromptBar />

        {/* Two columns under the prompt bar, on Suno's grid: a 1064px frame of
          three 24px-gapped columns, 96px below the bar. The left card spans
          Suno's left + middle columns, the right card its third. Stacks when
          the content area is under 42rem (container query, so the sidebar's
          width counts). Left: the Studio preview (opens a blank project);
          right: Progress, this week (owner, 2026-11-11: where the Projects
          card was; the Library row below holds the student's work). */}
        <div
          id="home-columns"
          className="@container mt-24 w-full max-w-[66.5rem]"
        >
          <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-3">
            <div className="@2xl:col-span-2">
              <StudioPreviewCard />
            </div>
            {/* Progress stretches to the Studio card's height. */}
            <div className="flex min-h-0 flex-col [&>*]:flex-1">
              <PerStudent label="Progress" className="h-full">
                <Suspense
                  fallback={
                    <div className="h-full min-h-80 rounded-[1.25rem] bg-[#1c1c1f]" />
                  }
                >
                  <HomeProgressColumn />
                </Suspense>
              </PerStudent>
            </div>
          </div>
        </div>

        {/* The student's Library, Suno home's "New Albums" row (owner,
          2026-11-11): their projects, then their newest sessions in none. */}
        <div className="mt-12 w-full max-w-[66.5rem]">
          <PerStudent label="Library" minHeight={300}>
            <Suspense fallback={<div className="min-h-72" />}>
              <HomeLibraryShelf />
            </Suspense>
          </PerStudent>
        </div>

        {/* Under the Library, in the same frame: Learn, Arcade and Songs,
          in Suno Discover's columns, where the
          instrument picker was (owner, 2026-11-04). Its own chunk: the Learn
          catalog stays off Home's first load. */}
        <div className="mt-12 w-full max-w-[66.5rem]">
          <PerStudent label="Learn">
            <Suspense fallback={<div className="min-h-[30rem]" />}>
              <LearnDiscoverColumns />
            </Suspense>
          </PerStudent>
        </div>

        {/* Under the Learn columns: the Globe, a featured event's influence
          paths on a spinning globe (owner, 2026-10-25), cropped to its cap
          under the landing's rainbow horizon (owner, 2026-11-04). */}
        <div className="mt-12 w-full max-w-[66.5rem]">
          <HomeGlobeArc />
        </div>
      </div>
      {/* Recent activity is Suno's play bar now, across the window under
        the rail and this page (owner, 2026-11-10): ActivityPlayBar, in the
        dashboard. */}
    </div>
  );
};
