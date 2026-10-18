import type {
  LiteracyMelodicEchoStep,
  LiteracyStep,
  LiteracyStepKind,
  LiteracyWords,
  MusicLiteracyLesson,
} from './schemas';

/**
 * Where a new Music Literacy lesson and a new step start: what the console's
 * "New lesson" and "Add step" make, and the mock's `GET /template`. Each
 * passes the body schema once the lesson has a name: a line of four quarter
 * notes on the root, and a call of three with a rest after.
 */

export function blankLiteracyStep(
  tag: string,
  title: string,
): LiteracyMelodicEchoStep & { words: LiteracyWords } {
  return {
    tag,
    title,
    direction: 'Listen, then play it back in time.',
    words: {
      bars: 1,
      notes: ['Lis', 'ten', 'to', 'me'].map((text, i) => ({
        tick: i * 480,
        duration: 480,
        degree: '1' as const,
        text,
      })),
    },
    call: {
      bars: 1,
      notes: [0, 480, 960].map((tick) => ({
        tick,
        duration: 480,
        degree: '1' as const,
      })),
    },
  };
}

/**
 * A new step of a kind, for the editor's Add step: an echo as above; a
 * choose step as the seed's gate has it (told "Pick a color on the circle.
 * Its note is your 1.", "Pick one. It sets your 3."); a choose-chords step
 * on `| 1 | X |`, saved under a name from its tag; a replay of
 * `progression` (left out: one to name). A replay or a chord call needs a
 * progression saved before it to pass. Titles are the caller's, in Title
 * Case (`titleCase`).
 */
export function blankStepOfKind(
  kind: LiteracyStepKind,
  tag: string,
  title: string,
  progression = 'my-progression',
): LiteracyStep {
  switch (kind) {
    case 'echo':
      return blankLiteracyStep(tag, title);
    case 'chooseKey':
      return {
        kind,
        tag,
        title,
        direction: 'Pick a color on the circle. Its note is your 1.',
      };
    case 'chooseMode':
      return { kind, tag, title, direction: 'Pick one. It sets your 3.' };
    case 'chooseChords':
      return {
        kind,
        tag,
        title,
        direction: 'Pick a chord.',
        template: ['1', 'X'],
        distinct: 1,
        harmony: 'triads',
        saveAs: tag,
      };
    case 'replay':
      return { kind, tag, title, progression };
  }
}

export function blankLiteracyLesson(
  id: string,
  name: string,
  part = 1,
): MusicLiteracyLesson {
  return {
    id,
    name,
    status: 'draft',
    part,
    key: { tonic: 'C', mode: 'major' },
    tempo: 80,
    timeSignature: [4, 4],
    countInBars: 1,
    steps: [blankLiteracyStep('step-1', 'Step 1')],
  };
}
