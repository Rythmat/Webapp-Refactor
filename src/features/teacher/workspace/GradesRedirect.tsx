/**
 * GradesRedirect — the retired Grades tab URL (`/office/:id/grades`, and
 * `/students#grades` before it). The gradebook lives on the class's Progress
 * tab now.
 */
import { Navigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';

export const GradesRedirect = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  return (
    <Navigate
      to={TeacherRoutes.progress({ classroomId: classroomId ?? '' })}
      replace
    />
  );
};
