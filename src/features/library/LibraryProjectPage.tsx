import {
  ChevronLeft,
  Image as ImageIcon,
  ListPlus,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PiPauseFill, PiPlayFill } from 'react-icons/pi';
import { Link, useParams } from 'react-router-dom';
import {
  CAPTION,
  ICON_BUTTON,
  LIST_STRIPE,
  TAB,
} from '@/components/kit/libraryLook';
import { WHITE_PILL } from '@/components/kit/pills';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { LibraryRoutes } from '@/constants/routes';
import { relativeWhen } from '@/daw/shell/projects/projectRows';
import { DialogHost } from '@/daw/ui/DialogHost';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { studioTileAccent } from '@/lib/studioProjectTile';
import { AddSessionsDialog } from './AddSessionsDialog';
import { ProjectMenuContent } from './LibraryItemMenu';
import { LibraryRow, ProjectMosaic } from './LibraryTiles';
import { ProjectCoverPickerHost, useCoverPicker } from './ProjectCoverPicker';
import { ProjectManageTable } from './ProjectManageTable';
import { toProjectEntries } from './libraryItems';
import { useLibraryMeta } from './libraryLocalMeta';
import { moveInProject } from './libraryProjects';
import { artSeedOf } from './libraryTypes';
import { playerActions, usePlayer } from './player/libraryPlayer';
import { projectCover } from './projectCovers';
import { playItemOf, useLibraryActions } from './useLibraryActions';
import { useLibraryItems } from './useLibraryItems';

// ── A project's page: a folder of sessions (owner, 2026-11-11) ─────────────
// Samply's project page (/p/:id), audited, with sessions for its tracks, and
// its Listen and Manage at the top (the project's, not a session's: owner).
// Listen: the cover (its sessions' covers), "PROJECT · 3 SESSIONS", the
// name, Play (every session, in order, the project's name over each in the
// player), the queue and the menu; then the sessions, numbered, each
// playable and openable, moved up and down from its menu. Manage: the same
// sessions as a table (ProjectManageTable). Add sessions picks from the
// Library.

export function LibraryProjectPage() {
  const { projectId = '' } = useParams();
  const meta = useLibraryMeta();
  const { items, loading, refresh } = useLibraryItems();
  const actions = useLibraryActions(refresh);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<'listen' | 'manage'>('listen');
  const [now] = useState(() => Date.now());

  const project = meta.projects.find((p) => p.id === projectId) ?? null;
  const entry = useMemo(
    () => (project ? toProjectEntries([project], items)[0] : null),
    [project, items],
  );
  // The page's wash: its image's colour, else its first session's.
  const accent = useMemo(
    () =>
      projectCover(project?.cover)?.colour ??
      studioTileAccent(
        entry?.sessions[0] ? artSeedOf(entry.sessions[0].source) : projectId,
      ),
    [project?.cover, entry, projectId],
  );
  const favorites = useMemo(() => new Set(meta.favorites), [meta.favorites]);
  // Playing this project: its name over the session playing.
  const playing = usePlayer((s) => {
    const current = s.queue[s.index];
    if (!entry || !current || current.context !== entry.name) return 'idle';
    if (!entry.sessions.some((i) => i.key === current.key)) return 'idle';
    return s.status === 'playing' ? 'playing' : 'paused';
  });

  if (!project || !entry) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <DialogHost />
        <p className="text-[1.05rem] font-semibold text-white">
          This project isn’t here
        </p>
        <p className={cn(CAPTION, 'max-w-sm text-[0.852rem]')}>
          It may have been deleted, or made on another device: projects are kept
          on the device they were made on for now.
        </p>
        <Link to={LibraryRoutes.root()} className={cn(WHITE_PILL, 'mt-2')}>
          Back to the Library
        </Link>
      </div>
    );
  }

  const count = entry.sessions.length;
  const queue = entry.sessions.map((i) => playItemOf(i, entry.name));
  const favorite = favorites.has(entry.key);

  // Play, the queue and the menu: under the name in Listen, at the right of
  // the head in Manage.
  const projectButtons = (
    <>
      <button
        type="button"
        disabled={count === 0}
        onClick={() =>
          playing === 'idle'
            ? actions.playProject(entry)
            : playerActions.toggle()
        }
        className={cn(
          'flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-[0.852rem] font-semibold text-black shadow-lg hover:scale-[1.03] disabled:opacity-40',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        {playing === 'playing' ? (
          <PiPauseFill aria-hidden className="size-4" />
        ) : (
          <PiPlayFill aria-hidden className="size-4" />
        )}
        {playing === 'playing' ? 'Pause' : 'Play'}
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Add to queue"
          title="Add to queue"
          disabled={count === 0}
          onClick={() => actions.queueProject(entry)}
          className={cn(ICON_BUTTON, 'disabled:opacity-40')}
        >
          <ListPlus aria-hidden className="size-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More for ${entry.name}`}
            className={ICON_BUTTON}
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
    </>
  );
  const emptyList =
    loading && project.sessions.length > 0 ? (
      <p className={cn(CAPTION, 'p-3')}>Finding its sessions…</p>
    ) : (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="text-[0.95rem] font-semibold text-white">
          No sessions in this project yet
        </p>
        <p className={cn(CAPTION, 'max-w-sm text-[0.852rem]')}>
          Add sessions from your Library, or use “Add to project” on any
          session.
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(WHITE_PILL, 'mt-1')}
        >
          Add sessions
        </button>
      </div>
    );

  return (
    <div
      data-testid="library-project"
      className="relative isolate flex min-h-full w-full flex-col"
    >
      <DialogHost />
      <ProjectCoverPickerHost />
      {/* The cover's colour, washed over the page's top (Samply's). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] rounded-t-[0.682rem]"
        style={{
          background: `radial-gradient(120% 90% at 70% 0%, color-mix(in oklab, ${accent} 38%, transparent), transparent 70%)`,
        }}
      />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 pb-6">
        <Link
          to={`${LibraryRoutes.root()}?tab=projects`}
          aria-label="Back to your projects"
          className={cn(ICON_BUTTON, 'bg-transparent')}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <div
          role="group"
          aria-label="View"
          className="flex items-center gap-0.5 rounded-full bg-white/[0.08] p-1"
        >
          {(['listen', 'manage'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                TAB,
                'h-8 px-4 text-[0.852rem]',
                view === v && 'bg-white/[0.12] text-white',
              )}
            >
              {v === 'listen' ? 'Listen' : 'Manage'}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(WHITE_PILL, 'gap-2')}
          >
            <Plus aria-hidden className="size-4" />
            Add sessions
          </button>
        </div>
      </div>

      {view === 'manage' && (
        <div className="w-full px-2 pb-14">
          <div className="mb-4 flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-[#151518] ring-1 ring-inset ring-white/[0.08]">
              <ProjectMosaic entry={entry} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-semibold text-white">
                {entry.name}
              </p>
              <p className="truncate text-[0.75rem] text-white/50">
                Project · {count} {count === 1 ? 'session' : 'sessions'}
              </p>
            </div>
            {projectButtons}
          </div>
          {count === 0 ? (
            emptyList
          ) : (
            <ProjectManageTable
              entry={entry}
              projects={meta.projects}
              actions={actions}
              favorites={favorites}
              queue={queue}
              now={now}
            />
          )}
        </div>
      )}

      {view === 'listen' && (
        <div className="mx-auto w-full max-w-[39.773rem] px-2 pb-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <button
              type="button"
              aria-label="Choose an image"
              title="Choose an image"
              onClick={() => useCoverPicker.getState().open(project.id)}
              className={cn(
                'group relative size-36 shrink-0 overflow-hidden rounded-xl bg-[#151518] shadow-2xl ring-1 ring-inset ring-white/[0.08]',
                FOCUS_RING,
              )}
            >
              <ProjectMosaic entry={entry} />
              <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[0.75rem] font-medium text-white">
                  <ImageIcon aria-hidden className="size-3.5" />
                  Choose image
                </span>
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[0.682rem] font-medium uppercase tracking-[0.06em] text-white/60">
                Project · {count} {count === 1 ? 'session' : 'sessions'}
              </p>
              <h1 className="line-clamp-2 text-[1.9rem] font-bold leading-tight text-white">
                <button
                  type="button"
                  title="Rename"
                  onClick={() => actions.renameProject(entry)}
                  className={cn('rounded-lg text-left', FOCUS_RING)}
                >
                  {entry.name}
                </button>
              </h1>
              <p className="truncate text-[0.852rem] text-white/50">
                Updated {relativeWhen(entry.updatedAt, now)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                {projectButtons}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-2">
            {count === 0 ? (
              emptyList
            ) : (
              <ol aria-label="Sessions">
                {entry.sessions.map((item, n) => (
                  <li key={item.key} className={LIST_STRIPE}>
                    <LibraryRow
                      item={item}
                      actions={actions}
                      favorite={favorites.has(item.key)}
                      projects={meta.projects}
                      now={now}
                      number={n + 1}
                      context={entry.name}
                      queue={queue}
                      place={{
                        canMoveUp: n > 0,
                        canMoveDown: n < count - 1,
                        move: (by) => moveInProject(project.id, item.key, by),
                      }}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <AddSessionsDialog
        open={adding}
        onOpenChange={setAdding}
        project={project}
        projects={meta.projects}
        items={items}
        onAdd={(picked) => actions.addToProject(project.id, picked)}
      />
    </div>
  );
}
