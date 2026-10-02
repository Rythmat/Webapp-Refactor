import { describe, expect, it, vi } from 'vitest';

/**
 * The console's routes load with the app: App.tsx imports `adminPages`
 * eagerly, so AdminPages, the sidebar (and its Cortex icon), the content
 * area's bar and tablePaths.ts are in the bundle every student downloads. None of them may
 * pull in the heavy console code — the kind specs and their editors
 * (`kinds.ts`), the graph (`deriveGraph`), the picker registries
 * (`entityKinds`, which read every artist, city and song), the grid's
 * virtualiser (`react-window`), the Table's model, Cortex's layout and bar
 * or its pages (the graph, Integrity, Links), or the graph's own engine (its
 * WebGL renderer, `d3-force` and `d3-quadtree`, the layout's client) — not
 * directly, and not through anything they import. Those load through
 * `lazy()` when a console page opens.
 *
 * Checking import lines cannot see a transitive import or a relative
 * spelling, so here each forbidden module throws the moment anything loads
 * it, whatever the path (modelled on content/graph/__tests__/purity.test.ts).
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`eager console code loaded ${what}`);
  },
}));
vi.mock('@/features/admin/content/kinds', forbid('the kind specs'));
vi.mock('@/content/graph/deriveGraph', forbid('the graph'));
// The rest of the graph loads with it: its types and vocabularies, the
// event matcher, places, the instrument table, integrity, and the mind map's
// vocabulary and layout. The eager chrome needs only the slug helpers
// (`slugs.ts`) for its ids, and the graph's types as types.
vi.mock('@/content/graph/types', forbid('the graph'));
vi.mock('@/content/graph/eventMatches', forbid('the graph'));
vi.mock('@/content/graph/places', forbid('the graph'));
vi.mock('@/content/graph/instrumentGenres', forbid('the graph'));
vi.mock('@/content/graph/integrity', forbid('the graph'));
// The vocabulary the graph's genres and instruments are built from: the
// genre files and their tables, and what checks a save to them. Only the
// session instruments' own file (`instruments.json`) may load outside the
// console, for the song page's pills.
vi.mock('@/content/vocabulary/repo', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/tables', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/schemas', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/validate', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/genres.json', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/subgenres.json', forbid('the vocabulary'));
vi.mock('@/content/vocabulary/genreTagLists.json', forbid('the vocabulary'));
vi.mock(
  '@/features/admin/content/graph/graphVocabulary',
  forbid('the mind map'),
);
// Cortex's graph (Amendment 7): the layout's libraries, the WebGL renderer
// and its shaders, the layout's client and worker protocol, what turns the
// Atlas into what is drawn, and the canvas with its scene, layout,
// interaction and timelapse hooks. They come with the Cortex page's own
// chunk, never with the app.
vi.mock('d3-force', forbid('the graph layout'));
vi.mock('d3-quadtree', forbid('the graph layout'));
vi.mock(
  '@/features/admin/content/graph/map/render/webglRenderer',
  forbid('the graph renderer'),
);
vi.mock(
  '@/features/admin/content/graph/map/render/shaders',
  forbid('the graph renderer'),
);
vi.mock(
  '@/features/admin/content/graph/map/layout/layoutClient',
  forbid('the graph layout'),
);
vi.mock(
  '@/features/admin/content/graph/map/layout/forceLayout',
  forbid('the graph layout'),
);
vi.mock(
  '@/features/admin/content/graph/map/model/renderGraph',
  forbid('the drawn graph'),
);
vi.mock(
  '@/features/admin/content/graph/map/GraphCanvas',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/graph/map/graphScene',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/graph/map/useLayout',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/graph/map/useGraphInteraction',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/graph/map/TimelapseCanvas',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/graph/map/timelapsePlayer',
  forbid('the Cortex canvas'),
);
vi.mock(
  '@/features/admin/content/entities/entityKinds',
  forbid('the picker registries'),
);
vi.mock('react-window', forbid('react-window'));
// The model comes with the grid: the registry, its types and its edge groups,
// and what builds and queries it. The eager chrome needs only the ids
// (tableIds.ts), never the model.
vi.mock('@/features/admin/table/model/categories', forbid('the table model'));
vi.mock('@/features/admin/table/model/types', forbid('the table model'));
vi.mock('@/features/admin/table/model/edges', forbid('the table model'));
vi.mock('@/features/admin/table/model/aggregate', forbid('the table model'));
vi.mock(
  '@/features/admin/table/model/buildTableModel',
  forbid('the table model'),
);
vi.mock('@/features/admin/table/model/query', forbid('the table model'));
vi.mock('@/features/admin/table/TablePage', forbid('the Table page'));
vi.mock('@/features/admin/table/TableView', forbid('the Table page'));
vi.mock('@/features/admin/table/TableSkeleton', forbid('the Table page'));
vi.mock('@/features/admin/table/data/useTableModel', forbid('the Table page'));
vi.mock('@/features/admin/table/ValidationNotice', forbid('the Table page'));
// The Cortex section's layout and bar (named for the Table they began as).
vi.mock('@/features/admin/table/TableLayout', forbid('the Cortex layout'));
vi.mock('@/features/admin/table/TableBar', forbid('the Cortex bar'));
// Cortex's graph pages and the map's URL state load only when the section
// is opened; the sidebar and the bars link to them by their route constants.
vi.mock(
  '@/features/admin/content/graph/MindMapPage',
  forbid('the Cortex page'),
);
vi.mock(
  '@/features/admin/content/graph/IntegrityPage',
  forbid('the Cortex page'),
);
vi.mock(
  '@/features/admin/content/graph/LegacyLinkPage',
  forbid('the Cortex page'),
);
vi.mock(
  '@/features/admin/content/graph/map/useGraphUrlState',
  forbid('the Cortex page'),
);
// The grid, its toolbar and its URL state load with the Table page.
vi.mock('@/features/admin/table/grid/TableGrid', forbid('the grid'));
vi.mock('@/features/admin/table/grid/VirtualTable', forbid('the grid'));
vi.mock('@/features/admin/table/grid/TableToolbar', forbid('the grid'));
vi.mock('@/features/admin/table/grid/cells/CellView', forbid('the grid'));
vi.mock('@/features/admin/table/grid/tableQuery', forbid('the grid'));
vi.mock('@/features/admin/table/grid/useTableUrlState', forbid('the grid'));
vi.mock('@/features/admin/table/grid/useVisibleColumns', forbid('the grid'));
vi.mock('@/features/admin/table/grid/rowHistory', forbid('the grid'));
// The row panel is the Table's second chunk, loaded with the first row opened.
vi.mock(
  '@/features/admin/table/panel/TableDetailPanel',
  forbid('the row panel'),
);
vi.mock(
  '@/features/admin/table/panel/PanelConnections',
  forbid('the row panel'),
);
vi.mock(
  '@/features/admin/table/panel/fullConnections',
  forbid('the row panel'),
);
// And what it edits with: the item session, the record editors, the song's
// connections and the event's card, the save bar.
vi.mock(
  '@/features/admin/content/itemEditor/useItemSession',
  forbid('the item session'),
);
vi.mock('@/features/admin/table/panel/SongPanel', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/EventPanel', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/PanelSaveBar', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/PanelFrame', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/findField', forbid('the row panel'));
// "New …" makes its item where a row's panel would be: the same chunk.
vi.mock('@/features/admin/table/panel/NewItemPanel', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/newItems', forbid('the row panel'));
// Link…: which item and field each derived column writes (read by the grid
// for its cells' Link…, so the grid's chunk), and the dialog that writes it
// (loaded when one is opened).
vi.mock('@/features/admin/table/link/links', forbid('the grid'));
vi.mock(
  '@/features/admin/table/link/ConfirmConnectionDialog',
  forbid('the Link… dialog'),
);
// What the dialog shares with the cell edits to come: the base a write builds
// on, the owner's candidates, and the one rule for what can be saved (the
// row panel's, and next the grid's).
vi.mock('@/features/admin/table/link/ownerBase', forbid('the Link… dialog'));
vi.mock('@/features/admin/table/link/candidates', forbid('the Link… dialog'));
vi.mock('@/features/admin/table/edit/editability', forbid('the row panel'));
vi.mock('@/features/admin/table/edit/useWaitingFor', forbid('the row panel'));
// The cell edits' core: the ops a commit writes, the unconfirmed marks, and
// which editor a cell opens — the grid's chunk, and the write queue's.
vi.mock('@/features/admin/table/edit/cellOps', forbid('the cell edits'));
vi.mock('@/features/admin/table/edit/unverified', forbid('the cell edits'));
vi.mock('@/features/admin/table/edit/editorFor', forbid('the cell edits'));
// And their writing: the queue, what each cell shows meanwhile, the item
// lock the row panel and Link… share, and the page's provider.
vi.mock('@/features/admin/table/edit/writeQueue', forbid('the cell edits'));
vi.mock('@/features/admin/table/edit/cellEditStore', forbid('the cell edits'));
vi.mock('@/features/admin/table/edit/itemLock', forbid('the cell edits'));
vi.mock(
  '@/features/admin/table/edit/cellWriteContext',
  forbid('the cell edits'),
);
vi.mock(
  '@/features/admin/table/edit/CellWriteProvider',
  forbid('the cell edits'),
);
// Editing in the grid: a cell's values and what a commit writes, the
// grid's side of the queue, the cell's menu and the keys' help — the grid's
// chunk — and the editors themselves, the Table's third chunk.
vi.mock('@/features/admin/table/edit/cellValues', forbid('the cell edits'));
vi.mock('@/features/admin/table/edit/useGridEditing', forbid('the cell edits'));
vi.mock('@/features/admin/table/grid/gridEditing', forbid('the grid'));
vi.mock('@/features/admin/table/grid/CellMenu', forbid('the grid'));
vi.mock('@/features/admin/table/grid/KeyboardHelp', forbid('the grid'));
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
vi.mock('@/features/admin/content/recordEditors', forbid('the record editors'));
vi.mock(
  '@/features/admin/content/recordEditors/shared',
  forbid('the record editors'),
);
// Each by name: vi.mock is hoisted, so it cannot run in a loop.
vi.mock(
  '@/features/admin/content/recordEditors/ArtistFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/ReleaseFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/StudioFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/LabelFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/PlaceFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/ProgressionFields',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/refusals',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/recordEditors/parse',
  forbid('the record editors'),
);
vi.mock(
  '@/features/admin/content/songEditor/ConnectionsPanel',
  forbid('the song editor'),
);
vi.mock(
  '@/features/admin/content/visual/GlobeEventVisualEditor',
  forbid('the event editor'),
);
// The working graph (the export merged over the repo, then built) is the
// Table's and the mind map's data, and loads with them.
vi.mock(
  '@/features/admin/content/graph/workingSnapshot',
  forbid('the working snapshot'),
);
vi.mock(
  '@/features/admin/content/graph/useWorkingGraph',
  forbid('the working graph'),
);
// Suggestions and bulk writes come with the Table's review work and the
// Links page, both lazy.
vi.mock('@/content/suggestions/apply', forbid('the suggestions'));
vi.mock('@/content/suggestions/status', forbid('the suggestion status'));
vi.mock(
  '@/features/admin/content/bulk/useBulkWrite',
  forbid('the bulk write loop'),
);
// The Table's side of them: the suggestions API, the ghosts and counts the
// grid shows, the row panel's Suggestions, the bulk accept and the
// decisions banner — the grid's chunk, the panel's, and the dialog's own.
vi.mock('@/hooks/data/admin/useSuggestions', forbid('the suggestions API'));
vi.mock('@/features/admin/table/model/ghosts', forbid('the table model'));
vi.mock(
  '@/features/admin/table/data/tableSuggestions',
  forbid('the Table page'),
);
vi.mock(
  '@/features/admin/table/data/useTableSuggestions',
  forbid('the Table page'),
);
vi.mock('@/features/admin/table/DecisionsBanner', forbid('the Table page'));
vi.mock(
  '@/features/admin/table/panel/SuggestionsSection',
  forbid('the row panel'),
);
vi.mock(
  '@/features/admin/table/bulk/BulkAcceptDialog',
  forbid('the bulk accept'),
);
vi.mock('@/features/admin/table/bulk/bulkAccept', forbid('the bulk accept'));
vi.mock('@/features/admin/table/bulk/useBulkAccept', forbid('the bulk accept'));
// What a save states that a suggestion offered, logged; the pin-move report
// a City shows; the draft laid onto a newer version; Publishing's count of
// bulk accepts nobody reviewed (lazy there, as the popover's is).
vi.mock('@/features/admin/table/data/logWritten', forbid('the row panel'));
vi.mock('@/features/admin/table/data/pinMoves', forbid('the row panel'));
vi.mock('@/features/admin/table/panel/PinMoves', forbid('the row panel'));
vi.mock(
  '@/features/admin/content/itemEditor/rebase',
  forbid('the item session'),
);
vi.mock(
  '@/features/admin/content/itemEditor/readItem',
  forbid('the item session'),
);
vi.mock(
  '@/features/admin/content/publishing/BulkUnreviewed',
  forbid('the suggestions API'),
);
// The draft's own edges in the row panel, and Publishing's pin-move report
// before an artist release (lazy there, loaded only while artists changed).
vi.mock('@/features/admin/table/panel/draftEdges', forbid('the row panel'));
vi.mock(
  '@/features/admin/content/publishing/ArtistPinMoves',
  forbid('the pin-move report'),
);
vi.mock(
  '@/features/admin/content/publishing/releasePinMoves',
  forbid('the pin-move report'),
);
// The suggestion importer is a Node script (node:fs, the network): the app
// reads its committed artifacts, never the importer itself.
vi.mock('@/scripts/enrichment/import/fileCache', forbid('the importer cache'));
vi.mock('@/scripts/enrichment/import/politeHttp', forbid('the importer HTTP'));
vi.mock('@/scripts/enrichment/import/musicbrainz', forbid('the importer'));
vi.mock('@/scripts/enrichment/import/wikidata', forbid('the importer'));
vi.mock('@/scripts/enrichment/import/artistFetch', forbid('the importer'));

/**
 * The first import transforms the whole eager console graph, which takes
 * about a second alone and well past vitest's 5 s default when the whole
 * suite runs in parallel.
 */
const IMPORT_TIMEOUT = 30_000;

const MODULES: Record<string, () => Promise<unknown>> = {
  Sidebar: () => import('@/layouts/DashboardLayout/Sidebar'),
  CortexIcon: () => import('@/components/icons/CortexIcon'),
  MirrorBar: () => import('@/features/admin/content/mirror/MirrorBar'),
  tablePaths: () => import('../tablePaths'),
  tableIds: () => import('../tableIds'),
  otherRecords: () => import('@/features/admin/content/otherRecords'),
  AdminPages: () => import('@/features/admin/AdminPages'),
};

describe('the eager console modules', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without the heavy console code',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
    IMPORT_TIMEOUT,
  );

  it(
    'would notice if one did',
    async () => {
      // The guard itself: a forbidden module really does refuse to load (vitest
      // wraps the factory's error in its own mocking message).
      await expect(import('@/features/admin/content/kinds')).rejects.toThrow();
      await expect(
        import('@/features/admin/table/TablePage'),
      ).rejects.toThrow();
      await expect(
        import('@/features/admin/content/graph/MindMapPage'),
      ).rejects.toThrow();
      await expect(import('d3-force')).rejects.toThrow();
      await expect(
        import('@/features/admin/content/graph/map/render/webglRenderer'),
      ).rejects.toThrow();
      await expect(import('react-window')).rejects.toThrow();
      await expect(
        import('@/scripts/enrichment/import/fileCache'),
      ).rejects.toThrow();
      // And one import away: the item editor's hook reads the kind specs by a
      // relative path (`../kinds`), and that is refused too — by the kind
      // specs' own guard, not some other failure on the way.
      await expect(
        import('@/features/admin/content/itemEditor/useContentItemEditor'),
      ).rejects.toHaveProperty(
        'cause.message',
        'eager console code loaded the kind specs',
      );
    },
    IMPORT_TIMEOUT,
  );
});
