import React, { useMemo } from 'react';
import { ModRoute } from '../../audio/types';
import { Dropdown } from '../controls/Dropdown';
import { Knob } from '../controls/Knob';
import { Toggle } from '../controls/Toggle';
import styles from './ModulationSlot.module.css';

interface ModulationSlotProps {
  route: ModRoute;
  onUpdate: (id: string, updates: Partial<ModRoute>) => void;
  onRemove: (id: string) => void;
}

const LFO_OPTIONS = [
  { value: '0', label: 'LFO 1' },
  { value: '1', label: 'LFO 2' },
  { value: '2', label: 'LFO 3' },
  { value: '3', label: 'LFO 4' },
];

const TARGET_SOURCE_OPTIONS = [
  { value: 'osc1', label: 'OSC 1' },
  { value: 'osc2', label: 'OSC 2' },
  { value: 'flt1', label: 'FILTER 1' },
  { value: 'flt2', label: 'FILTER 2' },
];

const FILTER_PARAM_OPTIONS = [
  { value: 'cutoff', label: 'CUTOFF' },
  { value: 'resonance', label: 'RES' },
  { value: 'level', label: 'LEVEL' },
];

const OSC_PARAM_OPTIONS = [
  { value: 'level', label: 'LEVEL' },
];

function getParamOptions(source: string) {
  switch (source) {
    case 'osc1':
    case 'osc2':
      return OSC_PARAM_OPTIONS;
    case 'flt1':
    case 'flt2':
    default:
      return FILTER_PARAM_OPTIONS;
  }
}

export const ModulationSlot: React.FC<ModulationSlotProps> = React.memo(
  ({ route, onUpdate, onRemove }) => {
    const paramOptions = useMemo(
      () => getParamOptions(route.target.source),
      [route.target.source]
    );

    // Reset param to first valid option when source changes
    const currentParamValid = paramOptions.some(
      (o) => o.value === route.target.param
    );
    const effectiveParam = currentParamValid
      ? route.target.param
      : paramOptions[0].value;

    return (
      <div className={styles.slot}>
        <div className={styles.row}>
          <Toggle
            value={route.enabled}
            onChange={(v) => onUpdate(route.id, { enabled: v })}
          />
          <Dropdown
            value={String(route.lfoIndex)}
            options={LFO_OPTIONS}
            onChange={(v) => onUpdate(route.id, { lfoIndex: Number(v) })}
          />
          <span className={styles.arrow}>→</span>
          <div className={styles.targetGroup}>
            <Dropdown
              value={route.target.source}
              options={TARGET_SOURCE_OPTIONS}
              onChange={(v) => {
                const newSource = v as typeof route.target.source;
                const newParamOptions = getParamOptions(newSource);
                const paramStillValid = newParamOptions.some(
                  (o) => o.value === route.target.param
                );
                onUpdate(route.id, {
                  target: {
                    source: newSource,
                    param: paramStillValid
                      ? route.target.param
                      : (newParamOptions[0].value as typeof route.target.param),
                  },
                });
              }}
            />
            <Dropdown
              value={effectiveParam}
              options={paramOptions}
              onChange={(v) =>
                onUpdate(route.id, {
                  target: { ...route.target, param: v as typeof route.target.param },
                })
              }
            />
          </div>
        </div>

        <div className={styles.row}>
          <Knob
            label="MIN"
            value={route.depthMin}
            min={0}
            max={1}
            defaultValue={0}
            accent="#62b4f7"
            size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(route.id, { depthMin: v })}
          />
          <Knob
            label="MAX"
            value={route.depthMax}
            min={0}
            max={1}
            defaultValue={0.5}
            accent="#62b4f7"
            size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(route.id, { depthMax: v })}
          />
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(route.id)}
          >
            ×
          </button>
        </div>
      </div>
    );
  }
);
