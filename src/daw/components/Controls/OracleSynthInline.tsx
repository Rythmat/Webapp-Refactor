import { useEffect, useRef, useMemo } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useOracleSynthInstance } from '@/daw/hooks/useOracleSynthInstance';
import { useStoreBridge } from '@/daw/hooks/useStoreBridge';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import { OracleSynthCard } from './OracleSynthCard';
import { SoundBrowser } from './SoundBrowser';
import { synthPatchCategories } from './synthPatchCategories';

// ── OracleSynthInline ────────────────────────────────────────────────────
// The synth in the dock: its main controls on one card, as the floating
// frame's dock shows its synth (OracleSynthCard); the card's expand opens
// every module (the maximized dock's full synth, OracleSynthView). The
// patches are in the dock's sound column at the left (SoundBrowser), by
// category, with the patch menu (save, init, import, export) at its top.

export function OracleSynthInline() {
  const { isVisible, engine, trackId } = useOracleSynthInstance();
  const engineRef = useRef<SynthEngine | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useStoreBridge(engine, trackId);

  const presetName = useSynthStore((s) => s.presetName);
  const loadPreset = useSynthStore((s) => s.loadPreset);
  const packPresets = useSynthStore((s) => s.packPresets);
  const userPresets = useSynthStore((s) => s.userPresets);
  const categories = useMemo(
    () =>
      synthPatchCategories(
        FACTORY_PRESETS.map((p) => p.name),
        packPresets,
        userPresets.map((p) => p.name),
      ),
    [packPresets, userPresets],
  );

  if (!isVisible || !engine) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs" style={{ color: 'var(--daw-text-3)' }}>
          Synth engine not available
        </span>
      </div>
    );
  }

  return (
    <SoundBrowser
      label="Synth patches"
      categories={categories}
      selectedId={presetName}
      onPick={loadPreset}
      // The lessons' patch anchor, on the patches' list. Save, init, import
      // and export are the full synth's patch menu.
      anchor="synth-preset-selector"
      data-testid="synth-sounds"
    >
      {/* The synth as the floating frame's dock shows it: its main
          controls on one card; the full synth is a click away. */}
      <OracleSynthCard engine={engine} />
    </SoundBrowser>
  );
}
