import { useEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useOracleSynthInstance } from '@/daw/hooks/useOracleSynthInstance';
import { useStoreBridge } from '@/daw/hooks/useStoreBridge';
import { PresetSelector } from '@/daw/oracle-synth/components/preset/PresetSelector';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { OracleSynthCard } from './OracleSynthCard';

// ── OracleSynthInline ────────────────────────────────────────────────────
// The synth in the dock: its main controls on one card, as the floating
// frame's dock shows its synth (OracleSynthCard); the card's expand opens
// every module (the maximized dock's full synth, OracleSynthView). The patch
// menu (save, init, import, export) is in the column at its left.

export function OracleSynthInline() {
  const { isVisible, engine, trackId } = useOracleSynthInstance();
  const engineRef = useRef<SynthEngine | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useStoreBridge(engine, trackId);

  if (!isVisible || !engine) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
          Synth engine not available
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Patch picker: the same PresetSelector as the full synth, so
          presets are reachable without expanding (and the tutorial can
          spotlight it via its data-tutorial-id). */}
      <div className="flex w-[280px] shrink-0 flex-col justify-center gap-1.5 border-r border-daw-hairline px-3">
        <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>Patch</span>
        <PresetSelector />
      </div>
      <div className="relative min-w-0 flex-1">
        {/* The synth as the floating frame's dock shows it: its main
            controls on one card; the full synth is a click away. */}
        <OracleSynthCard engine={engine} />
      </div>
    </div>
  );
}
