import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import { Dropdown } from '../controls/Dropdown';
import { Toggle } from '../controls/Toggle';
import { NumberStepper } from '../controls/NumberStepper';
import styles from './SubOscillatorModule.module.css';

const WAVEFORM_OPTIONS = [
  { value: 'sine', label: 'SINE' },
  { value: 'sawtooth', label: 'SAW' },
  { value: 'triangle', label: 'TRI' },
  { value: 'square', label: 'SQR' },
];

const accent = '#c0c0c0';

export const SubOscillatorModule: React.FC = React.memo(() => {
  const sub = useSynthStore((s) => s.subOscillator);
  const setParam = useSynthStore((s) => s.setSubParam);

  return (
    <div className={styles.module}>
      <div className={styles.header}>
        <Toggle
          value={sub.enabled}
          accent={accent}
          onChange={(v) => setParam('enabled', v)}
        />
        <span className={styles.title} style={{ color: accent }}>
          SUB
        </span>
      </div>

      <Dropdown
        value={sub.waveform}
        options={WAVEFORM_OPTIONS}
        onChange={(v) => setParam('waveform', v as typeof sub.waveform)}
      />

      <div className={styles.tuning}>
        <NumberStepper
          label="OCT"
          value={sub.octave}
          min={-2}
          max={0}
          onChange={(v) => setParam('octave', v)}
        />
        <NumberStepper
          label="SEM"
          value={sub.semitone}
          min={-12}
          max={12}
          onChange={(v) => setParam('semitone', v)}
        />
      </div>

      <div className={styles.knobRow}>
        <Knob
          label="LEVEL"
          value={sub.level}
          min={0}
          max={1}
          defaultValue={0.5}
          accent={accent}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setParam('level', v)}
        />
        <Knob
          label="PAN"
          value={sub.pan}
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
          onChange={(v) => setParam('pan', v)}
        />
      </div>
    </div>
  );
});
