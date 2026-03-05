import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import { Dropdown } from '../controls/Dropdown';
import { Toggle } from '../controls/Toggle';
import { WaveformVisualizer } from '../visualizers/WaveformVisualizer';
import styles from './NoiseModule.module.css';

const NOISE_TYPE_OPTIONS = [
  { value: 'white', label: 'WHITE' },
  { value: 'pink', label: 'PINK' },
];

interface NoiseModuleProps {
  analyser?: AnalyserNode | null;
}

export const NoiseModule: React.FC<NoiseModuleProps> = React.memo(
  ({ analyser }) => {
    const noise = useSynthStore((s) => s.noise);
    const setParam = useSynthStore((s) => s.setNoiseParam);

    return (
      <div className={styles.module}>
        <div className={styles.header}>
          <Toggle
            value={noise.enabled}
            accent="#70e870"
            onChange={(v) => setParam('enabled', v)}
          />
          <span className={styles.title}>NOISE</span>
        </div>

        <Dropdown
          value={noise.type}
          options={NOISE_TYPE_OPTIONS}
          onChange={(v) => setParam('type', v as typeof noise.type)}
        />

        <WaveformVisualizer
          analyser={analyser ?? null}
          height={40}
          color="#70e870"
        />

        <div className={styles.knobRow}>
          <Knob
            label="LEVEL"
            value={noise.level}
            min={0}
            max={1}
            defaultValue={0.3}
            accent="#70e870"
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam('level', v)}
          />
          <Knob
            label="PAN"
            value={noise.pan}
            min={-1}
            max={1}
            defaultValue={0}
            accent="#70e870"
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
  },
);
