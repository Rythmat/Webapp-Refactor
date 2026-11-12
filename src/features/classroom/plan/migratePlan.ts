/**
 * Plan store v1 → v2: give every Day a `classroomId`.
 *
 * Days used to live in one global bucket while annual plans were already per
 * classroom. That mismatch is the source of two live data bugs — a cross-
 * classroom "Reset" wipe, and orphan Days being adopted by whichever classroom
 * rendered Lessons first — so the migration's whole job is to recover the
 * ownership that was never recorded.
 *
 * Resolution order, most to least certain:
 *   1. A Unit's `dayIds` references the Day → that Unit's classroom owns it.
 *      This is real evidence and is always preferred.
 *   2. Exactly ONE classroom has an annual plan at all → it owns everything
 *      else. A single-section teacher cannot have meant anything else.
 *   3. Otherwise `null` — UNASSIGNED. Never guessed. Unassigned Days surface in
 *      a visible tray so the teacher can place them; silently attaching them to
 *      an arbitrary classroom is the bug, not the fix.
 *
 * Pure: the annual store arrives through the harness's `context`, so this is
 * fixture-testable with no storage and no React.
 */
import type { MigrationStep } from '@/lib/local-store/migrations';
import {
  CORTEX_LESSON_TEMPLATE_ID,
  projectMenuSlide,
} from '../slides/cortex/buildDeck';
import { COPY } from '../slides/cortex/copy';
import type { Slide } from '../slides/types';
import type { Day, Interaction, Unit } from '../types';

export interface PlanV1 {
  schemaVersion: number;
  days: Record<string, Day>;
}

export interface PlanV2 {
  schemaVersion: number;
  days: Record<string, Day>;
}

/** The slice of the annual store this migration needs. */
export interface AnnualPlansForMigration {
  plans: Record<
    string,
    { classroomId: string; year?: { semesters?: Record<string, Unit[]> } }
  >;
}

/** dayId → classroomId, from every Unit's `dayIds` across every classroom. */
export const buildDayOwnership = (
  annual: AnnualPlansForMigration | null | undefined,
): Record<string, string> => {
  const owner: Record<string, string> = {};
  const plans = annual?.plans ?? {};
  for (const plan of Object.values(plans)) {
    const semesters = plan?.year?.semesters ?? {};
    for (const units of Object.values(semesters)) {
      for (const unit of units ?? []) {
        for (const dayId of unit?.dayIds ?? []) {
          // First writer wins; a Day referenced by two classrooms is already
          // corrupt, and re-pointing it on each pass would be non-deterministic.
          if (dayId && !(dayId in owner)) owner[dayId] = plan.classroomId;
        }
      }
    }
  }
  return owner;
};

export const migratePlanV1toV2 = (
  plan: PlanV1,
  annual: AnnualPlansForMigration | null | undefined,
): PlanV2 => {
  const owner = buildDayOwnership(annual);
  const classroomIds = Object.keys(annual?.plans ?? {});
  const soleClassroom = classroomIds.length === 1 ? classroomIds[0] : null;

  return {
    schemaVersion: 2,
    days: Object.fromEntries(
      Object.entries(plan.days ?? {}).map(([id, day]) => [
        id,
        {
          ...day,
          classroomId: owner[id] ?? soleClassroom ?? null,
        },
      ]),
    ),
  };
};

// ── v2 → v3: the Individual Project's five places (owner, 2026-11-11) ──────
// A Cortex lesson saved before the five places opened only the Studio's
// project library on its Individual Project slide: an app-route slide with a
// Studio activity, or (a new lesson's) one "Open my projects" tile. That
// slide becomes the five places' menu, keeping its id, its timer and a title
// the teacher wrote; the Studio activity behind it goes from its cell. Every
// other slide, and any slide a teacher has made their own, stays as it was.
// Idempotent, so a backup restored later can run it again.

const LIBRARY_REF = 'studio:library';
const SLIDE_SUFFIX = '-slide-project';

/** The old Individual Project slide, in either of its two shapes. */
const isOldProjectSlide = (slide: Slide, interactions: Interaction[]) => {
  if (!slide.id.endsWith(SLIDE_SUFFIX)) return false;
  if (slide.kind === 'app-route') {
    const ix = interactions.find((i) => i.id === slide.interactionId);
    return ix?.atlas?.activityRef === LIBRARY_REF;
  }
  if (slide.kind === 'content') {
    const tiles = slide.launchTiles ?? [];
    return tiles.length === 1 && tiles[0].activityRef === LIBRARY_REF;
  }
  return false;
};

/** One Day, its old Individual Project slide made the five places' menu. */
export const withProjectPlaces = (day: Day): Day => {
  const deck = day.deck;
  if (deck?.templateRef?.templateId !== CORTEX_LESSON_TEMPLATE_ID) return day;
  const cell = day.cells?.creativeProjects;
  const interactions = cell?.presentation.interactions ?? [];
  const dropped = new Set<string>();
  let changed = false;
  const slides = deck.slides.map((slide) => {
    if (!isOldProjectSlide(slide, interactions)) return slide;
    changed = true;
    if (slide.kind === 'app-route') dropped.add(slide.interactionId);
    const prefix = slide.id.slice(0, -SLIDE_SUFFIX.length);
    const menu = projectMenuSlide(prefix);
    const ownTitle =
      slide.title.en.trim() && slide.title.en !== COPY.projectTitle.en;
    return {
      ...menu,
      id: slide.id,
      ...(ownTitle ? { title: slide.title } : {}),
      ...(slide.timerSec ? { timerSec: slide.timerSec } : {}),
    } as Slide;
  });
  if (!changed) return day;
  return {
    ...day,
    deck: { ...deck, slides },
    cells:
      cell && dropped.size
        ? {
            ...day.cells,
            creativeProjects: {
              ...cell,
              presentation: {
                ...cell.presentation,
                interactions: interactions.filter((i) => !dropped.has(i.id)),
              },
            },
          }
        : day.cells,
  };
};

export const migratePlanV2toV3 = (plan: PlanV2): PlanV2 => ({
  schemaVersion: 3,
  days: Object.fromEntries(
    Object.entries(plan.days ?? {}).map(([id, day]) => [
      id,
      withProjectPlaces(day),
    ]),
  ),
});

/** The step chain `useLocalPlan` hands to `migrateStoredValue`. */
export const PLAN_MIGRATIONS: MigrationStep[] = [
  {
    from: 1,
    to: 2,
    describe: 'plan v1→v2: scope every Day to its classroom',
    migrate: (value, ctx) =>
      migratePlanV1toV2(
        value as PlanV1,
        ctx.annual as AnnualPlansForMigration | null,
      ),
  },
  {
    from: 2,
    to: 3,
    describe: 'plan v2→v3: the Individual Project offers the five places',
    migrate: (value) => migratePlanV2toV3(value as PlanV2),
  },
];
