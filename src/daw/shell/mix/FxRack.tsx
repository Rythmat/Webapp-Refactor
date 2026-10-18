import { cn } from '@/components/utilities';
import type { TrackEffectState } from '@/daw/audio/EffectChain';
import {
  FxChainRow,
  FxControlsPanel,
  useShownEffect,
} from '@/daw/components/Effects/EffectsPanel';
import { AddEffectSlot } from '@/daw/shell/dock/AddEffectSlot';
import { useStore } from '@/daw/store';
import { anchorRackOf, type RackTarget } from '@/daw/store/effectRack';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useRack } from './rackAdapters';

// ── One effects rack (milestone 2.10) ──────────────────────────────────────
//
// The chain of a track, a return or the master, as blocks with the Add
// effect slot after the last (it arms the side rail's library, 2.8), and
// the controls of the effect picked in it below. The dock's Effects tab,
// the dock's Master and the Mix view's RackDock all show this, so a rack
// looks and works the same wherever it opens. The picked effect is the
// store's dockEffect: one rack shows at a time.

export function FxRack({
  target,
  roomy = false,
  empty,
}: {
  target: RackTarget;
  /** Larger knobs and the effect's graph (a maximized dock). */
  roomy?: boolean;
  /** What an empty chain says, in place of the default. */
  empty?: string;
}) {
  const rack = useRack(target);
  const shown = useStore((s) => s.dockEffect);
  const show = useStore((s) => s.setDockEffect);

  useShownEffect(rack?.chain, shown, show);

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

  const chain = [...rack.chain];
  return (
    <div
      data-testid="fx-rack"
      data-rack={anchorRackOf(target)}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <FxChainRow
        activeEffects={chain}
        effects={rack.effects}
        selectedEffect={shown}
        onSelect={show}
        onToggle={(slot) => {
          const current = rack.effects[slot as keyof TrackEffectState] as {
            enabled: boolean;
          };
          rack.update({
            [slot]: {
              ...rack.effects[slot as keyof TrackEffectState],
              enabled: !current.enabled,
            },
          });
        }}
        addSlot={<AddEffectSlot count={chain.length} />}
      />
      {shown && chain.includes(shown) ? (
        <FxControlsPanel
          trackId={rack.fxId}
          selectedEffect={shown}
          effects={rack.effects}
          onUpdate={(_id, partial) => rack.update(partial)}
          onPreview={rack.preview}
          onRemove={rack.remove}
          roomy={roomy}
          meterTarget={rack.meterTarget}
        />
      ) : (
        <p
          className={cn(
            TYPE_CLASS.body,
            'm-auto px-4 text-center text-daw-text-3',
          )}
        >
          {chain.length === 0
            ? (empty ?? 'Add effect opens the effects library')
            : 'Select an effect to change it'}
        </p>
      )}
    </div>
  );
}
