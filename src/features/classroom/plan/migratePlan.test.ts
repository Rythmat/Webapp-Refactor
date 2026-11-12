/**
 * Plan v1→v2 golden fixtures.
 *
 * The three resolution cases the migration promises — referenced by a Unit,
 * single-classroom fallback, and genuinely unassigned — plus idempotency. These
 * are pure: no storage, no React, which is the whole reason the migration takes
 * the annual store as an argument instead of reading it.
 */
import { describe, expect, it } from 'vitest';
import { CORTEX_LESSON_TEMPLATE_ID } from '../slides/cortex/buildDeck';
import type { Slide } from '../slides/types';
import type { Day, Interaction } from '../types';
import {
  buildDayOwnership,
  migratePlanV1toV2,
  migratePlanV2toV3,
  withProjectPlaces,
  type AnnualPlansForMigration,
  type PlanV1,
} from './migratePlan';
import { newBlankDay } from './newBlankDay';

const day = (id: string): Day =>
  ({ id, label: id, cells: {} }) as unknown as Day;

const planV1 = (...ids: string[]): PlanV1 => ({
  schemaVersion: 1,
  days: Object.fromEntries(ids.map((id) => [id, day(id)])),
});

/** Two classrooms; A's autumn Unit references d1, B's references d2. */
const TWO_CLASSROOMS: AnnualPlansForMigration = {
  plans: {
    'class-a': {
      classroomId: 'class-a',
      year: {
        semesters: {
          autumn: [{ id: 'u1', dayIds: ['d1'] }],
          spring: [],
        } as never,
      },
    },
    'class-b': {
      classroomId: 'class-b',
      year: {
        semesters: {
          autumn: [{ id: 'u2', dayIds: ['d2'] }],
          spring: [],
        } as never,
      },
    },
  },
};

const ONE_CLASSROOM: AnnualPlansForMigration = {
  plans: {
    'class-a': {
      classroomId: 'class-a',
      year: { semesters: { autumn: [], spring: [] } as never },
    },
  },
};

describe('buildDayOwnership', () => {
  it('maps every referenced dayId to its owning classroom', () => {
    expect(buildDayOwnership(TWO_CLASSROOMS)).toEqual({
      d1: 'class-a',
      d2: 'class-b',
    });
  });

  it('is deterministic when two classrooms claim the same Day — first wins', () => {
    const contested: AnnualPlansForMigration = {
      plans: {
        'class-a': {
          classroomId: 'class-a',
          year: {
            semesters: { autumn: [{ id: 'u1', dayIds: ['dx'] }] } as never,
          },
        },
        'class-b': {
          classroomId: 'class-b',
          year: {
            semesters: { autumn: [{ id: 'u2', dayIds: ['dx'] }] } as never,
          },
        },
      },
    };
    expect(buildDayOwnership(contested).dx).toBe('class-a');
    expect(buildDayOwnership(contested)).toEqual(buildDayOwnership(contested));
  });

  it('tolerates a missing/!empty annual store', () => {
    expect(buildDayOwnership(null)).toEqual({});
    expect(buildDayOwnership({ plans: {} })).toEqual({});
  });
});

describe('migratePlanV1toV2 — the three resolution cases', () => {
  it('CASE 1: a Day referenced by a Unit belongs to that Unit’s classroom', () => {
    const out = migratePlanV1toV2(planV1('d1', 'd2'), TWO_CLASSROOMS);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.d2.classroomId).toBe('class-b');
    expect(out.schemaVersion).toBe(2);
  });

  it('CASE 2: with exactly one classroom, everything else belongs to it', () => {
    const out = migratePlanV1toV2(planV1('d1', 'd9'), ONE_CLASSROOM);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.d9.classroomId).toBe('class-a');
  });

  it('CASE 3: unreferenced, multiple classrooms → UNASSIGNED, never guessed', () => {
    const out = migratePlanV1toV2(planV1('d1', 'orphan'), TWO_CLASSROOMS);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.orphan.classroomId).toBeNull();
  });

  it('no annual store at all → everything unassigned', () => {
    const out = migratePlanV1toV2(planV1('a', 'b'), null);
    expect(out.days.a.classroomId).toBeNull();
    expect(out.days.b.classroomId).toBeNull();
  });

  it('preserves every other Day field', () => {
    const src = planV1('d1');
    src.days.d1 = {
      ...src.days.d1,
      label: 'Blues Day',
      scheduledDate: '2026-09-14',
      sourceSeedId: 'seed-7',
    } as Day;
    const out = migratePlanV1toV2(src, ONE_CLASSROOM);
    expect(out.days.d1.label).toBe('Blues Day');
    expect(out.days.d1.scheduledDate).toBe('2026-09-14');
    expect(out.days.d1.sourceSeedId).toBe('seed-7');
  });

  it('is idempotent — re-running does not re-home an already-scoped Day', () => {
    const once = migratePlanV1toV2(planV1('d1', 'orphan'), TWO_CLASSROOMS);
    const twice = migratePlanV1toV2(once as PlanV1, TWO_CLASSROOMS);
    expect(twice.days).toEqual(once.days);
  });

  it('never mutates the input', () => {
    const src = planV1('d1');
    const before = JSON.stringify(src);
    migratePlanV1toV2(src, TWO_CLASSROOMS);
    expect(JSON.stringify(src)).toBe(before);
  });

  it('handles an empty plan', () => {
    expect(migratePlanV1toV2(planV1(), TWO_CLASSROOMS).days).toEqual({});
  });
});

describe('plan v2→v3 — the Individual Project offers the five places', () => {
  const FIVE = [
    'learn:home',
    'learn:songs',
    'studio:library',
    'studio:editor',
    'globe:home',
  ];

  /** A Cortex lesson as generated before the five places. */
  const oldGenerated = (): Day => {
    const fresh = newBlankDay('Michael Jackson');
    const prefix = `${fresh.id}-cx-old`;
    const project: Interaction = {
      id: `${prefix}-ix-project`,
      type: 'atlas',
      question: { en: 'Work on your own project in the Studio.' },
      shareable: false,
      atlas: {
        module: 'studio',
        activityRef: 'studio:library',
        expects: 'artifact',
      },
    };
    const keep: Interaction = {
      id: 'teacher-own',
      type: 'text',
      question: { en: 'Anything else?' },
      shareable: false,
      text: { maxLen: 100 },
    };
    return {
      ...fresh,
      cells: {
        ...fresh.cells,
        creativeProjects: {
          ...fresh.cells.creativeProjects,
          presentation: {
            ...fresh.cells.creativeProjects.presentation,
            interactions: [project, keep],
          },
        },
      },
      deck: {
        id: `${prefix}-deck`,
        title: { en: 'Michael Jackson' },
        templateRef: {
          templateId: CORTEX_LESSON_TEMPLATE_ID,
          focusId: 'artist:michael-jackson',
        },
        slides: [
          {
            id: `${prefix}-slide-group`,
            kind: 'content',
            phase: 'groupPractice',
            section: 'groupProject',
            title: { en: 'Group Project' },
          },
          {
            id: `${prefix}-slide-project`,
            kind: 'app-route',
            phase: 'creativeProjects',
            section: 'individualProject',
            presetId: 'hero',
            title: { en: 'Individual Project' },
            interactionId: project.id,
            timerSec: 1200,
          },
        ],
      } as Day['deck'],
    };
  };

  it('makes the old Studio slide the five places, keeping its id and timer', () => {
    const before = oldGenerated();
    const after = withProjectPlaces(before);
    const project = after.deck!.slides[1];
    expect(project).toMatchObject({
      id: before.deck!.slides[1].id,
      kind: 'content',
      presetId: 'project-menu',
      section: 'individualProject',
      timerSec: 1200,
      title: { en: 'Where will you work today?' },
    });
    expect(
      project.kind === 'content'
        ? project.launchTiles?.map((t) => t.activityRef)
        : [],
    ).toEqual(FIVE);
    // The Studio activity behind it goes; the teacher's own stays.
    expect(
      after.cells.creativeProjects.presentation.interactions?.map((i) => i.id),
    ).toEqual(['teacher-own']);
    // Every other slide as it was.
    expect(after.deck!.slides[0]).toBe(before.deck!.slides[0]);
  });

  it('upgrades a new lesson’s single library tile too', () => {
    const fresh = newBlankDay('Blank');
    const old: Day = {
      ...fresh,
      deck: {
        ...fresh.deck!,
        slides: fresh.deck!.slides.map((s) =>
          s.section === 'individualProject'
            ? ({
                ...s,
                title: { en: 'Individual Project' },
                launchTiles: [
                  {
                    id: 't',
                    module: 'studio',
                    activityRef: 'studio:library',
                  },
                ],
              } as typeof s)
            : s,
        ),
      },
    };
    const project = withProjectPlaces(old).deck!.slides.find(
      (s) => s.section === 'individualProject',
    );
    expect(
      project?.kind === 'content'
        ? project.launchTiles?.map((t) => t.activityRef)
        : [],
    ).toEqual(FIVE);
  });

  it('keeps a title the teacher wrote', () => {
    const before = oldGenerated();
    before.deck!.slides[1] = {
      ...before.deck!.slides[1],
      title: { en: 'Your own track' },
    };
    expect(withProjectPlaces(before).deck!.slides[1].title).toEqual({
      en: 'Your own track',
    });
  });

  it('leaves alone a slide the teacher remade, a non-Cortex deck, and itself', () => {
    const remade = oldGenerated();
    const slide = remade.deck!.slides[1];
    remade.deck!.slides[1] = {
      ...slide,
      kind: 'content',
      launchTiles: [
        { id: 'a', module: 'arcade', activityRef: 'arcade:chroma' },
      ],
    } as Slide;
    expect(withProjectPlaces(remade)).toBe(remade);

    const plain = oldGenerated();
    plain.deck = { ...plain.deck!, templateRef: undefined };
    expect(withProjectPlaces(plain)).toBe(plain);

    const once = withProjectPlaces(oldGenerated());
    expect(withProjectPlaces(once)).toBe(once);
  });

  it('runs as the plan’s v2→v3 step', () => {
    const d = oldGenerated();
    const out = migratePlanV2toV3({ schemaVersion: 2, days: { [d.id]: d } });
    expect(out.schemaVersion).toBe(3);
    expect(out.days[d.id].deck!.slides[1].kind).toBe('content');
  });
});
