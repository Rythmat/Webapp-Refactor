import React from 'react';
import { useSynthStore } from '../../store';
import { Filter } from '../../audio/Filter';
import { Knob } from '../controls/Knob';
import { Dropdown } from '../controls/Dropdown';
import { Toggle } from '../controls/Toggle';
import { FilterResponseVisualizer } from '../visualizers/FilterResponseVisualizer';
import styles from './FilterModule.module.css';

interface FilterModuleProps {
  index: 0 | 1;
  accent?: string;
  liveFilter?: Filter | null;
}

const FILTER_TYPE_OPTIONS = [
  { value: 'lowpass', label: 'LOW PASS' },
  { value: 'highpass', label: 'HIGH PASS' },
  { value: 'bandpass', label: 'BAND PASS' },
  { value: 'notch', label: 'NOTCH' },
  { value: 'allpass', label: 'ALL PASS' },
  { value: 'peaking', label: 'PEAKING' },
  { value: 'lowshelf', label: 'LOW SHELF' },
  { value: 'highshelf', label: 'HIGH SHELF' },
];

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const LOG_MIN = Math.log(MIN_FREQ);
const LOG_MAX = Math.log(MAX_FREQ);

function hzToNorm(hz: number): number {
  return (Math.log(hz) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

function normToHz(norm: number): number {
  return Math.exp(LOG_MIN + norm * (LOG_MAX - LOG_MIN));
}

function formatFreq(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
  return `${Math.round(hz)}`;
}

export const FilterModule: React.FC<FilterModuleProps> = React.memo(
  ({ index, accent = '#e8a040', liveFilter }) => {
    const filter = useSynthStore((s) => s.filters[index]);
    const setParam = useSynthStore((s) => s.setFilterParam);

    const label = index === 0 ? 'FILTER 1' : 'FILTER 2';

    return (
      <div className={styles.module}>
        <div className={styles.header}>
          <Toggle
            value={filter.enabled}
            accent={accent}
            onChange={(v) => setParam(index, 'enabled', v)}
          />
          <span className={styles.title} style={{ color: accent }}>
            {label}
          </span>
        </div>

        <Dropdown
          value={filter.type}
          options={FILTER_TYPE_OPTIONS}
          onChange={(v) => setParam(index, 'type', v as typeof filter.type)}
        />

        <FilterResponseVisualizer
          liveFilter={liveFilter ?? null}
          color={accent}
        />

        <div className={styles.knobRow}>
          <Knob
            label="CUTOFF"
            value={hzToNorm(filter.cutoff)}
            min={0}
            max={1}
            defaultValue={1}
            accent={accent}
            formatValue={(v) => formatFreq(normToHz(v))}
            onChange={(v) => setParam(index, 'cutoff', normToHz(v))}
          />
          <Knob
            label="RES"
            value={filter.resonance}
            min={0}
            max={30}
            defaultValue={0}
            accent={accent}
            formatValue={(v) => v.toFixed(1)}
            onChange={(v) => setParam(index, 'resonance', v)}
          />
        </div>

        <div className={styles.knobRow}>
          <Knob
            label="PAN"
            value={filter.pan}
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
            label="GAIN"
            value={filter.gain}
            min={-24}
            max={24}
            defaultValue={0}
            accent={accent}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
            onChange={(v) => setParam(index, 'gain', v)}
          />
          <Knob
            label="MIX"
            value={filter.mix}
            min={0}
            max={1}
            defaultValue={1}
            accent={accent}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setParam(index, 'mix', v)}
          />
        </div>
      </div>
    );
  },
);
