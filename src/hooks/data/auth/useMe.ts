import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useMe = () => {
  const musicAtlas = useMusicAtlas();
  const { token, isBootstrapLoading } = useAuthContext();

  return useQuery({
    queryKey: ['me'],
    queryFn: () => musicAtlas.auth.getAuthMe(),
    enabled: Boolean(token) && !isBootstrapLoading,
  });
};
