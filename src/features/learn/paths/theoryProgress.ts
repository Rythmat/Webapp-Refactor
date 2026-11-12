import type { GuitarTheoryEntry } from '@/curriculum/data/guitar/theoryCatalog';
import {
  readGenreKeyProgress,
  readGenreSections,
} from '@/curriculum/hooks/useGenreProgress';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';

// ── How far along Theory is ────────────────────────────────────────────────
// Read without loading any lesson. Piano's is on the server, a lesson per key.
// Guitar, bass and ukulele keep theirs on the device, per mode as they always
// have, and now per key beside it.

export interface TheoryProgress {
  /** A mode in one key, 0 to 100. */
  keyPercent: (entry: GuitarTheoryEntry, key: string) => number;
  /** A mode as a whole: its best key, or its own record. */
  modePercent: (entry: GuitarTheoryEntry) => number;
}

/** What progress summaries hold, as far as this needs them. */
export interface LessonSummaryLike {
  lessonId: string;
  lessonVersion?: number | null;
  mode?: string | null;
  root?: string | null;
  completedCount?: number | null;
  totalCount?: number | null;
  currentActivityInstanceId?: string | null;
}

const place = (mode: string, key: string) =>
  `${mode.toLowerCase()}:${keyLabelToUrlParam(key)}`;

/** Piano's lessons by mode and key. Old and current versions both count. */
function pianoPercents(lessons: readonly LessonSummaryLike[]) {
  const percents = new Map<string, number>();
  for (const lesson of lessons) {
    if (!lesson.lessonId.startsWith('mode-lesson-flow')) continue;
    if (lesson.lessonVersion !== 1 && lesson.lessonVersion !== 2) continue;
    let mode = lesson.mode ?? null;
    let root = lesson.root ?? null;
    const activity = lesson.currentActivityInstanceId?.split('::');
    if ((!mode || !root) && activity && activity.length >= 5) {
      mode = mode ?? activity[3];
      root = root ?? activity[4];
    }
    if ((!mode || !root) && lesson.lessonId.startsWith('mode-lesson-flow__')) {
      const scoped = lesson.lessonId.split('__');
      if (scoped.length >= 3) {
        root = root ?? urlParamToKeyLabel(scoped[1]);
        mode = mode ?? scoped[2];
      }
    }
    const completed = lesson.completedCount ?? 0;
    if (!mode || !root || completed <= 0) continue;
    const total = lesson.totalCount ?? 0;
    const percent =
      total > 0 ? Math.max(1, Math.round((completed / total) * 100)) : 1;
    const at = place(mode, root);
    percents.set(at, Math.max(percents.get(at) ?? 0, Math.min(100, percent)));
  }
  return percents;
}

/** The sections a fretted lesson has. Scales without chords have no B. */
export const frettedSections = (entry: GuitarTheoryEntry) =>
  entry.hasChords ? (['A', 'B', 'D'] as const) : (['A', 'D'] as const);

const LEVEL = 1;

function frettedKeyPercent(entry: GuitarTheoryEntry, key: string) {
  const record = readGenreKeyProgress(entry.genre, LEVEL, key);
  const sections = frettedSections(entry);
  const shares = sections.map((section) => {
    const s = record.sections[section];
    return s && s.total > 0 ? Math.min(1, s.passed / s.total) : 0;
  });
  const percent = Math.round(
    (shares.reduce((sum, share) => sum + share, 0) / sections.length) * 100,
  );
  // Started before keys were tracked: known to have begun, no more than that.
  return percent > 0 ? percent : record.started ? 1 : 0;
}

function frettedModePercent(entry: GuitarTheoryEntry) {
  const record = readGenreSections(entry.genre, LEVEL);
  const sections = frettedSections(entry);
  const shares = sections.map((section) => {
    const s = record.sections[section];
    return s && s.stepsTotal > 0
      ? Math.min(1, s.stepsCompleted / s.stepsTotal)
      : 0;
  });
  const percent = Math.round(
    (shares.reduce((sum, share) => sum + share, 0) / sections.length) * 100,
  );
  return percent > 0 ? percent : record.started ? 1 : 0;
}

/** Theory's progress on an instrument. */
export function theoryProgress(
  instrument: LearnInstrument,
  pianoLessons: readonly LessonSummaryLike[] = [],
): TheoryProgress {
  if (instrument === 'piano') {
    const percents = pianoPercents(pianoLessons);
    return {
      keyPercent: (entry, key) => percents.get(place(entry.slug, key)) ?? 0,
      modePercent: (entry) => {
        let best = 0;
        for (const [at, percent] of percents) {
          if (at.startsWith(`${entry.slug.toLowerCase()}:`)) {
            best = Math.max(best, percent);
          }
        }
        return best;
      },
    };
  }
  return {
    keyPercent: frettedKeyPercent,
    modePercent: frettedModePercent,
  };
}
