import { useCallback, useEffect, useRef, useState } from 'react';
import { MODE_DISPLAY, NOTES } from '@prism/engine';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';

// ── The song's key, in words and in a popover (2.5, B4a) ───────────────────
//
// The bottom rail's Key button and the chord lane's key chip both open the
// circle of fifths. The key lock behaves as the old Key popover's did:
// opening frees the key so it can change, and closing locks a chosen key
// again, so Prism and key detection leave it alone.

/** 'major', 'minor', or the mode's own name ('Dorian'). */
export function modeWord(mode: string): string {
  if (mode === 'ionian') return 'major';
  if (mode === 'aeolian') return 'minor';
  return MODE_DISPLAY[mode] ?? mode;
}

/** 'C major', 'F♯ Dorian', or 'No key'; `short` leaves the mode out. */
export function keyText(
  s: { rootNote: number | null; mode: string },
  short = false,
): string {
  if (s.rootNote === null) return 'No key';
  const root = displayAccidentals(NOTES[s.rootNote]);
  return short ? root : `${root} ${modeWord(s.mode)}`;
}

/**
 * A key popover's open state, with the key lock: opening frees the key so
 * the circle can change it, closing locks a chosen one again. A lesson step
 * done in it closes it, so it never sits over the next step's card.
 */
export function useKeyPopover(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const onOpenChange = useCallback((next: boolean) => {
    const s = useStore.getState();
    if (next && s.rootLocked) s.toggleRootLock();
    if (!next && s.rootNote !== null && !s.rootLocked) s.toggleRootLock();
    setOpen(next);
  }, []);

  const step = useStore((s) =>
    s.activeTutorialId === null ? null : s.tutorialStepIndex,
  );
  const lastStep = useRef(step);
  useEffect(() => {
    if (step !== lastStep.current && step !== null && open) {
      onOpenChange(false);
    }
    lastStep.current = step;
  }, [step, open, onOpenChange]);

  return [open, onOpenChange];
}
