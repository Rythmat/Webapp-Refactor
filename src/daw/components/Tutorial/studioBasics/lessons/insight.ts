import type { TutorialStep } from '../../tutorials';
import {
  analyzed,
  anotherTrackPicked,
  insightOpen,
  trackPicked,
} from '../insightChecks';

// ── Studio Basics 5 · Insight ──────────────────────────────────────────────
// Insight names the chords of the notes picked: open it (the Inspector),
// pick the chords track and the bass track under Analyze Tracks, then
// Analyze. On the Studio Basics song it reads 1 maj → 6 min → 4 maj →
// 5 maj, the numbers of Music Literacy. The demos pick track 1 and take it
// out again; the student picks by name, as a song's tracks are its own.

const STAGE = 'Insight';

export const insightSteps: TutorialStep[] = [
  {
    id: 'open-insight',
    stage: STAGE,
    instruction:
      'Click the **Inspector** button at the top right to open Insight.',
    target: 'inspector-toggle',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Insight names the chords in your song' },
      {
        target: 'inspector-toggle',
        caption: '**Inspector** opens Insight',
        action: 'click',
      },
      { target: 'insight-tab', caption: 'Insight reads your notes' },
      {
        target: 'inspector-toggle',
        caption: 'Click again to close it',
        action: 'click',
      },
    ],
    check: insightOpen,
  },
  {
    id: 'pick-chords',
    stage: STAGE,
    instruction:
      'Under **Analyze Tracks**, click the track that plays your chords.',
    hint: 'Each button picks every note of that track. Click again to take them out.',
    // The Insight tab, if the Library tab is showing instead.
    target: ['insight-tracks', 'insight-tab'],
    demo: [
      {
        target: 'insight-tracks',
        caption: 'A button for each instrument track',
      },
      {
        target: 'insight-track-1',
        caption: 'Click one to pick its notes',
        action: 'click',
      },
      {
        target: 'insight-track-1',
        caption: 'Click again to take them out',
        action: 'click',
      },
    ],
    check: trackPicked,
  },
  {
    id: 'pick-bass',
    stage: STAGE,
    instruction:
      'Now click the bass track too. The bass plays each chord’s lowest note, which helps Insight name it.',
    target: 'insight-tracks',
    demo: [
      {
        // Not a track by its place: a band song has its bass on top.
        target: 'insight-tracks',
        caption: 'Add the bass: it plays the roots',
      },
    ],
    check: anotherTrackPicked,
  },
  {
    id: 'analyze',
    stage: STAGE,
    instruction:
      'Click **Analyze** under the tracks you picked. It says how many notes it will read.',
    hint: 'Not **Analyze Chords**, higher up: that one suggests chord names for the whole song.',
    target: 'insight-analyze',
    demo: [
      {
        target: 'insight-selection',
        caption: 'These are the notes you picked',
      },
      {
        target: 'insight-analyze',
        caption: '**Analyze** names their chords',
      },
    ],
    check: analyzed,
  },
  {
    id: 'read-chords',
    stage: STAGE,
    instruction:
      'Under **Harmony**, each chord has its number in the key. The Studio Basics song reads **1 maj → 6 min → 4 maj → 5 maj**.',
    hint: 'Under the numbers: the chord names and the key.',
    target: 'insight-selection',
    demo: [
      {
        target: 'insight-selection',
        caption: 'Your chords, by number in the key',
      },
    ],
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'You picked tracks and Insight named their chords. Those numbers are the same ones you used in Music Literacy. Next: your song as sheet music, in the Score. Press **Finish**.',
    target: 'view-switch-score',
  },
];
