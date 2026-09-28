/**
 * Snapshot version normalization — the mechanism P2 relies on when the deck
 * shape changes.
 *
 * A published snapshot is immutable once written, but the code that reads it
 * keeps moving. Three cases, in order of preference:
 *
 *   1. Current version — render it, after a Rule 1 sanitize.
 *   2. Older version, source Day available (the authoring teacher's own
 *      browser) — RE-PROJECT it through `publishDay`, which produces a
 *      current-shape snapshot with the current whitelist applied.
 *   3. Older version, no source Day (any student, any other teacher) — render
 *      it as-is after sanitizing, keeping its original version. We do not
 *      re-stamp a snapshot we could not actually migrate; claiming a version we
 *      have not produced is exactly the kind of silent lie this phase removes.
 *
 * Pure and idempotent: running it twice on the same input is a no-op.
 */
import type { Day } from '../types';
import {
  SNAPSHOT_VERSION,
  type DaySnapshot,
  publishDay,
  sanitizeSnapshot,
} from './publishDay';

export interface SnapshotMigrationResult {
  snapshot: DaySnapshot;
  /** The version the stored record claimed; a missing value normalizes to 1. */
  fromVersion: number;
  /** True when the snapshot was rebuilt from its source Day. */
  reprojected: boolean;
  /** Dot-paths of any forbidden keys dropped on the way through. */
  stripped: string[];
}

/** A stored record's version, normalizing legacy records (no field) to 1. */
export const snapshotVersionOf = (snapshot: DaySnapshot): number => {
  const raw = snapshot.snapshotVersion;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1
    ? Math.floor(raw)
    : 1;
};

/** True when a stored snapshot predates the current projection. */
export const isStaleSnapshot = (snapshot: DaySnapshot): boolean =>
  snapshotVersionOf(snapshot) < SNAPSHOT_VERSION;

export const migrateSnapshot = (
  snapshot: DaySnapshot,
  sourceDay?: Day,
): SnapshotMigrationResult => {
  const fromVersion = snapshotVersionOf(snapshot);

  // Case 2 — re-project from the source Day. `publishDay` stamps the current
  // version and applies the current whitelist, so nothing needs stripping.
  if (fromVersion < SNAPSHOT_VERSION && sourceDay) {
    return {
      snapshot: publishDay(sourceDay),
      fromVersion,
      reprojected: true,
      stripped: [],
    };
  }

  // Cases 1 and 3 — sanitize in place, keep the version we actually have.
  const { snapshot: clean, stripped } = sanitizeSnapshot(snapshot);
  return {
    snapshot: stripped.length === 0 ? snapshot : clean,
    fromVersion,
    reprojected: false,
    stripped,
  };
};
