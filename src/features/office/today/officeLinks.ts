import { TeacherRoutes } from '@/constants/routes';
import { inspectSearch } from '../frame/useOfficeInspector';
import type { TodayItem } from './todayModel';

/** Where a Today line's action goes. */
export const itemHref = (item: TodayItem): string => {
  const classroomId = item.classroomId;
  const t = item.target;
  switch (t.page) {
    case 'students':
      return TeacherRoutes.students({ classroomId });
    case 'assignment':
      return TeacherRoutes.assignmentProgress({
        classroomId,
        assignmentId: t.assignmentId,
      });
    case 'report':
      return TeacherRoutes.report({ classroomId, sessionId: t.sessionId });
    case 'lesson':
      return TeacherRoutes.dayEditor({ classroomId, dayId: t.dayId });
    case 'plan':
      return TeacherRoutes.plan({ classroomId });
  }
};

/** A lesson opened in the Inspector over the page it's on. */
export const lessonInspectHref = (
  pathname: string,
  classroomId: string,
  dayId: string,
): string =>
  `${pathname}${inspectSearch({ kind: 'lesson', classroomId, dayId })}`;
