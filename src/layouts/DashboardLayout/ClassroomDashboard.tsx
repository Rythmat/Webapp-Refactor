import { Suspense, useRef, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router';
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

  const isStudio = pathname.startsWith('/studio');

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="relative w-20 shrink-0">
          <ClassroomSidebar
            className="w-20"
            ids={ids}
            isCollapsed
            view={view}
          />
        </div>

        <main
          ref={mainRef}
          className="flex min-w-0 flex-1 overflow-hidden pl-0"
        >
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
    </div>
  );
};
