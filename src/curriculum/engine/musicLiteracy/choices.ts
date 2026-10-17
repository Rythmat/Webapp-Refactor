/**
 * What a student has chosen in a Music Literacy lesson: the key center, the
 * mode, and the chord progressions saved by its choose-chords steps. Later
 * steps play from it (an echo of "your" progression, the 7ths section's
 * replay), and so will Studio's "Hear it with your band" stop.
 *
 * The object is plain, versioned JSON, so the player can keep it wherever it
 * keeps progress (localStorage under `choicesStorageKey` now, the student's
 * account later) and read it back with `parseChoices`. The helpers here
 * never mutate: each returns a new object. Pure, no React.
 */

import { z } from 'zod';
import {
  LITERACY_SCALE_DEGREES,
  LITERACY_TEMPLATE_BARS,
  LITERACY_TONICS,
  literacyHarmonySchema,
  literacyModeSchema,
  type LiteracyChooseChordsStep,
  type LiteracyHarmony,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyStep,
  type LiteracyTemplateBar,
  type LiteracyTonic,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  fillTemplate,
  progressionProblems,
  type ProgressionProblem,
} from './chords';
import { pitchClassOf, type LiteracyKey } from './pitch';

/** The shape's version: bump it, and teach `parseChoices` the old one. */
export const LITERACY_CHOICES_VERSION = 1;

/** A progression a student made, in the key they made it in. */
export interface SavedProgression {
  /** The template it filled ('1' and 'X' bars). */
  template: LiteracyTemplateBar[];
  /** Each bar's chord, by its root's degree of `mode`. */
  chords: LiteracyScaleDegree[];
  /** What it was chosen as (a later step may play it in the other). */
  harmony: LiteracyHarmony;
  tonic: LiteracyTonic;
  mode: LiteracyMode;
}

export interface LiteracyChoices {
  version: typeof LITERACY_CHOICES_VERSION;
  /** The key center picked on the circle (left out: not yet). */
  tonic?: LiteracyTonic;
  /** Major or minor (left out: not yet). */
  mode?: LiteracyMode;
  /** By the name its choose-chords step saves it under (`saveAs`). */
  progressions: Readonly<Record<string, SavedProgression>>;
}

const savedProgressionSchema = z.object({
  template: z.array(z.enum(LITERACY_TEMPLATE_BARS)).min(1),
  chords: z.array(z.enum(LITERACY_SCALE_DEGREES)).min(1),
  harmony: literacyHarmonySchema,
  tonic: z.enum(LITERACY_TONICS),
  mode: literacyModeSchema,
});

/** Saved choices, as `parseChoices` reads them back. */
export const literacyChoicesSchema = z.object({
  version: z.literal(LITERACY_CHOICES_VERSION),
  tonic: z.enum(LITERACY_TONICS).optional(),
  mode: literacyModeSchema.optional(),
  progressions: z.record(savedProgressionSchema),
});

/** The circle of fifths from C, clockwise, as the key colors spell it. */
export const CIRCLE_OF_FIFTHS: readonly LiteracyTonic[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];

/** A key center on the circle, for the choose-key step. */
export interface CircleKey {
  tonic: LiteracyTonic;
  /** "D♭", "F♯". */
  label: string;
  /** C = 0. */
  pitchClass: number;
  /** Its color in the mode (KEY_OF_COLORS): minor wears its relative major's. */
  color: string;
}

/** The twelve key centers, clockwise from C, in a mode's colors. */
export function circleOfFifths(mode: LiteracyMode = 'major'): CircleKey[] {
  return CIRCLE_OF_FIFTHS.map((tonic) => ({
    tonic,
    label: tonic.replace('b', '♭').replace('#', '♯'),
    pitchClass: pitchClassOf(tonic),
    color: colorForKeyMode(tonic, mode === 'minor' ? 'aeolian' : 'ionian'),
  }));
}

/** Nothing chosen yet. */
export function emptyChoices(): LiteracyChoices {
  return { version: LITERACY_CHOICES_VERSION, progressions: {} };
}

/**
 * Saved choices read back (JSON already parsed): anything unreadable, or
 * from a version this code doesn't know, starts afresh.
 */
export function parseChoices(raw: unknown): LiteracyChoices {
  const parsed = literacyChoicesSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptyChoices();
}

/** Where the player keeps a lesson's choices on the device, beside its progress. */
export const choicesStorageKey = (lessonId: string) =>
  `music_literacy_choices_${lessonId}`;

export const withTonic = (
  choices: LiteracyChoices,
  tonic: LiteracyTonic,
): LiteracyChoices => ({ ...choices, tonic });

export const withMode = (
  choices: LiteracyChoices,
  mode: LiteracyMode,
): LiteracyChoices => ({ ...choices, mode });

export const withProgression = (
  choices: LiteracyChoices,
  name: string,
  progression: SavedProgression,
): LiteracyChoices => ({
  ...choices,
  progressions: { ...choices.progressions, [name]: progression },
});

/**
 * The key a lesson plays in: its own, or, when the key is the student's
 * choice, what they chose (the lesson's key standing in until they do).
 */
export function keyFor(
  lesson: Pick<MusicLiteracyLesson, 'key'> &
    Partial<Pick<MusicLiteracyLesson, 'keyChoice'>>,
  choices?: LiteracyChoices | null,
): LiteracyKey {
  if (lesson.keyChoice !== 'student' || !choices) {
    return { tonic: lesson.key.tonic, mode: lesson.key.mode };
  }
  return {
    tonic: choices.tonic ?? lesson.key.tonic,
    mode: choices.mode ?? lesson.key.mode,
  };
}

/** The choose-chords step that saves a progression, if the lesson has one. */
export function chooserOf(
  lesson: { steps: readonly LiteracyStep[] },
  name: string,
): LiteracyChooseChordsStep | undefined {
  return lesson.steps.find(
    (step): step is LiteracyChooseChordsStep =>
      step.kind === 'chooseChords' && step.saveAs === name,
  );
}

const sameBars = (
  a: readonly LiteracyTemplateBar[],
  b: readonly LiteracyTemplateBar[],
) => a.length === b.length && a.every((bar, i) => bar === b[i]);

/**
 * A progression the student saved, when it still fits the step that saves
 * it (the lesson may have been edited since): undefined otherwise.
 */
export function progressionFor(
  lesson: { steps: readonly LiteracyStep[] },
  choices: LiteracyChoices | null | undefined,
  name: string,
): SavedProgression | undefined {
  const saved = choices?.progressions[name];
  const chooser = chooserOf(lesson, name);
  if (!saved || !chooser) return undefined;
  if (!sameBars(saved.template, chooser.template)) return undefined;
  return saved.chords.length === chooser.template.length ? saved : undefined;
}

/**
 * The student's picks for a choose-chords step (one per X bar, in order), in
 * the key they're in, as the progression to save; or what's wrong with them.
 */
export function pickProgression(
  step: Pick<LiteracyChooseChordsStep, 'template' | 'distinct' | 'harmony'>,
  picks: readonly (LiteracyScaleDegree | null | undefined)[],
  key: LiteracyKey,
):
  | { progression: SavedProgression; problems: [] }
  | { progression: null; problems: ProgressionProblem[] } {
  const problems = progressionProblems(
    step.template,
    step.distinct,
    picks,
    key.mode,
  );
  const chords = fillTemplate(step.template, picks);
  if (problems.length || !chords) {
    return { progression: null, problems };
  }
  return {
    progression: {
      template: [...step.template],
      chords,
      harmony: step.harmony,
      tonic: key.tonic,
      mode: key.mode,
    },
    problems: [],
  };
}

/** A choice a step plays from that the student hasn't made yet. */
export type MissingChoice =
  | { choice: 'key' | 'mode'; at: string | null }
  | { choice: 'progression'; name: string; at: string | null };

/** The progression a step plays, if it plays one. */
export function progressionNameOf(step: LiteracyStep): string | undefined {
  if (step.kind === 'replay') return step.progression;
  if (step.kind === 'chooseKey' || step.kind === 'chooseMode') return;
  if (step.kind === 'chooseChords') return;
  return 'harmony' in step.call && step.call.harmony !== undefined
    ? step.call.progression
    : undefined;
}

/** The degrees whose sound the mode decides, in scale numbering. */
const MODAL_DEGREES: readonly string[] = ['3', '6', '7'];

/**
 * Whether a step sounds different in major and minor: a scale-numbered
 * melody with a 3, 6 or 7, a chord call of its own chords, or a palette to
 * choose from. (A step playing a saved progression plays it in its own
 * mode; a melody of 1s, 2s, 4s and 5s is the same in both.)
 */
export function dependsOnMode(
  lesson: Pick<MusicLiteracyLesson, 'numbering'>,
  step: LiteracyStep,
): boolean {
  switch (step.kind) {
    case 'chooseChords':
      return true;
    case 'chooseKey':
    case 'chooseMode':
    case 'replay':
      return false;
    default:
      break;
  }
  const call = step.call;
  if ('harmony' in call && call.harmony !== undefined) {
    return !call.progression;
  }
  if (lesson.numbering !== 'scale') return false;
  return [
    ...(step.words?.notes ?? []),
    ...call.notes,
    ...(step.response?.notes ?? []),
  ].some((note) => MODAL_DEGREES.includes(note.degree));
}

/**
 * What a step needs chosen that isn't yet, each with the tag of the step
 * that chooses it (`at`: the nearest such step before it, else the first;
 * null when the lesson has none): send the student there first. Empty when
 * the step plays as the student will hear it. In a lesson whose key is the
 * student's, every step but the choose-key needs the key, and a step that
 * sounds different in major and minor (`dependsOnMode`) needs the mode; a
 * step playing a progression needs it saved.
 */
export function missingChoices(
  lesson: Pick<MusicLiteracyLesson, 'keyChoice' | 'numbering'> & {
    steps: readonly LiteracyStep[];
  },
  step: LiteracyStep,
  choices: LiteracyChoices | null | undefined,
): MissingChoice[] {
  const missing: MissingChoice[] = [];
  const here = lesson.steps.findIndex((s) => s.tag === step.tag);
  const tagOf = (kind: LiteracyStep['kind']) =>
    (
      lesson.steps
        .slice(0, Math.max(0, here))
        .reverse()
        .find((s) => s.kind === kind) ??
      lesson.steps.find((s) => s.kind === kind)
    )?.tag ?? null;
  if (lesson.keyChoice === 'student' && step.kind !== 'chooseKey') {
    if (!choices?.tonic) {
      missing.push({ choice: 'key', at: tagOf('chooseKey') });
    }
    if (!choices?.mode && dependsOnMode(lesson, step)) {
      missing.push({ choice: 'mode', at: tagOf('chooseMode') });
    }
  }
  const name = progressionNameOf(step);
  if (name && !progressionFor(lesson, choices, name)) {
    missing.push({
      choice: 'progression',
      name,
      at: chooserOf(lesson, name)?.tag ?? null,
    });
  }
  return missing;
}
