/**
 * AnnualPlanPage — teacher year-view for a classroom's curriculum.
 *
 * Loads the classroom's annual plan from `useAnnualPlan(classroomId)`. When
 * empty, shows a "Start with the Music Atlas curriculum" CTA that seeds the
 * canonical Autumn+Spring tree. Once seeded, renders a Kanban-style timeline
 * calendar (`CalendarView`) with month navigation, semester quick-jumps, and
 * colored Unit bars that deep-link into the existing `UnitPage`.
 */
import {
  BookOpen,
  CalendarClock,
  RotateCcw,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useClassroom } from '@/hooks/data';
import { useLocalPlan } from '../plan/useLocalPlan';
import { ClassroomSettingsDialog } from '../settings/ClassroomSettingsDialog';
import type { StudentLanguage } from '../types';
import { CalendarView } from './CalendarView';
import { SchoolCalendarDialog } from './SchoolCalendarDialog';
import { autoPopulateFromTemplate } from './stubMaterialization';
import { useAnnualPlan } from './useAnnualPlan';

export const AnnualPlanPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { data: classroom } = useClassroom(cid);
  const {
    plan,
    seedFromTemplate,
    resetToTemplate,
    addDayToUnit,
    nonSchoolMap,
    addNonSchoolDate,
    removeNonSchoolDate,
    restoreDefaultNonSchoolDate,
  } = useAnnualPlan(cid);
  const { saveDay, getDay } = useLocalPlan();
  const [language, setLanguage] = useState<StudentLanguage>('en');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [showingSchoolCalendar, setShowingSchoolCalendar] = useState(false);
  const [showingSettings, setShowingSettings] = useState(false);

  // Read the scheduled ISO dates from Units that already have Days so the
  // chained-sequential auto-populate can skip past them without overlap. On
  // a fresh seed this always returns [] (dayIds are empty), but it's the
  // safety net for any future "populate missing Units" flow.
  const getExistingUnitDates = (unitId: string): string[] => {
    if (!plan) return [];
    const allUnits = [
      ...plan.year.semesters.autumn,
      ...plan.year.semesters.spring,
    ];
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return [];
    return (unit.dayIds ?? [])
      .map((id) => getDay(id))
      .map((d) => d?.scheduledDate ?? null)
      .filter((iso): iso is string => Boolean(iso));
  };

  const handleSeed = () => {
    const seeded = seedFromTemplate();
    const result = autoPopulateFromTemplate(seeded, {
      saveDay,
      addDayToUnit,
      getExistingUnitDates,
    });
    toast.success(
      `Annual plan seeded — ${result.daysCreated} lesson days added to your calendar.`,
    );
  };

  const handleReset = () => {
    const reseeded = resetToTemplate();
    const result = autoPopulateFromTemplate(reseeded, {
      saveDay,
      addDayToUnit,
      getExistingUnitDates,
    });
    setConfirmingReset(false);
    toast.success(
      `Annual plan reset — ${result.daysCreated} fresh lesson days added.`,
    );
  };

  return (
    <div className="flex w-full flex-col gap-8 md:gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <BookOpen className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
            <h1 className="text-xl font-medium text-white md:text-2xl">
              Annual Plan
            </h1>
          </div>
          <p className="text-sm text-white/60">
            A year of lessons for {classroom?.name ?? 'your classroom'} — two
            semesters, monthly units, themes to anchor each stretch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowingSettings(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
            title="Classroom settings"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          {plan && (
            <>
              <LanguageToggle value={language} onChange={setLanguage} />
              <button
                type="button"
                onClick={() => setShowingSchoolCalendar(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
              title="Edit school calendar (holidays + breaks)"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              School calendar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-red-400/40 hover:text-red-200"
              title="Reset to canonical template"
            >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to template
              </button>
            </>
          )}
        </div>
      </header>

      {!plan ? (
        <EmptyState onSeed={handleSeed} />
      ) : (
        <CalendarView
          classroomId={cid}
          plan={plan}
          language={language}
          nonSchoolMap={nonSchoolMap}
        />
      )}

      {confirmingReset && (
        <ResetConfirmDialog
          onConfirm={handleReset}
          onCancel={() => setConfirmingReset(false)}
        />
      )}

      {showingSchoolCalendar && plan && (
        <SchoolCalendarDialog
          exceptions={plan.exceptions}
          onAdd={addNonSchoolDate}
          onRemove={removeNonSchoolDate}
          onRestore={restoreDefaultNonSchoolDate}
          onClose={() => setShowingSchoolCalendar(false)}
        />
      )}

      {showingSettings && (
        <ClassroomSettingsDialog onClose={() => setShowingSettings(false)} />
      )}
    </div>
  );
};

interface EmptyStateProps {
  onSeed: () => void;
}

const EmptyState = ({ onSeed }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <Sparkles className="h-8 w-8 text-white/70" />
    <div className="flex max-w-lg flex-col gap-2">
      <h2 className="text-xl font-medium text-white">
        Start with the Music Atlas curriculum
      </h2>
      <p className="text-sm text-white/60">
        A full year of themed units — Hispanic Heritage Month, Día de los
        Muertos, Compassion, Identity, Black History Month, Women&apos;s
        History, and more — with lesson-day stubs already sketched. Everything
        stays editable.
      </p>
    </div>
    <button
      type="button"
      onClick={onSeed}
      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <Sparkles className="h-4 w-4" />
      Use the canonical curriculum
    </button>
  </div>
);

interface LanguageToggleProps {
  value: StudentLanguage;
  onChange: (v: StudentLanguage) => void;
}

const LanguageToggle = ({ value, onChange }: LanguageToggleProps) => {
  const options: { value: StudentLanguage; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'es', label: 'ES' },
    { value: 'both', label: 'EN / ES' },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            opt.value === value
              ? 'bg-white text-black'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

interface ResetConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetConfirmDialog = ({ onConfirm, onCancel }: ResetConfirmProps) => (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    onClick={onCancel}
  >
    <div
      className="flex max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-medium">Reset to canonical template?</h3>
      <p className="text-sm text-white/70">
        The Unit tree will revert to the Music Atlas starter curriculum, and a
        fresh set of lesson Days will be auto-populated across the school days.
        Any Days you authored before stay in Plan Days but become unlinked from
        the tree.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
);
