import type {
  LiteracyMode,
  LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
// The levels alone, not the engine's index: Start Here reads this module
// (the Echo stop's key), and shouldn't load the contour library to do it.
import {
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo/levels';

// ── Echo's progress, on this device ────────────────────────────────────────
// What a student has done in Echo, kept in localStorage as Music Literacy's
// progress is for now:
//
//   unlocked     the highest level open. Level 1 always is; finishing a
//                level's song opens the next (Next Level!)
//   highScores   the best streak of good echoes, per level: the High Score
//   songs        how many songs the student has finished, per level
//   last         the level and key they last set up, so setup opens on them
//
// Every read and write is wrapped: private browsing, a full disk or a
// value from an older build reads as a fresh start, never an error.
//
// Planned: this moves to the student's account, beside the per-account
// Music Literacy progress, so a High Score follows them to any device. The
// server side is written up in docs/echo-game.md, "XP and High Scores: what
// the server needs (for Ryan)" (GET/PUT /api/arcade/scores?game=echo&level=1).

export const ECHO_PROGRESS_KEY = 'echo_game_progress';

const VERSION = 1;

export interface EchoKeyChoice {
  tonic: LiteracyTonic;
  mode: LiteracyMode;
}

export interface EchoProgress {
  version: typeof VERSION;
  /** The highest level open: 1 to begin with. */
  unlocked: EchoLevelNumber;
  /** The best streak per level. */
  highScores: Partial<Record<EchoLevelNumber, number>>;
  /** Songs finished per level. */
  songs: Partial<Record<EchoLevelNumber, number>>;
  /** The last game set up, if any. */
  last: { level: EchoLevelNumber; key: EchoKeyChoice } | null;
}

export const NEW_ECHO_PROGRESS: EchoProgress = {
  version: VERSION,
  unlocked: 1,
  highScores: {},
  songs: {},
  last: null,
};

const isLevel = (value: unknown): value is EchoLevelNumber =>
  ECHO_LEVEL_NUMBERS.includes(value as EchoLevelNumber);

const counts = (value: unknown): Partial<Record<EchoLevelNumber, number>> => {
  if (!value || typeof value !== 'object') return {};
  const out: Partial<Record<EchoLevelNumber, number>> = {};
  for (const level of ECHO_LEVEL_NUMBERS) {
    const n = (value as Record<string, unknown>)[level];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
      out[level] = Math.floor(n);
    }
  }
  return out;
};

/** Saved progress read back (JSON already parsed); anything odd is dropped. */
export function parseEchoProgress(raw: unknown): EchoProgress {
  if (!raw || typeof raw !== 'object') return NEW_ECHO_PROGRESS;
  const value = raw as Record<string, unknown>;
  if (value.version !== VERSION) return NEW_ECHO_PROGRESS;
  const last = value.last as Record<string, unknown> | null | undefined;
  const lastKey = last?.key as Record<string, unknown> | undefined;
  return {
    version: VERSION,
    unlocked: isLevel(value.unlocked) ? value.unlocked : 1,
    highScores: counts(value.highScores),
    songs: counts(value.songs),
    last:
      last &&
      isLevel(last.level) &&
      typeof lastKey?.tonic === 'string' &&
      (lastKey.mode === 'major' || lastKey.mode === 'minor')
        ? {
            level: last.level,
            key: {
              tonic: lastKey.tonic as LiteracyTonic,
              mode: lastKey.mode,
            },
          }
        : null,
  };
}

/** This device's Echo progress. */
export function readEchoProgress(): EchoProgress {
  try {
    const raw = localStorage.getItem(ECHO_PROGRESS_KEY);
    return raw ? parseEchoProgress(JSON.parse(raw)) : NEW_ECHO_PROGRESS;
  } catch {
    // Private browsing, or a value no build of this code wrote.
    return NEW_ECHO_PROGRESS;
  }
}

function save(progress: EchoProgress): EchoProgress {
  try {
    localStorage.setItem(ECHO_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or private browsing: kept for this visit only.
  }
  return progress;
}

/** A level can be played: Level 1, and each one finished up to. */
export const levelOpen = (
  progress: EchoProgress,
  level: EchoLevelNumber,
): boolean => level <= progress.unlocked;

/** The best streak saved for a level (0 before any). */
export const highScoreOf = (
  progress: EchoProgress,
  level: EchoLevelNumber,
): number => progress.highScores[level] ?? 0;

/** The game set up: setup opens on it next time. */
export function rememberSetup(
  level: EchoLevelNumber,
  key: EchoKeyChoice,
): EchoProgress {
  return save({ ...readEchoProgress(), last: { level, key } });
}

/**
 * A streak reached in a game: saved as the level's High Score when it beats
 * the one kept. Returns whether it did.
 */
export function recordStreak(level: EchoLevelNumber, streak: number): boolean {
  const progress = readEchoProgress();
  if (streak <= highScoreOf(progress, level)) return false;
  save({
    ...progress,
    highScores: { ...progress.highScores, [level]: streak },
  });
  return true;
}

/** The level after this one, or null after Level 3. */
export const nextLevelOf = (level: EchoLevelNumber): EchoLevelNumber | null =>
  level < 3 ? ((level + 1) as EchoLevelNumber) : null;

/**
 * A song finished at a level: the level is done, so the next one opens.
 * Returns the progress saved.
 */
export function recordSongFinished(level: EchoLevelNumber): EchoProgress {
  const progress = readEchoProgress();
  const next = nextLevelOf(level) ?? level;
  return save({
    ...progress,
    unlocked: Math.max(progress.unlocked, next) as EchoLevelNumber,
    songs: { ...progress.songs, [level]: (progress.songs[level] ?? 0) + 1 },
  });
}
