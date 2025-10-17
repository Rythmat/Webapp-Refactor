import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useTeacherInvitations = (params?: {
  status?: 'all' | 'active' | 'expired' | 'consumed';
}) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['teacherInvitations', params],
    queryFn: () =>
      musicAtlas.teachers.getTeachersInvitations({
        ...(params || { status: 'active' }),
      }),
  });
};
