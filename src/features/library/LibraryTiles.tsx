import { Folder, MoreHorizontal, Star } from 'lucide-react';
import { PiPauseFill, PiPlayFill } from 'react-icons/pi';
import { Link } from 'react-router-dom';
import { HOVER_GROW } from '@/components/explore/SongCard';
import {
  ART_FRAME,
  CARD_GAP,
  CARD_SUB,
  CARD_TITLE,
  CAPTION,
  LIST_ROW,
  ROW_TITLE,
} from '@/components/kit/libraryLook';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { relativeWhen } from '@/daw/shell/projects/projectRows';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import {
  LibraryItemMenuContent,
  ProjectMenuContent,
  type InProjectPlace,
} from './LibraryItemMenu';
import { LibraryPlayButton, usePlayState } from './LibraryPlayButton';
import { ProjectImage } from './ProjectCoverPicker';
import type { LibraryItem, ProjectEntry } from './libraryItems';
import type { LibraryProject } from './libraryLocalMeta';
import { GENRE_TAGS, STATUS_TAGS, tagLabel } from './libraryTags';
import {
  artSeedOf,
  studioHrefOf,
  projectHrefOf,
  type PlayItem,
} from './libraryTypes';
import { PreparingRing, ProjectCover } from './player/PlayerParts';
import { playerActions, usePlayer } from './player/libraryPlayer';
import { projectCover } from './projectCovers';
import { playItemOf, type LibraryActions } from './useLibraryActions';

// ── Sessions and projects in the Library: cards (grid) and rows (list) ─────
// Samply's (owner, 2026-11-11, audited): square art with a hairline, the
// name in semibold over a grey line; the list's rows striped, the date and
// a "…" at the right. Play sits over the art's corner on hover (and stays
// while it plays); a right-click opens the same menu as the "…". A project
// (a folder of sessions) wears its first four sessions' covers.

/** The grey line under a session's name; `project`, the one it's in. */
export function itemSubtitle(item: LibraryItem, project?: string): string {
  const parts: string[] = [];
  if (project) parts.push(project);
  if (item.composer) parts.push(item.composer);
  if (!item.saved) parts.push('On this device');
  else if (item.editedOnDevice) parts.push('Edited on this device');
  const status = tagLabel(STATUS_TAGS, item.status);
  if (status) parts.push(status);
  if (parts.length === 0 && item.bpm) parts.push(`${item.bpm} BPM`);
  return parts.join(' · ');
}

/** "Project · 3 sessions". */
export function projectSubtitle(entry: ProjectEntry): string {
  const n = entry.sessions.length;
  return `Project · ${n === 0 ? 'Empty' : `${n} ${n === 1 ? 'session' : 'sessions'}`}`;
}

interface TileProps {
  item: LibraryItem;
  actions: LibraryActions;
  favorite: boolean;
  projects: readonly LibraryProject[];
  /** Show the project it is in under its name (the Sessions tab). */
  showProject?: boolean;
}

const CORNER = cn(
  'grid size-7 place-items-center rounded-full bg-black/55 text-white/85 hover:bg-black/75 hover:text-white',
  TRANSITION,
  FOCUS_RING,
);

const STAR = 'size-3 shrink-0 fill-white/70 text-white/70';

const projectNameOf = (
  projects: readonly LibraryProject[],
  key: string,
): string | undefined => projects.find((p) => p.sessions.includes(key))?.name;

export function LibraryCard({
  item,
  actions,
  favorite,
  projects,
  showProject = false,
}: TileProps) {
  const playItem = playItemOf(item);
  const state = usePlayState(playItem.key);
  const live = state !== 'idle';
  const project = showProject ? projectNameOf(projects, item.key) : undefined;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('group relative', HOVER_GROW)} data-library-card>
          <Link
            to={studioHrefOf(item.source)}
            className={cn('block rounded-xl', FOCUS_RING)}
          >
            <div
              className={cn(ART_FRAME, 'relative aspect-square bg-[#151518]')}
            >
              <ProjectCover seed={artSeedOf(item.source)} />
            </div>
            <div className={CARD_GAP}>
              <p className={cn(CARD_TITLE, 'flex items-center gap-1')}>
                <span className="truncate">{item.name}</span>
                {favorite && <Star aria-label="Favorite" className={STAR} />}
              </p>
              <p className={CARD_SUB}>{itemSubtitle(item, project) || ' '}</p>
            </div>
          </Link>
          {/* Over the art, square like it: Play at its foot, the menu at
            its top, outside the link (a button can't sit in a link). */}
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
            <div
              className={cn(
                'pointer-events-auto absolute bottom-2 right-2 transition-opacity',
                live
                  ? 'opacity-100'
                  : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
              )}
            >
              <LibraryPlayButton item={playItem} />
            </div>
            <div className="pointer-events-auto absolute right-2 top-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`More for ${item.name}`}
                  className={CORNER}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <LibraryItemMenuContent
                  item={item}
                  actions={actions}
                  favorite={favorite}
                  projects={projects}
                  kind="dropdown"
                />
              </DropdownMenu>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <LibraryItemMenuContent
        item={item}
        actions={actions}
        favorite={favorite}
        projects={projects}
        kind="context"
      />
    </ContextMenu>
  );
}

const ROW_MENU = cn(
  'grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white',
  TRANSITION,
  FOCUS_RING,
);

export function LibraryRow({
  item,
  actions,
  favorite,
  projects,
  showProject = false,
  now,
  number,
  place,
  context,
  queue,
}: TileProps & {
  now: number;
  /** Its place in a project's list. */
  number?: number;
  place?: InProjectPlace;
  /** Played from a project: its name over the session's in the player. */
  context?: string;
  /** The list it is in: Play goes on through it. */
  queue?: readonly PlayItem[];
}) {
  const playItem = playItemOf(item, context);
  const state = usePlayState(playItem.key);
  const genre = tagLabel(GENRE_TAGS, item.genre);
  const project = showProject ? projectNameOf(projects, item.key) : undefined;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative flex items-center" data-library-row>
          <Link
            to={studioHrefOf(item.source)}
            className={cn(LIST_ROW, 'min-w-0 flex-1 gap-3 py-2 pr-24')}
          >
            {number !== undefined && (
              <span className="w-5 shrink-0 text-right text-[0.75rem] tabular-nums text-white/40">
                {number}
              </span>
            )}
            <span className="relative size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-white/[0.08]">
              <ProjectCover seed={artSeedOf(item.source)} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn(ROW_TITLE, 'flex items-center gap-1')}>
                <span
                  className={cn('truncate', state !== 'idle' && 'text-white')}
                >
                  {item.name}
                </span>
                {favorite && <Star aria-label="Favorite" className={STAR} />}
              </span>
              <span className={cn(CAPTION, 'block truncate')}>
                {itemSubtitle(item, project) || ' '}
              </span>
            </span>
            {genre && (
              <span className="hidden shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.682rem] text-white/60 md:inline">
                {genre}
              </span>
            )}
            <span
              className={cn(
                CAPTION,
                'hidden w-24 shrink-0 text-right sm:block',
              )}
            >
              {item.updatedAt ? relativeWhen(item.updatedAt, now) : ''}
            </span>
          </Link>
          <div className="absolute right-3 flex items-center gap-1">
            <div
              className={cn(
                'transition-opacity',
                state !== 'idle'
                  ? 'opacity-100'
                  : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
              )}
            >
              <LibraryPlayButton item={playItem} queue={queue} size="sm" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`More for ${item.name}`}
                className={ROW_MENU}
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </DropdownMenuTrigger>
              <LibraryItemMenuContent
                item={item}
                actions={actions}
                favorite={favorite}
                projects={projects}
                place={place}
                kind="dropdown"
              />
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <LibraryItemMenuContent
        item={item}
        actions={actions}
        favorite={favorite}
        projects={projects}
        place={place}
        kind="context"
      />
    </ContextMenu>
  );
}

// ── Projects ───────────────────────────────────────────────────────────────

/**
 * A project's cover: the image the student chose for it; else its first
 * four sessions' covers in a square of four, one cover for one session, and
 * for an empty project its own tile with a folder on it.
 */
export function ProjectMosaic({ entry }: { entry: ProjectEntry }) {
  const image = projectCover(entry.project.cover);
  if (image) return <ProjectImage cover={image} />;
  const seeds = entry.sessions.slice(0, 4).map((i) => artSeedOf(i.source));
  if (seeds.length === 0) {
    return (
      <span className="relative block size-full">
        <ProjectCover seed={entry.key} className="opacity-50" />
        <span className="absolute inset-0 grid place-items-center">
          <Folder aria-hidden className="size-1/4 text-white/80" />
        </span>
      </span>
    );
  }
  if (seeds.length < 4) return <ProjectCover seed={seeds[0]} />;
  return (
    <span className="grid size-full grid-cols-2 grid-rows-2">
      {seeds.map((seed) => (
        <ProjectCover key={seed} seed={seed} />
      ))}
    </span>
  );
}

/** Where a project stands in the player: playing it, or not. */
export function useProjectPlayState(entry: ProjectEntry) {
  return usePlayer((s) => {
    const current = s.queue[s.index];
    if (!current || current.context !== entry.name) return 'idle';
    if (!entry.sessions.some((i) => i.key === current.key)) return 'idle';
    return s.status === 'preparing'
      ? 'preparing'
      : s.status === 'playing'
        ? 'playing'
        : 'paused';
  });
}

/** A project's round Play: all its sessions, in order. */
export function ProjectPlayButton({
  entry,
  actions,
  size = 'md',
}: {
  entry: ProjectEntry;
  actions: LibraryActions;
  size?: 'sm' | 'md';
}) {
  const state = useProjectPlayState(entry);
  const progress = usePlayer((s) =>
    state === 'preparing' ? s.progress : null,
  );
  if (entry.sessions.length === 0) return null;
  const label =
    state === 'playing' ? `Pause ${entry.name}` : `Play ${entry.name}`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state === 'idle') actions.playProject(entry);
        else playerActions.toggle();
      }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-white text-black shadow-lg hover:scale-[1.05]',
        size === 'sm' ? 'size-8' : 'size-10',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      {state === 'preparing' ? (
        <PreparingRing fraction={progress} className="size-5" />
      ) : state === 'playing' ? (
        <PiPauseFill aria-hidden className="size-4" />
      ) : (
        <PiPlayFill aria-hidden className="size-4 translate-x-px" />
      )}
    </button>
  );
}

interface ProjectTileProps {
  entry: ProjectEntry;
  actions: LibraryActions;
  favorite: boolean;
}

export function ProjectCard({ entry, actions, favorite }: ProjectTileProps) {
  const live = useProjectPlayState(entry) !== 'idle';
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('group relative', HOVER_GROW)} data-project-card>
          <Link
            to={projectHrefOf(entry.project.id)}
            className={cn('block rounded-xl', FOCUS_RING)}
          >
            <div
              className={cn(ART_FRAME, 'relative aspect-square bg-[#151518]')}
            >
              <ProjectMosaic entry={entry} />
            </div>
            <div className={CARD_GAP}>
              <p className={cn(CARD_TITLE, 'flex items-center gap-1')}>
                <span className="truncate">{entry.name}</span>
                {favorite && <Star aria-label="Favorite" className={STAR} />}
              </p>
              <p className={CARD_SUB}>{projectSubtitle(entry)}</p>
            </div>
          </Link>
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
            <div
              className={cn(
                'pointer-events-auto absolute bottom-2 right-2 transition-opacity',
                live
                  ? 'opacity-100'
                  : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
              )}
            >
              <ProjectPlayButton entry={entry} actions={actions} />
            </div>
            <div className="pointer-events-auto absolute right-2 top-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`More for ${entry.name}`}
                  className={CORNER}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <ProjectMenuContent
                  entry={entry}
                  actions={actions}
                  favorite={favorite}
                  kind="dropdown"
                />
              </DropdownMenu>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ProjectMenuContent
        entry={entry}
        actions={actions}
        favorite={favorite}
        kind="context"
      />
    </ContextMenu>
  );
}

export function ProjectRow({
  entry,
  actions,
  favorite,
  now,
}: ProjectTileProps & { now: number }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative flex items-center" data-project-row>
          <Link
            to={projectHrefOf(entry.project.id)}
            className={cn(LIST_ROW, 'min-w-0 flex-1 gap-3 py-2 pr-24')}
          >
            <span className="relative size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-white/[0.08]">
              <ProjectMosaic entry={entry} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn(ROW_TITLE, 'flex items-center gap-1')}>
                <span className="truncate">{entry.name}</span>
                {favorite && <Star aria-label="Favorite" className={STAR} />}
              </span>
              <span className={cn(CAPTION, 'block truncate')}>
                {projectSubtitle(entry)}
              </span>
            </span>
            <span
              className={cn(
                CAPTION,
                'hidden w-24 shrink-0 text-right sm:block',
              )}
            >
              {relativeWhen(entry.updatedAt, now)}
            </span>
          </Link>
          <div className="absolute right-3 flex items-center gap-1">
            <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <ProjectPlayButton entry={entry} actions={actions} size="sm" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`More for ${entry.name}`}
                className={ROW_MENU}
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </DropdownMenuTrigger>
              <ProjectMenuContent
                entry={entry}
                actions={actions}
                favorite={favorite}
                kind="dropdown"
              />
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ProjectMenuContent
        entry={entry}
        actions={actions}
        favorite={favorite}
        kind="context"
      />
    </ContextMenu>
  );
}
