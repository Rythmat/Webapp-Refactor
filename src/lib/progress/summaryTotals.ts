import type { ProgressSummaryResponse } from './types';

// Legacy-only: `mode-lesson-flow` lessonVersion 1 (pre Bass/Play-Along removal)
// hardcoded its activity count to 36 regardless of the lesson's actual
// definitions, which froze `totalCount` forever and made 100% unreachable
// once content changed. Fixed going forward by bumping
// `ACTIVITY_FLOW_LESSON_VERSION` to 2 in ActivityFlow.tsx — version 2 (and any
// future version) is intentionally NOT hardcoded here and always trusts the
// live `fallbackTotal` (computed from `flowDefinitions.length`), so this bug
// class can't recur when content changes again. Only stale version-1 records
// still get the frozen override, preserving their legacy display.
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
