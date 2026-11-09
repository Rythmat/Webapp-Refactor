import { ChevronRight, Copy, Settings, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { SHELF_ITEM, Shelf } from '@/components/explore/Shelf';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { InviteStudentDialog } from '@/features/teacher/components/InviteStudentDialog';
import {
  useCanManageClassroom,
  useClassroom,
  useMyClassrooms,
} from '@/hooks/data';
import { NextUpCard } from '../today/NextUpCard';
import { TodayItems } from '../today/TodayItems';
import { lessonInspectHref } from '../today/officeLinks';
import { buildTodayModel, isoDay, relativeDay } from '../today/todayModel';
import { useClassDigest } from '../today/useClassDigest';
import { ClassCover } from '../ui/ClassCover';
import { LessonCard } from '../ui/LessonCard';
import {
  OFFICE_CARD,
  OFFICE_PAGE,
  OFFICE_PAGE_TITLE,
  OFFICE_ROW,
  OFFICE_SECTION_TITLE,
} from '../ui/styles';
import { ClassSettings } from './ClassSettings';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Copied join code ${code}`);
  } catch {
    toast.error('Could not copy — clipboard blocked');
  }
};

/** The hairline bento of the console's StatStrip, in the Office's terms. */
const Stats = ({ stats }: { stats: { label: string; value: number }[] }) => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.06] lg:grid-cols-4">
    {stats.map((s) => (
      <div
        key={s.label}
        className="flex flex-col gap-1 bg-daw-surface-1 px-5 py-4"
      >
        <dt>
          <MicroLabel>{s.label}</MicroLabel>
        </dt>
        <dd className="text-[1.75rem] leading-none tabular-nums text-daw-text">
          {s.value}
        </dd>
      </div>
    ))}
  </dl>
);

/**
 * A class's Overview (owner, 2026-11-09): who it is (cover, name, join
 * code, invite, settings), its numbers, its next lesson, what's waiting,
 * its week, and its recent sessions.
 */
export const ClassOverviewPage = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  const { pathname } = useLocation();
  const { data: classroom } = useClassroom(classroomId);
  const canManage = useCanManageClassroom(classroomId);
  // The detail record has no head count; the class list does.
  const { classrooms } = useMyClassrooms();
  const listed = classrooms.find((c) => c.id === classroomId);
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const digest = useClassDigest({
    id: classroomId,
    name: classroom?.name ?? 'This class',
    studentCount: listed?.studentCount,
  });
  const now = useMemo(() => new Date(), []);
  const todayIso = isoDay(now);
  const model = useMemo(() => buildTodayModel([digest], now), [digest, now]);

  const planned = digest.lessons.filter((l) => l.date >= todayIso).length;
  const sessions = [...digest.endedSessions]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, 4);

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <ClassCover
          classroomId={classroomId}
          className="w-24 rounded-2xl sm:w-32"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <MicroLabel>Class</MicroLabel>
          <h1 className={cn(OFFICE_PAGE_TITLE, 'truncate')}>
            {classroom?.name ?? ' '}
          </h1>
          {classroom?.description && (
            <p className="line-clamp-2 max-w-[60ch] text-[0.875rem] text-daw-text-2">
              {classroom.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {classroom?.code && (
            <Button
              size="lg"
              onClick={() => void copyCode(classroom.code)}
              aria-label={`Copy join code ${classroom.code}`}
            >
              <span className="font-normal text-daw-text-3">Code</span>
              <span className="tracking-[0.12em]">{classroom.code}</span>
              <Copy aria-hidden />
            </Button>
          )}
          {classroom?.code && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus aria-hidden />
              Invite
            </Button>
          )}
          {canManage && (
            <Button size="lg" onClick={() => setSettingsOpen(true)}>
              <Settings aria-hidden />
              Settings
            </Button>
          )}
        </div>
      </header>

      <Stats
        stats={[
          { label: 'Students', value: digest.studentCount },
          { label: 'Lessons ahead', value: planned },
          { label: 'Open assignments', value: digest.openAssignments.length },
          { label: 'Sessions run', value: digest.endedSessions.length },
        ]}
      />

      <NextUpCard
        model={model}
        todayIso={todayIso}
        firstClassroomId={classroomId}
        countryFeatures={countryFeatures}
        songsReady={songsReady}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <TodayItems
          title="Needs you"
          items={[...model.needsYou, ...model.headsUp]}
          empty="Nothing waiting on you in this class."
        />
        <section
          aria-label="Recent sessions"
          className={cn(OFFICE_CARD, 'flex flex-col p-2')}
        >
          <header className="flex items-baseline justify-between gap-3 px-3 pb-1 pt-2">
            <h2 className={OFFICE_SECTION_TITLE}>Recent sessions</h2>
            <Link
              to={TeacherRoutes.reports({ classroomId })}
              className="text-[0.8125rem] text-daw-text-3 hover:text-daw-text"
            >
              All reports
            </Link>
          </header>
          {sessions.length === 0 ? (
            <p className="px-3 pb-4 pt-2 text-[0.875rem] text-daw-text-3">
              No sessions yet. Go Live on a lesson and its report lands here.
            </p>
          ) : (
            <ul className="flex flex-col">
              {sessions.map((s) => (
                <li key={s.sessionId}>
                  <Link
                    to={TeacherRoutes.report({
                      classroomId,
                      sessionId: s.sessionId,
                    })}
                    className={OFFICE_ROW}
                  >
                    <span className="flex-1 text-[0.875rem] text-daw-text">
                      {capitalize(
                        relativeDay(isoDay(new Date(s.endedAt)), todayIso),
                      )}
                    </span>
                    <span className="text-[0.8125rem] tabular-nums text-daw-text-3">
                      {s.responses}{' '}
                      {s.responses === 1 ? 'response' : 'responses'}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-3.5 text-daw-text-3"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {model.week.length > 0 && (
        <Shelf
          id="class-week"
          title="This week"
          seeAll={TeacherRoutes.plan({ classroomId })}
          count={model.week.length}
        >
          {model.week.map((l) => (
            <li key={l.day.id} className={SHELF_ITEM}>
              <LessonCard
                day={l.day}
                status={l.status}
                eyebrow={capitalize(relativeDay(l.date, todayIso))}
                to={lessonInspectHref(pathname, classroomId, l.day.id)}
                countryFeatures={countryFeatures}
                songsReady={songsReady}
              />
            </li>
          ))}
        </Shelf>
      )}

      {classroom?.code && (
        <InviteStudentDialog
          classroomId={classroomId}
          classroomCode={classroom.code}
          isOpen={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
      <ClassSettings
        classroomId={classroomId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
