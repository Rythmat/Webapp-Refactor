import type { TutorialStep } from '../tutorials';
import {
  addedAndSelected,
  atStart,
  clipsAdded,
  instrumentChangedOn,
  newPartOn,
  notesAddedOnSelected,
  playedThenStopped,
  roleShowing,
  selectedTrack,
} from '../lessonChecks';
import { ADD_DRUMS } from './targets';

// ── Hip Hop — Build the beat (owner, 2026-11-09) ───────────────────────────
// Beats, from a blank project: a slow tempo, the 808 kit, a backbeat with
// ghost notes in the step grid, the beat repeated, and a bass line from
// Prism turned into an 808-style synth bass.

const SETUP = 'The pocket';
const BEAT = 'The beat';
const BASS = 'The bass';
const LISTEN = 'Listen';

/** A hit added since the step began, softer than `velocity`. */
const softHitAdded =
  (velocity: number): TutorialStep['check'] =>
  (s, armed) => {
    const now = selectedTrack(s);
    const was = armed.tracks.find((t) => t.id === now?.id);
    const had = new Set(
      was?.midiClips.flatMap((c) => c.events.map((e) => e.id)) ?? [],
    );
    return (
      now?.midiClips.some((c) =>
        c.events.some((e) => !had.has(e.id) && e.velocity < velocity),
      ) ?? false
    );
  };

export const hiphopSteps: TutorialStep[] = [
  {
    id: 'slow-bpm',
    stage: SETUP,
    instruction:
      'Hip hop sits back. Set the **Tempo** at the top to **90** (anything from 80 to 95 works).',
    why: 'A slower tempo leaves room between the hits, and that space is the groove.',
    target: 'transport-bpm',
    requires: { view: 'arrange', libraryOpen: false, promptOpen: false },
    check: (s, armed) => s.bpm >= 80 && s.bpm <= 95 && s.bpm !== armed.bpm,
  },
  {
    id: 'add-drums',
    stage: SETUP,
    instruction: 'Click **+ Add track**, then **Add MIDI** › **Drums**.',
    target: ADD_DRUMS,
    check: addedAndSelected('drum-machine'),
  },
  {
    id: 'open-sequencer',
    stage: SETUP,
    instruction:
      'Click **Edit** at the bottom left to open the **step grid**: each row is a drum, each column a sixteenth note.',
    target: 'chanstrip-tab-piano-roll',
    check: (s) =>
      s.channelStripTab === 'piano-roll' &&
      selectedTrack(s)?.instrument === 'drum-machine',
  },
  {
    id: 'swap-kit',
    stage: SETUP,
    instruction:
      'Hip hop lives on the **808**: open the **kit** menu under the grid and pick **808**.',
    why: 'The 808 is the drum machine behind decades of hip hop: a booming kick and a snappy clap.',
    target: 'drum-kit-selector',
    check: (s) => selectedTrack(s)?.drumKit === '808',
  },
  {
    id: 'program-hits',
    stage: BEAT,
    instruction:
      '**Double-click** to program a beat: kick on steps **1** and **11**, snare on **5** and **13**, and hi-hats on every other step. Add at least **10** hits.',
    why: 'A kick just after the beat (step 11) is what makes a hip hop beat bounce instead of march.',
    hint: 'Double-click a hit again to remove it.',
    target: 'drum-machine-view',
    check: notesAddedOnSelected(10),
  },
  {
    id: 'ghost-notes',
    stage: BEAT,
    instruction:
      'Now some **ghost notes**: drag **Note velocity** under the grid down to about **50**, then add two quiet snares between the loud ones.',
    why: 'Quiet hits between the loud ones fill out the groove without crowding it.',
    target: 'drum-machine-view',
    check: softHitAdded(80),
  },
  {
    id: 'hear-beat',
    stage: BEAT,
    instruction: 'Press **Play** to hear it, then press it again to stop.',
    target: 'transport-play',
    check: playedThenStopped,
  },
  {
    id: 'repeat-beat',
    stage: BEAT,
    instruction:
      'Your beat is one bar. Select the **drum clip** on the timeline and press **⌘D** (Ctrl+D) three times, so it fills four bars.',
    target: ['timeline-clip-0-0', 'timeline-lane-0'],
    check: clipsAdded(3),
  },
  {
    id: 'back-to-start',
    stage: BASS,
    instruction: 'Press **Back to start** so the bass starts at bar 1.',
    target: 'transport-to-start',
    check: atStart,
  },
  {
    id: 'ask-bass',
    stage: BASS,
    instruction:
      'Open **Prism** and ask for a **hip hop bass line**, then press **Create**.',
    why: 'Prism writes its bass line around the drums and key you already have.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { promptOpen: true },
    check: newPartOn('bass'),
  },
  {
    id: 'bass-instrument',
    stage: BASS,
    instruction:
      'Make it an 808 bass: with the **bass** track selected, click **Instrument** at the bottom left.',
    target: 'chanstrip-tab-controls',
    requires: { promptOpen: false },
    check: roleShowing('bass', 'controls'),
  },
  {
    id: 'bass-sound',
    stage: BASS,
    instruction:
      'Pick **Bass** on the left, then **Synth Bass 1** or **Synth Bass 2**.',
    why: 'A deep synth bass under an 808 kick is the low end of most modern hip hop.',
    target: 'instrument-picker',
    requires: { soundsOpen: true },
    check: instrumentChangedOn('bass'),
  },
  {
    id: 'loop-on',
    stage: LISTEN,
    instruction: 'Turn on **Loop** (or press **L**).',
    target: 'transport-loop',
    check: (s) => s.loopEnabled,
  },
  {
    id: 'hear-it',
    stage: LISTEN,
    instruction:
      'Press **Play** and nod along. Stop when you’ve heard it go round.',
    why: 'Next time, try moving one kick a step later: small moves change the whole feel.',
    target: 'transport-play',
    check: playedThenStopped,
  },
];
