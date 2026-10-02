import { describe, expect, it, vi } from 'vitest';

/**
 * The grid's chunk stays light (design §7). The Table page loads the grid,
 * its model and its cell edits' core; three things load later, each with
 * what needs it:
 *
 *  - the cell editors (`edit/editors/*`), the Table's third chunk, on the
 *    first edit (and ahead of it once the grid has focus);
 *  - the pickers and their registries (`EntityPicker`, `entityKinds`, which
 *    read every artist, city and song), with the editors that pick (a later
 *    phase) and with the row panel;
 *  - the Link… dialog and its candidates, when one is opened, and the row
 *    panel with its record editors, with the first row opened.
 *
 * So none of those may load with the grid, the page, or anything they
 * import. Each forbidden module throws the moment anything loads it,
 * whatever the path (as eagerBoundary.test.ts does for the eager chrome).
 */

const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`the grid's chunk loaded ${what}`);
  },
}));
vi.mock(
  '@/features/admin/content/entities/entityKinds',
  forbid('the picker registries'),
);
vi.mock(
  '@/features/admin/content/entities/EntityPicker',
  forbid('the pickers'),
);
vi.mock(
  '@/features/admin/content/entities/EntityMultiPicker',
  forbid('the pickers'),
);
vi.mock(
  '@/features/admin/table/link/ConfirmConnectionDialog',
  forbid('the Link… dialog'),
);
vi.mock('@/features/admin/table/link/candidates', forbid('the Link… dialog'));
vi.mock('@/features/admin/content/recordEditors', forbid('the record editors'));
vi.mock(
  '@/features/admin/content/recordEditors/shared',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/table/panel/TableDetailPanel',
  forbid('the row panel'),
);
// The cell editors: the third chunk.
vi.mock(
  '@/features/admin/table/edit/editors/CellEditorHost',
  forbid('the cell editors'),
);
vi.mock(
  '@/features/admin/table/edit/editors/InlineEditor',
  forbid('the cell editors'),
);
vi.mock(
  '@/features/admin/table/edit/editors/ChoiceEditor',
  forbid('the cell editors'),
);
vi.mock(
  '@/features/admin/table/edit/editors/EditorParts',
  forbid('the cell editors'),
);
vi.mock(
  '@/features/admin/table/edit/editors/parse',
  forbid('the cell editors'),
);

/** The first import transforms the Table's whole grid chunk. */
const IMPORT_TIMEOUT = 30_000;

const MODULES: Record<string, () => Promise<unknown>> = {
  VirtualTable: () => import('../VirtualTable'),
  TableGrid: () => import('../TableGrid'),
  CellView: () => import('../cells/CellView'),
  CellMenu: () => import('../CellMenu'),
  KeyboardHelp: () => import('../KeyboardHelp'),
  gridEditing: () => import('../gridEditing'),
  cellValues: () => import('../../edit/cellValues'),
  useGridEditing: () => import('../../edit/useGridEditing'),
  TableView: () => import('../../TableView'),
  TablePage: () => import('../../TablePage'),
};

describe('the grid’s chunk', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without the editors, the pickers or the Link… dialog',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
    IMPORT_TIMEOUT,
  );

  it(
    'would notice if it did',
    async () => {
      await expect(
        import('@/features/admin/table/edit/editors/CellEditorHost'),
      ).rejects.toThrow();
      await expect(
        import('@/features/admin/content/entities/entityKinds'),
      ).rejects.toThrow();
      await expect(
        import('@/features/admin/table/link/ConfirmConnectionDialog'),
      ).rejects.toThrow();
    },
    IMPORT_TIMEOUT,
  );
});
