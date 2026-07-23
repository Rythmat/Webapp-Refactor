import type { AllSlices } from '@/daw/store';
import type { ViewType, ChannelStripTabId } from '@/daw/store/uiSlice';
import type { SynthStore } from '@/daw/oracle-synth/store';
import { GENRE_MAP } from '@prism/engine';

// ── Tutorial data model ────────────────────────────────────────────────────
// Step-by-step, "Duolingo for the Studio" lessons. Each step spotlights a
// region of the Studio (by data-tutorial-id) and — when it declares a `check`
// — auto-advances the moment the store reflects the correct adjustment.
//
// Mirrors the shape of the Atlas guided-tour data (guidedTours.ts): an ordered
// list of steps with a title + blurb, but targeting DOM regions and Studio
// state instead of a globe camera.

/** Preconditions applied (via store setters) when a step becomes active. */
export interface StepRequires {
  view?: ViewType;
  libraryOpen?: boolean;
  channelStripTab?: ChannelStripTabId;
  /**
   * Clear the global clip selection so the piano roll opens in blank mode on
   * the SELECTED track (it otherwise edits the selected clip regardless of
   * which track that clip belongs to).
   */
  clearClipSelection?: boolean;
  /** Force the automation lane's selected paramId so a lane-drawing step targets
   *  the parameter it teaches regardless of the prior selection. */
  automationParam?: string;
}

/**
 * `check` is evaluated against the live store on every change. `armed` is the
 * store snapshot captured when the step became active, so a step can require a
 * *change* (e.g. "add a chord") rather than an absolute value. Returning true
 * marks the step complete and advances. Omit `check` for a free-form step that
 * advances only when the user clicks Next.
 */
export type StepCheck = (s: AllSlices, armed: AllSlices) => boolean;

/**
 * Like `check`, but evaluated against the Oracle Synth's own store
 * (`useSynthStore`), which holds the selected track's live patch (presetName,
 * oscillators, LFOs, …) and is NOT mirrored into the main store. Use for steps
 * like "load the Wobble preset". A validated step declares `check` OR
 * `synthCheck` (not both).
 */
export type SynthStepCheck = (
  synth: SynthStore,
  armedSynth: SynthStore,
) => boolean;

export interface TutorialStep {
  id: string;
  /** Section label shown in the coach card, e.g. "STAGE 2 — KEY". */
  stage: string;
  /** Instruction body. Supports **bold** via double-asterisks. */
  instruction: string;
  /** Optional secondary line. */
  hint?: string;
  /** data-tutorial-id(s) of the region to spotlight. When an array, the first
   *  id currently present in the DOM wins — e.g. a button, then a modal card
   *  that appears after it's clicked. Omit for a centered card, no ring. */
  target?: string | string[];
  requires?: StepRequires;
  check?: StepCheck;
  synthCheck?: SynthStepCheck;
}

export type TutorialDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Tutorial {
  id: string;
  title: string;
  subtitle: string;
  difficulty: TutorialDifficulty;
  estMinutes: number;
  steps: TutorialStep[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** True when the selected track is one Prism can write chords to — a melodic
 *  MIDI instrument track. Excludes drum machines (type 'midi' but Prism-hidden)
 *  and audio-input tracks, matching ChannelStrip's Prism-tab visibility. */
const isPrismTrackSelected = (s: AllSlices): boolean => {
  const t = s.tracks.find((tr) => tr.id === s.selectedTrackId);
  return !!t && t.type === 'midi' && t.instrument !== 'drum-machine';
};

/** The currently selected track, or undefined. */
const selectedTrack = (s: AllSlices) =>
  s.tracks.find((tr) => tr.id === s.selectedTrackId);

/** Note-event count of the selected track's first MIDI clip (0 when none). */
const selectedTrackEvents = (s: AllSlices): number =>
  selectedTrack(s)?.midiClips[0]?.events.length ?? 0;

/** The armed-snapshot copy of the currently selected track (matched by id). */
const armedSelectedTrack = (s: AllSlices, armed: AllSlices) =>
  armed.tracks.find((tr) => tr.id === s.selectedTrackId);

/** Fresh non-empty chordRegions reference ⇒ Create ran since arming. */
const createRan: StepCheck = (s, armed) =>
  s.chordRegions.length > 0 && s.chordRegions !== armed.chordRegions;

// ── Lessons ────────────────────────────────────────────────────────────────

export const TUTORIALS: Tutorial[] = [
  {
    id: 'make-first-track',
    title: 'Make your first track',
    subtitle:
      'Add an instrument, build a progression, shape the feel, and hear it play.',
    difficulty: 'Beginner',
    estMinutes: 5,
    steps: [
      {
        id: 'add-track',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Add an instrument to play. Click **+ Add Track**, then pick a melodic instrument like **Synth**.',
        hint: 'Prism writes chords to melodic tracks (Synth, Instruments, Organ) — not drum or audio tracks.',
        // Highlights the Add Track button; once the New Track modal opens, the
        // spotlight jumps to the Synth card (whichever id is in the DOM first).
        target: ['add-track-synth', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        // addTrack auto-selects the new track, so this passes as soon as a
        // melodic MIDI track is added (or one is already selected).
        check: isPrismTrackSelected,
      },
      {
        id: 'open-prism',
        stage: 'STAGE 1 — SETUP',
        instruction:
          "Meet **Prism** — your harmony workshop. We've opened it in the panel below.",
        hint: 'You can reopen it anytime from the Prism tab.',
        target: 'chanstrip-tab-prism',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.channelStripTab === 'prism',
      },
      {
        id: 'pick-key',
        stage: 'STAGE 2 — KEY',
        instruction: 'Pick your key. Click **G** on the Circle of Fifths.',
        hint: 'The key sets which chords sound "at home".',
        target: 'prism-key',
        requires: { channelStripTab: 'prism' },
        // rootNote is a semitone offset from C: C=0 … G=7.
        check: (s) => s.rootNote === 7,
      },
      {
        id: 'add-chords',
        stage: 'STAGE 3 — CHORDS',
        instruction:
          'Build a progression — add **three chords** from the Chord Selection grid.',
        hint: 'Each button is a chord that fits your key.',
        target: 'prism-chord-selection',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.chordSeq.length >= 3,
      },
      {
        id: 'pick-genre',
        stage: 'STAGE 4 — STYLE',
        instruction: 'Set the vibe. Choose a genre — try **Jazz**.',
        hint: 'A genre nudges swing, strum and rhythm to match.',
        target: 'prism-style',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.genre === 'Jazz',
      },
      {
        id: 'add-swing',
        stage: 'STAGE 5 — RHYTHM',
        instruction: 'Add some groove — drag the **Swing** slider past 20.',
        hint: 'Swing delays the off-beats for a looser feel.',
        target: 'prism-rhythm',
        requires: { channelStripTab: 'prism' },
        // Must move it AND land above 20 (so a genre preset alone won't pass it).
        check: (s, armed) => s.swing > 20 && s.swing !== armed.swing,
      },
      {
        id: 'experiment',
        stage: 'STAGE 6 — EXPRESSION',
        instruction:
          'Experiment freely with **Strum** and **Velocity Tilt**, then click **Next**.',
        hint: 'No wrong answers here — trust your ears.',
        target: 'prism-rhythm',
        requires: { channelStripTab: 'prism' },
        // No check → free-form: advances on Next.
      },
      {
        id: 'create',
        stage: 'STAGE 7 — CREATE',
        instruction:
          'Hit **Create** to write your track — key, chords, and feel all together.',
        hint: 'This generates the MIDI clip from everything you set.',
        target: 'prism-create',
        requires: { channelStripTab: 'prism' },
        // generateToTracks replaces chordRegions with a fresh array (empty
        // until Create runs), so a new non-empty reference means it fired.
        check: createRan,
      },
    ],
  },

  // ── Genre pack ─────────────────────────────────────────────────────────
  // One lesson per genre, each teaching a different craft area. Inspired by
  // the beatspark reference series (progressive build-a-track lessons).

  {
    id: 'jazz-color-your-chords',
    title: 'Jazz — Color your chords',
    subtitle: 'Modes, seventh chords, and swing — harmony with flavor.',
    difficulty: 'Beginner',
    estMinutes: 4,
    steps: [
      {
        id: 'select-track',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Pick an instrument for your chords — select a **melodic track**, or add a **Synth**.',
        hint: 'Any Synth, Instruments, or Organ track works.',
        target: ['add-track-synth', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: isPrismTrackSelected,
      },
      {
        id: 'genre-jazz',
        stage: 'STAGE 2 — STYLE',
        instruction: 'Set the style. Choose **Jazz** in the Style card.',
        hint: 'Genres tune swing, strum and rhythm to match.',
        target: 'prism-style',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.genre === 'Jazz',
      },
      {
        id: 'mode-dorian',
        stage: 'STAGE 3 — MODE',
        instruction:
          'Give it color — open the mode menu under the Circle of Fifths and pick **Dorian**.',
        hint: 'Dorian is the jazzy minor: moody, but with a bright 6th.',
        target: 'prism-key',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.mode === 'dorian',
      },
      {
        id: 'seventh-chord',
        stage: 'STAGE 4 — CHORDS',
        instruction:
          'Jazz lives on sevenths. Add any **7th chord** from the Chord Selection grid (look for a **7**).',
        hint: 'maj7, min7, dom7 — all welcome here.',
        target: 'prism-chord-selection',
        requires: { channelStripTab: 'prism' },
        check: (s, armed) =>
          s.stringSeq.length > armed.stringSeq.length &&
          /7/.test(s.stringSeq[s.stringSeq.length - 1] ?? ''),
      },
      {
        id: 'four-chords',
        stage: 'STAGE 4 — CHORDS',
        instruction: 'Keep going — grow your progression to **four chords**.',
        target: 'prism-chord-selection',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.chordSeq.length >= 4,
      },
      {
        id: 'jazz-rhythm',
        stage: 'STAGE 5 — RHYTHM',
        instruction:
          'Pick a **Jazz** comping pattern from the Rhythm Pattern menu.',
        hint: 'They are grouped by style — look for the Jazz section.',
        target: 'prism-rhythm',
        requires: { channelStripTab: 'prism' },
        check: (s, armed) =>
          s.rhythmName !== armed.rhythmName &&
          GENRE_MAP[s.rhythmName] === 'Jazz',
      },
      {
        id: 'swing',
        stage: 'STAGE 5 — RHYTHM',
        instruction: 'Now make it swing — drag **Swing** past 25.',
        target: 'prism-rhythm',
        requires: { channelStripTab: 'prism' },
        check: (s, armed) => s.swing > 25 && s.swing !== armed.swing,
      },
      {
        id: 'create',
        stage: 'STAGE 6 — CREATE',
        instruction: 'Hit **Create** and hear your jazz changes.',
        target: 'prism-create',
        requires: { channelStripTab: 'prism' },
        check: createRan,
      },
    ],
  },

  {
    id: 'hiphop-build-the-beat',
    title: 'Hip Hop — Build the beat',
    subtitle: 'Program drums, slow the tempo, and find the pocket.',
    difficulty: 'Beginner',
    estMinutes: 4,
    steps: [
      {
        id: 'add-drums',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Every beat starts with drums. Click **+ Add Track** and pick **Drums**.',
        target: ['add-track-drum-machine', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => selectedTrack(s)?.instrument === 'drum-machine',
      },
      {
        id: 'open-sequencer',
        stage: 'STAGE 1 — SETUP',
        instruction:
          "This is the **step sequencer** — we've opened it below. Each row is a drum, each column a step.",
        target: 'chanstrip-tab-controls',
        requires: { channelStripTab: 'controls' },
        check: (s) => s.channelStripTab === 'controls',
      },
      {
        id: 'swap-kit',
        stage: 'STAGE 2 — SOUND',
        instruction:
          'Hip hop lives on the **808**. Open the **kit menu** in the sequencer toolbar and switch to the **808** kit.',
        hint: 'The dropdown next to “Drums”, top-left of the sequencer.',
        target: 'drum-kit-selector',
        requires: { channelStripTab: 'controls' },
        check: (s) => selectedTrack(s)?.drumKit === '808',
      },
      {
        id: 'program-hits',
        stage: 'STAGE 3 — PROGRAM',
        instruction:
          'Paint your pattern — add at least **four hits** on the grid. Try kick on 1 and 3, snare on 2 and 4.',
        hint: 'Click cells to add hits; click again to remove.',
        target: 'drum-machine-view',
        requires: { channelStripTab: 'controls' },
        check: (s, armed) =>
          selectedTrackEvents(s) >= selectedTrackEvents(armed) + 4,
      },
      {
        id: 'slow-bpm',
        stage: 'STAGE 4 — TEMPO',
        instruction:
          'Hip hop breathes slower. Set the **BPM** to **95 or less**.',
        target: 'transport-bpm',
        check: (s, armed) => s.bpm <= 95 && s.bpm !== armed.bpm,
      },
      {
        id: 'load-groove',
        stage: 'STAGE 5 — GROOVE',
        instruction:
          "Steal some feel — open **Grooves** and load one you like. It'll drop in as a new clip.",
        target: ['grooves-browser', 'chanstrip-tab-grooves'],
        requires: { channelStripTab: 'grooves' },
        check: (s, armed) =>
          (selectedTrack(s)?.midiClips.length ?? 0) >
          (armedSelectedTrack(s, armed)?.midiClips.length ?? 0),
      },
      {
        id: 'pad-mix',
        stage: 'STAGE 6 — BALANCE',
        instruction:
          'Back in the sequencer, balance your kit — nudge any pad’s **volume or pan** fader.',
        target: 'drum-machine-view',
        requires: { channelStripTab: 'controls' },
        check: (s, armed) => {
          const now = selectedTrack(s);
          const before = armedSelectedTrack(s, armed);
          return !!now && !!before && now.drumPads !== before.drumPads;
        },
      },
    ],
  },

  {
    id: 'pop-flip-a-sample',
    title: 'Pop — Flip a sample',
    subtitle: 'Load a one-shot and play it like an instrument.',
    difficulty: 'Beginner',
    estMinutes: 3,
    steps: [
      {
        id: 'add-chops',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Modern pop is built on flipped samples. Click **+ Add Track** and pick **Chops**.',
        target: ['add-track-sampler', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => selectedTrack(s)?.instrument === 'sampler',
      },
      {
        id: 'load-sample',
        stage: 'STAGE 2 — SOUND',
        instruction:
          'Feed it a sound — **drop an audio file** into the panel, or press **Use demo sample**.',
        hint: 'Any short WAV or MP3 works; the demo vocal is tuned to C4.',
        target: ['sampler-dropzone', 'sampler-view', 'chanstrip-tab-controls'],
        requires: { channelStripTab: 'controls' },
        check: (s, armed) => {
          // Compare sample identity, not object reference — knob/root tweaks
          // replace the object but keep the sampleId, and must not count.
          const now = selectedTrack(s)?.samplerSample;
          const before = armedSelectedTrack(s, armed)?.samplerSample;
          return !!now && now.sampleId !== before?.sampleId;
        },
      },
      {
        id: 'play-notes',
        stage: 'STAGE 3 — MELODY',
        instruction:
          'Open the **piano roll** and draw at least **3 notes** — one sample, any pitch.',
        hint: 'Chords made from a single voice — that’s the vocal-chop trick.',
        target: ['chanstrip-tab-piano-roll'],
        // clearClipSelection: without it the piano roll would edit a
        // previously-selected clip on ANOTHER track (e.g. a groove from the
        // Hip Hop lesson) and this step could never complete.
        requires: { channelStripTab: 'piano-roll', clearClipSelection: true },
        check: (s, armed) =>
          selectedTrackEvents(s) >= selectedTrackEvents(armed) + 3,
      },
      {
        id: 'space-it-out',
        stage: 'STAGE 4 — SPACE',
        instruction: 'Give it air — open **FX** and add a **Delay**.',
        target: ['fx-add-delay', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) =>
          selectedTrack(s)?.activeEffects.includes('delay') ?? false,
      },
    ],
  },

  {
    id: 'edm-design-the-drop',
    title: 'EDM — Design the drop',
    subtitle: 'Wobble bass, minor keys, and saturation — our take on dubstep.',
    difficulty: 'Intermediate',
    estMinutes: 5,
    steps: [
      {
        id: 'add-synth',
        stage: 'STAGE 1 — SETUP',
        instruction: 'The drop needs a synth. Add or select a **Synth** track.',
        target: ['add-track-synth', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => selectedTrack(s)?.instrument === 'oracle-synth',
      },
      {
        id: 'open-synth',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Meet the **Oracle Synth** — opened below. This is where the bass gets designed.',
        target: 'chanstrip-tab-controls',
        requires: { channelStripTab: 'controls' },
        check: (s) => s.channelStripTab === 'controls',
      },
      {
        id: 'load-wobble',
        stage: 'STAGE 2 — SOUND',
        instruction:
          'Open the **preset menu** and load **WOBBLE** — a dubstep-style bass with an LFO riding the filter.',
        hint: 'The preset name is at the top of the synth panel.',
        target: 'synth-preset-selector',
        requires: { channelStripTab: 'controls' },
        synthCheck: (sy) => sy.presetName === 'WOBBLE',
      },
      {
        id: 'tweak-wobble',
        stage: 'STAGE 2 — SOUND',
        instruction:
          'Play a few notes and make it yours — try the macros and filter. Click **Next** when it growls right.',
        hint: 'Want it to pump against the kick? The **House — Make it pump** lesson teaches sidechain ducking.',
        target: 'chanstrip-tab-piano-roll',
        requires: { channelStripTab: 'controls' },
        // Free-form: sound design has no wrong answers.
      },
      {
        id: 'genre-edm',
        stage: 'STAGE 3 — STYLE',
        instruction: 'Set the style — choose **EDM** in the Style card.',
        target: 'prism-style',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.genre === 'EDM',
      },
      {
        id: 'minor-mode',
        stage: 'STAGE 4 — KEY',
        instruction:
          'Drops hit harder in minor — open the mode menu and pick **Aeolian**.',
        target: 'prism-key',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.mode === 'aeolian',
      },
      {
        id: 'riff-chords',
        stage: 'STAGE 5 — RIFF',
        instruction: 'Write the riff — add at least **two chords**.',
        target: 'prism-harmony',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.chordSeq.length >= 2,
      },
      {
        id: 'create',
        stage: 'STAGE 5 — RIFF',
        instruction: 'Hit **Create** to print the riff onto your wobble.',
        target: 'prism-create',
        requires: { channelStripTab: 'prism' },
        check: createRan,
      },
      {
        id: 'saturate',
        stage: 'STAGE 6 — GRIT',
        instruction:
          'Finish with grit — open **FX** and add a **Saturator** to the synth.',
        target: ['fx-add-saturator', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) =>
          selectedTrack(s)?.activeEffects.includes('saturator') ?? false,
      },
      {
        id: 'add-ott',
        stage: 'STAGE 7 — GLUE',
        instruction:
          'Glue it all together — add the **OTT** multiband compressor for that modern, in-your-face density.',
        target: ['fx-add-multiband', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) =>
          selectedTrack(s)?.activeEffects.includes('multiband') ?? false,
      },
      {
        id: 'push-depth',
        stage: 'STAGE 7 — GLUE',
        instruction:
          'Now push the **Depth** past **40%** — hear everything get louder and denser at once.',
        hint: 'Depth is OTT’s dry/wet — how much of the crushing you hear.',
        target: ['fx-slot-multiband', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s, armed) => {
          // Require an actual INCREASE past 40% — the default depth (0.3) is
          // below the threshold, so the learner must raise it (not just nudge
          // another multiband knob, which wouldn't change depth).
          const nowDepth = selectedTrack(s)?.effects.multiband.depth ?? 0;
          const beforeDepth =
            armedSelectedTrack(s, armed)?.effects.multiband.depth ?? 0;
          return nowDepth > 0.4 && nowDepth > beforeDepth;
        },
      },
    ],
  },

  {
    id: 'house-make-it-pump',
    title: 'House — Make it pump',
    subtitle: 'Sidechain the bass to the kick — the classic pumping groove.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    steps: [
      {
        id: 'add-drums',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'The pump needs a pulse. Click **+ Add Track** and pick **Drums**.',
        target: ['add-track-drum-machine', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => s.tracks.some((t) => t.instrument === 'drum-machine'),
      },
      {
        id: 'add-bass',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Now the bass to duck — add a **Synth** track and keep it selected.',
        target: ['add-track-synth', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => selectedTrack(s)?.instrument === 'oracle-synth',
      },
      {
        id: 'add-ducker',
        stage: 'STAGE 2 — SIDECHAIN',
        instruction:
          'On the synth, open **FX** and add a **Sidechain** ducker.',
        target: ['fx-add-ducker', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) =>
          selectedTrack(s)?.activeEffects.includes('ducker') ?? false,
      },
      {
        id: 'set-key',
        stage: 'STAGE 2 — SIDECHAIN',
        instruction:
          'Set the **Key** to your **Drums** track — that’s what triggers the duck.',
        hint: 'The Key dropdown is on the Sidechain block’s controls.',
        target: ['ducker-key-select', 'fx-slot-ducker', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) => {
          const drum = s.tracks.find((t) => t.instrument === 'drum-machine');
          return (
            !!drum && selectedTrack(s)?.effects.ducker.keyTrackId === drum.id
          );
        },
      },
      {
        id: 'raise-amount',
        stage: 'STAGE 3 — GROOVE',
        instruction:
          'Raise the **Amount** past **40%** until the bass pumps under the kick.',
        target: ['fx-slot-ducker', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s, armed) => {
          const now = selectedTrack(s)?.effects.ducker.amount ?? 0;
          const before =
            armedSelectedTrack(s, armed)?.effects.ducker.amount ?? 0;
          return now > 0.4 && now > before;
        },
      },
    ],
  },

  {
    id: 'rnb-mix-and-polish',
    title: 'R&B — Mix & polish',
    subtitle: 'Reverb, balance, and a mastering touch — make it smooth.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    steps: [
      {
        id: 'select-track',
        stage: 'STAGE 1 — SETUP',
        instruction:
          'Select a **melodic track** to polish (or add a **Synth**).',
        target: ['add-track-synth', 'add-track-button'],
        requires: { view: 'arrange', libraryOpen: false },
        check: isPrismTrackSelected,
      },
      {
        id: 'genre-rnb',
        stage: 'STAGE 2 — STYLE',
        instruction: 'Set the style — choose **R&B** in the Style card.',
        target: 'prism-style',
        requires: { channelStripTab: 'prism' },
        check: (s) => s.genre === 'R&B',
      },
      {
        id: 'add-reverb',
        stage: 'STAGE 3 — SPACE',
        instruction:
          'Give it room — open **FX** and add a **Reverb** to your track.',
        target: ['fx-add-reverb', 'chanstrip-tab-fx'],
        requires: { channelStripTab: 'fx' },
        check: (s) =>
          selectedTrack(s)?.activeEffects.includes('reverb') ?? false,
      },
      {
        id: 'tweak-reverb',
        stage: 'STAGE 3 — SPACE',
        instruction:
          'Click the **Reverb block** and shape it — adjust any knob until it feels lush, not washy.',
        target: 'fx-slot-reverb',
        requires: { channelStripTab: 'fx' },
        check: (s, armed) => {
          const now = selectedTrack(s);
          const before = armedSelectedTrack(s, armed);
          return (
            !!now && !!before && now.effects.reverb !== before.effects.reverb
          );
        },
      },
      {
        id: 'goto-master',
        stage: 'STAGE 4 — MIX',
        instruction:
          'Time to mix. Click **Master** in the top bar to open the mixing console.',
        target: 'view-switch-studio',
        check: (s) => s.currentView === 'studio',
      },
      {
        id: 'balance-fader',
        stage: 'STAGE 4 — MIX',
        instruction:
          'Balance the blend — move any **track fader** in the mixer.',
        target: 'mixer-section',
        requires: { view: 'studio' },
        check: (s, armed) =>
          s.tracks.some((t) => {
            const at = armed.tracks.find((a) => a.id === t.id);
            return !!at && t.volume !== at.volume;
          }),
      },
      {
        id: 'use-send',
        stage: 'STAGE 4 — SENDS',
        instruction:
          'Share one reverb across the mix — raise **Send A** (Reverb) on a track past **25%**.',
        hint: 'The A/B knobs under each strip’s pan feed the return buses.',
        target: ['mixer-sends-A', 'mixer-section'],
        requires: { view: 'studio' },
        check: (s, armed) =>
          s.tracks.some((t) => {
            const before = armed.tracks.find((a) => a.id === t.id);
            const now = t.sends?.['A'] ?? 0;
            return now > 0.25 && now !== (before?.sends?.['A'] ?? 0);
          }),
      },
      {
        id: 'tweak-return',
        stage: 'STAGE 4 — SENDS',
        instruction:
          'Click **Return A** in the mixer and shape its reverb until the space feels right.',
        target: ['return-strip-A', 'mixer-section'],
        requires: { view: 'studio' },
        check: (s, armed) => {
          const now = s.returns.find((r) => r.id === 'A');
          const before = armed.returns.find((r) => r.id === 'A');
          return !!now && !!before && now.effects !== before.effects;
        },
      },
      {
        id: 'mastering-fx',
        stage: 'STAGE 5 — MASTER',
        instruction:
          'Add polish to the whole mix — drop a **mastering effect** (try the Compressor) onto the master chain.',
        target: ['fx-add-compressor', 'mastering-section'],
        requires: { view: 'studio' },
        check: (s, armed) =>
          s.masteringFxChain.length > armed.masteringFxChain.length,
      },
      {
        id: 'master-volume',
        stage: 'STAGE 5 — MASTER',
        instruction:
          'Set the final level — trim the **master fader** to taste.',
        target: 'master-strip',
        requires: { view: 'studio' },
        check: (s, armed) => s.masterVolume !== armed.masterVolume,
      },
      {
        id: 'bounce-mixdown',
        stage: 'STAGE 6 — BOUNCE',
        instruction:
          'Ship it — open **File → Export Audio**, pick a format, and hit **Export** to bounce your finished track.',
        hint: 'The whole mix renders offline: instruments, FX, sends and mastering.',
        target: ['export-audio-run', 'file-menu'],
        // Fires when a fresh export completes during this step (the session-only
        // timestamp advances). Guards against a stale value from an earlier bounce.
        check: (s, armed) =>
          s.lastAudioExportAt !== null &&
          s.lastAudioExportAt !== armed.lastAudioExportAt,
      },
    ],
  },

  {
    id: 'indie-movement-and-dynamics',
    title: 'Indie — Movement & dynamics',
    subtitle: 'Automate volume, pan and sends so your mix breathes.',
    difficulty: 'Intermediate',
    estMinutes: 3,
    steps: [
      {
        id: 'open-automation',
        stage: 'STAGE 1 — OPEN',
        instruction:
          'Pick a track and click its **automation** button in the track header to open its lane.',
        target: 'automation-toggle',
        requires: { view: 'arrange', libraryOpen: false },
        check: (s) => s.automationOpenTrackId !== null,
      },
      {
        id: 'draw-volume',
        stage: 'STAGE 2 — MOVEMENT',
        instruction:
          'Ride the volume — **click** in the lane to drop at least **two** points, then drag them up and down to shape a swell.',
        hint: 'Between points the value glides linearly — that is your fade.',
        target: 'automation-lane',
        requires: { view: 'arrange', automationParam: 'volume' },
        check: (s) => {
          const t = s.tracks.find((tr) => tr.id === s.automationOpenTrackId);
          return (t?.automation?.volume?.length ?? 0) >= 2;
        },
      },
      {
        id: 'hear-it',
        stage: 'STAGE 3 — LISTEN',
        instruction:
          'Press **play** and listen — the fader now moves on its own. That is automation.',
        target: 'automation-lane',
        check: (s) => s.isPlaying,
      },
      {
        id: 'second-lane',
        stage: 'STAGE 4 — LAYER IT',
        instruction:
          'Add a second move — flip the lane to a new **parameter** (Pan or a Send) in the dropdown and drop a couple of points.',
        target: 'automation-param-select',
        requires: { view: 'arrange' },
        check: (s) => {
          const t = s.tracks.find((tr) => tr.id === s.automationOpenTrackId);
          return Object.keys(t?.automation ?? {}).length >= 2;
        },
      },
    ],
  },
];

export function getTutorial(id: string | null): Tutorial | null {
  if (!id) return null;
  return TUTORIALS.find((t) => t.id === id) ?? null;
}
