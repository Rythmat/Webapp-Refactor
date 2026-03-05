import { Suspense, useEffect, useRef, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import useLocalStorageState from 'use-local-storage-state';
import { cn } from '@/components/utilities';
import { useProgressBootstrap } from '@/hooks/data';
import { ClassroomSidebar } from './ClassroomSidebar';

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useProgressBootstrap();

  const { ids, view } = useMemo(() => {
    const seg = pathname.split('/').filter(Boolean);
    // Expect: /classrooms/:classroomId[/collections/:collectionId[/lessons/:lessonId]]
    const ids = {
      classroomId: seg[0] === 'classrooms' ? seg[1] : undefined,
      collectionId: seg[2] === 'collections' ? seg[3] : undefined,
      lessonId: seg[4] === 'lessons' ? seg[5] : undefined,
    } as const;

    const view: 'home' | 'collection' | 'lesson' = ids.lessonId
      ? 'lesson'
      : ids.collectionId
        ? 'collection'
        : 'home';

    return { ids, view };
  }, [pathname]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState(
    'state:sidebar_collapsed',
    { defaultValue: false },
  );
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const isStudio = pathname.startsWith('/studio');

  useEffect(() => {
    if (isStudio) {
      setIsSidebarCollapsed(true);
    }
  }, [isStudio, setIsSidebarCollapsed]);

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
          <ClassroomSidebar
            className={cn(
              'transition-all duration-300',
              isSidebarCollapsed && !isSidebarHovered ? 'w-20' : 'w-64',
              isSidebarCollapsed &&
                isSidebarHovered &&
                'absolute inset-y-0 left-0 z-50 shadow-2xl',
            )}
            ids={ids}
            isCollapsed={isSidebarCollapsed && !isSidebarHovered}
            view={view}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        <main ref={mainRef} className="flex w-full flex-1 pl-0">
          <div className="relative flex-1 overflow-auto rounded-xl bg-surface-box p-2">
            <Suspense fallback={props.fallback}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
