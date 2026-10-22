// ── A player's Major Arcanum progress, on their account ─────────────────────
// Saved with the arcade's game options (PATCH /api/game-options/majorArcanum,
// `{ progress }`), as Foli's key bindings are, so it follows the player to
// any device (Peter: "Player's account, absolutely, always").
//
// A cleared part shows at once: the progress here is the server's merged
// with what this visit has cleared, so a slow or failed save never takes a
// cleared part back. A failed save is tried again with the next one, and
// `saveFailed` says so meanwhile.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  EMPTY_PROGRESS,
  readProgress,
  withCleared,
  type ArcanumProgress,
  type ArcanumTask,
} from '@/curriculum/engine/majorArcanum/progress';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';

export const ARCANUM_GAME_ID = 'majorArcanum';

function merged(a: ArcanumProgress, b: ArcanumProgress): ArcanumProgress {
  return {
    version: 1,
    cleared: [...new Set([...a.cleared, ...b.cleared])],
  };
}

export function useArcanumProgress(): {
  progress: ArcanumProgress;
  loading: boolean;
  saveFailed: boolean;
  clear: (task: ArcanumTask) => ArcanumProgress;
} {
  const { data, isLoading } = useGameOptions<{ progress?: unknown }>(
    ARCANUM_GAME_ID,
  );
  const { mutate } = useSaveGameOptions(ARCANUM_GAME_ID);
  const [local, setLocal] = useState<ArcanumProgress>(EMPTY_PROGRESS);
  const [saveFailed, setSaveFailed] = useState(false);
  const progress = useMemo(
    () => merged(readProgress(data?.progress), local),
    [data, local],
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const clear = useCallback(
    (task: ArcanumTask) => {
      const next = withCleared(progressRef.current, task);
      progressRef.current = next;
      setLocal((was) => merged(was, next));
      mutate(
        { progress: next },
        {
          onSuccess: () => setSaveFailed(false),
          onError: () => setSaveFailed(true),
        },
      );
      return next;
    },
    [mutate],
  );

  return { progress, loading: isLoading, saveFailed, clear };
}
