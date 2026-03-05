import React from 'react';
import styles from './SegmentedControl.module.css';

interface SegmentedControlProps {
  value: string;
  options: { value: string; label: string }[];
  label?: string;
  accent?: string;
  onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = React.memo(
  ({ value, options, label, accent, onChange }) => {
    return (
      <div className={styles.container}>
        {label && <span className={styles.label}>{label}</span>}
        <div className={styles.segments}>
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.segment} ${opt.value === value ? styles.active : ''}`}
              style={
                opt.value === value && accent ? { color: accent } : undefined
              }
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
