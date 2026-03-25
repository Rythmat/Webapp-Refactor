import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { experienceApi } from '@/lib/experience/api';

export const useExperienceSummary = (enabled = true) => {
  const token = useAuthToken();

  return useQuery({
    queryKey: ['experienceSummary'],
    queryFn: () => experienceApi.fetchSummary(token!),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
  });
};
