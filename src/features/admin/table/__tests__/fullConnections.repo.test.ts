import { describe, expect, it, vi } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { allConnections } from '@/components/atlas/data/eventConnections';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import { buildGraph, type GraphSnapshot } from '@/content/graph/deriveGraph';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import { CANONICAL_ANNUAL_TEMPLATE } from '@/features/classroom/annual/curriculumTemplate';
import { getTableModel, type TableInput } from '../model/buildTableModel';
import { TABLE_IDS } from '../tableIds';
import { expectFullListsMatchCells } from './fullListsMatch';

/**
 * The row panel's full lists on the repo's own graph: every connections
 * column of every row of every table, walked in full, is the grid's cell with
 * nothing cut (fullListsMatch.ts). The fixture shows each rule; this holds
 * the panel's walk and the grid's together on every shape the real data has
 * — hubs, rollups through guesses, subgenres, decades, the Key table's
 * narrowing.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list (as in buildTableModel.repo.test.ts).
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

const units = [
  ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
  ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
];
const snapshot: GraphSnapshot = {
  songs: Object.values(BUNDLED_SONGS),
  progressions: LIB,
  artists: ARTIST_REGISTRY,
  places: CITIES,
  events: BUNDLED_MUSIC_HISTORY,
  dayStubs: units.flatMap((u) => u.dayStubs),
  pathways: HISTORICAL_MODULES,
  influenceArcs: allConnections(),
};
const input: TableInput = { graph: buildGraph(snapshot), snapshot };

// Every row of every table: a few seconds when the whole suite runs at once.
const TIMEOUT = 30_000;

describe('the row panel on the repo data', () => {
  let cells = 0;

  it.each(TABLE_IDS)(
    'lists the %s columns in full, the grid cells with nothing cut',
    (table) => {
      // The repo has no records yet (they come with the import): that table
      // has no rows to check.
      cells += expectFullListsMatchCells(input, getTableModel(input, table));
    },
    TIMEOUT,
  );

  it('checked the tables that have rows, every cell', () => {
    expect(cells).toBeGreaterThan(10_000);
  });

  it(
    'narrows as the Key table does',
    () => {
      const narrow = 'mode:minor' as const;
      expect(input.graph.nodes.has(narrow)).toBe(true);
      const model = getTableModel(input, 'keys', { narrow });
      expectFullListsMatchCells(input, model, narrow);
    },
    TIMEOUT,
  );
});
