import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassrooms = (params?: {
  status?: 'all' | 'open' | 'closed';
}) => {
  const musicAtlas = useMusicAtlas();
  const token = useAuthToken();

  return useQuery({
    queryKey: ['classrooms', params],
    queryFn: () =>
      musicAtlas.classrooms.getClassrooms({
        ...(params || { status: 'open' }),
      }),
    // Without this the query fired during bootstrap with no token, 401'd, and
    // was retried — four wasted authenticated requests per mount. It is also a
    // dependency of both announcement hooks, so guarding it stops their
    // per-classroom fan-out from arming before there is anything to fan out to.
    enabled: Boolean(token),
    // Rosters change on teacher action, not on their own.
    staleTime: 5 * 60_000,
  });
};
