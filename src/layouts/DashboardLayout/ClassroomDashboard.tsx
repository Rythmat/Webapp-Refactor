import { Suspense, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { TopBar } from '@/components/ClassroomLayout/TopBar';
import { cn } from '@/components/utilities';
import { useProgressBootstrap } from '@/hooks/data';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useProgressBootstrap();

  const isStudio = pathname.startsWith('/studio');

  return (
    <div className="dashboard-root flex h-screen w-full flex-col overflow-hidden">
      <TopBar />

      <main ref={mainRef} className="flex min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'relative flex-1',
            isStudio
              ? 'flex flex-col min-h-0 min-w-0 overflow-hidden'
              : 'overflow-auto rounded-xl bg-surface-box p-2',
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
