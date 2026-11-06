// ── Which lessons have gone guided ─────────────────────────────────────────
// Light on purpose: the app's frame asks this on every navigation, and it mustn't
// pull in any lesson to answer. These take the whole window, as Audio's do.

const GUIDED_LESSONS = [
  /^\/learn\/keyboard\/genre\/pop\/1\/?$/,
  /^\/learn\/keyboard\/ionian\/[^/]+\/?$/,
  /^\/learn\/guitar\/ionian\/[^/]+\/?$/,
];

export const isGuidedLessonPath = (pathname: string) =>
  GUIDED_LESSONS.some((pattern) => pattern.test(pathname));
