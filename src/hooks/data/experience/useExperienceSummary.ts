import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { experienceApi } from '@/lib/experience/api';

/**
 * Days of `timeline` to request. Wider than any chart needs because the learning
 * streak is derived from this same timeline (see `useStreak`), and the streak
 * awards reach 100 consecutive days — a 30-day window would silently cap the
 * "longest streak" badge. The API returns only days that actually have a row, so
 * a wide window costs almost nothing.
 */
const TIMELINE_DAYS = 400;

export const useExperienceSummary = (enabled = true) => {
  const token = useAuthToken();

  return useQuery({
    queryKey: ['experienceSummary'],
    queryFn: () => experienceApi.fetchSummary(token!, TIMELINE_DAYS),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
  });
};
