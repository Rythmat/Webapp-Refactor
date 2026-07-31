/* eslint-disable sonarjs/cognitive-complexity */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import {
  getCanonicalLessonTotalCount,
  normalizeProgressSummaryTotals,
} from '@/lib/progress/summaryTotals';
import type {
  LessonProgressResponse,
  ProgressActivityPatch,
  ProgressSummaryResponse,
} from '@/lib/progress/types';

export const useUpdateActivityProgress = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ProgressActivityPatch) => {
      if (!token) throw new Error('Not authenticated');
      return progressApi.patchActivity(token, body).then(() => body);
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({
        queryKey: ['lessonProgress', body.lessonId, body.lessonVersion],
      });
      await queryClient.cancelQueries({ queryKey: ['progressSummary'] });
      const key = [
        'lessonProgress',
        body.lessonId,
        body.lessonVersion,
      ] as const;
      const prev = queryClient.getQueryData<LessonProgressResponse>(key);
      const summaryKey = ['progressSummary'] as const;
      const prevSummary =
        queryClient.getQueryData<ProgressSummaryResponse>(summaryKey);
      const now = new Date().toISOString();
      const previousEntry =
        prev?.progressByActivityInstanceId?.[body.activityInstanceId];
      const next: LessonProgressResponse = {
        currentActivityInstanceId:
          body.status === 'IN_PROGRESS'
            ? body.activityInstanceId
            : (prev?.currentActivityInstanceId ?? null),
        progressByActivityInstanceId: {
          ...(prev?.progressByActivityInstanceId ?? {}),
          [body.activityInstanceId]: {
            ...(prev?.progressByActivityInstanceId?.[body.activityInstanceId] ??
              {}),
            status: body.status,
            attempts:
              (prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                ?.attempts ?? 0) + (body.attemptsDelta ?? 0),
            score:
              body.score ??
              prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                ?.score ??
              null,
            resumePayloadJson:
              body.resumePayloadJson ??
              prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                ?.resumePayloadJson,
            updatedAt: now,
            startedAt:
              body.status === 'IN_PROGRESS'
                ? (prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                    ?.startedAt ?? now)
                : (prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                    ?.startedAt ?? null),
            completedAt:
              body.status === 'COMPLETED'
                ? (prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                    ?.completedAt ?? now)
                : (prev?.progressByActivityInstanceId?.[body.activityInstanceId]
                    ?.completedAt ?? null),
          },
        },
      };
      queryClient.setQueryData(key, next);
      progressLocalCache.setLesson(body.lessonId, body.lessonVersion, next);

      if (prevSummary) {
        const summaryRowKey = `${body.lessonId}::${body.lessonVersion}::${body.mode ?? ''}::${body.root ?? ''}`;
        const byKey = new Map(
          prevSummary.lessons.map((lesson) => [
            `${lesson.lessonId}::${lesson.lessonVersion}::${lesson.mode ?? ''}::${lesson.root ?? ''}`,
            lesson,
          ]),
        );
        const existing = byKey.get(summaryRowKey);
        const wasCompleted = previousEntry?.status === 'COMPLETED';
        const nowCompleted = body.status === 'COMPLETED';
        const completedCountBase = existing?.completedCount ?? 0;
        const completedCount =
          nowCompleted && !wasCompleted
            ? completedCountBase + 1
            : completedCountBase;
        const totalCountBase = existing?.totalCount ?? 0;
        const knownActivities = Object.keys(
          next.progressByActivityInstanceId ?? {},
        ).length;
        const totalCount = getCanonicalLessonTotalCount({
          lessonId: body.lessonId,
          lessonVersion: body.lessonVersion,
          fallbackTotal: Math.max(totalCountBase, knownActivities),
        });

        byKey.set(summaryRowKey, {
          lessonId: body.lessonId,
          lessonVersion: body.lessonVersion,
          mode: body.mode,
          root: body.root,
          currentActivityInstanceId:
            body.status === 'IN_PROGRESS'
              ? body.activityInstanceId
              : (existing?.currentActivityInstanceId ?? null),
          completedCount,
          totalCount,
          updatedAt: now,
        });

        const nextSummary = {
          lessons: [...byKey.values()].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        } satisfies ProgressSummaryResponse;
        const normalized = normalizeProgressSummaryTotals(nextSummary)!;
        queryClient.setQueryData(summaryKey, normalized);
        progressLocalCache.setSummary(normalized);
      }

      return { key, prev, summaryKey, prevSummary };
    },
    onError: (error, body, ctx) => {
      console.error('Progress activity update failed', { body, error });
      if (!ctx) return;
      queryClient.setQueryData(ctx.key, ctx.prev);
      if (ctx.summaryKey) {
        queryClient.setQueryData(ctx.summaryKey, ctx.prevSummary);
      }
    },
    onSettled: (_data, error, body) => {
      // `onMutate` above already writes a complete optimistic model — activity
      // row, recomputed summary totals, and the local cache — so re-fetching
      // after every success threw that work away and did it again over the
      // network. Worse, `invalidateQueries` refetches ACTIVE observers
      // regardless of staleTime, so it defeated the 5min/10min staleTimes on
      // useLessonProgress and useProgressSummary (the latter is mounted app-wide
      // by ClassroomDashboard). With the 3s checkpoint loop that was three
      // requests every three seconds per student.
      //
      // Re-sync only when the optimistic model might actually be wrong: on
      // failure (we rolled back) or on the terminal COMPLETED transition, which
      // is what awards XP and unlocks the next activity.
      if (!error && body.status !== 'COMPLETED') return;

      queryClient.invalidateQueries({
        queryKey: ['lessonProgress', body.lessonId, body.lessonVersion],
      });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
    },
  });
};
