import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { Select } from '@/daw/ui/Select';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useActivityBank } from '@/features/classroom/content/hooks';
import type { Activity, LessonSeed } from '@/features/classroom/content/types';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { useTeacherConfig } from '@/features/classroom/settings/useTeacherConfig';
import { useCanEditClassroom, useMyClassrooms } from '@/hooks/data';
import { lessonFrom } from '../library/libraryModel';

const FIELD =
  'h-8 w-full rounded-[var(--daw-radius-md)] border border-white/10 bg-white/[0.03] px-3 text-[0.8125rem] text-daw-text [color-scheme:dark] focus:border-white/25 focus:outline-none';

/**
 * "Make a lesson from it": pick the class and (optionally) the day, and a
 * new lesson is written from the seed or activity and opened in the editor.
 * The day defaults to the class's next free school day, as New lesson does.
 */
export const MakeLessonForm = ({
  source,
}:
  | { source: { kind: 'seed'; seed: LessonSeed } }
  | { source: { kind: 'activity'; activity: Activity } }) => {
  const navigate = useNavigate();
  const { classrooms } = useMyClassrooms();
  const [picked, setPicked] = useState<string | null>(null);
  const cid = picked ?? classrooms[0]?.id ?? '';
  const { suggestLessonDate } = useAnnualPlan(cid);
  const { listDays, saveDay } = useLocalPlan(cid);
  const { config } = useTeacherConfig(cid);
  const { byId } = useActivityBank();
  const canEdit = useCanEditClassroom(cid);
  const [date, setDate] = useState<string | null>(null);

  if (classrooms.length === 0) {
    return (
      <p className={cn(TYPE_CLASS.body, 'text-daw-text-3')}>
        Make a class first, then lessons can be written from the Library.
      </p>
    );
  }

  const suggested = cid
    ? suggestLessonDate(
        listDays(cid)
          .map((d) => d.scheduledDate)
          .filter((d): d is string => Boolean(d)),
      )
    : null;
  const day = date ?? suggested ?? '';

  const make = () => {
    const lesson = lessonFrom(source, {
      classroomId: cid,
      date: day || null,
      resolveActivityId: byId,
      config: {
        localContextMode: config.localContextMode,
        tenantLocalContext: config.tenantLocalContext,
      },
    });
    saveDay(lesson);
    navigate(TeacherRoutes.dayEditor({ classroomId: cid, dayId: lesson.id }));
  };

  return (
    <section
      aria-label="Make a lesson from it"
      className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
    >
      <MicroLabel>Make a lesson from it</MicroLabel>
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
          value={day}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Button
        variant="primary"
        size="lg"
        disabled={!canEdit}
        title={canEdit ? undefined : 'Viewers cannot add lessons to this class'}
        onClick={make}
      >
        <CalendarPlus aria-hidden />
        Make the lesson
      </Button>
      <p className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
        It opens in the editor. To add an activity to a lesson you’re already
        writing, use Activity Bank there.
      </p>
    </section>
  );
};
