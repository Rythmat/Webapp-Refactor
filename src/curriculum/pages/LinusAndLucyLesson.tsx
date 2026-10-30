import { useMemo } from 'react';
import { LearnRoutes } from '@/constants/routes';
import { buildLinusAndLucyFlow } from '@/curriculum/data/activityFlows/linusAndLucy';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import { learnTabRoute } from '@/features/learn/learnPaths';

/** The trial song lesson: DEV only (see data/activityFlows/linusAndLucy.ts). */
export default function LinusAndLucyLesson() {
  const flow = useMemo(() => buildLinusAndLucyFlow(), []);
  return (
    <GenreLessonContainerV2
      flow={flow}
      genre="linus-and-lucy"
      level={1}
      displayName="Linus and Lucy"
      overviewRoute={learnTabRoute('piano', 'Technique')}
      // Back to this lesson: it is no genre course's level.
      practiceReturnTo={() => LearnRoutes.linusAndLucy()}
    />
  );
}
