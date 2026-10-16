import { useCallback, useRef } from 'react';
import { cn } from '@/components/utilities';
import type { TrackEffectState } from '@/daw/audio/EffectChain';
import {
  FxChainRow,
  FxControlsPanel,
  useShownEffect,
} from '@/daw/components/Effects/EffectsPanel';
import { meterSource } from '@/daw/engine/meterBus';
import { previewMasteringEffects } from '@/daw/engine/preview';
import { useMasterVolumeControl } from '@/daw/hooks/useMixControls';
import { useStore } from '@/daw/store';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { Meter } from '@/daw/ui/Meter';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { AddEffectSlot } from './AddEffectSlot';

// ── Master, in the dock's slot (milestone 2.9) ─────────────────────────────
//
// The bottom rail's Master opens this where a track's editor goes, as
// Soundtrap's Master drawer does (ST8): the gain at the left, the master
// chain in the middle (the same chain, Add effect slot and controls as a
// track's Effects tab, on the mastering rack), and the output's peak at the
// right. The Mix view keeps the full mixer and its mastering section; this
// is the quick way in from Create. Its parts are the Mix view's, so 2.10's
// master column shares them. The lesson anchors mastering-section and
// master-strip stay in the Mix view; this body is dock-master.

const FADER_PX = 112;

export function DockMaster() {
  const chain = useStore((s) => s.masteringFxChain);
  const effects = useStore((s) => s.masteringEffects);
  const updateMastering = useStore((s) => s.updateMasteringEffects);
  const removeMasteringFx = useStore((s) => s.removeMasteringFx);
  const shown = useStore((s) => s.dockEffect);
  const show = useStore((s) => s.setDockEffect);
  const roomy = useStore((s) => s.dockMaximized);
  const volume = useMasterVolumeControl();
  const output = useRef(meterSource('master'));

  useShownEffect(chain, shown, show);

  const update = useCallback(
    (_id: string, partial: Partial<TrackEffectState>) =>
      updateMastering(partial),
    [updateMastering],
  );

  return (
    <div
      data-tutorial-id="dock-master"
      data-testid="dock-master"
      className="flex h-full min-h-0"
    >
      <Column label="Gain">
        <div onPointerDownCapture={volume.begin}>
          <Fader
            label="Master gain"
            length={FADER_PX}
            min={0}
            max={1}
            step={0.01}
            resetValue={0.8}
            value={volume.value}
            format={(v) => formatGain(v)}
            onChange={volume.change}
            onCommit={volume.end}
            hideLabel
          />
        </div>
      </Column>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-x border-daw-hairline">
        <FxChainRow
          activeEffects={chain}
          effects={effects}
          selectedEffect={shown}
          onSelect={show}
          onToggle={(slot) => {
            const current = effects[slot as keyof TrackEffectState] as {
              enabled: boolean;
            };
            updateMastering({
              [slot]: {
                ...effects[slot as keyof TrackEffectState],
                enabled: !current.enabled,
              },
            });
          }}
          addSlot={<AddEffectSlot count={chain.length} />}
        />
        {shown && chain.includes(shown) ? (
          <FxControlsPanel
            trackId="master"
            selectedEffect={shown}
            effects={effects}
            onUpdate={update}
            onPreview={previewMasteringEffects}
            onRemove={(slot) => removeMasteringFx(slot)}
            roomy={roomy}
            meterTarget="master"
          />
        ) : (
          <p
            className={cn(
              TYPE_CLASS.body,
              'm-auto px-4 text-center text-daw-text-3',
            )}
          >
            {chain.length === 0
              ? 'Effects here shape the whole mix. Add effect opens the library.'
              : 'Select an effect to change it'}
          </p>
        )}
      </div>
      <Column label="Output">
        <Meter
          label="Master output"
          source={output.current}
          orientation="vertical"
          length={FADER_PX}
          showPeak
        />
      </Column>
    </div>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-2">
      {children}
      <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>{label}</span>
    </div>
  );
}
