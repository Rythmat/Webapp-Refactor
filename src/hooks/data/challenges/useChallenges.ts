import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';

export const useChallenges = (enabled = true) => {
  const token = useAuthToken();

  return useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengesApi.fetchList(token!),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
  });
};
