import { describe, expect, it } from 'vitest';
import { listMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  musicLiteracyBodySchema,
  type LiteracyWords,
  type MusicLiteracyLesson,
} from '../schemas';
import { blankLiteracyLesson } from '../template';

/** The Music Literacy body schema against every lesson file in the repo. */

const files = import.meta.glob<MusicLiteracyLesson>(
  '../../../curriculum/data/musicLiteracy/*.json',
  { eager: true, import: 'default' },
);

const lesson = (): MusicLiteracyLesson =>
  structuredClone(listMusicLiteracy()[0]);

describe('the music_literacy schema', () => {
  it('holds every lesson file, named for its id', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0);
    for (const [path, body] of Object.entries(files)) {
      const result = musicLiteracyBodySchema.safeParse(body);
      expect(result.success, `${path}: ${String(result.error)}`).toBe(true);
      expect(path.endsWith(`/${body.id}.json`)).toBe(true);
    }
  });

  it('refuses a step tag used twice', () => {
    const body = lesson();
    body.steps[1].tag = body.steps[0].tag;
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
  });

  it('refuses a note that runs past its figure', () => {
    const body = lesson();
    body.steps[0].call.notes.push({ tick: 1920, duration: 480, degree: '1' });
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
  });

  it('refuses a key it doesn’t know and a key it doesn’t have', () => {
    const body = lesson() as unknown as Record<string, unknown>;
    expect(
      musicLiteracyBodySchema.safeParse({
        ...body,
        key: { tonic: 'H', mode: 'major' },
      }).success,
    ).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse({ ...body, lyrics: [] }).success,
    ).toBe(false);
  });
});

describe('a pickup on the words', () => {
  /** "When" on 4 and "I" on its "and", into "play" on the downbeat. */
  const withWords = (
    words: LiteracyWords,
    edit: Partial<MusicLiteracyLesson> = {},
  ) => {
    const body = { ...blankLiteracyLesson('pickup', 'Pickup'), ...edit };
    body.steps[0].words = words;
    return musicLiteracyBodySchema.safeParse(body);
  };
  const whenI = (pickup?: number): LiteracyWords => ({
    bars: 1,
    ...(pickup === undefined ? {} : { pickup }),
    notes: [
      { tick: -480, duration: 240, degree: '1', text: 'When' },
      { tick: -240, duration: 240, degree: '1', text: 'I' },
      { tick: 0, duration: 480, degree: '1', text: 'play' },
    ],
  });
  const messages = (result: ReturnType<typeof withWords>) =>
    result.success ? [] : result.error.issues.map((i) => i.message);

  it('takes syllables before the downbeat, as far back as the pickup', () => {
    expect(withWords(whenI(480)).success).toBe(true);
    expect(withWords(whenI(960)).success).toBe(true); // a rest ahead of "When"
  });

  it('refuses a syllable earlier than the pickup, or one with no pickup', () => {
    expect(messages(withWords(whenI(240)))).toEqual([
      'A syllable starts before the pickup: make the pickup longer',
    ]);
    expect(messages(withWords(whenI()))).toEqual([
      'A syllable starts before the words do: give them a pickup',
      'A syllable starts before the words do: give them a pickup',
    ]);
  });

  it('is an eighth to a bar less an eighth long', () => {
    expect(withWords(whenI(1680)).success).toBe(true);
    expect(messages(withWords(whenI(1920)))).toEqual([
      'A pickup must be at least an eighth shorter than a bar',
    ]);
    expect(withWords({ ...whenI(), pickup: 120 }).success).toBe(false);
    // The bar is the lesson's: in 3/4, a dotted half is a whole bar.
    expect(withWords(whenI(1440), { timeSignature: [3, 4] }).success).toBe(
      false,
    );
    expect(withWords(whenI(1200), { timeSignature: [3, 4] }).success).toBe(
      true,
    );
  });

  it('still keeps the line inside its bars, counted from the downbeat', () => {
    const long = whenI(480);
    long.notes.push({ tick: 1680, duration: 480, degree: '1', text: 'on' });
    expect(messages(withWords(long))).toEqual([
      'A words note runs past its 1 bar(s)',
    ]);
  });

  it('works with no count-in: the step counts in a bar for it', () => {
    expect(withWords(whenI(480), { countInBars: 0 }).success).toBe(true);
  });

  it('is only the words’: a call note can’t come before its downbeat', () => {
    const body = blankLiteracyLesson('pickup', 'Pickup');
    body.steps[0].call.notes[0].tick = -240;
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse({
        ...body,
        steps: [
          { ...body.steps[0], call: { ...body.steps[0].call, pickup: 480 } },
        ],
      }).success,
    ).toBe(false);
  });
});
