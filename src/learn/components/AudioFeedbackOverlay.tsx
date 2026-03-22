// ── AudioFeedbackOverlay ──────────────────────────────────────────────────
// Real-time visual feedback layer for acoustic piano input.
//
// Shows:
//   - Detected note name + octave above piano keyboard
//   - Confidence indicator (opacity proportional to detection confidence)
//   - Onset flash (brief highlight when a new note attack is detected)
//   - Pulsing microphone icon when listening
//
// This component sits as an overlay within activity containers and
// responds to the LearnInput context.

import { Mic } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────

interface AudioFeedbackOverlayProps {
  /** Currently active MIDI note numbers. */
  activeNotes: number[];
  /** Audio input RMS level (0–1). */
  inputLevel: number;
  /** Whether audio input is currently listening. */
  isListening: boolean;
  /** Onset flash counter. Increment to trigger a flash animation. */
  onsetFlash?: number;
  /** Detection confidence (0–1). Controls note display opacity. */
  confidence?: number;
  /** Position: 'top' renders above content, 'inline' renders inline. */
  position?: 'top' | 'inline';
}

// ── Helpers ──────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function midiToNoteName(midi: number): string {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${octave}`;
}

function midiToNoteDisplay(midi: number): { name: string; octave: number } {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NOTE_NAMES[pc], octave };
}

// ── Component ────────────────────────────────────────────────────────────

export const AudioFeedbackOverlay = memo(function AudioFeedbackOverlay({
  activeNotes,
  inputLevel,
  isListening,
  onsetFlash = 0,
  confidence = 1,
  position = 'top',
}: AudioFeedbackOverlayProps) {
  const [flashVisible, setFlashVisible] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle onset flash animation (triggered by incrementing onsetFlash counter)
  useEffect(() => {
    if (onsetFlash === 0) return;
    setFlashVisible(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashVisible(false), 150);
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [onsetFlash]);

  // Build note display string
  const noteDisplay =
    activeNotes.length > 0
      ? activeNotes
          .slice(0, 4) // limit to 4 notes
          .map(midiToNoteName)
          .join(' · ')
      : null;

  // Primary note for large display
  const primaryNote =
    activeNotes.length > 0 ? midiToNoteDisplay(activeNotes[0]) : null;

  const containerStyle: React.CSSProperties =
    position === 'top'
      ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '6px 12px',
          minHeight: 32,
        }
      : {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        };

  if (!isListening) return null;

  return (
    <div style={containerStyle}>
      {/* Onset flash overlay */}
      {flashVisible && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(96, 165, 250, 0.08)',
            borderRadius: 8,
            pointerEvents: 'none',
            transition: 'opacity 150ms ease-out',
          }}
        />
      )}

      {/* Pulsing mic icon */}
      <Mic
        size={14}
        strokeWidth={2}
        style={{
          color: '#4ade80',
          opacity: 0.5 + inputLevel * 0.5,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Detected note display */}
      {primaryNote ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
            opacity: Math.max(0.3, confidence),
            transition: 'opacity 100ms ease',
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#60a5fa',
              fontFamily: 'monospace',
            }}
          >
            {primaryNote.name}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(96, 165, 250, 0.7)',
              fontFamily: 'monospace',
            }}
          >
            {primaryNote.octave}
          </span>
        </div>
      ) : (
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.3)',
            fontStyle: 'italic',
          }}
        >
          Listening…
        </span>
      )}

      {/* Multi-note display */}
      {activeNotes.length > 1 && (
        <span
          style={{
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: 'monospace',
          }}
        >
          {noteDisplay}
        </span>
      )}

      {/* Confidence bar */}
      {primaryNote && (
        <div
          style={{
            width: 40,
            height: 3,
            borderRadius: 1.5,
            background: 'rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${confidence * 100}%`,
              height: '100%',
              borderRadius: 1.5,
              background:
                confidence > 0.7
                  ? '#4ade80'
                  : confidence > 0.4
                    ? '#facc15'
                    : '#f87171',
              transition: 'width 80ms linear',
            }}
          />
        </div>
      )}
    </div>
  );
});
