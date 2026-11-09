// ── How a run ends ──────────────────────────────────────────────────────────
// A streak won: congratulations, the XP it earned, and what's left of the
// level ("Next up: Chords in G"); a level cleared: congratulations and the
// next level or this one again (Peter, 2026-10-20). A run that ends without a
// streak: the best the player managed, and a try again.

import { ArrowRight, Map as MapIcon, RotateCcw, Trophy } from 'lucide-react';
import {
  MODES,
  type ArcanumLevel,
  type ArcanumMode,
} from '@/curriculum/engine/majorArcanum/levels';
import type { ArcanumTask } from '@/curriculum/engine/majorArcanum/progress';
import { winXpLine } from '../scoring/ArcadeStreak';
import type { StreakWin } from '../scoring/useArcadeStreakReward';
import { taskTitle } from './LevelMap';

export type RunOutcome =
  | {
      kind: 'won';
      task: ArcanumTask;
      /** Free play on the Circle: nothing to clear. */
      free: boolean;
      /** The level's next part, if any is left. */
      next: ArcanumTask | null;
      /** The level was cleared by this streak. */
      levelDone: boolean;
      /** The level after it, if the level was cleared (null after Maestro 6). */
      after: { mode: ArcanumMode; level: ArcanumLevel } | null;
      /** The mode was cleared by this streak. */
      modeDone: boolean;
    }
  | {
      kind: 'over';
      task: ArcanumTask;
      free: boolean;
      bestPhrases: number;
      target: number;
      accuracy: number;
    };

interface RunResultProps {
  outcome: RunOutcome;
  win: StreakWin | null;
  onPlay: (task: ArcanumTask) => void;
  onLevel: (mode: ArcanumMode, level: ArcanumLevel) => void;
  onMap: () => void;
}

const BUTTON =
  'flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';
const PRIMARY = `${BUTTON} bg-[#d2404a] text-white hover:bg-[#b9363f]`;
const SECONDARY = `${BUTTON} border border-white/15 text-zinc-200 hover:border-white/40 hover:text-white`;

export function RunResult({
  outcome,
  win,
  onPlay,
  onLevel,
  onMap,
}: RunResultProps) {
  const { task } = outcome;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/85 px-6 backdrop-blur-sm">
      <div className="flex max-w-lg flex-col items-center gap-4 text-center">
        {outcome.kind === 'won' ? (
          <>
            <Trophy size={40} className="text-amber-300" />
            <h2 className="text-4xl text-white">
              {outcome.levelDone && !outcome.free
                ? outcome.after === null
                  ? 'You’ve conquered Major Arcanum!'
                  : outcome.modeDone
                    ? `${MODES[task.mode].label} conquered!`
                    : `Level ${task.level} complete!`
                : 'Congratulations!'}
            </h2>
            <p className="text-lg text-violet-200">
              Streak complete! {taskTitle(task)}
              {outcome.free ? ' (the Circle)' : ''}
            </p>
            {win && (
              <p
                className={
                  win.status === 'granted'
                    ? 'text-3xl font-bold text-white'
                    : 'text-sm text-zinc-300'
                }
              >
                {winXpLine(win)}
              </p>
            )}
            {outcome.modeDone && outcome.after && (
              <p className="text-sm text-zinc-300">
                {MODES[outcome.after.mode].label} is open:{' '}
                {MODE_NEWS[outcome.after.mode]}
              </p>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {outcome.free ? (
                <>
                  <button
                    type="button"
                    className={PRIMARY}
                    onClick={() => onPlay(task)}
                  >
                    <RotateCcw size={16} /> Play again
                  </button>
                  <button
                    type="button"
                    className={SECONDARY}
                    onClick={() =>
                      onPlay({
                        ...task,
                        part: task.part === 'melody' ? 'chords' : 'melody',
                      })
                    }
                  >
                    {taskTitle({
                      ...task,
                      part: task.part === 'melody' ? 'chords' : 'melody',
                    })}
                  </button>
                  <button type="button" className={SECONDARY} onClick={onMap}>
                    <MapIcon size={16} /> Level map
                  </button>
                </>
              ) : outcome.next ? (
                <>
                  <button
                    type="button"
                    className={PRIMARY}
                    onClick={() => onPlay(outcome.next!)}
                  >
                    Next up: {taskTitle(outcome.next)} <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className={SECONDARY}
                    onClick={() => onPlay(task)}
                  >
                    <RotateCcw size={16} /> Replay {taskTitle(task)}
                  </button>
                </>
              ) : (
                <>
                  {outcome.after && (
                    <button
                      type="button"
                      className={PRIMARY}
                      onClick={() =>
                        onLevel(outcome.after!.mode, outcome.after!.level)
                      }
                    >
                      Go to {MODES[outcome.after.mode].label} Level{' '}
                      {outcome.after.level} <ArrowRight size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={outcome.after ? SECONDARY : PRIMARY}
                    onClick={() => onLevel(task.mode, task.level)}
                  >
                    <RotateCcw size={16} /> Replay Level {task.level}
                  </button>
                </>
              )}
            </div>
            {!outcome.free && (
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-300"
                onClick={onMap}
              >
                Level map
              </button>
            )}
          </>
        ) : (
          <>
            <h2 className="text-4xl text-white">So close!</h2>
            <p className="text-zinc-300">
              {taskTitle(task)}: your best was {outcome.bestPhrases} of{' '}
              {outcome.target} phrases in a row without a miss.
            </p>
            <p className="text-sm text-zinc-500">
              {outcome.accuracy}% of the notes hit
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className={PRIMARY}
                onClick={() => onPlay(task)}
              >
                <RotateCcw size={16} /> Try again
              </button>
              <button type="button" className={SECONDARY} onClick={onMap}>
                <MapIcon size={16} /> Level map
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const MODE_NEWS: Record<ArcanumMode, string> = {
  novice: '',
  pro: 'melodies on 1–8, and 7th chords.',
  expert: 'two octaves of melody, and triads in every inversion.',
  maestro: 'three octaves of melody, and 7th chords in every inversion.',
};
