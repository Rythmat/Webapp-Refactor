/**
 * Snapshot versioning (P0 task 3) — the mechanism P2 relies on when the deck
 * shape changes. Covers all three cases in `migrateSnapshot`'s doc block plus
 * idempotency.
 */
import { describe, expect, it } from 'vitest';
import { newBlankDay } from '../plan/newBlankDay';
import type { Day } from '../types';
import {
  isStaleSnapshot,
  migrateSnapshot,
  snapshotVersionOf,
} from './migrateSnapshot';
import { SNAPSHOT_VERSION, type DaySnapshot, publishDay } from './publishDay';

const makeDay = (): Day => {
  const day = newBlankDay('Migration Fixture');
  day.cells.connectRegulate.presentation.title = { en: 'Warm up' };
  return day;
};

describe('snapshotVersionOf — legacy records normalize to 1', () => {
  it('reads the stamped version', () => {
    expect(snapshotVersionOf(publishDay(makeDay()))).toBe(SNAPSHOT_VERSION);
  });

  it('treats a missing, non-numeric or nonsensical version as 1', () => {
    const base = publishDay(makeDay());
    for (const bad of [undefined, null, 'two', NaN, 0, -3]) {
      const legacy = {
        ...base,
        snapshotVersion: bad,
      } as unknown as DaySnapshot;
      expect(snapshotVersionOf(legacy)).toBe(1);
    }
  });

  it('floors a fractional version rather than throwing', () => {
    const odd = {
      ...publishDay(makeDay()),
      snapshotVersion: 2.7,
    } as unknown as DaySnapshot;
    expect(snapshotVersionOf(odd)).toBe(2);
  });
});

describe('migrateSnapshot', () => {
  it('case 1 — a current, clean snapshot passes through by reference', () => {
    const snapshot = publishDay(makeDay());
    const result = migrateSnapshot(snapshot);
    expect(result.snapshot).toBe(snapshot);
    expect(result.fromVersion).toBe(SNAPSHOT_VERSION);
    expect(result.reprojected).toBe(false);
    expect(result.stripped).toEqual([]);
    expect(isStaleSnapshot(snapshot)).toBe(false);
  });

  it('case 1 — a current snapshot with a stray forbidden key is sanitized, not re-projected', () => {
    const dirty = {
      ...publishDay(makeDay()),
      // A key an older build failed to project away.
      notes: 'teacher only',
    } as unknown as DaySnapshot;
    const result = migrateSnapshot(dirty);
    expect(result.reprojected).toBe(false);
    expect(result.stripped).toEqual(['notes']);
    expect('notes' in result.snapshot).toBe(false);
    expect(result.snapshot.label).toBe(dirty.label);
  });

  it('case 2 — a stale snapshot WITH its source Day is re-projected to the current version', () => {
    const day = makeDay();
    const stale = {
      ...publishDay(day),
      snapshotVersion: 0,
      label: 'stale label',
    } as unknown as DaySnapshot;
    expect(snapshotVersionOf(stale)).toBe(1);

    // Force staleness relative to whatever SNAPSHOT_VERSION currently is.
    // Live since the P2 bump to v2: this now exercises real re-projection.
    const reallyStale = {
      ...stale,
      snapshotVersion: SNAPSHOT_VERSION - 1,
    } as unknown as DaySnapshot;
    expect(isStaleSnapshot(reallyStale)).toBe(true);

    const result = migrateSnapshot(reallyStale, day);
    expect(result.reprojected).toBe(true);
    expect(result.snapshot.snapshotVersion).toBe(SNAPSHOT_VERSION);
    expect(result.snapshot.label).toBe(day.label);
  });

  it('case 3 — a stale snapshot with NO source Day keeps its own version rather than claiming one it never had', () => {
    const stale = {
      ...publishDay(makeDay()),
      snapshotVersion: SNAPSHOT_VERSION - 1,
      notes: 'teacher only',
    } as unknown as DaySnapshot;
    const result = migrateSnapshot(stale);
    expect(result.reprojected).toBe(false);
    expect(result.snapshot.snapshotVersion).toBe(SNAPSHOT_VERSION - 1);
    expect(result.stripped).toEqual(['notes']);
  });

  it('is idempotent — running it twice changes nothing', () => {
    const day = makeDay();
    const dirty = {
      ...publishDay(day),
      notes: 'teacher only',
    } as unknown as DaySnapshot;
    const once = migrateSnapshot(dirty, day);
    const twice = migrateSnapshot(once.snapshot, day);
    expect(twice.snapshot).toEqual(once.snapshot);
    expect(twice.stripped).toEqual([]);
  });

  it('never mutates the stored record', () => {
    const dirty = {
      ...publishDay(makeDay()),
      notes: 'teacher only',
    } as unknown as DaySnapshot;
    const before = JSON.stringify(dirty);
    migrateSnapshot(dirty);
    expect(JSON.stringify(dirty)).toBe(before);
  });
});
