import { useMemo } from 'react';
import { PlaybackEvent } from '@/contexts/PlaybackContext';

export const useRange = (playingNotes: PlaybackEvent[]) => {
  return useMemo(() => {
    // Handle empty array case
    if (playingNotes.length === 0) {
      // Default to middle range C3-C5 when no notes are playing
      return { lowestC: 3, highestC: 5, lowestNote: 36, highestNote: 60 };
    }

    const lowestNote = Math.min(
      ...playingNotes.map((note) =>
        typeof note === 'number' ? note : note.midi,
      ),
    );

    const highestNote = Math.max(
      ...playingNotes.map((note) =>
        typeof note === 'number' ? note : note.midi,
      ),
    );

    let lowestC = Math.floor(lowestNote / 12);
    let highestC = Math.floor(highestNote / 12);

    // Ensure we have at least 3 octave ranges
    const middleC = 4; // C4 is the middle C
    const rangeCount = highestC - lowestC + 1;

    if (rangeCount < 3) {
      // Determine if we're closer to the lower or higher end of the keyboard
      const isAboveMiddle = (lowestC + highestC) / 2 > middleC;

      if (isAboveMiddle) {
        // For higher notes (e.g., C6, C7), add lower octaves
        lowestC = highestC - 2;
      } else {
        // For lower notes (e.g., C2, C3), add higher octaves
        highestC = lowestC + 2;
      }
    }

    return { lowestC, highestC, lowestNote, highestNote };
  }, [playingNotes]);
};
