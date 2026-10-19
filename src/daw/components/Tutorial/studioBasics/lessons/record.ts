import type { TutorialStep } from '../../tutorials';
import {
  playedLive,
  recordsOnSelectedTrack,
  selectedTrackMonitored,
  takeKept,
  takeStarted,
} from '../recordChecks';

// ── Studio Basics 3 · Record ───────────────────────────────────────────────
// The Click and its count-in, the track to record on (selected, armed, with
// MON on), playing from the computer keyboard (Typing) or a MIDI keyboard,
// then Record and Stop. While Typing is on the letter keys play notes and
// their shortcuts (R, M, L) rest, so the lesson teaches the buttons.
//
// The demos point at Record and Stop and never press them: a take the demo
// made would be left in the song. The steps while a take runs have no demo,
// so nothing covers the Studio while the student plays.

const STAGE = 'Record';

export const recordSteps: TutorialStep[] = [
  {
    id: 'click-on',
    stage: STAGE,
    instruction: 'Turn the **Click** on: a steady beat to play with.',
    target: 'metronome-toggle',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Record: play along and keep your take' },
      {
        target: 'metronome-toggle',
        caption: '**Click** plays a steady beat',
        action: 'click',
      },
      {
        target: 'metronome-toggle',
        caption: 'Click it again to turn it off',
        action: 'click',
      },
    ],
    check: (s) => s.metronomeEnabled,
  },
  {
    id: 'click-off',
    stage: STAGE,
    instruction: 'Now turn the **Click** off again.',
    hint: 'Turn it on any time you want a steady beat to play with.',
    target: 'metronome-toggle',
    check: (s) => !s.metronomeEnabled,
  },
  {
    id: 'count-in',
    stage: STAGE,
    instruction:
      'Open the count-in menu (the arrow beside **Click**, or **⋯** in a small window) and choose **Count in 1 bar**.',
    hint: 'You hear one bar of clicks, then the take begins. **No count-in** starts right away.',
    // In a narrow window the choices move into the top bar's ⋯ menu.
    target: ['count-in-1', 'count-in-menu', 'top-bar-more'],
    demo: [
      {
        target: ['count-in-menu', 'top-bar-more'],
        caption: 'This arrow sets the count-in',
        action: 'click',
      },
      {
        target: 'count-in-1',
        caption: 'One bar of clicks before you play',
        action: 'hover',
      },
      {
        target: 'count-in-2',
        caption: 'Two bars, for more time',
        action: 'hover',
      },
      {
        target: 'count-in-0',
        caption: 'Or none: start right away',
        action: 'hover',
      },
      {
        // Pressed inside the menu, which Esc closes (on the page, it is
        // the Studio's Stop).
        target: 'count-in-0',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: (s) => s.countInBars > 0,
  },
  {
    id: 'choose-track',
    stage: STAGE,
    instruction:
      'Choose your track: click its name to select it, then turn on its Arm circle. If another track is armed too, click its circle off.',
    hint: 'Your take records onto the armed track.',
    target: 'selected-track-header',
    demo: [
      {
        target: 'selected-track-header',
        caption: 'You record on the track you select',
      },
      { caption: 'Its Arm circle lights up when on' },
      { caption: 'Arm only the track you’ll play' },
    ],
    check: recordsOnSelectedTrack,
  },
  {
    id: 'monitor',
    stage: STAGE,
    instruction: 'Turn on **MON** on your track, so you hear it as you play.',
    hint: 'Turn **MON** off on other tracks to hear only yours.',
    target: 'selected-track-header',
    demo: [
      {
        target: 'selected-track-header',
        caption: '**MON** lets you hear your track',
      },
    ],
    check: selectedTrackMonitored,
  },
  {
    id: 'play-notes',
    stage: STAGE,
    instruction:
      'Turn on **Typing**, then play a few notes on your computer keys: **A S D F G** play C D E F G. A MIDI keyboard works too.',
    hint: 'While **Typing** is on, letter keys play notes instead of shortcuts, so use the buttons on screen.',
    target: 'musical-typing',
    demo: [
      {
        target: 'musical-typing',
        caption: '**Typing** turns your keys into a piano',
        action: 'click',
      },
      { caption: '**A** plays C', action: { key: 'a' } },
      { caption: '**S** plays D', action: { key: 's' } },
      {
        target: 'musical-typing',
        caption: 'Click again to turn it off',
        action: 'click',
      },
    ],
    check: playedLive,
  },
  {
    id: 'record',
    stage: STAGE,
    instruction:
      'Click **Record** (the red circle). After the count-in, play along with the song.',
    target: 'transport-record',
    demo: [
      { target: 'transport-record', caption: '**Record** starts your take' },
      { target: 'transport-stop', caption: '**Stop** (the square) ends it' },
      { caption: 'Your notes become a new clip' },
    ],
    check: takeStarted,
  },
  {
    id: 'stop',
    stage: STAGE,
    instruction: 'Play a few notes, then click **Stop** (the square).',
    hint: 'Nothing recorded? Click **Record** and play again.',
    target: 'transport-stop',
    check: takeKept,
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Your take is the new clip on your track. Press **Play** to hear it, and turn **Typing** off when you’re done. Next: open it in the Piano Roll and fix any note. Press **Finish**.',
    target: 'transport-play',
  },
];
