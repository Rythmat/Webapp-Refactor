import React, { type CSSProperties } from 'react';
import styles from './PianoKey.module.css';

function adjustHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`;
}

/** A key the player is holding (a lesson's): its colour, glossy or flat. */
export type PlayedKey = { color: string; shine: boolean };

interface PianoKeyProps {
  note: number;
  isBlack: boolean;
  isActive: boolean;
  activeColor?: string;
  onNoteOn: (note: number, event: React.PointerEvent) => void;
  onNoteOff: (note: number) => void;
  /** The computer key that plays it ('A', ';'), shown in a badge. */
  label?: string | null;
  /** A C's name ('C4'), shown over its badge. */
  octaveName?: string | null;
  /** Lit in this colour (a lesson's note sounding); any CSS colour. */
  litColor?: string;
  /** Tinted with this colour: a note the lesson asks for next. */
  hintColor?: string;
  /** Held by the player, right (their colour) or wrong (grey). */
  played?: PlayedKey;
  /** False: a picture of the keys, not played by pointer. */
  interactive?: boolean;
}

/** A lesson key lit in `color`, shaded as the dock's pressed keys are. */
function litStyle(color: string, isBlack: boolean): CSSProperties {
  return {
    background: isBlack
      ? `linear-gradient(to bottom, color-mix(in oklab, ${color} 75%, black), color-mix(in oklab, ${color} 55%, black))`
      : `linear-gradient(to bottom, ${color}, color-mix(in oklab, ${color} 70%, white))`,
  };
}

/** Held keys: with shine, lit from the top with a glow in their colour;
 *  without, a flat fill (a wrong key's grey). */
function playedStyle({ color, shine }: PlayedKey, isBlack: boolean) {
  if (!shine) return { backgroundImage: 'none', backgroundColor: color };
  return {
    background: isBlack
      ? `linear-gradient(to bottom, color-mix(in oklab, ${color} 50%, white) 0%, ${color} 40%, color-mix(in oklab, ${color} 70%, black) 100%)`
      : `linear-gradient(to bottom, color-mix(in oklab, ${color} 40%, white) 0%, ${color} 35%, ${color} 80%, color-mix(in oklab, ${color} 65%, white) 100%)`,
    boxShadow: `0 0 14px 3px color-mix(in srgb, ${color} 70%, transparent)`,
    zIndex: isBlack ? 3 : 1,
  } satisfies CSSProperties;
}

function hintStyle(color: string, isBlack: boolean): CSSProperties {
  return {
    background: isBlack
      ? `color-mix(in srgb, ${color} 60%, var(--daw-key-black))`
      : `color-mix(in srgb, ${color} 45%, var(--daw-key-white))`,
  };
}

export const PianoKey: React.FC<PianoKeyProps> = React.memo(
  ({
    note,
    isBlack,
    isActive,
    activeColor,
    onNoteOn,
    onNoteOff,
    label,
    octaveName,
    litColor,
    hintColor,
    played,
    interactive = true,
  }) => {
    const className = isBlack ? styles.blackKey : styles.whiteKey;
    const activeClass = isActive ? styles.active : '';

    // Held, then lit, then the dock's pressed colour, then a hint.
    const style = played
      ? playedStyle(played, isBlack)
      : litColor
        ? litStyle(litColor, isBlack)
        : isActive && activeColor
          ? {
              background: isBlack
                ? `linear-gradient(to bottom, ${adjustHex(activeColor, -40)}, ${adjustHex(activeColor, -80)})`
                : `linear-gradient(to bottom, ${activeColor}, ${adjustHex(activeColor, 50)})`,
            }
          : hintColor
            ? hintStyle(hintColor, isBlack)
            : undefined;

    return (
      <div
        className={`${className} ${activeClass} ${interactive ? '' : styles.still}`}
        style={style}
        data-note={note}
        data-key={isBlack ? 'black' : 'white'}
        data-lit={litColor || played ? '' : undefined}
        data-played={played ? (played.shine ? 'shine' : 'plain') : undefined}
        onPointerDown={
          interactive
            ? (e) => {
                e.preventDefault();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                onNoteOn(note, e);
              }
            : undefined
        }
        onPointerUp={interactive ? () => onNoteOff(note) : undefined}
        onPointerLeave={
          interactive
            ? () => {
                if (isActive) onNoteOff(note);
              }
            : undefined
        }
      >
        {octaveName ? (
          <span className={styles.octave}>{octaveName}</span>
        ) : null}
        {label ? (
          <span className={styles.badge} data-key-label={label}>
            {label}
          </span>
        ) : null}
      </div>
    );
  },
);
