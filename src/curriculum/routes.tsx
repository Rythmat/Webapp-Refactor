/**
 * Curriculum route configuration.
 *
 * Uses the same ClassroomDashboard layout as Learn Theory pages
 * so curriculum pages get sidebar, auth protection, and identical UI.
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FundamentalsLessonContainer } from '@/components/learn/FundamentalsLessonContainer';
import { FundamentalsOverview } from '@/components/learn/FundamentalsOverview';
import { GenreLessonContainer } from '@/components/learn/GenreLessonContainer';
import { GenreOverview } from '@/components/learn/GenreOverview';
import { RequirePremium } from '@/components/ui/RequirePremium';
import { CurriculumRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { GenreCourseOverview } from '@/curriculum/pages/GenreCourseOverview';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivityFlow } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';

const GenreOverviewRoute = () => {
  const { genre } = useParams<{ genre: string }>();
  // Piano Fundamentals is free — everything else requires premium
  if (genre === 'piano-fundamentals') {
    return <FundamentalsOverview />;
  }
  // Rich genre overview for genres with a profile (Funk first)
  const profile = getGenreProfile(genre ?? '');
  if (profile) {
    return (
      <RequirePremium>
        <GenreCourseOverview genreSlug={genre ?? ''} />
      </RequirePremium>
    );
  }
  // Fallback — existing overview for genres without a profile
  return (
    <RequirePremium>
      <GenreOverview genreSlug={genre ?? ''} />
    </RequirePremium>
  );
};

const FundamentalsLessonRoute = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  // Piano Fundamentals sections are free
  return <FundamentalsLessonContainer sectionId={sectionId ?? '1'} />;
};

const GenreLessonRoute = () => {
  const { genre, level } = useParams<{ genre: string; level: string }>();
  const [searchParams] = useSearchParams();
  const genreSlug = genre ?? '';
  const levelNum = parseInt(level ?? '1');
  const initialSection = (searchParams.get('section') ?? 'A') as
    | 'A'
    | 'B'
    | 'C'
    | 'D';
  const [flow, setFlow] = useState<ActivityFlow | null>(null);

  useEffect(() => {
    getActivityFlow(genreSlug, levelNum).then(setFlow);
  }, [genreSlug, levelNum]);

  // V2 flow detection — route to new container
  if (flow && 'version' in flow && (flow as ActivityFlowV2).version === 'v2') {
    return (
      <RequirePremium>
        <GenreLessonContainerV2
          flow={flow as ActivityFlowV2}
          genre={genreSlug}
          level={levelNum}
          initialSection={initialSection}
        />
      </RequirePremium>
    );
  }

  // V1 fallback — existing container
  return (
    <RequirePremium>
      <GenreLessonContainer genreSlug={genreSlug} level={levelNum} />
    </RequirePremium>
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
