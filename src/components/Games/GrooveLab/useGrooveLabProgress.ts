// ── A player's Groove Lab progress, on their account ───────────────────────
// Saved with the arcade's game options (PATCH /api/game-options/grooveLab,
// `{ progress }`), so it follows the player to any device. The grid and the
// pads each climb on their own: each remembers the highest level it has
// opened, and whether its last level has been cleared.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LAST_GROOVE_LAB_LEVEL,
  type GrooveLabLevel,
} from '@/curriculum/engine/grooveLab/levels';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';

export const GROOVE_LAB_GAME_ID = 'grooveLab';

export type GrooveLabView = 'grid' | 'pads';

export interface GrooveLabProgress {
  version: 1;
  /** The highest level open, each way of playing. */
  open: Record<GrooveLabView, GrooveLabLevel>;
  mastered: Record<GrooveLabView, boolean>;
}

const EMPTY: GrooveLabProgress = {
  version: 1,
  open: { grid: 1, pads: 1 },
  mastered: { grid: false, pads: false },
};

const asLevel = (v: unknown): GrooveLabLevel =>
  typeof v === 'number' && Number.isFinite(v)
    ? (Math.max(
        1,
        Math.min(LAST_GROOVE_LAB_LEVEL, Math.floor(v)),
      ) as GrooveLabLevel)
    : 1;

/** Saved progress, read defensively. */
export function readGrooveLabProgress(raw: unknown): GrooveLabProgress {
  const p = (raw ?? {}) as Partial<GrooveLabProgress>;
  return {
    version: 1,
    open: { grid: asLevel(p.open?.grid), pads: asLevel(p.open?.pads) },
    mastered: {
      grid: Boolean(p.mastered?.grid),
      pads: Boolean(p.mastered?.pads),
    },
  };
}

const merged = (
  a: GrooveLabProgress,
  b: GrooveLabProgress,
): GrooveLabProgress => ({
  version: 1,
  open: {
    grid: Math.max(a.open.grid, b.open.grid) as GrooveLabLevel,
    pads: Math.max(a.open.pads, b.open.pads) as GrooveLabLevel,
  },
  mastered: {
    grid: a.mastered.grid || b.mastered.grid,
    pads: a.mastered.pads || b.mastered.pads,
  },
});

export function useGrooveLabProgress() {
  const { data } = useGameOptions<{ progress?: unknown }>(GROOVE_LAB_GAME_ID);
  const { mutate } = useSaveGameOptions(GROOVE_LAB_GAME_ID);
  const [local, setLocal] = useState<GrooveLabProgress>(EMPTY);
  const progress = useMemo(
    () => merged(readGrooveLabProgress(data?.progress), local),
    [data, local],
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;

  /** A level cleared: the next one opens; the last one masters the view. */
  const clearLevel = useCallback(
    (view: GrooveLabView, level: GrooveLabLevel) => {
      const was = progressRef.current;
      const next: GrooveLabProgress = {
        version: 1,
        open: {
          ...was.open,
          [view]: Math.max(
            was.open[view],
            Math.min(LAST_GROOVE_LAB_LEVEL, level + 1),
          ) as GrooveLabLevel,
        },
        mastered: {
          ...was.mastered,
          [view]: was.mastered[view] || level === LAST_GROOVE_LAB_LEVEL,
        },
      };
      progressRef.current = next;
      setLocal((l) => merged(l, next));
      mutate({ progress: next });
    },
    [mutate],
  );

  return { progress, clearLevel };
}
