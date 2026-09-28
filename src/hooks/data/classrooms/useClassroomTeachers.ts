import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Owner + co-teachers for one classroom (`GET /classrooms/:id/teachers`).
 *
 * This endpoint is SHIPPED and generated — it simply had zero call sites. It
 * returns `{ owner, teachers[] }`, which is why `useClassroomRole` can resolve
 * a real role today without waiting on the `myRole` field the contract asks
 * for. That field is only needed so a co-taught classroom appears in
 * `GET /classrooms` at all; see `useMyClassrooms`.
 */
export const classroomTeachersKey = (classroomId?: string) =>
  ['classroom', classroomId, 'teachers'] as const;

export const useClassroomTeachers = (classroomId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: classroomTeachersKey(classroomId),
    queryFn: () =>
      musicAtlas.classrooms.getClassroomsByIdTeachers(classroomId as string),
    enabled: !!classroomId,
    // A caller who is not a member of this classroom gets a 4xx, and a 4xx is
    // never worth retrying: it would cost four failed requests and four
    // server-side telemetry rows to learn the same thing once. This is the
    // rule the serverEndpoints doc block states for unshipped routes, applied
    // to a shipped route that legitimately refuses some callers.
    retry: false,
    staleTime: 5 * 60_000,
  });
};
