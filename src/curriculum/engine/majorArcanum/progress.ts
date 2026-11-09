/**
 * A player's Major Arcanum progress: what's cleared, what's open, and
 * what's next (Peter, 2026-10-20).
 *
 * A key of a level is cleared with a streak in Melody and a streak in
 * Chords; a level with all its keys; a mode with all six levels. Level 1 of
 * a mode is open once the mode is, and each level after it once the one
 * before is cleared; Novice is always open, and each mode after it once the
 * one before is cleared. A cleared level can always be played again.
 *
 * The progress is saved to the player's account (the arcade's game options,
 * under 'majorArcanum'); this module only reads and changes it.
 *
 * Pure, no React.
 */

import {
  ARCANUM_LEVELS,
  ARCANUM_MODES,
  ARCANUM_PARTS,
  LEVEL_KEYS,
  type ArcanumLevel,
  type ArcanumMode,
  type ArcanumPart,
} from './levels';

export interface ArcanumProgress {
  version: 1;
  /** Cleared parts, as `mode:level:keyPc:part`. */
  cleared: readonly string[];
}

export const EMPTY_PROGRESS: ArcanumProgress = { version: 1, cleared: [] };

/** One part of a level to clear: Melody or Chords in one of its keys. */
export interface ArcanumTask {
  mode: ArcanumMode;
  level: ArcanumLevel;
  keyPc: number;
  part: ArcanumPart;
}

export const taskId = ({ mode, level, keyPc, part }: ArcanumTask): string =>
  `${mode}:${level}:${keyPc}:${part}`;

/** A level's parts, in the order they're played: each key, Melody then Chords. */
export const levelTasks = (
  mode: ArcanumMode,
  level: ArcanumLevel,
): ArcanumTask[] =>
  LEVEL_KEYS[level].flatMap((keyPc) =>
    ARCANUM_PARTS.map((part) => ({ mode, level, keyPc, part })),
  );

export const isCleared = (progress: ArcanumProgress, task: ArcanumTask) =>
  progress.cleared.includes(taskId(task));

export const keyCleared = (
  progress: ArcanumProgress,
  mode: ArcanumMode,
  level: ArcanumLevel,
  keyPc: number,
) =>
  ARCANUM_PARTS.every((part) =>
    isCleared(progress, { mode, level, keyPc, part }),
  );

export const levelCleared = (
  progress: ArcanumProgress,
  mode: ArcanumMode,
  level: ArcanumLevel,
) => levelTasks(mode, level).every((task) => isCleared(progress, task));

export const modeCleared = (progress: ArcanumProgress, mode: ArcanumMode) =>
  ARCANUM_LEVELS.every((level) => levelCleared(progress, mode, level));

export function modeOpen(progress: ArcanumProgress, mode: ArcanumMode) {
  const at = ARCANUM_MODES.indexOf(mode);
  return at <= 0 || modeCleared(progress, ARCANUM_MODES[at - 1]);
}

export function levelOpen(
  progress: ArcanumProgress,
  mode: ArcanumMode,
  level: ArcanumLevel,
) {
  return (
    modeOpen(progress, mode) &&
    (level === 1 || levelCleared(progress, mode, (level - 1) as ArcanumLevel))
  );
}

/** The level's first part not yet cleared, if any. */
export const nextTask = (
  progress: ArcanumProgress,
  mode: ArcanumMode,
  level: ArcanumLevel,
): ArcanumTask | null =>
  levelTasks(mode, level).find((task) => !isCleared(progress, task)) ?? null;

/** Where a player picks up: the furthest open level, at its next part. */
export function currentLevel(progress: ArcanumProgress): {
  mode: ArcanumMode;
  level: ArcanumLevel;
} {
  let at = { mode: ARCANUM_MODES[0], level: ARCANUM_LEVELS[0] };
  for (const mode of ARCANUM_MODES)
    for (const level of ARCANUM_LEVELS)
      if (levelOpen(progress, mode, level)) at = { mode, level };
  return at;
}

/** The level after this one, in this mode or the next; null after Maestro 6. */
export function levelAfter(
  mode: ArcanumMode,
  level: ArcanumLevel,
): { mode: ArcanumMode; level: ArcanumLevel } | null {
  if (level < 6) return { mode, level: (level + 1) as ArcanumLevel };
  const next = ARCANUM_MODES[ARCANUM_MODES.indexOf(mode) + 1];
  return next ? { mode: next, level: 1 } : null;
}

/** The progress with a part cleared. */
export function withCleared(
  progress: ArcanumProgress,
  task: ArcanumTask,
): ArcanumProgress {
  const id = taskId(task);
  return progress.cleared.includes(id)
    ? progress
    : { version: 1, cleared: [...progress.cleared, id] };
}

const VALID_IDS = new Set(
  ARCANUM_MODES.flatMap((mode) =>
    ARCANUM_LEVELS.flatMap((level) => levelTasks(mode, level).map(taskId)),
  ),
);

/** Progress as the account holds it, read defensively: anything odd is left out. */
export function readProgress(raw: unknown): ArcanumProgress {
  const cleared = (raw as { cleared?: unknown } | null)?.cleared;
  if (!Array.isArray(cleared)) return EMPTY_PROGRESS;
  return {
    version: 1,
    cleared: [
      ...new Set(
        cleared.filter(
          (id): id is string => typeof id === 'string' && VALID_IDS.has(id),
        ),
      ),
    ],
  };
}
