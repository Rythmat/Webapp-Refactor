import React, { useRef, useCallback } from 'react';
import styles from './WheelControl.module.css';

interface WheelControlProps {
  value: number; // 0..1 for mod, -1..1 for pitch
  min?: number;
  max?: number;
  label?: string;
  springBack?: boolean; // true for pitch wheel (returns to center on release)
  accent?: string;
  onChange: (value: number) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export const WheelControl: React.FC<WheelControlProps> = React.memo(
  ({
    value,
    min = 0,
    max = 1,
    label,
    springBack = false,
    accent = '#7ecfcf',
    onChange,
  }) => {
    const wheelRef = useRef<HTMLDivElement>(null);

    const normalized = (value - min) / (max - min);
    const indicatorTop = (1 - normalized) * 100;

    const updateFromPointer = useCallback(
      (clientY: number) => {
        if (!wheelRef.current) return;
        const rect = wheelRef.current.getBoundingClientRect();
        const norm = 1 - (clientY - rect.top) / rect.height;
        const newValue = clamp(min + clamp(norm, 0, 1) * (max - min), min, max);
        onChange(newValue);
      },
      [min, max, onChange],
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateFromPointer(e.clientY);
      },
      [updateFromPointer],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (e.buttons === 0) return;
        updateFromPointer(e.clientY);
      },
      [updateFromPointer],
    );

    const handlePointerUp = useCallback(() => {
      if (springBack) {
        const center = (min + max) / 2;
        onChange(center);
      }
    }, [springBack, min, max, onChange]);

    return (
      <div className={styles.container}>
        {label && <span className={styles.label}>{label}</span>}
        <div
          ref={wheelRef}
          className={styles.wheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className={styles.ridges} />
          {springBack && <div className={styles.centerLine} />}
          <div
            className={styles.indicator}
            style={{
              top: `calc(${indicatorTop}% - 2px)`,
              background: accent,
            }}
          />
        </div>
      </div>
    );
  },
);
