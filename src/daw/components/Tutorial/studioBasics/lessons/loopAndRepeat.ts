import type { TutorialStep } from '../../tutorials';
import {
  BOTTOM_CLIPS,
  SECOND_CLIPS,
  SECOND_HEADERS,
  SECOND_LANES,
  clipAdded,
  loopMoved,
  trackAdded,
} from '../loopAndRepeatChecks';

// ── Studio Basics 8 · Loop and Repeat ──────────────────────────────────
// Loop a part to practice it, then repeat an idea: turn Loop on, make the
// loop shorter, play it, then Duplicate a clip, Copy and Paste one, and
// Duplicate a track. The demos only point and open menus (each closed again
// with Esc): the loop, the clips and the tracks are the student's to change.
// The timeline's anchors are boxes over its canvas, so a right-click there
// lands on the canvas under them (demoPlayer's hitAt).

const STAGE = 'Loop and repeat';

export const loopAndRepeatSteps: TutorialStep[] = [
  {
    id: 'loop-on',
    stage: STAGE,
    instruction:
      'Click **Loop** at the top (the two curved arrows), or press **L**.',
    hint: 'A loop plays the same bars over and over, so you can practice them.',
    target: 'transport-loop',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      {
        target: 'transport-loop',
        caption: '**Loop** plays a part over and over',
        action: 'hover',
      },
      {
        target: ['loop-region', 'timeline-loop-strip'],
        caption: 'The loop is marked on the ruler',
        action: 'hover',
      },
    ],
    check: (s) => s.loopEnabled,
  },
  {
    id: 'loop-shorter',
    stage: STAGE,
    instruction:
      'Make the loop shorter: on the top strip of the ruler, drag the little triangle at the loop’s right end to the left.',
    hint: 'Or drag along an empty stretch of the strip to draw a new loop.',
    target: ['loop-region', 'timeline-loop-strip'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'timeline-loop-strip',
        caption: 'The loop lives on this top strip',
        action: 'hover',
      },
      {
        target: 'loop-region',
        caption: 'Drag either end to change it',
        action: 'hover',
      },
    ],
    check: loopMoved,
  },
  {
    id: 'play-the-loop',
    stage: STAGE,
    instruction:
      'Press **Play** (or the space bar) and listen: the music goes round and round the loop.',
    hint: 'Press Play again, or the space bar, to stop.',
    target: 'transport-play',
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'transport-play',
        caption: '**Play** goes round the loop',
        action: 'hover',
      },
    ],
    check: (s) => s.isPlaying,
  },
  {
    id: 'duplicate-a-clip',
    stage: STAGE,
    instruction:
      'Right-click a clip (a block of notes on a track) and choose **Duplicate**. A copy lands right after it.',
    hint: 'Duplicate a clip on every track and the whole song is twice as long.',
    target: BOTTOM_CLIPS,
    requires: { view: 'arrange' },
    demo: [
      {
        target: BOTTOM_CLIPS,
        caption: 'Right-click a clip for its menu',
        action: 'contextMenu',
      },
      {
        target: 'clip-menu-duplicate',
        caption: '**Duplicate** adds a copy right after',
        action: 'hover',
      },
      {
        target: 'clip-menu-duplicate',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: clipAdded,
  },
  {
    id: 'copy-and-paste',
    stage: STAGE,
    instruction:
      'Now repeat another track’s part: right-click its clip and choose **Copy**, then right-click the empty space right after it, on the same row, and choose **Paste Here**.',
    hint: 'Right-click near the start of the next bar, so the copy lines up with the beat.',
    target: SECOND_CLIPS,
    requires: { view: 'arrange' },
    demo: [
      {
        target: SECOND_CLIPS,
        caption: 'Right-click another track’s clip',
        action: 'contextMenu',
      },
      {
        target: 'clip-menu-copy',
        caption: '**Copy** remembers the clip',
        action: 'hover',
      },
      {
        target: 'clip-menu-copy',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
      {
        target: SECOND_LANES,
        caption: 'Then right-click this row’s empty space',
        action: 'hover',
      },
    ],
    check: clipAdded,
  },
  {
    id: 'duplicate-a-track',
    stage: STAGE,
    instruction:
      'Right-click a track’s name on the left and choose **Duplicate Track**.',
    hint: 'The copy has the same instrument and every note, ready to change.',
    target: SECOND_HEADERS,
    requires: { view: 'arrange' },
    demo: [
      {
        target: SECOND_HEADERS,
        caption: 'Right-click a track for its menu',
        action: 'contextMenu',
      },
      {
        target: 'track-menu-duplicate',
        caption: '**Duplicate Track** copies all of it',
        action: 'hover',
      },
      {
        target: 'track-menu-duplicate',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: trackAdded,
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Loop a part to practice it, and use **Duplicate**, **Copy** and **Paste Here** to repeat your best ideas. Click **Loop** again when you want the whole song to play. Press **Finish** to go on.',
    target: 'transport-loop',
  },
];
