import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import {
  PART2_FIXTURE,
  PART2_STEPS,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  isChordEcho,
  isChordFigure,
  isEchoStep,
  isMelodicEcho,
  musicLiteracyBodySchema,
  stepKind,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '../schemas';

/**
 * Part 2's format: the student's key, scale numbering, the passes, the
 * step kinds and chord calls, each refused in a teacher's words when it
 * can't play; and Part 1, read exactly as before.
 */

const lesson = (): MusicLiteracyLesson => structuredClone(PART2_FIXTURE);

const messages = (body: unknown) => {
  const result = musicLiteracyBodySchema.safeParse(body);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

/** The fixture with its steps changed. */
const withSteps = (
  edit: (steps: LiteracyStep[]) => LiteracyStep[],
  lessonEdit: Partial<MusicLiteracyLesson> = {},
) => {
  const body = { ...lesson(), ...lessonEdit };
  return { ...body, steps: edit(body.steps) };
};

const replaceStep =
  (tag: string, step: LiteracyStep) => (steps: LiteracyStep[]) =>
    steps.map((s) => (s.tag === tag ? step : s));

describe('Part 1, unchanged', () => {
  it('still reads every Part 1 step as an echo with a melody', () => {
    expect(musicLiteracyBodySchema.safeParse(LITERACY_FIXTURE).success).toBe(
      true,
    );
    for (const step of LITERACY_FIXTURE.steps) {
      expect(stepKind(step)).toBe('echo');
      expect(isMelodicEcho(step)).toBe(true);
      expect(isChordFigure(step.call)).toBe(false);
    }
  });

  it('parses a Part 1 body to exactly itself: nothing added, nothing dropped', () => {
    const parsed = musicLiteracyBodySchema.parse(LITERACY_FIXTURE);
    expect(parsed).toEqual(LITERACY_FIXTURE);
    expect(Object.keys(parsed)).not.toContain('numbering');
    expect(Object.keys(parsed.steps[0])).not.toContain('kind');
  });

  it('still refuses words with no notes, and Part 1’s other rules', () => {
    const body = structuredClone(LITERACY_FIXTURE);
    body.steps[0].words.notes = [];
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
  });
});

describe('Part 2’s format', () => {
  it('holds the fixture: every kind, chord calls, the passes', () => {
    expect(messages(lesson())).toEqual([]);
    const kinds = PART2_FIXTURE.steps.map(stepKind);
    expect(new Set(kinds)).toEqual(
      new Set(['echo', 'chooseKey', 'chooseMode', 'chooseChords', 'replay']),
    );
  });

  it('tells a chord call from a melody by its harmony', () => {
    expect(isChordEcho(PART2_STEPS.ones)).toBe(true);
    expect(isMelodicEcho(PART2_STEPS.ones)).toBe(false);
    expect(isMelodicEcho(PART2_STEPS.triad)).toBe(true);
    expect(isEchoStep(PART2_STEPS.chooseX)).toBe(false);
    expect(isChordFigure(PART2_STEPS.triad.call)).toBe(false);
  });

  it('takes an echo without words, and `kind: "echo"` said outright', () => {
    expect(
      messages(
        withSteps(
          replaceStep('one-three-five', { kind: 'echo', ...PART2_STEPS.triad }),
        ),
      ),
    ).toEqual([]);
  });

  it('refuses a kind it doesn’t know, and fields a kind doesn’t have', () => {
    expect(
      musicLiteracyBodySchema.safeParse(
        withSteps(
          replaceStep('choose-key', {
            ...PART2_STEPS.key,
            kind: 'chooseTempo',
          } as unknown as LiteracyStep),
        ),
      ).success,
    ).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse(
        withSteps(
          replaceStep('choose-key', {
            ...PART2_STEPS.key,
            passMark: 80,
          } as unknown as LiteracyStep),
        ),
      ).success,
    ).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse({ ...lesson(), numbering: 'roman' })
        .success,
    ).toBe(false);
  });

  it('asks for the key only in a lesson whose key is the student’s', () => {
    expect(messages({ ...lesson(), keyChoice: 'lesson' })).toEqual([
      'Only a lesson whose key is the student’s choice asks for it',
      'Only a lesson whose key is the student’s choice asks for it',
    ]);
  });

  it('writes plain degrees in scale numbering: the mode gives the flats', () => {
    const flat: LiteracyStep = {
      ...PART2_STEPS.triad,
      call: {
        bars: 1,
        notes: [{ tick: 0, duration: 480, degree: 'b3' }],
      },
    };
    expect(messages(withSteps(replaceStep('one-three-five', flat)))).toEqual([
      'Scale numbering writes the plain degrees 1–7: the mode gives the flats',
    ]);
    // Chromatic numbering, Part 1's, takes it.
    expect(
      messages(
        withSteps(replaceStep('one-three-five', flat), {
          numbering: 'chromatic',
        }),
      ),
    ).toEqual([]);
  });
});

describe('a choose-chords step', () => {
  const choose = (edit: object) =>
    withSteps(
      replaceStep('choose-x', {
        ...PART2_STEPS.chooseX,
        ...edit,
      } as LiteracyStep),
    );

  it('needs bars, and an X among them', () => {
    expect(messages(choose({ template: [] }))).toContain(
      'Array must contain at least 1 element(s)',
    );
    expect(messages(choose({ template: ['1', '1'] }))).toEqual([
      'A template needs an X bar for the student to choose',
    ]);
    expect(
      messages(
        choose({ template: ['1', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'] }),
      ).length,
    ).toBeGreaterThan(0);
  });

  it('wants no more different chords than X bars, or than the palette has', () => {
    expect(messages(choose({ distinct: 2 }))).toEqual([
      '2 different chords don’t fit in 1 X bar',
      // …and the X after it, taken from it, would then be two chords.
      'X stands for one chord, but "one-x" has 2: play the progression itself',
    ]);
    const four = (edit: object) =>
      withSteps(
        replaceStep('choose-four', {
          ...PART2_STEPS.chooseFour,
          ...edit,
        } as LiteracyStep),
      );
    expect(
      messages(four({ template: ['X', 'X', 'X', 'X', 'X', 'X'], distinct: 6 })),
    ).toEqual(['There are only 5 chords to choose from']);
    expect(
      messages(four({ template: ['X', 'X', 'X', 'X', 'X'], distinct: 5 })),
    ).toEqual([]);
  });

  it('saves each progression under a name of its own', () => {
    expect(messages(choose({ saveAs: 'four' }))).toContain(
      'Progression "four" is saved by two steps',
    );
  });
});

describe('a chord call', () => {
  const call = (tag: string, edit: object) =>
    withSteps((steps) =>
      steps.map((s) =>
        s.tag === tag && isChordEcho(s)
          ? ({ ...s, call: { ...s.call, ...edit } } as LiteracyStep)
          : s,
      ),
    );

  it('plays chords of its own, or a progression saved before it', () => {
    expect(messages(call('the-1-chord', { chords: undefined }))).toEqual([
      'A chord call needs its chords, or a progression to play',
    ]);
    expect(
      messages(
        withSteps((steps) => [...steps.filter((s) => s.tag !== 'choose-x')]),
      ),
    ).toEqual([
      'No choose-chords step before this one saves "one-x"',
      'No choose-chords step before this one saves "one-x"',
    ]);
    // Saved after it is too late.
    expect(
      messages(
        withSteps((steps) => {
          const choose = steps.find((s) => s.tag === 'choose-x')!;
          return [...steps.filter((s) => s !== choose), choose];
        }),
      ),
    ).toHaveLength(2);
  });

  it('needs a progression for an X, one whose X’s are one chord', () => {
    expect(messages(call('play-x-1', { progression: undefined }))).toEqual([
      'An X needs a progression to take its chord from',
    ]);
    expect(messages(call('play-x-1', { progression: 'four' }))).toEqual([
      'No choose-chords step before this one saves "four"',
    ]);
    const late = withSteps((steps) => [
      ...steps,
      {
        tag: 'x-from-four',
        title: 'X from four',
        call: {
          chords: ['1', 'X'],
          progression: 'four',
          rhythm: [1920],
          harmony: 'triads',
        },
      },
    ]);
    expect(messages(late)).toEqual([
      'X stands for one chord, but "four" has 4: play the progression itself',
    ]);
    expect(messages(call('play-1-x', { chords: ['1', '1'] }))).toEqual([
      'A chord call with chords of its own takes a progression only for an X',
    ]);
  });

  it('leaves out the diminished chord: in either mode when the student picks it', () => {
    expect(messages(call('the-1-chord', { chords: ['1', '7'] }))).toEqual([
      'The 7 chord is diminished in major: use another',
    ]);
    expect(messages(call('the-1-chord', { chords: ['2', '1'] }))).toEqual([
      'The 2 chord is diminished in minor: use another',
    ]);
    // A lesson in its own major key may use the 2 chord.
    const major = withSteps(
      (steps) =>
        steps
          .filter((s) => s.kind !== 'chooseKey' && s.kind !== 'chooseMode')
          .map((s) =>
            s.tag === 'the-1-chord' && isChordEcho(s)
              ? { ...s, call: { ...s.call, chords: ['1', '2'] } }
              : s,
          ) as LiteracyStep[],
      { keyChoice: 'lesson' },
    );
    expect(messages(major)).toEqual([]);
  });

  it('fits its rhythm in a bar, and is echoed as it is', () => {
    expect(messages(call('the-1-chord', { rhythm: [960, 960, 480] }))).toEqual([
      'A chord rhythm runs past its bar',
    ]);
    const answered = withSteps(
      replaceStep('the-1-chord', {
        ...PART2_STEPS.ones,
        response: { bars: 1, notes: [{ tick: 0, duration: 480, degree: '1' }] },
      }),
    );
    expect(messages(answered)).toEqual([
      'A chord call is echoed as it is: leave the response out',
    ]);
  });

  it('has no challenge, and a create pass as long as its chords', () => {
    const withPasses = (passes: object) =>
      withSteps(
        replaceStep('the-1-chord', {
          ...PART2_STEPS.ones,
          passes,
        } as LiteracyStep),
      );
    expect(messages(withPasses({ challenge: true }))).toEqual([
      'The challenge pass is for melodies, not chord calls',
    ]);
    expect(messages(withPasses({ createBars: 2 }))).toEqual([
      'A chord call’s create pass lasts its chords’ bars: leave its bars out',
    ]);
  });
});

describe('the passes', () => {
  it('sets create-pass bars only where there is a create pass', () => {
    const bars = (lessonPasses: object | undefined, stepPasses: object) =>
      messages(
        withSteps(
          replaceStep('one-three-five', {
            ...PART2_STEPS.triad,
            passes: stepPasses,
          } as LiteracyStep),
          { passes: lessonPasses },
        ),
      );
    expect(bars({ create: true }, { createBars: 2 })).toEqual([]);
    expect(bars(undefined, { createBars: 2 })).toEqual([
      'Create-pass bars on a step without a create pass',
    ]);
    // A step opts out of its module's round, never into another.
    expect(bars(undefined, { create: true, createBars: 2 })).toEqual([
      'Create-pass bars on a step without a create pass',
    ]);
    expect(bars({ create: true }, { create: false, createBars: 2 })).toEqual([
      'Create-pass bars on a step without a create pass',
    ]);
    expect(bars({ create: true }, { createBars: 9 }).length).toBe(1);
  });

  it('sets create-pass bars where the step’s module creates, whatever the lesson’s default', () => {
    const body = withSteps(
      replaceStep('one-three-five', {
        ...PART2_STEPS.triad,
        passes: { createBars: 2 },
      } as LiteracyStep),
      {
        passes: undefined,
        modules: [{ title: 'Choose a Color', round: 'create' }],
      },
    );
    expect(messages(body)).toEqual([]);
    expect(
      messages({
        ...body,
        modules: [{ title: 'Choose a Color', round: 'none' }],
      }),
    ).toEqual(['Create-pass bars on a step without a create pass']);
  });

  it('keeps Part 1 valid with none: the lesson field is optional', () => {
    expect('passes' in LITERACY_FIXTURE).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse({
        ...LITERACY_FIXTURE,
        passes: { challenge: true },
      }).success,
    ).toBe(true);
    expect(
      musicLiteracyBodySchema.safeParse({
        ...LITERACY_FIXTURE,
        passes: { createBars: 2 },
      }).success,
    ).toBe(false);
  });
});

describe('modules and the goal', () => {
  const modules = [
    { title: 'Choose a Color', round: 'none' },
    {
      title: 'Create a Melody',
      goal: 'Create a melody and play it the same way twice.',
      round: 'create',
    },
    { title: 'Chords' },
  ] as const;

  it('takes the lesson’s goal and its sections’ modules, each by title', () => {
    const body = { ...lesson(), goal: 'Make it twice.', modules };
    expect(messages(body)).toEqual([]);
    expect(musicLiteracyBodySchema.parse(body)).toEqual(body);
  });

  it('refuses a module listed twice, or one no step’s section names', () => {
    const issues = (list: unknown) => {
      const result = musicLiteracyBodySchema.safeParse({
        ...lesson(),
        modules: list,
      });
      return result.success
        ? []
        : result.error.issues.map((i) => [i.path.join('.'), i.message]);
    };
    expect(issues([...modules, { title: 'Chords', round: 'none' }])).toEqual([
      ['modules.3.title', 'Module "Chords" is listed twice'],
    ]);
    expect(issues([{ title: 'Create a Chord Progression' }])).toEqual([
      [
        'modules.0.title',
        'No steps are in a section called "Create a Chord Progression"',
      ],
    ]);
    expect(issues([{ title: '' }])[0][0]).toBe('modules.0.title');
    expect(issues([{ title: 'Chords', round: 'sometimes' }])).toHaveLength(1);
    expect(issues([{ title: 'Chords', colour: 'red' }])).toHaveLength(1);
    expect(messages({ ...lesson(), goal: '' }).length).toBe(1);
  });

  it('gives a module with no sections nothing to name: Part 1 takes none', () => {
    expect('modules' in LITERACY_FIXTURE).toBe(false);
    expect(
      messages({ ...LITERACY_FIXTURE, modules: [{ title: 'Part 1' }] }),
    ).toEqual(['No steps are in a section called "Part 1"']);
    // A goal it may have: shown at its start.
    expect(messages({ ...LITERACY_FIXTURE, goal: 'Echo me.' })).toEqual([]);
  });
});

describe('a replay', () => {
  it('plays a progression saved before it, its rhythm in a bar', () => {
    const replay = (edit: object) =>
      withSteps(
        replaceStep('hear-four', {
          ...PART2_STEPS.replay,
          ...edit,
        } as LiteracyStep),
      );
    expect(messages(replay({ progression: 'five' }))).toEqual([
      'No choose-chords step before this one saves "five"',
    ]);
    expect(messages(replay({ rhythm: [1920, 480] }))).toEqual([
      'A chord rhythm runs past its bar',
    ]);
    expect(messages(replay({ harmonies: [] })).length).toBe(1);
    expect(messages(replay({ harmonies: ['sevenths'] }))).toEqual([]);
  });
});
