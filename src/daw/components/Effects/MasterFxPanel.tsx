import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/daw/store';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { FxBrowser } from './FxBrowser';
import { previewMasteringEffects } from '@/daw/engine/preview';
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
        onSelectEffect={setSelectedEffect}
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
            onPreview={previewMasteringEffects}
            onRemove={(slot) => removeMasteringFx(slot)}
            popOutOpen={popOutOpen}
            onTogglePopOut={() => setPopOutOpen((v) => !v)}
            meterTarget={isReady ? 'master' : null}
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
