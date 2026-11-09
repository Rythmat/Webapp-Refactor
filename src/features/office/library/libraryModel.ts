import {
  applySeedToDay,
  insertActivityIntoCell,
  type ApplySeedConfig,
} from '@/features/classroom/content/applySeed';
import type {
  Activity,
  Clo,
  LessonSeed,
  Theme,
} from '@/features/classroom/content/types';
import { PHASE_FULL_NAMES, type PhaseKey } from '@/features/classroom/phases';
import { newBlankDay } from '@/features/classroom/plan/newBlankDay';
import { deckFromCells } from '@/features/classroom/slides/deckFromCells';
import type { Day } from '@/features/classroom/types';

// ── The Library (owner, 2026-11-09) ────────────────────────────────────────
// The teacher's warehouse: lesson seeds, themes, activities, learning goals
// and the idea bank, all to search and turn into lessons. Pure helpers, so
// the page and its tests agree.

export type LibrarySection =
  | 'seeds'
  | 'themes'
  | 'activities'
  | 'goals'
  | 'ideas';

export const SECTION_TITLE: Record<LibrarySection, string> = {
  seeds: 'Lesson seeds',
  themes: 'Themes',
  activities: 'Activities',
  goals: 'Learning goals',
  ideas: 'Idea bank',
};

export const isSection = (value: string | null): value is LibrarySection =>
  value !== null && value in SECTION_TITLE;

/** A learning goal in words: its statement, or its three awareness axes. */
export const goalText = (clo: Clo): string =>
  clo.type === 'content-language'
    ? clo.statement
    : [clo.awarenessOfFeeling, clo.awarenessOfTechnique, clo.awarenessOfContext]
        .filter(Boolean)
        .join(' ');

export const phaseName = (phase: PhaseKey | undefined) =>
  phase ? PHASE_FULL_NAMES[phase] : 'Any phase';

const has = (q: string, ...fields: (string | undefined | null)[]) =>
  fields.some((f) => f?.toLowerCase().includes(q));

/** Does an item match a search? Every word must appear somewhere in it. */
export const matches = (
  query: string,
  ...fields: (string | undefined | null)[]
) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => has(w, ...fields));
};

export const seedFields = (s: LessonSeed) => [
  s.title.en,
  s.description,
  ...s.tags,
  ...s.songs,
];
export const themeFields = (t: Theme) => [
  t.title.en,
  t.focus,
  ...t.essentialQuestions,
  ...t.suggestedArtists,
];
export const activityFields = (a: Activity) => [
  a.title.en,
  a.purpose,
  a.description,
  a.learningOutcome,
];

/** This month's theme, or the nearest one ahead of it. */
export const themeForMonth = (
  themes: readonly Theme[],
  month: number,
): Theme | undefined => {
  const monthly = themes.filter((t) => t.month !== null);
  for (let i = 0; i < 12; i += 1) {
    const m = ((month - 1 + i) % 12) + 1;
    const hit = monthly.find((t) => t.month === m);
    if (hit) return hit;
  }
  return undefined;
};

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * A new lesson from a seed or an activity, for a class and an optional
 * date. It starts from blank cells and NO deck, the seed fills the cells
 * (pedagogy on rationale only — applySeedToDay's firewall), and the slides
 * are then derived from those cells, so the deck matches what the seed
 * wrote. (Applying a seed to a lesson that already has slides leaves them
 * stale; that's why the Library makes a new lesson instead.)
 */
export const lessonFrom = (
  source:
    | { kind: 'seed'; seed: LessonSeed }
    | { kind: 'activity'; activity: Activity },
  opts: {
    classroomId: string;
    date: string | null;
    resolveActivityId: (id: string) => Activity | undefined;
    config?: ApplySeedConfig;
  },
): Day => {
  const label =
    source.kind === 'seed' ? source.seed.title.en : source.activity.title.en;
  // Blank cells, and no deck yet: the deck is derived below from what the
  // seed writes (newBlankDay's skeleton would ignore it).
  const blank = newBlankDay(label);
  const base: Day = {
    ...blank,
    deck: undefined,
    classroomId: opts.classroomId,
    scheduledDate: opts.date,
  };
  const filled =
    source.kind === 'seed'
      ? applySeedToDay(source.seed, base, {
          mode: 'replace',
          resolveActivityId: opts.resolveActivityId,
          config: opts.config,
        })
      : {
          ...base,
          cells: {
            ...base.cells,
            [source.activity.phase]: insertActivityIntoCell(
              source.activity,
              base.cells[source.activity.phase],
            ),
          },
        };
  return { ...filled, deck: deckFromCells(filled) };
};
