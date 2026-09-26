/**
 * A shared, versioned migration harness for the `ma-teacher:*` local stores.
 *
 * WHY THIS EXISTS
 *
 * Every store repeats the same block: read the blob, compare `schemaVersion`,
 * and on a mismatch copy the raw string to `<key>.bak` and return empty. That
 * is a DATA-LOSS path wearing a migration's clothes — it is only safe while no
 * store has ever needed a real migration. P1 needs two (`plan` v1→v2 gains
 * `Day.classroomId`, `settings` v1→v2 becomes per-classroom) and P2 needs a
 * much larger one for decks, so the pattern has to become a real chain.
 *
 * DESIGN RULES
 *
 *   1. Steps are small and ordered: `{from, to}` pairs walked until the target.
 *   2. Migration is PURE. A step takes a value and returns a value; nothing
 *      touches storage. That is what makes golden-fixture tests possible.
 *   3. Idempotent: running a chain on already-current data applies no steps.
 *   4. A failing step NEVER corrupts. The caller gets `failed: true` and the
 *      fallback, and `migrateStoredValue` keeps the original blob at `.bak`.
 *   5. Nothing is deleted. `.bak` is written before any replacement lands.
 */

export interface MigrationContext {
  /**
   * Extra data a step needs that does not live in the blob — e.g. the annual
   * plan store, which is what tells `plan` v1→v2 which classroom owns a Day.
   */
  [key: string]: unknown;
}

export interface MigrationStep {
  from: number;
  to: number;
  /** Short human description; surfaces in `applied` and in test failures. */
  describe: string;
  migrate: (value: unknown, ctx: MigrationContext) => unknown;
}

export interface MigrationResult<T> {
  value: T;
  /** The version the stored blob claimed (missing/invalid normalizes to 1). */
  fromVersion: number;
  toVersion: number;
  /** `describe` of each step applied, in order. Empty when already current. */
  applied: string[];
  /** True when no usable value could be produced and `fallback` was used. */
  failed: boolean;
  reason?: string;
}

const VERSION_FIELD = 'schemaVersion';

/** A stored blob's version. Missing, non-numeric or < 1 all normalize to 1. */
export const readSchemaVersion = (raw: unknown): number => {
  if (!raw || typeof raw !== 'object') return 1;
  const v = (raw as Record<string, unknown>)[VERSION_FIELD];
  return typeof v === 'number' && Number.isFinite(v) && v >= 1
    ? Math.floor(v)
    : 1;
};

/**
 * Walk `raw` from its own version up to `targetVersion` through `steps`.
 *
 * Pure — no storage access. `migrateStoredValue` is the localStorage-aware
 * wrapper around this.
 */
export const runMigrations = <T>(opts: {
  raw: unknown;
  targetVersion: number;
  steps: MigrationStep[];
  /** Returned whenever migration cannot produce a usable value. */
  fallback: T;
  context?: MigrationContext;
  /** Override version detection (defaults to the `schemaVersion` field). */
  readVersion?: (raw: unknown) => number;
}): MigrationResult<T> => {
  const {
    raw,
    targetVersion,
    steps,
    fallback,
    context = {},
    readVersion = readSchemaVersion,
  } = opts;

  if (raw == null) {
    return {
      value: fallback,
      fromVersion: targetVersion,
      toVersion: targetVersion,
      applied: [],
      failed: false,
      reason: 'empty',
    };
  }

  const fromVersion = readVersion(raw);

  if (fromVersion > targetVersion) {
    // Written by a NEWER build. Refuse rather than guessing — downgrading is
    // how a teacher silently loses fields this build does not know about.
    return {
      value: fallback,
      fromVersion,
      toVersion: fromVersion,
      applied: [],
      failed: true,
      reason: `stored version ${fromVersion} is newer than this build's ${targetVersion}`,
    };
  }

  let value: unknown = raw;
  let version = fromVersion;
  const applied: string[] = [];

  while (version < targetVersion) {
    const step = steps.find((s) => s.from === version);
    if (!step) {
      return {
        value: fallback,
        fromVersion,
        toVersion: version,
        applied,
        failed: true,
        reason: `no migration step from version ${version}`,
      };
    }
    try {
      value = step.migrate(value, context);
    } catch (err) {
      return {
        value: fallback,
        fromVersion,
        toVersion: version,
        applied,
        failed: true,
        reason: `step "${step.describe}" threw: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
    applied.push(step.describe);
    version = step.to;
  }

  return {
    value: value as unknown as T,
    fromVersion,
    toVersion: version,
    applied,
    failed: false,
  };
};

const isBrowser = typeof window !== 'undefined';

/**
 * Read `key` from localStorage, migrate it, and persist the result.
 *
 * Writes `<key>.bak` with the ORIGINAL blob before persisting anything
 * migrated, so a bad migration is always recoverable by hand. The `.bak` is
 * written only when something actually changed — a no-op migration does not
 * churn storage.
 */
export const migrateStoredValue = <T>(opts: {
  key: string;
  targetVersion: number;
  steps: MigrationStep[];
  fallback: T;
  context?: MigrationContext;
}): MigrationResult<T> => {
  const { key, targetVersion, steps, fallback, context } = opts;
  if (!isBrowser) {
    return {
      value: fallback,
      fromVersion: targetVersion,
      toVersion: targetVersion,
      applied: [],
      failed: false,
      reason: 'no-window',
    };
  }

  let rawText: string | null = null;
  try {
    rawText = window.localStorage.getItem(key);
  } catch {
    return {
      value: fallback,
      fromVersion: targetVersion,
      toVersion: targetVersion,
      applied: [],
      failed: true,
      reason: 'storage-unavailable',
    };
  }
  if (!rawText) {
    return {
      value: fallback,
      fromVersion: targetVersion,
      toVersion: targetVersion,
      applied: [],
      failed: false,
      reason: 'empty',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    backup(key, rawText);
    return {
      value: fallback,
      fromVersion: 1,
      toVersion: targetVersion,
      applied: [],
      failed: true,
      reason: 'unparseable',
    };
  }

  const result = runMigrations<T>({
    raw: parsed,
    targetVersion,
    steps,
    fallback,
    ...(context ? { context } : {}),
  });

  // Keep the original whenever we changed or discarded anything.
  if (result.applied.length > 0 || result.failed) backup(key, rawText);

  if (result.applied.length > 0 && !result.failed) {
    try {
      window.localStorage.setItem(key, JSON.stringify(result.value));
      window.dispatchEvent(new Event(`${key}:changed`));
    } catch {
      // Quota / privacy mode — the in-memory value is still correct.
    }
  }

  return result;
};

const backup = (key: string, rawText: string): void => {
  try {
    window.localStorage.setItem(`${key}.bak`, rawText);
  } catch {
    // Best effort.
  }
};
