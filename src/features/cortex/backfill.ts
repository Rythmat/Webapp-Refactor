import type { ProgressSummaryLesson } from '@/lib/progress/types';
import { cortexIdForLesson, theoryId, type CortexId } from './ids';
import { mergeRecord, type CortexRecord } from './ledger';

/**
 * What the account already knows the student did, as records. Only the account:
 * what sits on a device with no owner (viewed songs, game launches, guitar
 * lesson progress) could be someone else's on a shared Chromebook, so the
 * Cortex never reads it (owner, 2026-11-01). These records are worked out on
 * each load and never saved to the ledger. Pure.
 */

export interface BackfillSources {
  lessons?: readonly ProgressSummaryLesson[];
  projects?: readonly {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }[];
  /** The account's game options, by game id. */
  options?: Readonly<Record<string, unknown>>;
}

const minutes = (at: Date | string | number | null | undefined): number => {
  if (at === null || at === undefined) return 0;
  const ms = at instanceof Date ? at.getTime() : new Date(at).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 60_000) : 0;
};

/** Mirrors ModeOverview's reading of a Theory row: the columns, then its id. */
const lessonCortexId = (lesson: ProgressSummaryLesson): CortexId | null => {
  if (lesson.lessonId.startsWith('mode-lesson-flow')) {
    let mode = lesson.mode ?? null;
    let root = lesson.root ?? null;
    const activity = lesson.currentActivityInstanceId?.split('::');
    if ((!mode || !root) && activity && activity.length >= 5) {
      mode = mode ?? activity[3];
      root = root ?? activity[4];
    }
    if (mode && root) return theoryId('piano', mode, root);
  }
  return cortexIdForLesson(lesson.lessonId);
};

const progressOf = (
  options: BackfillSources['options'],
  game: string,
): Record<string, unknown> | null => {
  const progress = (options?.[game] as { progress?: unknown } | undefined)
    ?.progress;
  return typeof progress === 'object' && progress !== null
    ? (progress as Record<string, unknown>)
    : null;
};

const nonEmptyList = (value: unknown) =>
  Array.isArray(value) && value.length > 0;

/** Only progress past each game's starting point: Foli also keeps prefs there. */
const GAME_PROGRESSED: Readonly<
  Record<string, (progress: Record<string, unknown>) => boolean>
> = {
  signalFlow: (p) => nonEmptyList(p.cleared),
  majorArcanum: (p) => nonEmptyList(p.cleared),
  grooveLab: (p) => {
    const open = p.open as { grid?: number; pads?: number } | undefined;
    return (open?.grid ?? 1) > 1 || (open?.pads ?? 1) > 1;
  },
  foli: (p) => Number(p.two ?? 1) > 1 || Number(p.four ?? 0) > 0,
};

/** Every song in the set lists, with when it was added. */
const setListSongs = (blob: unknown): Map<string, number> => {
  const songs = new Map<string, number>();
  const walk = (value: unknown, depth: number) => {
    if (depth > 8 || typeof value !== 'object' || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.songId === 'string' && record.songId) {
      const at = minutes(record.createdAt as string | number | undefined);
      const was = songs.get(record.songId);
      songs.set(record.songId, was ? Math.min(was, at || was) : at);
    }
    for (const item of Object.values(record)) walk(item, depth + 1);
  };
  walk(blob, 0);
  return songs;
};

export const backfillRecords = (
  sources: BackfillSources,
): Record<string, CortexRecord> => {
  const out: Record<string, CortexRecord> = {};
  const add = (id: string, record: CortexRecord) => {
    out[id] = out[id] ? mergeRecord(out[id], record) : record;
  };

  for (const lesson of sources.lessons ?? []) {
    if ((lesson.completedCount ?? 0) <= 0) continue;
    const id = lessonCortexId(lesson);
    if (!id) continue;
    const at = minutes(lesson.updatedAt);
    const finished =
      lesson.totalCount !== null && lesson.completedCount >= lesson.totalCount;
    add(id, [at, at, finished ? at : 0]);
  }

  for (const project of sources.projects ?? []) {
    const last = minutes(project.updatedAt);
    // On the account means it was saved: finished in the map's terms.
    add(`project:${project.id}`, [minutes(project.createdAt), last, last]);
  }

  for (const [game, progressed] of Object.entries(GAME_PROGRESSED)) {
    const progress = progressOf(sources.options, game);
    // Cleared levels carry no dates. 1 keeps it finished without claiming when.
    if (progress && progressed(progress)) add(`game:${game}`, [0, 0, 1]);
  }

  for (const [songId, at] of setListSongs(sources.options?.setlists)) {
    add(`song:${songId}`, [at, at, at || 1]);
  }

  return out;
};
