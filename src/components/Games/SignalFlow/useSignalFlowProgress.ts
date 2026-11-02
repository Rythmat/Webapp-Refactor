import { useCallback, useMemo, useRef, useState } from 'react';
import { recordDone } from '@/features/cortex/ledger';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';

// ── Which missions a player has cleared ────────────────────────────────────
// Saved with the arcade's game options, so it follows them to any device, and
// kept in this browser too, so it isn't lost if the account can't be reached.

export const SIGNAL_FLOW_GAME_ID = 'signalFlow';
const LOCAL_KEY = 'signal-flow-progress';

/** Saved progress, read defensively. */
export function readProgress(raw: unknown): readonly string[] {
  const cleared = (raw as { cleared?: unknown } | null | undefined)?.cleared;
  return Array.isArray(cleared)
    ? cleared.filter((id): id is string => typeof id === 'string')
    : [];
}

const readLocal = (): readonly string[] => {
  try {
    return readProgress(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null'));
  } catch {
    return [];
  }
};

const writeLocal = (cleared: readonly string[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ cleared }));
  } catch {
    // Private window, or storage is full: the account copy still holds it.
  }
};

export function useSignalFlowProgress() {
  const { data } = useGameOptions<{ progress?: unknown }>(SIGNAL_FLOW_GAME_ID);
  const { mutate } = useSaveGameOptions(SIGNAL_FLOW_GAME_ID);
  const [local, setLocal] = useState<readonly string[]>(readLocal);
  const cleared = useMemo(
    () => new Set([...readProgress(data?.progress), ...local]),
    [data, local],
  );
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;

  const clearMission = useCallback(
    (id: string) => {
      if (clearedRef.current.has(id)) return;
      recordDone(`game:${SIGNAL_FLOW_GAME_ID}`);
      const next = [...clearedRef.current, id];
      setLocal(next);
      writeLocal(next);
      mutate({ progress: { cleared: next } });
    },
    [mutate],
  );

  return { cleared, clearMission };
}
