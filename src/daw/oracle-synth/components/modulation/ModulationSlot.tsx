import React, { useMemo } from 'react';
import { ModRoute, ModSourceRef } from '../../audio/types';
import { SCALE_PITCH_TRANSFORM_ID } from '../../audio/ScalePitchModTransform';
import { Dropdown } from '../controls/Dropdown';
import { Knob } from '../controls/Knob';
import { Toggle } from '../controls/Toggle';
import { SegmentedControl } from '../controls/SegmentedControl';
import styles from './ModulationSlot.module.css';

interface ModulationSlotProps {
  route: ModRoute;
  onUpdate: (id: string, updates: Partial<ModRoute>) => void;
  onRemove: (id: string) => void;
}

// Sources are encoded as flat dropdown values: "type:index" (or "type" for
// scalar sources). Extend this list when registering new engine sources.
const SOURCE_OPTIONS = [
  { value: 'lfo:0', label: 'LFO 1' },
  { value: 'lfo:1', label: 'LFO 2' },
  { value: 'lfo:2', label: 'LFO 3' },
  { value: 'lfo:3', label: 'LFO 4' },
  { value: 'envelope:0', label: 'ENV AMP' },
  { value: 'envelope:1', label: 'ENV MOD' },
  { value: 'velocity', label: 'VELO' },
  { value: 'keytrack', label: 'NOTE' },
  { value: 'modwheel', label: 'WHEEL' },
  { value: 'macro:0', label: 'MACRO 1' },
  { value: 'macro:1', label: 'MACRO 2' },
  { value: 'macro:2', label: 'MACRO 3' },
  { value: 'macro:3', label: 'MACRO 4' },
  { value: 'macro:4', label: 'MACRO 5' },
  { value: 'macro:5', label: 'MACRO 6' },
  { value: 'macro:6', label: 'MACRO 7' },
  { value: 'macro:7', label: 'MACRO 8' },
  { value: 'audio:0', label: 'AUDIO OSC' },
];

function encodeSource(ref: ModSourceRef): string {
  switch (ref.type) {
    case 'velocity':
    case 'keytrack':
    case 'modwheel':
      return ref.type;
    default:
      return `${ref.type}:${ref.index}`;
  }
}

function decodeSource(value: string): ModSourceRef {
  const [type, index] = value.split(':');
  return { type, index: index ? Number(index) : 0 };
}

const TARGET_SOURCE_OPTIONS = [
  { value: 'osc1', label: 'OSC 1' },
  { value: 'osc2', label: 'OSC 2' },
  { value: 'sub', label: 'SUB' },
  { value: 'noise', label: 'NOISE' },
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
  { value: 'pan', label: 'PAN' },
  { value: 'detune', label: 'PITCH' },
];

const NOISE_PARAM_OPTIONS = [
  { value: 'level', label: 'LEVEL' },
  { value: 'pan', label: 'PAN' },
];

const POLARITY_OPTIONS = [
  { value: 'unipolar', label: 'UNI' },
  { value: 'bipolar', label: 'BI' },
];

const CURVE_OPTIONS = [
  { value: 'linear', label: 'LIN' },
  { value: 'exp', label: 'EXP' },
  { value: 'log', label: 'LOG' },
  { value: 'scurve', label: 'S' },
];

function getParamOptions(source: string) {
  switch (source) {
    case 'osc1':
    case 'osc2':
    case 'sub':
      return OSC_PARAM_OPTIONS;
    case 'noise':
      return NOISE_PARAM_OPTIONS;
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
      [route.target.source],
    );

    // Reset param to first valid option when source changes
    const currentParamValid = paramOptions.some(
      (o) => o.value === route.target.param,
    );
    const effectiveParam = currentParamValid
      ? route.target.param
      : paramOptions[0].value;

    const isPitchTarget = effectiveParam === 'detune';
    const scaleQuantized = route.transform === SCALE_PITCH_TRANSFORM_ID;

    return (
      <div className={styles.slot}>
        <div className={styles.row}>
          <Toggle
            value={route.enabled}
            onChange={(v) => onUpdate(route.id, { enabled: v })}
          />
          <Dropdown
            value={encodeSource(route.source)}
            options={SOURCE_OPTIONS}
            onChange={(v) => onUpdate(route.id, { source: decodeSource(v) })}
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
                  (o) => o.value === route.target.param,
                );
                const newParam = paramStillValid
                  ? route.target.param
                  : (newParamOptions[0].value as typeof route.target.param);
                onUpdate(route.id, {
                  target: { source: newSource, param: newParam },
                  // Scale-quantize only applies to pitch targets
                  ...(newParam !== 'detune' && route.transform
                    ? { transform: undefined }
                    : {}),
                });
              }}
            />
            <Dropdown
              value={effectiveParam}
              options={paramOptions}
              onChange={(v) =>
                onUpdate(route.id, {
                  target: {
                    ...route.target,
                    param: v as typeof route.target.param,
                  },
                  ...(v !== 'detune' && route.transform
                    ? { transform: undefined }
                    : {}),
                })
              }
            />
          </div>
        </div>

        <div className={styles.row}>
          <Knob
            label="AMT"
            value={route.amount}
            min={-1}
            max={1}
            defaultValue={0.5}
            accent="#7ecfcf"
            size={28}
            formatValue={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(route.id, { amount: v })}
          />
          <SegmentedControl
            value={route.polarity}
            options={POLARITY_OPTIONS}
            accent="#7ecfcf"
            onChange={(v) =>
              onUpdate(route.id, { polarity: v as ModRoute['polarity'] })
            }
          />
          <Dropdown
            value={route.curve ?? 'linear'}
            options={CURVE_OPTIONS}
            onChange={(v) =>
              onUpdate(route.id, { curve: v as ModRoute['curve'] })
            }
          />
          {isPitchTarget && (
            <Toggle
              value={scaleQuantized}
              label="SCALE"
              accent="#8fd694"
              onChange={(v) =>
                onUpdate(route.id, {
                  transform: v ? SCALE_PITCH_TRANSFORM_ID : undefined,
                })
              }
            />
          )}
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(route.id)}
          >
            ×
          </button>
        </div>
      </div>
    );
  },
);
