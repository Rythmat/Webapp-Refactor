import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useStudents = (params?: {
  status?: 'all' | 'active' | 'removed';
  name?: string;
  username?: string;
}) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['students', params],
    queryFn: () =>
      musicAtlas.students.getStudents({
        ...params,
        status: params?.status || 'active',
      }),
  });
};
