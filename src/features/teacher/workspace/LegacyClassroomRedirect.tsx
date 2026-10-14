/**
 * LegacyClassroomRedirect — classrooms moved from `/teacher/classroom/:id/*` to
 * `/office/:id/*`. Old bookmarks and shared links land on the same page (same
 * sub-path, query, and hash) under the Office.
 */
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';

export const LegacyClassroomRedirect = () => {
  const { classroomId = '', '*': rest = '' } = useParams();
  const { search, hash } = useLocation();
  const base = TeacherRoutes.classroomDashboard({ classroomId });
  return (
    <Navigate to={`${base}${rest ? `/${rest}` : ''}${search}${hash}`} replace />
  );
};
