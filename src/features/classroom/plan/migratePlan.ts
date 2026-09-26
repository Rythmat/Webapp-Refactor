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
import type { Day, Unit } from '../types';

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
];
