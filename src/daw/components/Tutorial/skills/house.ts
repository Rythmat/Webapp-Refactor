import type { TutorialStep } from '../tutorials';
import {
  addedAndSelected,
  atStart,
  effectOnSelected,
  newPartOn,
  notesAddedOnSelected,
  playedThenStopped,
  roleShowing,
  selectedTrack,
  trackPlaying,
} from '../lessonChecks';
import { ADD_DRUMS } from './targets';

// ── House — Make it pump (owner, 2026-11-09) ───────────────────────────────
// Sidechain, from a blank project: a four-on-the-floor beat at house tempo,
// a bass line from Prism, and the bass ducked under every kick by the
// Sidechain effect keyed to the drums.

const BEAT = 'Four on the floor';
const BASS = 'The bass';
const PUMP = 'The pump';

/** The selected track's ducker, and the one the step began with. */
const duckerOf = (s: Parameters<NonNullable<TutorialStep['check']>>[0]) =>
  selectedTrack(s)?.effects.ducker;

export const houseSteps: TutorialStep[] = [
  {
    id: 'house-bpm',
    stage: BEAT,
    instruction:
      'House runs at about **124 BPM**: set the **Tempo** at the top.',
    target: 'transport-bpm',
    requires: { view: 'arrange', libraryOpen: false, promptOpen: false },
    check: (s, armed) => s.bpm >= 118 && s.bpm <= 130 && s.bpm !== armed.bpm,
  },
  {
    id: 'add-drums',
    stage: BEAT,
    instruction: 'Click **+ Add track**, then **Add MIDI** › **Drums**.',
    target: ADD_DRUMS,
    check: addedAndSelected('drum-machine'),
  },
  {
    id: 'open-sequencer',
    stage: BEAT,
    instruction: 'Click **Edit** at the bottom left to open the step grid.',
    target: 'chanstrip-tab-piano-roll',
    check: (s) =>
      s.channelStripTab === 'piano-roll' &&
      selectedTrack(s)?.instrument === 'drum-machine',
  },
  {
    id: 'house-kit',
    stage: BEAT,
    instruction: 'Open the **kit** menu under the grid and pick **House**.',
    target: 'drum-kit-selector',
    check: (s) => selectedTrack(s)?.drumKit === 'house',
  },
  {
    id: 'four-on-floor',
    stage: BEAT,
    instruction:
      '**Double-click** a kick on every beat (steps **1, 5, 9, 13**), then an open hi-hat on each off-beat (steps **3, 7, 11, 15**).',
    why: 'A kick on every beat is house’s heartbeat; the hats between the kicks make it swing forward.',
    target: 'drum-machine-view',
    check: notesAddedOnSelected(8),
  },
  {
    id: 'hear-beat',
    stage: BEAT,
    instruction: 'Press **Play** to hear it, then stop.',
    target: 'transport-play',
    check: playedThenStopped,
  },
  {
    id: 'back-to-start',
    stage: BASS,
    instruction: 'Press **Back to start**.',
    target: 'transport-to-start',
    check: atStart,
  },
  {
    id: 'ask-bass',
    stage: BASS,
    instruction:
      'Open **Prism**, ask for a **house bass line** and press **Create**.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { promptOpen: true },
    check: newPartOn('bass'),
  },
  {
    id: 'bass-fx',
    stage: PUMP,
    instruction:
      'With the **bass** track selected, click **FX** at the bottom left: the effects on this track.',
    target: 'chanstrip-tab-fx',
    requires: { promptOpen: false },
    check: roleShowing('bass', 'fx'),
  },
  {
    id: 'add-ducker',
    stage: PUMP,
    instruction:
      'Click **Add effect** and pick **Sidechain** (under Dynamics).',
    why: 'A sidechain turns one track down whenever another one plays: here, the bass under the kick.',
    target: ['fx-add-ducker', 'fx-add-slot'],
    check: effectOnSelected('ducker'),
  },
  {
    id: 'set-key',
    stage: PUMP,
    instruction:
      'Set the Sidechain’s **Key** to your **Drums** track: that’s what triggers the duck.',
    target: ['ducker-key-select', 'fx-slot-ducker'],
    requires: { channelStripTab: 'fx' },
    check: (s) => {
      const drums = trackPlaying(s, 'drums');
      return !!drums && duckerOf(s)?.keyTrackId === drums.id;
    },
  },
  {
    id: 'raise-amount',
    stage: PUMP,
    instruction:
      'Raise **Amount** past **40%**, press **Play**, and hear the bass breathe with the kick.',
    target: ['fx-slot-ducker', 'chanstrip-tab-fx'],
    requires: { channelStripTab: 'fx' },
    check: (s, armed) => {
      const now = duckerOf(s)?.amount ?? 0;
      const was =
        armed.tracks.find((t) => t.id === s.selectedTrackId)?.effects.ducker
          .amount ?? 0;
      return now > 0.4 && now > was;
    },
  },
  {
    id: 'shape-release',
    stage: PUMP,
    instruction:
      'Now **Release**: shorter snaps the bass back fast, longer makes it swell. Set it by ear.',
    why: 'Matching the release to the tempo is what makes the pump feel musical, not choppy.',
    target: ['fx-slot-ducker', 'chanstrip-tab-fx'],
    requires: { channelStripTab: 'fx' },
    check: (s, armed) => {
      const was = armed.tracks.find((t) => t.id === s.selectedTrackId)?.effects
        .ducker.release;
      return was !== undefined && duckerOf(s)?.release !== was;
    },
  },
  {
    id: 'hear-pump',
    stage: PUMP,
    instruction: 'Play it once more, then stop. That pulse is house.',
    target: 'transport-play',
    check: playedThenStopped,
  },
];
