import { Suspense, useRef} from 'react';
import { Outlet} from 'react-router';
import useLocalStorageState from 'use-local-storage-state';
import { cn } from '@/components/utilities';
import { ClassroomSidebar } from './ClassroomSidebar';

export const GamesDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);


  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState(
    'state:sidebar_collapsed',
    { defaultValue: false },
  );

  return (
    <div className="flex min-h-screen w-screen flex-col">
      <div className="flex w-full flex-1">
        <ClassroomSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            'transition-all duration-300',
            isSidebarCollapsed ? 'w-16' : 'w-64',
          )}
        />

        <main
          ref={mainRef}
          className="flex w-size flex-1 p-4 pl-0"
        >
          <div className="relative flex-1 rounded-xl bg-surface-box p-8">
            <Suspense fallback={props.fallback}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
