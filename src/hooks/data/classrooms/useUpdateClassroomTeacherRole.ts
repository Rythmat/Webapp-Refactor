import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import type { ClassroomTeacherRole } from './classroomTeachers.types';
import { classroomTeachersKey } from './useClassroomTeachers';

interface UpdateClassroomTeacherRoleInput {
  classroomId: string;
  teacherId: string;
  role: ClassroomTeacherRole;
}

/** Change a co-teacher's role (`PATCH /classrooms/:id/teachers/:teacherId`). */
export const useUpdateClassroomTeacherRole = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classroomId,
      teacherId,
      role,
    }: UpdateClassroomTeacherRoleInput) =>
      musicAtlas.classrooms.patchClassroomsByIdTeachersByTeacherId(
        classroomId,
        teacherId,
        { role },
      ),
    onSuccess: (_data, { classroomId }) => {
      queryClient.invalidateQueries({
        queryKey: classroomTeachersKey(classroomId),
      });
    },
  });
};
