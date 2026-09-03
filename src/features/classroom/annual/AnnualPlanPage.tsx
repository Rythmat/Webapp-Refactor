/**
 * AnnualPlanPage — teacher year-view for a classroom's curriculum.
 *
 * Loads the classroom's annual plan from `useAnnualPlan(classroomId)`. When
 * empty, shows a "Start with the Music Atlas curriculum" CTA that seeds the
 * canonical Autumn+Spring tree. Once seeded, renders a Kanban-style timeline
 * calendar (`CalendarView`) with month navigation, semester quick-jumps, and
 * colored Unit bars that deep-link into the existing `UnitPage`.
 */
import { Settings, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
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
  const { saveDay, getDay, clearAllDays } = useLocalPlan();
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
    // Full restore: swap in a fresh canonical Unit tree, WIPE every authored Day
    // (clearing any corrupted/duplicated backlog), then re-materialize the
    // canonical curriculum. Order matters: the wipe must run before autoPopulate
    // so the fresh lesson days it creates aren't cleared. Published snapshots +
    // live sessions live in a separate store and are unaffected.
    const reseeded = resetToTemplate();
    clearAllDays();
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

  // Fill the canonical curriculum's day-stubs into the (already-seeded) Units
  // WITHOUT re-cloning — autoPopulate skips Units that already hold your Lessons,
  // so your own Lessons are preserved ("add alongside").
  const handlePopulate = () => {
    if (!plan) return;
    const result = autoPopulateFromTemplate(plan, {
      saveDay,
      addDayToUnit,
      getExistingUnitDates,
    });
    toast.success(
      `Canonical curriculum added — ${result.daysCreated} lesson days filled in.`,
    );
  };

  return (
    <div className="flex w-full flex-col gap-8 md:gap-10">
      {!plan ? (
        <>
          {/* No calendar toolbar yet, so keep Settings reachable in a header. */}
          <header className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowingSettings(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
              title="Classroom settings"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
          </header>
          <EmptyState onSeed={handleSeed} />
        </>
      ) : (
        <CalendarView
          classroomId={cid}
          plan={plan}
          language={language}
          nonSchoolMap={nonSchoolMap}
          onOpenSettings={() => setShowingSettings(true)}
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
        <ClassroomSettingsDialog
          onClose={() => setShowingSettings(false)}
          planSeeded={Boolean(plan)}
          language={language}
          onLanguageChange={setLanguage}
          onOpenSchoolCalendar={() => {
            setShowingSettings(false);
            setShowingSchoolCalendar(true);
          }}
          onUseCanonical={() => {
            setShowingSettings(false);
            handlePopulate();
          }}
          onReset={() => {
            setShowingSettings(false);
            setConfirmingReset(true);
          }}
        />
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
      <h3 className="text-lg font-medium">
        Reset to the canonical curriculum?
      </h3>
      <p className="text-sm text-white/70">
        This removes <strong>every lesson</strong> currently in this classroom
        and restores the Music Atlas starter curriculum — a fresh set of unit
        lessons auto-populated across your school days. This cannot be undone.
        To keep your current lessons, cancel and use Settings → “Download my
        plan” first.
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
