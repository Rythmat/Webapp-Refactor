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

// Black key offset positions (how far right from the white key, as fraction of white key width)
const BLACK_KEY_OFFSETS: Record<number, number> = {
  1: 0.65, // C#
  3: 0.75, // D#
  6: 0.6, // F#
  8: 0.7, // G#
  10: 0.8, // A#
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
        />
      ))}

      {/* Black keys positioned absolutely */}
      {blackKeys.map(({ note, whiteKeyIndex }) => {
        const semitone = note % 12;
        const offset = BLACK_KEY_OFFSETS[semitone] ?? 0.7;
        const left = (whiteKeyIndex + offset) * whiteKeyWidth;

        return (
          <div
            key={note}
            className={styles.blackKeyContainer}
            style={{
              left: `${left}%`,
              width: `${whiteKeyWidth * 0.65}%`,
            }}
          >
            <PianoKey
              note={note}
              isBlack={true}
              isActive={activeNotes.has(note)}
              activeColor={activeColor}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>
        );
      })}
    </div>
  );
};
