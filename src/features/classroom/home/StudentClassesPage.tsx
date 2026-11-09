import { GraduationCap, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { ClassroomRoutes, OfficeRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { FOCUS_RING } from '@/daw/ui/styles';
import { IdCover } from '@/features/office/ui/ClassCover';
import { StatusPill } from '@/features/office/ui/StatusPill';
import {
  OFFICE_CARD,
  OFFICE_PAGE,
  OFFICE_PAGE_TITLE,
} from '@/features/office/ui/styles';
import { useClassrooms, useMe, useMyClassrooms } from '@/hooks/data';
import { JoinClassroomDialog } from '../JoinClassroomDialog';
import { useAssignments } from '../assignments/useAssignments';
import { useClassroomLiveSession } from '../live/useClassroomLiveSession';
import { LiveNowBanner } from './LiveNowBanner';

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]';

type Classroom = NonNullable<ReturnType<typeof useClassrooms>['data']>[number];

/** A class that's live now gets the banner at the top of the page. */
const LiveIfLive = ({ classroom }: { classroom: Classroom }) => {
  const live = useClassroomLiveSession(classroom.id);
  return live ? (
    <LiveNowBanner
      compact
      classroomId={classroom.id}
      sessionId={live.sessionId}
      className={classroom.name}
    />
  ) : null;
};

const ClassCard = ({
  classroom,
  teaches,
}: {
  classroom: Classroom;
  teaches: boolean;
}) => {
  const live = useClassroomLiveSession(classroom.id);
  const { assignments } = useAssignments(classroom.id);
  const open = assignments.filter((a) => a.status === 'open').length;
  const to = teaches
    ? `${ClassroomRoutes.home({ classroomId: classroom.id })}?viewAs=student`
    : ClassroomRoutes.home({ classroomId: classroom.id });
  return (
    <li>
      <Link
        to={to}
        className={cn('group flex flex-col gap-2.5 rounded-2xl', FOCUS_RING)}
      >
        <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <IdCover id={classroom.id} className="w-full rounded-2xl" />
          {live && (
            <span className="absolute left-2 top-2">
              <StatusPill tone="live" className="bg-black/55 backdrop-blur">
                Live now
              </StatusPill>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
          {teaches && <MicroLabel>You teach this — student view</MicroLabel>}
          <span className="truncate text-[0.9375rem] font-medium text-daw-text">
            {classroom.name}
          </span>
          <span className="truncate text-[0.8125rem] text-daw-text-3">
            {open === 0 ? 'Nothing open' : `${open} open`}
          </span>
        </div>
      </Link>
    </li>
  );
};

/**
 * Classroom, for a student (owner, 2026-11-09): every class they're in, as
 * covers in Learn's look, with any class that's live right now at the top;
 * Join a class first in the grid. A teacher sees their own classes marked,
 * opening as a student would see them, and the way to the Office.
 */
export const StudentClassesPage = () => {
  const { data: classrooms = [], isLoading, error } = useClassrooms();
  const { classrooms: owned } = useMyClassrooms();
  const ownedIds = useMemo(() => new Set(owned.map((c) => c.id)), [owned]);
  const { data: me } = useMe();
  const teacherLike = me?.role === 'teacher' || me?.role === 'admin';
  const [joinOpen, setJoinOpen] = useState(false);
  const sorted = [...classrooms].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>
            {isLoading
              ? 'Loading'
              : `${classrooms.length} ${classrooms.length === 1 ? 'class' : 'classes'}`}
          </MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Classroom</h1>
        </div>
        {teacherLike && (
          <Button asChild size="lg">
            <Link to={OfficeRoutes.root()}>
              <GraduationCap aria-hidden />
              Go to the Office
            </Link>
          </Button>
        )}
      </header>

      {sorted.map((c) => (
        <LiveIfLive key={c.id} classroom={c} />
      ))}

      {error ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            title="Your classes couldn't load"
            description="Check your connection and try again."
          />
        </div>
      ) : !isLoading && sorted.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<GraduationCap />}
            title="Join your first class"
            description={
              teacherLike
                ? 'Use a colleague’s join code to see their class as a student, or make your own class in the Office.'
                : 'Your teacher has a code for your class. Type it in and you’re in.'
            }
            actions={
              <Button
                variant="primary"
                size="lg"
                onClick={() => setJoinOpen(true)}
              >
                <Plus aria-hidden />
                Join a class
              </Button>
            }
          />
        </div>
      ) : (
        <ul className={GRID}>
          <li>
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className={cn(
                'flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-daw-text-2 transition-colors hover:border-white/30 hover:bg-white/[0.03] hover:text-daw-text',
                FOCUS_RING,
              )}
            >
              <Plus aria-hidden className="size-7" strokeWidth={1.5} />
              <span className="text-[0.875rem] font-medium">Join a class</span>
            </button>
          </li>
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <li
                  key={i}
                  aria-hidden
                  className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]"
                />
              ))
            : sorted.map((c) => (
                <ClassCard
                  key={c.id}
                  classroom={c}
                  teaches={ownedIds.has(c.id)}
                />
              ))}
        </ul>
      )}

      <JoinClassroomDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
};
