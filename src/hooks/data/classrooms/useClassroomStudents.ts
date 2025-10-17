import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassroomStudents = (
  classroomId?: string,
  params?: {
    status?: 'all' | 'active' | 'removed';
  },
) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['classroom', classroomId, 'students', params],
    queryFn: () =>
      musicAtlas.students.getStudents({
        classroomId,
        ...(params || {}),
      }),
    enabled: !!classroomId,
  });
};
