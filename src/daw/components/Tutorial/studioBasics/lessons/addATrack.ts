import type { TutorialStep } from '../../tutorials';
import {
  bottomTrack,
  instrumentChanged,
  switchedOff,
  switchedOn,
  trackAdded,
} from '../trackChecks';

// ── Studio Basics 2 · Add a Track ──────────────────────────────────────────
// A new track from + Add track's sheet, its Instruments category (the
// simple instrument picker), then Your Tracks again on it: its sound (this
// time from its ⋯ menu's Instrument…), M, S, Arm and Monitor input. The new
// track goes at the bottom and comes chosen, so the steps after the first
// point at the bottom row (bottomTrack) or at the chosen row's ⋯; the
// checks take the move on any track.

const STAGE = 'Add a track';

export const addATrackSteps: TutorialStep[] = [
  {
    id: 'add-track',
    stage: STAGE,
    instruction:
      'Click **Add track**, choose **Instruments**, then pick a sound for your new part.',
    hint: 'Your new track appears at the bottom, already chosen.',
    // The picker once it is open, the Instruments tile, the button.
    target: ['instrument-picker', 'add-track-soundfont', 'add-track-button'],
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Add a track for a new part' },
      {
        target: 'add-track-button',
        caption: '**Add track** shows every kind',
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
        // The sheet closes on Esc pressed inside it.
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
      'Try another sound: open your new row’s **⋯** menu, choose **Instrument…**, then pick a different one.',
    hint: 'The instrument button in the dock opens the same list. Your notes stay.',
    // The picker, the menu's item, then the chosen row's ⋯.
    target: [
      'instrument-picker',
      'track-menu-change-instrument',
      'track-menu-button',
    ],
    demo: [
      {
        target: 'selected-track-header',
        caption: 'Your new track, already chosen',
      },
      {
        target: 'track-menu-button',
        caption: 'Its **⋯** menu has more',
        action: 'click',
      },
      {
        target: 'track-menu-change-instrument',
        caption: '**Instrument…** changes its sound',
        action: 'hover',
      },
      {
        // Pressed inside the menu, which Esc closes.
        target: 'track-menu-change-instrument',
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
    instruction:
      'Open your new row’s **⋯** menu and turn on **Monitor input**, so you hear the new sound as you play.',
    target: ['track-menu-monitor', 'track-menu-button'],
    demo: [
      {
        target: 'track-menu-button',
        caption: '**⋯** again, on your new row',
        action: 'click',
      },
      {
        target: 'track-menu-monitor',
        caption: '**Monitor input**: hear it as you play',
        action: 'hover',
      },
      {
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
      'Your song has a new part, with its own sound and switches. Next: record yourself playing on it. Press **Finish**.',
    target: 'transport-record',
  },
];
