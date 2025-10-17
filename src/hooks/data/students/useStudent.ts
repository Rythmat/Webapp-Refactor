import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useStudent = (id?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!id) throw new Error('Student ID is required');
      return musicAtlas.students.getStudentsById(id);
    },
    enabled: !!id,
  });
};
