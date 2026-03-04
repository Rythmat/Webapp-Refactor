import React from 'react';
import { useSynthStore } from '../../store';
import { Toggle } from '../controls/Toggle';
import { Dropdown } from '../controls/Dropdown';
import type { ArpStyle, RateDiv } from '../../audio/types';
import styles from './ArpPanel.module.css';

const RATE_OPTIONS: { value: string; label: string }[] = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/8t', label: '1/8T' },
  { value: '1/16', label: '1/16' },
  { value: '1/16t', label: '1/16T' },
  { value: '1/32', label: '1/32' },
];

const STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'up', label: 'UP' },
  { value: 'down', label: 'DOWN' },
  { value: 'upDown', label: 'UP/DOWN' },
  { value: 'downUp', label: 'DOWN/UP' },
];

const DISTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: '-24', label: '-24' },
  { value: '-12', label: '-12' },
  { value: '12', label: '12' },
  { value: '24', label: '24' },
];

const STEP_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];

export const ArpPanel: React.FC = React.memo(() => {
  const arp = useSynthStore((s) => s.arp);
  const setArpParam = useSynthStore((s) => s.setArpParam);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Toggle
          value={arp.enabled}
          accent="#c785d3"
          onChange={(v) => setArpParam('enabled', v)}
        />
        <span className={styles.title}>ARP</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>RATE</span>
        <Dropdown
          value={arp.rate}
          options={RATE_OPTIONS}
          onChange={(v) => setArpParam('rate', v as RateDiv)}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>STYLE</span>
        <Dropdown
          value={arp.style}
          options={STYLE_OPTIONS}
          onChange={(v) => setArpParam('style', v as ArpStyle)}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>DISTANCE</span>
        <Dropdown
          value={String(arp.distance)}
          options={DISTANCE_OPTIONS}
          onChange={(v) => setArpParam('distance', Number(v))}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>STEP</span>
        <Dropdown
          value={String(arp.step)}
          options={STEP_OPTIONS}
          onChange={(v) => setArpParam('step', Number(v))}
        />
      </div>
    </div>
  );
});
