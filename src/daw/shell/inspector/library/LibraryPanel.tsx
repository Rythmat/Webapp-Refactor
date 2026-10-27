import {
  ArrowDownUp,
  AudioLines,
  AudioWaveform,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Search,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { cn } from '@/components/utilities';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { addLibraryAudio } from '@/daw/library/addLibraryAudio';
import {
  useLibraryAudio,
  type LibraryAudioItem,
} from '@/daw/library/audioLibrary';
import { useLibraryProjects } from '@/daw/library/useLibraryProjects';
import { openSession } from '@/daw/session/openSession';
import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import type { ProjectRow } from '@/daw/shell/projects/projectRows';
import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { ProjectsIcon } from '@/daw/ui/icons/ProjectsIcon';
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { LibraryAudioRow } from './LibraryAudioRow';
import { groupByDay, stopPreview, timeAgo } from './libraryHelpers';

// ── The Studio Library (after Suno Studio's Library) ───────────────────────
//
// Home: five sections, in order — Audio, Favorites, Stems, Uploads and the
// user's Projects — each its newest five, if any (owner, 2026-10-24). A
// section's heading opens everything in it: its full list: filters (sort, ♡, This song, and on Audio the kind), rows
// grouped by day, each one previewable, draggable onto the timeline, or
// added with its menu; Projects' heading opens the Projects window.
//
// Stems are what Export › Stems rendered; uploads, audio files uploaded into
// a project; both are kept on this device (daw/library/audioLibrary).
//
// It wears Insight's design (owner, 2026-10-25; InsightCard): each section
// and each day of a list is the prompt box's card, names in 15 px white,
// the rest in quieter 13 px, and the box's round pills for filters.

type View = 'home' | 'all' | 'favorites' | 'stems' | 'uploads';
type Sort = 'new' | 'old' | 'name';

/** A key-center color (Music Atlas's palette) as CSS. */
const key = (index: keyof typeof KEY_COLORS) =>
  `rgb(${KEY_COLORS[index].join(', ')})`;

const TILES: {
  view: Exclude<View, 'home'>;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { view: 'all', label: 'Audio', icon: AudioLines, color: key(8) },
  { view: 'favorites', label: 'Favorites', icon: Heart, color: key(10) },
  { view: 'stems', label: 'Stems', icon: AudioWaveform, color: key(7) },
  { view: 'uploads', label: 'Uploads', icon: Upload, color: key(12) },
];

const TITLE: Record<Exclude<View, 'home'>, string> = {
  all: 'Audio',
  favorites: 'Favorites',
  stems: 'Stems',
  uploads: 'Uploads',
};

const EMPTY: Record<Exclude<View, 'home'>, string> = {
  all: 'Stems you export and audio you upload will appear here.',
  favorites: 'Tap ♡ on a stem or upload to keep it here.',
  stems: 'Export › Stems saves each stem here, ready to use in any song.',
  uploads: 'Audio files you upload into a song will appear here.',
};

/** How many of a section's items its home shows; its heading opens all. */
const FIRST_SHOWN = 5;

/** The items each home section lists, newest first (as they come). */
const IN_SECTION: Record<
  Exclude<View, 'home'>,
  (item: LibraryAudioItem) => boolean
> = {
  all: () => true,
  favorites: (i) => i.favorite,
  stems: (i) => i.kind === 'stem',
  uploads: (i) => i.kind === 'upload',
};

const SORT_LABEL: Record<Sort, string> = {
  new: 'Newest',
  old: 'Oldest',
  name: 'Name',
};

/** A filter: the prompt box's hairline pill, white when on. */
const chipClass = (on: boolean) =>
  cn(
    'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium outline-none transition-colors duration-75 focus-visible:ring-2 focus-visible:ring-white/40',
    on
      ? 'border-transparent bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover'
      : 'border-white/10 text-white/85 hover:bg-white/[0.06] hover:text-white',
  );

/** A row in a card: a project, a stem, an upload. */
export const LIBRARY_ROW =
  'flex h-16 w-full items-center gap-2.5 rounded-[14px] px-2 text-left transition-colors hover:bg-white/[0.06]';

const addToSong = (item: LibraryAudioItem) => void addLibraryAudio(item.id, 0);

export function LibraryPanel() {
  const [view, setView] = useState<View>('home');
  // The preview stops when the panel goes.
  useEffect(() => stopPreview, []);
  return view === 'home' ? (
    <LibraryHome onOpen={setView} />
  ) : (
    <LibraryList view={view} onBack={() => setView('home')} />
  );
}

// ── Home ───────────────────────────────────────────────────────────────────

function LibraryHome({ onOpen }: { onOpen: (view: View) => void }) {
  const { items, loaded } = useLibraryAudio();
  const { rows, loading } = useLibraryProjects(true);
  const openProjects = useProjectsDialogStore((s) => s.openDialog);
  return (
    <div
      data-testid="library-home"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
      style={{ scrollbarWidth: 'thin' }}
    >
      {TILES.map(({ view, label, icon, color }) => (
        <HomeSection
          key={view}
          id={view}
          label={label}
          icon={icon}
          color={color}
          headingLabel={`Open ${label}`}
          onHeading={() => onOpen(view)}
          items={loaded ? items.filter(IN_SECTION[view]) : null}
          empty={EMPTY[view]}
          render={(item) => (
            <LibraryAudioRow key={item.id} item={item} onAdd={addToSong} />
          )}
        />
      ))}
      <HomeSection
        id="projects"
        label="Projects"
        icon={ProjectsIcon}
        color={key(3)}
        headingLabel="Open the Projects window"
        onHeading={() => openProjects()}
        items={rows.length === 0 && loading ? null : rows}
        empty="Projects you save or work on appear here."
        render={(row) => <ProjectItem key={row.key} row={row} />}
      />
    </div>
  );
}

/**
 * One section of the Library's home: its heading, which opens all of it
 * (the full list, or the Projects window), and its newest five items.
 * Nothing listed while it loads; a line saying what will come here while
 * it's empty.
 */
function HomeSection<T>({
  id,
  label,
  icon: Icon,
  color,
  headingLabel,
  onHeading,
  items,
  empty,
  render,
}: {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  headingLabel: string;
  onHeading: () => void;
  /** Null while it loads. */
  items: T[] | null;
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  const shown = items === null ? [] : items.slice(0, FIRST_SHOWN);
  return (
    <InsightCard
      aria-labelledby={`library-${id}-heading`}
      data-testid={`library-section-${id}`}
    >
      <h3 id={`library-${id}-heading`} className="-mx-2 -my-1">
        <button
          type="button"
          onClick={onHeading}
          aria-label={headingLabel}
          data-testid={`library-tile-${id}`}
          className="group flex w-full items-center gap-2.5 rounded-[14px] px-2 py-1 text-left outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: color }}
          >
            <Icon aria-hidden className="size-3.5 text-daw-bg" />
          </span>
          <span className={cn(INSIGHT_TEXT, 'font-medium')}>{label}</span>
          {items !== null && items.length > 0 ? (
            <span className="text-[13px] tabular-nums text-white/40">
              {items.length}
            </span>
          ) : null}
          <ChevronRight
            aria-hidden
            className="ml-auto size-4 text-white/40 transition-colors group-hover:text-white"
          />
        </button>
      </h3>
      {items === null ? null : items.length === 0 ? (
        <p className={INSIGHT_DIM}>{empty}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">{shown.map(render)}</ul>
      )}
    </InsightCard>
  );
}

/** A project, as Suno's Studio Projects: its tile, name and when. */
function ProjectItem({ row }: { row: ProjectRow }) {
  const tile = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(generateStudioTileSvg(row.key))}`,
    [row.key],
  );
  const open = () => {
    if (row.openIntent && !row.isOpen) {
      void openSession(row.openIntent, { source: 'library' });
    }
  };
  return (
    <li>
      <button
        type="button"
        onClick={open}
        disabled={!row.canOpen && !row.isOpen}
        aria-current={row.isOpen || undefined}
        data-testid="library-project"
        className={cn(
          LIBRARY_ROW,
          'outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40',
        )}
      >
        <img
          src={tile}
          alt=""
          draggable={false}
          className="size-[46px] shrink-0 rounded-[12px] object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className={cn(INSIGHT_TEXT, 'block truncate font-medium')}>
            {row.name}
          </span>
          <span className={cn(INSIGHT_DIM, 'block truncate')}>
            {row.isOpen ? 'Open now' : timeAgo(row.updatedAt)}
          </span>
        </span>
      </button>
    </li>
  );
}

// ── Lists ──────────────────────────────────────────────────────────────────

function LibraryList({
  view,
  onBack,
}: {
  view: Exclude<View, 'home'>;
  onBack: () => void;
}) {
  const { items, loaded } = useLibraryAudio();
  const project = useStore((s) => s.projectName);
  const [sort, setSort] = useState<Sort>('new');
  const [favoritesOnly, setFavoritesOnly] = useState(view === 'favorites');
  const [thisSong, setThisSong] = useState(false);
  const [kinds, setKinds] = useState<Set<LibraryAudioItem['kind']>>(new Set());
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (view === 'stems' ? i.kind === 'stem' : true) &&
        (view === 'uploads' ? i.kind === 'upload' : true) &&
        (kinds.size === 0 || kinds.has(i.kind)) &&
        (!favoritesOnly || i.favorite) &&
        (!thisSong || i.project === project) &&
        (!q || `${i.name} ${i.tag} ${i.project}`.toLowerCase().includes(q)),
    );
    if (sort === 'old') list.reverse();
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, view, kinds, favoritesOnly, thisSong, project, query, sort]);

  const filtered =
    kinds.size > 0 ||
    (favoritesOnly && view !== 'favorites') ||
    thisSong ||
    query.trim() !== '';
  const reset = () => {
    setKinds(new Set());
    setFavoritesOnly(view === 'favorites');
    setThisSong(false);
    setQuery('');
  };
  const toggleKind = (kind: LibraryAudioItem['kind']) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const groups =
    sort === 'name'
      ? [{ label: 'A–Z', items: shown }]
      : groupByDay(shown, (i) => i.createdAt);

  return (
    <div
      data-testid={`library-list-${view}`}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex h-10 shrink-0 items-center gap-1 px-1.5">
        <IconButton
          label="Back to the Library"
          icon={<ChevronLeft />}
          size="sm"
          onClick={onBack}
        />
        {searching ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                setSearching(false);
              }
            }}
            placeholder={`Search ${TITLE[view].toLowerCase()}`}
            aria-label={`Search ${TITLE[view].toLowerCase()}`}
            className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-transparent px-3.5 text-[13px] text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/20 focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-white/40"
          />
        ) : (
          <h3
            className={cn(INSIGHT_TEXT, 'min-w-0 flex-1 truncate font-medium')}
          >
            {TITLE[view]}
          </h3>
        )}
        <IconButton
          label={
            searching ? 'Close search' : `Search ${TITLE[view].toLowerCase()}`
          }
          icon={searching ? <X /> : <Search />}
          size="sm"
          onClick={() => {
            if (searching) setQuery('');
            setSearching(!searching);
          }}
        />
      </div>

      <div
        className="flex shrink-0 gap-1.5 overflow-x-auto px-2 pb-2 [scrollbar-width:none]"
        role="toolbar"
        aria-label="Filters"
      >
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className={chipClass(false)}>
              <ArrowDownUp aria-hidden className="size-3.5" />
              {SORT_LABEL[sort]}
              <ChevronDown aria-hidden className="size-3.5" />
            </button>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuRadioGroup
              value={sort}
              onValueChange={(v) => setSort(v as Sort)}
            >
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <MenuRadioItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
        {view !== 'favorites' && (
          <button
            type="button"
            aria-pressed={favoritesOnly}
            aria-label="Favorites only"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={chipClass(favoritesOnly)}
          >
            <Heart
              aria-hidden
              className={cn('size-3.5', favoritesOnly && 'fill-current')}
            />
          </button>
        )}
        <button
          type="button"
          aria-pressed={thisSong}
          onClick={() => setThisSong(!thisSong)}
          className={chipClass(thisSong)}
        >
          {thisSong && <Check aria-hidden className="size-3.5" />}
          This song
        </button>
        {(view === 'all' || view === 'favorites') &&
          (['stem', 'upload'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={kinds.has(kind)}
              onClick={() => toggleKind(kind)}
              className={chipClass(kinds.has(kind))}
            >
              {kind === 'stem' ? 'Stems' : 'Uploads'}
            </button>
          ))}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {!loaded ? null : shown.length === 0 ? (
          <InsightCard className="items-center px-6 py-8 text-center">
            <p className={INSIGHT_DIM}>
              {filtered ? 'Nothing matches these filters.' : EMPTY[view]}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={reset}
                className={chipClass(false)}
              >
                Reset filters
              </button>
            )}
          </InsightCard>
        ) : (
          groups.map((group) => {
            const isClosed = closed.has(group.label);
            return (
              <InsightCard
                key={group.label}
                aria-label={group.label}
                className="gap-1.5"
              >
                <button
                  type="button"
                  aria-expanded={!isClosed}
                  onClick={() =>
                    setClosed((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.label)) next.delete(group.label);
                      else next.add(group.label);
                      return next;
                    })
                  }
                  className="-mx-1 flex items-center gap-1 self-start rounded-full px-1 text-[13px] font-medium text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-3.5 transition-transform',
                      isClosed && '-rotate-90',
                    )}
                  />
                  {group.label}
                </button>
                {!isClosed && (
                  <ul className="-mx-2 flex flex-col">
                    {group.items.map((item) => (
                      <LibraryAudioRow
                        key={item.id}
                        item={item}
                        onAdd={addToSong}
                      />
                    ))}
                  </ul>
                )}
              </InsightCard>
            );
          })
        )}
      </div>
    </div>
  );
}
