import { lazy, Suspense } from 'react';
import { WelcomeRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';

const WelcomePage = lazy(() =>
  import('./WelcomePage').then((m) => ({ default: m.WelcomePage })),
);

/** /welcome: Learn's onboarding, full window, outside the dashboard. */
export const welcomePages = () => ({
  path: WelcomeRoutes.root.definition,
  element: (
    <AppContext>
      <ProtectedPage>
        <Suspense fallback={<div className="min-h-screen bg-[#101012]" />}>
          <WelcomePage />
        </Suspense>
      </ProtectedPage>
    </AppContext>
  ),
});
