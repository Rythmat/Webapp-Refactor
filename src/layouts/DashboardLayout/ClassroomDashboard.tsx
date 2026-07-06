import { Suspense, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { TopRail } from '@/components/ClassroomLayout/TopRail';
import { cn } from '@/components/utilities';
import { useProgressBootstrap } from '@/hooks/data';
import { useChallengeWatcher } from '@/hooks/useChallengeWatcher';
import { ClassroomSidebar } from './ClassroomSidebar';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useProgressBootstrap();
  useChallengeWatcher();

  const isStudio = pathname.startsWith('/studio');

  return (
    <div className="dashboard-root flex h-screen w-full overflow-hidden">
      <ClassroomSidebar className="hidden flex-shrink-0 md:flex" />

      <main
        ref={mainRef}
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        <TopRail />
        <div
          className={cn(
            'relative flex-1 min-w-0',
            isStudio
              ? 'flex flex-col min-h-0 overflow-hidden'
              : 'overflow-y-auto overflow-x-hidden rounded-xl bg-[#101012] p-2',
          )}
        >
          <Suspense fallback={props.fallback}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};
