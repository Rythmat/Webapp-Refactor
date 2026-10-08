import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';
import { Link, type LinkProps, useLocation } from 'react-router-dom';
import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminRoutes } from '@/constants/routes';
import { artistSlug } from '@/content/graph/slugs';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  type ContentKind,
  useContentItem,
} from '@/hooks/data/admin/useAdminContent';
import { isConsoleAdmin } from '../../consoleRoles';
// The Table's addresses only (tiny and eager-safe, eagerBoundary.test.ts).
import {
  firstTableHref,
  TABLE_FOR_CONTENT_KIND,
  tableForAppPage,
  tableHref,
  tableHrefForItem,
} from '../../table/tablePaths';
import { consoleTabClass } from '../../ui/styles';
import { OTHER_RECORD_KINDS } from '../otherRecords';
import { ChangesButton } from '../publishing/ChangesButton';
import { kindLabel } from '../publishing/kindLabels';
import { useRepoMode } from '../repo/useRepoMode';
import {
  consoleAppPath,
  MIRROR_BASE,
  segmentForKind,
  toAppPathname,
} from './mirrorPaths';

/**
 * The content area's edit bar, in the app's XP-bar slot (h-14).
 *
 * The sidebar is the navigation; this bar is about the page showing: what can
 * be edited here, the same content in the Table, the page's item in Cortex
 * (the graph, which lives in its own section now, not here), and the ways
 * to the other records, the vocabulary and Publishing. It is console chrome,
 * so it uses the console's router and kit.
 */

/**
 * The curriculum: in no category of the Table, since its lessons are one of
 * the other records.
 */
const isCurriculum = (appPath: string) => /^\/curriculum(\/|$)/.test(appPath);

/** The app page an app section opens on, as a console path. */
const mirrorPathFor = (segment: string) =>
  `${MIRROR_BASE}${segment === '/learn' ? '/learn?tab=Songs' : segment}`;

type Action = { label: string; to: string };

/** A song page's slug, when the page showing is one. */
const songSlugOf = (appPath: string): string | null => {
  const song = /^\/songs\/([^/]+)$/.exec(appPath);
  return song && song[1] !== 'setlists' ? song[1] : null;
};

/**
 * What the page showing can be edited as, where it has no in-place editor
 * yet. A song page has one (Preview | Edit); a course and a globe event open
 * their editors; a song's globe event opens the song's page in Edit.
 */
function contextActions(appPath: string, search: URLSearchParams): Action[] {
  const course = /^\/curriculum\/([^/]+)(?:\/(\d+))?/.exec(appPath);
  if (course) {
    return [
      {
        label: 'Edit course',
        to: AdminRoutes.lessonCourse(
          { genre: course[1] },
          course[2] ? { level: course[2] } : undefined,
        ),
      },
    ];
  }
  const event = appPath === '/atlas/globe' ? search.get('event') : null;
  if (event) {
    const song = songIdForEvent(event);
    return song
      ? [{ label: 'Edit song', to: `${MIRROR_BASE}/songs/${song}?edit=1` }]
      : [{ label: 'Edit event', to: tableHref('events', event) }];
  }
  return [];
}

/** The graph node the page showing is about, for the Cortex link's focus. */
function graphFocusFor(
  appPath: string,
  search: URLSearchParams,
): string | null {
  const song = /^\/songs\/([^/]+)$/.exec(appPath);
  if (song && song[1] !== 'setlists') return `song:${song[1]}`;
  if (appPath === '/atlas/globe') {
    const event = search.get('event');
    if (event) return `event:${event}`;
    const artist = search.get('artist');
    if (artist) return `artist:${artistSlug(artist)}`;
    const pathway = search.get('pathway');
    if (pathway) return `pathway:${pathway}`;
    const place = search.get('place');
    if (place?.startsWith('city:')) return `place:${place.slice(5)}`;
  }
  if (appPath === '/office') {
    const day = search.get('day');
    if (day) return `teach_day:${day}`;
  }
  return null;
}

/** A path segment as the router hands it to the page (`/db%201` → `db 1`). */
const segmentOf = (raw: string): string => {
  const segment = raw.replace(/^\//, '');
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** An item open in its full editor (`records/:kind/:id`), of a kind a table holds. */
interface EditedItem {
  kind: ContentKind;
  id: string;
}

/**
 * A link to the Table's row for the item the full editor has open. The URL
 * names the item by its store id and the row goes by its slug, so the item
 * is read — the editor's own query (`useContentItem`), not another request
 * — and until it has loaded, or for a new item, the link is `fallback`, the
 * kind's table.
 */
const ItemRowLink = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, 'to'> & EditedItem & { fallback: string }
>(({ kind, id, fallback, ...props }, ref) => {
  const item = useContentItem(id === 'new' ? undefined : id);
  const slug = item.data?.slug;
  const row = slug ? tableHrefForItem(kind, slug) : null;
  return <Link ref={ref} to={row ?? fallback} {...props} />;
});
ItemRowLink.displayName = 'ItemRowLink';

export const MirrorBar = () => {
  const { pathname, search } = useLocation();
  const { role } = useAuthContext();
  const admin = isConsoleAdmin(role);
  // Repo mode's store is the repo's own files, so there is nothing to
  // import from the repo into it.
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;

  const appPath = toAppPathname(pathname);
  const records = new RegExp(`^${MIRROR_BASE}/records/([^/]+)(/[^/]+)?`).exec(
    pathname,
  );
  const recordsKind = records?.[1] ?? null;
  // `records/:kind/:id`: an item's full editor, not a list.
  const recordsItem = Boolean(records?.[2]);
  const section = consoleAppPath(pathname);

  // Where the page showing is in the Table: its row when the page is about
  // one thing (a song page, the globe with an event, an artist or a city
  // open), its table otherwise.
  const inTable = appPath ? tableForAppPage(appPath, search) : null;
  const inTableHref = inTable ? tableHref(inTable.table, inTable.row) : null;
  // Page | Table: the same content as the page, or as rows — the course's
  // lessons for the curriculum. A list under Other records keeps its way
  // back to its page, and is the table itself. An item's full editor is
  // neither: its Table is the item's row (`ItemRowLink`; the kind's table
  // until the item has loaded, or for a new one), or for an other record its
  // list under Other records.
  const tableLink =
    inTableHref ??
    (appPath && isCurriculum(appPath)
      ? AdminRoutes.contentKind({ kind: 'activity_flow' })
      : null);
  const mirrorSegment = recordsKind ? segmentForKind(recordsKind) : null;
  // Own keys only, so a URL spelling `constructor` is not a kind.
  const kindTable =
    recordsKind &&
    Object.prototype.hasOwnProperty.call(TABLE_FOR_CONTENT_KIND, recordsKind)
      ? TABLE_FOR_CONTENT_KIND[recordsKind as ContentKind]
      : undefined;
  const kindTableHref = kindTable ? tableHref(kindTable) : null;
  const editedItem: EditedItem | null =
    kindTable && records?.[2]
      ? { kind: recordsKind as ContentKind, id: segmentOf(records[2]) }
      : null;
  const recordsTable =
    recordsKind && recordsItem
      ? (kindTableHref ?? AdminRoutes.contentKind({ kind: recordsKind }))
      : null;
  const toggle =
    appPath && tableLink
      ? { mirror: null, table: tableLink }
      : recordsKind && mirrorSegment
        ? { mirror: mirrorPathFor(mirrorSegment), table: recordsTable }
        : null;

  const params = new URLSearchParams(search);
  const actions = appPath ? contextActions(appPath, params) : [];
  const songSlug = appPath ? songSlugOf(appPath) : null;
  const editing = params.get('edit') === '1';
  const focus = appPath ? graphFocusFor(appPath, params) : null;

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-white/[0.08] px-6">
      {toggle && (
        <div
          role="group"
          aria-label="View"
          className="flex shrink-0 items-center gap-1"
        >
          {toggle.mirror ? (
            <Link to={toggle.mirror} className={consoleTabClass(false, 'sm')}>
              Page
            </Link>
          ) : (
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Page
            </span>
          )}
          {toggle.table && editedItem ? (
            <ItemRowLink
              {...editedItem}
              fallback={toggle.table}
              className={consoleTabClass(false, 'sm')}
            >
              Table
            </ItemRowLink>
          ) : toggle.table ? (
            <Link to={toggle.table} className={consoleTabClass(false, 'sm')}>
              Table
            </Link>
          ) : (
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Table
            </span>
          )}
        </div>
      )}

      {songSlug && (
        <div
          role="group"
          aria-label="Mode"
          className="flex shrink-0 items-center gap-1"
        >
          {editing ? (
            <Link to={pathname} className={consoleTabClass(false, 'sm')}>
              Preview
            </Link>
          ) : (
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Preview
            </span>
          )}
          {editing ? (
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Edit
            </span>
          ) : (
            <Link
              to={`${pathname}?edit=1`}
              className={consoleTabClass(false, 'sm')}
            >
              Edit
            </Link>
          )}
        </div>
      )}

      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-[#101012] transition-colors hover:bg-white/90"
        >
          {a.label}
        </Link>
      ))}

      {section === null && !recordsKind && (
        <span className="truncate text-sm text-white/45">Content</span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {admin && <ChangesButton section={section} />}
        {/* A way out to Cortex, the graph: on this page's item where the
            page is about one, the whole Atlas otherwise. Never lit here:
            the graph is Cortex's page, not the content area's. */}
        <Link
          to={AdminRoutes.cortex(undefined, focus ? { focus } : undefined)}
          className={consoleTabClass(false, 'sm')}
          title={focus ? 'This page’s item in Cortex' : 'The whole Atlas'}
        >
          Cortex
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className={consoleTabClass(false, 'sm')}>
            Records <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* The Table where this page (or the item being edited) is in
                it, then the records that are in no category of it. */}
            <DropdownMenuItem asChild>
              {editedItem && kindTableHref ? (
                <ItemRowLink {...editedItem} fallback={kindTableHref}>
                  Table
                </ItemRowLink>
              ) : (
                <Link to={inTableHref ?? kindTableHref ?? firstTableHref()}>
                  Table
                </Link>
              )}
            </DropdownMenuItem>
            {OTHER_RECORD_KINDS.map((kind) => (
              <DropdownMenuItem key={kind} asChild>
                <Link to={AdminRoutes.contentKind({ kind })}>
                  {kindLabel(kind)}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={AdminRoutes.contentVocabulary()}>Vocabulary</Link>
            </DropdownMenuItem>
            {admin && !repo && (
              <DropdownMenuItem asChild>
                <Link to={AdminRoutes.contentPublishingImport()}>
                  Import songs
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {/* Instrument content: grooves and parts the lessons and the
                Studio play. */}
            <DropdownMenuItem asChild>
              <Link to={AdminRoutes.parts()}>Parts Library</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={AdminRoutes.drumGrooves()}>Drum Grooves</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {admin && (
          <Link
            to={AdminRoutes.contentPublishing()}
            className={consoleTabClass(
              pathname.startsWith(AdminRoutes.contentPublishing()),
              'sm',
            )}
          >
            Publishing
          </Link>
        )}
      </div>
    </div>
  );
};
