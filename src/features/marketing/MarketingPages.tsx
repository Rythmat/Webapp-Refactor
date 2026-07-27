import { lazy } from 'react';
import { MarketingRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { MarketingLayout } from './MarketingLayout';

const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })),
);
const LearnPage = lazy(() =>
  import('./pages/LearnPage').then((m) => ({ default: m.LearnPage })),
);
const ArcadePage = lazy(() =>
  import('./pages/ArcadePage').then((m) => ({ default: m.ArcadePage })),
);
const GlobePage = lazy(() =>
  import('./pages/GlobePage').then((m) => ({ default: m.GlobePage })),
);
const TeachersPage = lazy(() =>
  import('./pages/TeachersPage').then((m) => ({ default: m.TeachersPage })),
);
const BlogPage = lazy(() =>
  import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })),
);

/**
 * Public marketing pages. A pathless layout route (shared nav + footer via
 * `MarketingLayout`) wrapped in `<AppContext>` only — no `ProtectedPage`, so
 * these render for logged-out and logged-in visitors alike.
 */
export const marketingPages = () => {
  return {
    element: (
      <AppContext>
        <MarketingLayout />
      </AppContext>
    ),
    children: [
      { path: MarketingRoutes.studio.definition, element: <StudioPage /> },
      { path: MarketingRoutes.learn.definition, element: <LearnPage /> },
      { path: MarketingRoutes.arcade.definition, element: <ArcadePage /> },
      { path: MarketingRoutes.globe.definition, element: <GlobePage /> },
      { path: MarketingRoutes.blog.definition, element: <BlogPage /> },
      { path: MarketingRoutes.teachers.definition, element: <TeachersPage /> },
    ],
  };
};
