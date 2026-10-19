import type { TutorialStep } from '../../tutorials';
import {
  BOTTOM_CLIPS,
  SECOND_CLIPS,
  SECOND_HEADERS,
  SECOND_LANES,
  SECOND_LANE_ENDS,
  clipAdded,
  clipCopied,
  loopMoved,
  playedThenStopped,
  trackAdded,
} from '../loopAndRepeatChecks';

// ── Studio Basics 8 · Loop and Repeat ──────────────────────────────────
// Loop a part to practice it, then repeat an idea: turn Loop on (in the
// bottom rail), make the loop shorter on the ruler's top strip, play it and
// stop, then Duplicate a clip, Copy another and Paste it right after itself,
// and Duplicate a track (its ⋯ menu, which a right-click on the row opens
// too). The demos only point and open menus (each closed again with Esc):
// the loop, the clips and the tracks are the student's to change. The
// timeline's anchors are boxes over its canvas, so a right-click there
// lands on the canvas under them (demoPlayer's hitAt).

const STAGE = 'Loop and repeat';

export const loopAndRepeatSteps: TutorialStep[] = [
  {
    id: 'loop-on',
    stage: STAGE,
    instruction:
      'Click **Loop** at the bottom (the two arrows going round), or press **L**.',
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
      'Press **Play** (or the space bar) and listen to the music go round the loop. Then press **Play** again to stop.',
    hint: 'The loop keeps going until you stop it.',
    target: 'transport-play',
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'transport-play',
        caption: '**Play** goes round and round',
        action: 'hover',
      },
      {
        target: ['loop-region', 'timeline-loop-strip'],
        caption: 'Only the looped bars play',
        action: 'hover',
      },
    ],
    check: playedThenStopped,
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
    id: 'copy-a-clip',
    stage: STAGE,
    instruction:
      'Now repeat another track’s part. Right-click its clip and choose **Copy**.',
    hint: 'Copy keeps the clip ready to paste. Nothing changes in the song yet.',
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
    ],
    check: clipCopied,
  },
  {
    id: 'paste-here',
    stage: STAGE,
    instruction:
      'Right-click the empty space right after that clip, on the same row, and choose **Paste here**.',
    hint: 'Right-click close to the end of the clip, so the copy starts on the next bar.',
    // The row's whole lane when its end is out of sight (zoomed in).
    target: [...SECOND_LANE_ENDS, ...SECOND_LANES],
    requires: { view: 'arrange' },
    demo: [
      {
        target: SECOND_LANE_ENDS,
        caption: 'Right-click right after the clip',
        action: 'contextMenu',
      },
      {
        target: 'clip-menu-paste',
        caption: '**Paste here** puts the copy there',
        action: 'hover',
      },
      {
        target: 'clip-menu-paste',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: clipAdded,
  },
  {
    id: 'duplicate-a-track',
    stage: STAGE,
    instruction:
      'Right-click a track’s name on the left (or click its **⋯**) and choose **Duplicate track**.',
    hint: 'The copy goes right under it, with the same sound and every note, ready to change.',
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
        caption: '**Duplicate track** copies all of it',
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
      'Loop a part to practice it, and use **Duplicate**, **Copy** and **Paste here** to repeat your best ideas. Click **Loop** again when you want the whole song to play. Press **Finish** to go on.',
    target: 'transport-loop',
  },
];
