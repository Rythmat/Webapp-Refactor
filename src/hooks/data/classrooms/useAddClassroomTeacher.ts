import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import type { ClassroomTeacherRole } from './classroomTeachers.types';
import { classroomTeachersKey } from './useClassroomTeachers';

interface AddClassroomTeacherInput {
  classroomId: string;
  email: string;
  role?: ClassroomTeacherRole;
}

/**
 * Add a co-teacher by email (`POST /classrooms/:id/teachers`).
 *
 * Replaces `useCreateClassroomInvitation`, which POSTed to
 * `/classrooms/:id/invitations` — a route that does not exist, so the invite
 * dialog failed every single time.
 *
 * Open contract question (see CONTRACT-DELTAS P1): whether an email with no
 * Music Atlas account becomes a pending invite or returns a typed 404. The
 * dialog surfaces whatever the server says rather than claiming success.
 */
export const useAddClassroomTeacher = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classroomId, email, role }: AddClassroomTeacherInput) =>
      musicAtlas.classrooms.postClassroomsByIdTeachers(classroomId, {
        email,
        ...(role ? { role } : {}),
      }),
    onSuccess: (_data, { classroomId }) => {
      queryClient.invalidateQueries({
        queryKey: classroomTeachersKey(classroomId),
      });
    },
  });
};
