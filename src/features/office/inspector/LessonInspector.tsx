import { Eye, Pencil, Play, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useWeekGridData } from '@/features/classroom/annual/useWeekGridData';
import { useGoLive } from '@/features/classroom/live/useGoLive';
import { LessonThumb } from '@/features/classroom/plan/LessonThumb';
import { StatusChip } from '@/features/classroom/plan/lessonStatus';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import {
  SECTIONS,
  groupSlidesBySection,
} from '@/features/classroom/slides/sections';
import { useCanEditClassroom, useClassroom } from '@/hooks/data';
import { relativeDay } from '../today/todayModel';

/**
 * A lesson in the Inspector, as Common Planner's lesson drawer: its picture,
 * when and where it's taught, its state, what's in it, and the four verbs
 * (Go Live, Present, Preview, Edit) without leaving the page it was opened
 * from.
 */
export const LessonInspector = ({
  classroomId,
  dayId,
}: {
  classroomId: string;
  dayId: string;
}) => {
  const { getDay } = useLocalPlan(classroomId);
  const { data: classroom } = useClassroom(classroomId);
  const grid = useWeekGridData(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  const goLive = useGoLive(classroomId);
  const day = getDay(dayId);

  if (!day) {
    return (
      <EmptyState
        title="This lesson isn't here"
        description="It may have been deleted, or it was made on another device."
      />
    );
  }

  const { status, assignment } = grid.statusFor(day);
  const slides = day.deck?.slides.length ?? 0;
  const sectionsUsed = groupSlidesBySection(day.deck?.slides ?? []).filter(
    (g) => g.slides.length > 0,
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 [scrollbar-width:thin]">
      <div className="mx-auto w-full max-w-48">
        <LessonThumb
          day={day}
          countryFeatures={grid.countryFeatures}
          songsReady={grid.songsReady}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[1.125rem] font-semibold leading-6 text-daw-text">
          {day.label}
        </h3>
        <p className={cn(TYPE_CLASS.body, 'text-daw-text-2')}>
          {classroom?.name ?? 'Class'}
          {day.scheduledDate
            ? ` · ${capitalize(relativeDay(day.scheduledDate, grid.todayIso))}`
            : ' · Not scheduled'}
        </p>
        <div>
          <StatusChip status={status} dueAt={assignment?.dueAt} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06]">
        <Fact label="Slides" value={slides > 0 ? String(slides) : '—'} />
        <Fact
          label="Sections"
          value={`${sectionsUsed} of ${SECTIONS.length}`}
        />
      </div>

      <div className="flex flex-col gap-2">
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
        <div className="grid grid-cols-3 gap-2">
          <Button asChild size="lg">
            <Link to={TeacherRoutes.present({ classroomId, dayId })}>
              <Play aria-hidden />
              Present
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to={TeacherRoutes.dayPreview({ classroomId, dayId })}>
              <Eye aria-hidden />
              Preview
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to={TeacherRoutes.dayEditor({ classroomId, dayId })}>
              <Pencil aria-hidden />
              Edit
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 bg-daw-surface-1 px-3 py-2.5">
    <MicroLabel>{label}</MicroLabel>
    <span className="text-[1.125rem] tabular-nums text-daw-text">{value}</span>
  </div>
);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
