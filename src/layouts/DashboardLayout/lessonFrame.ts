// ── A place opened inside a lesson (owner, 2026-11-11) ─────────────────────
// A student's Learn, Songs, Library, Studio or Globe can open in a frame on
// their lesson page (live/workspace/LessonWorkspace), so the lesson keeps
// running around their work. In that frame the page drops the app's own
// frame (its rail, top bar and play bar): the lesson's bar is the frame.
//
// Known by the frame's name, which a frame keeps as it navigates (a URL
// parameter would be lost on the first link; sessionStorage is the tab's,
// shared with the lesson around it).

/** The name the lesson gives its frames. */
export const LESSON_FRAME_NAME = 'ma-lesson-workspace';

/** Whether this page is a place opened inside a lesson. */
export const isLessonFrame = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.name === LESSON_FRAME_NAME && window.self !== window.top;
  } catch {
    // A cross-origin parent: not ours.
    return false;
  }
};
