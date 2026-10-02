import { AdminRoutes } from '@/constants/routes';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  CATEGORY_NAV,
  tableRowForItem,
  tableRowForNode,
  type TableId,
} from './tableIds';

/**
 * The Table's addresses: the URL of each table, of each row, and of the row
 * a graph node is; and which pages belong to the Cortex section, the
 * sidebar item that holds the graph and the tables together.
 *
 * Safe to load eagerly: the sidebar, the route tree and the content area's
 * bar load with the console's routes, which ship in the bundle every student
 * downloads, and they are what will link into the Table. So this file stays
 * tiny and imports nothing but the route constants and the Table's ids — the
 * table itself, its model and the graph load only when a table is opened
 * (eagerBoundary.test.ts holds this).
 *
 * The ids themselves are in `tableIds.ts`, which has no router, so the pure
 * model can use them; they are re-exported here for the pages and the bar.
 */

export {
  CATEGORY_NAV,
  categoryOf,
  isTableId,
  TABLE_FOR_CONTENT_KIND,
  TABLE_FOR_NODE_KIND,
  TABLE_IDS,
  tableForAppPage,
  tableRowForItem,
  tableRowForNode,
  type TableCategory,
  type TableId,
  type TableTarget,
} from './tableIds';

/** A table's URL, or one of its rows'. */
export const tableHref = (table: TableId, row?: string): string =>
  row ? AdminRoutes.tableRow({ table, row }) : AdminRoutes.tableList({ table });

/**
 * The first table, artists: where a link that means "the tables" goes. The
 * bare /console/table names no table, and now opens the Cortex section's
 * default view, the graph, so a link meant for a table points here instead.
 */
export const firstTableHref = (): string =>
  tableHref(CATEGORY_NAV[0].defaultTable);

/** `path` is `base` itself or a page under it. */
const isAtOrUnder = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);

/**
 * The page showing is Tesseract, the map of progression openings, with or
 * without a row open beside it. Its own pill is lit there, not Cortex's.
 */
export const isTesseractPath = (pathname: string): boolean =>
  isAtOrUnder(pathname, AdminRoutes.cortexTesseract());

/**
 * The page showing is Cortex's graph or one of its sub-pages: the map (with
 * or without a row open beside it), Integrity or Links. The Cortex pill is
 * lit there, and no category's pill is, even with a row such as
 * `/console/cortex/artists/toto` open beside the graph. Tesseract lives
 * under the same path but has a pill of its own, so it is not one of them.
 */
export const isCortexGraphPath = (pathname: string): boolean =>
  isAtOrUnder(pathname, AdminRoutes.cortex()) && !isTesseractPath(pathname);

/**
 * The page showing is in the Cortex section: the graph and its sub-pages,
 * Tesseract, or any of the tables (owner, 1 Oct 2026: the tables are part
 * of Cortex). The sidebar's Cortex item is lit on all of them.
 */
export const isCortexSectionPath = (pathname: string): boolean =>
  isAtOrUnder(pathname, AdminRoutes.cortex()) ||
  isAtOrUnder(pathname, AdminRoutes.table());

/**
 * The row a graph node is, as a URL (`artist:toto` →
 * `/console/table/artists/toto`); null for a node no table holds.
 */
export const tableHrefForNode = (id: string): string | null => {
  const target = tableRowForNode(id);
  return target ? tableHref(target.table, target.row) : null;
};

/**
 * The row a content item is, as a URL (`globe_event`, `evt-woodstock` →
 * `/console/table/events/evt-woodstock`); null for a kind no table holds.
 */
export const tableHrefForItem = (
  kind: ContentKind,
  slug: string,
): string | null => {
  const target = tableRowForItem(kind, slug);
  return target ? tableHref(target.table, target.row) : null;
};
