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
import { stepPasses } from '../passes';
import { getMusicLiteracy } from '../registry';

/**
 * The Part 2 seed, as the owner outlined it, which he goes on to edit in
 * the console: it holds to the schema, it is laid out as the editor saves
 * it, and its shape is Part 2's (the student's key, scale numbering, the
 * four sections, a create pass on every echo). Its notes are his to change,
 * so they aren't asserted here.
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

  it('has the owner’s four sections, in order', () => {
    expect(lessonSections(seed).map((s) => s.title)).toEqual([
      'Choose a Color',
      'Create a Melody',
      'Create a Chord Progression',
      '7th Chords',
    ]);
  });

  it('starts by choosing the key, and offers the create pass on every echo', () => {
    expect(seed.steps[0].kind).toBe('chooseKey');
    const echoes = seed.steps.filter(isEchoStep);
    expect(echoes.length).toBeGreaterThan(0);
    for (const step of echoes)
      expect(stepPasses(seed, step).create, step.tag).not.toBeNull();
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
