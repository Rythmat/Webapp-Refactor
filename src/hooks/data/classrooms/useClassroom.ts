import { useQuery } from '@tanstack/react-query';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import { Classrooms, useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassroom = (classroomId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['classrooms', classroomId],
    queryFn: () => musicAtlas.classrooms.getClassroomsById(classroomId!),
    // The Office's built-in lessons belong to no class on the server.
    enabled: !!classroomId && classroomId !== OFFICE_LESSONS_SCOPE,
  });
};

export type Classroom = Classrooms.GetClassroomsById.ResponseBody;
