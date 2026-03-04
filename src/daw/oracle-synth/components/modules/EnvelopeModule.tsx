import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import { EnvelopeVisualizer } from '../visualizers/EnvelopeVisualizer';
import styles from './EnvelopeModule.module.css';

interface EnvelopeModuleProps {
  index: 0 | 1;
  accent?: string;
}

function formatTime(seconds: number): string {
  if (seconds >= 1) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds * 1000)}ms`;
}

export const EnvelopeModule: React.FC<EnvelopeModuleProps> = React.memo(
  ({ index, accent = '#e8c840' }) => {
    const env = useSynthStore((s) => s.envelopes[index]);
    const setParam = useSynthStore((s) => s.setEnvParam);

    const label = index === 0 ? 'ENVELOPE 1' : 'ENVELOPE 2';

    return (
      <div className={styles.module}>
        <span className={styles.title} style={{ color: accent }}>
          {label}
        </span>

        <EnvelopeVisualizer
          attack={env.attack}
          decay={env.decay}
          sustain={env.sustain}
          release={env.release}
          color={accent}
        />

        <div className={styles.knobGrid}>
          <div className={styles.knobRow}>
            <Knob
              label="ATK"
              value={env.attack}
              min={0.001}
              max={5}
              defaultValue={0.01}
              accent={accent}
              formatValue={formatTime}
              onChange={(v) => setParam(index, 'attack', v)}
            />
            <Knob
              label="DEC"
              value={env.decay}
              min={0.001}
              max={5}
              defaultValue={0.1}
              accent={accent}
              formatValue={formatTime}
              onChange={(v) => setParam(index, 'decay', v)}
            />
          </div>
          <div className={styles.knobRow}>
            <Knob
              label="SUS"
              value={env.sustain}
              min={0}
              max={1}
              defaultValue={0.7}
              accent={accent}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => setParam(index, 'sustain', v)}
            />
            <Knob
              label="REL"
              value={env.release}
              min={0.001}
              max={10}
              defaultValue={0.3}
              accent={accent}
              formatValue={formatTime}
              onChange={(v) => setParam(index, 'release', v)}
            />
          </div>
        </div>
      </div>
    );
  }
);
