import React, { useCallback } from 'react';
import { PianoKey, type PlayedKey } from './PianoKey';

export type { PlayedKey } from './PianoKey';
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
  // ── For lessons (the Studio's dock uses none of these) ──
  /** Notes lit, each in its own colour (a demo, the step's notes). */
  litNotes?: ReadonlyMap<number, string>;
  /** Notes tinted in a colour: what the lesson asks for next. */
  hintNotes?: ReadonlyMap<number, string>;
  /** Keys the player is holding, right or wrong. */
  playedNotes?: ReadonlyMap<number, PlayedKey>;
  /** A key pressed, with its pointer event (for keys that sound until let
   *  go); called along with onNoteOn. */
  onKeyPointerDown?: (note: number, event: React.PointerEvent) => void;
  /** False: a picture of the keys, not played by pointer. */
  interactive?: boolean;
  /** Keys that shrink with a small box (no minimum width). */
  compact?: boolean;
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
// piano's are: C# and F# a little left, D# and A# a little right. Exported:
// a lesson's falling notes and hands line up with the keys by them.
export const BLACK_KEY_WIDTH = 0.6;
export const BLACK_KEY_NUDGE: Record<number, number> = {
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
  litNotes,
  hintNotes,
  playedNotes,
  onKeyPointerDown,
  interactive = true,
  compact = false,
}) => {
  const handleNoteOn = useCallback(
    (note: number, event: React.PointerEvent) => {
      onKeyPointerDown?.(note, event);
      onNoteOn(note, 0.8);
    },
    [onNoteOn, onKeyPointerDown],
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
    <div
      // The keys' box, which a lesson's hands are drawn over (FingeringHands).
      data-piano-keys
      className={
        compact ? `${styles.keyboard} ${styles.compact}` : styles.keyboard
      }
    >
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
          litColor={litNotes?.get(note)}
          hintColor={hintNotes?.get(note)}
          played={playedNotes?.get(note)}
          interactive={interactive}
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
              litColor={litNotes?.get(note)}
              hintColor={hintNotes?.get(note)}
              played={playedNotes?.get(note)}
              interactive={interactive}
            />
          </div>
        );
      })}
    </div>
  );
};
