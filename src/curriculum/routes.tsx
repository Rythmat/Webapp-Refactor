/**
 * Curriculum route configuration.
 *
 * Uses the same ClassroomDashboard layout as Learn Theory pages
 * so curriculum pages get sidebar, auth protection, and identical UI.
 */

import { useParams } from 'react-router-dom';
import { FundamentalsLessonContainer } from '@/components/learn/FundamentalsLessonContainer';
import { FundamentalsOverview } from '@/components/learn/FundamentalsOverview';
import { GenreLessonContainer } from '@/components/learn/GenreLessonContainer';
import { GenreOverview } from '@/components/learn/GenreOverview';
import { CurriculumRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';

const GenreOverviewRoute = () => {
  const { genre } = useParams<{ genre: string }>();
  if (genre === 'piano-fundamentals') {
    return <FundamentalsOverview />;
  }
  return <GenreOverview genreSlug={genre ?? ''} />;
};

const FundamentalsLessonRoute = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  return <FundamentalsLessonContainer sectionId={sectionId ?? '1'} />;
};

const GenreLessonRoute = () => {
  const { genre, level } = useParams<{ genre: string; level: string }>();
  return (
    <GenreLessonContainer
      genreSlug={genre ?? ''}
      level={parseInt(level ?? '1')}
    />
  );
};

/**
 * Returns curriculum route configuration for the app router.
 * Wraps with ClassroomDashboard — identical layout to learnPages().
 */
export function curriculumPages() {
  return {
    path: CurriculumRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: CurriculumRoutes.fundamentalsSection.definition,
        element: <FundamentalsLessonRoute />,
      },
      {
        path: CurriculumRoutes.genre.definition,
        element: <GenreOverviewRoute />,
      },
      {
        path: CurriculumRoutes.genreLevel.definition,
        element: <GenreLessonRoute />,
      },
    ],
  };
}
