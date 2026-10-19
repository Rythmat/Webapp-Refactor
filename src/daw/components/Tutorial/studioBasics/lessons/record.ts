import type { TutorialStep } from '../../tutorials';
import {
  armedOnlyOnSelected,
  monitorOnlyOnRecordTrack,
  playedLive,
  takeKept,
  takeStarted,
} from '../recordChecks';

// ── Studio Basics 3 · Record ───────────────────────────────────────────────
// The Click and its count-in (the bottom rail's Click, and its arrow's
// settings: Off, 1 bar, 2 bars), the track to record on (chosen, the only
// one armed, the only one with Monitor input on), playing from the
// computer keyboard (Typing, from the top bar's ⋯) or a MIDI keyboard,
// then Record and Pause. Stage B has no Stop button: while a take runs,
// Play is Pause, and a pause keeps the take (Space does the same; Record
// again does not stop it). While Typing is on the letter keys play notes
// and their shortcuts (R, M, L) rest, so the lesson teaches the buttons.
//
// The demos point at Record and Pause and never press them: a take the
// demo made would be left in the song. The steps while a take runs have no
// demo, so nothing covers the Studio while the student plays.

const STAGE = 'Record';

export const recordSteps: TutorialStep[] = [
  {
    id: 'click-on',
    stage: STAGE,
    instruction:
      'Turn on the **Click** (the two dots in the bottom rail): a steady beat to play with.',
    target: 'metronome-toggle',
    // The dock shut: in a Chromebook's window the track list then shows
    // every row, so no armed track hides out of sight above the others.
    requires: { view: 'arrange', libraryOpen: false, channelStripTab: null },
    demo: [
      { caption: 'Record: play along and keep it' },
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
      'Click the arrow beside **Click**, then set **Count-in** to **1 bar**.',
    hint: 'A count-in plays clicks before the take begins. **Off** starts right away, and **2 bars** gives you more time.',
    // The choice once the settings are open, else the arrow.
    target: ['count-in-1', 'count-in-menu'],
    demo: [
      {
        target: 'count-in-menu',
        caption: 'This arrow opens the Click settings',
        action: 'click',
      },
      {
        target: 'count-in-1',
        caption: 'One bar of clicks, then you play',
        action: 'hover',
      },
      {
        target: 'count-in-2',
        caption: 'Two bars, for more time',
        action: 'hover',
      },
      {
        target: 'count-in-0',
        caption: '**Off** starts right away',
        action: 'hover',
      },
      {
        // Pressed inside the settings, which Esc closes (on the page, it
        // is the Studio's Stop).
        target: 'count-in-0',
        caption: '**Esc** closes it with no change',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: (s) => s.countInBars > 0,
  },
  {
    id: 'choose-track',
    stage: STAGE,
    instruction:
      'Choose the track you’ll record on: click its name, then turn on its **Arm** circle. Turn **Arm** off on every other track.',
    hint: 'Your take records onto the armed track, so keep only one lit.',
    target: 'selected-track-header',
    demo: [
      {
        target: 'selected-track-header',
        caption: 'You record on the track you choose',
      },
      {
        target: 'track-arm-0',
        caption: 'A lit **Arm** circle is ready',
        action: 'hover',
      },
      { caption: 'Keep only your track’s circle lit' },
    ],
    check: armedOnlyOnSelected,
  },
  {
    id: 'monitor',
    stage: STAGE,
    instruction:
      'Turn on **Monitor input** in your track’s **⋯** menu. Then turn it off in the other rows’ **⋯** menus, so your notes play only on your track.',
    hint: 'Rows don’t show it: look for the check beside **Monitor input** in each **⋯** menu.',
    // The menu's item once a menu is open, else the chosen row's ⋯.
    target: ['track-menu-monitor', 'track-menu-button'],
    demo: [
      {
        target: 'track-menu-button',
        caption: 'Your track’s **⋯** menu',
        action: 'click',
      },
      {
        target: 'track-menu-monitor',
        caption: '**Monitor input** plays what you play',
        action: 'hover',
      },
      {
        target: 'track-menu-monitor',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: monitorOnlyOnRecordTrack,
  },
  {
    id: 'play-notes',
    stage: STAGE,
    instruction:
      'Turn on **Typing**: open the **⋯** at the top right and choose **Play notes from the computer keyboard**. Then play a few notes: **A S D F G** are C D E F G.',
    hint: 'While **Typing** is on, letter keys play notes instead of shortcuts. A MIDI keyboard works too.',
    // The Typing pill once it is on, the menu's item, the ⋯ button.
    target: ['musical-typing', 'top-bar-more-typing', 'top-bar-more'],
    demo: [
      {
        target: 'top-bar-more',
        caption: 'This **⋯** has **Typing**',
        action: 'click',
      },
      {
        target: 'top-bar-more-typing',
        caption: 'It turns your keys into a piano',
        action: 'click',
      },
      { caption: '**A** plays C', action: { key: 'a' } },
      { caption: '**S** plays D', action: { key: 's' } },
      {
        target: 'musical-typing',
        caption: 'Click the pill to turn it off',
        action: 'click',
      },
    ],
    check: playedLive,
  },
  {
    id: 'record',
    stage: STAGE,
    instruction:
      'Click **Record** (the red dot in the bottom rail). After one bar of clicks, play along with the song.',
    target: 'transport-record',
    demo: [
      { target: 'transport-record', caption: '**Record** starts your take' },
      {
        target: 'transport-play',
        caption: 'While recording, this is **Pause**',
      },
      { caption: 'Your notes become a new clip' },
    ],
    check: takeStarted,
  },
  {
    id: 'stop',
    stage: STAGE,
    instruction:
      'Play a few notes, then click **Pause** (the white button) to stop and keep your take.',
    hint: 'The **Space** bar stops it too. Nothing recorded? Click **Record** and play again.',
    target: 'transport-play',
    check: takeKept,
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Your take is the new clip on your track. Press **Play** to hear it, and turn **Typing** off with the **×** on its pill. Next: open your clip in the Piano Roll. Press **Finish**.',
    target: ['musical-typing', 'transport-play'],
  },
];
