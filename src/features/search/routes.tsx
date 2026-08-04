/**
 * Global search route.
 *
 * Reuses the ClassroomDashboard layout (sidebar + top rail + auth protection),
 * identical to curriculumPages()/learnPages(), and renders the search page as
 * the index child so it shows at exactly `/search`. SearchPage is lazy-loaded
 * (it pulls in the full song dataset) — the shell's <Suspense> covers it.
 */
import { lazy } from 'react';
import { SearchRoutes } from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';

const SearchPage = lazy(() =>
  import('./SearchPage').then(({ SearchPage }) => ({ default: SearchPage })),
);

export function searchPages() {
  return {
    path: SearchRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    // The static index spans both songs and globe events, so neither may be
    // missing when it is built — see sources/staticIndex.ts.
    children: [
      {
        index: true,
        element: (
          <ContentGate needs={['events', 'songs']}>
            <SearchPage />
          </ContentGate>
        ),
      },
    ],
  };
}
