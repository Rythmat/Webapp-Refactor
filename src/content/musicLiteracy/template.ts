import type { LiteracyStep, MusicLiteracyLesson } from './schemas';

/**
 * Where a new Music Literacy lesson and a new step start: what the console's
 * "New lesson" and "Add step" make, and the mock's `GET /template`. Each
 * passes the body schema once the lesson has a name: a line of four quarter
 * notes on the root, and a call of three with a rest after.
 */

export function blankLiteracyStep(tag: string, title: string): LiteracyStep {
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
