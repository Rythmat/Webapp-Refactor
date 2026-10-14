/**
 * The Oracle Synth on a band layer: the Studio's synth panels, driving the
 * layer's own voice, so every turn of a knob is heard in the band as it
 * plays. The patch menu is the Studio's: pick any patch, or save the sound
 * — "for everyone" makes it a Music Atlas patch every band, part, lesson and
 * Studio project can name. The layer follows the patch the menu shows.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { FXPanel } from '@/daw/oracle-synth/components/fx/FXPanel';
import { LFOArea } from '@/daw/oracle-synth/components/layout/LFOArea';
import { ModulationPanel } from '@/daw/oracle-synth/components/modulation/ModulationPanel';
import { EnvelopeModule } from '@/daw/oracle-synth/components/modules/EnvelopeModule';
import { FilterModule } from '@/daw/oracle-synth/components/modules/FilterModule';
import { NoiseModule } from '@/daw/oracle-synth/components/modules/NoiseModule';
import { OscillatorModule } from '@/daw/oracle-synth/components/modules/OscillatorModule';
import { SubOscillatorModule } from '@/daw/oracle-synth/components/modules/SubOscillatorModule';
import { PresetSelector } from '@/daw/oracle-synth/components/preset/PresetSelector';
import { useSyncStoreToEngine } from '@/daw/oracle-synth/hooks/useSyncStoreToEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';

interface Props {
  engine: SynthEngine;
  /** The patch the layer names, loaded into the panel when it opens. */
  patch: string | undefined;
  /** The menu now shows another patch: the layer should name it. */
  onPatch: (name: string, shared: boolean) => void;
}

export const SynthLayerPanel = ({ engine, patch, onPatch }: Props) => {
  // The patch the panel opened on: the layer only follows a change from it.
  const opened = useRef<string | null>(null);

  // The layer's patch into the panel, once, as it opens. Loading trips the
  // store's dirty check, so it is cleared after, as the Studio does
  // (restoreSynthState).
  useEffect(() => {
    if (patch) useSynthStore.getState().loadPreset(patch);
    useSynthStore.setState({ isDirty: false });
    opened.current = useSynthStore.getState().presetName;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // Every edit in the panel goes to the layer's voice.
  useSyncStoreToEngine(engine);

  const presetName = useSynthStore((s) => s.presetName);
  const isDirty = useSynthStore((s) => s.isDirty);
  const presets = useSynthStore((s) => s.getPresetList)();
  const shared = presets.some((p) => p.name === presetName && p.isFactory);
  useEffect(() => {
    if (opened.current === null || isDirty || !presetName) return;
    if (presetName === opened.current) return;
    opened.current = presetName;
    onPatch(presetName, shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetName, isDirty]);

  const analysers = useMemo(
    () => ({
      osc1: engine.getOscAnalyser(0),
      osc2: engine.getOscAnalyser(1),
      noise: engine.getNoiseAnalyser(),
      filter1: engine.getFilter(0),
      filter2: engine.getFilter(1),
    }),
    [engine],
  );

  const slot = (w: number): React.CSSProperties => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    flexShrink: 0,
    overflow: 'hidden',
  });
  const panelSlot = (w: number): React.CSSProperties => ({
    ...slot(w),
    background: '#242424',
    border: '1px solid #333',
    borderRadius: 4,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {isDirty
          ? `Edited from ${presetName}: heard in the band now. Save it to keep it — "for everyone" makes it a Music Atlas patch lessons and the Studio can use.`
          : shared
            ? `${presetName}: a patch everyone has.`
            : `${presetName} is saved in this browser only. Save it for everyone so lessons and other admins hear it.`}
      </p>
      <div
        className="flex overflow-x-auto rounded-md"
        style={{ gap: 6, padding: 6, height: 300, background: '#1a1a1a' }}
      >
        <div
          className="flex flex-col justify-center gap-1.5 px-2"
          style={panelSlot(280)}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--color-text-dim)',
            }}
          >
            Patch
          </span>
          <PresetSelector />
        </div>
        <div className="[&>*]:h-full" style={slot(130)}>
          <SubOscillatorModule />
        </div>
        <div className="[&>*]:h-full" style={slot(240)}>
          <OscillatorModule
            index={0}
            accent="#e87070"
            analyser={analysers.osc1}
          />
        </div>
        <div className="[&>*]:h-full" style={slot(240)}>
          <OscillatorModule
            index={1}
            accent="#d05050"
            analyser={analysers.osc2}
          />
        </div>
        <div className="[&>*]:h-full" style={slot(170)}>
          <FilterModule
            index={0}
            accent="#e8a040"
            liveFilter={analysers.filter1}
          />
        </div>
        <div className="[&>*]:h-full" style={slot(170)}>
          <FilterModule
            index={1}
            accent="#d08830"
            liveFilter={analysers.filter2}
          />
        </div>
        <div className="[&>*]:h-full" style={slot(150)}>
          <EnvelopeModule index={0} accent="#e8c840" />
        </div>
        <div className="[&>*]:h-full" style={slot(150)}>
          <EnvelopeModule index={1} accent="#d0b030" />
        </div>
        <div className="[&>*]:h-full" style={slot(130)}>
          <NoiseModule analyser={analysers.noise} />
        </div>
        <div style={panelSlot(660)}>
          <LFOArea />
        </div>
        <div style={panelSlot(260)}>
          <ModulationPanel />
        </div>
        <div style={panelSlot(250)}>
          <FXPanel />
        </div>
      </div>
    </div>
  );
};
