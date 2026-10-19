import type { TutorialStep } from '../../tutorials';
import {
  bottomTrack,
  instrumentChanged,
  switchedOff,
  switchedOn,
  trackAdded,
} from '../trackChecks';

// ── Studio Basics 2 · Add a Track ──────────────────────────────────────────
// A new track from + Add Track's Instruments card (the simple picker), then
// Your Tracks again on it: its sound, M, S, Arm and MON. The new track goes
// at the bottom and comes selected, so the steps after the first point at
// the bottom row (bottomTrack); the checks take the move on any track.

const STAGE = 'Add a track';

export const addATrackSteps: TutorialStep[] = [
  {
    id: 'add-track',
    stage: STAGE,
    instruction:
      'Click **Add Track**, choose **Instruments**, then pick a sound for your new track.',
    hint: 'Your new track appears at the bottom, already selected.',
    // The picker once it is open, the Instruments card, the button.
    target: ['instrument-picker', 'add-track-soundfont', 'add-track-button'],
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Add a track for a new part' },
      {
        target: 'add-track-button',
        caption: '**Add Track** shows the kinds of track',
        action: 'click',
      },
      {
        target: 'add-track-soundfont',
        caption: '**Instruments** has every sound',
        action: 'click',
      },
      {
        target: 'instrument-picker',
        caption: 'Pick one and your track appears',
      },
      {
        // The menu closes on Esc pressed inside it.
        target: 'add-track-menu',
        caption: '**Esc** closes it for now',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: trackAdded,
  },
  {
    id: 'new-sound',
    stage: STAGE,
    instruction:
      'Try another sound: click the instrument name on your new track, then pick a different one.',
    hint: 'You can change a track’s sound any time. Its notes stay.',
    target: ['instrument-picker', ...bottomTrack('track-instrument-')],
    demo: [
      {
        target: 'selected-track-header',
        caption: 'Your new track, already selected',
      },
      {
        target: bottomTrack('track-instrument-'),
        caption: 'Its sound can change any time',
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
    instruction: 'Mute your new track: click its **M**.',
    target: bottomTrack('track-mute-'),
    demo: [
      {
        target: bottomTrack('track-mute-'),
        caption: '**M** mutes it, as before',
        action: 'click',
      },
      {
        target: bottomTrack('track-mute-'),
        caption: 'Click again to unmute',
        action: 'click',
      },
    ],
    check: switchedOn('mute'),
  },
  {
    id: 'unmute',
    stage: STAGE,
    instruction: 'Click **M** again to unmute it.',
    target: bottomTrack('track-mute-'),
    check: switchedOff('mute'),
  },
  {
    id: 'solo',
    stage: STAGE,
    instruction: 'Solo your new track: click its **S**.',
    hint: 'It has no notes yet, so solo plays silence until you record some.',
    target: bottomTrack('track-solo-'),
    demo: [
      {
        target: bottomTrack('track-solo-'),
        caption: '**S** plays this track alone',
        action: 'click',
      },
      {
        target: bottomTrack('track-solo-'),
        caption: 'Click again for every track',
        action: 'click',
      },
    ],
    check: switchedOn('solo'),
  },
  {
    id: 'unsolo',
    stage: STAGE,
    instruction: 'Click **S** again, so every track plays.',
    target: bottomTrack('track-solo-'),
    check: switchedOff('solo'),
  },
  {
    id: 'arm',
    stage: STAGE,
    instruction:
      'Arm your new track: click its circle, so it’s ready to record.',
    target: bottomTrack('track-arm-'),
    demo: [
      {
        target: bottomTrack('track-arm-'),
        caption: 'The circle arms it to record',
        action: 'click',
      },
      {
        target: bottomTrack('track-arm-'),
        caption: 'Click again to turn it off',
        action: 'click',
      },
    ],
    check: switchedOn('recordArmed'),
  },
  {
    id: 'monitor',
    stage: STAGE,
    instruction: 'Turn on **MON**, so you hear the new sound as you play.',
    target: bottomTrack('track-monitor-'),
    demo: [
      {
        target: bottomTrack('track-monitor-'),
        caption: '**MON**: hear it as you play',
        action: 'click',
      },
      {
        target: bottomTrack('track-monitor-'),
        caption: 'Click again to turn it off',
        action: 'click',
      },
    ],
    check: switchedOn('monitoring'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Your song has a new part, with its own sound and switches. Next: record yourself playing on it. Press **Finish**.',
    target: 'transport-record',
  },
];
