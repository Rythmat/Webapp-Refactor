import { useEffect, useState } from 'react';

/** An activity's steps, as the teacher's control and the room see them. */
export interface ActivityOutline {
  total: number;
  /** Each step's short name ("One track at a time"). */
  titles: string[];
}

const TUTORIAL = 'studio:tutorial:';

/**
 * The steps of the activity the class does together, so the teacher's
 * control and the projector can say "Step 3 of 14 · One track at a time"
 * without a tab of the activity open. A Studio tutorial's steps load on
 * demand (its definitions are a chunk of their own); other activities have
 * none here, and the count comes from the teacher leading from inside them.
 */
export const useActivityOutline = (
  ref: string | undefined,
): ActivityOutline | null => {
  const [outline, setOutline] = useState<ActivityOutline | null>(null);
  useEffect(() => {
    setOutline(null);
    if (!ref?.startsWith(TUTORIAL)) return;
    let alive = true;
    import('@/daw/components/Tutorial/tutorials')
      .then(({ getTutorial }) => {
        const tutorial = getTutorial(ref.slice(TUTORIAL.length));
        if (!alive || !tutorial) return;
        setOutline({
          total: tutorial.steps.length,
          titles: tutorial.steps.map((s) => s.stage),
        });
      })
      .catch(() => {
        // Offline chunk: the count arrives when the teacher leads instead.
      });
    return () => {
      alive = false;
    };
  }, [ref]);
  return outline;
};
