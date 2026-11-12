import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { Select } from '@/daw/ui/Select';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import type { Day } from '@/features/classroom/types';
import { useCanEditClassroom, useMyClassrooms } from '@/hooks/data';
import { inspectSearch } from '../frame/useOfficeInspector';
import { copyLessonToClass } from '../lessons/builtInLessons';

const FIELD =
  'h-8 w-full rounded-[var(--daw-radius-md)] border border-white/10 bg-white/[0.03] px-3 text-[0.8125rem] text-daw-text [color-scheme:dark] focus:border-white/25 focus:outline-none';

/**
 * "Teach to a class": a lesson from the Lessons tab is copied into one of the
 * teacher's classes on a day (the class's next free school day by default),
 * and opens there, where Go Live works. The Lessons tab keeps its own.
 */
export const TeachLessonForm = ({ day }: { day: Day }) => {
  const navigate = useNavigate();
  const { classrooms } = useMyClassrooms();
  const [picked, setPicked] = useState<string | null>(null);
  const cid = picked ?? classrooms[0]?.id ?? '';
  const { suggestLessonDate } = useAnnualPlan(cid);
  const { listDays, saveDay } = useLocalPlan(cid);
  const canEdit = useCanEditClassroom(cid);
  const [date, setDate] = useState<string | null>(null);

  if (classrooms.length === 0) {
    return (
      <section
        aria-label="Teach to a class"
        className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <MicroLabel>Teach to a class</MicroLabel>
        <p className={cn(TYPE_CLASS.body, 'text-daw-text-3')}>
          Make a class first, then this lesson can go on its plan.
        </p>
        <Button asChild size="lg">
          <Link to={OfficeRoutes.classes()}>Go to Classes</Link>
        </Button>
      </section>
    );
  }

  const suggested = cid
    ? suggestLessonDate(
        listDays(cid)
          .map((d) => d.scheduledDate)
          .filter((d): d is string => Boolean(d)),
      )
    : null;
  const when = date ?? suggested ?? '';

  const teach = () => {
    const lesson = copyLessonToClass(day, cid, when || null);
    saveDay(lesson);
    navigate(
      `${TeacherRoutes.plan({ classroomId: cid })}${inspectSearch({
        kind: 'lesson',
        classroomId: cid,
        id: lesson.id,
      })}`,
    );
  };

  return (
    <section
      aria-label="Teach to a class"
      className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
    >
      <MicroLabel>Teach to a class</MicroLabel>
      <div className="grid grid-cols-2 gap-2">
        <Select
          label="Class"
          size="sm"
          value={cid}
          onValueChange={(v) => {
            setPicked(v);
            setDate(null);
          }}
          options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
        />
        <input
          type="date"
          aria-label="Day"
          className={FIELD}
          value={when}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Button
        variant="primary"
        size="lg"
        disabled={!canEdit}
        title={canEdit ? undefined : 'Viewers cannot add lessons to this class'}
        onClick={teach}
      >
        <GraduationCap aria-hidden />
        Add to the class
      </Button>
      <p className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
        It goes on the class’s plan, where you can go live.
      </p>
    </section>
  );
};
