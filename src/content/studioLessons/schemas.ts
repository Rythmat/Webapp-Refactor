import { z } from 'zod';
import { CHECK_NAMES } from './checkCatalog';

/**
 * The `studio_lesson` content kind's body: one Studio Production lesson, as
 * the console's lesson editor writes it into src/curriculum/data/studioLessons/
 * (docs/studio-lesson-content-kind.md).
 *
 * The lessons that shipped first are code (src/daw/components/Tutorial), their
 * checks functions over the Studio's store. A file here with a code lesson's
 * id replaces that lesson; one with a new id is a new lesson. Either way the
 * steps are data, and what makes a step pass is one of three things:
 *
 *   { kind: 'code', lesson, step }   the check a code lesson's step has, by
 *                                    its lesson and step id. Every step of a
 *                                    code lesson opens in the editor as this,
 *                                    so rewording, reordering or retargeting
 *                                    it keeps what it detects.
 *   { kind: 'named', name, params }  a ready-made check (checkCatalog.ts),
 *                                    with its parameters.
 *   no check                         the step advances on Next.
 *
 * A step's "watch me" demo is code only for now: `{ kind: 'code' }` keeps a
 * code step's demo.
 */

const status = z.enum(['draft', 'live']);

/** Lesson and step ids: lowercase words and dashes, as the code's are. */
const ID = /^[a-z0-9][a-z0-9-]*$/;
const id = z.string().regex(ID, 'Lowercase letters, digits and dashes.');

export const STUDIO_LESSON_DIFFICULTIES = [
  'Beginner',
  'Intermediate',
  'Advanced',
] as const;

/** The Studio views a step may open on (uiSlice ViewType). */
export const STUDIO_LESSON_VIEWS = [
  'arrange',
  'studio',
  'score',
  'leadsheet',
  'practice',
] as const;

/** The dock tabs a step may open (uiSlice ChannelStripTabId). */
export const STUDIO_LESSON_DOCK_TABS = [
  'controls',
  'fx',
  'prism',
  'piano-roll',
] as const;

/** The side-rail panels a step may open (layoutModel INSPECTOR_PANELS). */
export const STUDIO_LESSON_PANELS = [
  'insight',
  'library',
  'lessons',
  'people',
] as const;

/** The courses a lesson may belong to (tutorialCatalog TutorialCourseId). */
export const STUDIO_LESSON_COURSES = ['studio-production'] as const;

/** Which effect rack an `fx-add-*` target means: a track's, Master's, a return's. */
const rack = z.union([
  z.literal('track'),
  z.literal('master'),
  z.string().regex(/^return:[A-Z]$/),
]);

/** The Mix view's rack a step opens: Master's or a return's. */
const mixRack = z.union([
  z.object({ kind: z.literal('master') }).strict(),
  z.object({ kind: z.literal('return'), id: z.enum(['A', 'B']) }).strict(),
]);

const requires = z
  .object({
    view: z.enum(STUDIO_LESSON_VIEWS).optional(),
    libraryOpen: z.boolean().optional(),
    channelStripTab: z.enum(STUDIO_LESSON_DOCK_TABS).nullable().optional(),
    clearClipSelection: z.boolean().optional(),
    automationParam: z.string().min(1).optional(),
    effectsLibrary: z.boolean().optional(),
    soundsOpen: z.boolean().optional(),
    mixRack: mixRack.optional(),
    promptOpen: z.boolean().optional(),
    inspector: z.enum(STUDIO_LESSON_PANELS).optional(),
  })
  .strict();

const codeRef = z
  .object({ kind: z.literal('code'), lesson: id, step: id })
  .strict();

const param = z.union([z.string(), z.number(), z.boolean()]);

export const checkSpecSchema = z.union([
  codeRef,
  z
    .object({
      kind: z.literal('named'),
      name: z.enum(CHECK_NAMES),
      params: z.record(z.string(), param),
    })
    .strict(),
]);

const target = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export const studioLessonStepSchema = z
  .object({
    id,
    /** The coach card's section label: "STAGE 2 — KEY". */
    stage: z.string(),
    /** The instruction; **bold** with double asterisks. */
    instruction: z.string().min(1),
    /** Why the step matters, in one plain sentence. */
    why: z.string().optional(),
    hint: z.string().optional(),
    /** Anchor id(s) to spotlight; the first on screen wins. None: a centred card. */
    target: target.optional(),
    rack: rack.optional(),
    requires: requires.optional(),
    check: checkSpecSchema.optional(),
    demo: codeRef.optional(),
  })
  .strict();

export const studioLessonSchema = z
  .object({
    id,
    title: z.string().min(1),
    subtitle: z.string(),
    difficulty: z.enum(STUDIO_LESSON_DIFFICULTIES),
    estMinutes: z.number().int().min(1).max(60),
    requiresPremium: z.boolean(),
    course: z.enum(STUDIO_LESSON_COURSES).optional(),
    courseOrder: z.number().int().min(1).optional(),
    /** The demo song a cold start opens it on (demoProjects.ts). */
    seed: z.string().min(1).optional(),
    status,
    steps: z.array(studioLessonStepSchema).min(1),
  })
  .strict()
  .superRefine((lesson, ctx) => {
    const seen = new Set<string>();
    lesson.steps.forEach((step, i) => {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', i, 'id'],
          message: `Step id "${step.id}" is used twice.`,
        });
      }
      seen.add(step.id);
    });
    if ((lesson.course === undefined) !== (lesson.courseOrder === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courseOrder'],
        message: 'A course lesson needs its place in the course, and only one.',
      });
    }
  });

export type StudioLessonCheckSpec = z.infer<typeof checkSpecSchema>;
export type StudioLessonStep = z.infer<typeof studioLessonStepSchema>;
export type StudioLesson = z.infer<typeof studioLessonSchema>;
export type StudioLessonStatus = z.infer<typeof status>;
