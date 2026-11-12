import { describe, expect, it } from 'vitest';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import { loadLessonAtlas } from '@/features/classroom/slides/cortex/loadLessonAtlas';
import { sectionOf } from '@/features/classroom/slides/sections';
import type { Day } from '@/features/classroom/types';
import {
  BUILT_IN_LESSONS,
  copyLessonToClass,
  generateBuiltInLesson,
  lessonHash,
  syncBuiltInLesson,
} from '../builtInLessons';

const mj = BUILT_IN_LESSONS[0];

const generate = async (): Promise<Day> => {
  const day = generateBuiltInLesson(await loadLessonAtlas(), mj);
  if (!day) throw new Error('Michael Jackson is not in the Atlas');
  return day;
};

describe('the built-in lessons', () => {
  it('writes Michael Jackson · Producer, with the same id everywhere', async () => {
    const day = await generate();
    expect(day.id).toBe('builtin-mj-producer');
    expect(day.label).toBe('Michael Jackson · Producer');
    expect(day.classroomId).toBe(OFFICE_LESSONS_SCOPE);
    expect(day.deck?.templateRef).toMatchObject({
      focusId: 'artist:michael-jackson',
      role: 'producer',
    });
    // The nine slides of the lesson being perfected (see wordBudget.test),
    // through to Reflect.
    expect(day.deck!.slides).toHaveLength(9);
    expect(sectionOf(day.deck!.slides.at(-1)!)).toBe('reflect');
    // Every generated id carries the lesson's id, so a copy can rename them.
    for (const slide of day.deck!.slides)
      expect(slide.id.startsWith(day.id)).toBe(true);
  }, 60_000);

  it('comes out the same on every run', async () => {
    const [a, b] = [await generate(), await generate()];
    expect(lessonHash(a)).toBe(lessonHash(b));
  }, 60_000);

  it('copies into a class with new ids, on the chosen day', async () => {
    const day = await generate();
    const copy = copyLessonToClass(day, 'c1', '2026-11-16', 'day-copy');
    expect(copy).toMatchObject({
      id: 'day-copy',
      classroomId: 'c1',
      scheduledDate: '2026-11-16',
      label: day.label,
    });
    expect(JSON.stringify(copy)).not.toContain(day.id);
    expect(copy.deck!.slides).toHaveLength(day.deck!.slides.length);
    // The Lessons tab keeps its own.
    expect(day.classroomId).toBe(OFFICE_LESSONS_SCOPE);
  }, 60_000);
});

describe('keeping this device’s copy in step', () => {
  const base = { id: 'd', label: 'L', cells: {} } as unknown as Day;
  const changed = { ...base, label: 'L, rewritten by the code' };
  const edited = { ...base, label: 'L, the teacher’s' };

  it('writes the lesson when the device has none', () => {
    expect(syncBuiltInLesson(undefined, undefined, base)).toEqual({
      write: true,
      edited: false,
    });
  });

  it('leaves an unedited copy alone while the code is unchanged', () => {
    expect(syncBuiltInLesson(base, lessonHash(base), base)).toEqual({
      write: false,
      edited: false,
    });
  });

  it('replaces an unedited copy when the code’s lesson changed', () => {
    expect(syncBuiltInLesson(base, lessonHash(base), changed)).toEqual({
      write: true,
      edited: false,
    });
  });

  it('keeps a copy the teacher edited', () => {
    expect(syncBuiltInLesson(edited, lessonHash(base), changed)).toEqual({
      write: false,
      edited: true,
    });
  });

  it('never overwrites on a guess when the record is lost', () => {
    expect(syncBuiltInLesson(edited, undefined, base)).toEqual({
      write: false,
      edited: true,
    });
    expect(syncBuiltInLesson(base, undefined, base)).toEqual({
      write: false,
      edited: false,
    });
  });
});
