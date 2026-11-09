import type { ReactNode } from 'react';
import type { LiteracyTonic } from '@/content/musicLiteracy/schemas';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';
export interface EchoInputHandlers {
  kind: 'melody' | 'chords';
  noteOn: (midi: number, velocity?: number) => void;
  noteOff: (midi: number) => void;
}
export interface MakeYourSongProps {
  level: EchoLevelNumber;
  keyChoice: { tonic: LiteracyTonic; mode: 'major' | 'minor' };
  input: 'pads' | 'keyboard';
  scaffolding: { autoTune: boolean; rootsOnly: boolean; autoFill: boolean };
  /** The pads and keyboard input, for recording takes (the play screens' input layer). */
  renderInput: (handlers: EchoInputHandlers) => ReactNode;
  /** Called once, when the student finishes their song (the victory shows). */
  onSongFinished: () => void;
  onPlayAgain: () => void;
  onNextLevel: (() => void) | null;
  onExit: () => void;
}
