import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import { Dropdown } from '../controls/Dropdown';
import { Toggle } from '../controls/Toggle';
import { NumberStepper } from '../controls/NumberStepper';
import { WaveformVisualizer } from '../visualizers/WaveformVisualizer';
import styles from './OscillatorModule.module.css';

interface OscillatorModuleProps {
  index: 0 | 1;
  accent?: string;
  analyser?: AnalyserNode | null;
}

const WAVETABLE_OPTIONS = [
  { value: 'SINE WAVE', label: 'SINE WAVE' },
  { value: 'SAWTOOTH', label: 'SAWTOOTH' },
  { value: 'TRIANGLE', label: 'TRIANGLE' },
  { value: 'SQUARE', label: 'SQUARE' },
  { value: 'PWM', label: 'PWM' },
  { value: 'SUPER SAW', label: 'SUPER SAW' },
  { value: 'FORMANT', label: 'FORMANT' },
  { value: 'HARMONIC', label: 'HARMONIC' },
];

export const OscillatorModule: React.FC<OscillatorModuleProps> = React.memo(
  ({ index, accent = '#e87070', analyser }) => {
    const osc = useSynthStore((s) => s.oscillators[index]);
    const setParam = useSynthStore((s) => s.setOscParam);

    const label = index === 0 ? 'OSC 1' : 'OSC 2';

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
          options={WAVETABLE_OPTIONS}
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
      </div>
    );
  },
);
