import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';
import { useInterestProfile } from './useInterestProfile';

export const useChallenges = (enabled = true) => {
  const token = useAuthToken();
  const profile = useInterestProfile();

  return useQuery({
    // Stable key: the serverless keeps the set fixed within a period, so passing
    // the latest profile (only used on rollover) must not trigger refetches.
    queryKey: ['challenges'],
    queryFn: () => challengesApi.fetchList(token!, profile),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
  });
};
