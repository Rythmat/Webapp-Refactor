import { Suspense, useEffect } from 'react';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { ContentGate } from '@/content/ContentGate';
import { setStudioLessonDrafts } from '@/curriculum/engine/studioLessons/registry';
import { PremiumPreviewContext } from '@/hooks/PremiumPreviewContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { MirrorRouter } from './MirrorRouter';
import { MirrorRoutes } from './MirrorRoutes';
import { PerStudentPlaceholder } from './segments/PerStudentPlaceholder';

/**
 * The mirrored app's page area: the app's rounded content panel, running the
 * app's own routes.
 *
 * Around it, the console already draws what the app draws around its pages —
 * the app's sidebar (Sidebar.tsx) and, in the XP-bar slot, the edit bar
 * (ContentAreaLayout) — so this panel is exactly the size a student sees.
 *
 * The frame is `.console-mirror`, which console.css exempts from the console's
 * font override, so the app's own type (the chord chart's serif notation
 * included) shows as it does in the app. `.dashboard-root` gives the app's
 * pages the tokens they read.
 */
export const ConsoleMirrorShell = () => {
  // The Studio's lessons count their drafts here, so a lesson saved as a
  // draft opens in the mirror's Studio as a preview before it goes live.
  useEffect(() => {
    setStudioLessonDrafts(true);
    return () => setStudioLessonDrafts(false);
  }, []);
  return (
    <div className="console-mirror dashboard-root flex min-h-0 min-w-0 flex-1">
      <MirrorRouter>
        {/* The admin previews as a premium student, so gated pages show. */}
        <PremiumPreviewContext.Provider value={true}>
          {/* A student's own parts (their projects, their recent activity)
          stand as placeholders: not content, and per-user APIs. */}
          <PerStudentPreviewContext.Provider value={PerStudentPlaceholder}>
            <div className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-[#101012] p-2">
              <Suspense fallback={<DashboardContentSkeleton />}>
                <ContentGate needs={['songs', 'events']}>
                  <MirrorRoutes />
                </ContentGate>
              </Suspense>
            </div>
          </PerStudentPreviewContext.Provider>
        </PremiumPreviewContext.Provider>
      </MirrorRouter>
    </div>
  );
};
