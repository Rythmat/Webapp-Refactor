import { describe, expect, it } from 'vitest';
import type { LiteracyStep } from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import { passOrder, passProgressKey, stepPasses } from '../passes';

/**
 * Which passes a step offers: the echo always, the challenge on by default
 * (Part 1 has it without a field), the create pass where the lesson or the
 * step turns it on; a step's own settings over its lesson's.
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

  it('lets a step set its own', () => {
    const own = (passes: object) =>
      stepPasses(PART2_FIXTURE, {
        ...part2Step('one-three-five'),
        passes,
      } as LiteracyStep);
    expect(own({ create: false }).create).toBeNull();
    expect(own({ createBars: 2 }).create).toEqual({ bars: 2 });
    expect(own({ challenge: true }).challenge).toBe(true);
    const part1 = (passes: object) =>
      stepPasses(LITERACY_FIXTURE, {
        ...LITERACY_FIXTURE.steps[0],
        passes,
      } as LiteracyStep);
    expect(part1({ challenge: false }).challenge).toBe(false);
    expect(part1({ create: true }).create).toEqual({
      bars: LITERACY_FIXTURE.steps[0].call.bars,
    });
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
