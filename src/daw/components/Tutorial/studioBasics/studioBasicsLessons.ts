import type { TutorialId } from '../tutorialCatalog';
import type { TutorialStep } from '../tutorials';
import { yourTracksSteps } from './lessons/yourTracks';
import { addATrackSteps } from './lessons/addATrack';
import { recordSteps } from './lessons/record';
import { pianoRollSteps } from './lessons/pianoRoll';
import { insightSteps } from './lessons/insight';
import { scoreSteps } from './lessons/score';
import { leadSheetSteps } from './lessons/leadSheet';
import { loopAndRepeatSteps } from './lessons/loopAndRepeat';
import { saveAndExportSteps } from './lessons/saveAndExport';

// ── Studio Basics: the lessons' steps ──────────────────────────────────────
// The nine lessons of the Studio Basics course (tutorialCatalog.ts has their
// titles, order and course), stop 4 of Start Here. Each step is a "watch me"
// demo, then the student's turn (demo/demoTypes.ts has the beats and the
// conventions: leave the Studio as you found it, don't do the student's
// task, short sentence-case captions).
//
// A cold start opens a lesson on the course's demo song (TUTORIAL_COURSES'
// `seed`); a lesson started from inside the editor runs on the student's
// own song. So a step can't count on a track by name: point at anchors,
// and check for a change against `armed`, the Studio as the turn began.
//
// Each lesson's steps live in its own file under lessons/, so lessons can be
// written side by side.

/** The course's lessons: each needs its steps here. */
type StudioBasicsLessonId = Extract<TutorialId, `studio-basics-${string}`>;

export const STUDIO_BASICS_STEPS: Record<StudioBasicsLessonId, TutorialStep[]> =
  {
    'studio-basics-your-tracks': yourTracksSteps,
    'studio-basics-add-a-track': addATrackSteps,
    'studio-basics-record': recordSteps,
    'studio-basics-piano-roll': pianoRollSteps,
    'studio-basics-insight': insightSteps,
    'studio-basics-score': scoreSteps,
    'studio-basics-lead-sheet': leadSheetSteps,
    'studio-basics-loop-and-repeat': loopAndRepeatSteps,
    'studio-basics-save-and-export': saveAndExportSteps,
  };
