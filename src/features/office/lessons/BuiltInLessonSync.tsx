import { useBuiltInLessons } from './useBuiltInLessons';

/**
 * Keeps the built-in lessons, and the classes' unedited copies of them, in
 * step with the code wherever the Office is open, Present included (owner,
 * 2026-11-13: the same lesson on every device and every port), not only once
 * the Lessons tab has been visited. Draws nothing.
 */
export const BuiltInLessonSync = () => {
  useBuiltInLessons();
  return null;
};
