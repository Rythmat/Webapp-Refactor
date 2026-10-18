import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import { passOrder, passProgressKey, roundPass, stepPasses } from '../passes';

/**
 * Which passes a step offers: the echo always, and its module's round, the
 * challenge (Part 1's, without a field) or the create pass (where the
 * module or the lesson's default picks it); a step's own `false` leaves it
 * out of the round.
 */

describe('a step’s passes', () => {
  it('gives Part 1 the echo and the challenge, and no create pass', () => {
    for (const step of LITERACY_FIXTURE.steps) {
      const passes = stepPasses(LITERACY_FIXTURE, step);
      expect(passes).toEqual({ echo: true, challenge: true, create: null });
      expect(passOrder(passes)).toEqual(['echo', 'challenge']);
    }
  });

  it('gives Part 2’s echoes the create pass, as long as the call', () => {
    expect(stepPasses(PART2_FIXTURE, part2Step('one-three-five'))).toEqual({
      echo: true,
      challenge: false,
      create: { bars: 1 },
    });
    // A chord call: no challenge, a create pass as long as its chords.
    expect(stepPasses(PART2_FIXTURE, part2Step('the-1-chord'))).toEqual({
      echo: true,
      challenge: false,
      create: { bars: 2 },
    });
    expect(passOrder(stepPasses(PART2_FIXTURE, part2Step('play-1-x')))).toEqual(
      ['echo', 'create'],
    );
  });

  it('lets a step opt out of its round, never into another', () => {
    const own = (passes: object) =>
      stepPasses(PART2_FIXTURE, {
        ...part2Step('one-three-five'),
        passes,
      } as LiteracyStep);
    expect(own({ create: false }).create).toBeNull();
    expect(own({ createBars: 2 }).create).toEqual({ bars: 2 });
    // The module's round is the create round: no challenge to opt into.
    expect(own({ challenge: true }).challenge).toBe(false);
    const part1 = (passes: object) =>
      stepPasses(LITERACY_FIXTURE, {
        ...LITERACY_FIXTURE.steps[0],
        passes,
      } as LiteracyStep);
    expect(part1({ challenge: false }).challenge).toBe(false);
    expect(part1({ create: true }).create).toBeNull();
  });

  it('follows its module’s round over the lesson’s default', () => {
    const lesson: MusicLiteracyLesson = {
      ...PART2_FIXTURE,
      modules: [
        { title: 'Choose a Color', round: 'none' },
        { title: 'Create a Melody', round: 'challenge' },
      ],
    };
    const of = (tag: string) =>
      stepPasses(lesson, lesson.steps.find((s) => s.tag === tag)!);
    expect(of('one-three-five')).toEqual({
      echo: true,
      challenge: false,
      create: null,
    });
    expect(of('one-seven-one')).toEqual({
      echo: true,
      challenge: true,
      create: null,
    });
    // A module with no entry takes the lesson's: the create round.
    expect(of('the-1-chord').create).toEqual({ bars: 2 });
    // A chord call has no challenge, whatever its module's round.
    const chords: MusicLiteracyLesson = {
      ...lesson,
      modules: [{ title: 'Chords', round: 'challenge' }],
    };
    expect(
      stepPasses(chords, chords.steps.find((s) => s.tag === 'the-1-chord')!),
    ).toEqual({ echo: true, challenge: false, create: null });
  });

  it('runs a round’s pass on its steps', () => {
    expect(roundPass('create')).toBe('create');
    expect(roundPass('challenge')).toBe('challenge');
    expect(roundPass('none')).toBeNull();
  });

  it('gives a choose step or a replay none', () => {
    for (const tag of ['choose-key', 'choose-mode', 'choose-x', 'hear-four'])
      expect(passOrder(stepPasses(PART2_FIXTURE, part2Step(tag)))).toEqual([]);
  });

  it('keeps the echo’s progress where Part 1 keeps it, the others beside it', () => {
    expect(passProgressKey('add-the-3', 'echo')).toBe('add-the-3');
    expect(passProgressKey('add-the-3', 'challenge')).toBe(
      'add-the-3:challenge',
    );
    expect(passProgressKey('up-1-2-3', 'create')).toBe('up-1-2-3:create');
  });
});
