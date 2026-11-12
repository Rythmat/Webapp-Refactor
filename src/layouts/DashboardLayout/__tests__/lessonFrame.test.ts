// @vitest-environment jsdom
// A place opened inside a lesson knows it by its frame's name, and only when
// it really is framed.
import { afterEach, describe, expect, it } from 'vitest';
import { isLessonFrame, LESSON_FRAME_NAME } from '../lessonFrame';

const realTop = Object.getOwnPropertyDescriptor(window, 'top');

afterEach(() => {
  window.name = '';
  if (realTop) Object.defineProperty(window, 'top', realTop);
});

const frameIn = () =>
  Object.defineProperty(window, 'top', { configurable: true, value: {} });

describe('isLessonFrame', () => {
  it('is false on its own page, whatever its name', () => {
    window.name = LESSON_FRAME_NAME;
    expect(isLessonFrame()).toBe(false);
  });

  it('is false in someone else’s frame', () => {
    frameIn();
    window.name = 'other';
    expect(isLessonFrame()).toBe(false);
  });

  it('is true in the lesson’s frame', () => {
    frameIn();
    window.name = LESSON_FRAME_NAME;
    expect(isLessonFrame()).toBe(true);
  });
});
