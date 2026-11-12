import { PiPauseFill, PiPlayFill } from 'react-icons/pi';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { usePlayState } from '../LibraryPlayButton';
import {
  ProjectMosaic,
  itemSubtitle,
  projectSubtitle,
  useProjectPlayState,
} from '../LibraryTiles';
import type { HomeLibraryCard as Card, LibraryItem } from '../libraryItems';
import type { LibraryProject } from '../libraryLocalMeta';
import { artSeedOf, projectHrefOf, studioHrefOf } from '../libraryTypes';
import { PreparingRing, ProjectCover } from '../player/PlayerParts';
import { playerActions, usePlayer } from '../player/libraryPlayer';
import { playItemOf } from '../useLibraryActions';

// ── A card in Home's Library row (owner, 2026-11-11) ───────────────────────
// Suno's New Albums card, measured on suno.com/home and set in our rem: the
// square cover with 16px corners, the name (16px, medium) under it and a grey
// line (14px); on hover a dark round Play in the cover's corner, kept while
// it plays. A project opens its page and plays its sessions in order; a
// session opens in the Studio and plays its mix.

type PlayState = 'idle' | 'preparing' | 'playing' | 'paused';

function CornerPlay({
  state,
  label,
  onPlay,
}: {
  state: PlayState;
  label: string;
  onPlay: () => void;
}) {
  const progress = usePlayer((s) =>
    state === 'preparing' ? s.progress : null,
  );
  const name = state === 'playing' ? `Pause ${label}` : `Play ${label}`;
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state === 'idle') onPlay();
        else playerActions.toggle();
      }}
      className={cn(
        'pointer-events-auto absolute bottom-2.5 right-2.5 grid size-[2.045rem] place-items-center rounded-full bg-black/55 text-white backdrop-blur-md hover:bg-black/75',
        state === 'idle'
          ? 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
          : 'opacity-100',
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

const COVER =
  'relative aspect-square overflow-hidden rounded-[0.909rem] bg-[#151518] ring-1 ring-inset ring-white/[0.08]';
const TITLE =
  'mt-[0.568rem] truncate text-[0.909rem] font-medium leading-[1.25rem] text-white';
const LINE = 'truncate text-[0.795rem] leading-[1.136rem] text-white/50';

function SessionCard({
  item,
  projects,
}: {
  item: LibraryItem;
  projects: readonly LibraryProject[];
}) {
  const play = playItemOf(item);
  const state = usePlayState(play.key);
  const home = projects.find((p) => p.sessions.includes(item.key))?.name;
  return (
    <div className="group relative">
      <Link
        to={studioHrefOf(item.source)}
        className={cn('block rounded-[0.909rem]', FOCUS_RING)}
      >
        <div className={COVER}>
          <ProjectCover seed={artSeedOf(item.source)} />
        </div>
        <p className={TITLE}>{item.name}</p>
        <p className={LINE}>{itemSubtitle(item, home) || 'Session'}</p>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
        <CornerPlay
          state={state}
          label={item.name}
          onPlay={() => playerActions.playItem(play)}
        />
      </div>
    </div>
  );
}

function ProjectCardHome({
  card,
}: {
  card: Extract<Card, { kind: 'project' }>;
}) {
  const { entry } = card;
  const state = useProjectPlayState(entry);
  return (
    <div className="group relative">
      <Link
        to={projectHrefOf(entry.project.id)}
        className={cn('block rounded-[0.909rem]', FOCUS_RING)}
      >
        <div className={COVER}>
          <ProjectMosaic entry={entry} />
        </div>
        <p className={TITLE}>{entry.name}</p>
        <p className={LINE}>{projectSubtitle(entry)}</p>
      </Link>
      {entry.sessions.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <CornerPlay
            state={state}
            label={entry.name}
            onPlay={() =>
              playerActions.playItems(
                entry.sessions.map((i) => playItemOf(i, entry.name)),
              )
            }
          />
        </div>
      )}
    </div>
  );
}

export function HomeLibraryCard({
  card,
  projects,
}: {
  card: Card;
  projects: readonly LibraryProject[];
}) {
  return card.kind === 'project' ? (
    <ProjectCardHome card={card} />
  ) : (
    <SessionCard item={card.item} projects={projects} />
  );
}
