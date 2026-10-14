/**
 * NewLessonDialog — the single "New Lesson" flow. The teacher picks the date
 * the Lesson goes on the calendar (defaulting to the next free school day) and
 * a type (Blank / Generate from Cortex). Blank lessons are created + scheduled
 * here and open in the editor; Generate carries `?date=` into the lesson
 * generator, which schedules there.
 */
import { PlusCircle, Waypoints, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { useCanEditClassroom } from '@/hooks/data';
import { useAnnualPlan } from '../annual/useAnnualPlan';
import { newBlankDay } from './newBlankDay';
import { useLocalPlan } from './useLocalPlan';

type LessonType = 'blank' | 'cortex';

interface NewLessonDialogProps {
  classroomId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewLessonDialog = ({
  classroomId,
  isOpen,
  onOpenChange,
}: NewLessonDialogProps) => {
  const navigate = useNavigate();
  const { suggestLessonDate } = useAnnualPlan(classroomId);
  const { listDays, saveDay: saveDayRaw } = useLocalPlan(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  const saveDay = canEdit ? saveDayRaw : () => {};

  const [date, setDate] = useState('');
  const [type, setType] = useState<LessonType>('blank');

  // Until the teacher picks a date, default to the next school day that has
  // no lesson yet. Cleared → the lesson is created unscheduled.
  const [touched, setTouched] = useState(false);
  const suggested = isOpen
    ? suggestLessonDate(
        listDays(classroomId)
          .map((d) => d.scheduledDate)
          .filter((d): d is string => Boolean(d)),
      )
    : null;
  const effectiveDate = touched ? date : (suggested ?? '');

  const close = () => {
    setTouched(false);
    onOpenChange(false);
  };

  const handleCreate = () => {
    close();
    if (type === 'blank') {
      const day = newBlankDay();
      saveDay({ ...day, scheduledDate: effectiveDate || null });
      navigate(TeacherRoutes.dayEditor({ classroomId, dayId: day.id }));
      return;
    }
    const query = effectiveDate ? `?date=${effectiveDate}` : '';
    navigate(`${TeacherRoutes.deckWizard({ classroomId })}${query}`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New lesson"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={close}
    >
      <div
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">New Lesson</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-white/60">Date</span>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => {
              setTouched(true);
              setDate(e.target.value);
            }}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-white/25 focus:outline-none"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm text-white/60">Lesson type</legend>
          <TypeOption
            icon={Waypoints}
            label="Generate from Cortex"
            desc="An artist or place from the Atlas, a group project, and time for students' own work"
            active={type === 'cortex'}
            onClick={() => setType('cortex')}
          />
          <TypeOption
            icon={PlusCircle}
            label="Blank Lesson"
            desc="The five parts with general slides, to build yourself"
            active={type === 'blank'}
            onClick={() => setType('blank')}
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canEdit}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:opacity-50"
          >
            Create Lesson
          </button>
        </div>
      </div>
    </div>
  );
};

interface TypeOptionProps {
  icon: LucideIcon;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}

const TypeOption = ({
  icon: Icon,
  label,
  desc,
  active,
  onClick,
}: TypeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
      active
        ? 'border-white/25 bg-white/[0.06]'
        : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]',
    )}
  >
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/70" />
    <span className="flex flex-col">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-xs text-white/50">{desc}</span>
    </span>
  </button>
);
