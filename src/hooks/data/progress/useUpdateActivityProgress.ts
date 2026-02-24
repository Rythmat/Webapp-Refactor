import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import type { ProgressActivityPatch } from '@/lib/progress/types';

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
      const key = ['lessonProgress', body.lessonId, body.lessonVersion] as const;
      const prev = queryClient.getQueryData<any>(key);
      const now = new Date().toISOString();
      const next = {
        currentActivityInstanceId:
          body.status === 'IN_PROGRESS'
            ? body.activityInstanceId
            : prev?.currentActivityInstanceId ?? null,
        progressByActivityInstanceId: {
          ...(prev?.progressByActivityInstanceId ?? {}),
          [body.activityInstanceId]: {
            ...(prev?.progressByActivityInstanceId?.[body.activityInstanceId] ?? {}),
            status: body.status,
            attempts:
              (prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.attempts ?? 0) +
              (body.attemptsDelta ?? 0),
            score: body.score ?? prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.score ?? null,
            resumePayloadJson:
              body.resumePayloadJson ??
              prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.resumePayloadJson,
            updatedAt: now,
            startedAt:
              body.status === 'IN_PROGRESS'
                ? prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.startedAt ?? now
                : prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.startedAt ?? null,
            completedAt:
              body.status === 'COMPLETED'
                ? prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.completedAt ?? now
                : prev?.progressByActivityInstanceId?.[body.activityInstanceId]?.completedAt ?? null,
          },
        },
      };
      queryClient.setQueryData(key, next);
      progressLocalCache.setLesson(body.lessonId, body.lessonVersion, next);
      return { key, prev };
    },
    onError: (error, body, ctx) => {
      console.error('Progress activity update failed', { body, error });
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
