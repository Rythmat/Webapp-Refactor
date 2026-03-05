import { Suspense, useState } from 'react';
import { Outlet } from 'react-router';
import useLocalStorageState from 'use-local-storage-state';
import { cn } from '@/components/utilities';
import { useScrollGradient } from '@/hooks/useScrollGradient';
import { Sidebar } from './Sidebar';

export const DashboardLayout = (props: { fallback?: React.ReactNode }) => {
  const [mainRef, bottomGradientElement, topGradientElement] =
    useScrollGradient({
      topGradientClassName: 'top-1 z-10',
      bottomGradientClassName: 'bottom-8 z-10',
    });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState(
    'state:sidebar_collapsed',
    {
      defaultValue: false,
    },
  );
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="flex w-full flex-1">
        <div
          className={cn(
            'relative shrink-0 transition-all duration-300',
            isSidebarCollapsed ? 'w-20' : 'w-64',
          )}
          onMouseEnter={() => {
            if (isSidebarCollapsed) setIsSidebarHovered(true);
          }}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <Sidebar
            className={cn(
              'transition-all duration-300',
              isSidebarCollapsed && !isSidebarHovered ? 'w-20' : 'w-64',
              isSidebarCollapsed &&
                isSidebarHovered &&
                'absolute inset-y-0 left-0 z-50 shadow-2xl',
            )}
            isCollapsed={isSidebarCollapsed && !isSidebarHovered}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        <main
          ref={mainRef}
          className="flex size-full max-h-screen flex-1 p-4 pl-0"
        >
          <div className="relative flex-1 overflow-auto rounded-xl bg-surface-box p-8">
            <Suspense fallback={props.fallback}>
              <Outlet />
            </Suspense>
            {bottomGradientElement}
            {topGradientElement}
          </div>
        </main>
      </div>
    </div>
  );
};
