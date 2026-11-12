import { X } from 'lucide-react';
import { PiQueueFill } from 'react-icons/pi';
import { CAPTION, ICON_BUTTON } from '@/components/kit/libraryLook';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { ProjectCover } from './PlayerParts';
import { playerActions, usePlayer } from './libraryPlayer';

// ── The queue (owner, 2026-11-11), Samply's right-hand panel ───────────────
// Now playing, then what's next, each a tap to play and an × to take out;
// Clear empties what's next. Empty, it says how to fill it.

export function QueuePanel() {
  const open = usePlayer((s) => s.queueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  if (!open) return null;

  const now = queue[index];
  const next = queue.slice(index + 1);

  return (
    <aside
      aria-label="Queue"
      className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[19rem] flex-col rounded-[0.682rem] border border-white/[0.06] bg-[#18181b] shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[0.852rem] font-semibold text-white">Queue</h2>
        <div className="flex items-center gap-1">
          {next.length > 0 && (
            <button
              type="button"
              onClick={() => playerActions.clearUpNext()}
              className={cn(
                'rounded-full px-2.5 py-1 text-[0.75rem] text-white/50 hover:text-white',
                TRANSITION,
                FOCUS_RING,
              )}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            aria-label="Close the queue"
            onClick={() => playerActions.setQueueOpen(false)}
            className={cn(ICON_BUTTON, 'size-7 bg-transparent')}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <PiQueueFill aria-hidden className="size-6 text-white/40" />
          <p className="text-[0.852rem] font-semibold text-white">
            There’s nothing in the queue
          </p>
          <p className={CAPTION}>
            Right-click a session or a project in your Library to add it.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {now && (
            <>
              <p className={cn(CAPTION, 'px-2 pb-1')}>Now playing</p>
              <QueueRow position={index} current />
            </>
          )}
          {next.length > 0 && (
            <>
              <p className={cn(CAPTION, 'truncate px-2 pb-1 pt-3')}>
                Next
                {now && now.context !== now.title ? ` from ${now.context}` : ''}
              </p>
              <ol>
                {next.map((item, n) => (
                  <li key={item.key}>
                    <QueueRow position={index + 1 + n} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function QueueRow({
  position,
  current = false,
}: {
  position: number;
  current?: boolean;
}) {
  const item = usePlayer((s) => s.queue[position]);
  if (!item) return null;
  return (
    <div className="group flex items-center gap-1 rounded-lg hover:bg-white/[0.05]">
      <button
        type="button"
        onClick={() => !current && playerActions.playAt(position)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-2 text-left',
          FOCUS_RING,
        )}
      >
        <span className="size-9 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-white/[0.08]">
          <ProjectCover seed={item.artSeed} />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              'block truncate text-[0.795rem] font-semibold',
              current ? 'text-white' : 'text-white/85',
            )}
          >
            {item.title}
          </span>
          <span className="block truncate text-[0.682rem] text-white/50">
            {item.context === item.title ? 'Session' : item.context}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Take ${item.title} out of the queue`}
        onClick={() => playerActions.removeAt(position)}
        className={cn(
          'mr-1 grid size-7 shrink-0 place-items-center rounded-full text-white/40 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
