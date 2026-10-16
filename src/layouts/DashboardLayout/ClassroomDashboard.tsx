import { Suspense, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { MobileChordNotationBar } from '@/components/ClassroomLayout/ChordNotationSwitcher';
import { TopRail } from '@/components/ClassroomLayout/TopRail';
import { cn } from '@/components/utilities';
import { DawSkeleton } from '@/daw/shell/DawSkeleton';
import { useProgressBootstrap } from '@/hooks/data';
import { useStampEarnedAwards } from '@/hooks/data/useAwards';
import { useStreakPing } from '@/hooks/data/useStreak';
import { useChallengeWatcher } from '@/hooks/useChallengeWatcher';
import { ClassroomSidebar } from './ClassroomSidebar';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useProgressBootstrap();
  useChallengeWatcher();
  useStreakPing();
  useStampEarnedAwards();

  // Only the DAW editor (`/studio/editor`) needs the full-viewport, no-scroll
  // treatment; the `/studio` Studio Dashboard is a normal scrollable inlet.
  // It is also in focus mode (owner decision 7): no sidebar, TopRail or
  // chord-notation bar, so a Chromebook gives the editor the whole window.
  // Its own top bar has Back to Studio and an avatar menu with the stats.
  const isStudioEditor = pathname.startsWith('/studio/editor');

  return (
    <div className="dashboard-root flex h-screen w-full overflow-hidden">
      {isStudioEditor ? null : (
        <ClassroomSidebar className="hidden flex-shrink-0 md:flex" />
      )}

      <main
        ref={mainRef}
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        {isStudioEditor ? null : (
          <>
            <TopRail />
            <MobileChordNotationBar />
          </>
        )}
        <div
          className={cn(
            'relative flex-1 min-w-0',
            isStudioEditor
              ? 'flex flex-col min-h-0 overflow-hidden'
              : 'overflow-y-auto overflow-x-hidden rounded-xl bg-[#101012] p-2',
          )}
        >
          {/* The editor shows its own shape while its chunk loads (1.12a). */}
          <Suspense
            fallback={isStudioEditor ? <DawSkeleton /> : props.fallback}
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};
