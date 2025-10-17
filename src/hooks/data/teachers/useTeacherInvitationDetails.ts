import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useTeacherInvitationDetails = (code?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['teacherInvitations', code],
    queryFn: () => musicAtlas.teachers.getTeachersInvitationsByCode(code!),
    enabled: !!code,
  });
};
