import { readFileSync } from 'node:fs';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { blankLiteracyLesson } from '@/content/musicLiteracy/template';
import { getMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { repoPrettierOptions } from '@/scripts/repoContent/tsWrite';
import {
  addStep,
  canonicalLesson,
  duplicateStep,
  kebab,
  lessonIdFor,
  lessonIssues,
  moveStep,
  removeStep,
  renameStep,
  stepIssues,
} from '../literacyLesson';

/**
 * The lesson-wide edits: steps added, copied, moved and removed with tags
 * that stay unique and stay put once saved, the schema's problems where
 * the editor shows them, and the body laid out exactly as its file.
 */

const FILE = 'src/curriculum/data/musicLiteracy/music-literacy-part-1.json';
const PART_1 = getMusicLiteracy('music-literacy-part-1') as MusicLiteracyLesson;
const tags = (lesson: MusicLiteracyLesson) => lesson.steps.map((s) => s.tag);

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
    expect(out.steps[0].response?.notes[0]).toEqual({
      tick: 0,
      duration: 480,
      degree: '1',
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
    expect(once.steps[1].title).toBe('A note called C (copy)');
    expect(once.steps[1].tag).toBe('a-note-called-c-copy');
    expect(once.steps[1].words).toEqual(PART_1.steps[0].words);
    expect(once.steps[1].words).not.toBe(PART_1.steps[0].words);
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
    const none = PART_1.steps.reduce((l) => removeStep(l, 0), PART_1);
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
    expect(lessonIdFor('Music Literacy · Part 1', [PART_1])).toBe(
      'music-literacy-part-1-2',
    );
    expect(lessonIdFor('???', [])).toBe('music-literacy');
  });
});
