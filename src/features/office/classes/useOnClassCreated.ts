import { useQueryClient } from '@tanstack/react-query';
import { useCallback, type ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import type { CreateClassroomDialog } from '@/features/teacher/components/CreateClassroomDialog';
import type { useClassrooms } from '@/hooks/data';

type Created = Parameters<
  NonNullable<ComponentProps<typeof CreateClassroomDialog>['onCreated']>
>[0];
type ClassroomList = NonNullable<ReturnType<typeof useClassrooms>['data']>;

/**
 * After a class is created: put it in the classrooms cache at once, then open
 * it. `useCreateClassroom` invalidates ['classrooms'], but that refetch is
 * async — without the optimistic add the new class's role guard runs against
 * the stale list and bounces the teacher back out.
 *
 * `['classrooms']` is a PREFIX match covering two shapes: `useClassrooms`
 * caches an ARRAY at ['classrooms', params] and `useClassroom` a single
 * OBJECT at ['classrooms', id]. Only the list shape is updated (spreading the
 * object threw "old is not iterable").
 */
export const useOnClassCreated = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useCallback(
    (created: Created) => {
      queryClient.setQueriesData<ClassroomList>(
        { queryKey: ['classrooms'] },
        (old) =>
          Array.isArray(old)
            ? [
                ...old,
                {
                  ...created,
                  studentCount: 0,
                  closedAt: null,
                } as ClassroomList[number],
              ]
            : old,
      );
      navigate(TeacherRoutes.classroomDashboard({ classroomId: created.id }));
    },
    [navigate, queryClient],
  );
};
