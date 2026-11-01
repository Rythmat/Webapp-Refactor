import { Navigate, useParams } from 'react-router-dom';
import { RequirePremium } from '@/components/ui/RequirePremium';
import { LearnRoutes } from '@/constants/routes';
import { useChooseAudio } from '@/features/learn/useInstrumentStore';
import { audioModule } from './catalog';
import { LabLesson } from './lab/LabLesson';

/**
 * /learn/audio/:module/:lesson: a lab, behind its module's gate. One route for
 * all of them, so a new topic needs only the catalog and labPages.ts. Anything
 * else under it goes back to the section.
 */
export function AudioLessonRoute() {
  useChooseAudio();
  const params = useParams<{ module: string; lesson: string }>();
  const module = audioModule(params.module);
  const lesson = module?.lessons.find((l) => l.id === params.lesson);
  if (!module || lesson?.kind !== 'lab') {
    return <Navigate replace to={LearnRoutes.audio()} />;
  }
  const page = <LabLesson module={module} lesson={lesson} />;
  return module.access === 'free' ? (
    page
  ) : (
    <RequirePremium>{page}</RequirePremium>
  );
}
