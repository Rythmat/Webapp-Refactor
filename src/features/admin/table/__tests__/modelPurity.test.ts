import { describe, expect, it, vi } from 'vitest';

/**
 * The Table's model stays pure: the registry, its types and the route-free
 * ids are read by the model builder, which may run in a worker and is tested
 * without a DOM, and `tableIds.ts` also loads with the console's routes. So
 * none of them may pull in React, the router, the grid's virtualiser, the
 * content store or the globe's artist index (both read the store), or the
 * kind specs with their editors — not directly, and not through anything
 * they import. The cell edits' core is held to the same: the ops a commit
 * writes (`cellOps`), where a value is marked unconfirmed (`unverified`),
 * which editor a cell opens and whether it can be written (`editorFor`, and
 * the rule it shares with the row panel, `editability`) — and the write
 * queue itself, its cell store and its item lock, which its tests run
 * without a DOM (the provider is their only React) — and what a scalar
 * cell holds and writes (`cellValues`), how an editor's draft reads
 * (`editors/parse`, with the record editors' own year and coordinate
 * rules) and the grid's editing contract (`gridEditing`).
 *
 * The graph's own purity test (content/graph/__tests__/purity.test.ts) holds
 * the graph modules this imports; this one holds the Table's. Each forbidden
 * module throws the moment anything loads it, whatever the path.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`table model loaded ${what}`);
  },
}));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));
vi.mock('react-router', forbid('the router'));
vi.mock('react-router-dom', forbid('the router'));
vi.mock('react-window', forbid('react-window'));
// The route constants bring the router: the model uses the ids, not hrefs.
vi.mock('@/constants/routes', forbid('the route constants'));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock('@/features/admin/content/kinds', forbid('the kind specs'));
// The grid's chunk reads these modules, and must not bring the pickers or
// the Link… dialog with it: they load lazily, with the editors (design §7).
vi.mock(
  '@/features/admin/content/entities/entityKinds',
  forbid('the picker registries'),
);
vi.mock(
  '@/features/admin/content/entities/EntityPicker',
  forbid('the pickers'),
);
vi.mock(
  '@/features/admin/table/link/ConfirmConnectionDialog',
  forbid('the Link… dialog'),
);

const MODULES: Record<string, () => Promise<unknown>> = {
  tableIds: () => import('../tableIds'),
  types: () => import('../model/types'),
  edges: () => import('../model/edges'),
  categories: () => import('../model/categories'),
  aggregate: () => import('../model/aggregate'),
  buildTableModel: () => import('../model/buildTableModel'),
  query: () => import('../model/query'),
  editability: () => import('../edit/editability'),
  cellOps: () => import('../edit/cellOps'),
  unverified: () => import('../edit/unverified'),
  editorFor: () => import('../edit/editorFor'),
  itemLock: () => import('../edit/itemLock'),
  cellEditStore: () => import('../edit/cellEditStore'),
  writeQueue: () => import('../edit/writeQueue'),
  cellValues: () => import('../edit/cellValues'),
  editorParse: () => import('../edit/editors/parse'),
  recordParse: () => import('../../content/recordEditors/parse'),
  gridEditing: () => import('../grid/gridEditing'),
};

describe('the pure Table modules', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without React, the router or the store',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
  );

  it('would notice if one did', async () => {
    // The guard itself: a forbidden module really does refuse to load.
    await expect(import('react')).rejects.toThrow();
    await expect(import('@/constants/routes')).rejects.toThrow();
    // And one import away: the hrefs module builds on the route constants.
    await expect(import('../tablePaths')).rejects.toHaveProperty(
      'cause.message',
      'table model loaded the route constants',
    );
  });
});
