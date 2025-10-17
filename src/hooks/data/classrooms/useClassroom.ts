import { useQuery } from '@tanstack/react-query';
import { Classrooms, useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useClassroom = (classroomId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['classrooms', classroomId],
    queryFn: () => musicAtlas.classrooms.getClassroomsById(classroomId!),
    enabled: !!classroomId,
  });
};

export type Classroom = Classrooms.GetClassroomsById.ResponseBody;
