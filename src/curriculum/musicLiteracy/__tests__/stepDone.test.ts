import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import { PART2_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  literacyStepDone,
  literacyStepTried,
  stepPassMarks,
} from '../stepDone';
import { withTry, type LiteracyProgress } from '../useLiteracyProgress';

/**
 * When a step counts as done: one rule, not decided yet by the owner. For
 * now the echo's pass, the create pass a second check, the challenge never.
 */

const step = (tag: string) => PART2_FIXTURE.steps.find((s) => s.tag === tag)!;
const tried = (progress: LiteracyProgress, key: string, passed: boolean) =>
  withTry(progress, key, passed ? 90 : 30, passed);

describe('a step done', () => {
  it('is its echo passed; the create pass and the challenge don’t count', () => {
    const melody = step('one-three-five');
    expect(literacyStepDone(melody, {})).toBe(false);
    let progress = tried({}, 'one-three-five:create', true);
    expect(literacyStepDone(melody, progress)).toBe(false);
    expect(literacyStepTried(melody, progress)).toBe(false);
    progress = tried(progress, 'one-three-five', false);
    expect(literacyStepDone(melody, progress)).toBe(false);
    expect(literacyStepTried(melody, progress)).toBe(true);
    progress = tried(progress, 'one-three-five', true);
    expect(literacyStepDone(melody, progress)).toBe(true);

    const part1 = LITERACY_FIXTURE.steps[0];
    expect(
      literacyStepDone(part1, tried({}, `${part1.tag}:challenge`, true)),
    ).toBe(false);
  });

  it('shows each pass’s own mark', () => {
    const progress = tried(
      tried({}, 'one-three-five', true),
      'one-three-five:create',
      false,
    );
    expect(
      stepPassMarks(PART2_FIXTURE, step('one-three-five'), progress),
    ).toEqual({ echo: 'passed', create: 'tried' });
    // Part 1 has the challenge, and no create pass.
    const part1 = LITERACY_FIXTURE.steps[0];
    expect(stepPassMarks(LITERACY_FIXTURE, part1, {})).toEqual({
      echo: 'todo',
      challenge: 'todo',
    });
    // A choose step: just itself.
    expect(stepPassMarks(PART2_FIXTURE, step('choose-key'), {})).toEqual({
      echo: 'todo',
    });
  });
});
