import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { meQueryKey } from './meQueryKey';

export { meQueryKey };

/**
 * `GET /auth/me`.
 *
 * Shares `meQueryKey` with `AuthContext` so the two dedupe. They previously
 * used `['me', token]` and `['me']` — different keys in different
 * QueryClients — so every mount of `useMe` (43 call sites, including `TopRail`
 * on every dashboard route) issued its own request.
 */
export const useMe = () => {
  const musicAtlas = useMusicAtlas();
  const { token, isBootstrapLoading } = useAuthContext();

  return useQuery({
    queryKey: meQueryKey(token),
    queryFn: () => musicAtlas.auth.getAuthMe(),
    enabled: Boolean(token) && !isBootstrapLoading,
    // Profile edits invalidate explicitly; nothing else changes this often.
    staleTime: 5 * 60_000,
  });
};
