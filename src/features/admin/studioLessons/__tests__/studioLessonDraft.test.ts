import { describe, expect, it } from 'vitest';
import { studioLessonSchema } from '@/content/studioLessons/schemas';
import {
  blankStudioLesson,
  studioLessonId,
} from '@/content/studioLessons/template';
import {
  canonicalLesson,
  lessonIssues,
  moveStep,
  newStepId,
  sameLesson,
} from '../studioLessonDraft';

const lesson = () => blankStudioLesson('funk-lock', 'Funk — Lock it');

describe('a new lesson', () => {
  it('is a valid draft that runs at once', () => {
    const l = lesson();
    expect(studioLessonSchema.safeParse(l).success).toBe(true);
    expect(l.status).toBe('draft');
    expect(lessonIssues(l)).toEqual([]);
  });

  it('gets an id from its title, unique among the taken', () => {
    expect(studioLessonId('Funk — Lock the Groove!', new Set())).toBe(
      'funk-lock-the-groove',
    );
    expect(studioLessonId('Funk', new Set(['funk', 'funk-2']))).toBe('funk-3');
    expect(studioLessonId('***', new Set())).toBe('lesson');
  });
});

describe('the draft as its file', () => {
  it('drops empty fields, and one spotlight is a string', () => {
    const l = lesson();
    l.seed = '';
    l.steps[0] = {
      ...l.steps[0],
      hint: '  ',
      target: ['transport-play'],
      requires: { view: undefined },
    };
    const file = canonicalLesson(l);
    expect(file).not.toHaveProperty('seed');
    expect(file.steps[0]).not.toHaveProperty('hint');
    expect(file.steps[0]).not.toHaveProperty('requires');
    expect(file.steps[0].target).toBe('transport-play');
  });

  it('gives Premium by the steps, whatever the draft said', () => {
    const l = lesson();
    expect(
      canonicalLesson({ ...l, requiresPremium: true }).requiresPremium,
    ).toBe(false);
    l.steps[0] = { ...l.steps[0], target: 'prism-key' };
    expect(canonicalLesson(l).requiresPremium).toBe(true);
  });

  it('counts an edit that changes only empty fields as no change', () => {
    const l = lesson();
    expect(sameLesson(l, { ...l, seed: '' })).toBe(true);
    expect(sameLesson(l, { ...l, title: 'Other' })).toBe(false);
  });
});

describe('what stops a save', () => {
  it('names the step and the field', () => {
    const l = lesson();
    l.steps[0] = { ...l.steps[0], instruction: '' };
    const [issue] = lessonIssues(l);
    expect(issue.step).toBe(0);
    expect(issue.where).toBe('Step 1 (play) · Instruction');
  });

  it('catches a repeated step id', () => {
    const l = lesson();
    l.steps.push({ ...l.steps[0] });
    expect(lessonIssues(l).some((i) => /used twice/.test(i.message))).toBe(
      true,
    );
  });
});

describe('steps', () => {
  it('get new ids, and move', () => {
    const l = lesson();
    expect(newStepId(l)).toBe('step');
    expect(newStepId(l, 'play')).toBe('play-2');
    const two = { ...l, steps: [...l.steps, { ...l.steps[0], id: 'b' }] };
    expect(moveStep(two, 0, 1).steps.map((s) => s.id)).toEqual(['b', 'play']);
    expect(moveStep(two, 0, 5)).toBe(two);
  });
});
