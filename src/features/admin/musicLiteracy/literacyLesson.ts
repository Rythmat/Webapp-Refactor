/**
 * The Music Literacy editor's edits to a lesson as a whole: its steps' tags,
 * adding, duplicating, moving and removing steps, a new lesson's id, the
 * schema's problems in a teacher's words, the body laid out as its file is,
 * key by key, and where the lesson goes (its Learn page, its download).
 *
 * No React here.
 */

import {
  musicLiteracyBodySchema,
  type LiteracyFigure,
  type LiteracyNote,
  type LiteracyStep,
  type LiteracyWord,
  type LiteracyWords,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { blankLiteracyStep } from '@/content/musicLiteracy/template';
import { MIRROR_BASE } from '../content/mirror/mirrorPaths';

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

export function addStep(lesson: MusicLiteracyLesson): MusicLiteracyLesson {
  const title = `Step ${lesson.steps.length + 1}`;
  return {
    ...lesson,
    steps: [
      ...lesson.steps,
      blankLiteracyStep(tagFor(title, lesson.steps), title),
    ],
  };
}

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

export function moveStep(
  lesson: MusicLiteracyLesson,
  index: number,
  delta: number,
): MusicLiteracyLesson {
  const target = index + delta;
  if (target < 0 || target >= lesson.steps.length) return lesson;
  const steps = [...lesson.steps];
  [steps[index], steps[target]] = [steps[target], steps[index]];
  return { ...lesson, steps };
}

export function removeStep(
  lesson: MusicLiteracyLesson,
  index: number,
): MusicLiteracyLesson {
  return { ...lesson, steps: lesson.steps.filter((_, i) => i !== index) };
}

export function patchStep(
  lesson: MusicLiteracyLesson,
  index: number,
  patch: Partial<LiteracyStep>,
): MusicLiteracyLesson {
  return {
    ...lesson,
    steps: lesson.steps.map((step, i) =>
      i === index ? { ...step, ...patch } : step,
    ),
  };
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
  if (segment === 'words' || segment === 'call' || segment === 'response') {
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
  return {
    id: lesson.id,
    name: lesson.name,
    ...(has(lesson.description) ? { description: lesson.description } : {}),
    status: lesson.status,
    part: lesson.part,
    ...(lesson.order !== undefined ? { order: lesson.order } : {}),
    key: { tonic: lesson.key.tonic, mode: lesson.key.mode },
    tempo: lesson.tempo,
    timeSignature: [lesson.timeSignature[0], lesson.timeSignature[1]],
    countInBars: lesson.countInBars,
    steps: lesson.steps.map((step) => ({
      tag: step.tag,
      title: step.title,
      ...(has(step.direction) ? { direction: step.direction } : {}),
      words: words(step.words),
      call: figure(step.call),
      ...(step.response ? { response: figure(step.response) } : {}),
      ...(step.tempo !== undefined ? { tempo: step.tempo } : {}),
      ...(step.passMark !== undefined ? { passMark: step.passMark } : {}),
    })),
  };
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
