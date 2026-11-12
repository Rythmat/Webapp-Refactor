import type { TutorialStep } from '../tutorials';
import {
  addedAndSelected,
  atStart,
  effectOnSelected,
  effectTweaked,
  newPartOn,
  notesAddedOnSelected,
  playedThenStopped,
  sectionAdded,
  selectedTrack,
} from '../lessonChecks';
import { pianoRollOpen } from '../studioBasics/pianoRollChecks';
import { playedLive } from '../studioBasics/recordChecks';
import { ADD_SYNTH } from './targets';

// ── EDM — Design the drop (owner, 2026-11-09) ──────────────────────────────
// Sound design, from a blank project: a synth from its first patch, the
// filter by hand, the WOBBLE bass, a minor key, a riff drawn in the piano
// roll, Saturator and OTT for weight, drums from Prism, and a Build-up and
// a Drop to put it in.

const SOUND = 'Shape the sound';
const RIFF = 'The riff';
const WEIGHT = 'Weight';
const DROP = 'The drop';

export const edmSteps: TutorialStep[] = [
  {
    id: 'add-synth',
    stage: SOUND,
    instruction: 'Click **+ Add track**, then **Add MIDI** › **Synth**.',
    why: 'The synth makes its sound from scratch, so every part of it is yours to shape.',
    target: ADD_SYNTH,
    requires: { view: 'arrange', libraryOpen: false, promptOpen: false },
    check: addedAndSelected('oracle-synth'),
  },
  {
    id: 'play-synth',
    stage: SOUND,
    instruction:
      'Turn on **Typing keys** at the bottom left and play a few notes (**A S D F**) to hear the synth as it starts.',
    target: 'musical-typing',
    check: playedLive,
  },
  {
    id: 'filter-down',
    stage: SOUND,
    instruction:
      'Turn the **filter cutoff** down on the synth’s controls while you play: the sound gets darker.',
    why: 'The filter takes away the bright top of a sound. Opening it again is how a build-up rises.',
    target: ['synth-controls', 'chanstrip-tab-controls'],
    requires: { channelStripTab: 'controls' },
    synthCheck: (sy, armed) => sy.filters[0].cutoff < armed.filters[0].cutoff,
  },
  {
    id: 'load-wobble',
    stage: SOUND,
    instruction:
      'Now a designed bass: in the synth’s patches pick **Bass**, then **WOBBLE**. An LFO moves its filter for you.',
    target: 'synth-preset-selector',
    requires: { channelStripTab: 'controls', soundsOpen: true },
    synthCheck: (sy) => sy.presetName === 'WOBBLE',
  },
  {
    id: 'minor-key',
    stage: RIFF,
    instruction:
      'Drops hit harder in minor: open **Key** at the top, pick a key and set its mode to **Aeolian** (minor).',
    target: ['key-popover', 'song-key'],
    check: (s) => s.rootNote !== null && s.mode === 'aeolian',
  },
  {
    id: 'open-roll',
    stage: RIFF,
    instruction: 'Click **Edit** to open the synth’s piano roll.',
    target: 'chanstrip-tab-piano-roll',
    check: pianoRollOpen,
  },
  {
    id: 'draw-riff',
    stage: RIFF,
    instruction:
      '**Double-click** to draw a riff of at least **4** notes, low on the keys: short notes on the beat, one long one at the end.',
    why: 'A wobble bass sounds best on low notes, with space for its LFO to move.',
    target: 'piano-roll-grid',
    check: notesAddedOnSelected(4),
  },
  {
    id: 'add-saturator',
    stage: WEIGHT,
    instruction:
      'Click **FX**, then **Add effect** › **Saturator** (under Distortion).',
    why: 'Saturation adds harmonics, so the bass is heard on small speakers too.',
    target: ['fx-add-saturator', 'fx-add-slot', 'chanstrip-tab-fx'],
    check: effectOnSelected('saturator'),
  },
  {
    id: 'drive',
    stage: WEIGHT,
    instruction: 'Turn up the Saturator’s **Drive** until it growls.',
    target: ['fx-slot-saturator', 'chanstrip-tab-fx'],
    requires: { channelStripTab: 'fx' },
    check: effectTweaked('saturator'),
  },
  {
    id: 'add-ott',
    stage: WEIGHT,
    instruction: '**Add effect** › **OTT** (under Dynamics).',
    target: ['fx-add-multiband', 'fx-add-slot'],
    requires: { channelStripTab: 'fx' },
    check: effectOnSelected('multiband'),
  },
  {
    id: 'push-depth',
    stage: WEIGHT,
    instruction:
      'Push OTT’s **Depth** past **40%**: everything gets louder and denser at once.',
    why: 'OTT squashes the loud parts and lifts the quiet ones: the in-your-face sound of EDM.',
    target: ['fx-slot-multiband', 'chanstrip-tab-fx'],
    requires: { channelStripTab: 'fx' },
    check: (s, armed) => {
      const now = selectedTrack(s)?.effects.multiband.depth ?? 0;
      const was =
        armed.tracks.find((t) => t.id === s.selectedTrackId)?.effects.multiband
          .depth ?? 0;
      return now > 0.4 && now > was;
    },
  },
  {
    id: 'back-to-start',
    stage: DROP,
    instruction: 'Press **Back to start**.',
    target: 'transport-to-start',
    check: atStart,
  },
  {
    id: 'ask-drums',
    stage: DROP,
    instruction:
      'Open **Prism**, ask for **electronic drums** and press **Create**.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { promptOpen: true },
    check: newPartOn('drums'),
  },
  {
    id: 'add-buildup',
    stage: DROP,
    instruction:
      'Click **+ Section** above the ruler and choose **Build-up** (under More).',
    target: 'add-section',
    requires: { promptOpen: false },
    check: sectionAdded,
  },
  {
    id: 'add-drop',
    stage: DROP,
    instruction: 'Click **+ Section** again and choose **Drop**.',
    why: 'A build-up holds the energy back so the drop can release it.',
    target: 'add-section',
    check: sectionAdded,
  },
  {
    id: 'hear-drop',
    stage: DROP,
    instruction: 'Press **Play** and hear your drop, then stop.',
    target: 'transport-play',
    check: playedThenStopped,
  },
];
