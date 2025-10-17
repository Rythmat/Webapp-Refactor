import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useTeachers = (params?: {
  status?: 'all' | 'active' | 'removed';
  name?: string;
}) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['teachers', params],
    queryFn: () =>
      musicAtlas.teachers.getTeachers({
        ...params,
        status: params?.status || 'active',
      }),
  });
};
