// ── A player's Foli progress, on their account ──────────────────────────────
// Saved with Foli's game options (`{ progress }`, beside its key bindings),
// so it follows the player to any device. Each mode remembers the highest
// level it has opened; four drums opens when two drums is conquered (a
// streak at 300 BPM) and the player says yes to something harder.

import { useCallback, useMemo, useRef, useState } from 'react';
import { LAST_LEVEL, type FoliMode } from '@/curriculum/engine/foli/levels';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';

export const FOLI_GAME_ID = 'foli';

export interface FoliProgress {
  version: 1;
  /** The highest level open on two drums (at least 1). */
  two: number;
  /** The highest level open on four drums; 0 until it's unlocked. */
  four: number;
  conquered: { two: boolean; four: boolean };
}

const EMPTY: FoliProgress = {
  version: 1,
  two: 1,
  four: 0,
  conquered: { two: false, four: false },
};

const level = (v: unknown, min: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(min, Math.min(LAST_LEVEL, Math.floor(v)))
    : min;

/** Saved progress, read defensively. */
export function readFoliProgress(raw: unknown): FoliProgress {
  const p = (raw ?? {}) as Partial<FoliProgress>;
  return {
    version: 1,
    two: level(p.two, 1),
    four: level(p.four, 0),
    conquered: {
      two: Boolean(p.conquered?.two),
      four: Boolean(p.conquered?.four),
    },
  };
}

const merged = (a: FoliProgress, b: FoliProgress): FoliProgress => ({
  version: 1,
  two: Math.max(a.two, b.two),
  four: Math.max(a.four, b.four),
  conquered: {
    two: a.conquered.two || b.conquered.two,
    four: a.conquered.four || b.conquered.four,
  },
});

export function useFoliProgress() {
  const { data } = useGameOptions<{ progress?: unknown }>(FOLI_GAME_ID);
  const { mutate } = useSaveGameOptions(FOLI_GAME_ID);
  const [local, setLocal] = useState<FoliProgress>(EMPTY);
  const progress = useMemo(
    () => merged(readFoliProgress(data?.progress), local),
    [data, local],
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const save = useCallback(
    (next: FoliProgress) => {
      progressRef.current = next;
      setLocal((was) => merged(was, next));
      mutate({ progress: next });
    },
    [mutate],
  );

  /** A level cleared: the next one opens; the last one conquers the mode. */
  const clearLevel = useCallback(
    (mode: FoliMode, cleared: number) => {
      const now = progressRef.current;
      const opened = Math.min(LAST_LEVEL, cleared + 1);
      save({
        ...now,
        [mode]: Math.max(now[mode], opened),
        conquered: {
          ...now.conquered,
          [mode]: now.conquered[mode] || cleared >= LAST_LEVEL,
        },
      });
    },
    [save],
  );

  /** Something harder: four drums, from Level 1. */
  const openFour = useCallback(() => {
    const now = progressRef.current;
    save({ ...now, four: Math.max(1, now.four) });
  }, [save]);

  return { progress, clearLevel, openFour };
}
