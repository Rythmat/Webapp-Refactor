import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useMe = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['me'],
    queryFn: () => musicAtlas.auth.getAuthMe(),
  });
};
