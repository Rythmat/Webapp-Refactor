import { Suspense, useRef, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router';
import useLocalStorageState from 'use-local-storage-state';
import { cn } from '@/components/utilities';
import { ClassroomSidebar } from './ClassroomSidebar';

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);


  function useIdsFromPath() {
  const { pathname } = useLocation();
    return useMemo(() => {
      const seg = pathname.split('/').filter(Boolean);
      // Expect: /classrooms/:classroomId[/collections/:collectionId[/lessons/:lessonId]]
      const ids = {
        classroomId: seg[0] === 'classrooms' ? seg[1] : undefined,
        collectionId: seg[2] === 'collections' ? seg[3] : undefined,
        lessonId:     seg[4] === 'lessons'     ? seg[5] : undefined,
      } as const;

      const view: 'home' | 'collection' | 'lesson' =
        ids.lessonId ? 'lesson' : ids.collectionId ? 'collection' : 'home';

      return { ids, view };
    }, [pathname]);
  }

  const { ids, view } = useIdsFromPath();

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
          view={view}
          ids={ids}
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
