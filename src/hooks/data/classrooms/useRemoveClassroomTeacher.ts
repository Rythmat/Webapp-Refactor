import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { classroomTeachersKey } from './useClassroomTeachers';

interface RemoveClassroomTeacherInput {
  classroomId: string;
  teacherId: string;
}

/** Remove a co-teacher (`DELETE /classrooms/:id/teachers/:teacherId`). */
export const useRemoveClassroomTeacher = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classroomId, teacherId }: RemoveClassroomTeacherInput) =>
      musicAtlas.classrooms.deleteClassroomsByIdTeachersByTeacherId(
        classroomId,
        teacherId,
      ),
    onSuccess: (_data, { classroomId }) => {
      queryClient.invalidateQueries({
        queryKey: classroomTeachersKey(classroomId),
      });
    },
  });
};
