import { useEffect, useRef } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useOracleSynthInstance } from '@/daw/hooks/useOracleSynthInstance';
import { useStoreBridge } from '@/daw/hooks/useStoreBridge';
import { DawSynthLayout } from './DawSynthLayout';

// ── OracleSynthView ──────────────────────────────────────────────────────
// Thin wrapper that bridges the DAW's track engine to the full Oracle Synth
// UI via the synth store, then renders the DawSynthLayout.
// Always finds an oracle-synth track (even if not currently selected).

export function OracleSynthView() {
  const { isVisible, engine, trackId } = useOracleSynthInstance();
  const engineRef = useRef<SynthEngine | null>(null);

  // Keep ref in sync with engine
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // Bridge Oracle Synth store ↔ engine for the synth track
  useStoreBridge(engine, trackId);

  if (!isVisible || !engine) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Synth engine not available
        </span>
      </div>
    );
  }

  return <DawSynthLayout engine={engine} engineRef={engineRef} />;
}
