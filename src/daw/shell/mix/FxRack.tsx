import { useCallback, useEffect } from 'react';
import { cn } from '@/components/utilities';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import {
  FxChainRow,
  FxControlsPanel,
  useShownEffect,
} from '@/daw/components/Effects/EffectsPanel';
import { Plus, Power, X } from 'lucide-react';
import { FxBlockIcon } from '@/daw/components/Effects/FxBlockIcon';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { AddEffectSlot, useEffectsArmed } from '@/daw/shell/dock/AddEffectSlot';
import { useStore } from '@/daw/store';
import {
  anchorRackOf,
  MAX_RACK_EFFECTS,
  type RackTarget,
} from '@/daw/store/effectRack';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { useRack } from './rackAdapters';

// ── One effects rack (milestone 2.10) ──────────────────────────────────────
//
// The chain of a track, a return or the master, as blocks with the Add
// effect slot after the last (it arms the side rail's library, 2.8), and
// the controls of the effect picked in it below. The dock's Effects tab,
// the dock's Master and the Mix view's RackDock all show this, so a rack
// looks and works the same wherever it opens. The picked effect is the
// store's dockEffect: one rack shows at a time.

/** Each rack's last shown effect, for this tab (never saved). */
const lastShown = new Map<string, EffectSlotType>();

const rackKey = (target: RackTarget) =>
  target.kind === 'master' ? 'master' : `${target.kind}:${target.id}`;

export function FxRack({
  target,
  roomy = false,
  empty,
  layout = 'stacked',
}: {
  target: RackTarget;
  /** Larger knobs and the effect's graph (a maximized dock). */
  roomy?: boolean;
  /** What an empty chain says, in place of the default. */
  empty?: string;
  /**
   * 'stacked': the chain's blocks over the controls (the dock); 'side': the
   * chain as a list beside them, where height is short (the Mix RackDock).
   */
  layout?: 'stacked' | 'side';
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

  const blocks = [...rack.chain];
  const toggle = (slot: EffectSlotType) => {
    const current = rack.effects[slot as keyof TrackEffectState] as {
      enabled: boolean;
    };
    rack.update({
      [slot]: {
        ...rack.effects[slot as keyof TrackEffectState],
        enabled: !current.enabled,
      },
    });
  };
  const controls =
    shown && blocks.includes(shown) ? (
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
        {blocks.length === 0
          ? (empty ?? 'Add effect opens the effects library')
          : 'Select an effect to change it'}
      </p>
    );

  if (layout === 'side') {
    // The chain as a list beside the controls: under the Mix view's strips
    // the rack has about 170 px at 1366×655, and the chain's 68 px blocks
    // above the controls left the knobs a 41 px scroll box.
    return (
      <div
        data-testid="fx-rack"
        data-rack={anchorRackOf(target)}
        data-layout="side"
        className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        <ChainList
          chain={blocks}
          effects={rack.effects}
          shown={shown}
          onShow={setShown}
          onToggle={toggle}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-daw-hairline">
          {controls}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="fx-rack"
      data-rack={anchorRackOf(target)}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <FxChainRow
        activeEffects={blocks}
        effects={rack.effects}
        selectedEffect={shown}
        onSelect={setShown}
        onToggle={toggle}
        addSlot={<AddEffectSlot count={blocks.length} />}
      />
      {controls}
    </div>
  );
}

/**
 * The chain as a list: each effect a row with its power switch and its
 * name (a click shows its controls), then the Add effect row, which arms
 * the side rail's library as the dock's Add effect slot does.
 */
function ChainList({
  chain,
  effects,
  shown,
  onShow,
  onToggle,
}: {
  chain: EffectSlotType[];
  effects: TrackEffectState;
  shown: EffectSlotType | null;
  onShow: (slot: EffectSlotType) => void;
  onToggle: (slot: EffectSlotType) => void;
}) {
  const armed = useEffectsArmed();
  const openLibrary = useStore((s) => s.openEffectsLibrary);
  const cancel = useStore((s) => s.cancelEffectsLibrary);
  const full = chain.length >= MAX_RACK_EFFECTS;
  return (
    <div
      className="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto p-2"
      role="group"
      aria-label="Effects chain"
    >
      {chain.map((slot) => {
        const on = (
          effects[slot as keyof TrackEffectState] as {
            enabled?: boolean;
          }
        )?.enabled;
        const label = FX_LABEL[slot] ?? slot;
        return (
          <div key={slot} className="flex items-center gap-1">
            <Toggle
              label={`${label} on`}
              size="sm"
              pressed={!!on}
              onPressedChange={() => onToggle(slot)}
              icon={<Power />}
            />
            <button
              type="button"
              data-tutorial-id={`fx-slot-${slot}`}
              aria-pressed={shown === slot}
              onClick={() => onShow(slot)}
              className={cn(
                TYPE_CLASS.body,
                'flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 text-left',
                shown === slot
                  ? 'bg-daw-selected text-daw-text'
                  : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
                !on && 'opacity-60',
                TRANSITION,
                FOCUS_RING,
              )}
            >
              <FxBlockIcon type={slot} size={16} color="currentColor" />
              <span className="truncate">{label}</span>
            </button>
          </div>
        );
      })}
      {full ? (
        <span className={cn(TYPE_CLASS.label, 'px-2 py-1 text-daw-text-3')}>
          Chain full: {MAX_RACK_EFFECTS} of {MAX_RACK_EFFECTS}
        </span>
      ) : armed ? (
        <div className="flex items-center gap-1">
          <span
            data-testid="fx-add-slot"
            data-state="armed"
            className={cn(
              TYPE_CLASS.body,
              'flex h-7 flex-1 items-center rounded-[var(--daw-radius-sm)] border border-daw-text-2 px-2 text-daw-text',
            )}
          >
            Pick from the library
          </span>
          <IconButton
            label="Stop adding effects"
            icon={<X />}
            size="sm"
            data-testid="fx-add-cancel"
            onClick={cancel}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          data-testid="fx-add-slot"
          data-tutorial-id="fx-add-slot"
          data-state="idle"
          onClick={openLibrary}
          className="justify-start"
        >
          <Plus aria-hidden />
          Add effect
        </Button>
      )}
      <span className={cn(TYPE_CLASS.label, 'px-2 text-daw-text-3')}>
        {chain.length} of {MAX_RACK_EFFECTS}
      </span>
    </div>
  );
}
