import React from 'react';
import { useSynthStore } from '../../store';
import { EnvelopeParams } from '../../audio/types';
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

/**
 * The three canonical envelope shapes every synthesis curriculum teaches —
 * "if you understand these three, you can do 90% of all music production."
 */
const ENV_SHAPES: { label: string; params: EnvelopeParams }[] = [
  {
    label: 'PLUCK',
    params: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 },
  },
  {
    label: 'PIANO',
    params: { attack: 0.005, decay: 0.15, sustain: 0.75, release: 0.25 },
  },
  {
    label: 'PAD',
    params: { attack: 1.2, decay: 0.3, sustain: 1, release: 2 },
  },
];

/** Sustain at 100% makes decay inaudible — the classic ADSR confusion. */
const SUSTAIN_FULL = 0.995;

export const EnvelopeModule: React.FC<EnvelopeModuleProps> = React.memo(
  ({ index, accent = '#e8c840' }) => {
    const env = useSynthStore((s) => s.envelopes[index]);
    const setParam = useSynthStore((s) => s.setEnvParam);

    const label = index === 0 ? 'ENVELOPE 1' : 'ENVELOPE 2';
    const decayInactive = env.sustain >= SUSTAIN_FULL;

    const applyShape = (params: EnvelopeParams) => {
      setParam(index, 'attack', params.attack);
      setParam(index, 'decay', params.decay);
      setParam(index, 'sustain', params.sustain);
      setParam(index, 'release', params.release);
    };

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

        <div className={styles.shapeRow}>
          {ENV_SHAPES.map((shape) => (
            <button
              key={shape.label}
              className={styles.shapeBtn}
              onClick={() => applyShape(shape.params)}
              title={`Set the ${shape.label.toLowerCase()} envelope shape`}
            >
              {shape.label}
            </button>
          ))}
        </div>

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
            <div
              className={decayInactive ? styles.knobDimmed : undefined}
              title={
                decayInactive
                  ? 'Decay has no effect while Sustain is at 100%'
                  : undefined
              }
            >
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
  },
);
