import React, { useMemo, useSyncExternalStore } from 'react';
import { useSynthStore } from '../../store';
import { useModIndicator } from '../../hooks/useModIndicator';
import type { OscWarpMode } from '../../audio/types';
import {
  getRegisteredTableNames,
  subscribeTableRegistry,
} from '../../audio/wavetableImport';
import { Knob, KnobModArc } from '../controls/Knob';
import { Dropdown } from '../controls/Dropdown';
import { Toggle } from '../controls/Toggle';
import { NumberStepper } from '../controls/NumberStepper';
import { WaveformVisualizer } from '../visualizers/WaveformVisualizer';
import styles from './OscillatorModule.module.css';

function offsetArc(
  mod: { loOffset: number; hiOffset: number; liveOffset: number | null } | null,
  base: number,
): KnobModArc | null {
  if (!mod) return null;
  return {
    lo: base + mod.loOffset,
    hi: base + mod.hiOffset,
    live: mod.liveOffset != null ? base + mod.liveOffset : null,
  };
}

interface OscillatorModuleProps {
  index: 0 | 1;
  accent?: string;
  analyser?: AnalyserNode | null;
}

const BUILT_IN_TABLES = [
  { value: 'SINE WAVE', label: 'SINE WAVE' },
  { value: 'SAWTOOTH', label: 'SAWTOOTH' },
  { value: 'TRIANGLE', label: 'TRIANGLE' },
  { value: 'SQUARE', label: 'SQUARE' },
  { value: 'PWM', label: 'PWM' },
  { value: 'SUPER SAW', label: 'SUPER SAW' },
  { value: 'FORMANT', label: 'FORMANT' },
  { value: 'HARMONIC', label: 'HARMONIC' },
];

// Warp modes. Distortion family (live waveshapers) then phase family
// (pre-baked into the wavetable frames). See audio/wavetableWarp.ts.
const WARP_OPTIONS: { value: OscWarpMode; label: string }[] = [
  { value: 'none', label: 'NO WARP' },
  { value: 'hardclip', label: 'HARD CLIP' },
  { value: 'softclip', label: 'SOFT CLIP' },
  { value: 'tube', label: 'TUBE' },
  { value: 'tapesat', label: 'TAPE SAT' },
  { value: 'rectify', label: 'RECTIFY' },
  { value: 'sineshaper', label: 'SINE SHAPE' },
  { value: 'diode', label: 'DIODE' },
  { value: 'fold', label: 'FOLD' },
  { value: 'crush', label: 'CRUSH' },
  { value: 'sync', label: 'SYNC' },
  { value: 'pwm', label: 'PWM WARP' },
  { value: 'bend', label: 'BEND' },
  { value: 'squeeze', label: 'SQUEEZE' },
  { value: 'quantize', label: 'QUANTIZE' },
  { value: 'flip', label: 'FLIP' },
];

export const OscillatorModule: React.FC<OscillatorModuleProps> = React.memo(
  ({ index, accent = '#e87070', analyser }) => {
    const osc = useSynthStore((s) => s.oscillators[index]);
    const setParam = useSynthStore((s) => s.setOscParam);

    const label = index === 0 ? 'OSC 1' : 'OSC 2';
    const oscId = index === 0 ? 'osc1' : 'osc2';

    // Modulation rings on the matrix's osc destinations
    const panArc = offsetArc(useModIndicator(oscId, 'pan'), osc.pan);
    const levelArc = offsetArc(useModIndicator(oscId, 'level'), osc.level);

    // Built-in tables + registered pack tables (e.g. the Serum pack)
    const packTables = useSyncExternalStore(
      subscribeTableRegistry,
      getRegisteredTableNames,
    );
    const wavetableOptions = useMemo(
      () => [
        ...BUILT_IN_TABLES,
        ...packTables.map((name) => ({
          value: name,
          label: name.replace(/^S2\//, '').toUpperCase(),
        })),
      ],
      [packTables],
    );

    return (
      <div className={styles.module}>
        <div className={styles.header}>
          <Toggle
            value={osc.enabled}
            accent={accent}
            onChange={(v) => setParam(index, 'enabled', v)}
          />
          <span className={styles.title} style={{ color: accent }}>
            {label}
          </span>
        </div>

        <Dropdown
          value={osc.wavetable}
          options={wavetableOptions}
          onChange={(v) => setParam(index, 'wavetable', v)}
        />

        <WaveformVisualizer
          analyser={analyser ?? null}
          height={40}
          color={accent}
        />

        <div className={styles.tuning}>
          <NumberStepper
            label="OCT"
            value={osc.octave}
            min={-3}
            max={3}
            onChange={(v) => setParam(index, 'octave', v)}
          />
          <NumberStepper
            label="SEM"
            value={osc.semitone}
            min={-12}
            max={12}
            onChange={(v) => setParam(index, 'semitone', v)}
          />
          <NumberStepper
            label="FIN"
            value={osc.fine}
            min={-100}
            max={100}
            onChange={(v) => setParam(index, 'fine', v)}
          />
        </div>

        <div className={styles.knobRow}>
          <Knob
            label="WT POS"
            value={osc.wtPosition}
            min={0}
            max={1}
            defaultValue={0}
            accent={accent}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'wtPosition', v)}
          />
          <Knob
            label="PAN"
            value={osc.pan}
            min={-1}
            max={1}
            defaultValue={0}
            accent={accent}
            modArc={panArc}
            formatValue={(v) =>
              v === 0
                ? 'C'
                : v < 0
                  ? `L${Math.round(-v * 100)}`
                  : `R${Math.round(v * 100)}`
            }
            onChange={(v) => setParam(index, 'pan', v)}
          />
          <Knob
            label="LEVEL"
            value={osc.level}
            min={0}
            max={1}
            defaultValue={0.7}
            accent={accent}
            modArc={levelArc}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'level', v)}
          />
        </div>

        <div className={styles.unisonRow}>
          <Knob
            label="UNI"
            value={osc.unisonVoices}
            min={1}
            max={16}
            step={1}
            defaultValue={1}
            accent={accent}
            size={28}
            formatValue={(v) => String(Math.round(v))}
            onChange={(v) => setParam(index, 'unisonVoices', Math.round(v))}
          />
          <Knob
            label="DETUNE"
            value={osc.unisonDetune}
            min={0}
            max={1}
            defaultValue={0}
            accent={accent}
            size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'unisonDetune', v)}
          />
          <Knob
            label="BLEND"
            value={osc.unisonBlend}
            min={0}
            max={1}
            defaultValue={0.1}
            accent={accent}
            size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'unisonBlend', v)}
          />
        </div>

        <div className={styles.unisonRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Dropdown
              value={osc.warpMode}
              options={WARP_OPTIONS}
              onChange={(v) => setParam(index, 'warpMode', v as OscWarpMode)}
            />
          </div>
          <Knob
            label="WARP"
            value={osc.warpAmount}
            min={0}
            max={1}
            defaultValue={0}
            accent={accent}
            size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'warpAmount', v)}
          />
        </div>
      </div>
    );
  },
);
