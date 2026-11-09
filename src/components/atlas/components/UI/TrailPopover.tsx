import * as Popover from '@radix-ui/react-popover';
import { History } from 'lucide-react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  ATLAS_NO_EXIT_ANIMATION,
  ATLAS_POPOVER,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { guidesData } from '@/components/atlas/data/loaders';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { useAtlasPortal } from '@/components/atlas/layout/portalRoot';
import {
  describeStop,
  isGuideStop,
} from '@/components/atlas/navigation/describeStop';
import type {
  TrailEntry,
  useAtlasTrail,
} from '@/components/atlas/navigation/useAtlasTrail';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';

type Trail = ReturnType<typeof useAtlasTrail>;

/** One step of the trail: its thumbnail, title and where it is. */
function TrailStep({
  entry,
  state,
  onJump,
}: {
  entry: TrailEntry;
  state: 'past' | 'current' | 'future';
  onJump: (entry: TrailEntry) => void;
}) {
  // A tour or pathway step takes its title from the on-demand tours.
  const guides = useLazyResource(guidesData, isGuideStop(entry.stop)).status;
  const presentation = useMemo(
    () => describeStop(entry.stop),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `guides` re-describes once they load
    [entry.stop, guides],
  );
  return (
    <button
      aria-current={state === 'current' ? 'step' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-1.5 text-left transition',
        state === 'current'
          ? 'border-white/40 bg-white/[0.08]'
          : state === 'future'
            ? // Steps ahead, after Back: dimmed, and dashed so the state
              // does not rest on the dimming alone.
              'border-dashed border-white/20 opacity-60 hover:bg-white/[0.08] hover:opacity-100'
            : 'border-transparent hover:bg-white/[0.08]',
        ATLAS_FOCUS,
      )}
      data-trail-idx={entry.idx}
      type="button"
      onClick={() => onJump(entry)}
    >
      <span className="w-14 shrink-0">
        <StopThumb presentation={presentation} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-bold text-atlas-text">
          {presentation.title}
        </span>
        <span className="truncate text-xs text-atlas-text-2">
          {presentation.subtitle}
        </span>
      </span>
    </button>
  );
}

/**
 * The trail of everywhere this session has been, behind one button in the
 * Globe's header (it used to be a strip of thumbnails across it, which the
 * section tabs now need the room of). Every step is a real history entry,
 * so this list, Back and Forward, and the browser's own Back walk one path.
 */
export function TrailPopover({ trail }: { trail: Trail }) {
  const portal = useAtlasPortal();
  const titleId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const steps = trail.entries.length;
  const current = trail.entries[trail.cursorPos];

  // Open on the step you are at.
  const scrollToCurrent = () => {
    if (!current) return;
    listRef.current
      ?.querySelector(`[data-trail-idx="${current.idx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };
  useEffect(scrollToCurrent, [current]);

  // In the top rail from the start, so nothing shifts as the path grows; it
  // opens once there is a step to go back to.
  const empty = steps < 2;
  return (
    <Popover.Root
      onOpenChange={(open) => open && requestAnimationFrame(scrollToCurrent)}
    >
      <Popover.Trigger asChild>
        <AtlasPillButton
          aria-label={empty ? 'Your path' : `Your path: ${steps} steps`}
          data-atlas-keep-focus
          disabled={empty}
          title="Your path through the globe"
          variant="pill"
        >
          <History aria-hidden className="size-4" />
          {!empty && <span aria-hidden>{steps}</span>}
          <span aria-hidden className="hidden lg:inline">
            History
          </span>
        </AtlasPillButton>
      </Popover.Trigger>
      <Popover.Portal container={portal}>
        <Popover.Content
          align="end"
          aria-labelledby={titleId}
          className={cn(
            ATLAS_POPOVER,
            ATLAS_Z.popovers,
            ATLAS_NO_EXIT_ANIMATION,
            'flex max-h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-1rem))] flex-col p-3 focus:outline-none',
          )}
          collisionPadding={8}
          sideOffset={8}
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className={ATLAS_ITEM_TITLE} id={titleId}>
              Your path
            </h2>
            <AtlasPillButton
              size="sm"
              title="Start a fresh path from here"
              onClick={trail.clear}
            >
              Clear
            </AtlasPillButton>
          </div>
          <ol
            ref={listRef}
            className="flex min-h-0 flex-col gap-1 overflow-y-auto [scrollbar-width:thin]"
            data-atlas-keep-focus
          >
            {trail.entries.map((entry, i) => (
              <li key={entry.idx}>
                <TrailStep
                  entry={entry}
                  state={
                    i < trail.cursorPos
                      ? 'past'
                      : i === trail.cursorPos
                        ? 'current'
                        : 'future'
                  }
                  onJump={trail.jump}
                />
              </li>
            ))}
          </ol>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
