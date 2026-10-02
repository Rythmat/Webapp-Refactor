import { Suspense } from 'react';
import { ContentGate } from '@/content/ContentGate';
import { PremiumPreviewContext } from '@/hooks/PremiumPreviewContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { MirrorRouter } from './MirrorRouter';
import { MirrorRoutes } from './MirrorRoutes';

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
export const ConsoleMirrorShell = () => (
  <div className="console-mirror dashboard-root flex min-h-0 min-w-0 flex-1">
    <MirrorRouter>
      {/* The admin previews as a premium student, so gated pages show. */}
      <PremiumPreviewContext.Provider value={true}>
        <div className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-[#101012] p-2">
          <Suspense fallback={<DashboardContentSkeleton />}>
            <ContentGate needs={['songs', 'events']}>
              <MirrorRoutes />
            </ContentGate>
          </Suspense>
        </div>
      </PremiumPreviewContext.Provider>
    </MirrorRouter>
  </div>
);
