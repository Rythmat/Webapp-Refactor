import React, { useCallback } from 'react';
import { PianoKey } from './PianoKey';
import styles from './PianoKeyboard.module.css';

interface PianoKeyboardProps {
  startNote?: number; // MIDI note of first key (default C2=36)
  endNote?: number; // MIDI note of last key (default C6=96)
  activeNotes: Set<number>;
  activeColor?: string; // hex color for active keys (default: cyan from CSS)
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  /** The computer key that plays a note, shown on its key (Soundtrap's). */
  keyLabel?: (note: number) => string | null;
  /** Name every C ('C3', 'C4') on its key. */
  octaveLabels?: boolean;
}

// Semitone pattern: which notes in an octave are black keys
const BLACK_KEY_PATTERN = [
  false,
  true,
  false,
  true,
  false,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
];

// A black key is this much of a white key's width (Soundtrap's, 2026-10-22;
// it was 0.39), centred on the line between its two white keys, nudged as a
// piano's are: C# and F# a little left, D# and A# a little right.
const BLACK_KEY_WIDTH = 0.6;
const BLACK_KEY_NUDGE: Record<number, number> = {
  1: -0.08, // C#
  3: 0.08, // D#
  6: -0.1, // F#
  8: 0, // G#
  10: 0.1, // A#
};

function isBlackKey(note: number): boolean {
  return BLACK_KEY_PATTERN[note % 12];
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  startNote = 36,
  endNote = 96,
  activeNotes,
  activeColor,
  onNoteOn,
  onNoteOff,
  keyLabel,
  octaveLabels = false,
}) => {
  const handleNoteOn = useCallback(
    (note: number) => {
      onNoteOn(note, 0.8);
    },
    [onNoteOn],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      onNoteOff(note);
    },
    [onNoteOff],
  );

  // Collect white and black keys
  const whiteKeys: number[] = [];
  const blackKeys: { note: number; whiteKeyIndex: number }[] = [];

  for (let note = startNote; note <= endNote; note++) {
    if (!isBlackKey(note)) {
      whiteKeys.push(note);
    }
  }

  for (let note = startNote; note <= endNote; note++) {
    if (isBlackKey(note)) {
      // Find the white key to the left
      const prevWhite = whiteKeys.findIndex((w) => w > note) - 1;
      if (prevWhite >= 0) {
        blackKeys.push({ note, whiteKeyIndex: prevWhite });
      }
    }
  }

  const whiteKeyWidth = 100 / whiteKeys.length;

  return (
    <div className={styles.keyboard}>
      {/* White keys */}
      {whiteKeys.map((note) => (
        <PianoKey
          key={note}
          note={note}
          isBlack={false}
          isActive={activeNotes.has(note)}
          activeColor={activeColor}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          label={keyLabel?.(note)}
          octaveName={
            octaveLabels && note % 12 === 0
              ? `C${Math.floor(note / 12) - 1}`
              : null
          }
        />
      ))}

      {/* Black keys positioned absolutely */}
      {blackKeys.map(({ note, whiteKeyIndex }) => {
        const semitone = note % 12;
        const nudge = BLACK_KEY_NUDGE[semitone] ?? 0;
        const left =
          (whiteKeyIndex + 1 - BLACK_KEY_WIDTH / 2 + nudge) * whiteKeyWidth;

        return (
          <div
            key={note}
            className={styles.blackKeyContainer}
            style={{
              left: `${left}%`,
              width: `${whiteKeyWidth * BLACK_KEY_WIDTH}%`,
            }}
          >
            <PianoKey
              note={note}
              isBlack={true}
              isActive={activeNotes.has(note)}
              activeColor={activeColor}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              label={keyLabel?.(note)}
            />
          </div>
        );
      })}
    </div>
  );
};
