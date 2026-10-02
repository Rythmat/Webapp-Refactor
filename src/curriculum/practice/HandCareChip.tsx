import { useEffect, useState } from 'react';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import { HAND_CARE } from './practiceDefaults';

// ── Hand care ──────────────────────────────────────────────────────────────
// Barre chords tire the hand. After HAND_CARE.barreLoopMinutes of looping on
// barre steps, one quiet chip suggests a break: no timer, no nagging. It
// stays until dismissed and, once dismissed, doesn't return this session
// (HAND_CARE.oncePerSession).

const BREAK_AFTER_MS = HAND_CARE.barreLoopMinutes * 60_000;
/** How often the looping clock adds up while it runs. */
const CLOCK_INTERVAL_MS = 15_000;

/** This page session: time spent looping barre steps, and the dismissal. */
const session = { loopingMs: 0, dismissed: false };

/**
 * Looping time on barre steps this session, counted while `active` (a looped
 * practice run on a step whose shapes use a barre) — feeds HandCareChip.
 */
export function useBarreLoopingMs(active: boolean): number {
  const [ms, setMs] = useState(session.loopingMs);
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const addElapsed = () => {
      const now = Date.now();
      session.loopingMs += now - last;
      last = now;
      setMs(session.loopingMs);
    };
    const id = setInterval(addElapsed, CLOCK_INTERVAL_MS);
    return () => {
      clearInterval(id);
      addElapsed();
    };
  }, [active]);
  return ms;
}

export interface HandCareChipProps {
  loopingMsOnBarreSteps: number;
}

export function HandCareChip({ loopingMsOnBarreSteps }: HandCareChipProps) {
  const [dismissed, setDismissed] = useState(session.dismissed);
  if (dismissed || loopingMsOnBarreSteps < BREAK_AFTER_MS) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] py-0.5 pl-3 text-xs leading-4 text-[#e8e8f0]"
    >
      <span>{theoryString('pt.break')}</span>
      {/* 36px to hit (44px on a phone), for a 12px ✕. */}
      <button
        type="button"
        aria-label="Dismiss break reminder"
        onClick={() => {
          session.dismissed = HAND_CARE.oncePerSession;
          setDismissed(true);
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#e8e8f0] max-[639px]:size-11"
      >
        ✕
      </button>
    </div>
  );
}
