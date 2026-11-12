import { Navigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';

/**
 * The retired Preview (owner, 2026-11-12: a lesson's options are Go Live,
 * Present and Edit): an old Preview link opens the lesson in the editor.
 */
export const PreviewRedirect = () => {
  const { classroomId = '', dayId = '' } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  return (
    <Navigate to={TeacherRoutes.dayEditor({ classroomId, dayId })} replace />
  );
};
