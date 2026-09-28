/**
 * The LOCAL adapter for {@link CurriculumRepository}.
 *
 * Owns the four curriculum stores and the only copies of their storage keys.
 * P10 adds a remote adapter beside this one behind `SERVER_CURRICULUM_ENABLED`;
 * because every consumer talks to the interface, that swap changes no call
 * sites.
 *
 * All four stores now sit behind `idbMirror`: Days and the personal warehouse
 * are the heaviest things a teacher owns, and localStorage is a ~5MB budget
 * shared with the auth token cache. The mirror keeps reads synchronous.
 */
import { getIdbMirror } from '@/lib/local-store/idbMirror';
import { migrateStoredValue } from '@/lib/local-store/migrations';
import type { ClassroomAnnualPlan } from '../annual/useAnnualPlan';
import { PLAN_MIGRATIONS } from '../plan/migratePlan';
import type { Day } from '../types';
import type {
  CurriculumRepository,
  TeacherLibrary,
} from './CurriculumRepository';

export const PLAN_KEY = 'ma-teacher:plan:v1';
export const PLAN_SCHEMA_VERSION = 2;
export const SAVED_LESSONS_KEY = 'ma-teacher:saved-lessons:v1';
export const SAVED_SCHEMA_VERSION = 1;
export const LIBRARY_KEY = 'ma-teacher:library:v1';
export const LIBRARY_KEYS = {
  activities: 'ma-teacher:activities:personal:v1',
  clos: 'ma-teacher:clos:personal:v1',
  themes: 'ma-teacher:themes:personal:v1',
  seeds: 'ma-teacher:seeds:personal:v1',
} as const;

export interface PlanBlob {
  schemaVersion: number;
  days: Record<string, Day>;
}

const EMPTY_PLAN: PlanBlob = { schemaVersion: PLAN_SCHEMA_VERSION, days: {} };
const EMPTY_LIBRARY: TeacherLibrary = {
  activities: [],
  clos: [],
  themes: [],
  seeds: [],
};

const isBrowser = typeof window !== 'undefined';

const readRaw = <T>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeRaw = (key: string, value: unknown): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(`${key}:changed`));
  } catch {
    // Quota / privacy mode — the in-memory mirror stays correct.
  }
};

const clearRaw = (key: string): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(`${key}.bak`);
  } catch {
    // ignore
  }
};

/**
 * The plan mirror. `readLegacy` runs the v1→v2 migration, so a teacher whose
 * Days predate classroom scoping is migrated on the way into IndexedDB rather
 * than being silently emptied.
 *
 * `annualStoreForMigration` is injected to avoid an import cycle: the annual
 * store is itself a mirror defined in `useAnnualPlan`.
 */
let annualStoreForMigration: (() => unknown) | null = null;
export const setAnnualStoreReader = (read: () => unknown): void => {
  annualStoreForMigration = read;
};

const planMirror = getIdbMirror<PlanBlob>({
  key: PLAN_KEY,
  readLegacy: () => {
    const { value } = migrateStoredValue<PlanBlob>({
      key: PLAN_KEY,
      targetVersion: PLAN_SCHEMA_VERSION,
      steps: PLAN_MIGRATIONS,
      fallback: EMPTY_PLAN,
      context: { annual: annualStoreForMigration?.() ?? null },
    });
    return {
      schemaVersion: PLAN_SCHEMA_VERSION,
      days: value?.days ?? {},
    };
  },
  writeLegacy: (value) => writeRaw(PLAN_KEY, value),
  clearLegacy: () => clearRaw(PLAN_KEY),
});

const savedMirror = getIdbMirror<{ schemaVersion: number; ids: string[] }>({
  key: SAVED_LESSONS_KEY,
  readLegacy: () => {
    const blob = readRaw<{ schemaVersion?: number; ids?: string[] }>(
      SAVED_LESSONS_KEY,
      {},
    );
    return {
      schemaVersion: SAVED_SCHEMA_VERSION,
      ids: Array.isArray(blob.ids) ? blob.ids : [],
    };
  },
  writeLegacy: (value) => writeRaw(SAVED_LESSONS_KEY, value),
  clearLegacy: () => clearRaw(SAVED_LESSONS_KEY),
});

const libraryMirror = getIdbMirror<TeacherLibrary>({
  key: LIBRARY_KEY,
  readLegacy: () => ({
    activities: readRaw(LIBRARY_KEYS.activities, []),
    clos: readRaw(LIBRARY_KEYS.clos, []),
    themes: readRaw(LIBRARY_KEYS.themes, []),
    seeds: readRaw(LIBRARY_KEYS.seeds, []),
  }),
  writeLegacy: (lib) => {
    writeRaw(LIBRARY_KEYS.activities, lib.activities);
    writeRaw(LIBRARY_KEYS.clos, lib.clos);
    writeRaw(LIBRARY_KEYS.themes, lib.themes);
    writeRaw(LIBRARY_KEYS.seeds, lib.seeds);
  },
  clearLegacy: () => {
    for (const key of Object.values(LIBRARY_KEYS)) clearRaw(key);
  },
});

/** Annual-plan access is injected so this module never imports useAnnualPlan. */
interface AnnualAccess {
  read: () => { plans: Record<string, ClassroomAnnualPlan> };
  write: (store: { plans: Record<string, ClassroomAnnualPlan> }) => void;
  ready: Promise<void>;
}
let annual: AnnualAccess | null = null;
export const setAnnualAccess = (access: AnnualAccess): void => {
  annual = access;
};

const readPlan = (): PlanBlob => planMirror.read();

export const localCurriculumRepository: CurriculumRepository = {
  listDays: (classroomId) =>
    Object.values(readPlan().days).filter((d) => d.classroomId === classroomId),

  listUnassignedDays: () =>
    Object.values(readPlan().days).filter((d) => d.classroomId == null),

  listAllDaysForBackup: () => Object.values(readPlan().days),

  getDay: (dayId) => readPlan().days[dayId],

  saveDay: (day, classroomId) => {
    const current = readPlan();
    // Stamp on first save, never overwrite — moving a Day between classrooms
    // is a deliberate action, not a side effect of opening an editor.
    const scoped: Day =
      day.classroomId == null && classroomId ? { ...day, classroomId } : day;
    planMirror.write({
      ...current,
      days: { ...current.days, [scoped.id]: scoped },
    });
  },

  deleteDay: (dayId) => {
    const current = readPlan();
    if (!(dayId in current.days)) return;
    const days = { ...current.days };
    delete days[dayId];
    planMirror.write({ ...current, days });
  },

  clearDays: (classroomId) => {
    const current = readPlan();
    const days: Record<string, Day> = {};
    for (const [id, day] of Object.entries(current.days)) {
      // Other classrooms AND unassigned Days survive — the tray exists to
      // rescue the unassigned ones, so an unrelated reset must not destroy them.
      if (day.classroomId !== classroomId) days[id] = day;
    }
    planMirror.write({ schemaVersion: PLAN_SCHEMA_VERSION, days });
  },

  getAnnualPlan: (classroomId) => annual?.read().plans[classroomId],

  saveAnnualPlan: (plan) => {
    if (!annual) return;
    const current = annual.read();
    annual.write({
      ...current,
      plans: { ...current.plans, [plan.classroomId]: plan },
    });
  },

  listSavedLessons: () => savedMirror.read().ids ?? [],

  putSavedLessons: (ids) =>
    savedMirror.write({ schemaVersion: SAVED_SCHEMA_VERSION, ids }),

  getLibrary: () => ({ ...EMPTY_LIBRARY, ...libraryMirror.read() }),

  putLibrary: (library) => libraryMirror.write(library),

  subscribe: (listener) => {
    const unsubs = [
      planMirror.subscribe(listener),
      savedMirror.subscribe(listener),
      libraryMirror.subscribe(listener),
    ];
    return () => unsubs.forEach((u) => u());
  },

  ready: async () => {
    await Promise.all([
      planMirror.ready,
      savedMirror.ready,
      libraryMirror.ready,
      annual?.ready ?? Promise.resolve(),
    ]);
  },

  isHydrated: () => hydrated,
};

// `ready` resolving is the only honest signal that a synchronous read is
// authoritative rather than a pre-hydration empty.
let hydrated = !isBrowser;
void localCurriculumRepository.ready().then(() => {
  hydrated = true;
});
