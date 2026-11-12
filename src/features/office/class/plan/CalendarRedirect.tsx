import { Navigate, useLocation, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';

/**
 * The old Calendar tab (`/plan/annual`): the calendar is one of Plan's
 * views now, so it opens Plan on Month, keeping any Inspector selection.
 */
export const CalendarRedirect = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  p.set('view', 'month');
  return (
    <Navigate to={`${TeacherRoutes.plan({ classroomId })}?${p}`} replace />
  );
};
