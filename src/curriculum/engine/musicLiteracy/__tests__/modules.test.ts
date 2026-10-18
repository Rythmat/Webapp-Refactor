import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import { PART2_FIXTURE } from '../__fixtures__/part2Fixture';
import {
  DEFAULT_LESSON_GOAL,
  finishesModule,
  lastEchoIndex,
  lessonGoal,
  lessonModules,
  MODULE_GOALS,
  moduleEchoPassed,
  moduleOfStep,
  roundMark,
  roundProgressKeys,
  roundStart,
  roundSteps,
  type ModuleProgress,
} from '../modules';

/**
 * A lesson's modules: its sections (Part 1, the whole lesson), each with its
 * round and goal, its own or the defaults; when one is passed; its round's
 * steps and their progress; and the lesson's one goal.
 *
 * The Part 2 fixture's steps, by module (a step with no section goes with
 * the section before it, the first ones with the section after them):
 *
 *   Choose a Color   choose-key, one-three-five, choose-mode
 *   Create a Melody  one-seven-one
 *   Chords           the-1-chord, choose-x, play-1-x, play-x-1
 *   7th Chords       choose-four, hear-four
 */

const titles = (lesson: MusicLiteracyLesson) =>
  lessonModules(lesson).map((m) => [m.title, m.steps.map((s) => s.tag)]);

const passed = (...tags: string[]): ModuleProgress =>
  Object.fromEntries(tags.map((tag) => [tag, { passed: true }]));

const withModules = (
  modules: MusicLiteracyLesson['modules'],
  edit: Partial<MusicLiteracyLesson> = {},
): MusicLiteracyLesson => ({ ...PART2_FIXTURE, modules, ...edit });

describe('a lesson’s modules', () => {
  it('makes Part 1, with no sections, one module: the challenge round', () => {
    const [only, ...rest] = lessonModules(LITERACY_FIXTURE);
    expect(rest).toEqual([]);
    expect(only.title).toBe(LITERACY_FIXTURE.name);
    expect(only.round).toBe('challenge');
    expect(only.goal).toBe(MODULE_GOALS.challenge);
    expect(only.steps).toEqual(LITERACY_FIXTURE.steps);
    expect(only.indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // A lesson that turns the challenge off has no round at all.
    const none = lessonModules({
      ...LITERACY_FIXTURE,
      passes: { challenge: false },
    })[0];
    expect(none.round).toBe('none');
    expect(none.goal).toBeNull();
  });

  it('makes each section a module, the steps with none going with a neighbor', () => {
    expect(titles(PART2_FIXTURE)).toEqual([
      ['Choose a Color', ['choose-key', 'one-three-five', 'choose-mode']],
      ['Create a Melody', ['one-seven-one']],
      ['Chords', ['the-1-chord', 'choose-x', 'play-1-x', 'play-x-1']],
      ['7th Chords', ['choose-four', 'hear-four']],
    ]);
    const modules = lessonModules(PART2_FIXTURE);
    expect(moduleOfStep(modules, 2)?.title).toBe('Choose a Color');
    expect(moduleOfStep(modules, 6)?.title).toBe('Chords');
    expect(moduleOfStep(modules, 99)).toBeUndefined();
  });

  it('takes the lesson’s default round, or its own', () => {
    // The fixture's passes turn the create pass on: every module creates.
    expect(lessonModules(PART2_FIXTURE).map((m) => m.round)).toEqual([
      'create',
      'create',
      'create',
      'create',
    ]);
    const lesson = withModules([
      { title: 'Choose a Color', round: 'none' },
      { title: 'Create a Melody', round: 'challenge', goal: 'Go wild.' },
    ]);
    expect(
      lessonModules(lesson).map((m) => [m.title, m.round, m.goal]),
    ).toEqual([
      ['Choose a Color', 'none', null],
      ['Create a Melody', 'challenge', 'Go wild.'],
      ['Chords', 'create', MODULE_GOALS.comping],
      // A create round with no echo to play: no goal.
      ['7th Chords', 'create', null],
    ]);
  });

  it('gives a create round its goal by what it plays', () => {
    const goals = Object.fromEntries(
      lessonModules(PART2_FIXTURE).map((m) => [m.title, m.goal]),
    );
    // Melodies; one or two bars of chords (comping).
    expect(goals['Create a Melody']).toBe(MODULE_GOALS.melody);
    expect(goals.Chords).toBe(MODULE_GOALS.comping);
    // Longer chord calls are a progression.
    const four: LiteracyStep = {
      tag: 'play-four',
      section: 'Chords',
      title: 'Play four',
      call: {
        chords: ['1', '4', '5', '1'],
        rhythm: [480, 480, 960],
        harmony: 'triads',
      },
    };
    const longer = { ...PART2_FIXTURE, steps: [...PART2_FIXTURE.steps, four] };
    expect(lessonModules(longer).find((m) => m.title === 'Chords')?.goal).toBe(
      MODULE_GOALS.progression,
    );
    expect(MODULE_GOALS).toEqual({
      melody: 'Create a melody and play it the same way twice.',
      comping: 'Create a chord comping rhythm and play it the same way twice.',
      progression:
        'Create a chord progression with a rhythm and play it the same way twice.',
      challenge: 'Play ALL the notes!',
    });
  });
});

describe('a module passed', () => {
  const [color, , chords] = lessonModules(PART2_FIXTURE);

  it('needs every step done: echoes passed, choices made, replays heard', () => {
    expect(moduleEchoPassed(color, {})).toBe(false);
    expect(moduleEchoPassed(color, passed('one-three-five'))).toBe(false);
    expect(
      moduleEchoPassed(
        color,
        passed('choose-key', 'one-three-five', 'choose-mode'),
      ),
    ).toBe(true);
    // A tried echo isn't passed; a round's pass doesn't count.
    expect(
      moduleEchoPassed(color, {
        'choose-key': { passed: true },
        'choose-mode': { passed: true },
        'one-three-five': { passed: false },
        'one-three-five:create': { passed: true },
      }),
    ).toBe(false);
    const [, , , sevenths] = lessonModules(PART2_FIXTURE);
    expect(moduleEchoPassed(sevenths, passed('choose-four'))).toBe(false);
    expect(moduleEchoPassed(sevenths, passed('choose-four', 'hear-four'))).toBe(
      true,
    );
  });

  it('shows its card when its last echo finishes it, or is played again', () => {
    expect(lastEchoIndex(chords)).toBe(7);
    expect(lastEchoIndex(lessonModules(PART2_FIXTURE)[3])).toBeUndefined();
    const before = passed('the-1-chord', 'choose-x', 'play-1-x');
    const after = passed('the-1-chord', 'choose-x', 'play-1-x', 'play-x-1');
    expect(finishesModule(chords, 7, before, after)).toBe(true);
    // Not yet passed: no card.
    expect(finishesModule(chords, 7, {}, passed('play-x-1'))).toBe(false);
    // The module finished earlier: an earlier echo again shows none, its
    // last echo does.
    expect(finishesModule(chords, 4, after, after)).toBe(false);
    expect(finishesModule(chords, 7, after, after)).toBe(true);
    // Passing an earlier step last finishes it too.
    const rest = passed('choose-x', 'play-1-x', 'play-x-1');
    expect(
      finishesModule(chords, 4, rest, { ...rest, ...passed('the-1-chord') }),
    ).toBe(true);
  });
});

describe('a module’s round', () => {
  it('goes through the echoes that have its pass, less any that opt out', () => {
    const modules = lessonModules(PART2_FIXTURE);
    const tags = (i: number, lesson = PART2_FIXTURE) =>
      roundSteps(lessonModules(lesson)[i], lesson).map((s) => s.tag);
    expect(tags(0)).toEqual(['one-three-five']);
    expect(tags(2)).toEqual(['the-1-chord', 'play-1-x', 'play-x-1']);
    expect(roundSteps(modules[3], PART2_FIXTURE)).toEqual([]);

    const optOut: MusicLiteracyLesson = {
      ...PART2_FIXTURE,
      steps: PART2_FIXTURE.steps.map((s) =>
        s.tag === 'play-1-x' ? { ...s, passes: { create: false } } : s,
      ),
    };
    expect(tags(2, optOut)).toEqual(['the-1-chord', 'play-x-1']);

    // A challenge round: melodies only. None: no steps.
    const challenge = withModules([
      { title: 'Chords', round: 'challenge' },
      { title: 'Create a Melody', round: 'challenge' },
      { title: 'Choose a Color', round: 'none' },
    ]);
    expect(tags(1, challenge)).toEqual(['one-seven-one']);
    expect(tags(2, challenge)).toEqual([]);
    expect(tags(0, challenge)).toEqual([]);

    // Part 1's challenge round: every step.
    expect(
      roundSteps(lessonModules(LITERACY_FIXTURE)[0], LITERACY_FIXTURE),
    ).toHaveLength(7);
  });

  it('keeps its progress under its steps’ pass keys, and marks it from them', () => {
    const chords = lessonModules(PART2_FIXTURE)[2];
    expect(roundProgressKeys(chords, PART2_FIXTURE)).toEqual([
      'the-1-chord:create',
      'play-1-x:create',
      'play-x-1:create',
    ]);
    expect(roundMark(chords, PART2_FIXTURE, {})).toBe('todo');
    expect(
      roundMark(chords, PART2_FIXTURE, {
        'play-1-x:create': { passed: false },
      }),
    ).toBe('tried');
    // The echoes passed aren't the round.
    expect(
      roundMark(
        chords,
        PART2_FIXTURE,
        passed('the-1-chord', 'play-1-x', 'play-x-1'),
      ),
    ).toBe('todo');
    expect(
      roundMark(
        chords,
        PART2_FIXTURE,
        passed('the-1-chord:create', 'play-1-x:create', 'play-x-1:create'),
      ),
    ).toBe('passed');
    // A module with no round has no mark.
    expect(
      roundMark(lessonModules(PART2_FIXTURE)[3], PART2_FIXTURE, {}),
    ).toBeNull();
    const part1 = lessonModules(LITERACY_FIXTURE)[0];
    expect(roundProgressKeys(part1, LITERACY_FIXTURE)[0]).toBe(
      'note-called-c:challenge',
    );
  });

  it('opens on its first step not yet passed, else its first', () => {
    const chords = lessonModules(PART2_FIXTURE)[2];
    expect(roundStart(chords, PART2_FIXTURE, {})).toBe(4);
    expect(
      roundStart(chords, PART2_FIXTURE, passed('the-1-chord:create')),
    ).toBe(6);
    expect(
      roundStart(
        chords,
        PART2_FIXTURE,
        passed('the-1-chord:create', 'play-1-x:create', 'play-x-1:create'),
      ),
    ).toBe(4);
    expect(
      roundStart(lessonModules(PART2_FIXTURE)[3], PART2_FIXTURE, {}),
    ).toBeUndefined();
  });
});

describe('the lesson’s goal', () => {
  it('is its own, or the default where a module creates; Part 1 has none', () => {
    expect(lessonGoal(PART2_FIXTURE)).toBe(DEFAULT_LESSON_GOAL);
    expect(lessonGoal({ ...PART2_FIXTURE, goal: 'Make music.' })).toBe(
      'Make music.',
    );
    expect(lessonGoal(LITERACY_FIXTURE)).toBeNull();
    expect(lessonGoal({ ...LITERACY_FIXTURE, goal: 'Echo me.' })).toBe(
      'Echo me.',
    );
    expect(DEFAULT_LESSON_GOAL).toBe(
      'Your goal: create a melody, a chord comping rhythm, or a chord progression with a rhythm, and play it the same way twice.',
    );
  });
});
