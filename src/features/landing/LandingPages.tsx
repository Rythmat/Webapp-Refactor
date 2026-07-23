import { LandingRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { LandingGate } from './LandingGate';

/**
 * Public landing route factory (Phase 2). Mirrors the legal-pages pattern:
 * wrapped in `<AppContext>` only — NO `ProtectedPage` — so it renders for
 * logged-out visitors. Mounted at `/`.
 */
export const landingPages = () => {
  return {
    path: LandingRoutes.root.definition,
    element: (
      <AppContext>
        <LandingGate />
      </AppContext>
    ),
  };
};
