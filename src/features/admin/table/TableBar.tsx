import { Link, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { isConsoleAdmin } from '../consoleRoles';
import { ChangesButton } from '../content/publishing/ChangesButton';
import { consoleTabClass } from '../ui/styles';
import {
  CATEGORY_NAV,
  categoryOf,
  isCortexGraphPath,
  isTableId,
  isTesseractPath,
  tableHref,
} from './tablePaths';

/**
 * The Cortex section's bar, over the graph and the tables alike, in the same
 * h-14 slot and shape as the content area's edit bar (MirrorBar), so moving
 * between the two keeps the page still.
 *
 * Left, one row of pills: first Cortex, the graph, which is the section's
 * default view, then Tesseract, the map of progression openings (owner, 1
 * Oct 2026), then the owner's ten categories of the Table. Cortex is lit
 * on the graph and its Integrity and Links pages (they switch between
 * themselves in the graph's own header), even with a row open beside the
 * graph, whose path names a table too; Tesseract is lit on its map, a row
 * beside it included, and Cortex is not. A category spanning several tables
 * (Recording, Year) is lit on any of them, and its views are switched below
 * the bar. Right, the ways out to what Cortex feeds: Changes and Publishing,
 * for admins. There is no Page | Table toggle: nothing here is a mirrored
 * page.
 */
export const TableBar = () => {
  const { pathname } = useLocation();
  const { table } = useParams();
  const { role } = useAuthContext();
  const admin = isConsoleAdmin(role);
  const onGraph = isCortexGraphPath(pathname);
  const onTesseract = isTesseractPath(pathname);
  const current =
    !onGraph && !onTesseract && isTableId(table) ? categoryOf(table) : null;

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-white/[0.08] px-6">
      {/* Scrolls sideways when the window is too narrow for all eleven. */}
      <nav
        aria-label="Cortex sections"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {/* Always the whole Atlas: the section's home, as the sidebar's
            Cortex item opens it. A row's own "Open in Cortex" is the way to
            its local graph. */}
        <Link
          to={AdminRoutes.cortex()}
          aria-current={onGraph ? 'page' : undefined}
          className={cn(
            consoleTabClass(onGraph, 'sm'),
            'shrink-0 whitespace-nowrap',
          )}
        >
          Cortex
        </Link>
        {/* The map of progression openings, a view of its own beside the
            graph. The pill opens it in C; a key picked there lives in the
            map's own URL. */}
        <Link
          to={AdminRoutes.cortexTesseract()}
          aria-current={onTesseract ? 'page' : undefined}
          className={cn(
            consoleTabClass(onTesseract, 'sm'),
            'shrink-0 whitespace-nowrap',
          )}
        >
          Tesseract
        </Link>
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-white/10" />
        {CATEGORY_NAV.map((category) => {
          const active = category === current;
          return (
            <Link
              key={category.label}
              // The lit pill goes back to the table showing (closing a row);
              // the others open their category's first table.
              to={
                active && isTableId(table)
                  ? tableHref(table)
                  : tableHref(category.defaultTable)
              }
              aria-current={active ? 'page' : undefined}
              className={cn(
                consoleTabClass(active, 'sm'),
                'shrink-0 whitespace-nowrap',
              )}
            >
              {category.label}
            </Link>
          );
        })}
      </nav>

      {admin && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* No app section is showing here, so Changes offers no Publish of
              its own: only the counts and the way to Publishing. */}
          <ChangesButton section={null} />
          <Link
            to={AdminRoutes.contentPublishing()}
            className={consoleTabClass(false, 'sm')}
          >
            Publishing
          </Link>
        </div>
      )}
    </div>
  );
};
