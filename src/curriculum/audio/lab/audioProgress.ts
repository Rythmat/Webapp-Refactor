import { useCallback } from 'react';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import {
  useAwardLessonActivityExperience,
  useAwardLessonCompletionExperience,
} from '@/hooks/data/experience/useAwardExperience';
import { useUpdateActivityProgress } from '@/hooks/data/progress/useUpdateActivityProgress';
import {
  LAB_STEPS,
  type AudioModule,
  type CourseRow,
  type LabLesson,
  type LabStepId,
} from '../catalog';

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

// ── A guided lesson's progress ─────────────────────────────────────────────
// One id a screen and one for finishing, on the same local-first path. XP is only
// asked for on the takeaway and the skill check, and once for the whole lesson:
// the backend sets the amounts, and a tap through ten screens shouldn't count ten.

// Keyed by the whole lesson's id (`audio:<module>:<lesson>`, or another
// course's, such as `piano:fundamentals:<lesson>`), so any course on the
// guided player keeps its progress the same way.

/** A guided screen's id, under its lesson's. */
export const lessonScreenId = (lessonKey: string, screenId: string) =>
  `${lessonKey}:${screenId}`;

/** The id that marks a guided lesson finished. */
export const lessonDoneId = (lessonKey: string) =>
  lessonScreenId(lessonKey, 'done');

/** The first screen still to do, or the start once all are done. */
export function lessonResumeIndex(
  completedAt: Completed,
  lessonKey: string,
  screenIds: readonly string[],
): number {
  if (completedAt[lessonDoneId(lessonKey)] != null) return 0;
  const index = screenIds.findIndex(
    (id) => completedAt[lessonScreenId(lessonKey, id)] == null,
  );
  return index < 0 ? 0 : index;
}

/** Percent of a guided lesson done, for a course page that hasn't its script. */
export function lessonPercent(
  completedAt: Completed,
  lessonKey: string,
  screens: number,
): number {
  if (completedAt[lessonDoneId(lessonKey)] != null) return 100;
  const prefix = `${lessonKey}:`;
  // A screen's id has nothing after it. Anything longer is a step from when this
  // lesson was a lab, which doesn't count towards its screens.
  const done = Object.keys(completedAt).filter(
    (id) => id.startsWith(prefix) && !id.slice(prefix.length).includes(':'),
  ).length;
  return Math.min(99, Math.round((done / Math.max(1, screens)) * 100));
}

export const guidedScreenId = (
  moduleId: string,
  lessonId: string,
  screenId: string,
) => lessonScreenId(audioLessonId(moduleId, lessonId), screenId);

export const guidedDoneId = (moduleId: string, lessonId: string) =>
  lessonDoneId(audioLessonId(moduleId, lessonId));

/** The first screen still to do, or the start once all are done. */
export const guidedResumeIndex = (
  completedAt: Completed,
  moduleId: string,
  lessonId: string,
  screenIds: readonly string[],
): number =>
  lessonResumeIndex(completedAt, audioLessonId(moduleId, lessonId), screenIds);

/** Percent of a guided lesson done, for a course page that hasn't its script. */
export const guidedPercent = (
  completedAt: Completed,
  moduleId: string,
  lessonId: string,
  screens: number,
): number =>
  lessonPercent(completedAt, audioLessonId(moduleId, lessonId), screens);

/** A stop on a course's path, as a percent. Anatomy records no progress. */
export function rowPercent(
  completedAt: Completed,
  module: AudioModule,
  row: CourseRow,
): number {
  if (row.kind === 'guided') {
    return guidedPercent(
      completedAt,
      module.id,
      row.lesson.id,
      row.lesson.screens,
    );
  }
  if (row.kind === 'lab') {
    return labPercent(completedAt, module.id, {
      ...row.lesson,
      topics: [row.topic],
    });
  }
  return 0;
}

/** A guided lesson's progress, by its whole id (`audio:<module>:<lesson>`). */
export function useGuidedProgress(lessonKey: string) {
  const { mutate: updateProgress } = useUpdateActivityProgress();
  const { mutate: awardStep } = useAwardLessonActivityExperience();
  const { mutateAsync: awardLesson } = useAwardLessonCompletionExperience();

  const screenDone = useCallback(
    (screenId: string, attempts: number, earnsXp: boolean) => {
      const store = useTutorialProgressStore.getState();
      const id = lessonScreenId(lessonKey, screenId);
      if (store.isComplete(id)) return;
      store.markComplete(id);
      updateProgress(
        {
          activityInstanceId: id,
          lessonId: lessonKey,
          lessonVersion: VERSION,
          activityDefId: screenId,
          mode: '',
          root: '',
          status: 'COMPLETED',
          attemptsDelta: Math.max(1, attempts),
        },
        {
          onSuccess: () => {
            if (earnsXp) awardStep(id);
          },
        },
      );
    },
    [lessonKey, updateProgress, awardStep],
  );

  /**
   * Record the lesson as finished. Resolves to the XP really awarded, or null if
   * none came back in time: the finish screen never shows a number that isn't so.
   */
  const finish = useCallback(async (): Promise<number | null> => {
    const store = useTutorialProgressStore.getState();
    const id = lessonDoneId(lessonKey);
    if (store.isComplete(id)) return null;
    store.markComplete(id);
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 1500);
    });
    const award = awardLesson(lessonKey).then(
      (result) =>
        result.awarded && result.awardedExperience > 0
          ? result.awardedExperience
          : null,
      () => null,
    );
    return Promise.race([award, timeout]);
  }, [lessonKey, awardLesson]);

  return { screenDone, finish };
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
