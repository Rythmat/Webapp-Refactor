import { readFileSync } from 'node:fs';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import {
  isEchoStep,
  musicLiteracyBodySchema,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { canonicalLesson } from '@/features/admin/musicLiteracy/literacyLesson';
import { repoPrettierOptions } from '@/scripts/repoContent/tsWrite';
import { emptyChoices, missingChoices } from '../choices';
import { lessonSections, stepNotes } from '../literacy';
import { DEFAULT_LESSON_GOAL, lessonGoal, lessonModules } from '../modules';
import { stepPasses } from '../passes';
import { getMusicLiteracy } from '../registry';

/**
 * The Part 2 seed, as the owner outlined it, which he goes on to edit in
 * the console: it holds to the schema, it is laid out as the editor saves
 * it, and its shape is Part 2's (the student's key, scale numbering, its
 * five modules, each but the first ending in a create round on every echo,
 * and its one goal). Its notes are his to change, so they aren't asserted
 * here.
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

  it('has the owner’s five modules, in order, each a run of steps', () => {
    expect(lessonSections(seed).map((s) => s.title)).toEqual([
      'Choose a Color',
      'Create a Melody',
      'Chords',
      'Progressions',
      '7th Chords',
    ]);
    const modules = lessonModules(seed);
    expect(
      modules.map((m) => [m.title, m.steps.length, m.round, m.goal]),
    ).toEqual([
      ['Choose a Color', 7, 'none', null],
      [
        'Create a Melody',
        18,
        'create',
        'Create a melody and play it the same way twice.',
      ],
      [
        'Chords',
        5,
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
    // Chords: the mode, the 1 chord, choosing X, | 1 | X | and | X | 1 |.
    expect(modules[2].steps.map((s) => s.tag)).toEqual([
      'chords-major-or-minor',
      'the-1-chord',
      'choose-your-x',
      'play-1-x',
      'play-x-1',
    ]);
    expect(modules[3].steps[0].tag).toBe('play-1-1-x-x');
  });

  it('opens on its one goal', () => {
    expect(seed.goal).toBe(DEFAULT_LESSON_GOAL);
    expect(lessonGoal(seed)).toBe(DEFAULT_LESSON_GOAL);
  });

  it('starts by choosing the key, and creates on every echo after Choose a Color', () => {
    expect(seed.steps[0].kind).toBe('chooseKey');
    for (const module of lessonModules(seed)) {
      const echoes = module.steps.filter(isEchoStep);
      expect(echoes.length, module.title).toBeGreaterThan(0);
      for (const step of echoes) {
        const create = stepPasses(seed, step).create;
        if (module.title === 'Choose a Color')
          expect(create, step.tag).toBeNull();
        else expect(create, step.tag).not.toBeNull();
      }
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
