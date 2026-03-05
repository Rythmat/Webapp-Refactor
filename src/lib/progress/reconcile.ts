import type {
  LessonProgressEntry,
  LessonProgressResponse,
  ProgressSummaryResponse,
} from './types';

const ts = (value?: string | null) => (value ? new Date(value).getTime() : 0);

export function reconcileProgressSummary(
  localValue: ProgressSummaryResponse | undefined,
  serverValue: ProgressSummaryResponse,
): ProgressSummaryResponse {
  if (!localValue) return serverValue;

  const map = new Map<string, (typeof serverValue.lessons)[number]>();
  const keyOf = (lesson: (typeof serverValue.lessons)[number]) =>
    `${lesson.lessonId}::${lesson.lessonVersion}::${lesson.mode ?? ''}::${lesson.root ?? ''}`;
  localValue.lessons.forEach((lesson) => {
    map.set(
      keyOf(lesson as (typeof serverValue.lessons)[number]),
      lesson as (typeof serverValue.lessons)[number],
    );
  });
  serverValue.lessons.forEach((serverLesson) => {
    const key = keyOf(serverLesson);
    const localLesson = map.get(key);
    if (
      !localLesson ||
      ts(serverLesson.updatedAt) >= ts(localLesson.updatedAt)
    ) {
      map.set(key, serverLesson);
    }
  });

  return {
    lessons: [...map.values()].sort(
      (a, b) => ts(b.updatedAt) - ts(a.updatedAt),
    ),
  };
}

export function reconcileLessonProgress(
  localValue: LessonProgressResponse | undefined,
  serverValue: LessonProgressResponse,
): LessonProgressResponse {
  if (!localValue) return serverValue;

  const merged: Record<string, LessonProgressEntry> = {
    ...localValue.progressByActivityInstanceId,
  };

  Object.entries(serverValue.progressByActivityInstanceId).forEach(
    ([id, serverEntry]) => {
      const localEntry = merged[id];
      if (
        !localEntry ||
        ts(serverEntry.updatedAt) >= ts(localEntry.updatedAt)
      ) {
        merged[id] = serverEntry;
      }
    },
  );

  const localCurrent = localValue.currentActivityInstanceId;
  const serverCurrent = serverValue.currentActivityInstanceId;
  const localCurrentUpdated = localCurrent
    ? merged[localCurrent]?.updatedAt
    : undefined;
  const serverCurrentUpdated = serverCurrent
    ? serverValue.progressByActivityInstanceId[serverCurrent]?.updatedAt
    : undefined;

  const currentActivityInstanceId = !localCurrent
    ? serverCurrent
    : !serverCurrent
      ? localCurrent
      : ts(serverCurrentUpdated) >= ts(localCurrentUpdated)
        ? serverCurrent
        : localCurrent;

  return {
    currentActivityInstanceId,
    progressByActivityInstanceId: merged,
  };
}
