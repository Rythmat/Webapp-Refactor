// ── Groove Lab ──────────────────────────────────────────────────────────────
// The owner's drum grooves, two ways (Peter, 2026-10-21):
//
//   Grid   hear the groove, click it in on three rows (kick, snare, and the
//          hi-hat or ride), check it
//   Pads   the Studio's finger drumming on the same three drums: hear it,
//          then play it back in time
//
// The grooves are the owner's pick of his designs in the console's Drum
// Grooves designer (curriculum/engine/grooveLab), climbing by complexity: a
// bar of 8ths, a bar of 16ths, two bars of 8ths, two of 16ths, then the
// advanced two bars of 16ths, at a learning tempo on Levels 1–5 and the
// groove's own on Levels 6–10. A streak clears a level; each view climbs
// on its own, saved to the player's account. Loop (on or off) is shared.

import { Grid3x3, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  FIRST_FULL_TEMPO_LEVEL,
  GROOVE_LAB_LEVELS,
  LAST_GROOVE_LAB_LEVEL,
  LEVEL_SPECS,
  levelPool,
  type GrooveLabLevel,
} from '@/curriculum/engine/grooveLab/levels';
import { ArcadeGameHeader } from '../ArcadeGameHeader';
import { VolumeDial } from '../VolumeDial';
import { useArcadeStreak, winXpLine } from '../scoring/ArcadeStreak';
import { GridPlay } from './GridPlay';
import { GrooveLabAudio } from './GrooveLabAudio';
import { PadsPlay } from './PadsPlay';
import {
  useGrooveLabProgress,
  type GrooveLabView,
} from './useGrooveLabProgress';
import { useLabGrooves } from './useLabGrooves';

const VIEW_KEY = 'groove-lab-view';

function savedView(): GrooveLabView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'pads' ? 'pads' : 'grid';
  } catch {
    return 'grid';
  }
}

function saveView(view: GrooveLabView) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // A private window: this visit only.
  }
}

/** The finger-drumming kit's icon: a big drum with two small ones. */
function PadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle
        cx="12"
        cy="15"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="5"
        cy="7"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="19"
        cy="7"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export type GrooveLabProps = {
  onCorrect?: () => void;
  onWrong?: () => void;
  /** A new level or view: the streak starts over. */
  onRestart?: () => void;
};

export default function GrooveLab({
  onCorrect,
  onWrong,
  onRestart,
}: GrooveLabProps = {}) {
  const streak = useArcadeStreak();
  const grooves = useLabGrooves();
  const { progress, clearLevel } = useGrooveLabProgress();
  const [view, setView] = useState<GrooveLabView>(savedView);
  const [level, setLevel] = useState<GrooveLabLevel>(1);
  const [cleared, setCleared] = useState<{
    view: GrooveLabView;
    level: GrooveLabLevel;
  } | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(false);

  const audioRef = useRef<GrooveLabAudio | null>(null);
  const audio = useMemo(() => {
    audioRef.current ??= new GrooveLabAudio();
    return audioRef.current;
  }, []);
  useEffect(() => () => audioRef.current?.close(), []);
  // The game plays at the dial's level from the start.
  useEffect(() => {
    audio.setVolume(volume);
    // Once, as it opens; the dial sets it after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio]);

  // A returning player starts where they got to.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current || progress.open[view] <= 1) return;
    openedRef.current = true;
    setLevel(progress.open[view]);
  }, [progress, view]);

  const pool = useMemo(
    () => (grooves ? levelPool(level, grooves) : []),
    [grooves, level],
  );

  // A streak won: the level is cleared, and what's next is offered.
  const lastWinRef = useRef(streak?.win?.id ?? 0);
  useEffect(() => {
    const win = streak?.win;
    if (!win || win.id <= lastWinRef.current) return;
    lastWinRef.current = win.id;
    clearLevel(view, level);
    setCleared({ view, level });
  }, [streak?.win, clearLevel, view, level]);

  const choose = (nextView: GrooveLabView, nextLevel: GrooveLabLevel) => {
    setCleared(null);
    setView(nextView);
    setLevel(nextLevel);
    saveView(nextView);
    onRestart?.();
  };

  const open = progress.open[view];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#101012]">
      <ArcadeGameHeader
        title="Groove Lab"
        controls={
          <>
            <div
              role="radiogroup"
              aria-label="View"
              className="flex h-8 items-center rounded-full ring-1 ring-inset ring-white/10"
            >
              {(
                [
                  ['grid', 'Grid', Grid3x3],
                  ['pads', 'Pads', PadsIcon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={view === id}
                  data-view={id}
                  onClick={() =>
                    view !== id &&
                    choose(
                      id,
                      Math.min(level, progress.open[id]) as GrooveLabLevel,
                    )
                  }
                  className={cn(
                    'inline-flex h-full items-center gap-1.5 rounded-full px-3 text-xs transition-colors',
                    view === id
                      ? 'bg-white text-[#101012]'
                      : 'text-white/60 hover:text-white',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div
              role="group"
              aria-label="Level"
              className="flex items-center gap-1"
            >
              {GROOVE_LAB_LEVELS.map((n) => {
                const locked = n > open;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={locked}
                    aria-label={`Level ${n}`}
                    aria-pressed={level === n}
                    title={`Level ${n}: ${LEVEL_SPECS[n].title}${locked ? ' (clear the level before it)' : ''}`}
                    data-level={n}
                    onClick={() => level !== n && choose(view, n)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs transition-colors',
                      // The second five: the same at full tempo.
                      n === FIRST_FULL_TEMPO_LEVEL && 'ml-2',
                      level === n
                        ? 'bg-[#7ecfcf] font-semibold text-[#101012]'
                        : 'border border-white/10 text-white/70 hover:text-white',
                      locked && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {locked && <Lock className="size-3" aria-hidden />}L{n}
                  </button>
                );
              })}
            </div>
          </>
        }
        right={
          <div className="flex items-center rounded-xl border border-white/5 bg-black/20 px-5 py-3 backdrop-blur-sm">
            <VolumeDial
              value={volume}
              onChange={(v) => {
                setVolume(v);
                audio.setVolume(v);
              }}
            />
          </div>
        }
      />

      <p className="pt-3 text-center text-xs uppercase tracking-wider text-white/40">
        Level {level} · {LEVEL_SPECS[level].title}
        {LEVEL_SPECS[level].fullTempo ? '' : ' · learning tempo'}
      </p>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {view === 'grid' ? (
          <GridPlay
            key={`grid-${level}`}
            audio={audio}
            level={level}
            pool={pool}
            active={!cleared}
            loop={loop}
            onLoop={setLoop}
            onCorrect={onCorrect}
            onWrong={onWrong}
          />
        ) : (
          <PadsPlay
            key={`pads-${level}`}
            audio={audio}
            level={level}
            pool={pool}
            active={!cleared}
            loop={loop}
            onLoop={setLoop}
            onCorrect={onCorrect}
            onWrong={onWrong}
          />
        )}

        {cleared && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 p-4">
            <div
              role="status"
              data-testid="groove-cleared"
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151518] p-6 text-center text-white shadow-2xl"
            >
              <p className="text-sm uppercase tracking-wider text-[#7ecfcf]">
                Streak complete!
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Level {cleared.level} cleared!
              </h2>
              {streak?.win && (
                <p className="mt-2 text-sm text-white/70">
                  {winXpLine(streak.win)}
                </p>
              )}
              <p className="mt-4 text-sm text-white/80">
                {cleared.level < LAST_GROOVE_LAB_LEVEL
                  ? `Next up: Level ${cleared.level + 1}, ${LEVEL_SPECS[(cleared.level + 1) as GrooveLabLevel].title.toLowerCase()}.`
                  : `You’ve mastered Groove Lab on the ${cleared.view === 'grid' ? 'grid' : 'pads'}!`}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => choose(cleared.view, cleared.level)}
                  className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-sm text-white/85 hover:bg-white/[0.06]"
                >
                  Play again
                </button>
                {cleared.level < LAST_GROOVE_LAB_LEVEL ? (
                  <button
                    type="button"
                    data-testid="groove-next-level"
                    onClick={() =>
                      choose(
                        cleared.view,
                        (cleared.level + 1) as GrooveLabLevel,
                      )
                    }
                    className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#101012]"
                  >
                    Next level
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      choose(
                        cleared.view === 'grid' ? 'pads' : 'grid',
                        progress.open[
                          cleared.view === 'grid' ? 'pads' : 'grid'
                        ],
                      )
                    }
                    className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#101012]"
                  >
                    Try the {cleared.view === 'grid' ? 'pads' : 'grid'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
