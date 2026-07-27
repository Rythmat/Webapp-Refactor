/**
 * buildCurriculumCoverage (Phase 4) — derive the curriculum lessons a deck
 * covers (from templateRef.gcmKey + app-route atlas activityRefs), then match
 * them against a progress summary to a completion %.
 *
 * IMPORTANT: `useProgressSummary` is PER-ACCOUNT (the caller's own token) — the
 * backend has no per-student or classroom-scoped progress endpoint. So the
 * percentages reflect the SIGNED-IN user's own progress; the panel labels this
 * honestly. The lesson LIST itself (what the deck covers) is genuinely useful.
 * Pure + tested.
 */
import {
  CURRICULUM_GENRE_SLUGS,
  SLUG_TO_CURRICULUM_GENRE,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import type { ProgressSummaryLesson } from '@/lib/progress/types';
import type { DaySnapshot } from '../publish/publishDay';
import { interactionsForSlide } from '../slides/deck';
import { canonicalLessonKeyParam } from '../slides/resolveContentHref';

const LESSON_VERSION = 1;

export interface LessonRef {
  lessonId: string;
  mode?: string;
  root?: string;
  version: number;
  label: string;
  source: 'genre' | 'theory';
}

const toGenreId = (segment: string): CurriculumGenreId | null => {
  const upper = segment.toUpperCase();
  if (upper in CURRICULUM_GENRE_SLUGS) return upper as CurriculumGenreId;
  return SLUG_TO_CURRICULUM_GENRE[segment.toLowerCase()] ?? null;
};

const levelDigits = (segment: string): string | null => {
  const m = segment.match(/^L?(\d)$/i);
  return m ? m[1] : null;
};

/** Map an atlas activityRef to the progress-ledger lesson it feeds, or null. */
export const activityRefToLessonRef = (ref: string): LessonRef | null => {
  const parts = ref.split(':');
  if (parts[0] === 'curriculum') {
    const genre = toGenreId(parts[1] ?? '');
    const level = levelDigits(parts[2] ?? '');
    if (!genre || !level) return null;
    return {
      lessonId: `curriculum:${genre}:L${level}`,
      version: LESSON_VERSION,
      label: `${genre}:L${level}`,
      source: 'genre',
    };
  }
  if (parts[0] === 'learn') {
    const mode = parts[1];
    const key = parts[2];
    if (!mode || !key) return null;
    const root = canonicalLessonKeyParam(key);
    return {
      lessonId: 'mode-lesson-flow',
      mode,
      root,
      version: LESSON_VERSION,
      label: `Theory ${mode} / ${root}`,
      source: 'theory',
    };
  }
  return null;
};

/** gcmKey is already `GENRE:L#`. */
export const gcmKeyToLessonRef = (gcmKey: string): LessonRef | null =>
  activityRefToLessonRef(`curriculum:${gcmKey}`);

/** Collect the (de-duped) lesson refs a published deck covers. */
export const collectDeckLessonRefs = (
  snapshot: DaySnapshot | null | undefined,
): LessonRef[] => {
  const deck = snapshot?.deck;
  if (!snapshot || !deck) return [];
  const refs: LessonRef[] = [];
  if (deck.templateRef?.gcmKey) {
    const r = gcmKeyToLessonRef(deck.templateRef.gcmKey);
    if (r) refs.push(r);
  }
  for (const slide of deck.slides) {
    if (slide.kind !== 'app-route') continue;
    const ix = interactionsForSlide(snapshot, slide)[0];
    const ref = ix?.atlas?.activityRef;
    if (!ref) continue;
    const r = activityRefToLessonRef(ref);
    if (r) refs.push(r);
  }
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.lessonId}|${r.mode ?? ''}|${r.root ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface CoverageRow extends LessonRef {
  completedCount: number;
  totalCount: number | null;
  pct: number;
}

/** Match a lesson ref against the summary — exact lessonId, or the
 *  `mode-lesson-flow__…` prefix + mode + root (mirrors LearnInlet). */
const matchLesson = (
  summary: ProgressSummaryLesson[],
  ref: LessonRef,
): ProgressSummaryLesson | undefined =>
  summary.find((l) => {
    const exact = l.lessonId === ref.lessonId;
    const prefixed =
      ref.lessonId === 'mode-lesson-flow' &&
      l.lessonId.startsWith('mode-lesson-flow');
    if (!exact && !prefixed) return false;
    if (
      ref.mode !== undefined &&
      l.mode?.toLowerCase() !== ref.mode.toLowerCase()
    )
      return false;
    return (
      ref.root === undefined || l.root?.toLowerCase() === ref.root.toLowerCase()
    );
  });

export const buildCurriculumCoverage = (
  lessonRefs: LessonRef[],
  summary: ProgressSummaryLesson[],
): CoverageRow[] =>
  lessonRefs.map((ref) => {
    const lesson = matchLesson(summary, ref);
    const completedCount = lesson?.completedCount ?? 0;
    const totalCount = lesson?.totalCount ?? null;
    const pct = totalCount
      ? Math.round((completedCount / totalCount) * 100)
      : 0;
    return { ...ref, completedCount, totalCount, pct };
  });
