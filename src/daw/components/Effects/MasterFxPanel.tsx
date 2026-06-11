import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/daw/store';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { useCompressorMeters } from '@/daw/hooks/useCompressorMeters';
import { FxBrowser } from './FxBrowser';
import { FxChainRow, FxControlsPanel } from './EffectsPanel';

// ── MasterFxPanel ─────────────────────────────────────────────────────────
// Whole-mix effects editor bound to the mastering bus. Reuses the same
// FxBrowser / FxChainRow / FxControlsPanel trio as per-track FX, but wires
// them to the (trackId-less) mastering store actions. Shared by the Master
// track section and the Studio mastering view.

export function MasterFxPanel({ isReady }: { isReady: boolean }) {
  const fxChain = useStore((s) => s.masteringFxChain);
  const addMasteringFx = useStore((s) => s.addMasteringFx);
  const removeMasteringFx = useStore((s) => s.removeMasteringFx);
  const mfx = useStore((s) => s.masteringEffects);
  const updateMfx = useStore((s) => s.updateMasteringEffects);

  const [selectedEffect, setSelectedEffect] = useState<EffectSlotType | null>(
    null,
  );
  const [popOutOpen, setPopOutOpen] = useState(false);

  const masteringChain = isReady ? audioEngine.getMasteringChain() : null;
  const { gr, inLevel, outLevel } = useCompressorMeters(masteringChain);

  // Auto-select first effect; deselect if removed
  useEffect(() => {
    if (selectedEffect && !fxChain.includes(selectedEffect)) {
      setSelectedEffect(fxChain[0] ?? null);
    }
    if (!selectedEffect && fxChain.length > 0) {
      setSelectedEffect(fxChain[0]);
    }
  }, [fxChain, selectedEffect]);

  // Bridge mastering store API (no trackId) to the component API (with trackId)
  const wrappedUpdate = useCallback(
    (_id: string, fx: Partial<TrackEffectState>) => updateMfx(fx),
    [updateMfx],
  );
  const wrappedAdd = useCallback(
    (_id: string, effectType: EffectSlotType) => addMasteringFx(effectType),
    [addMasteringFx],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <FxBrowser
        trackId="master"
        activeEffects={fxChain}
        onAddEffect={wrappedAdd}
        hideMidi
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <FxChainRow
          activeEffects={fxChain}
          effects={mfx}
          selectedEffect={selectedEffect}
          onSelect={setSelectedEffect}
          onToggle={(slot) => {
            const current = mfx[slot as keyof TrackEffectState] as {
              enabled: boolean;
            };
            updateMfx({
              [slot]: {
                ...mfx[slot as keyof TrackEffectState],
                enabled: !current.enabled,
              },
            });
          }}
        />
        {selectedEffect ? (
          <FxControlsPanel
            trackId="master"
            selectedEffect={selectedEffect}
            effects={mfx}
            onUpdate={wrappedUpdate}
            onRemove={(slot) => removeMasteringFx(slot)}
            popOutOpen={popOutOpen}
            onTogglePopOut={() => setPopOutOpen((v) => !v)}
            gr={gr}
            inLevel={inLevel}
            outLevel={outLevel}
            analyserNode={masteringChain?.getPreCompAnalyser() ?? null}
          />
        ) : (
          <div
            className="flex flex-1 items-center justify-center text-[11px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {fxChain.length === 0
              ? 'Add effects to the mix'
              : 'Select a block to edit'}
          </div>
        )}
      </div>
    </div>
  );
}
