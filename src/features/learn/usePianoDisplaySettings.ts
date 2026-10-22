import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * What Learn's piano shows of fingering. Each is null until the student
 * chooses: then the lesson decides (hands on in Piano Fundamentals, numbers
 * on where a step writes them), and once they choose, their choice wins
 * everywhere.
 */
interface PianoDisplaySettings {
  /** The book's hands over the keys. */
  showHands: boolean | null;
  /** Method-book finger numbers on the fingertips and over the notes. */
  showFingerNumbers: boolean | null;
  setShowHands: (on: boolean) => void;
  setShowFingerNumbers: (on: boolean) => void;
}

export const usePianoDisplaySettings = create<PianoDisplaySettings>()(
  persist(
    (set) => ({
      showHands: null,
      showFingerNumbers: null,
      setShowHands: (on) => set({ showHands: on }),
      setShowFingerNumbers: (on) => set({ showFingerNumbers: on }),
    }),
    { name: 'music-atlas-piano-display', version: 1 },
  ),
);

/** What a lesson shows: the student's choice, else the lesson's own default. */
export function useFingeringDisplay(
  defaults: { hands?: boolean; numbers?: boolean } = {},
) {
  const showHands = usePianoDisplaySettings((s) => s.showHands);
  const showFingerNumbers = usePianoDisplaySettings((s) => s.showFingerNumbers);
  return {
    hands: showHands ?? defaults.hands ?? false,
    numbers: showFingerNumbers ?? defaults.numbers ?? false,
  };
}
