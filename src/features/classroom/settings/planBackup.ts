/**
 * Teacher backup — export and restore every local store a teacher would lose.
 *
 * WHY THIS IS NOT JUST `localStorage.getItem`
 *
 * The heavy stores (annual plan, published days) go through
 * `lib/local-store/idbMirror`, which migrates the value into IndexedDB once and
 * then calls `clearLegacy()` to FREE the localStorage copy. The previous export
 * read localStorage directly, so after that one-time migration "Download my
 * plan" silently produced a backup with the entire Unit tree missing — the one
 * file a teacher has, quietly useless, with a success toast.
 *
 * Two consequences shape this module:
 *
 *   1. Export is ASYNC. Every mirrored store exposes a `ready` promise, and a
 *      synchronous read before hydration returns an empty store. Awaiting is
 *      not optional.
 *   2. Every store is read through its OWNER, never by key. A store that moves
 *      to IDB later cannot silently drop out of the backup again.
 */
import {
  STORAGE_KEY as ANNUAL_KEY,
  annualPlanReady,
  readAnnualPlanStore,
  writeAnnualPlanStore,
} from '../annual/useAnnualPlan';
import {
  LIBRARY_KEY,
  PLAN_KEY,
  SAVED_LESSONS_KEY as SAVED_KEY,
  localCurriculumRepository as repo,
} from '../persistence/localCurriculumRepository';
import {
  STORAGE_KEY as PUBLISHED_KEY,
  publishedStoreReady,
  readPublishedStoreForUser,
  writePublishedStoreForUser,
} from '../publish/usePublishedDays';

/**
 * Stores still living entirely in localStorage — read/written by key.
 *
 * The plan and the four personal-content keys are NO LONGER here: they moved
 * behind the curriculum repository (IndexedDB), and `idbMirror.clearLegacy()`
 * frees their localStorage keys on migration. Reading them by key would have
 * produced a backup missing every Day and every authored activity, with a
 * success toast — the exact failure this module's header describes.
 *
 * `ma-teacher:settings:v1` keeps its key deliberately: the `:v1` is a
 * namespace, and the schema version lives inside the blob.
 */
const PLAIN_KEYS = ['ma-teacher:settings:v1'] as const;

export const BACKUP_VERSION = 2;

export interface TeacherBackup {
  version: number;
  /** ISO timestamp, for the teacher's own reference. */
  exportedAt: string;
  /** Keyed exactly as the stores are keyed, so restore is unambiguous. */
  stores: Record<string, unknown>;
  /** Keys this build knows about, so a restore can report what it skipped. */
  knownKeys: string[];
}

const isBrowser = typeof window !== 'undefined';

const readPlain = (key: string): unknown => {
  if (!isBrowser) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const writePlain = (key: string, value: unknown): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(`${key}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op, same as the stores themselves.
  }
};

const isEmptyStore = (v: unknown): boolean =>
  !v ||
  (typeof v === 'object' &&
    Object.keys(v as Record<string, unknown>).length === 0);

/**
 * Collect every store. `userId` scopes the per-user stores (published days);
 * pass the signed-in user's id, or null to match the anonymous scope.
 */
export const exportTeacherBackup = async (
  userId: string | null,
): Promise<TeacherBackup> => {
  // Hydration first — see the module doc block. `repo.ready()` covers the plan,
  // the saved-lesson ids and the personal library, all of which now live in
  // IndexedDB and read EMPTY until hydrated.
  await Promise.all([
    annualPlanReady,
    publishedStoreReady(userId),
    repo.ready(),
  ]);

  const stores: Record<string, unknown> = {};

  const annual = readAnnualPlanStore();
  if (!isEmptyStore(annual)) stores[ANNUAL_KEY] = annual;

  const published = readPublishedStoreForUser(userId);
  if (!isEmptyStore(published)) stores[PUBLISHED_KEY] = published;

  // Repository-owned stores, read through their owner rather than by key.
  // EVERY Day, not just the ones whose classroom happens to have an annual
  // plan — enumerating classrooms would silently drop Days belonging to a
  // classroom with no plan yet, or to a deleted one.
  const days = repo.listAllDaysForBackup();
  if (days.length > 0) {
    stores[PLAN_KEY] = {
      schemaVersion: 2,
      days: Object.fromEntries(days.map((d) => [d.id, d])),
    };
  }

  const library = repo.getLibrary();
  if (
    library.activities.length ||
    library.clos.length ||
    library.themes.length ||
    library.seeds.length
  ) {
    stores[LIBRARY_KEY] = library;
  }

  const savedIds = repo.listSavedLessons();
  if (savedIds.length > 0) {
    stores[SAVED_KEY] = { schemaVersion: 1, ids: savedIds };
  }

  for (const key of PLAIN_KEYS) {
    const value = readPlain(key);
    if (value !== undefined) stores[key] = value;
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    stores,
    knownKeys: [
      ANNUAL_KEY,
      PUBLISHED_KEY,
      PLAN_KEY,
      LIBRARY_KEY,
      SAVED_KEY,
      ...PLAIN_KEYS,
    ],
  };
};

export interface RestoreReport {
  restored: string[];
  /** Keys present in the file that this build does not know how to restore. */
  skipped: string[];
}

/**
 * Write a backup back into the stores it came from. Unknown keys are SKIPPED
 * and reported rather than written blind — a backup from a newer build must not
 * be able to inject arbitrary localStorage keys.
 */
export const restoreTeacherBackup = async (
  userId: string | null,
  backup: TeacherBackup,
): Promise<RestoreReport> => {
  await Promise.all([
    annualPlanReady,
    publishedStoreReady(userId),
    repo.ready(),
  ]);

  const restored: string[] = [];
  const skipped: string[] = [];

  for (const [key, value] of Object.entries(backup.stores ?? {})) {
    if (key === ANNUAL_KEY) {
      writeAnnualPlanStore(value as never);
      restored.push(key);
    } else if (key === PUBLISHED_KEY) {
      writePublishedStoreForUser(userId, value as never);
      restored.push(key);
    } else if (key === PLAN_KEY) {
      const days = (value as { days?: Record<string, never> })?.days ?? {};
      for (const day of Object.values(days)) repo.saveDay(day);
      restored.push(key);
    } else if (key === LIBRARY_KEY) {
      repo.putLibrary(value as never);
      restored.push(key);
    } else if (key === SAVED_KEY) {
      repo.putSavedLessons((value as { ids?: string[] })?.ids ?? []);
      restored.push(key);
    } else if ((PLAIN_KEYS as readonly string[]).includes(key)) {
      writePlain(key, value);
      restored.push(key);
    } else {
      skipped.push(key);
    }
  }

  return { restored, skipped };
};

/** Parse + shape-check a backup file. Throws with a teacher-readable message. */
export const parseTeacherBackup = (text: string): TeacherBackup => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid backup (could not read JSON).');
  }
  const b = parsed as Partial<TeacherBackup>;
  if (
    !b ||
    typeof b !== 'object' ||
    !b.stores ||
    typeof b.stores !== 'object'
  ) {
    throw new Error('That file is not an Atlas classroom backup.');
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error(
      `That backup was made by a newer version of Atlas (v${String(b.version)}). Update, then restore.`,
    );
  }
  return {
    version: b.version,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    stores: b.stores as Record<string, unknown>,
    knownKeys: Array.isArray(b.knownKeys) ? b.knownKeys : [],
  };
};
