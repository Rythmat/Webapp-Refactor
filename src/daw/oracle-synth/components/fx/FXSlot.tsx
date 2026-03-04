import React, { useMemo } from 'react';
import type { FXRoute, FXType, FXParams } from '../../audio/types';
import { Dropdown } from '../controls/Dropdown';
import { Knob } from '../controls/Knob';
import { Toggle } from '../controls/Toggle';
import styles from './FXSlot.module.css';

interface FXSlotProps {
  route: FXRoute;
  fx: FXParams;
  usedTypes: Set<FXType>;
  onUpdate: (id: string, updates: Partial<FXRoute>) => void;
  onRemove: (id: string) => void;
  onParamChange: (type: FXType, key: string, value: number | boolean) => void;
}

const FX_TYPE_OPTIONS: { value: FXType; label: string }[] = [
  { value: 'drive', label: 'DRIVE' },
  { value: 'chorus', label: 'CHORUS' },
  { value: 'phaser', label: 'PHASER' },
  { value: 'delay', label: 'DELAY' },
  { value: 'compressor', label: 'COMP' },
];

const TARGET_OPTIONS = [
  { value: 'master', label: 'MASTER' },
  { value: 'osc1', label: 'OSC 1' },
  { value: 'osc2', label: 'OSC 2' },
  { value: 'flt1', label: 'FILTER 1' },
  { value: 'flt2', label: 'FILTER 2' },
];

const ACCENT = '#7885cb';

export const FXSlot: React.FC<FXSlotProps> = React.memo(
  ({ route, fx, usedTypes, onUpdate, onRemove, onParamChange }) => {
    // Only show current type + unused types in the dropdown
    const typeOptions = useMemo(
      () =>
        FX_TYPE_OPTIONS.filter(
          (o) => o.value === route.type || !usedTypes.has(o.value)
        ),
      [route.type, usedTypes]
    );

    const enabled = fx[route.type].enabled;
    const params = fx[route.type];

    return (
      <div className={styles.slot}>
        <div className={styles.row}>
          <Toggle
            value={enabled}
            onChange={(v) => onParamChange(route.type, 'enabled', v)}
          />
          <Dropdown
            value={route.type}
            options={typeOptions}
            onChange={(v) => onUpdate(route.id, { type: v as FXType })}
          />
          <span className={styles.arrow}>→</span>
          <Dropdown
            value={route.target}
            options={TARGET_OPTIONS}
            onChange={(v) => onUpdate(route.id, { target: v })}
          />
        </div>

        {route.type === 'drive' && (
          <div className={styles.row}>
            <Knob
              label="AMOUNT"
              value={(params as typeof fx.drive).amount}
              min={0}
              max={1}
              defaultValue={0.3}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'amount', v)}
            />
            <Knob
              label="MIX"
              value={(params as typeof fx.drive).mix}
              min={0}
              max={1}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'mix', v)}
            />
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(route.id)}
            >
              ×
            </button>
          </div>
        )}

        {route.type === 'chorus' && (
          <div className={styles.row}>
            <Knob
              label="RATE"
              value={(params as typeof fx.chorus).rate}
              min={0.1}
              max={10}
              defaultValue={1.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${v.toFixed(1)}Hz`}
              onChange={(v) => onParamChange(route.type, 'rate', v)}
            />
            <Knob
              label="DEPTH"
              value={(params as typeof fx.chorus).depth}
              min={0}
              max={1}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'depth', v)}
            />
            <Knob
              label="MIX"
              value={(params as typeof fx.chorus).mix}
              min={0}
              max={1}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'mix', v)}
            />
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(route.id)}
            >
              ×
            </button>
          </div>
        )}

        {route.type === 'phaser' && (
          <div className={styles.row}>
            <Knob
              label="RATE"
              value={(params as typeof fx.phaser).rate}
              min={0.1}
              max={10}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${v.toFixed(1)}Hz`}
              onChange={(v) => onParamChange(route.type, 'rate', v)}
            />
            <Knob
              label="DEPTH"
              value={(params as typeof fx.phaser).depth}
              min={0}
              max={1}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'depth', v)}
            />
            <Knob
              label="MIX"
              value={(params as typeof fx.phaser).mix}
              min={0}
              max={1}
              defaultValue={0.5}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'mix', v)}
            />
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(route.id)}
            >
              ×
            </button>
          </div>
        )}

        {route.type === 'delay' && (
          <div className={styles.row}>
            <Knob
              label="TIME"
              value={(params as typeof fx.delay).time}
              min={0.01}
              max={2}
              defaultValue={0.3}
              accent={ACCENT}
              size={26}
              formatValue={(v) =>
                v >= 1 ? `${v.toFixed(1)}s` : `${Math.round(v * 1000)}ms`
              }
              onChange={(v) => onParamChange(route.type, 'time', v)}
            />
            <Knob
              label="FEEDBACK"
              value={(params as typeof fx.delay).feedback}
              min={0}
              max={0.95}
              defaultValue={0.3}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'feedback', v)}
            />
            <Knob
              label="MIX"
              value={(params as typeof fx.delay).mix}
              min={0}
              max={1}
              defaultValue={0.3}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onParamChange(route.type, 'mix', v)}
            />
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(route.id)}
            >
              ×
            </button>
          </div>
        )}

        {route.type === 'compressor' && (
          <div className={styles.row}>
            <Knob
              label="THRESH"
              value={(params as typeof fx.compressor).threshold}
              min={-60}
              max={0}
              defaultValue={-24}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v)}dB`}
              onChange={(v) => onParamChange(route.type, 'threshold', v)}
            />
            <Knob
              label="RATIO"
              value={(params as typeof fx.compressor).ratio}
              min={1}
              max={20}
              defaultValue={4}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${v.toFixed(1)}:1`}
              onChange={(v) => onParamChange(route.type, 'ratio', v)}
            />
            <Knob
              label="ATTACK"
              value={(params as typeof fx.compressor).attack}
              min={0}
              max={1}
              defaultValue={0.003}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 1000)}ms`}
              onChange={(v) => onParamChange(route.type, 'attack', v)}
            />
            <Knob
              label="RELEASE"
              value={(params as typeof fx.compressor).release}
              min={0}
              max={1}
              defaultValue={0.25}
              accent={ACCENT}
              size={26}
              formatValue={(v) => `${Math.round(v * 1000)}ms`}
              onChange={(v) => onParamChange(route.type, 'release', v)}
            />
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(route.id)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  }
);
