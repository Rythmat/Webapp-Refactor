// @vitest-environment jsdom
/**
 * Phase-1 DoD: "Export → clear site data → Restore round-trips a classroom
 * including Units, dayIds and exceptions."
 *
 * Runs against a REAL IndexedDB (`fake-indexeddb`), which is the whole point.
 * In plain jsdom `idbMirror` falls back to localStorage — the one path where
 * the bug cannot happen. The bug is that `clearLegacy()` frees the localStorage
 * key after migration, so anything reading stores BY KEY produces a backup
 * missing that store entirely, with a success toast.
 *
 * The middle step is the real subject: localStorage AND IndexedDB are both
 * cleared between export and restore.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CID = 'class-a';

/** Fresh module graph per test so the idbMirror registry is not shared. */
const loadModules = async () => {
  const repoMod = await import('../../persistence/localCurriculumRepository');
  const annualMod = await import('../../annual/useAnnualPlan');
  const backupMod = await import('../planBackup');
  return { repo: repoMod.localCurriculumRepository, annualMod, backupMod };
};

/**
 * A brand-new IDBFactory is "clear site data" for IndexedDB.
 *
 * `deleteDatabase` is NOT usable here: `idbKeyValue` caches its connection at
 * module scope, so after `vi.resetModules()` a second connection is opened
 * while the first is still held, and the delete blocks forever.
 */
const clearIndexedDb = (): void => {
  globalThis.indexedDB = new IDBFactory();
};

beforeEach(() => {
  window.localStorage.clear();
  clearIndexedDb();
  vi.resetModules();
});

/**
 * Generous timeout: each case does real IndexedDB I/O and re-imports the whole
 * persistence module graph twice. That is fast alone but competes with ~230
 * other files under a full parallel run, where the 5s default is not enough.
 */
const IDB_TEST_TIMEOUT_MS = 30_000;

describe('export → clear site data → restore (real IndexedDB)', () => {
  it(
    'round-trips Days, Units, dayIds and calendar exceptions',
    async () => {
      const { repo, annualMod, backupMod } = await loadModules();

      annualMod.writeAnnualPlanStore({
        schemaVersion: 1,
        plans: {
          [CID]: {
            classroomId: CID,
            year: {
              semesters: {
                autumn: [
                  {
                    id: 'unit-1',
                    label: 'Blues',
                    monthIndex: 9,
                    theme: null,
                    weeks: [],
                    dayIds: ['d1', 'd2'],
                  },
                ],
                spring: [],
              },
            },
            seededFromTemplateAt: null,
            updatedAt: '2026-09-01T00:00:00.000Z',
            exceptions: { '2026-11-26': 'holiday' },
          },
        },
      } as never);

      repo.saveDay({ id: 'd1', label: 'Day 1', cells: {} } as never, CID);
      repo.saveDay({ id: 'd2', label: 'Day 2', cells: {} } as never, CID);
      repo.putSavedLessons(['d1']);
      await repo.ready();

      const backup = await backupMod.exportTeacherBackup('user-1');
      const serialized = JSON.stringify(backup);

      // The assertion that fails against a key-reading export once the plan
      // lives in IndexedDB.
      const planStore = backup.stores['ma-teacher:plan:v1'] as {
        days: Record<string, { id: string }>;
      };
      expect(planStore, 'plan missing from backup').toBeDefined();
      expect(Object.keys(planStore.days).sort()).toEqual(['d1', 'd2']);
      expect(backup.stores['ma-teacher:annualPlan:v1']).toBeDefined();

      // ── Clear site data ───────────────────────────────────────────────────
      window.localStorage.clear();
      clearIndexedDb();
      vi.resetModules();

      const fresh = await loadModules();
      await fresh.repo.ready();

      const report = await fresh.backupMod.restoreTeacherBackup(
        'user-1',
        fresh.backupMod.parseTeacherBackup(serialized),
      );
      expect(report.skipped).toEqual([]);

      expect(
        fresh.repo
          .listDays(CID)
          .map((d) => d.id)
          .sort(),
      ).toEqual(['d1', 'd2']);

      const plan = fresh.annualMod.readAnnualPlanStore().plans[
        CID
      ] as never as {
        year: { semesters: { autumn: { id: string; dayIds: string[] }[] } };
        exceptions: unknown;
      };
      expect(plan).toBeDefined();
      expect(plan.year.semesters.autumn[0].id).toBe('unit-1');
      expect(plan.year.semesters.autumn[0].dayIds).toEqual(['d1', 'd2']);
      expect(plan.exceptions).toEqual({ '2026-11-26': 'holiday' });

      expect(fresh.repo.listSavedLessons()).toEqual(['d1']);
    },
    IDB_TEST_TIMEOUT_MS,
  );

  it(
    'a backup taken AFTER the IndexedDB migration still contains the Days',
    async () => {
      const { repo, backupMod } = await loadModules();
      repo.saveDay({ id: 'dx', label: 'Later', cells: {} } as never, CID);
      await repo.ready();

      // Exactly what clearLegacy() does: the localStorage copy is gone.
      window.localStorage.removeItem('ma-teacher:plan:v1');

      const backup = await backupMod.exportTeacherBackup('user-1');
      const planStore = backup.stores['ma-teacher:plan:v1'] as {
        days: Record<string, unknown>;
      };
      expect(
        planStore,
        'reading the plan by localStorage key would produce an empty backup here',
      ).toBeDefined();
      expect(Object.keys(planStore.days)).toContain('dx');
    },
    IDB_TEST_TIMEOUT_MS,
  );
});
