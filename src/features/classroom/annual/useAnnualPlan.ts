/**
 * `useAnnualPlan(classroomId)` — local-first persistence for a classroom's
 * school calendar: the per-classroom exceptions (added / removed non-school
 * days) layered over the default holidays and breaks.
 *
 * Lessons are not referenced here: a Day sits on the calendar by its own
 * `scheduledDate`. The stored plan still carries the `Year → Unit` tree shape
 * (kept for stored-data and backup compatibility), but Units are retired and
 * always empty.
 *
 * When Ryan ships `/classrooms/:cid/annual-plan`, swap `readStore`/`writeStore`
 * for React Query the same way Sprint 7 swapped `useEnrollments` /
 * `useAssignments`; the public API of this hook stays stable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getIdbMirror } from '@/lib/local-store/idbMirror';
import {
  setAnnualAccess,
  setAnnualStoreReader,
} from '../persistence/localCurriculumRepository';
import {
  RETIRED_CURRICULUM_MARKERS,
  runRetiredCurriculumPurge,
} from '../persistence/retiredCurriculum';
import type { Year } from '../types';
import { getNextNSchoolDays, resolveSchoolYear } from './calendarMath';
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

const readLegacyAnnualPlanStore = (): AnnualPlanStore => {
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

const writeLegacyAnnualPlanStore = (store: AnnualPlanStore): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(`${STORAGE_KEY}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op.
  }
};

/**
 * IndexedDB-backed (browser) with a synchronous in-memory mirror, falling back
 * to the legacy localStorage path above where IDB is absent (SSR / tests). The
 * public read/write API stays synchronous. See `@/lib/local-store/idbMirror`.
 */
const annualPlanMirror = getIdbMirror<AnnualPlanStore>({
  key: STORAGE_KEY,
  readLegacy: readLegacyAnnualPlanStore,
  writeLegacy: writeLegacyAnnualPlanStore,
  clearLegacy: () => {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(`${STORAGE_KEY}.bak`);
    } catch {
      // ignore
    }
  },
});

/**
 * Resolves once the IDB mirror has hydrated. Backup/export MUST await this —
 * see the note on `publishedStoreReady`.
 */
export const annualPlanReady: Promise<void> = annualPlanMirror.ready;

// Inject annual-plan access into the curriculum repository. The repository
// cannot import this module at runtime (it would be a cycle: the repository's
// plan migration needs the annual store, and this module is itself a mirror),
// so the dependency is registered here instead.
setAnnualAccess({
  read: () => annualPlanMirror.read(),
  write: (store) => annualPlanMirror.write(store as AnnualPlanStore),
  ready: annualPlanMirror.ready,
});
setAnnualStoreReader(() => annualPlanMirror.read());

export const readAnnualPlanStore = (): AnnualPlanStore =>
  annualPlanMirror.read();

export const writeAnnualPlanStore = (store: AnnualPlanStore): void =>
  annualPlanMirror.write(store);

const generateYearId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `year-${Date.now().toString(36)}-${rand}`;
};

/** A plan with no Units — just the school-calendar exceptions. Created on the
 *  first exception write; the calendar renders without a plan. */
const emptyPlan = (classroomId: string): ClassroomAnnualPlan => {
  const nowIso = new Date().toISOString();
  return {
    classroomId,
    year: {
      id: generateYearId(),
      label: 'School year',
      semesters: { autumn: [], spring: [] },
    },
    seededFromTemplateAt: null,
    updatedAt: nowIso,
    exceptions: { additions: [], removals: [] },
  };
};

// The retired canonical curriculum lived in each plan's Units. Empty them once
// per device (keeping each classroom's school-calendar exceptions) after the
// store hydrates. See `persistence/retiredCurriculum`.
void annualPlanMirror.ready.then(() =>
  runRetiredCurriculumPurge(RETIRED_CURRICULUM_MARKERS.units, () => {
    const current = annualPlanMirror.read();
    const plans: Record<string, ClassroomAnnualPlan> = {};
    for (const [cid, p] of Object.entries(current.plans)) {
      plans[cid] = {
        ...p,
        year: { ...p.year, semesters: { autumn: [], spring: [] } },
        seededFromTemplateAt: null,
      };
    }
    annualPlanMirror.write({ ...current, plans });
  }),
);

export interface UseAnnualPlan {
  plan: ClassroomAnnualPlan | null;
  /** Live non-school Map for the whole school year, honoring `exceptions`. */
  nonSchoolMap: Map<string, NonSchoolDay>;
  /** The first school day from today on that isn't in `takenDates`
   *  (YYYY-MM-DD), or null when the next 60 school days are all taken. */
  suggestLessonDate: (takenDates: string[]) => string | null;
  addNonSchoolDate: (date: string, label: string) => void;
  removeNonSchoolDate: (date: string) => void;
  restoreDefaultNonSchoolDate: (date: string) => void;
}

export const useAnnualPlan = (classroomId: string): UseAnnualPlan => {
  const [store, setStore] = useState<AnnualPlanStore>(() =>
    readAnnualPlanStore(),
  );

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setStore(readAnnualPlanStore());
    // Refresh once IDB hydration/migration lands, then on every same-tab and
    // cross-tab change (the mirror bridges tabs via BroadcastChannel).
    void annualPlanMirror.ready.then(onChange);
    return annualPlanMirror.subscribe(onChange);
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

  const suggestLessonDate = useCallback(
    (takenDates: string[]): string | null => {
      const taken = new Set(takenDates);
      const next = getNextNSchoolDays(new Date(), 60, nonSchoolMap).find(
        (d) => !taken.has(toIsoDate(d)),
      );
      return next ? toIsoDate(next) : null;
    },
    [nonSchoolMap],
  );

  const mutateExceptions = useCallback(
    (
      updater: (e: SchoolCalendarExceptions) => SchoolCalendarExceptions,
    ): void => {
      if (!classroomId) return;
      const current = readAnnualPlanStore();
      const existing = current.plans[classroomId] ?? emptyPlan(classroomId);
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
    suggestLessonDate,
    addNonSchoolDate,
    removeNonSchoolDate,
    restoreDefaultNonSchoolDate,
  };
};
