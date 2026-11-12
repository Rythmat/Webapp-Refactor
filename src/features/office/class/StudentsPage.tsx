import { GraduationCap, Search, UserPlus, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { SERVER_CLASSROOM_TEACHERS_ENABLED } from '@/constants/serverEndpoints';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { Segmented } from '@/daw/ui/Segmented';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { useClassAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import {
  useEnrollments,
  type Enrollment,
  type EnrollmentStatus,
} from '@/features/classroom/enrollments';
import { ClassroomTeachersList } from '@/features/teacher/components/ClassroomTeachersList';
import { InviteStudentDialog } from '@/features/teacher/components/InviteStudentDialog';
import { InviteTeacherDialog } from '@/features/teacher/components/InviteTeacherDialog';
import {
  useCanManageClassroom,
  useClassroom,
  useClassroomRole,
} from '@/hooks/data';
import { withInspect, useOfficeInspector } from '../frame/useOfficeInspector';
import { Initial } from '../ui/StatusPill';
import {
  OFFICE_CARD,
  OFFICE_PAGE,
  OFFICE_PAGE_TITLE,
  OFFICE_SECTION_TITLE,
} from '../ui/styles';

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_9.5rem]';

const joined = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * A class's Students (owner, 2026-11-09): the roster as one table —
 * Active, Pending and Removed — with each student's work at a glance and
 * the roster actions the role allows; a student opens in the Inspector.
 * The class's teachers sit below. Old `#grades` links land on Progress.
 */
export const StudentsPage = () => {
  const { classroomId: cid = '' } = useParams<{ classroomId: string }>();
  const { hash, pathname, search } = useLocation();
  const { data: classroom } = useClassroom(cid);
  const { enrollments, approve, deny, kick, reactivate, isLoading } =
    useEnrollments(cid);
  const { assignments } = useAssignments(cid);
  const { listProgress } = useClassAssignmentProgress(
    cid,
    assignments.map((a) => a.id),
  );
  const canManage = useCanManageClassroom(cid);
  const { role, isResolved } = useClassroomRole(cid);
  const isOwner = isResolved && role === 'owner';
  const { target } = useOfficeInspector();

  const counts = useMemo(() => {
    const c = { active: 0, pending: 0, removed: 0 };
    for (const e of enrollments) c[e.status] += 1;
    return c;
  }, [enrollments]);
  const [tab, setTab] = useState<EnrollmentStatus | null>(null);
  // Open on the waiting room when someone's in it.
  const shown: EnrollmentStatus =
    tab ?? (counts.pending > 0 ? 'pending' : 'active');
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTeacherOpen, setInviteTeacherOpen] = useState(false);

  const doneBy = useMemo(() => {
    const done = new Map<string, number>();
    for (const a of assignments) {
      for (const p of listProgress(a.id)) {
        if (p.status === 'done')
          done.set(p.enrollmentId, (done.get(p.enrollmentId) ?? 0) + 1);
      }
    }
    return done;
  }, [assignments, listProgress]);

  if (hash === '#grades') {
    return (
      <Navigate to={TeacherRoutes.progress({ classroomId: cid })} replace />
    );
  }

  const q = query.trim().toLowerCase();
  const rows = enrollments
    .filter((e) => e.status === shown)
    .filter((e) => !q || e.displayName.toLowerCase().includes(q))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const selected =
    target?.kind === 'student' && target.classroomId === cid ? target.id : null;

  const act = (e: Enrollment) => {
    const run = (fn: (id: string) => Promise<unknown>) => () =>
      void fn(e.id).catch(() => {});
    if (!canManage) return null;
    if (e.status === 'pending')
      return (
        <>
          <Button variant="primary" onClick={run(approve)}>
            Let in
          </Button>
          <Button onClick={run(deny)}>Deny</Button>
        </>
      );
    if (e.status === 'active')
      return (
        <Button variant="ghost" onClick={run(kick)}>
          Remove
        </Button>
      );
    return <Button onClick={run(reactivate)}>Bring back</Button>;
  };

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>
            {counts.active} {counts.active === 1 ? 'student' : 'students'}
            {counts.pending > 0 ? ` — ${counts.pending} waiting` : ''}
          </MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Students</h1>
        </div>
        {classroom?.code && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus aria-hidden />
            Invite students
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<EnrollmentStatus>
          label="Roster"
          options={[
            { value: 'active', label: `Active ${counts.active}` },
            { value: 'pending', label: `Waiting ${counts.pending}` },
            { value: 'removed', label: `Removed ${counts.removed}` },
          ]}
          value={shown}
          onValueChange={setTab}
        />
        <label className="relative ml-auto flex h-8 w-full items-center sm:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 size-4 text-daw-text-3"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            aria-label="Search students"
            className="h-8 w-full rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-8 text-[0.8125rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/25 focus:outline-none"
          />
          {query && (
            <IconButton
              label="Clear search"
              icon={<X />}
              size="sm"
              className="absolute right-1"
              onClick={() => setQuery('')}
            />
          )}
        </label>
      </div>

      <section aria-label="Roster" className={cn(OFFICE_CARD, 'p-2')}>
        {isLoading ? (
          <div aria-busy className="flex flex-col gap-1 p-1">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="py-12"
            icon={<Users />}
            title={
              q
                ? `No ${shown === 'pending' ? 'waiting' : shown} students match “${query}”`
                : shown === 'pending'
                  ? 'Nobody waiting to join'
                  : shown === 'removed'
                    ? 'Nobody removed'
                    : 'No students yet'
            }
            description={
              shown === 'active' && !q
                ? 'Share the join code and students appear here as they join.'
                : undefined
            }
            actions={
              shown === 'active' && !q && classroom?.code ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus aria-hidden />
                  Invite students
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div
              aria-hidden
              className={cn(ROW_GRID, 'px-3 pb-1 pt-2 max-md:hidden')}
            >
              <MicroLabel>Student</MicroLabel>
              <MicroLabel>Joined</MicroLabel>
              <MicroLabel>Work done</MicroLabel>
              <span />
            </div>
            <ul className="flex flex-col">
              {rows.map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    ROW_GRID,
                    'relative rounded-xl px-3 py-2',
                    TRANSITION,
                    selected === e.id
                      ? 'bg-white/[0.07]'
                      : 'hover:bg-white/[0.04]',
                  )}
                >
                  <Link
                    to={`${pathname}${withInspect(search, { kind: 'student', classroomId: cid, id: e.id })}`}
                    aria-current={selected === e.id ? 'true' : undefined}
                    className={cn(
                      'flex min-w-0 items-center gap-3 rounded-md after:absolute after:inset-0 after:content-[""]',
                      FOCUS_RING,
                    )}
                  >
                    <Initial name={e.displayName} />
                    <span className="truncate text-[0.9375rem] font-medium text-daw-text">
                      {e.displayName}
                    </span>
                  </Link>
                  <span className="text-[0.8125rem] tabular-nums text-daw-text-2 max-md:hidden">
                    {joined(e.joinedAt)}
                  </span>
                  <span className="text-[0.8125rem] tabular-nums text-daw-text-2 max-md:hidden">
                    {assignments.length === 0
                      ? '—'
                      : `${doneBy.get(e.id) ?? 0} of ${assignments.length}`}
                  </span>
                  <span className="relative z-10 flex items-center justify-end gap-1.5">
                    {act(e)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-label="Teachers" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={OFFICE_SECTION_TITLE}>Teachers</h2>
          {isOwner && (
            <Button size="lg" onClick={() => setInviteTeacherOpen(true)}>
              <GraduationCap aria-hidden />
              Invite a teacher
            </Button>
          )}
        </div>
        <ClassroomTeachersList classroomId={cid} canManageTeachers={isOwner} />
        {!SERVER_CLASSROOM_TEACHERS_ENABLED && (
          <p className="text-[0.8125rem] text-daw-text-3">
            Co-teachers can be invited now; their access arrives with
            co-teaching sync.
          </p>
        )}
      </section>

      {classroom?.code && (
        <InviteStudentDialog
          classroomId={cid}
          classroomCode={classroom.code}
          isOpen={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
      {isOwner && (
        <InviteTeacherDialog
          classroomId={cid}
          classroomName={classroom?.name}
          isOpen={inviteTeacherOpen}
          onOpenChange={setInviteTeacherOpen}
        />
      )}
    </div>
  );
};
