/**
 * The Music Literacy editor's edits to a lesson as a whole: its steps' tags,
 * adding (of any kind), duplicating, moving and removing steps, their
 * sections, the passes the lesson and a step offer, a new lesson's id, the
 * schema's problems in a teacher's words, the body laid out as its file is,
 * key by key, and where the lesson goes (its Learn page, its download).
 *
 * No React here.
 */

import {
  isChordFigure,
  isEchoStep,
  musicLiteracyBodySchema,
  type LiteracyChordFigure,
  type LiteracyFigure,
  type LiteracyLessonPasses,
  type LiteracyNote,
  type LiteracyStep,
  type LiteracyStepPasses,
  type LiteracyWord,
  type LiteracyWords,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { MIRROR_BASE } from '../content/mirror/mirrorPaths';
import { choiceInfo, newStepOfChoice, type StepChoice } from './literacyKinds';

// ── Tags and ids ───────────────────────────────────────────────────────────

/** Lowercase words joined by hyphens: a step's tag, a lesson's id. */
export function kebab(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/♭/g, 'b')
    .replace(/[♯#]/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `base`, or `base-2`, `base-3`… whichever is not taken. */
export function unique(base: string, taken: ReadonlySet<string>): string {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** A tag made from a step's title, unique among the lesson's other steps. */
export function tagFor(
  title: string,
  steps: readonly LiteracyStep[],
  except?: number,
): string {
  const taken = new Set(
    steps.filter((_, i) => i !== except).map((step) => step.tag),
  );
  return unique(kebab(title) || 'step', taken);
}

/** A new lesson's id, made from its name and free among the lessons. */
export function lessonIdFor(
  name: string,
  lessons: readonly Pick<MusicLiteracyLesson, 'id'>[],
): string {
  return unique(
    kebab(name) || 'music-literacy',
    new Set(lessons.map((l) => l.id)),
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

/**
 * A new title for a step. A tag the lesson was last saved with stays, since
 * students' progress keys off it; a step not saved yet takes its tag from
 * the new title.
 */
export function renameStep(
  lesson: MusicLiteracyLesson,
  index: number,
  title: string,
  savedTags: ReadonlySet<string>,
): MusicLiteracyLesson {
  return {
    ...lesson,
    steps: lesson.steps.map((step, i) =>
      i !== index
        ? step
        : {
            ...step,
            title,
            tag: savedTags.has(step.tag)
              ? step.tag
              : tagFor(title, lesson.steps, index),
          },
    ),
  };
}

/** Whether the lesson's melodies have words: a new one follows them. */
const usesWords = (lesson: MusicLiteracyLesson) =>
  lesson.steps.some((step) => isEchoStep(step) && step.words) ||
  !lesson.steps.some(isEchoStep);

/**
 * A new step of a kind (Add step's menu), put in at `at` (left out: the
 * end) in `section` (left out: the section of the step before it). A
 * melody has words when the lesson's do; a choose-chords step saves under
 * a name of its own; a replay plays the last progression saved before it.
 */
export function addStepOfChoice(
  lesson: MusicLiteracyLesson,
  choice: StepChoice,
  at = lesson.steps.length,
  section?: string | null,
): MusicLiteracyLesson {
  const title = choiceInfo(choice).title ?? `Step ${lesson.steps.length + 1}`;
  const tag = tagFor(title, lesson.steps);
  const before = lesson.steps.slice(0, at);
  const lastSaved = before
    .filter((step) => step.kind === 'chooseChords')
    .at(-1);
  let step = newStepOfChoice(choice, tag, title, {
    words: usesWords(lesson),
    progression:
      lastSaved?.kind === 'chooseChords' ? lastSaved.saveAs : undefined,
  });
  if (step.kind === 'chooseChords') {
    const names = new Set(
      lesson.steps.flatMap((s) =>
        s.kind === 'chooseChords' ? [s.saveAs] : [],
      ),
    );
    step = { ...step, saveAs: unique(step.saveAs, names) };
  }
  const label = section === undefined ? before.at(-1)?.section : section;
  return {
    ...lesson,
    steps: [
      ...before,
      withSection(step, label ?? undefined),
      ...lesson.steps.slice(at),
    ],
  };
}

/** A new melody at the end: Part 1's Add step. */
export const addStep = (lesson: MusicLiteracyLesson) =>
  addStepOfChoice(lesson, 'melody');

/** A copy of a step right after it, under a title and tag of its own. */
export function duplicateStep(
  lesson: MusicLiteracyLesson,
  index: number,
): MusicLiteracyLesson {
  const source = lesson.steps[index];
  const title = `${source.title} (copy)`;
  const copy: LiteracyStep = {
    ...structuredClone(source),
    title,
    tag: tagFor(title, lesson.steps),
  };
  return {
    ...lesson,
    steps: [
      ...lesson.steps.slice(0, index + 1),
      copy,
      ...lesson.steps.slice(index + 1),
    ],
  };
}

/** A step in a section, or in none (`section` left out or empty). */
export function withSection<S extends LiteracyStep>(
  step: S,
  section: string | undefined,
): S {
  const next = { ...step };
  if (section?.trim()) next.section = section.trim();
  else delete next.section;
  return next;
}

const sameSection = (a: LiteracyStep, b: LiteracyStep) =>
  (a.section ?? null) === (b.section ?? null);

/**
 * Where a step goes moved one place up (-1) or down (1): past its
 * neighbor, in its own section; across a section's edge, into the next
 * section, staying where it is in the list (so the first step of a
 * section moved up becomes the last of the one above). Null at either end.
 */
export function stepMove(
  lesson: Pick<MusicLiteracyLesson, 'steps'>,
  index: number,
  delta: number,
): { to: number; section: string | undefined } | null {
  const step = lesson.steps[index];
  const neighbor = lesson.steps[index + delta];
  if (!step || !neighbor) return null;
  return sameSection(step, neighbor)
    ? { to: index + delta, section: step.section }
    : { to: index, section: neighbor.section };
}

export function moveStep(
  lesson: MusicLiteracyLesson,
  index: number,
  delta: number,
): MusicLiteracyLesson {
  const move = stepMove(lesson, index, delta);
  if (!move) return lesson;
  return moveStepTo(lesson, index, move.to, move.section);
}

/**
 * A step taken out and put back in at `to` (its index once moved), in
 * `section`: a drag's drop, or a move.
 */
export function moveStepTo(
  lesson: MusicLiteracyLesson,
  from: number,
  to: number,
  section: string | undefined,
): MusicLiteracyLesson {
  const step = lesson.steps[from];
  if (!step) return lesson;
  const moved = sameSection(step, { ...step, section })
    ? step
    : withSection(step, section);
  if (to === from && moved === step) return lesson;
  const steps = lesson.steps.filter((_, i) => i !== from);
  steps.splice(Math.max(0, Math.min(to, steps.length)), 0, moved);
  return { ...lesson, steps };
}

/** Where an index lands when the step at `from` moves to `to`. */
export function indexAfterMove(index: number, from: number, to: number) {
  if (index === from) return to;
  if (from < index && index <= to) return index - 1;
  if (to <= index && index < from) return index + 1;
  return index;
}

/** The lesson's section labels, each once, in order. */
export const sectionNames = (lesson: Pick<MusicLiteracyLesson, 'steps'>) => [
  ...new Set(lesson.steps.flatMap((step) => step.section ?? [])),
];

/** A run of steps (a section's, by index) given a new label, or none. */
export function renameSection(
  lesson: MusicLiteracyLesson,
  indices: readonly number[],
  name: string,
): MusicLiteracyLesson {
  return {
    ...lesson,
    steps: lesson.steps.map((step, i) =>
      indices.includes(i) ? withSection(step, name) : step,
    ),
  };
}

export function removeStep(
  lesson: MusicLiteracyLesson,
  index: number,
): MusicLiteracyLesson {
  return { ...lesson, steps: lesson.steps.filter((_, i) => i !== index) };
}

/** A change to one step: fields of its own kind (the editor's to keep so). */
export function patchStep<S extends LiteracyStep>(
  lesson: MusicLiteracyLesson,
  index: number,
  patch: Partial<S>,
): MusicLiteracyLesson {
  return {
    ...lesson,
    steps: lesson.steps.map((step, i) =>
      i === index ? ({ ...step, ...patch } as LiteracyStep) : step,
    ),
  };
}

// ── Passes ─────────────────────────────────────────────────────────────────

/**
 * What a lesson's echo steps offer when it says nothing: the challenge on
 * and the create pass off, Part 1's.
 */
export const LESSON_PASS_DEFAULTS = { challenge: true, create: false } as const;

export type PassName = keyof typeof LESSON_PASS_DEFAULTS;

/**
 * The lesson's passes with one turned on or off; a pass at its default is
 * left out, so a Part 1 file that never turned one gains nothing.
 */
export function withLessonPass(
  lesson: MusicLiteracyLesson,
  pass: PassName,
  on: boolean,
): MusicLiteracyLesson {
  const next: LiteracyLessonPasses = { ...lesson.passes };
  if (on === LESSON_PASS_DEFAULTS[pass]) delete next[pass];
  else next[pass] = on;
  const out = { ...lesson };
  if (Object.keys(next).length) out.passes = next;
  else delete out.passes;
  return out;
}

/** Whether the lesson offers a pass, its default when it says nothing. */
export const lessonPass = (
  lesson: Pick<MusicLiteracyLesson, 'passes'>,
  pass: PassName,
): boolean => lesson.passes?.[pass] ?? LESSON_PASS_DEFAULTS[pass];

/**
 * A step's own passes with one set (true, false) or back to the lesson's
 * (undefined); undefined when it sets none.
 */
export function withStepPass<K extends keyof LiteracyStepPasses>(
  passes: LiteracyStepPasses | undefined,
  pass: K,
  value: LiteracyStepPasses[K] | undefined,
): LiteracyStepPasses | undefined {
  const next: LiteracyStepPasses = { ...passes };
  if (value === undefined) delete next[pass];
  else next[pass] = value;
  return Object.keys(next).length ? next : undefined;
}

// ── Problems ───────────────────────────────────────────────────────────────

export interface LessonIssue {
  /** The body path, as zod gives it: `['steps', 2, 'call', 'notes', 0]`. */
  path: (string | number)[];
  /** Where, in a teacher's words: "Step 3 · call, note 1". */
  where: string;
  message: string;
}

const FIELD_NAME: Record<string, string> = {
  name: 'name',
  description: 'description',
  part: 'part',
  order: 'order',
  tempo: 'tempo',
  countInBars: 'count-in',
  timeSignature: 'time',
  key: 'key',
  title: 'title',
  tag: 'tag',
  direction: 'direction',
  passMark: 'pass mark',
  bars: 'bars',
  pickup: 'pickup',
  kind: 'kind',
  section: 'section',
  keyChoice: 'key choice',
  numbering: 'numbering',
  passes: 'passes',
  template: 'template',
  distinct: 'different chords',
  harmony: 'harmony',
  harmonies: 'harmonies',
  saveAs: 'saved as',
  progression: 'progression',
  rhythm: 'rhythm',
  chords: 'chords',
};

/** A Part 2 field's name where it is: a chord call's, a pass's. */
const PART_2_WHERE: Record<string, string> = {
  'call.chords': 'chords',
  'call.rhythm': 'rhythm',
  'call.progression': 'saved progression',
  'call.harmony': 'harmony',
  'passes.challenge': 'challenge pass',
  'passes.create': 'create pass',
  'passes.createBars': 'create-pass bars',
  // A choose step where the lesson doesn't ask: the step itself.
  kind: '',
  progression: 'saved progression',
};

/** Where a problem is, as the editor names its parts. */
export function issueWhere(path: readonly (string | number)[]): string {
  if (path[0] !== 'steps') {
    const field = FIELD_NAME[String(path[0])] ?? String(path[0] ?? 'lesson');
    return `Lesson ${field}`;
  }
  if (path.length < 2) return 'Steps';
  const parts: string[] = [`Step ${Number(path[1]) + 1}`];
  const [, , segment, inner, n] = path;
  const part2 =
    PART_2_WHERE[
      inner === undefined ? String(segment) : `${String(segment)}.${inner}`
    ];
  if (part2 !== undefined) {
    // A chord call's bar: which one, counted from 1.
    if (part2)
      parts.push(typeof n === 'number' ? `${part2}, bar ${n + 1}` : part2);
  } else if (segment === 'template' && typeof inner === 'number') {
    parts.push(`template, bar ${inner + 1}`);
  } else if (
    segment === 'words' ||
    segment === 'call' ||
    segment === 'response'
  ) {
    const noun = segment === 'words' ? 'syllable' : 'note';
    parts.push(
      inner === 'notes' && typeof n === 'number'
        ? `${segment}, ${noun} ${n + 1}`
        : inner === 'notes'
          ? `${segment}`
          : `${segment} ${FIELD_NAME[String(inner)] ?? inner ?? ''}`.trim(),
    );
  } else if (segment !== undefined) {
    parts.push(FIELD_NAME[String(segment)] ?? String(segment));
  }
  return parts.join(' · ');
}

/** Zod's wording, in the editor's. */
function plainMessage(issue: {
  code: string;
  message: string;
  path?: (string | number)[];
  minimum?: number | bigint;
  maximum?: number | bigint;
  type?: string;
}): string {
  if (issue.code === 'too_small' && issue.type === 'string')
    return 'Can’t be empty.';
  if (issue.code === 'too_small' && issue.type === 'array')
    return Number(issue.minimum) === 1
      ? 'Needs at least one.'
      : `Needs at least ${issue.minimum}.`;
  if (issue.code === 'too_small' && issue.type === 'number')
    return `Must be at least ${issue.minimum}.`;
  if (issue.code === 'too_big' && issue.type === 'number')
    return `Must be at most ${issue.maximum}.`;
  if (issue.code === 'invalid_string')
    return 'Use lowercase letters, numbers and hyphens only.';
  if (issue.code === 'invalid_type' && issue.message === 'Required')
    return 'Missing.';
  if (issue.code === 'invalid_union_discriminator')
    return issue.path?.at(-1) === 'harmony'
      ? 'Harmony is triads or sevenths.'
      : 'Not a kind of step: echo, chooseKey, chooseMode, chooseChords or replay.';
  return issue.message;
}

/** Everything the body schema refuses in the lesson; none when it may save. */
export function lessonIssues(lesson: unknown): LessonIssue[] {
  const result = musicLiteracyBodySchema.safeParse(lesson);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path,
    where: issueWhere(issue.path),
    message: plainMessage(issue as Parameters<typeof plainMessage>[0]),
  }));
}

/** The problems inside one step. */
export const stepIssues = (issues: readonly LessonIssue[], index: number) =>
  issues.filter(
    (issue) => issue.path[0] === 'steps' && issue.path[1] === index,
  );

/** A path inside a step, from its fields: `['call', 'rhythm']`. */
export type StepField = readonly (string | number)[];

const inField = (issue: LessonIssue, field: StepField) =>
  field.every((part, k) => issue.path[2 + k] === part);

/**
 * A step's problems with one of its fields (`stepIssues` first): those at
 * it or inside it, or (`exact`) at it alone.
 */
export const issuesAt = (
  issues: readonly LessonIssue[],
  field: StepField,
  exact = false,
) =>
  issues.filter(
    (issue) =>
      inField(issue, field) &&
      (!exact || issue.path.length === 2 + field.length),
  );

/** The items a field's problems name: a segment's notes, a call's bars. */
export const issueItems = (
  issues: readonly LessonIssue[],
  field: StepField,
): Set<number> =>
  new Set(
    issuesAt(issues, field).flatMap((issue) => {
      const item = issue.path[2 + field.length];
      return typeof item === 'number' ? [item] : [];
    }),
  );

/** A step's problems with none of these fields: what's left to list. */
export const issuesOutside = (
  issues: readonly LessonIssue[],
  fields: readonly StepField[],
) => issues.filter((issue) => !fields.some((field) => inField(issue, field)));

// ── The file's layout ──────────────────────────────────────────────────────

const note = (n: LiteracyNote): LiteracyNote => ({
  tick: n.tick,
  duration: n.duration,
  degree: n.degree,
  ...(n.octave ? { octave: n.octave } : {}),
});

const word = (n: LiteracyWord): LiteracyWord => ({ ...note(n), text: n.text });

const figure = (f: LiteracyFigure): LiteracyFigure => ({
  bars: f.bars,
  notes: f.notes.map(note),
});

const chordFigure = (f: LiteracyChordFigure): LiteracyChordFigure => ({
  ...(f.chords ? { chords: [...f.chords] } : {}),
  ...(f.progression ? { progression: f.progression } : {}),
  rhythm: [...f.rhythm],
  harmony: f.harmony,
});

/** A passes object with only what it sets; undefined when it sets nothing. */
function passes<P extends LiteracyStepPasses>(p: P | undefined): P | undefined {
  if (!p) return undefined;
  const out = {
    ...(p.challenge !== undefined ? { challenge: p.challenge } : {}),
    ...(p.create !== undefined ? { create: p.create } : {}),
    ...(p.createBars !== undefined ? { createBars: p.createBars } : {}),
  };
  return Object.keys(out).length ? (out as P) : undefined;
}

const words = (w: LiteracyWords): LiteracyWords => ({
  bars: w.bars,
  ...(w.pickup ? { pickup: w.pickup } : {}),
  notes: w.notes.map(word),
});

const has = <T>(value: T | undefined | ''): value is T =>
  value !== undefined && value !== '';

/**
 * The lesson with every key in the schema's order and nothing empty, as the
 * seed file is: an edit that adds a field puts it where the file has it, so
 * a save changes only the lines that changed. For a body the schema
 * accepts, which has no other keys.
 */
export function canonicalLesson(
  lesson: MusicLiteracyLesson,
): MusicLiteracyLesson {
  const lessonPasses = passes<LiteracyLessonPasses>(lesson.passes);
  return {
    id: lesson.id,
    name: lesson.name,
    ...(has(lesson.description) ? { description: lesson.description } : {}),
    status: lesson.status,
    part: lesson.part,
    ...(lesson.order !== undefined ? { order: lesson.order } : {}),
    key: { tonic: lesson.key.tonic, mode: lesson.key.mode },
    ...(lesson.keyChoice ? { keyChoice: lesson.keyChoice } : {}),
    ...(lesson.numbering ? { numbering: lesson.numbering } : {}),
    ...(lessonPasses ? { passes: lessonPasses } : {}),
    tempo: lesson.tempo,
    timeSignature: [lesson.timeSignature[0], lesson.timeSignature[1]],
    countInBars: lesson.countInBars,
    steps: lesson.steps.map(canonicalStep),
  };
}

/**
 * A step with its keys in the schema's order: the kind first (an echo, the
 * default, says none), then its tag, section, title and direction, then
 * what its kind has, and its tempo (and an echo's pass mark) last.
 */
function canonicalStep(step: LiteracyStep): LiteracyStep {
  const head = {
    tag: step.tag,
    ...(has(step.section) ? { section: step.section } : {}),
    title: step.title,
    ...(has(step.direction) ? { direction: step.direction } : {}),
  };
  const tempo = step.tempo !== undefined ? { tempo: step.tempo } : {};
  switch (step.kind) {
    case 'chooseKey':
    case 'chooseMode':
      return { kind: step.kind, ...head, ...tempo };
    case 'chooseChords':
      return {
        kind: step.kind,
        ...head,
        template: [...step.template],
        distinct: step.distinct,
        harmony: step.harmony,
        saveAs: step.saveAs,
        ...tempo,
      };
    case 'replay':
      return {
        kind: step.kind,
        ...head,
        progression: step.progression,
        ...(step.harmonies ? { harmonies: [...step.harmonies] } : {}),
        ...(step.rhythm ? { rhythm: [...step.rhythm] } : {}),
        ...tempo,
      };
    default: {
      const own = passes(step.passes);
      return {
        ...head,
        ...(step.words ? { words: words(step.words) } : {}),
        call: isChordFigure(step.call)
          ? chordFigure(step.call)
          : figure(step.call),
        ...(step.response ? { response: figure(step.response) } : {}),
        ...(own ? { passes: own } : {}),
        ...tempo,
        ...(step.passMark !== undefined ? { passMark: step.passMark } : {}),
      };
    }
  }
}

/** "B♭", "F♯": a key's tonic as it is shown. */
export const tonicLabel = (tonic: string) =>
  tonic.replace('b', '♭').replace('#', '♯');

// ── Where it goes ──────────────────────────────────────────────────────────

/** The student's page for a lesson, through the console's mirror of Learn. */
export const learnHrefFor = (id: string) =>
  `${MIRROR_BASE}/curriculum/music-literacy/${id}`;

/** The lesson as a .json download, for a console that can't save it. */
export function downloadLesson(lesson: MusicLiteracyLesson) {
  const blob = new Blob([`${JSON.stringify(lesson, null, 2)}\n`], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${lesson.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
