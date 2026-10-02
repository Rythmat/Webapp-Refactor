import { Suspense } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { TableBar } from './TableBar';
import { TableSkeleton } from './TableSkeleton';
import { isTableId } from './tableIds';
import { isCortexGraphPath, isTesseractPath } from './tablePaths';

/**
 * The Cortex section: everything under /console/cortex (the graph, its
 * default view, with Integrity and Links, and Tesseract, the map of
 * progression openings) and /console/table (the tables),
 * with one bar on top (`TableBar`), so the owner moves between the graph
 * and the tables without leaving the section. The names are the Table's
 * from before the owner renamed the section Cortex (1 Oct 2026).
 *
 * A full-height column like the content area's, so the graph or a table can
 * fill the page below the bar and scroll inside itself. The unsaved-changes
 * guard is one level up (`GuardOutlet`, in AdminPages), shared with the
 * content area.
 */
export const TableLayout = () => {
  const { pathname } = useLocation();
  const { table } = useParams();
  // Tesseract is a map too: a row open beside it names a table as well.
  const onGraph = isCortexGraphPath(pathname) || isTesseractPath(pathname);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TableBar />
      <div className="flex min-h-0 flex-1 flex-col">
        {/* The page below is lazy; the bar stays while it loads. A table
            loads over the same skeleton it shows while its rows are built.
            The graph's pages draw their own loading state once they are
            here, so until then the space stays empty, as it did in the
            content area. A row open beside the graph names a table too
            (`/console/cortex/artists/toto`), but it is still the graph. */}
        <Suspense
          fallback={
            onGraph ? (
              <p role="status" className="sr-only">
                Opening Cortex…
              </p>
            ) : (
              <TableSkeleton
                table={isTableId(table) ? table : undefined}
                label="Opening the table…"
              />
            )
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};
