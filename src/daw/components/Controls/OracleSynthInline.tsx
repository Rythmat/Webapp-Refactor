import { useEffect, useRef, useMemo } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useOracleSynthInstance } from '@/daw/hooks/useOracleSynthInstance';
import { useStoreBridge } from '@/daw/hooks/useStoreBridge';
import { SubOscillatorModule } from '@/daw/oracle-synth/components/modules/SubOscillatorModule';
import { OscillatorModule } from '@/daw/oracle-synth/components/modules/OscillatorModule';
import { FilterModule } from '@/daw/oracle-synth/components/modules/FilterModule';
import { EnvelopeModule } from '@/daw/oracle-synth/components/modules/EnvelopeModule';
import { NoiseModule } from '@/daw/oracle-synth/components/modules/NoiseModule';
import { LFOArea } from '@/daw/oracle-synth/components/layout/LFOArea';
import { ModulationPanel } from '@/daw/oracle-synth/components/modulation/ModulationPanel';
import { FXPanel } from '@/daw/oracle-synth/components/fx/FXPanel';
import { ArpPanel } from '@/daw/oracle-synth/components/arp/ArpPanel';
import { RoutingPanel } from '@/daw/oracle-synth/components/routing/RoutingPanel';

// ── OracleSynthInline ────────────────────────────────────────────────────
// Compact horizontal layout of all Oracle Synth sections for the 33vh
// channel strip. Scrolls horizontally. The expand button in
// TrackControlsPanel opens the full DawSynthLayout in a pop-out overlay.

export function OracleSynthInline() {
  const { isVisible, engine, trackId } = useOracleSynthInstance();
  const engineRef = useRef<SynthEngine | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useStoreBridge(engine, trackId);

  const analysers = useMemo(() => {
    if (!engine) return null;
    return {
      osc1: engine.getOscAnalyser(0),
      osc2: engine.getOscAnalyser(1),
      noise: engine.getNoiseAnalyser(),
      filter1: engine.getFilter(0),
      filter2: engine.getFilter(1),
    };
  }, [engine]);

  if (!isVisible || !engine || !analysers) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Synth engine not available
        </span>
      </div>
    );
  }

  // Fixed widths prevent modules with CSS `flex:1` from growing/drifting
  const slot = (w: number): React.CSSProperties => ({ width: w, minWidth: w, maxWidth: w, flexShrink: 0 });
  const panelSlot = (w: number): React.CSSProperties => ({ ...slot(w), background: '#242424', border: '1px solid #333', borderRadius: 4 });

  return (
    <div
      className="flex h-full overflow-x-auto"
      style={{
        gap: 6,
        padding: 6,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}
    >
      <div className="[&>*]:h-full" style={slot(130)}><SubOscillatorModule /></div>
      <div className="[&>*]:h-full" style={slot(170)}><OscillatorModule index={0} accent="#e87070" analyser={analysers.osc1} /></div>
      <div className="[&>*]:h-full" style={slot(170)}><OscillatorModule index={1} accent="#d05050" analyser={analysers.osc2} /></div>
      <div className="[&>*]:h-full" style={slot(160)}><FilterModule index={0} accent="#e8a040" liveFilter={analysers.filter1} /></div>
      <div className="[&>*]:h-full" style={slot(160)}><FilterModule index={1} accent="#d08830" liveFilter={analysers.filter2} /></div>
      <div className="[&>*]:h-full" style={slot(150)}><EnvelopeModule index={0} accent="#e8c840" /></div>
      <div className="[&>*]:h-full" style={slot(150)}><EnvelopeModule index={1} accent="#d0b030" /></div>
      <div className="[&>*]:h-full" style={slot(130)}><NoiseModule analyser={analysers.noise} /></div>
      <div style={panelSlot(640)}><LFOArea /></div>
      <div style={panelSlot(220)}><ModulationPanel /></div>
      <div style={panelSlot(220)}><FXPanel /></div>
      <div style={panelSlot(140)}><ArpPanel /></div>
      <div style={panelSlot(160)}><RoutingPanel /></div>
    </div>
  );
}
