// @vitest-environment jsdom
/**
 * P0 task 11 — the teacher's only backup must not silently omit their work.
 *
 * COVERAGE NOTE, stated plainly: jsdom has no IndexedDB, so `idbMirror` falls
 * back to its localStorage path here and these tests cannot reproduce the
 * post-migration state in which the bug appeared. What they DO pin is the
 * property that makes the bug impossible: export reads every mirrored store
 * through its OWNER module, never by localStorage key. The first test proves
 * that with the owner mocked and localStorage empty — which fails against the
 * old key-scraping implementation.
 *
 * A true IndexedDB round-trip needs `fake-indexeddb` (not a dependency of this
 * repo) or a manual browser pass; see the P0 notes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SENTINEL_ANNUAL = {
  schemaVersion: 1,
  year: {
    semesters: { autumn: [{ id: 'unit-1', dayIds: ['d1'] }], spring: [] },
  },
  exceptions: [{ date: '2026-11-26', kind: 'holiday' }],
};

vi.mock('../annual/useAnnualPlan', () => ({
  STORAGE_KEY: 'ma-teacher:annualPlan:v1',
  annualPlanReady: Promise.resolve(),
  readAnnualPlanStore: () => annualStore,
  writeAnnualPlanStore: (v: unknown) => {
    annualStore = v as typeof SENTINEL_ANNUAL;
  },
}));

vi.mock('../publish/usePublishedDays', () => ({
  STORAGE_KEY: 'ma-teacher:published:v1',
  publishedStoreReady: () => Promise.resolve(),
  readPublishedStoreForUser: () => publishedStore,
  writePublishedStoreForUser: (_u: unknown, v: unknown) => {
    publishedStore = v as typeof publishedStore;
  },
}));

let annualStore: typeof SENTINEL_ANNUAL = SENTINEL_ANNUAL;
let publishedStore: Record<string, unknown> = {
  schemaVersion: 1,
  entries: { pd1: { id: 'pd1', sourceRef: 'd1' } },
};

const {
  BACKUP_VERSION,
  exportTeacherBackup,
  parseTeacherBackup,
  restoreTeacherBackup,
} = await import('./planBackup');

beforeEach(() => {
  window.localStorage.clear();
  annualStore = SENTINEL_ANNUAL;
  publishedStore = {
    schemaVersion: 1,
    entries: { pd1: { id: 'pd1', sourceRef: 'd1' } },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportTeacherBackup', () => {
  it('includes the annual plan even though localStorage holds nothing — the regression', () => {
    // This is the post-migration world: idbMirror moved the value into IDB and
    // called clearLegacy(), so the key is gone from localStorage.
    expect(window.localStorage.getItem('ma-teacher:annualPlan:v1')).toBeNull();

    return exportTeacherBackup('u1').then((backup) => {
      expect(backup.stores['ma-teacher:annualPlan:v1']).toEqual(
        SENTINEL_ANNUAL,
      );
    });
  });

  it('includes published days, which the old key list omitted entirely', async () => {
    const backup = await exportTeacherBackup('u1');
    expect(backup.stores['ma-teacher:published:v1']).toBeDefined();
  });

  it('preserves Units, dayIds and school-calendar exceptions', async () => {
    const backup = await exportTeacherBackup('u1');
    const annual = backup.stores[
      'ma-teacher:annualPlan:v1'
    ] as typeof SENTINEL_ANNUAL;
    expect(annual.year.semesters.autumn[0].id).toBe('unit-1');
    expect(annual.year.semesters.autumn[0].dayIds).toEqual(['d1']);
    expect(annual.exceptions).toEqual([
      { date: '2026-11-26', kind: 'holiday' },
    ]);
  });

  it('carries the plain localStorage stores too', async () => {
    window.localStorage.setItem(
      'ma-teacher:plan:v1',
      JSON.stringify({ schemaVersion: 1, days: { d1: { id: 'd1' } } }),
    );
    const backup = await exportTeacherBackup('u1');
    // The plan now comes back through the repository, which migrates v1→v2 on
    // read, so the exported blob is the CURRENT shape — not the raw bytes.
    expect(backup.stores['ma-teacher:plan:v1']).toEqual({
      schemaVersion: 2,
      days: { d1: { id: 'd1', classroomId: null } },
    });
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBeTruthy();
  });

  it('skips a malformed plain store rather than aborting the whole backup', async () => {
    window.localStorage.setItem('ma-teacher:plan:v1', '{not json');
    const backup = await exportTeacherBackup('u1');
    expect(backup.stores['ma-teacher:plan:v1']).toBeUndefined();
    // The mirrored stores still made it.
    expect(backup.stores['ma-teacher:annualPlan:v1']).toBeDefined();
  });
});

describe('export → clear site data → restore', () => {
  it('round-trips every store', async () => {
    window.localStorage.setItem(
      'ma-teacher:plan:v1',
      JSON.stringify({ schemaVersion: 1, days: { d1: { id: 'd1' } } }),
    );
    const backup = await exportTeacherBackup('u1');
    const serialized = JSON.stringify(backup);

    // "Clear site data"
    window.localStorage.clear();
    annualStore = {
      schemaVersion: 1,
      year: { semesters: { autumn: [], spring: [] } },
      exceptions: [],
    } as never;
    publishedStore = { schemaVersion: 1, entries: {} };

    const report = await restoreTeacherBackup(
      'u1',
      parseTeacherBackup(serialized),
    );
    expect(report.skipped).toEqual([]);
    expect(report.restored).toContain('ma-teacher:annualPlan:v1');
    expect(report.restored).toContain('ma-teacher:published:v1');
    expect(report.restored).toContain('ma-teacher:plan:v1');

    expect(annualStore).toEqual(SENTINEL_ANNUAL);
    expect(publishedStore).toEqual({
      schemaVersion: 1,
      entries: { pd1: { id: 'pd1', sourceRef: 'd1' } },
    });
    // Restored through the repository (jsdom has no IndexedDB here, so the
    // mirror's localStorage fallback is what we can observe).
    expect(
      JSON.parse(window.localStorage.getItem('ma-teacher:plan:v1') ?? '{}').days
        ?.d1?.id,
    ).toBe('d1');
  });

  it('refuses to write keys it does not recognise', async () => {
    const report = await restoreTeacherBackup('u1', {
      version: BACKUP_VERSION,
      exportedAt: '',
      knownKeys: [],
      stores: { 'evil:key': { a: 1 }, 'ma-teacher:plan:v1': { ok: true } },
    });
    expect(report.skipped).toEqual(['evil:key']);
    expect(window.localStorage.getItem('evil:key')).toBeNull();
    expect(report.restored).toEqual(['ma-teacher:plan:v1']);
  });
});

describe('parseTeacherBackup', () => {
  it('rejects junk with a teacher-readable message', () => {
    expect(() => parseTeacherBackup('not json')).toThrow(/valid backup/i);
    expect(() => parseTeacherBackup('{"nope":1}')).toThrow(/Atlas classroom/i);
  });

  it('refuses a backup from a newer build rather than half-restoring it', () => {
    expect(() =>
      parseTeacherBackup(
        JSON.stringify({ version: BACKUP_VERSION + 1, stores: {} }),
      ),
    ).toThrow(/newer version/i);
  });

  it('accepts a well-formed backup', () => {
    const b = parseTeacherBackup(
      JSON.stringify({ version: 1, exportedAt: 'x', stores: { a: 1 } }),
    );
    expect(b.stores).toEqual({ a: 1 });
  });
});
