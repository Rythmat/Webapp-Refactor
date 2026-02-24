import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import type { LessonStatePatch, ProgressSummaryResponse } from '@/lib/progress/types';

export const useUpdateLessonState = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: LessonStatePatch) => {
      if (!token) throw new Error('Not authenticated');
      return progressApi.patchLessonState(token, body).then(() => body);
    },
    onMutate: async (body) => {
      const key = ['lessonProgress', body.lessonId, body.lessonVersion] as const;
      await queryClient.cancelQueries({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: ['progressSummary'] });
      const prev = queryClient.getQueryData<any>(key);
      const summaryKey = ['progressSummary'] as const;
      const prevSummary = queryClient.getQueryData<ProgressSummaryResponse>(summaryKey);
      const next = {
        currentActivityInstanceId: body.currentActivityInstanceId,
        progressByActivityInstanceId: prev?.progressByActivityInstanceId ?? {},
      };
      queryClient.setQueryData(key, next);
      progressLocalCache.setLesson(body.lessonId, body.lessonVersion, next);

      if (prevSummary) {
        const now = new Date().toISOString();
        const nextSummary: ProgressSummaryResponse = {
          lessons: prevSummary.lessons
            .map((lesson) => {
              if (lesson.lessonId !== body.lessonId || lesson.lessonVersion !== body.lessonVersion) {
                return lesson;
              }
              return {
                ...lesson,
                currentActivityInstanceId: body.currentActivityInstanceId,
                updatedAt: now,
              };
            })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
        };
        queryClient.setQueryData(summaryKey, nextSummary);
        progressLocalCache.setSummary(nextSummary);
      }

      return { key, prev, summaryKey, prevSummary };
    },
    onError: (error, body, ctx) => {
      console.error('Lesson state update failed', { body, error });
      if (!ctx) return;
      queryClient.setQueryData(ctx.key, ctx.prev);
      if (ctx.summaryKey) {
        queryClient.setQueryData(ctx.summaryKey, ctx.prevSummary);
      }
    },
    onSettled: (_data, _error, body) => {
      queryClient.invalidateQueries({
        queryKey: ['lessonProgress', body.lessonId, body.lessonVersion],
      });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
    },
  });
};
