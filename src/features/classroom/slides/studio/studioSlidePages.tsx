import { Suspense, lazy } from 'react';
import { StudioRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';

const SlideStudioPage = lazy(() => import('./SlideStudioPage'));

/**
 * The Studio alone, for a lesson's Group Practice slide (owner, 2026-11-10):
 * no app rail or dashboard. Its own route so the editor's address is the
 * frame's, never the lesson's.
 */
export const studioSlidePages = () => ({
  path: StudioRoutes.slide.definition,
  element: (
    <AppContext>
      <ProtectedPage>
        <Suspense fallback={<div className="h-dvh w-screen bg-black" />}>
          <SlideStudioPage />
        </Suspense>
      </ProtectedPage>
    </AppContext>
  ),
});
