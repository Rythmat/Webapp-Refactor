import type { TutorialStep } from '../../tutorials';

// ── Studio Basics 1 · Your Tracks ──────────────────────────────────────────
// A working sample of the engine, written against anchors the editor had
// when it was built: a demo of clicks and a hover, a step with no demo, and a
// demo of store actions. To be rewritten as the lesson itself.

export const yourTracksSteps: TutorialStep[] = [
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
];
