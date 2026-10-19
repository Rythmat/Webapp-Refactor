import type { TutorialStep } from '../../tutorials';
import {
  instrumentChanged,
  selectedAnotherTrack,
  switchedOff,
  switchedOn,
} from '../trackChecks';

// ── Studio Basics 1 · Your Tracks ──────────────────────────────────────────
// Each row of the track list is one track: click it to choose it, change
// what it plays, and its switches: M (mute), S (solo), the Arm circle and
// MON (monitor). The demos work on track 1, the second row, which every song
// in the course has (the Studio Basics song's Chords, or a band song's next
// part); the checks take the move on any track.
//
// Mute and solo are switched back off as their own steps, since a song left
// muted or soloed plays wrong. Arm and MON stay on: they change nothing the
// song plays, and the Record lesson picks the one track to record on.

const STAGE = 'Your tracks';

export const yourTracksSteps: TutorialStep[] = [
  {
    id: 'select-track',
    stage: STAGE,
    instruction:
      'Click another track’s name to select it. The white ring moves to the track you pick.',
    hint: 'The selected track is the one the Studio’s panels show and edit.',
    target: 'track-header-1',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'Your tracks: what each row can do' },
      {
        // The name, not the row's middle: that is the instrument button.
        target: 'track-name-0',
        caption: 'Each row is one track',
        action: 'click',
      },
      {
        target: 'selected-track-header',
        caption: 'The white ring shows your track',
      },
    ],
    check: selectedAnotherTrack,
  },
  {
    id: 'change-instrument',
    stage: STAGE,
    instruction:
      'Give a track a new sound: click the instrument name on its row, then pick an instrument from the list.',
    hint: 'The families are on the left. The track keeps its notes.',
    target: ['instrument-picker', 'selected-track-header'],
    demo: [
      {
        target: 'track-instrument-1',
        caption: 'This button names the sound',
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
      'Arm the highlighted track: click its circle. Arm gets a track ready to record.',
    hint: 'You’ll record in the Record lesson.',
    target: 'track-arm-1',
    demo: [
      {
        target: 'track-arm-1',
        caption: 'Arm (the circle) gets it ready to record',
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
      'Turn on **MON** (monitor) for that track, so you hear it as you play.',
    hint: 'With MON on, the notes you play on a keyboard sound through this track.',
    target: 'track-monitor-1',
    demo: [
      {
        target: 'track-monitor-1',
        caption: '**MON** lets you hear yourself play',
        action: 'click',
      },
      {
        target: 'track-monitor-1',
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
      'You picked a track, changed its sound, and used **M**, **S**, the Arm circle and **MON**. Next: add a track of your own. Press **Finish**.',
    target: 'add-track-button',
  },
];
