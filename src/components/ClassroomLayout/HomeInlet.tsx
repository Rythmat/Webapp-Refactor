/**
 * Home Dashboard — being rebuilt from scratch (started 2026-10-23).
 * The side rail (ClassroomSidebar) and top rail (TopRail) live in
 * ClassroomDashboard. The previous sections (AnnouncementsRow, WelcomeHeader,
 * QuickStartSection, RecentActivitySection, ChallengesCard, PathwaysSection,
 * SongsSection, GlobeSection, DashboardFooter) are still in ./dashboard/ —
 * unmounted, not deleted.
 */
import { ActivityRail } from './home/ActivityRail';
import { HomeCatalogRow } from './home/HomeCatalogRow';
import { HomeGlow } from './home/HomeGlow';
import { HomePromptBar } from './home/HomePromptBar';
import { HomeSongsRow } from './home/HomeSongsRow';
import { InstrumentLessonsCard } from './home/InstrumentLessonsCard';
import { StudioPreviewCard } from './home/StudioPreviewCard';

export const HomeInlet = () => {
  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="relative flex w-full flex-col items-center px-4 pt-[clamp(48px,12vh,140px)] pb-10 md:px-10">
        {/* The hero glow: two complementary key-center colors, slowly shifting. */}
        <HomeGlow />
        <h1 className="relative mb-7 text-center text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.05] -tracking-wide text-white">
          Play. Create. Explore.
        </h1>
        <HomePromptBar />

        {/* Two columns under the prompt bar, on Suno's grid: a 1064px frame of
          three 24px-gapped columns, 96px below the bar. The left card spans
          Suno's left + middle columns, the right card its third. Stacks when
          the content area is under 42rem (container query, so the sidebar's
          width counts). Left: the Studio preview (opens a blank project); right:
          the student's instrument picker. */}
        <div className="@container mt-24 w-full max-w-[1064px]">
          <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-3">
            <div className="@2xl:col-span-2">
              <StudioPreviewCard />
            </div>
            <InstrumentLessonsCard />
          </div>
        </div>

        {/* Under the columns, in the same frame: the songs, scrolled by hand. */}
        <div className="mt-12 w-full max-w-[1064px]">
          <HomeSongsRow />
        </div>

        {/* Under the songs: the Catalog, the genres Learn teaches, styled
          after Suno's Curated Collections. */}
        <div className="mt-12 w-full max-w-[1064px]">
          <HomeCatalogRow />
        </div>
      </div>
      {/* Pinned to the bottom, like Suno's player bar: where you left off,
        cycling through your recent activity. The negative margins and the
        -8px stick take it to the panel's edges, past the scroll area's
        8px padding. */}
      <div className="sticky -bottom-2 z-20 -mx-2 -mb-2 mt-auto">
        <ActivityRail />
      </div>
    </div>
  );
};
