import type { Feature } from 'geojson';
import { CalendarPlus, Eye, Pencil, Play, Radio, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { useGoLive } from '@/features/classroom/live/useGoLive';
import { LessonThumb } from '@/features/classroom/plan/LessonThumb';
import { StatusChip } from '@/features/classroom/plan/lessonStatus';
import type { Day } from '@/features/classroom/types';
import { useCanEditClassroom } from '@/hooks/data';
import { ClassCover } from '../ui/ClassCover';
import { OFFICE_CARD } from '../ui/styles';
import { lessonInspectHref } from './officeLinks';
import { relativeDay, type TodayModel } from './todayModel';

const HERO = cn(
  OFFICE_CARD,
  'flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5',
);
const HERO_TITLE =
  'text-[clamp(1.5rem,2.6vw,2rem)] font-normal leading-tight tracking-[-0.02em] text-daw-text';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const GoLiveButton = ({
  classroomId,
  day,
}: {
  classroomId: string;
  day: Day;
}) => {
  const goLive = useGoLive(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  return (
    <Button
      variant="primary"
      size="lg"
      disabled={!canEdit}
      title={canEdit ? undefined : 'Viewers cannot start a live session'}
      onClick={() => void goLive(day)}
    >
      <Radio aria-hidden />
      Go Live
    </Button>
  );
};

/**
 * The top of Today: the class that's live (resume it), or the next lesson
 * to teach with its four verbs, or — when nothing is scheduled — the way to
 * plan one. One card, the page's only white pill.
 */
export const NextUpCard = ({
  model,
  todayIso,
  firstClassroomId,
  countryFeatures,
  songsReady,
}: {
  model: TodayModel;
  todayIso: string;
  /** Where "plan a lesson" goes when nothing is scheduled. */
  firstClassroomId: string | null;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
}) => {
  const { pathname } = useLocation();

  if (model.live) {
    const { classroomId, className, sessionId } = model.live;
    return (
      <section aria-label="Live now" className={HERO}>
        <ClassCover classroomId={classroomId} className="w-24 sm:w-28" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <MicroLabel className="flex items-center gap-1.5 text-rose-300">
            <span aria-hidden className="size-1.5 rounded-full bg-rose-400" />
            Live now
          </MicroLabel>
          <h2 className={HERO_TITLE}>{className} is in session</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild variant="primary" size="lg">
              <Link to={TeacherRoutes.session({ classroomId, sessionId })}>
                <Radio aria-hidden />
                Back to the session
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const next = model.next;
  if (!next) {
    return (
      <section aria-label="Next class" className={HERO}>
        <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-daw-text-3 sm:size-28">
          <CalendarPlus aria-hidden className="size-8" strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <MicroLabel>Next class</MicroLabel>
          <h2 className={HERO_TITLE}>Nothing on the calendar yet</h2>
          <p className="text-[0.875rem] text-daw-text-2">
            Give a lesson a date and it will be waiting here, ready to present.
          </p>
          {firstClassroomId && (
            <div className="mt-1 flex flex-wrap gap-2">
              <Button asChild variant="primary" size="lg">
                <Link
                  to={TeacherRoutes.plan({ classroomId: firstClassroomId })}
                >
                  <CalendarPlus aria-hidden />
                  Plan a lesson
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link
                  to={TeacherRoutes.deckWizard({
                    classroomId: firstClassroomId,
                  })}
                >
                  <Sparkles aria-hidden />
                  Build a live deck
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const { classroomId, day } = next;
  return (
    <section aria-label="Next class" className={HERO}>
      <Link
        to={lessonInspectHref(pathname, classroomId, day.id)}
        className="w-28 shrink-0 sm:w-36"
        aria-label={`${day.label}: details`}
      >
        <LessonThumb
          day={day}
          countryFeatures={countryFeatures}
          songsReady={songsReady}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <MicroLabel>
          Next class — {capitalize(relativeDay(next.date, todayIso))} —{' '}
          {next.className}
        </MicroLabel>
        <h2 className={HERO_TITLE}>{day.label}</h2>
        <div>
          <StatusChip status={next.status} />
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          <GoLiveButton classroomId={classroomId} day={day} />
          <Button asChild size="lg">
            <Link to={TeacherRoutes.present({ classroomId, dayId: day.id })}>
              <Play aria-hidden />
              Present
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to={TeacherRoutes.dayPreview({ classroomId, dayId: day.id })}>
              <Eye aria-hidden />
              Preview
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to={TeacherRoutes.dayEditor({ classroomId, dayId: day.id })}>
              <Pencil aria-hidden />
              Edit
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
