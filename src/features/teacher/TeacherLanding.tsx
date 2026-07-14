/**
 * TeacherLanding — decides where a teacher's `/teacher` visit resolves to:
 *
 *   - 0 owned classrooms  → empty state (Create your first classroom)
 *   - 1 owned classroom   → redirect straight to that classroom's dashboard
 *   - 2+ owned classrooms → redirect to the classrooms selector
 *
 * The selection is encoded in the URL (`/teacher/classroom/:cid`), not in
 * hidden state. Bookmarks, back-button behavior, and shared links all
 * resolve to the intended classroom without a hook mediating them.
 */
import { GraduationCap, PlusCircle } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useClassrooms, useMe } from '@/hooks/data';

export const TeacherLanding = () => {
  const { data: me } = useMe();
  const { data: allClassrooms = [], isLoading } = useClassrooms();

  const owned = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : [];

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-10">
        <p className="text-sm text-white/50">Loading classrooms…</p>
      </div>
    );
  }

  if (owned.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-10">
        <EmptyOwned />
      </div>
    );
  }

  if (owned.length === 1) {
    return (
      <Navigate
        to={TeacherRoutes.classroomDashboard({ classroomId: owned[0].id })}
        replace
      />
    );
  }

  return <Navigate to={TeacherRoutes.classrooms()} replace />;
};

const EmptyOwned = () => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <GraduationCap className="h-12 w-12 text-white/40" />
    <div className="flex max-w-md flex-col gap-2">
      <h2 className="text-xl font-medium text-white">
        You don&apos;t own any classrooms yet
      </h2>
      <p className="text-sm text-white/60">
        Create your first classroom to invite students and start teaching.
      </p>
    </div>
    <Link
      to={TeacherRoutes.classrooms()}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      Create Classroom
    </Link>
  </div>
);
