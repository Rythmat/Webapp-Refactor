/**
 * `useAnnualPlan(classroomId)` — local-first persistence for the teacher's
 * per-classroom year-view curriculum (Semester → Unit → dayId references)
 * plus per-classroom school-calendar exceptions.
 *
 * Modeled on `plan/useLocalPlan` (same schemaVersion + storage-event pattern,
 * same same-tab broadcast) but scoped by classroomId and holding the *tree*
 * — not raw Days. Days themselves still live in `useLocalPlan`; the annual
 * plan only stores `unit.dayIds` cross-references. This preserves the firewall
 * (no `CellPresentation` in the tree) and lets a Day belong to a Unit without
 * duplication.
 *
 * When Ryan ships `/classrooms/:cid/annual-plan`, swap `readStore`/`writeStore`
 * for React Query the same way Sprint 7 swapped `useEnrollments` /
 * `useAssignments`; the public API of this hook stays stable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Semester, Unit, Year } from '../types';
import {
  getNextNSchoolDays,
  resolveSchoolYear,
  resolveUnitDateRange,
} from './calendarMath';
import {
  type AnnualPlanTemplate,
  CANONICAL_ANNUAL_TEMPLATE,
  type UnitTemplate,
} from './curriculumTemplate';
import {
  EMPTY_EXCEPTIONS,
  getNonSchoolDatesForSchoolYear,
  type NonSchoolDay,
  type SchoolCalendarExceptions,
  toIsoDate,
} from './schoolCalendar';

export const STORAGE_KEY = 'ma-teacher:annualPlan:v1';
export const SCHEMA_VERSION = 1;

export interface ClassroomAnnualPlan {
  classroomId: string;
  year: Year;
  seededFromTemplateAt: string | null;
  updatedAt: string;
  /** Per-classroom school-calendar overrides. Defaults to empty on clone. */
  exceptions: SchoolCalendarExceptions;
}

export interface AnnualPlanStore {
  schemaVersion: number;
  plans: Record<string, ClassroomAnnualPlan>;
}

const EMPTY_STORE: AnnualPlanStore = {
  schemaVersion: SCHEMA_VERSION,
  plans: {},
};

const isBrowser = typeof window !== 'undefined';

/** Backfill `exceptions` on plans persisted before it was added. */
const normalizePlan = (p: ClassroomAnnualPlan): ClassroomAnnualPlan => ({
  ...p,
  exceptions: p.exceptions ?? {
    additions: [],
    removals: [],
  },
});

export const readAnnualPlanStore = (): AnnualPlanStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as AnnualPlanStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${STORAGE_KEY}.bak`, raw);
      return EMPTY_STORE;
    }
    const rawPlans = parsed.plans ?? {};
    const plans: Record<string, ClassroomAnnualPlan> = {};
    for (const [cid, p] of Object.entries(rawPlans)) {
      plans[cid] = normalizePlan(p as ClassroomAnnualPlan);
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      plans,
    };
  } catch {
    return EMPTY_STORE;
  }
};

export const writeAnnualPlanStore = (store: AnnualPlanStore): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(`${STORAGE_KEY}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op.
  }
};

const generateUnitId = (slug: string): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `unit-${slug}-${rand}`;
};

const generateYearId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `year-${Date.now().toString(36)}-${rand}`;
};

const unitFromTemplate = (t: UnitTemplate): Unit => ({
  id: generateUnitId(t.slug),
  label: t.label,
  monthIndex: t.monthIndex,
  theme: { themeId: t.themeId },
  weeks: [],
  dateWindow: t.dateWindow ?? null,
  dayIds: [],
});

export const cloneTemplate = (
  classroomId: string,
  template: AnnualPlanTemplate,
): ClassroomAnnualPlan => {
  const year: Year = {
    id: generateYearId(),
    label: template.label,
    semesters: {
      autumn: template.autumn.units.map(unitFromTemplate),
      spring: template.spring.units.map(unitFromTemplate),
    },
  };
  const nowIso = new Date().toISOString();
  return {
    classroomId,
    year,
    seededFromTemplateAt: nowIso,
    updatedAt: nowIso,
    exceptions: { additions: [], removals: [] },
  };
};

export interface UseAnnualPlan {
  plan: ClassroomAnnualPlan | null;
  /** Live non-school Map for the whole school year, honoring `exceptions`. */
  nonSchoolMap: Map<string, NonSchoolDay>;
  seedFromTemplate: () => ClassroomAnnualPlan;
  resetToTemplate: () => ClassroomAnnualPlan;
  clearPlan: () => void;
  addDayToUnit: (unitId: string, dayId: string) => void;
  removeDayFromUnit: (unitId: string, dayId: string) => void;
  addCustomUnit: (semester: Semester, unit: Unit) => void;
  renameUnit: (unitId: string, label: string) => void;
  /** "Use this theme for the unit" — copies the theme's focus / essential
   *  questions into editable unit-level metadata. Teacher-facing. */
  setUnitMeta: (
    unitId: string,
    meta: { overview?: string; essentialQuestions?: string[] },
  ) => void;
  /** Re-anchor a Unit's schedule (its fallback range + auto-populate ordering).
   *  `monthIndex` is 1-12. Used when a Unit is dragged to a new calendar date. */
  setUnitSchedule: (
    unitId: string,
    schedule: {
      monthIndex?: number;
      dateWindow?: { start: string; end: string } | null;
    },
  ) => void;
  deleteUnit: (unitId: string) => void;
  getUnit: (unitId: string) => { unit: Unit; semester: Semester } | null;
  /** Returns a suggested YYYY-MM-DD for the next Day in a unit, or null. */
  suggestDayScheduleInUnit: (
    unitId: string,
    existingScheduledDates: string[],
    totalPlanned: number,
  ) => string | null;
  addNonSchoolDate: (date: string, label: string) => void;
  removeNonSchoolDate: (date: string) => void;
  restoreDefaultNonSchoolDate: (date: string) => void;
}

export const findUnitLocation = (
  year: Year,
  unitId: string,
): { semester: Semester; index: number } | null => {
  for (const s of ['autumn', 'spring'] as const) {
    const idx = year.semesters[s].findIndex((u) => u.id === unitId);
    if (idx !== -1) return { semester: s, index: idx };
  }
  return null;
};

export const useAnnualPlan = (classroomId: string): UseAnnualPlan => {
  const [store, setStore] = useState<AnnualPlanStore>(() =>
    readAnnualPlanStore(),
  );

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setStore(readAnnualPlanStore());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener(`${STORAGE_KEY}:changed`, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(`${STORAGE_KEY}:changed`, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const plan = classroomId ? (store.plans[classroomId] ?? null) : null;

  const nonSchoolMap = useMemo(() => {
    if (!plan) {
      // No plan yet — still expose weekend + default holidays so callers can
      // render sensibly. Use "today" to resolve the school year.
      const today = new Date();
      return getNonSchoolDatesForSchoolYear(
        resolveSchoolYear(today),
        EMPTY_EXCEPTIONS,
      );
    }
    const today = new Date();
    return getNonSchoolDatesForSchoolYear(
      resolveSchoolYear(today),
      plan.exceptions,
    );
  }, [plan]);

  const persistPlan = useCallback((nextPlan: ClassroomAnnualPlan): void => {
    const current = readAnnualPlanStore();
    const next: AnnualPlanStore = {
      ...current,
      plans: { ...current.plans, [nextPlan.classroomId]: nextPlan },
    };
    writeAnnualPlanStore(next);
    setStore(next);
  }, []);

  const seedFromTemplate = useCallback((): ClassroomAnnualPlan => {
    const seeded = cloneTemplate(classroomId, CANONICAL_ANNUAL_TEMPLATE);
    persistPlan(seeded);
    return seeded;
  }, [classroomId, persistPlan]);

  const resetToTemplate = useCallback((): ClassroomAnnualPlan => {
    const reseeded = cloneTemplate(classroomId, CANONICAL_ANNUAL_TEMPLATE);
    persistPlan(reseeded);
    return reseeded;
  }, [classroomId, persistPlan]);

  const clearPlan = useCallback((): void => {
    const current = readAnnualPlanStore();
    if (!(classroomId in current.plans)) return;
    const nextPlans = { ...current.plans };
    delete nextPlans[classroomId];
    const next: AnnualPlanStore = { ...current, plans: nextPlans };
    writeAnnualPlanStore(next);
    setStore(next);
  }, [classroomId]);

  const mutateUnit = useCallback(
    (unitId: string, updater: (u: Unit) => Unit): void => {
      const current = readAnnualPlanStore();
      const existing = current.plans[classroomId];
      if (!existing) return;
      const loc = findUnitLocation(existing.year, unitId);
      if (!loc) return;
      const semUnits = existing.year.semesters[loc.semester].slice();
      semUnits[loc.index] = updater(semUnits[loc.index]);
      const nextPlan: ClassroomAnnualPlan = {
        ...existing,
        year: {
          ...existing.year,
          semesters: {
            ...existing.year.semesters,
            [loc.semester]: semUnits,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      persistPlan(nextPlan);
    },
    [classroomId, persistPlan],
  );

  const addDayToUnit = useCallback(
    (unitId: string, dayId: string): void => {
      mutateUnit(unitId, (u) => {
        const existing = u.dayIds ?? [];
        if (existing.includes(dayId)) return u;
        return { ...u, dayIds: [...existing, dayId] };
      });
    },
    [mutateUnit],
  );

  const removeDayFromUnit = useCallback(
    (unitId: string, dayId: string): void => {
      mutateUnit(unitId, (u) => {
        const existing = u.dayIds ?? [];
        if (!existing.includes(dayId)) return u;
        return { ...u, dayIds: existing.filter((id) => id !== dayId) };
      });
    },
    [mutateUnit],
  );

  const addCustomUnit = useCallback(
    (semester: Semester, unit: Unit): void => {
      const current = readAnnualPlanStore();
      const existing = current.plans[classroomId];
      if (!existing) return;
      const nextPlan: ClassroomAnnualPlan = {
        ...existing,
        year: {
          ...existing.year,
          semesters: {
            ...existing.year.semesters,
            [semester]: [...existing.year.semesters[semester], unit],
          },
        },
        updatedAt: new Date().toISOString(),
      };
      persistPlan(nextPlan);
    },
    [classroomId, persistPlan],
  );

  const renameUnit = useCallback(
    (unitId: string, label: string): void => {
      mutateUnit(unitId, (u) => ({ ...u, label }));
    },
    [mutateUnit],
  );

  const setUnitMeta = useCallback(
    (
      unitId: string,
      meta: { overview?: string; essentialQuestions?: string[] },
    ): void => {
      mutateUnit(unitId, (u) => ({ ...u, ...meta }));
    },
    [mutateUnit],
  );

  const setUnitSchedule = useCallback(
    (
      unitId: string,
      schedule: {
        monthIndex?: number;
        dateWindow?: { start: string; end: string } | null;
      },
    ): void => {
      mutateUnit(unitId, (u) => ({ ...u, ...schedule }));
    },
    [mutateUnit],
  );

  const deleteUnit = useCallback(
    (unitId: string): void => {
      const current = readAnnualPlanStore();
      const existing = current.plans[classroomId];
      if (!existing) return;
      const loc = findUnitLocation(existing.year, unitId);
      if (!loc) return;
      const semUnits = existing.year.semesters[loc.semester]
        .slice()
        .filter((u) => u.id !== unitId);
      const nextPlan: ClassroomAnnualPlan = {
        ...existing,
        year: {
          ...existing.year,
          semesters: {
            ...existing.year.semesters,
            [loc.semester]: semUnits,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      persistPlan(nextPlan);
    },
    [classroomId, persistPlan],
  );

  const getUnit = useCallback(
    (unitId: string): { unit: Unit; semester: Semester } | null => {
      if (!plan) return null;
      const loc = findUnitLocation(plan.year, unitId);
      if (!loc) return null;
      return {
        unit: plan.year.semesters[loc.semester][loc.index],
        semester: loc.semester,
      };
    },
    [plan],
  );

  const suggestDayScheduleInUnit = useCallback(
    (
      unitId: string,
      existingScheduledDates: string[],
      _totalPlanned: number,
    ): string | null => {
      if (!plan) return null;
      const loc = findUnitLocation(plan.year, unitId);
      if (!loc) return null;
      const unit = plan.year.semesters[loc.semester][loc.index];
      const today = new Date();
      const schoolYear = resolveSchoolYear(today);

      // Chained-sequential semantics: a Unit is a run of consecutive school
      // days. The next Day should chain after the LATEST existing scheduled
      // date. If nothing exists yet, anchor at the Unit's natural start.
      const taken = new Set(existingScheduledDates);
      const parse = (iso: string): Date => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
      };
      const sorted = [...existingScheduledDates].sort();
      const anchor =
        sorted.length > 0
          ? (() => {
              const last = parse(sorted[sorted.length - 1]);
              last.setDate(last.getDate() + 1);
              return last;
            })()
          : resolveUnitDateRange(unit, schoolYear).start;

      // Walk forward from anchor and pick the first school day not already
      // taken. Bounded to 30 candidates so a fully-booked Unit fails fast.
      const candidates = getNextNSchoolDays(anchor, 30, nonSchoolMap);
      const next = candidates.find((d) => !taken.has(toIsoDate(d)));
      return next ? toIsoDate(next) : null;
    },
    [plan, nonSchoolMap],
  );

  const mutateExceptions = useCallback(
    (
      updater: (e: SchoolCalendarExceptions) => SchoolCalendarExceptions,
    ): void => {
      const current = readAnnualPlanStore();
      const existing = current.plans[classroomId];
      if (!existing) return;
      const nextPlan: ClassroomAnnualPlan = {
        ...existing,
        exceptions: updater(existing.exceptions),
        updatedAt: new Date().toISOString(),
      };
      persistPlan(nextPlan);
    },
    [classroomId, persistPlan],
  );

  const addNonSchoolDate = useCallback(
    (date: string, label: string): void => {
      mutateExceptions((ex) => ({
        additions: [
          ...ex.additions.filter((a) => a.date !== date),
          { date, label, kind: 'custom' },
        ],
        removals: ex.removals,
      }));
    },
    [mutateExceptions],
  );

  const removeNonSchoolDate = useCallback(
    (date: string): void => {
      mutateExceptions((ex) => {
        // Custom additions: strip the row entirely.
        const wasCustom = ex.additions.some((a) => a.date === date);
        if (wasCustom) {
          return {
            additions: ex.additions.filter((a) => a.date !== date),
            removals: ex.removals,
          };
        }
        // Default row: add to removals.
        if (ex.removals.includes(date)) return ex;
        return {
          additions: ex.additions,
          removals: [...ex.removals, date],
        };
      });
    },
    [mutateExceptions],
  );

  const restoreDefaultNonSchoolDate = useCallback(
    (date: string): void => {
      mutateExceptions((ex) => ({
        additions: ex.additions,
        removals: ex.removals.filter((r) => r !== date),
      }));
    },
    [mutateExceptions],
  );

  return {
    plan,
    nonSchoolMap,
    seedFromTemplate,
    resetToTemplate,
    clearPlan,
    addDayToUnit,
    removeDayFromUnit,
    addCustomUnit,
    renameUnit,
    setUnitMeta,
    setUnitSchedule,
    deleteUnit,
    getUnit,
    suggestDayScheduleInUnit,
    addNonSchoolDate,
    removeNonSchoolDate,
    restoreDefaultNonSchoolDate,
  };
};
