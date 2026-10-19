import { useCallback, useState } from 'react';

// ── Music Literacy progress ────────────────────────────────────────────────
// Each step's best score and whether it has passed, on this device
// (localStorage), keyed by the lesson's id and each step's tag as Genre
// progress is (useGenreProgress): a tag survives the step being edited or
// moved, so progress does too. A best score only ever rises, and a pass is
// never taken back by a weaker try.

export interface LiteracyStepProgress {
  /** Best score, 0–100. */
  best: number;
  passed: boolean;
  attempts: number;
}

export type LiteracyProgress = Readonly<Record<string, LiteracyStepProgress>>;

export const literacyProgressKey = (lessonId: string) =>
  `music_literacy_progress_${lessonId}`;

export function readLiteracyProgress(lessonId: string): LiteracyProgress {
  try {
    const stored = localStorage.getItem(literacyProgressKey(lessonId));
    if (stored) return JSON.parse(stored) as LiteracyProgress;
  } catch {
    // Private browsing or corrupted data: start fresh.
  }
  return {};
}

/** The progress after one graded try of a step. */
export function withTry(
  progress: LiteracyProgress,
  tag: string,
  percent: number,
  passed: boolean,
): LiteracyProgress {
  const before = progress[tag];
  return {
    ...progress,
    [tag]: {
      best: Math.max(before?.best ?? 0, Math.round(percent)),
      passed: (before?.passed ?? false) || passed,
      attempts: (before?.attempts ?? 0) + 1,
    },
  };
}

export function useLiteracyProgress(lessonId: string) {
  const [progress, setProgress] = useState<LiteracyProgress>(() =>
    readLiteracyProgress(lessonId),
  );
  const [shownFor, setShownFor] = useState(lessonId);
  if (shownFor !== lessonId) {
    // Another lesson in the same screen: read its progress instead.
    setShownFor(lessonId);
    setProgress(readLiteracyProgress(lessonId));
  }

  const record = useCallback(
    (tag: string, percent: number, passed: boolean) => {
      setProgress((prev) => {
        const next = withTry(prev, tag, percent, passed);
        try {
          localStorage.setItem(
            literacyProgressKey(lessonId),
            JSON.stringify(next),
          );
        } catch {
          // Storage full or private browsing: progress lives in memory only.
        }
        return next;
      });
    },
    [lessonId],
  );

  return { progress, record };
}
