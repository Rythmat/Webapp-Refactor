import { readdirSync, readFileSync } from 'node:fs';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { blankLiteracyLesson } from '@/content/musicLiteracy/template';
import {
  LITERACY_FIXTURE,
  type LiteracyFixtureStep,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import {
  PART2_FIXTURE,
  PART2_GATED_FIXTURE,
  PART2_STEPS,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import { repoPrettierOptions } from '@/scripts/repoContent/tsWrite';
import { choiceOf, STEP_CHOICES } from '../literacyKinds';
import {
  addStep,
  addStepOfChoice,
  canonicalLesson,
  chooseStepWarning,
  duplicateStep,
  gateSlot,
  indexAfterMove,
  issueItems,
  issuesAt,
  issuesOutside,
  issueWhere,
  kebab,
  lessonIdFor,
  lessonIssues,
  lessonPass,
  lessonRound,
  moduleEntry,
  moveIntoGate,
  moveStep,
  moveStepTo,
  removeStep,
  renameSection,
  renameStep,
  sectionNames,
  stepIssues,
  stepMove,
  withLessonPass,
  withLessonRound,
  withModule,
  withModulesPruned,
  withStepPass,
} from '../literacyLesson';

/**
 * The lesson-wide edits: steps added, copied, moved and removed with tags
 * that stay unique and stay put once saved, the schema's problems where
 * the editor shows them, and the body laid out exactly as its file.
 */

const FILE =
  'src/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture.json';
const PART_1 = LITERACY_FIXTURE;
const tags = (lesson: MusicLiteracyLesson) => lesson.steps.map((s) => s.tag);
/** A step these tests know is a Part 1 step. */
const part1 = (step: LiteracyStep) => step as LiteracyFixtureStep;

/** The file's text for a body, as the dev writer and repo mode write it. */
const fileText = async (body: unknown) =>
  format(JSON.stringify(body, null, 2), {
    ...(await repoPrettierOptions()),
    parser: 'json',
  });

describe('the lesson’s file', () => {
  it('is the seed byte for byte when laid out as the editor saves it', async () => {
    expect(await fileText(canonicalLesson(PART_1))).toBe(
      readFileSync(FILE, 'utf8'),
    );
  });

  it('lays every real lesson file out exactly as the editor saves it', async () => {
    const dir = 'src/curriculum/data/musicLiteracy';
    const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const text = readFileSync(`${dir}/${name}`, 'utf8');
      expect(
        await fileText(
          canonicalLesson(JSON.parse(text) as MusicLiteracyLesson),
        ),
        name,
      ).toBe(text);
    }
  });

  it('puts a field an edit adds where the file has it, and drops empty ones', () => {
    const edited: MusicLiteracyLesson = {
      ...PART_1,
      description: '',
      steps: [
        {
          ...PART_1.steps[0],
          passMark: 80,
          direction: '',
          response: {
            bars: 1,
            notes: [{ tick: 0, duration: 480, degree: '1', octave: 0 }],
          },
        },
      ],
      order: 3,
    };
    const out = canonicalLesson(edited);
    expect(Object.keys(out)).toEqual([
      'id',
      'name',
      'status',
      'part',
      'order',
      'key',
      'tempo',
      'timeSignature',
      'countInBars',
      'steps',
    ]);
    expect(Object.keys(out.steps[0])).toEqual([
      'tag',
      'title',
      'words',
      'call',
      'response',
      'passMark',
    ]);
    expect(part1(out.steps[0]).response?.notes[0]).toEqual({
      tick: 0,
      duration: 480,
      degree: '1',
    });
  });
});

describe('a Part 2 lesson’s file', () => {
  it('lays each kind out in the schema’s order, the kind first, an echo’s left out', () => {
    const lesson = canonicalLesson({
      ...PART2_FIXTURE,
      steps: [
        {
          kind: 'replay',
          title: 'Hear it',
          rhythm: [960, 960],
          harmonies: ['sevenths'],
          progression: 'four',
          tag: 'hear-it',
          section: '',
        },
        {
          passes: { createBars: 2, challenge: true, create: true },
          call: {
            harmony: 'triads',
            rhythm: [1920],
            chords: ['1', '4'],
          },
          title: 'Chords',
          kind: 'echo',
          tag: 'chords',
          section: 'Chords',
        },
        {
          tag: 'empty-passes',
          title: 'Empty passes',
          call: { bars: 1, notes: [{ tick: 0, duration: 480, degree: '1' }] },
          passes: {},
        },
      ] as MusicLiteracyLesson['steps'],
    });
    expect(Object.keys(lesson)).toEqual([
      'id',
      'name',
      'status',
      'part',
      'key',
      'keyChoice',
      'numbering',
      'passes',
      'tempo',
      'timeSignature',
      'countInBars',
      'steps',
    ]);
    expect(lesson.steps.map((step) => Object.keys(step))).toEqual([
      ['kind', 'tag', 'title', 'progression', 'harmonies', 'rhythm'],
      ['tag', 'section', 'title', 'call', 'passes'],
      ['tag', 'title', 'call'],
    ]);
    const [, chords] = lesson.steps;
    expect(chords.kind === undefined && Object.keys(chords.call)).toEqual([
      'chords',
      'rhythm',
      'harmony',
    ]);
    expect(chords.kind === undefined && chords.passes).toEqual({
      challenge: true,
      create: true,
      createBars: 2,
    });
  });
});

describe('the steps', () => {
  it('adds a step with a tag of its own', () => {
    const lesson = addStep(addStep(blankLiteracyLesson('x', 'X')));
    expect(tags(lesson)).toEqual(['step-1', 'step-2', 'step-3']);
    expect(lessonIssues(lesson)).toEqual([]);
  });

  it('copies a step right after it, under a new unique tag', () => {
    const once = duplicateStep(PART_1, 0);
    expect(once.steps).toHaveLength(PART_1.steps.length + 1);
    // The title as typed, marked a copy in Title Case.
    expect(once.steps[1].title).toBe('A note called C (Copy)');
    expect(once.steps[1].tag).toBe('a-note-called-c-copy');
    expect(part1(once.steps[1]).words).toEqual(PART_1.steps[0].words);
    expect(part1(once.steps[1]).words).not.toBe(PART_1.steps[0].words);
    const twice = duplicateStep(once, 0);
    expect(twice.steps[1].tag).toBe('a-note-called-c-copy-2');
    expect(new Set(tags(twice)).size).toBe(twice.steps.length);
  });

  it('moves a step up and down, never past either end', () => {
    const down = moveStep(PART_1, 0, 1);
    expect(tags(down).slice(0, 2)).toEqual(['root-is-1', 'note-called-c']);
    expect(moveStep(down, 1, -1)).toEqual(PART_1);
    expect(moveStep(PART_1, 0, -1)).toBe(PART_1);
    expect(moveStep(PART_1, PART_1.steps.length - 1, 1)).toBe(PART_1);
  });

  it('removes a step, and refuses to save a lesson with none', () => {
    const fewer = removeStep(PART_1, 2);
    expect(tags(fewer)).not.toContain('add-the-3');
    const none = PART_1.steps.reduce<MusicLiteracyLesson>(
      (l) => removeStep(l, 0),
      PART_1,
    );
    expect(lessonIssues(none)).toEqual([
      { path: ['steps'], where: 'Steps', message: 'Needs at least one.' },
    ]);
  });

  it('keeps a saved step’s tag when it is renamed, and retags a new one', () => {
    const saved = new Set(tags(PART_1));
    const renamed = renameStep(PART_1, 0, 'Meet C', saved);
    expect(renamed.steps[0]).toMatchObject({
      title: 'Meet C',
      tag: 'note-called-c',
    });
    const added = addStep(PART_1);
    const last = added.steps.length - 1;
    const retitled = renameStep(added, last, 'Flat the 3 again', saved);
    expect(retitled.steps[last].tag).toBe('flat-the-3-again');
    // A title another step's tag already has gets a number.
    const clash = renameStep(added, last, 'The root is 1', saved);
    expect(clash.steps[last].tag).toBe('the-root-is-1');
    const same = renameStep(added, last, 'Root is 1', saved);
    expect(same.steps[last].tag).toBe('root-is-1-2');
  });
});

describe('a step’s pickup in the file', () => {
  const pickupStep = {
    ...PART_1.steps[1],
    words: {
      bars: 2,
      pickup: 480,
      notes: [
        { tick: -480, duration: 240, degree: '1', text: 'When' },
        { tick: -240, duration: 240, degree: '1', text: 'I' },
        { tick: 0, duration: 480, degree: '1', text: 'play' },
      ],
    },
  } satisfies MusicLiteracyLesson['steps'][number];

  it('writes it between the bars and the notes, and none when there is none', () => {
    const out = canonicalLesson({ ...PART_1, steps: [pickupStep] });
    expect(Object.keys(part1(out.steps[0]).words)).toEqual([
      'bars',
      'pickup',
      'notes',
    ]);
    expect(part1(out.steps[0]).words.notes[0]).toEqual({
      tick: -480,
      duration: 240,
      degree: '1',
      text: 'When',
    });
    expect(Object.keys(part1(canonicalLesson(PART_1).steps[0]).words)).toEqual([
      'bars',
      'notes',
    ]);
    expect(lessonIssues({ ...PART_1, steps: [pickupStep] })).toEqual([]);
  });

  it('says what is wrong with one in the editor’s words', () => {
    const tooEarly = {
      ...pickupStep,
      words: { ...pickupStep.words, pickup: 240 },
    };
    const tooLong = {
      ...pickupStep,
      tag: 'too-long',
      words: { ...pickupStep.words, pickup: 1920 },
    };
    const issues = lessonIssues({ ...PART_1, steps: [tooEarly, tooLong] });
    expect(issues.map((i) => [i.where, i.message])).toEqual([
      [
        'Step 1 · words, syllable 1',
        'A syllable starts before the pickup: make the pickup longer',
      ],
      [
        'Step 2 · words pickup',
        'A pickup must be at least an eighth shorter than a bar',
      ],
    ]);
  });
});

describe('the problems', () => {
  it('says where each is in the editor’s words', () => {
    const broken: MusicLiteracyLesson = {
      ...PART_1,
      name: '',
      steps: [
        PART_1.steps[0],
        {
          ...PART_1.steps[1],
          title: '',
          call: {
            bars: 1,
            notes: [{ tick: 1440, duration: 960, degree: '1' }],
          },
        },
        { ...PART_1.steps[2], tag: PART_1.steps[0].tag },
      ],
    };
    const issues = lessonIssues(broken);
    expect(issues.map((i) => [i.where, i.message])).toEqual(
      expect.arrayContaining([
        ['Lesson name', 'Can’t be empty.'],
        ['Step 2 · title', 'Can’t be empty.'],
        ['Step 2 · call, note 1', 'A call note runs past its 1 bar(s)'],
        ['Step 3 · tag', 'Step tag "note-called-c" is used twice'],
      ]),
    );
    expect(stepIssues(issues, 1)).toHaveLength(2);
    expect(stepIssues(issues, 0)).toEqual([]);
  });

  it('accepts the seed', () => {
    expect(lessonIssues(PART_1)).toEqual([]);
  });
});

describe('ids', () => {
  it('makes kebab ids and tags from names and titles', () => {
    expect(kebab('Music Literacy · Part 2')).toBe('music-literacy-part-2');
    expect(kebab('Flat the ♭3: Minor')).toBe('flat-the-b3-minor');
    expect(kebab("That's ♯4!")).toBe('thats-sharp4');
    expect(lessonIdFor('Literacy Fixture · Part 1', [PART_1])).toBe(
      'literacy-fixture-part-1-2',
    );
    expect(lessonIdFor('???', [])).toBe('music-literacy');
  });
});

describe('a step of each kind (Add step’s menu)', () => {
  it('adds every kind, each a step the schema accepts once its lesson can have it', () => {
    let lesson: MusicLiteracyLesson = PART2_FIXTURE;
    for (const { choice } of STEP_CHOICES) {
      lesson = addStepOfChoice(lesson, choice);
      const added = lesson.steps.at(-1)!;
      expect(choiceOf(added), choice).toBe(choice);
      // In the last step's section, laid out as the file has it.
      expect(added.section).toBe('7th Chords');
      expect(canonicalLesson(lesson).steps.at(-1)).toEqual(added);
    }
    expect(lessonIssues(lesson)).toEqual([]);
    expect(new Set(tags(lesson)).size).toBe(lesson.steps.length);
  });

  it('gives a Part 2 melody no words, and a Part 1 melody the template’s', () => {
    const part2 = addStepOfChoice(PART2_FIXTURE, 'melody');
    expect(part2.steps.at(-1)).not.toHaveProperty('words');
    const part1 = addStepOfChoice(PART_1, 'melody');
    expect(part1.steps.at(-1)).toMatchObject({
      tag: 'step-8',
      title: 'Step 8',
      words: { bars: 1 },
    });
    expect(part1.steps.at(-1)).not.toHaveProperty('section');
    expect(lessonIssues(part1)).toEqual([]);
  });

  it('puts a step where it is asked, in the section asked, or none', () => {
    const at = addStepOfChoice(PART2_FIXTURE, 'chords', 2, 'Choose a Color');
    expect(at.steps[2]).toMatchObject({
      section: 'Choose a Color',
      title: 'Play the Chords',
      call: { chords: ['1', '1'], rhythm: [480, 480, 960], harmony: 'triads' },
    });
    expect(at.steps).toHaveLength(PART2_FIXTURE.steps.length + 1);
    const none = addStepOfChoice(PART2_FIXTURE, 'chords', 3, null);
    expect(none.steps[3]).not.toHaveProperty('section');
  });

  it('saves a new choose-chords step under a free name, and replays the last saved before it', () => {
    const twice = addStepOfChoice(
      addStepOfChoice(PART2_FIXTURE, 'chooseChords'),
      'chooseChords',
    );
    const [first, second] = twice.steps.slice(-2);
    expect(first.kind === 'chooseChords' && first.saveAs).toBe(
      'choose-a-chord',
    );
    expect(second.kind === 'chooseChords' && second.saveAs).toBe(
      'choose-a-chord-2',
    );
    const replay = addStepOfChoice(twice, 'replay');
    expect(replay.steps.at(-1)).toMatchObject({
      kind: 'replay',
      progression: 'choose-a-chord-2',
    });
    // Before any choose-chords step: one to name, which the schema flags.
    const early = addStepOfChoice(PART2_FIXTURE, 'replay', 1);
    expect(early.steps[1]).toMatchObject({ progression: 'my-progression' });
    expect(lessonIssues(early).map((i) => i.where)).toEqual([
      'Step 2 · saved progression',
    ]);
  });
});

describe('sections', () => {
  const sections = (lesson: MusicLiteracyLesson) =>
    lesson.steps.map((step) => step.section ?? null);

  it('moves a step within its section, and over a section’s edge into the next', () => {
    // Step 6 (play-1-x) is in Chords, between two others of it.
    expect(stepMove(PART2_FIXTURE, 6, -1)).toEqual({
      to: 5,
      section: 'Chords',
    });
    // Step 4 (the-1-chord) is the first of Chords: up takes it into the
    // section above, where it is.
    expect(stepMove(PART2_FIXTURE, 4, -1)).toEqual({
      to: 4,
      section: 'Create a Melody',
    });
    const up = moveStep(PART2_FIXTURE, 4, -1);
    expect(tags(up)).toEqual(tags(PART2_FIXTURE));
    expect(sections(up).slice(3, 6)).toEqual([
      'Create a Melody',
      'Create a Melody',
      'Chords',
    ]);
    // Steps with none are a section of their own.
    expect(stepMove(PART2_FIXTURE, 1, -1)).toEqual({
      to: 1,
      section: undefined,
    });
    expect(moveStep(PART2_FIXTURE, 1, -1).steps[1]).not.toHaveProperty(
      'section',
    );
    expect(stepMove(PART2_FIXTURE, 0, -1)).toBeNull();
    expect(stepMove(PART2_FIXTURE, PART2_FIXTURE.steps.length - 1, 1)).toBe(
      null,
    );
  });

  it('drops a step anywhere, in any section', () => {
    const moved = moveStepTo(PART2_FIXTURE, 1, 6, 'Chords');
    expect(tags(moved).slice(0, 7)).toEqual([
      'choose-key',
      'choose-mode',
      'one-seven-one',
      'the-1-chord',
      'choose-x',
      'play-1-x',
      'one-three-five',
    ]);
    expect(moved.steps[6].section).toBe('Chords');
    expect(moveStepTo(PART2_FIXTURE, 3, 3, 'Create a Melody')).toBe(
      PART2_FIXTURE,
    );
    expect(indexAfterMove(1, 1, 6)).toBe(6);
    expect(indexAfterMove(4, 1, 6)).toBe(3);
    expect(indexAfterMove(4, 6, 1)).toBe(5);
    expect(indexAfterMove(8, 1, 6)).toBe(8);
  });

  it('lists its sections once each, and renames one run of steps', () => {
    expect(sectionNames(PART2_FIXTURE)).toEqual([
      'Choose a Color',
      'Create a Melody',
      'Chords',
      '7th Chords',
    ]);
    const renamed = renameSection(PART2_FIXTURE, [4, 5, 6, 7], 'Chord Calls');
    expect(sections(renamed).slice(4, 9)).toEqual([
      'Chord Calls',
      'Chord Calls',
      'Chord Calls',
      'Chord Calls',
      '7th Chords',
    ]);
    // An empty name takes the steps out of any section.
    expect(renameSection(PART2_FIXTURE, [1], ' ').steps[1]).not.toHaveProperty(
      'section',
    );
  });
});

describe('passes', () => {
  it('leaves a pass at its default out of the file, so Part 1 gains nothing', () => {
    expect(lessonPass(PART_1, 'challenge')).toBe(true);
    expect(lessonPass(PART_1, 'create')).toBe(false);
    const off = withLessonPass(PART_1, 'challenge', false);
    expect(off.passes).toEqual({ challenge: false });
    const back = withLessonPass(off, 'challenge', true);
    expect(back).not.toHaveProperty('passes');
    expect(canonicalLesson(back)).toEqual(canonicalLesson(PART_1));
    expect(withLessonPass(PART2_FIXTURE, 'create', false).passes).toEqual({
      challenge: false,
    });
  });

  it('sets a step’s own pass, or gives it back to the lesson', () => {
    const on = withStepPass(undefined, 'challenge', true);
    expect(on).toEqual({ challenge: true });
    expect(withStepPass(on, 'createBars', 2)).toEqual({
      challenge: true,
      createBars: 2,
    });
    expect(withStepPass(on, 'challenge', undefined)).toBeUndefined();
  });
});

describe('modules', () => {
  const MODULES: MusicLiteracyLesson['modules'] = [
    { title: 'Create a Melody', round: 'none' },
    { title: 'Chords', goal: 'Comp it.', round: 'create' },
  ];
  const lesson: MusicLiteracyLesson = { ...PART2_FIXTURE, modules: MODULES };

  it('sets a module’s goal and round, in its section’s place, dropping one left empty', () => {
    const one = withModule(PART2_FIXTURE, 'Chords', { round: 'challenge' });
    expect(one.modules).toEqual([{ title: 'Chords', round: 'challenge' }]);
    const two = withModule(one, 'Choose a Color', { goal: 'Pick one.' });
    expect(two.modules?.map((m) => m.title)).toEqual([
      'Choose a Color',
      'Chords',
    ]);
    // Back to the defaults: no entry, then no modules at all.
    const back = withModule(
      withModule(two, 'Chords', { round: undefined }),
      'Choose a Color',
      {
        goal: '',
      },
    );
    expect(back).not.toHaveProperty('modules');
    expect(moduleEntry(lesson, 'Chords')).toEqual(MODULES[1]);
    expect(withModule(lesson, 'Chords', { goal: undefined }).modules).toEqual([
      MODULES[0],
      { title: 'Chords', round: 'create' },
    ]);
  });

  it('keeps a module with its section when it is renamed', () => {
    const renamed = renameSection(lesson, [4, 5, 6, 7], 'Comping');
    expect(renamed.modules).toEqual([
      MODULES[0],
      { title: 'Comping', goal: 'Comp it.', round: 'create' },
    ]);
    // Part of a section renamed: its module copied for the new one.
    const part = renameSection(lesson, [6, 7], 'More chords');
    expect(part.modules).toEqual([
      ...MODULES,
      { title: 'More chords', goal: 'Comp it.', round: 'create' },
    ]);
    // Renamed into a section that has a module of its own: that one stays.
    const into = renameSection(lesson, [4, 5, 6, 7], 'Create a Melody');
    expect(into.modules).toEqual([MODULES[0]]);
    // Out of any section: the module goes.
    expect(renameSection(lesson, [3], ' ').modules).toEqual([MODULES[1]]);
  });

  it('lets a module go with its section’s last step', () => {
    expect(removeStep(lesson, 3).modules).toEqual([MODULES[1]]);
    expect(moveStepTo(lesson, 3, 3, 'Choose a Color').modules).toEqual([
      MODULES[1],
    ]);
    expect(withModulesPruned(lesson)).toBe(lesson);
    expect(
      withModulesPruned({ ...lesson, modules: [{ title: 'Gone' }] }),
    ).not.toHaveProperty('modules');
  });

  it('sets the lesson’s default round in its passes, as little as it must', () => {
    expect(lessonRound(PART_1)).toBe('challenge');
    expect(lessonRound(PART2_FIXTURE)).toBe('create');
    const none = withLessonRound(PART_1, 'none');
    expect(none.passes).toEqual({ challenge: false });
    expect(lessonRound(none)).toBe('none');
    expect(withLessonRound(none, 'challenge')).not.toHaveProperty('passes');
    expect(withLessonRound(PART_1, 'create').passes).toEqual({ create: true });
    // Part 2's: the challenge kept off under the create round.
    expect(withLessonRound(PART2_FIXTURE, 'challenge')).not.toHaveProperty(
      'passes',
    );
    expect(withLessonRound(PART2_FIXTURE, 'none').passes).toEqual({
      challenge: false,
    });
  });

  it('lays out the goal and the modules after the passes, each module title first', () => {
    const out = canonicalLesson({
      ...lesson,
      modules: [{ round: 'none', title: 'Create a Melody' } as never],
      goal: 'Make it twice.',
    });
    expect(Object.keys(out)).toEqual([
      'id',
      'name',
      'status',
      'part',
      'key',
      'keyChoice',
      'numbering',
      'passes',
      'goal',
      'modules',
      'tempo',
      'timeSignature',
      'countInBars',
      'steps',
    ]);
    expect(Object.keys(out.modules![0])).toEqual(['title', 'round']);
    expect(
      canonicalLesson({ ...lesson, goal: '', modules: [] }),
    ).not.toHaveProperty('goal');
    expect(canonicalLesson({ ...lesson, modules: [] })).not.toHaveProperty(
      'modules',
    );
  });

  it('names a module’s problem by its title', () => {
    expect(
      lessonIssues({ ...lesson, modules: [...MODULES, { title: 'Warm-up' }] }),
    ).toEqual([
      {
        path: ['modules', 2, 'title'],
        where: 'Module “Warm-up”',
        message: 'No steps are in a section called "Warm-up"',
      },
    ]);
  });
});

describe('the gate', () => {
  const gated = PART2_GATED_FIXTURE;
  /** The gate with major or minor asked again, in Chords, at step 6. */
  const again: MusicLiteracyLesson = {
    ...gated,
    steps: [
      ...gated.steps.slice(0, 5),
      { ...PART2_STEPS.mode, tag: 'mode-again', section: 'Chords' },
      ...gated.steps.slice(5),
    ],
  };

  it('warns at a choose step outside it, never at one in it', () => {
    expect(chooseStepWarning(gated, 0)).toBeNull();
    expect(chooseStepWarning(gated, 1)).toBeNull();
    expect(chooseStepWarning(gated, 2)).toBeNull(); // 1-3-5
    expect(chooseStepWarning(again, 5)).toMatch(
      /once, in “Choose a Color” at the start\. This step asks again/,
    );
    // No gate: how to make one. A lesson that picks the key: the schema's.
    expect(chooseStepWarning(PART2_FIXTURE, 2)).toMatch(
      /put the choose steps alone in the first section/,
    );
    expect(chooseStepWarning({ ...gated, keyChoice: undefined }, 0)).toBeNull();
  });

  it('moves one in: the key first, major or minor last', () => {
    expect(gateSlot(again, 5)).toEqual({ to: 2, section: 'Choose a Color' });
    const moved = moveIntoGate(again, 5);
    expect(moved.steps.slice(0, 3).map((st) => [st.tag, st.section])).toEqual([
      ['choose-key', 'Choose a Color'],
      ['choose-mode', 'Choose a Color'],
      ['mode-again', 'Choose a Color'],
    ]);
    const key = {
      ...again,
      steps: [
        ...again.steps.slice(0, 5),
        { ...PART2_STEPS.key, tag: 'key-again', section: 'Chords' },
        ...again.steps.slice(6),
      ],
    };
    expect(gateSlot(key, 5)?.to).toBe(0);
    expect(moveIntoGate(key, 5).steps[0].tag).toBe('key-again');
    // Nothing to move: in the gate already, another kind, or no gate.
    expect(gateSlot(again, 1)).toBeNull();
    expect(gateSlot(again, 2)).toBeNull();
    expect(gateSlot(PART2_FIXTURE, 2)).toBeNull();
    expect(moveIntoGate(PART2_FIXTURE, 2)).toBe(PART2_FIXTURE);
  });

  it('drops a module entry its section has become the gate', () => {
    // Choose a Color's last echo goes, and it is the gate: its entry goes.
    const lesson: MusicLiteracyLesson = {
      ...PART2_FIXTURE,
      steps: PART2_FIXTURE.steps.map((st, i) =>
        i < 3 ? { ...st, section: 'Choose a Color' } : st,
      ),
      modules: [
        { title: 'Choose a Color', round: 'none' },
        { title: 'Chords', goal: 'Comp it.' },
      ],
    };
    const gone = removeStep(lesson, 1);
    expect(gone.modules).toEqual([{ title: 'Chords', goal: 'Comp it.' }]);
    expect(lessonIssues(gone)).toEqual([]);
    // Left in, the schema names it.
    expect(lessonIssues({ ...gone, modules: lesson.modules })).toEqual([
      {
        path: ['modules', 0, 'title'],
        where: 'Module “Choose a Color”',
        message:
          '"Choose a Color" is the gate, where students choose: it has no goal or round',
      },
    ]);
  });
});

describe('where Part 2’s problems are', () => {
  it('names a chord call’s, a template’s and a pass’s fields', () => {
    expect(issueWhere(['steps', 4, 'call', 'chords', 1])).toBe(
      'Step 5 · chords, bar 2',
    );
    expect(issueWhere(['steps', 4, 'call', 'chords'])).toBe('Step 5 · chords');
    expect(issueWhere(['steps', 4, 'call', 'rhythm'])).toBe('Step 5 · rhythm');
    expect(issueWhere(['steps', 6, 'call', 'progression'])).toBe(
      'Step 7 · saved progression',
    );
    expect(issueWhere(['steps', 9, 'progression'])).toBe(
      'Step 10 · saved progression',
    );
    expect(issueWhere(['steps', 5, 'template'])).toBe('Step 6 · template');
    expect(issueWhere(['steps', 5, 'distinct'])).toBe(
      'Step 6 · different chords',
    );
    expect(issueWhere(['steps', 5, 'saveAs'])).toBe('Step 6 · saved as');
    expect(issueWhere(['steps', 1, 'passes', 'createBars'])).toBe(
      'Step 2 · create-pass bars',
    );
    expect(issueWhere(['steps', 0, 'kind'])).toBe('Step 1');
    expect(issueWhere(['steps', 1, 'call', 'notes', 2, 'degree'])).toBe(
      'Step 2 · call, note 3',
    );
  });

  it('finds a field’s problems, the items they name, and what no field claims', () => {
    const broken: MusicLiteracyLesson = {
      ...PART2_FIXTURE,
      keyChoice: undefined,
      steps: PART2_FIXTURE.steps.map((step) =>
        step.tag === 'the-1-chord' && 'call' in step
          ? {
              ...step,
              call: {
                chords: ['7', '1'],
                rhythm: [960, 1920],
                harmony: 'triads',
              },
            }
          : step,
      ),
    };
    const issues = stepIssues(lessonIssues(broken), 4);
    expect(issuesAt(issues, ['call', 'rhythm']).map((i) => i.message)).toEqual([
      'A chord rhythm runs past its bar',
    ]);
    expect(issueItems(issues, ['call', 'chords'])).toEqual(new Set([0]));
    expect(issuesAt(issues, ['call'], true)).toEqual([]);
    expect(issuesOutside(issues, [['call']])).toEqual([]);
    // The choose steps of a lesson whose key is its own: at the step.
    expect(
      stepIssues(lessonIssues(broken), 0).map((i) => [i.where, i.message]),
    ).toEqual([
      ['Step 1', 'Only a lesson whose key is the student’s choice asks for it'],
    ]);
  });
});
