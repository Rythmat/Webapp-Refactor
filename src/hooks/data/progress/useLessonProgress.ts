import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import { reconcileLessonProgress } from '@/lib/progress/reconcile';

export const useLessonProgress = (lessonId: string, lessonVersion: number, enabled = true) => {
  const token = useAuthToken();
  const local = progressLocalCache.getLesson(lessonId, lessonVersion);

  return useQuery({
    queryKey: ['lessonProgress', lessonId, lessonVersion],
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
    initialData: local,
    queryFn: async () => {
      const server = await progressApi.fetchLesson(token!, lessonId, lessonVersion);
      const merged = reconcileLessonProgress(local, server);
      progressLocalCache.setLesson(lessonId, lessonVersion, merged);
      return merged;
    },
  });
};
