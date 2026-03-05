import type { ProgressSummaryResponse } from './types';

export const MODE_LESSON_FLOW_ACTIVITY_TOTAL = 36;

export function getCanonicalLessonTotalCount(params: {
  lessonId: string;
  lessonVersion: number;
  fallbackTotal: number | null;
}) {
  if (
    params.lessonId.startsWith('mode-lesson-flow') &&
    params.lessonVersion === 1
  ) {
    return MODE_LESSON_FLOW_ACTIVITY_TOTAL;
  }
  return params.fallbackTotal;
}

export function normalizeProgressSummaryTotals(
  summary: ProgressSummaryResponse | undefined,
): ProgressSummaryResponse | undefined {
  if (!summary) return summary;
  return {
    lessons: summary.lessons.map((lesson) => ({
      ...lesson,
      totalCount: getCanonicalLessonTotalCount({
        lessonId: lesson.lessonId,
        lessonVersion: lesson.lessonVersion,
        fallbackTotal: lesson.totalCount,
      }),
    })),
  };
}
