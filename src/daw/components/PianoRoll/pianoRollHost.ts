import { createContext, useContext } from 'react';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { LoopState } from '@/daw/store/transportSlice';

/**
 * What a piano roll mounted outside the Studio uses in place of the Studio
 * store: key, meter, playhead and loop come from the host, and the ruler's
 * seek and loop edits go back to it. The back office's Parts editor is one.
 *
 * Without a host (the Studio) the roll reads and writes the store as before.
 */
export interface PianoRollHost {
  /** Tonic as a MIDI note or pitch class — only `% 12` is used. */
  rootNote: number;
  mode: string;
  beatsPerBar: number;
  chordRegions?: ChordRegion[];
  /** Playhead in the same ticks as the roll's timeline. */
  position: number;
  loop: LoopState;
  setLoop: (patch: Partial<LoopState>) => void;
  seek: (tick: number) => void;
}

export const PianoRollHostContext = createContext<PianoRollHost | null>(null);

export const usePianoRollHost = () => useContext(PianoRollHostContext);
