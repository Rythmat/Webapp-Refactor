import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import type { LessonStatePatch } from '@/lib/progress/types';

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
      const prev = queryClient.getQueryData<any>(key);
      const next = {
        currentActivityInstanceId: body.currentActivityInstanceId,
        progressByActivityInstanceId: prev?.progressByActivityInstanceId ?? {},
      };
      queryClient.setQueryData(key, next);
      progressLocalCache.setLesson(body.lessonId, body.lessonVersion, next);
      return { key, prev };
    },
    onError: (error, body, ctx) => {
      console.error('Lesson state update failed', { body, error });
      if (!ctx) return;
      queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _error, body) => {
      queryClient.invalidateQueries({
        queryKey: ['lessonProgress', body.lessonId, body.lessonVersion],
      });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
    },
  });
};
