// @vitest-environment jsdom
/**
 * The migration harness is the thing standing between a teacher and a silently
 * emptied store, so the tests are mostly about the FAILURE paths: a newer blob,
 * a missing step, a throwing step, unparseable JSON. In every one of those the
 * original bytes must survive at `<key>.bak`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  migrateStoredValue,
  readSchemaVersion,
  runMigrations,
  type MigrationStep,
} from '../migrations';

interface V1 {
  schemaVersion: number;
  days: Record<string, { id: string }>;
}
interface V2 {
  schemaVersion: number;
  days: Record<string, { id: string; classroomId: string | null }>;
}

const KEY = 'ma-teacher:test:v1';

const v1ToV2: MigrationStep = {
  from: 1,
  to: 2,
  describe: 'plan v1→v2: scope Days to a classroom',
  migrate: (value, ctx) => {
    const v = value as V1;
    const owner = (ctx.ownerOf as Record<string, string>) ?? {};
    return {
      schemaVersion: 2,
      days: Object.fromEntries(
        Object.entries(v.days).map(([id, day]) => [
          id,
          { ...day, classroomId: owner[id] ?? null },
        ]),
      ),
    } satisfies V2;
  },
};

const v2ToV3: MigrationStep = {
  from: 2,
  to: 3,
  describe: 'test v2→v3: stamp only',
  migrate: (value) => ({ ...(value as object), schemaVersion: 3 }),
};

const FALLBACK: V2 = { schemaVersion: 2, days: {} };

beforeEach(() => {
  window.localStorage.clear();
});

describe('readSchemaVersion', () => {
  it('normalizes missing / invalid versions to 1', () => {
    expect(readSchemaVersion({ schemaVersion: 4 })).toBe(4);
    expect(readSchemaVersion({})).toBe(1);
    expect(readSchemaVersion({ schemaVersion: 'two' })).toBe(1);
    expect(readSchemaVersion({ schemaVersion: 0 })).toBe(1);
    expect(readSchemaVersion(null)).toBe(1);
    expect(readSchemaVersion({ schemaVersion: 2.9 })).toBe(2);
  });
});

describe('runMigrations', () => {
  const raw: V1 = { schemaVersion: 1, days: { d1: { id: 'd1' } } };

  it('walks a chain and reports what it applied', () => {
    const r = runMigrations<V2>({
      raw,
      targetVersion: 3,
      steps: [v1ToV2, v2ToV3],
      fallback: FALLBACK,
      context: { ownerOf: { d1: 'c1' } },
    });
    expect(r.failed).toBe(false);
    expect(r.fromVersion).toBe(1);
    expect(r.toVersion).toBe(3);
    expect(r.applied).toEqual([v1ToV2.describe, v2ToV3.describe]);
    expect(r.value.days.d1.classroomId).toBe('c1');
  });

  it('is idempotent — already-current data applies no steps', () => {
    const current = {
      schemaVersion: 2,
      days: { d1: { id: 'd1', classroomId: 'c1' } },
    };
    const r = runMigrations<V2>({
      raw: current,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.applied).toEqual([]);
    expect(r.failed).toBe(false);
    expect(r.value).toEqual(current);
  });

  it('threads context into the step — Days with no owner become unassigned', () => {
    const r = runMigrations<V2>({
      raw,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
      context: { ownerOf: {} },
    });
    expect(r.value.days.d1.classroomId).toBeNull();
  });

  it('REFUSES a blob written by a newer build rather than downgrading it', () => {
    const r = runMigrations<V2>({
      raw: { schemaVersion: 9, days: {} },
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(true);
    expect(r.reason).toMatch(/newer than/i);
    expect(r.value).toBe(FALLBACK);
  });

  it('fails cleanly when a step is missing from the chain', () => {
    const r = runMigrations<V2>({
      raw,
      targetVersion: 3,
      steps: [v1ToV2], // no 2→3
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(true);
    expect(r.reason).toMatch(/no migration step from version 2/);
    expect(r.applied).toEqual([v1ToV2.describe]);
  });

  it('contains a throwing step instead of propagating', () => {
    const boom: MigrationStep = {
      from: 1,
      to: 2,
      describe: 'explodes',
      migrate: () => {
        throw new Error('bad data');
      },
    };
    const r = runMigrations<V2>({
      raw,
      targetVersion: 2,
      steps: [boom],
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(true);
    expect(r.reason).toMatch(/explodes.*bad data/);
    expect(r.value).toBe(FALLBACK);
  });

  it('treats an absent blob as empty, not as a failure', () => {
    const r = runMigrations<V2>({
      raw: null,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(false);
    expect(r.reason).toBe('empty');
  });
});

describe('migrateStoredValue', () => {
  it('migrates, persists and keeps the original at .bak', () => {
    const original = JSON.stringify({
      schemaVersion: 1,
      days: { d1: { id: 'd1' } },
    });
    window.localStorage.setItem(KEY, original);

    const r = migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
      context: { ownerOf: { d1: 'c1' } },
    });

    expect(r.failed).toBe(false);
    expect(r.applied).toHaveLength(1);
    expect(window.localStorage.getItem(`${KEY}.bak`)).toBe(original);
    const persisted = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.days.d1.classroomId).toBe('c1');
  });

  it('running it twice is a no-op and does not churn storage', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 1, days: { d1: { id: 'd1' } } }),
    );
    migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    const afterFirst = window.localStorage.getItem(KEY);

    const second = migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(second.applied).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBe(afterFirst);
  });

  it('keeps unparseable JSON at .bak and never overwrites the key', () => {
    window.localStorage.setItem(KEY, '{not json');
    const r = migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(true);
    expect(r.reason).toBe('unparseable');
    expect(window.localStorage.getItem(`${KEY}.bak`)).toBe('{not json');
    // The corrupt original is still in place — nothing was silently replaced.
    expect(window.localStorage.getItem(KEY)).toBe('{not json');
  });

  it('backs up but does not overwrite when a newer blob is refused', () => {
    const newer = JSON.stringify({ schemaVersion: 9, days: {} });
    window.localStorage.setItem(KEY, newer);
    const r = migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.failed).toBe(true);
    expect(window.localStorage.getItem(`${KEY}.bak`)).toBe(newer);
    expect(window.localStorage.getItem(KEY)).toBe(newer);
  });

  it('returns the fallback for an absent key without writing anything', () => {
    const r = migrateStoredValue<V2>({
      key: KEY,
      targetVersion: 2,
      steps: [v1ToV2],
      fallback: FALLBACK,
    });
    expect(r.value).toBe(FALLBACK);
    expect(window.localStorage.getItem(`${KEY}.bak`)).toBeNull();
  });
});
