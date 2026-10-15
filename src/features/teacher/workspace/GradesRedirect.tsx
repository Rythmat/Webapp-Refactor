/**
 * GradesRedirect — the retired Grades tab URL (`/classroom/:id/grades`). The
 * gradebook now lives on the People tab, so land on its Gradebook section.
 */
import { Navigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { GRADEBOOK_SECTION_ID } from '@/features/classroom/grades/ClassroomGradebook';

export const GradesRedirect = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  return (
    <Navigate
      to={`${TeacherRoutes.students({ classroomId: classroomId ?? '' })}#${GRADEBOOK_SECTION_ID}`}
      replace
    />
  );
};
