// ── Hearing a song's chord boxes ───────────────────────────────────────────
// "Hear it" on the Songs page: the box's exact voicing, strummed on the
// lesson guitar voice. The voice loads on the first strum (never on mount),
// and is let go when the last chord box on the page goes away, since the amp
// tone keeps a model running until it is released.

import { useCallback, useEffect } from 'react';
import { startTone } from '@/audio/core/toneBridge';
import {
  loadGuitarVoice,
  releaseGuitarVoice,
  strumGuitarChord,
} from '@/learn/audio/guitar/guitarVoice';
import { shapeNotes } from '@/lib/guitar/fretboard';

let users = 0;
let loaded = false;

/** A strum for a shape string ('X-3-2-0-1-0'); the voice loads on first use. */
export function useSongGuitarHear(): (frets: string) => void {
  useEffect(() => {
    users += 1;
    return () => {
      users -= 1;
      if (users === 0 && loaded) {
        loaded = false;
        releaseGuitarVoice();
      }
    };
  }, []);

  return useCallback((frets: string) => {
    // Inside the click, so the browser lets the audio start.
    void startTone();
    const notes = shapeNotes(frets);
    void loadGuitarVoice().then(() => {
      loaded = true;
      strumGuitarChord(
        notes.map((n) => n.midi),
        1.6,
        90,
        undefined,
        notes.map((n) => n.position),
      );
    });
  }, []);
}
