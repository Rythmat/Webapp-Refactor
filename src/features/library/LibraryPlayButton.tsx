import { PiPauseFill, PiPlayFill } from 'react-icons/pi';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { PlayItem } from './libraryTypes';
import { PreparingRing } from './player/PlayerParts';
import { playerActions, usePlayer } from './player/libraryPlayer';

/** Where this item stands in the player. */
export function usePlayState(
  key: string,
): 'idle' | 'preparing' | 'playing' | 'paused' {
  return usePlayer((s) => {
    if (s.queue[s.index]?.key !== key) return 'idle';
    if (s.status === 'preparing') return 'preparing';
    if (s.status === 'playing') return 'playing';
    return 'paused';
  });
}

/**
 * A white round Play for a session: Pause while it plays, its
 * render's progress while it is being made.
 */
export function LibraryPlayButton({
  item,
  queue,
  size = 'md',
  className,
}: {
  item: PlayItem;
  /** The list it is in (a project's sessions): Play goes on through it. */
  queue?: readonly PlayItem[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const state = usePlayState(item.key);
  const progress = usePlayer((s) =>
    state === 'preparing' ? s.progress : null,
  );
  const label =
    state === 'playing'
      ? `Pause ${item.title}`
      : state === 'preparing'
        ? `Stop making ${item.title}`
        : `Play ${item.title}`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const at = queue?.findIndex((q) => q.key === item.key) ?? -1;
        if (state === 'idle' && queue && at >= 0) {
          playerActions.playItems(queue, at);
        } else {
          playerActions.playItem(item);
        }
      }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-white text-black shadow-lg hover:scale-[1.05]',
        size === 'sm' && 'size-8',
        size === 'md' && 'size-10',
        size === 'lg' && 'h-10 gap-1.5 px-5 text-[0.852rem] font-semibold',
        size === 'lg' && 'flex',
        TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      {state === 'preparing' ? (
        <PreparingRing fraction={progress} className="size-5" />
      ) : state === 'playing' ? (
        <PiPauseFill aria-hidden className="size-4" />
      ) : (
        <PiPlayFill aria-hidden className="size-4 translate-x-px" />
      )}
      {size === 'lg' && (
        <span>
          {state === 'playing'
            ? 'Pause'
            : state === 'preparing'
              ? 'Making…'
              : 'Play'}
        </span>
      )}
    </button>
  );
}
