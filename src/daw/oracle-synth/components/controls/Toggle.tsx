import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  value: boolean;
  label?: string;
  accent?: string;
  onChange: (value: boolean) => void;
}

function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.25)}, ${Math.round(g * 0.25)}, ${Math.round(b * 0.25)})`;
}

export const Toggle: React.FC<ToggleProps> = React.memo(
  ({ value, label, accent, onChange }) => {
    const trackStyle = value && accent ? { background: darkenColor(accent) } : undefined;
    const thumbStyle = value && accent ? { background: accent } : undefined;

    return (
      <div className={styles.container} onClick={() => onChange(!value)}>
        <div className={`${styles.track} ${value ? styles.active : ''}`} style={trackStyle}>
          <div className={styles.thumb} style={thumbStyle} />
        </div>
        {label && <span className={styles.label}>{label}</span>}
      </div>
    );
  }
);
