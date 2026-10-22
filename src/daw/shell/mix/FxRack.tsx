import { useCallback, useEffect } from 'react';
import { cn } from '@/components/utilities';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { useShownEffect } from '@/daw/components/Effects/EffectsPanel';
import { FxCardRow } from '@/daw/components/Effects/FxCards';
import { AddEffectSlot } from '@/daw/shell/dock/AddEffectSlot';
import { useStore } from '@/daw/store';
import { anchorRackOf, type RackTarget } from '@/daw/store/effectRack';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useRack } from './rackAdapters';

// ── One effects rack (milestone 2.10; the floating frame, 2026-10-21) ─────
//
// The chain of a track, a return or the master, as the floating frame's
// dock draws it: a row of effect cards, each its own controls, and the Add
// effect card after the last (it arms the side rail's library, 2.8;
// FxCards). The dock's Effects, the dock's Master and the Mix view's
// RackDock all show this, so a rack looks and works the same wherever it
// opens, and fits the height it has. The shown effect is the store's
// dockEffect, the one the library and the lessons point at: one rack shows
// at a time.

/** Each rack's last shown effect, for this tab (never saved). */
const lastShown = new Map<string, EffectSlotType>();

const rackKey = (target: RackTarget) =>
  target.kind === 'master' ? 'master' : `${target.kind}:${target.id}`;

export function FxRack({
  target,
  onShowAll,
}: {
  target: RackTarget;
  /** Makes room for a card's every control: a taller dock or rack. */
  onShowAll?(): void;
}) {
  const rack = useRack(target);
  const shown = useStore((s) => s.dockEffect);
  const setShown = useStore((s) => s.setDockEffect);
  const key = rackKey(target);
  const chain = rack?.chain;

  // The shown effect is one store value for whichever rack shows, so each
  // rack remembers its own: back in Create after the master's rack in Mix,
  // the track's rack shows the effect the student left it on.
  useEffect(() => {
    if (shown && chain?.includes(shown)) lastShown.set(key, shown);
  }, [key, shown, chain]);
  const show = useCallback(
    (effect: EffectSlotType | null) => {
      const mine = lastShown.get(key);
      const fallingBack =
        effect !== null && !!chain && !(shown && chain.includes(shown));
      setShown(
        fallingBack && mine && chain.includes(mine) && effect === chain[0]
          ? mine
          : effect,
      );
    },
    [key, chain, shown, setShown],
  );

  useShownEffect(chain, shown, show);

  if (!rack) {
    return (
      <p
        className={cn(
          TYPE_CLASS.body,
          'm-auto px-4 text-center text-daw-text-3',
        )}
      >
        Select a track to edit its effects
      </p>
    );
  }

  return (
    <div
      data-testid="fx-rack"
      data-rack={anchorRackOf(target)}
      className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <FxCardRow
        fxId={rack.fxId}
        chain={rack.chain}
        effects={rack.effects}
        onUpdate={rack.update}
        onPreview={rack.preview}
        onRemove={rack.remove}
        meterTarget={rack.meterTarget}
        shown={shown}
        onShow={setShown}
        addSlot={<AddEffectSlot count={rack.chain.length} />}
        onShowAll={onShowAll}
      />
    </div>
  );
}
