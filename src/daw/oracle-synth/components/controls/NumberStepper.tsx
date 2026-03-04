import React from 'react';
import styles from './NumberStepper.module.css';

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label?: string;
  onChange: (value: number) => void;
}

export const NumberStepper: React.FC<NumberStepperProps> = React.memo(
  ({ value, min, max, step = 1, label, onChange }) => {
    return (
      <div className={styles.container}>
        {label && <span className={styles.label}>{label}</span>}
        <div className={styles.stepper}>
          <button
            className={styles.btn}
            onClick={() => onChange(Math.max(min, value - step))}
          >
            -
          </button>
          <span className={styles.value}>{value}</span>
          <button
            className={styles.btn}
            onClick={() => onChange(Math.min(max, value + step))}
          >
            +
          </button>
        </div>
      </div>
    );
  }
);
