import type { TutorialId } from '../tutorialCatalog';
import type { TutorialStep } from '../tutorials';

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
// Your Tracks is a working sample of the engine, written against anchors the
// editor has today: a demo of clicks and a hover, a step with no demo, and a
// demo of store actions. The other eight are placeholders, one free-form
// card each, until their content is written.

/** The course's lessons: each needs its steps here. */
type StudioBasicsLessonId = Extract<TutorialId, `studio-basics-${string}`>;

/**
 * One free-form card, until the lesson's steps are written, pointing at
 * where the lesson will start.
 */
const comingSoon = (stage: string, target: string): TutorialStep[] => [
  {
    id: 'coming-soon',
    stage,
    instruction:
      'This lesson is coming soon. Press **Finish** to go on to the next one.',
    target,
  },
];

export const STUDIO_BASICS_STEPS: Record<StudioBasicsLessonId, TutorialStep[]> =
  {
    'studio-basics-your-tracks': [
      {
        id: 'open-mix',
        stage: 'Your tracks',
        instruction: 'Open the **Mix** view.',
        hint: 'Mix shows each track of your song as a strip, side by side.',
        target: 'view-switch-studio',
        requires: { view: 'arrange', libraryOpen: false },
        demo: [
          {
            target: 'view-switch-studio',
            caption: 'Mix shows every track side by side',
            action: 'click',
          },
          {
            target: 'mixer-section',
            caption: 'Each strip is one track of the song',
            action: 'hover',
          },
          {
            // Back where it started, so the student's turn has the move to make.
            target: 'view-switch-arrange',
            caption: 'Create is where you build the song',
            action: 'click',
          },
        ],
        check: (s) => s.currentView === 'studio',
      },
      {
        id: 'back-to-create',
        stage: 'Your tracks',
        instruction: 'Now go back to **Create**, where your song is built.',
        target: 'view-switch-arrange',
        check: (s) => s.currentView === 'arrange',
      },
      {
        id: 'more-views',
        stage: 'Your tracks',
        instruction:
          'Those are your tracks and the views that show them. Press **Finish** when you are ready.',
        target: 'add-track-button',
        demo: [
          {
            target: 'view-switch-score',
            caption: 'Score shows the same song as sheet music',
            action: (s) => s.setCurrentView('score'),
          },
          {
            target: 'view-switch-arrange',
            caption: 'Create brings you back',
            action: (s) => s.setCurrentView('arrange'),
          },
          {
            target: 'add-track-button',
            caption: 'Next, you will add a track of your own',
          },
        ],
      },
    ],
    'studio-basics-add-a-track': comingSoon('Add a track', 'add-track-button'),
    'studio-basics-record': comingSoon('Record', 'song-chip'),
    'studio-basics-piano-roll': comingSoon('The piano roll', 'song-chip'),
    'studio-basics-insight': comingSoon('Insight', 'song-chip'),
    'studio-basics-score': comingSoon('The score', 'view-switch-score'),
    'studio-basics-lead-sheet': comingSoon(
      'The lead sheet',
      'view-switch-leadsheet',
    ),
    'studio-basics-loop-and-repeat': comingSoon(
      'Loop and repeat',
      'transport-bpm',
    ),
    'studio-basics-save-and-export': comingSoon('Save and export', 'file-menu'),
  };
