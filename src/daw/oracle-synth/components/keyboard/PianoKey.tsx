import React from 'react';
import styles from './PianoKey.module.css';

function adjustHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`;
}

interface PianoKeyProps {
  note: number;
  isBlack: boolean;
  isActive: boolean;
  activeColor?: string;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = React.memo(
  ({ note, isBlack, isActive, activeColor, onNoteOn, onNoteOff }) => {
    const className = isBlack ? styles.blackKey : styles.whiteKey;
    const activeClass = isActive ? styles.active : '';

    const activeStyle = isActive && activeColor
      ? {
          background: isBlack
            ? `linear-gradient(to bottom, ${adjustHex(activeColor, -40)}, ${adjustHex(activeColor, -80)})`
            : `linear-gradient(to bottom, ${activeColor}, ${adjustHex(activeColor, 50)})`,
        }
      : undefined;

    return (
      <div
        className={`${className} ${activeClass}`}
        style={activeStyle}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onNoteOn(note);
        }}
        onPointerUp={() => onNoteOff(note)}
        onPointerLeave={() => {
          if (isActive) onNoteOff(note);
        }}
      />
    );
  }
);
