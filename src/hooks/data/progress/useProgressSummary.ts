import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { progressApi } from '@/lib/progress/api';
import { progressLocalCache } from '@/lib/progress/localCache';
import { reconcileProgressSummary } from '@/lib/progress/reconcile';
import { normalizeProgressSummaryTotals } from '@/lib/progress/summaryTotals';

export const useProgressSummary = (enabled = true) => {
  const token = useAuthToken();
  const local = normalizeProgressSummaryTotals(progressLocalCache.getSummary());

  return useQuery({
    queryKey: ['progressSummary'],
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 10,
    initialData: local,
    queryFn: async () => {
      const server = await progressApi.fetchSummary(token!);
      const merged = reconcileProgressSummary(local, server);
      const normalized = normalizeProgressSummaryTotals(merged)!;
      progressLocalCache.setSummary(normalized);
      return normalized;
    },
  });
};
