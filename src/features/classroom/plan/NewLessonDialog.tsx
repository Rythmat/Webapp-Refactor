/**
 * NewLessonDialog — the single "New Lesson" flow. The teacher picks the Unit the
 * Lesson belongs to (defaulting to the current month's Unit) and a type (Blank /
 * Song Session / Genre Lesson), so every Lesson is assigned to a Unit on create.
 * Blank lessons are created + assigned + scheduled here and open in the editor;
 * Song/Genre carry `?template=&unit=` into the deck wizard, which assigns there.
 */
import { Music2, PlusCircle, Sparkles, X, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { useAnnualPlan } from '../annual/useAnnualPlan';
import { useThemeBank } from '../content/hooks';
import type { Unit } from '../types';
import { newBlankDay } from './newBlankDay';
import { defaultUnitIdFor } from './useEnsureLessonUnits';
import { useLocalPlan } from './useLocalPlan';

type LessonType = 'blank' | 'song' | 'genre';

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
  const { plan, addDayToUnit, suggestDayScheduleInUnit } =
    useAnnualPlan(classroomId);
  const { getDay, saveDay } = useLocalPlan();
  const { byId } = useThemeBank();

  const units = useMemo<Unit[]>(
    () =>
      plan
        ? [...plan.year.semesters.autumn, ...plan.year.semesters.spring]
        : [],
    [plan],
  );

  const [unitId, setUnitId] = useState('');
  const [type, setType] = useState<LessonType>('blank');

  // `defaultUnitIdFor` returns undefined when no Unit covers today's month; the
  // interactive create-flow still needs a default, so fall back to the first Unit.
  const effectiveUnitId =
    unitId || defaultUnitIdFor(units) || units[0]?.id || '';
  const unitLabel = (u: Unit) =>
    byId(u.theme?.themeId ?? '')?.title.en ?? u.label;

  const scheduleInUnit = (uid: string, dayId: string) => {
    const unit = units.find((u) => u.id === uid);
    const existing = (unit?.dayIds ?? [])
      .map((id) => getDay(id)?.scheduledDate)
      .filter((d): d is string => Boolean(d));
    const date = suggestDayScheduleInUnit(uid, existing, existing.length);
    if (date) {
      const day = getDay(dayId);
      if (day) saveDay({ ...day, scheduledDate: date });
    }
  };

  const handleCreate = () => {
    const uid = effectiveUnitId;
    if (!uid) return;
    onOpenChange(false);
    if (type === 'blank') {
      const day = newBlankDay();
      saveDay(day);
      addDayToUnit(uid, day.id);
      scheduleInUnit(uid, day.id);
      navigate(TeacherRoutes.dayEditor({ classroomId, dayId: day.id }));
      return;
    }
    navigate(
      `${TeacherRoutes.deckWizard({ classroomId })}?template=${type}&unit=${uid}`,
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New lesson"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">New Lesson</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-white/60">Unit</span>
          <select
            value={effectiveUnitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-white/25 focus:outline-none"
          >
            {units.length === 0 && <option value="">No units yet</option>}
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm text-white/60">Lesson type</legend>
          <TypeOption
            icon={PlusCircle}
            label="Blank Lesson"
            desc="An empty 5-phase lesson to build from scratch"
            active={type === 'blank'}
            onClick={() => setType('blank')}
          />
          <TypeOption
            icon={Music2}
            label="Song Session"
            desc="Interactive lesson built around a song"
            active={type === 'song'}
            onClick={() => setType('song')}
          />
          <TypeOption
            icon={Sparkles}
            label="Genre Lesson"
            desc="Guided lesson for a genre and level"
            active={type === 'genre'}
            onClick={() => setType('genre')}
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!effectiveUnitId}
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
