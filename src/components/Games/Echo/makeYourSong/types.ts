import type React from 'react';
import type { LiteracyTonic } from '@/content/musicLiteracy/schemas';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';

// ── The seam between Echo's play screens and Make Your Song ────────────────
// After the gate, the play screens render MakeYourSong (MakeYourSong.tsx)
// with these props. The input it records takes on is the play screens'
// own (input/EchoInputSurface.tsx), handed over as `renderInput`.

export interface MakeYourSongProps {
  level: EchoLevelNumber;
  keyChoice: { tonic: LiteracyTonic; mode: 'major' | 'minor' };
  input: 'pads' | 'keyboard';
  scaffolding: { autoTune: boolean; rootsOnly: boolean; autoFill: boolean };
  /** The pads and keyboard input, for recording takes (your input layer). */
  renderInput: (handlers: EchoInputHandlers) => React.ReactNode;
  /** Called once, when the student finishes their song (the victory shows). */
  onSongFinished: () => void;
  onPlayAgain: () => void;
  onNextLevel: (() => void) | null; // null at Level 3
  onExit: () => void;
}

export interface EchoInputHandlers {
  kind: 'melody' | 'chords';
  noteOn: (midi: number, velocity?: number) => void;
  noteOff: (midi: number) => void;
}
