import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownUp,
  Check,
  FolderPlus,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LEARN_GRID } from '@/components/explore/ExploreChrome';
import { AppIcons } from '@/components/icons/appIcons';
import {
  CAPTION,
  ICON_BUTTON,
  LIST_STRIPE,
  TAB,
  TAB_ACTIVE,
} from '@/components/kit/libraryLook';
import { WHITE_PILL } from '@/components/kit/pills';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { LibraryRoutes, StudioRoutes } from '@/constants/routes';
import { DialogHost } from '@/daw/ui/DialogHost';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { OFFICE_PAGE_TITLE } from '@/features/office/ui/styles';
import {
  LibraryCard,
  LibraryRow,
  ProjectCard,
  ProjectRow,
} from './LibraryTiles';
import { ProjectCoverPickerHost } from './ProjectCoverPicker';
import {
  filterLibrary,
  filterProjects,
  sortLibrary,
  toProjectEntries,
  type LibraryItem,
  type LibraryTab,
  type LibraryWhere,
  type ProjectEntry,
} from './libraryItems';
import {
  updateLibraryMeta,
  useLibraryMeta,
  type LibraryOrder,
  type LibrarySort,
} from './libraryLocalMeta';
import {
  GENRE_TAGS,
  STATUS_TAGS,
  tagLabel,
  type TagOption,
} from './libraryTags';
import { useLibraryActions, type LibraryActions } from './useLibraryActions';
import { useLibraryItems } from './useLibraryItems';

// ── /library: the student's Studio sessions and projects (owner, 2026-11-11)
// Samply's Library, audited on samply.app/library: "Library" large at the
// top left with Search and a white + at the right; small tabs under it; the
// sort and the grid/list toggle across from them; square cards or striped
// rows. A session is what the Studio makes; a project is the student's
// folder of sessions (Samply's projects, which hold its tracks). All shows
// the projects, then the sessions in none. Every session plays from here
// without the Studio (the player in the bar at the foot of the page).
// Nothing is uploaded: sessions are made in the Studio, never added as
// files.

const TABS: readonly { id: LibraryTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'projects', label: 'Projects' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'favorites', label: 'Favorites' },
];

const WHERES: readonly { id: Exclude<LibraryWhere, 'any'>; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'device', label: 'On this device' },
];

const SORTS: readonly { id: LibrarySort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'composer', label: 'Composer' },
  { id: 'created', label: 'Time created' },
  { id: 'modified', label: 'Last modified' },
  { id: 'played', label: 'Last played' },
];

/** The Studio, on a new session (parseBootIntent's ?new=1). */
const NEW_SESSION = `${StudioRoutes.editor.definition}?new=1`;

const tabOf = (word: string | null): LibraryTab =>
  TABS.some((t) => t.id === word) ? (word as LibraryTab) : 'all';

const whereOf = (word: string | null): LibraryWhere =>
  word === 'saved' || word === 'device' ? word : 'any';

/** What the order reads as for the sort: A–Z for words, newest for times. */
function orderLabels(sort: LibrarySort): Record<LibraryOrder, string> {
  return sort === 'name' || sort === 'composer'
    ? { newest: 'A to Z', oldest: 'Z to A' }
    : { newest: 'Recent first', oldest: 'Recent last' };
}

export function LibraryPage() {
  const reduced = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get('tab'));
  const where = whereOf(params.get('where'));
  const query = params.get('q') ?? '';
  const genre = params.get('genre');
  const status = params.get('status');
  const [searching, setSearching] = useState(query !== '');
  const meta = useLibraryMeta();
  const { items, loading, cloudFailed, signedIn, refresh } = useLibraryItems();
  const actions = useLibraryActions(refresh);
  const [now] = useState(() => Date.now());

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const filter = useMemo(
    () => ({ tab, where, query, genre, status, favorites: meta.favorites }),
    [tab, where, query, genre, status, meta.favorites],
  );
  const narrowed = Boolean(query || genre || status || where !== 'any');

  const entries = useMemo(
    () => toProjectEntries(meta.projects, items),
    [meta.projects, items],
  );
  const projects = useMemo(
    () =>
      sortLibrary(
        filterProjects(entries, filter),
        meta.sort,
        meta.order,
        meta.played,
      ),
    [entries, filter, meta.sort, meta.order, meta.played],
  );
  const sessions = useMemo(() => {
    if (tab === 'projects') return [];
    // All shows the sessions in no project, unless searching: then every
    // session that matches, wherever it is.
    const filed = new Set(meta.projects.flatMap((p) => p.sessions));
    const pool =
      tab === 'all' && !narrowed
        ? items.filter((i) => !filed.has(i.key))
        : items;
    return sortLibrary(
      filterLibrary(pool, filter),
      meta.sort,
      meta.order,
      meta.played,
    );
  }, [items, tab, narrowed, filter, meta]);

  const favorites = useMemo(() => new Set(meta.favorites), [meta.favorites]);
  const hasTags = items.some((item) => item.genre || item.status);
  const showProject = tab !== 'all' || narrowed;
  const empty = projects.length === 0 && sessions.length === 0;
  const both = projects.length > 0 && sessions.length > 0;

  const closeSearch = () => {
    setSearching(false);
    const next = new URLSearchParams(params);
    for (const key of ['q', 'genre', 'status', 'where']) next.delete(key);
    setParams(next, { replace: true });
  };

  const sessionTiles = (list: LibraryItem[]) =>
    meta.layout === 'grid' ? (
      <ul className={LEARN_GRID} aria-label="Sessions">
        {list.map((item) => (
          <li key={item.key}>
            <LibraryCard
              item={item}
              actions={actions}
              favorite={favorites.has(item.key)}
              projects={meta.projects}
              showProject={showProject}
            />
          </li>
        ))}
      </ul>
    ) : (
      <ul aria-label="Sessions">
        {list.map((item) => (
          <li key={item.key} className={LIST_STRIPE}>
            <LibraryRow
              item={item}
              actions={actions}
              favorite={favorites.has(item.key)}
              projects={meta.projects}
              showProject={showProject}
              now={now}
            />
          </li>
        ))}
      </ul>
    );

  const projectTiles = (list: ProjectEntry[]) =>
    meta.layout === 'grid' ? (
      <ul className={LEARN_GRID} aria-label="Projects">
        {list.map((entry) => (
          <li key={entry.key}>
            <ProjectCard
              entry={entry}
              actions={actions}
              favorite={favorites.has(entry.key)}
            />
          </li>
        ))}
      </ul>
    ) : (
      <ul aria-label="Projects">
        {list.map((entry) => (
          <li key={entry.key} className={LIST_STRIPE}>
            <ProjectRow
              entry={entry}
              actions={actions}
              favorite={favorites.has(entry.key)}
              now={now}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <div
      data-testid="library-page"
      className="relative isolate flex min-h-full w-full flex-col"
    >
      <DialogHost />
      <ProjectCoverPickerHost />
      {/* The head: the title, Search and New at its right. */}
      <div className="flex flex-col gap-[0.909rem] px-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className={OFFICE_PAGE_TITLE}>
            <Link
              to={LibraryRoutes.root()}
              onClick={closeSearch}
              className={cn('rounded-lg hover:text-white/85', FOCUS_RING)}
            >
              {searching ? 'Search' : 'Library'}
            </Link>
          </h1>
          <div className="flex items-center gap-2">
            {searching ? (
              <SearchField
                value={query}
                onChange={(q) => setParam('q', q)}
                onClose={closeSearch}
              />
            ) : (
              <button
                type="button"
                aria-label="Search your Library"
                title="Search"
                onClick={() => setSearching(true)}
                className={ICON_BUTTON}
              >
                <Search aria-hidden className="size-4" />
              </button>
            )}
            <NewMenu actions={actions} />
          </div>
        </div>

        {/* The tabs, and the sort and layout across from them. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav
              aria-label="Show"
              className="flex shrink-0 items-center gap-0.5"
            >
              {TABS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === tab}
                  onClick={() =>
                    setParam('tab', option.id === 'all' ? null : option.id)
                  }
                  className={cn(TAB, option.id === tab && TAB_ACTIVE)}
                >
                  {option.label}
                </button>
              ))}
            </nav>
            {(searching || narrowed) && (
              <>
                <span aria-hidden className="h-5 w-px shrink-0 bg-white/10" />
                {WHERES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={where === option.id}
                    onClick={() =>
                      setParam('where', where === option.id ? null : option.id)
                    }
                    className={cn(
                      TAB,
                      'shrink-0 border border-white/10',
                      where === option.id && TAB_ACTIVE,
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                {hasTags && (
                  <>
                    <TagChip
                      label="Genre"
                      options={GENRE_TAGS}
                      value={genre}
                      onPick={(v) => setParam('genre', v)}
                    />
                    <TagChip
                      label="Status"
                      options={STATUS_TAGS}
                      value={status}
                      onPick={(v) => setParam('status', v)}
                    />
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SortMenu sort={meta.sort} order={meta.order} />
            <div
              role="group"
              aria-label="Layout"
              className="flex h-8 items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5"
            >
              {(
                [
                  { id: 'grid', label: 'Grid', icon: LayoutGrid },
                  { id: 'list', label: 'List', icon: List },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  title={option.label}
                  aria-pressed={meta.layout === option.id}
                  onClick={() =>
                    updateLibraryMeta(() => ({ layout: option.id }))
                  }
                  className={cn(
                    TAB,
                    'h-7 px-2.5',
                    meta.layout === option.id && TAB_ACTIVE,
                  )}
                >
                  <option.icon aria-hidden className="size-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        key={`${tab}/${meta.layout}`}
        className="flex w-full flex-col gap-8 px-2 pb-14"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {cloudFailed && (
          <p role="status" className={CAPTION}>
            Your saved sessions couldn’t be loaded just now. What’s on this
            device is here.{' '}
            <button
              type="button"
              onClick={refresh}
              className="underline hover:text-white"
            >
              Try again
            </button>
          </p>
        )}
        {loading && items.length === 0 && meta.projects.length === 0 ? (
          <LoadingGrid list={meta.layout === 'list'} />
        ) : empty ? (
          <EmptyState
            tab={tab}
            filtered={narrowed}
            signedIn={signedIn}
            anything={items.length > 0 || meta.projects.length > 0}
            actions={actions}
          />
        ) : (
          <>
            {projects.length > 0 && (
              <Section title={both ? 'Projects' : null}>
                {projectTiles(projects)}
              </Section>
            )}
            {sessions.length > 0 && (
              <Section title={both ? 'Sessions' : null}>
                {sessionTiles(sessions)}
              </Section>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string | null;
  children: ReactNode;
}) {
  return (
    <section aria-label={title ?? undefined} className="flex flex-col gap-3">
      {title && (
        <h2 className="text-[0.852rem] font-semibold text-white/80">{title}</h2>
      )}
      {children}
    </section>
  );
}

/** The white +: a new session in the Studio, or a new project here. */
function NewMenu({ actions }: { actions: LibraryActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="New"
        title="New"
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full bg-white text-black hover:bg-white/85',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <Plus aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild className="gap-2">
          <Link to={NEW_SESSION}>
            <AppIcons.studio aria-hidden className="size-4" />
            New session
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => actions.newProject()}
        >
          <FolderPlus aria-hidden className="size-4" />
          New project…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchField({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-white/[0.08] pl-3 pr-1">
      <Search aria-hidden className="size-4 shrink-0 text-white/50" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Search sessions and projects"
        aria-label="Search sessions and projects"
        className="w-36 bg-transparent text-[0.852rem] text-white outline-none placeholder:text-white/40 sm:w-56 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className={cn(ICON_BUTTON, 'size-7 bg-transparent')}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function SortMenu({ sort, order }: { sort: LibrarySort; order: LibraryOrder }) {
  const labels = orderLabels(sort);
  const current = SORTS.find((s) => s.id === sort)?.label ?? 'Sort';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Sort: ${current}, ${labels[order]}`}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.75rem] font-medium text-white/60 hover:text-white',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <ArrowDownUp aria-hidden className="size-3.5" />
        {current}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="text-[0.75rem] font-normal text-white/50">
          Sort by
        </DropdownMenuLabel>
        {SORTS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => updateLibraryMeta(() => ({ sort: option.id }))}
            className="justify-between"
          >
            {option.label}
            {option.id === sort && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[0.75rem] font-normal text-white/50">
          Order
        </DropdownMenuLabel>
        {(['newest', 'oldest'] as const).map((value) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => updateLibraryMeta(() => ({ order: value }))}
            className="justify-between"
          >
            {labels[value]}
            {value === order && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TagChip({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly TagOption[];
  value: string | null;
  onPick: (value: string | null) => void;
}) {
  const shown = tagLabel(options, value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          TAB,
          'shrink-0 gap-1 border border-white/10',
          shown && TAB_ACTIVE,
        )}
      >
        {shown ?? label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onPick(null)}>
          Any {label.toLowerCase()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onPick(option.value)}
            className="justify-between"
          >
            {option.label}
            {option.value === value && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingGrid({ list }: { list: boolean }) {
  if (list) {
    return (
      <ul aria-busy="true" aria-label="Loading your Library">
        {Array.from({ length: 6 }, (_, n) => (
          <li
            key={n}
            className={cn(LIST_STRIPE, 'flex items-center gap-3 p-3')}
          >
            <span className="size-10 animate-pulse rounded-md bg-white/[0.06]" />
            <span className="h-3 w-48 animate-pulse rounded bg-white/[0.06]" />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      className={LEARN_GRID}
      aria-busy="true"
      aria-label="Loading your Library"
    >
      {Array.from({ length: 8 }, (_, n) => (
        <li key={n}>
          <div className="aspect-square animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="mt-2.5 h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  tab,
  filtered,
  signedIn,
  anything,
  actions,
}: {
  tab: LibraryTab;
  filtered: boolean;
  signedIn: boolean;
  anything: boolean;
  actions: LibraryActions;
}) {
  let title = 'Your Studio sessions live here';
  let line =
    'Make something in the Studio and it shows up here, ready to play without opening the Studio. Gather sessions into projects to keep them together.';
  let cta: ReactNode = (
    <Link to={NEW_SESSION} className={cn(WHITE_PILL, 'mt-2')}>
      Start a session
    </Link>
  );
  if (filtered) {
    title = 'Nothing matches';
    line = 'Try other words, or clear the filters.';
    cta = null;
  } else if (tab === 'projects') {
    title = 'No projects yet';
    line =
      'A project keeps sessions together: an album, a set, a class assignment.';
    cta = (
      <button
        type="button"
        onClick={() => actions.newProject()}
        className={cn(WHITE_PILL, 'mt-2')}
      >
        New project
      </button>
    );
  } else if (tab === 'favorites' && anything) {
    title = 'No favorites yet';
    line = 'Star a session or a project from its menu to keep it here.';
    cta = null;
  } else if (tab === 'sessions' && anything) {
    title = signedIn ? 'No sessions yet' : 'Sign in to see saved sessions';
    line = 'Sessions you make in the Studio show up here.';
  } else if (anything) {
    title = 'Everything is in a project';
    line = 'Open Projects to see them, or start a new session.';
  }
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-[1.05rem] font-semibold text-white">{title}</p>
      <p className={cn(CAPTION, 'max-w-sm text-[0.852rem] leading-5')}>
        {line}
      </p>
      {cta}
    </div>
  );
}
