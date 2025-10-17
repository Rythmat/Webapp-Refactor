import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassroomDetailsByCode = (code?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['classroomDetails', code],
    queryFn: () => {
      if (!code) {
        throw new Error('Classroom code is required');
      }
      return musicAtlas.classrooms.getClassroomsDetailsByCode(code);
    },
    retry: false,
    enabled: !!code,
  });
};
