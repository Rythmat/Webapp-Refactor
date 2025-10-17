import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassrooms = (params?: {
  status?: 'all' | 'open' | 'closed';
}) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['classrooms', params],
    queryFn: () =>
      musicAtlas.classrooms.getClassrooms({
        ...(params || { status: 'open' }),
      }),
  });
};
