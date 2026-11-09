import { useCallback, useState } from 'react';
import {
  choicesStorageKey,
  emptyChoices,
  parseChoices,
  type LiteracyChoices,
} from '@/curriculum/engine/musicLiteracy/choices';

// ── What the student chose ─────────────────────────────────────────────────
// Part 2's key, mode and saved chord progressions (engine/musicLiteracy/
// choices.ts), kept on this device beside the lesson's progress, under
// `choicesStorageKey`. Like progress, it is to move to the student's
// account; until then a new device starts with nothing chosen.

/** The lesson's saved choices on this device (nothing chosen: empty). */
export function readLiteracyChoices(lessonId: string): LiteracyChoices {
  try {
    const stored = localStorage.getItem(choicesStorageKey(lessonId));
    if (stored) return parseChoices(JSON.parse(stored));
  } catch {
    // Private browsing or corrupted data: start fresh.
  }
  return emptyChoices();
}

export function useLiteracyChoices(lessonId: string) {
  const [choices, setChoices] = useState<LiteracyChoices>(() =>
    readLiteracyChoices(lessonId),
  );
  const [shownFor, setShownFor] = useState(lessonId);
  if (shownFor !== lessonId) {
    setShownFor(lessonId);
    setChoices(readLiteracyChoices(lessonId));
  }

  /** Change the choices (choices.ts's withTonic, withMode, withProgression). */
  const update = useCallback(
    (change: (before: LiteracyChoices) => LiteracyChoices) => {
      setChoices((before) => {
        const next = change(before);
        try {
          localStorage.setItem(
            choicesStorageKey(lessonId),
            JSON.stringify(next),
          );
        } catch {
          // Storage full or private browsing: the choice lives in memory.
        }
        return next;
      });
    },
    [lessonId],
  );

  return { choices, update };
}
