/**
 * TeacherDashboardPage — per-classroom teacher dashboard at
 * `/teacher/classroom/:classroomId`.
 *
 * Reads the classroomId from the URL so bookmarks, back-button behavior, and
 * shared links resolve to the intended classroom without hidden state.
 *
 * Multi-classroom teachers see an "All classrooms" link that returns to the
 * selector at `/teacher/classrooms`; solo teachers don't (they own only one
 * classroom, so there's nothing to switch to).
 */
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms, useMe } from '@/hooks/data';
import { LiveSessionTile } from './dashboard/LiveSessionTile';
import { PendingApprovalsTile } from './dashboard/PendingApprovalsTile';
import { QuickActionsTile } from './dashboard/QuickActionsTile';
import { RecentSessionsTile } from './dashboard/RecentSessionsTile';
import { RosterSnapshotTile } from './dashboard/RosterSnapshotTile';
import { TodaysLessonTile } from './dashboard/TodaysLessonTile';
import { UpcomingAssignmentsTile } from './dashboard/UpcomingAssignmentsTile';
import { WeekStripTile } from './dashboard/WeekStripTile';

export const TeacherDashboardPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { data: me } = useMe();
  const { data: allClassrooms = [], isLoading: isClassroomsLoading } =
    useClassrooms();
  const { data: activeClassroom } = useClassroom(cid);

  const owned = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : [];
  const hasMany = owned.length > 1;
  const ownsThisClassroom = owned.some((c) => c.id === cid);

  // Guard: URL tampering or a classroom the teacher no longer owns. Bounce
  // back to `/teacher` so the landing decides where they should be.
  if (!isClassroomsLoading && me?.id && cid && !ownsThisClassroom) {
    return <Navigate to={TeacherRoutes.root()} replace />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/60">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Dashboard</span>
          </div>
          <h1 className="text-3xl font-medium leading-tight text-white md:text-4xl">
            {activeClassroom?.name ?? 'Loading…'}
          </h1>
          {activeClassroom?.description && (
            <p className="max-w-2xl text-sm text-white/60">
              {activeClassroom.description}
            </p>
          )}
        </div>

        {hasMany && (
          <Link
            to={TeacherRoutes.classrooms()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All classrooms
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        <TodaysLessonTile classroomId={cid} />
        <LiveSessionTile classroomId={cid} />
        <WeekStripTile classroomId={cid} />
        <PendingApprovalsTile classroomId={cid} />
        <RosterSnapshotTile classroomId={cid} />
        <UpcomingAssignmentsTile classroomId={cid} />
        <RecentSessionsTile classroomId={cid} />
        <QuickActionsTile
          classroomId={cid}
          classroomCode={activeClassroom?.code}
        />
      </div>
    </div>
  );
};
