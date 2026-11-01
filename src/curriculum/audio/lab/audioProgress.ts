import { useCallback } from 'react';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import {
  useAwardLessonActivityExperience,
  useAwardLessonCompletionExperience,
} from '@/hooks/data/experience/useAwardExperience';
import { useUpdateActivityProgress } from '@/hooks/data/progress/useUpdateActivityProgress';
import { LAB_STEPS, type LabLesson, type LabStepId } from '../catalog';

// ── A student's progress through the labs ──────────────────────────────────
// Kept on this device first (per user, in the same store as the Studio's
// tutorials), then sent to the server, a step at a time. What the student sees
// reads the device's record, so a step they did always shows as done even if
// the server turns the new ids away. XP is awarded only once the server has
// accepted the step, and losing it is never the student's problem to hear about.

const VERSION = 1;

type Completed = Readonly<Record<string, number>>;

export const audioLessonId = (moduleId: string, lessonId: string) =>
  `audio:${moduleId}:${lessonId}`;

export const audioStepId = (
  moduleId: string,
  lessonId: string,
  topicId: string,
  step: LabStepId,
) => `${audioLessonId(moduleId, lessonId)}:${topicId}:${step}`;

/** Percent of a unit's steps done, across all its topics. */
export function labPercent(
  completedAt: Completed,
  moduleId: string,
  lesson: LabLesson,
): number {
  const done = lesson.topics.flatMap((topic) =>
    LAB_STEPS.filter(
      (step) =>
        completedAt[audioStepId(moduleId, lesson.id, topic.id, step.id)] !=
        null,
    ),
  ).length;
  return Math.round((done / (lesson.topics.length * LAB_STEPS.length)) * 100);
}

/** The first step of a topic still to do, if any. */
export function nextStepIn(
  completedAt: Completed,
  moduleId: string,
  lessonId: string,
  topicId: string,
): LabStepId | null {
  const step = LAB_STEPS.find(
    (s) => completedAt[audioStepId(moduleId, lessonId, topicId, s.id)] == null,
  );
  return step ? step.id : null;
}

/** Where a unit opens: the first step still to do, or, all done, its start. */
export function resumePoint(
  completedAt: Completed,
  moduleId: string,
  lesson: LabLesson,
): { topicId: string; step: LabStepId } {
  for (const topic of lesson.topics) {
    const step = nextStepIn(completedAt, moduleId, lesson.id, topic.id);
    if (step) return { topicId: topic.id, step };
  }
  return { topicId: lesson.topics[0].id, step: LAB_STEPS[0].id };
}

export function useAudioProgress(moduleId: string, lesson: LabLesson) {
  const { mutate: updateProgress } = useUpdateActivityProgress();
  const { mutate: awardStep } = useAwardLessonActivityExperience();
  const { mutate: awardLesson } = useAwardLessonCompletionExperience();

  /** Record a finished step. Doing it again changes nothing and sends nothing. */
  const stepDone = useCallback(
    (topicId: string, step: LabStepId) => {
      const store = useTutorialProgressStore.getState();
      const id = audioStepId(moduleId, lesson.id, topicId, step);
      if (store.isComplete(id)) return;
      store.markComplete(id);
      const lessonId = audioLessonId(moduleId, lesson.id);
      const finishedLesson =
        labPercent(
          useTutorialProgressStore.getState().completedAt,
          moduleId,
          lesson,
        ) === 100;
      updateProgress(
        {
          activityInstanceId: id,
          lessonId,
          lessonVersion: VERSION,
          activityDefId: `${topicId}:${step}`,
          mode: '',
          root: '',
          status: 'COMPLETED',
          attemptsDelta: 1,
        },
        {
          onSuccess: () => {
            awardStep(id);
            if (finishedLesson) awardLesson(lessonId);
          },
        },
      );
    },
    [moduleId, lesson, updateProgress, awardStep, awardLesson],
  );

  const percent = useTutorialProgressStore((s) =>
    labPercent(s.completedAt, moduleId, lesson),
  );

  return { stepDone, percent };
}
