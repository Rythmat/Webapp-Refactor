/**
 * The kinds of step the Music Literacy editor offers, as a teacher names
 * them: what Add step's menu lists, what a step's row calls it, and a new
 * step of each, built with the template's `blankStepOfKind`.
 *
 * The format has five kinds; the editor offers six, since an echo (call and
 * response) is a melody or chords, and the two are edited differently.
 *
 * No React here.
 */

import {
  isChordEcho,
  isMelodicEcho,
  stepKind,
  type LiteracyChordFigure,
  type LiteracyStep,
  type LiteracyStepKind,
} from '@/content/musicLiteracy/schemas';
import { blankStepOfKind } from '@/content/musicLiteracy/template';

/** What Add step offers: the format's kinds, an echo split in two. */
export type StepChoice =
  | 'melody'
  | 'chords'
  | 'chooseKey'
  | 'chooseMode'
  | 'chooseChords'
  | 'replay';

export interface StepChoiceInfo {
  choice: StepChoice;
  /** The format's kind it makes. */
  kind: LiteracyStepKind;
  /** The menu's name for it. */
  name: string;
  /** A step row's short tag. */
  short: string;
  /** One line on what the student does. */
  description: string;
  /** A new step's title (melodies take "Step N", as Part 1's always have). */
  title?: string;
  /** Only in a lesson whose key the student picks. */
  studentKeyOnly?: boolean;
  /** What a direction might say, shown while it's empty. */
  directionHint: string;
}

export const STEP_CHOICES: readonly StepChoiceInfo[] = [
  {
    choice: 'melody',
    directionHint: 'Listen, then play it back in time.',
    kind: 'echo',
    name: 'Call and response (melody)',
    short: 'Melody',
    description: 'Atlas plays a melody and the student plays it back.',
  },
  {
    choice: 'chords',
    directionHint: 'Listen, then play the chords back in the same rhythm.',
    kind: 'echo',
    name: 'Call and response (chords)',
    short: 'Chords',
    description:
      'Atlas plays a chord a bar in a rhythm and the student plays them back.',
    title: 'Play the chords',
  },
  {
    choice: 'chooseKey',
    directionHint: 'Pick a color on the circle. Its note is your 1.',
    kind: 'chooseKey',
    name: 'Choose a key',
    short: 'Choose a key',
    description:
      'The student picks a color on the circle of fifths. Its note is their 1.',
    title: 'Choose your key',
    studentKeyOnly: true,
  },
  {
    choice: 'chooseMode',
    directionHint: 'Pick one. It sets your 3.',
    kind: 'chooseMode',
    name: 'Choose major or minor',
    short: 'Major or minor',
    description: 'The student picks major or minor for the steps after it.',
    title: 'Major or minor?',
    studentKeyOnly: true,
  },
  {
    choice: 'chooseChords',
    directionHint: 'Fill the X bars with chords you like.',
    kind: 'chooseChords',
    name: 'Choose chords',
    short: 'Choose chords',
    description:
      'The student fills the X bars with chords. Later steps play what they saved.',
    title: 'Choose your chords',
  },
  {
    choice: 'replay',
    directionHint: 'Listen to your progression.',
    kind: 'replay',
    name: 'Replay a progression',
    short: 'Replay',
    description:
      'Atlas plays back a progression the student saved. Nothing is graded.',
    title: 'Hear your progression',
  },
];

export const choiceInfo = (choice: StepChoice): StepChoiceInfo =>
  STEP_CHOICES.find((info) => info.choice === choice)!;

/** Which of the editor's kinds a step is. */
export function choiceOf(step: LiteracyStep): StepChoice {
  const kind = stepKind(step);
  if (kind !== 'echo') return kind;
  return isChordEcho(step) ? 'chords' : 'melody';
}

/** A new chord call's: the 1 chord twice, short, short, long. */
export const BLANK_CHORD_CALL: LiteracyChordFigure = {
  chords: ['1', '1'],
  rhythm: [480, 480, 960],
  harmony: 'triads',
};

/**
 * A new step of a kind. A melody keeps the template's words only when
 * `words` (a lesson whose steps have none, as Part 2's, gets none); a chord
 * call starts on the 1 chord; a replay plays `progression`.
 */
export function newStepOfChoice(
  choice: StepChoice,
  tag: string,
  title: string,
  options: { words?: boolean; progression?: string } = {},
): LiteracyStep {
  const step = blankStepOfKind(
    choiceInfo(choice).kind,
    tag,
    title,
    options.progression,
  );
  if (!isMelodicEcho(step)) return step;
  if (choice === 'chords')
    return {
      tag: step.tag,
      title: step.title,
      direction: 'Listen, then play the chords back in the same rhythm.',
      call: structuredClone(BLANK_CHORD_CALL),
    };
  if (options.words) return step;
  const melody = { ...step };
  delete melody.words;
  return melody;
}
