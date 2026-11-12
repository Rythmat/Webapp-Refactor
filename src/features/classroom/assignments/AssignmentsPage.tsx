/**
 * `/classrooms/:cid/assignments` — retired as its own page (owner,
 * 2026-11-09): a student's class page lists every assignment as cards, so
 * this URL opens it. A teacher reaching it about their own class (not
 * previewing as a student) lands on the Office's Assignments instead.
 */
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useIsClassroomOwner } from '@/hooks/data';

export const AssignmentsPage = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  const [params] = useSearchParams();
  const isOwner = useIsClassroomOwner(classroomId);
  if (isOwner && params.get('viewAs') !== 'student') {
    return <Navigate to={TeacherRoutes.assignments({ classroomId })} replace />;
  }
  return <Navigate to={ClassroomRoutes.home({ classroomId })} replace />;
};
