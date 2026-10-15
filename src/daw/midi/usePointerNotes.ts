import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import {
  captureLiveNoteOff,
  captureLiveNoteOn,
  playLiveNote,
  releaseLiveNote,
} from './liveNotes';

// ── usePointerNotes (milestone 1.15) ───────────────────────────────────────
//
// On-screen keys as an instrument. A press takes the live-notes path, as a
// MIDI keyboard's and the computer keyboard's notes do: it sounds on the
// student's track (on the practice screen, its track; liveTarget.ts),
// lights the key and goes into a take (practice-tutorial-04). Letting go
// ends the note wherever the pointer is by then, and so do the window losing
// focus, the page hiding and the keys unmounting, so no note is left
// hanging in a take or a synth. Mouse and keyboard only (decision 1): one
// note per pointer, the main button.

/** How hard a click plays (0–127): a firm press, like a MIDI keyboard's mf–f. */
export const POINTER_VELOCITY = 100;

/** The key-press handler for `onKeyPointerDown`. */
export function usePointerNotes(): (
  note: number,
  event: PointerEvent<Element>,
) => void {
  /** Notes sounding now, by the pointer that started them. */
  const held = useRef(new Map<number, number>());

  const release = useCallback((pointerId: number, timestamp: number) => {
    const note = held.current.get(pointerId);
    if (note === undefined) return;
    held.current.delete(pointerId);
    releaseLiveNote(note);
    captureLiveNoteOff(note, timestamp);
  }, []);

  useEffect(() => {
    const notes = held.current;
    const releaseAll = () => {
      const now = performance.now();
      for (const pointerId of [...notes.keys()]) release(pointerId, now);
    };
    const onUp = (e: globalThis.PointerEvent) =>
      release(e.pointerId, e.timeStamp);
    const onHidden = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onHidden);
      releaseAll();
    };
  }, [release]);

  return useCallback(
    (note: number, event: PointerEvent<Element>) => {
      if (event.button !== 0) return;
      // No text selection or focus move from pressing a key.
      event.preventDefault();
      release(event.pointerId, event.timeStamp);
      held.current.set(event.pointerId, note);
      playLiveNote(note, POINTER_VELOCITY);
      captureLiveNoteOn(note, POINTER_VELOCITY, event.timeStamp);
    },
    [release],
  );
}
