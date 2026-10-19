import type { TutorialStep } from '../../tutorials';
import {
  instrumentChanged,
  selectedAnotherTrack,
  switchedOff,
  switchedOn,
} from '../trackChecks';

// ── Studio Basics 1 · Your Tracks ──────────────────────────────────────────
// Each row of the track list is one track (Stage B's 64 px row: its name,
// M, S and the Arm circle, with the rest in its ⋯ menu). Click a row's name
// to choose the track; the dock under the timeline then shows it, with its
// instrument as a button that opens the instrument picker. Monitor input is
// in the row's ⋯ menu. The demos work on track 1, the second row, which
// every song in the course has (the Studio Basics song's Chords, or a band
// song's next part); the checks take the move on any track.
//
// Mute and solo are switched back off as their own steps, since a song left
// muted or soloed plays wrong. Arm and Monitor input stay on: they change
// nothing the song plays, and the Record lesson leaves them on one track.

const STAGE = 'Your tracks';

export const yourTracksSteps: TutorialStep[] = [
  {
    id: 'select-track',
    stage: STAGE,
    instruction:
      'Click another track’s name to choose it. Its row lights up, and the dock under the timeline shows it.',
    hint: 'The track you choose is the one the dock shows and changes.',
    target: 'track-name-1',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Your tracks: what each row does' },
      {
        // The name, not the row's left edge: that is the instrument button.
        target: 'track-name-0',
        caption: 'Each row is one track',
        action: 'click',
      },
      {
        target: 'selected-track-header',
        caption: 'The lit row is your track',
      },
      {
        target: 'dock-instrument',
        caption: 'The dock below shows it too',
      },
    ],
    check: selectedAnotherTrack,
  },
  {
    id: 'change-instrument',
    stage: STAGE,
    instruction:
      'Give your track a new sound: click its instrument’s name in the dock, then pick one from the list.',
    hint: 'The families are on the left. Your notes stay as they are. The row’s **⋯** menu has **Instrument…** too.',
    target: ['instrument-picker', 'dock-instrument'],
    demo: [
      {
        target: 'dock-instrument',
        caption: 'This button names its sound',
        action: 'click',
      },
      {
        target: 'instrument-picker',
        caption: 'Families on the left, sounds on the right',
      },
      {
        target: 'instrument-family-brass',
        caption: 'Pick a family to see its sounds',
        action: 'click',
      },
      {
        // Pressed inside the picker: on the page, Esc is the Studio's
        // Stop, which keeps it from the picker.
        target: 'instrument-picker',
        caption: '**Esc** closes it with no change',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: instrumentChanged,
  },
  {
    id: 'mute',
    stage: STAGE,
    instruction: 'Mute the highlighted track: click its **M**.',
    hint: 'Mute silences a track while the others play.',
    target: 'track-mute-1',
    demo: [
      {
        target: 'track-mute-1',
        caption: '**M** (mute) silences a track',
        action: 'click',
      },
      {
        target: 'track-mute-1',
        caption: 'Click again to bring it back',
        action: 'click',
      },
    ],
    check: switchedOn('mute'),
  },
  {
    id: 'unmute',
    stage: STAGE,
    instruction: 'Now click **M** again to unmute it.',
    target: 'track-mute-1',
    check: switchedOff('mute'),
  },
  {
    id: 'solo',
    stage: STAGE,
    instruction: 'Solo the highlighted track: click its **S**.',
    hint: 'Solo plays only that track, so you can hear it alone.',
    target: 'track-solo-1',
    demo: [
      {
        target: 'track-solo-1',
        caption: '**S** (solo) plays only this track',
        action: 'click',
      },
      {
        target: 'track-solo-1',
        caption: 'Click again to hear them all',
        action: 'click',
      },
    ],
    check: switchedOn('solo'),
  },
  {
    id: 'unsolo',
    stage: STAGE,
    instruction: 'Click **S** again, so every track plays.',
    target: 'track-solo-1',
    check: switchedOff('solo'),
  },
  {
    id: 'arm',
    stage: STAGE,
    instruction:
      'Arm the highlighted track: click its circle. **Arm** gets a track ready to record.',
    hint: 'You’ll record in the Record lesson.',
    target: 'track-arm-1',
    demo: [
      {
        target: 'track-arm-1',
        caption: '**Arm** gets it ready to record',
        action: 'click',
      },
      {
        target: 'track-arm-1',
        caption: 'Click again to turn it off',
        action: 'click',
      },
    ],
    check: switchedOn('recordArmed'),
  },
  {
    id: 'monitor',
    stage: STAGE,
    instruction:
      'Open the **⋯** menu on the lit row and turn on **Monitor input**, so you hear that track as you play.',
    hint: 'With **Monitor input** on, the notes you play on a keyboard sound through this track. A right-click on a row opens the same menu.',
    // The menu's item once it is open, else the selected row's ⋯.
    target: ['track-menu-monitor', 'track-menu-button'],
    demo: [
      {
        target: 'track-menu-button',
        caption: '**⋯** has more for this track',
        action: 'click',
      },
      {
        target: 'track-menu-monitor',
        caption: '**Monitor input**: hear yourself play',
        action: 'hover',
      },
      {
        // Pressed inside the menu, which Esc closes (on the page, it is
        // the Studio's Stop).
        target: 'track-menu-monitor',
        caption: '**Esc** closes the menu',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: switchedOn('monitoring'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'You chose a track, changed its sound, and used **M**, **S**, **Arm** and **Monitor input**. Next: add a track of your own. Press **Finish**.',
    target: 'add-track-button',
  },
];
