/**
 * UnitPage — inside a single Unit of the Annual Plan.
 *
 * Shows the resolved theme (title + focus + essential questions + suggested
 * artists) at the top. Below: the Days that live in this unit — a mix of
 * *real* Days (already in `useLocalPlan`) and *stub* Days from the canonical
 * template (not yet materialized). "Add this Day" mints a fresh Day via
 * `newBlankDay()`, seeds each phase cell's `presentation.prompt` from the
 * stub's per-phase seeds, saves it, and links it into the unit via
 * `addDayToUnit`.
 *
 * Custom Days (teacher-authored, no stub source) also land here. They open
 * the existing `DayEditor` for editing, and Publish + Assign continues to flow
 * through the unchanged `PlanPage` pipeline.
 */
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TeacherRoutes } from '@/constants/routes';
import { useThemeBank } from '../content/hooks';
import { PHASES, STUDENT_PHASE_LABELS } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import { useLocalPlan } from '../plan/useLocalPlan';
import type { Day } from '../types';
import { CANONICAL_ANNUAL_TEMPLATE, type DayStub } from './curriculumTemplate';
import { findStubsForUnitId, seededDayFromStub } from './stubMaterialization';
import { useAnnualPlan } from './useAnnualPlan';

const MONTH_NAMES: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

export const UnitPage = () => {
  const { classroomId, unitId } = useParams<{
    classroomId: string;
    unitId: string;
  }>();
  const cid = classroomId ?? '';
  const uid = unitId ?? '';
  const navigate = useNavigate();

  const {
    plan,
    getUnit,
    addDayToUnit,
    removeDayFromUnit,
    suggestDayScheduleInUnit,
  } = useAnnualPlan(cid);
  const { getDay, saveDay, deleteDay } = useLocalPlan();
  const { byId } = useThemeBank();

  const located = getUnit(uid);
  const unit = located?.unit;
  const theme = unit?.theme ? byId(unit.theme.themeId) : undefined;

  const stubs = useMemo(() => findStubsForUnitId(uid), [uid]);

  const daysInUnit = useMemo(() => {
    if (!unit?.dayIds) return [];
    return unit.dayIds
      .map((id) => getDay(id))
      .filter((d): d is Day => Boolean(d));
  }, [unit, getDay]);

  const remainingStubs = useMemo(() => {
    // A stub is "remaining" if no Day in this unit was labeled with its label
    // — this is a soft dedupe so re-adding after rename still works predictably.
    const usedLabels = new Set(daysInUnit.map((d) => d.label));
    return stubs.filter((s) => !usedLabels.has(s.label));
  }, [stubs, daysInUnit]);

  const scheduledDates = useMemo(
    () =>
      daysInUnit
        .map((d) => d.scheduledDate)
        .filter((d): d is string => Boolean(d)),
    [daysInUnit],
  );

  const handleAddFromStub = (stub: DayStub) => {
    const day = seededDayFromStub(stub);
    const totalPlanned = Math.max(stubs.length, daysInUnit.length + 1);
    const suggested = suggestDayScheduleInUnit(
      uid,
      scheduledDates,
      totalPlanned,
    );
    const scheduledDay: Day = { ...day, scheduledDate: suggested };
    saveDay(scheduledDay);
    addDayToUnit(uid, scheduledDay.id);
    toast.success(
      suggested
        ? `Added "${stub.label}" for ${suggested}.`
        : `Added "${stub.label}" (no school day available in the unit's range).`,
    );
  };

  const handleAddCustom = () => {
    const day = newBlankDay();
    const totalPlanned = Math.max(stubs.length, daysInUnit.length + 1);
    const suggested = suggestDayScheduleInUnit(
      uid,
      scheduledDates,
      totalPlanned,
    );
    const scheduledDay: Day = { ...day, scheduledDate: suggested };
    saveDay(scheduledDay);
    addDayToUnit(uid, scheduledDay.id);
    navigate(
      TeacherRoutes.dayEditor({ classroomId: cid, dayId: scheduledDay.id }),
    );
  };

  const handleChangeDayDate = (day: Day, newDate: string) => {
    saveDay({ ...day, scheduledDate: newDate || null });
  };

  const handleUnlink = (dayId: string, dayLabel: string) => {
    if (
      window.confirm(
        `Remove "${dayLabel}" from this unit? The Day itself stays in Plan Days.`,
      )
    ) {
      removeDayFromUnit(uid, dayId);
    }
  };

  const handleDeleteDay = (dayId: string, dayLabel: string) => {
    if (
      window.confirm(
        `Delete "${dayLabel}" completely? This removes it from Plan Days too and cannot be undone.`,
      )
    ) {
      removeDayFromUnit(uid, dayId);
      deleteDay(dayId);
    }
  };

  if (!plan) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">
          Annual plan not seeded yet for this classroom.
        </p>
        <Link
          to={TeacherRoutes.annualPlan({ classroomId: cid })}
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Annual Plan
        </Link>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">Unit not found.</p>
        <Link
          to={TeacherRoutes.annualPlan({ classroomId: cid })}
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Annual Plan
        </Link>
      </div>
    );
  }

  const monthLabel = MONTH_NAMES[unit.monthIndex] ?? unit.label;
  // Prefer the ACTUAL scheduled span so the header matches the Day cards
  // shown below — even if the chained-sequential auto-populate pushed this
  // Unit outside its declared window. Falls back to the declared window
  // when the Unit has no scheduled Days yet.
  const dateWindowLabel = ((): string => {
    if (scheduledDates.length > 0) {
      const sorted = [...scheduledDates].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return first === last ? first : `${first} → ${last}`;
    }
    if (unit.dateWindow)
      return `${unit.dateWindow.start} → ${unit.dateWindow.end}`;
    return monthLabel;
  })();
  const unitTemplate = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ].find((u) => uid.startsWith(`unit-${u.slug}-`));
  const kind = unitTemplate?.kind ?? 'heritage';
  const kindLabel: Record<typeof kind, string> = {
    heritage: 'Heritage',
    genre: 'Genre',
    location: 'Location',
  };
  const focusText =
    unitTemplate?.focusGenre ??
    unitTemplate?.focusLocation ??
    unitTemplate?.focusEra ??
    '';

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-6 md:gap-10 md:px-10 md:py-10">
      <Link
        to={TeacherRoutes.annualPlan({ classroomId: cid })}
        className="inline-flex w-fit items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Annual Plan
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-white/40">
          <BookOpen className="h-3.5 w-3.5" />
          {dateWindowLabel}
          <span className="text-white/20">·</span>
          <span>{located?.semester === 'autumn' ? 'Autumn' : 'Spring'}</span>
          <span className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-white/70">
            {kindLabel[kind]}
            {focusText ? ` · ${focusText}` : ''}
          </span>
        </div>
        <h1 className="text-3xl font-medium leading-tight text-white md:text-4xl">
          {theme?.title.en ?? unit.label}
        </h1>
        {theme?.title.es && (
          <p className="text-sm italic text-white/50">{theme.title.es}</p>
        )}
        {theme?.focus && (
          <p className="max-w-3xl text-base text-white/70">{theme.focus}</p>
        )}
        {theme?.essentialQuestions && theme.essentialQuestions.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-white/60">
            {theme.essentialQuestions.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="text-white/30">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        )}
        {theme?.suggestedArtists && theme.suggestedArtists.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {theme.suggestedArtists.map((a) => (
              <span
                key={a}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white/70"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm uppercase tracking-wide text-white/50">
            Days in this unit
          </h2>
          <button
            type="button"
            onClick={handleAddCustom}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom Day
          </button>
        </div>

        {daysInUnit.length === 0 && remainingStubs.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-white/50">
            No Days here yet. Use “Add custom Day” to author one from scratch.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {daysInUnit.map((day) => (
              <li
                key={day.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-300/70">
                      Planned
                    </span>
                    <span className="text-base font-medium text-white">
                      {day.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={TeacherRoutes.dayEditor({
                        classroomId: cid,
                        dayId: day.id,
                      })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white"
                      aria-label={`Edit ${day.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnlink(day.id, day.label)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                      aria-label={`Remove ${day.label} from this unit`}
                      title="Remove from unit (keeps the Day in Plan Days)"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDay(day.id, day.label)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-red-300"
                      aria-label={`Delete ${day.label}`}
                      title="Delete Day entirely"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <label
                    htmlFor={`date-${day.id}`}
                    className="text-[10px] uppercase tracking-wide text-white/40"
                  >
                    Scheduled
                  </label>
                  <input
                    id={`date-${day.id}`}
                    type="date"
                    value={day.scheduledDate ?? ''}
                    onChange={(e) => handleChangeDayDate(day, e.target.value)}
                    className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white/80 outline-none focus:border-white/30"
                  />
                </div>
                <Link
                  to={TeacherRoutes.dayEditor({
                    classroomId: cid,
                    dayId: day.id,
                  })}
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/85"
                >
                  Open in editor
                </Link>
              </li>
            ))}

            {remainingStubs.map((stub) => (
              <li
                key={stub.slug}
                className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.01] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-white/40">
                      Suggested
                    </span>
                    <span className="text-base font-medium text-white/90">
                      {stub.label}
                    </span>
                  </div>
                  <Sparkles className="mt-1 h-4 w-4 text-white/30" />
                </div>
                <SeedNotesPreview seeds={stub.phaseSeeds} />
                <button
                  type="button"
                  onClick={() => handleAddFromStub(stub)}
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/80 hover:border-white/30 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add this Day
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

interface SeedNotesPreviewProps {
  seeds: DayStub['phaseSeeds'];
}

const SeedNotesPreview = ({ seeds }: SeedNotesPreviewProps) => (
  <ul className="flex flex-col gap-1.5 text-xs">
    {PHASES.map((phase) => {
      const seed = seeds[phase];
      if (!seed) return null;
      return (
        <li key={phase} className="flex gap-2">
          <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-white/40">
            {STUDENT_PHASE_LABELS[phase].en}
          </span>
          <span className="line-clamp-2 text-white/70">{seed.en}</span>
        </li>
      );
    })}
  </ul>
);
