import React from 'react';
import styles from './Dropdown.module.css';

interface DropdownProps {
  value: string;
  options: { value: string; label: string }[];
  label?: string;
  onChange: (value: string) => void;
}

export const Dropdown: React.FC<DropdownProps> = React.memo(
  ({ value, options, label, onChange }) => {
    return (
      <div className={styles.container}>
        {label && <span className={styles.label}>{label}</span>}
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);
