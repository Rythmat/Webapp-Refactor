import { readFileSync } from 'node:fs';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import {
  isEchoStep,
  isGateStep,
  musicLiteracyBodySchema,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { canonicalLesson } from '@/features/admin/musicLiteracy/literacyLesson';
import { repoPrettierOptions } from '@/scripts/repoContent/tsWrite';
import { emptyChoices, missingChoices } from '../choices';
import { lessonSections, stepNotes } from '../literacy';
import {
  DEFAULT_LESSON_GOAL,
  lessonGate,
  lessonGoal,
  lessonModules,
} from '../modules';
import { stepPasses } from '../passes';
import { getMusicLiteracy } from '../registry';

/**
 * The Part 2 seed, as the owner outlined it, which he goes on to edit in
 * the console: it holds to the schema, it is laid out as the editor saves
 * it, and its shape is Part 2's (the student's key, scale numbering, the
 * gate first, where the key and major or minor are chosen once, then its
 * four modules, each ending in a create round on every echo, and its one
 * goal). Its notes are his to change, so they aren't asserted here.
 */

const FILE = 'src/curriculum/data/musicLiteracy/music-literacy-part-2.json';
const text = readFileSync(FILE, 'utf8');
const seed = JSON.parse(text) as MusicLiteracyLesson;

describe('the Part 2 seed', () => {
  it('holds to the schema and is laid out as the editor saves it', async () => {
    const result = musicLiteracyBodySchema.safeParse(seed);
    expect(result.success, String(result.error)).toBe(true);
    const laidOut = await format(
      JSON.stringify(canonicalLesson(seed), null, 2),
      {
        ...(await repoPrettierOptions()),
        parser: 'json',
      },
    );
    expect(laidOut).toBe(text);
  });

  it('is Part 2: the student’s key, scale numbering, in C at 80 by default', () => {
    expect(seed).toMatchObject({
      id: 'music-literacy-part-2',
      part: 2,
      key: { tonic: 'C', mode: 'major' },
      keyChoice: 'student',
      numbering: 'scale',
      tempo: 80,
    });
    expect(getMusicLiteracy('music-literacy-part-2')).toBeDefined();
  });

  it('opens on the gate, then the owner’s four modules, each a run of steps', () => {
    expect(lessonSections(seed).map((s) => s.title)).toEqual([
      'Choose a Color',
      'Create a Melody',
      'Chords',
      'Progressions',
      '7th Chords',
    ]);
    // The gate: the key, then major or minor. No module, no round.
    const gate = lessonGate(seed);
    expect(gate?.title).toBe('Choose a Color');
    expect(gate?.steps.map((s) => [s.kind, s.tag])).toEqual([
      ['chooseKey', 'choose-your-key'],
      ['chooseMode', 'choose-major-or-minor'],
    ]);
    expect(gate?.indices).toEqual([0, 1]);
    expect(seed.modules?.map((m) => m.title)).not.toContain('Choose a Color');

    const modules = lessonModules(seed);
    expect(
      modules.map((m) => [m.title, m.steps.length, m.round, m.goal]),
    ).toEqual([
      [
        'Create a Melody',
        22,
        'create',
        'Create a melody and play it the same way twice.',
      ],
      [
        'Chords',
        4,
        'create',
        'Create a chord comping rhythm and play it the same way twice.',
      ],
      [
        'Progressions',
        11,
        'create',
        'Create a chord progression with a rhythm and play it the same way twice.',
      ],
      [
        '7th Chords',
        16,
        'create',
        'Create a chord progression with 7th chords and a rhythm, and play it the same way twice.',
      ],
    ]);
    // Create a Melody opens on the melodic steps that were Choose a Color's,
    // in their order, then up 1-2-3.
    expect(modules[0].steps.slice(0, 6).map((s) => s.tag)).toEqual([
      'rhythm-on-1',
      'play-1-3-1',
      'rhythm-on-1-3',
      'add-the-5',
      'rhythm-on-1-3-5',
      'up-1-2-3',
    ]);
    // Chords: the 1 chord, choosing X, | 1 | X | and | X | 1 |.
    expect(modules[1].steps.map((s) => s.tag)).toEqual([
      'the-1-chord',
      'choose-your-x',
      'play-1-x',
      'play-x-1',
    ]);
    expect(modules[2].steps[0].tag).toBe('play-1-1-x-x');
    expect(modules[3].steps[0].tag).toBe('your-progression-with-7ths');
  });

  it('asks for the key and major or minor once, in the gate', () => {
    expect(seed.steps.filter(isGateStep).map((s) => s.tag)).toEqual([
      'choose-your-key',
      'choose-major-or-minor',
    ]);
    const tags = seed.steps.map((s) => s.tag);
    expect(tags).not.toContain('melody-major-or-minor');
    expect(tags).not.toContain('chords-major-or-minor');
    // Every step past it plays in the gate's key and mode: skipped, the
    // student is sent back to it.
    for (const step of seed.steps.slice(2)) {
      const missing = missingChoices(seed, step, emptyChoices()).filter(
        (m) => m.choice !== 'progression',
      );
      expect(missing, step.tag).toEqual([
        { choice: 'key', at: 'choose-your-key' },
        { choice: 'mode', at: 'choose-major-or-minor' },
      ]);
    }
  });

  it('says “Choose a Chord”, never “your X”', () => {
    const texts = [
      seed.name,
      seed.description,
      seed.goal,
      ...(seed.modules ?? []).flatMap((m) => [m.title, m.goal]),
      ...seed.steps.flatMap((s) => [s.section, s.title, s.direction]),
    ].filter((t): t is string => !!t);
    for (const text of texts) expect(text).not.toMatch(/\byour X\b/i);
    const chooser = (tag: string) => seed.steps.find((s) => s.tag === tag);
    expect(chooser('choose-your-x')).toMatchObject({
      title: 'Choose a Chord',
      direction: 'Pick a chord.',
    });
    expect(chooser('choose-your-x-7ths')).toMatchObject({
      title: 'Choose a Chord with 7ths',
      direction: 'Pick a chord.',
    });
  });

  it('opens on its one goal', () => {
    expect(seed.goal).toBe(DEFAULT_LESSON_GOAL);
    expect(lessonGoal(seed)).toBe(DEFAULT_LESSON_GOAL);
  });

  it('starts by choosing the key, and creates on every echo of every module', () => {
    expect(seed.steps[0].kind).toBe('chooseKey');
    for (const module of lessonModules(seed)) {
      const echoes = module.steps.filter(isEchoStep);
      expect(echoes.length, module.title).toBeGreaterThan(0);
      for (const step of echoes)
        expect(stepPasses(seed, step).create, step.tag).not.toBeNull();
    }
  });

  it('plays every step it can before anything is chosen, as a preview', () => {
    for (const step of seed.steps) {
      const notes = stepNotes(seed, step, emptyChoices());
      if (isEchoStep(step))
        expect(notes.call.length, step.tag).toBeGreaterThan(0);
      // Each choice a step needs is made by a step of the lesson.
      for (const missing of missingChoices(seed, step, emptyChoices()))
        expect(missing.at, `${step.tag}: ${missing.choice}`).not.toBeNull();
    }
  });
});
