import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/components/utilities';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore, type AllSlices } from '@/daw/store';
import { sameRack, type RackTarget } from '@/daw/store/effectRack';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { openRack } from './rackTarget';

// ── A rack's effects, in a strip (milestone 2.10) ──────────────────────────
//
// The names of the first three effects in a rack, each with a power dot
// (filled: on), then "+N" for the rest; "Add effect" when the rack is
// empty. Every row is a button at least 24 px tall, so the list is a
// keyboard-reachable group: a press opens that rack in the Mix view's
// RackDock with the effect shown, and "+N" or "Add effect" opens it as it
// is (effects are added from the side rail's library, 2.8). The list has a
// fixed height, so the faders below line up across strips.

/** How many names a strip has room for. */
export const INSERT_ROWS = 3;
/** Each row's height, the target floor. */
const ROW_PX = 24;
export const INSERT_LIST_PX = INSERT_ROWS * ROW_PX;

type ChainState = Pick<
  AllSlices,
  'tracks' | 'returns' | 'masteringFxChain' | 'masteringEffects'
>;

function chainOf(
  s: ChainState,
  target: RackTarget,
): { chain: readonly EffectSlotType[]; effects: TrackEffectState } | null {
  if (target.kind === 'master') {
    return { chain: s.masteringFxChain, effects: s.masteringEffects };
  }
  if (target.kind === 'return') {
    const ret = s.returns.find((r) => r.id === target.id);
    return ret ? { chain: ret.fxChain, effects: ret.effects } : null;
  }
  const track = s.tracks.find((t) => t.id === target.id);
  return track ? { chain: track.activeEffects, effects: track.effects } : null;
}

/**
 * The rack's chain as `slot:1` (on) or `slot:0` (off) strings, so a strip
 * re-renders when an effect is added, removed or switched, and not when one
 * of its knobs turns.
 */
function useChainSummary(target: RackTarget): string[] {
  return useStore(
    useShallow((s) => {
      const rack = chainOf(s, target);
      if (!rack) return [];
      return rack.chain.map((slot) => {
        const params = rack.effects[slot as keyof TrackEffectState] as
          | { enabled?: boolean }
          | undefined;
        return `${slot}:${params?.enabled ? 1 : 0}`;
      });
    }),
  );
}

export function InsertList({
  target,
  owner,
  className,
}: {
  target: RackTarget;
  /** Whose effects these are, in words ('Rhodes', 'Send A', 'Master'). */
  owner: string;
  className?: string;
}) {
  const summary = useChainSummary(target);
  const open = useStore((s) => sameRack(s.mixRack, target));
  const shown = summary.slice(0, INSERT_ROWS).map((entry) => {
    const [slot, on] = entry.split(':');
    return { slot: slot as EffectSlotType, on: on === '1' };
  });
  const more = summary.length - shown.length;

  return (
    <div
      role="group"
      aria-label={`Effects on ${owner}`}
      data-testid="insert-list"
      data-open={open || undefined}
      className={cn(
        'flex shrink-0 flex-col rounded-[var(--daw-radius-sm)]',
        open && 'bg-daw-selected',
        className,
      )}
      style={{ height: INSERT_LIST_PX }}
    >
      {shown.length === 0 ? (
        <Row
          label={`Add an effect to ${owner}`}
          hint={hintText(
            `Add an effect to ${owner}`,
            'Open the rack to pick an effect',
          )}
          onClick={() => openRack(target)}
          testId="insert-add"
        >
          <Plus aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">Add effect</span>
        </Row>
      ) : (
        shown.map(({ slot, on }, i) => {
          const name = FX_LABEL[slot] ?? slot;
          const last = i === shown.length - 1 && more > 0;
          return (
            <div key={slot} className="flex min-w-0">
              <Row
                label={`${name} on ${owner}${on ? '' : ' (off)'}: show it`}
                hint={hintText(
                  `${name} on ${owner}${on ? '' : ' (off)'}`,
                  'Show its controls in the rack below',
                )}
                onClick={() => openRack(target, slot)}
                testId="insert-effect"
                className="min-w-0 flex-1"
              >
                <span
                  aria-hidden
                  data-testid="insert-power"
                  data-on={on || undefined}
                  className={cn(
                    'size-1.5 shrink-0 rounded-full border border-daw-text-3',
                    on && 'border-daw-text bg-daw-text',
                  )}
                />
                <span
                  className={cn(
                    'truncate',
                    on ? 'text-daw-text' : 'text-daw-text-3',
                  )}
                >
                  {name}
                </span>
              </Row>
              {last ? (
                <Row
                  label={`${more} more effect${more > 1 ? 's' : ''} on ${owner}: show the rack`}
                  hint={hintText(
                    `${more} more effect${more > 1 ? 's' : ''} on ${owner}`,
                    'Show the whole chain in the rack below',
                  )}
                  onClick={() => openRack(target)}
                  testId="insert-more"
                  className="shrink-0 px-1"
                >
                  +{more}
                </Row>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function Row({
  label,
  hint,
  onClick,
  testId,
  className,
  children,
}: {
  label: string;
  /** What the hint line says (2.11): the name and what a click does. */
  hint?: string;
  onClick(): void;
  testId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-hint={hint}
      data-testid={testId}
      onClick={(e) => {
        // The strip round it may open a rack on a click of its own.
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        TYPE_CLASS.label,
        'flex h-6 items-center gap-1 rounded-[var(--daw-radius-sm)] px-1 text-left text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
        TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      {children}
    </button>
  );
}
