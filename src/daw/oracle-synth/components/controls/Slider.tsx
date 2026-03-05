import React, { useRef, useCallback } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  label?: string;
  accent?: string;
  height?: number;
  onChange: (value: number) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export const Slider: React.FC<SliderProps> = React.memo(
  ({ value, min, max, label, accent = '#7ecfcf', height = 80, onChange }) => {
    const trackRef = useRef<HTMLDivElement>(null);

    const normalized = (value - min) / (max - min);
    const fillHeight = normalized * 100;

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateFromPointer(e.clientY);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [min, max, onChange],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (e.buttons === 0) return;
        updateFromPointer(e.clientY);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [min, max, onChange],
    );

    const updateFromPointer = (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const normalized = 1 - (clientY - rect.top) / rect.height;
      const newValue = clamp(min + normalized * (max - min), min, max);
      onChange(newValue);
    };

    return (
      <div className={styles.container}>
        {label && <span className={styles.label}>{label}</span>}
        <div
          ref={trackRef}
          className={styles.track}
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <div
            className={styles.fill}
            style={{ height: `${fillHeight}%`, background: accent }}
          />
          <div className={styles.thumb} style={{ bottom: `${fillHeight}%` }} />
        </div>
      </div>
    );
  },
);
