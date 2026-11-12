import type { TutorialStep } from '../tutorials';
import {
  effectOnSelected,
  effectTweaked,
  newPartsOn,
  playedThenStopped,
  roleShowing,
  someTrackChanged,
} from '../lessonChecks';
import { doneMomentMoved } from '../studioBasics/saveAndExportChecks';

// ── R&B — Mix & polish (owner, 2026-11-09) ─────────────────────────────────
// Mixing, from a blank project: Prism writes the band, then the student
// mixes it: EQ and compression on a track, the Mix view's faders and pan,
// a shared reverb on Send A, a master chain, the master level, and a WAV
// bounce of the finished mix.

const BAND = 'The band';
const TRACK = 'One track at a time';
const MIX = 'The mix';
const MASTER = 'The master';

export const rnbSteps: TutorialStep[] = [
  {
    id: 'ask-band',
    stage: BAND,
    instruction:
      'Open **Prism**, type **R&B drums, bass and chords** and press **Create**: a whole band to mix.',
    why: 'Mixing is its own skill: here Prism plays the band so you can focus on the sound.',
    target: ['prompt-box', 'rail-prompt'],
    requires: {
      view: 'arrange',
      libraryOpen: false,
      promptOpen: true,
    },
    check: newPartsOn('drums', 'bass', 'chords'),
  },
  {
    id: 'hear-raw',
    stage: BAND,
    instruction:
      'Press **Play** and listen to it as it is, before any mixing. Then stop.',
    target: 'transport-play',
    requires: { promptOpen: false },
    check: playedThenStopped,
  },
  {
    id: 'chords-fx',
    stage: TRACK,
    instruction:
      'Select the **chords** track and click **FX** at the bottom left.',
    target: 'chanstrip-tab-fx',
    check: roleShowing('chords', 'fx'),
  },
  {
    id: 'add-eq',
    stage: TRACK,
    instruction: 'Click **Add effect** › **EQ**.',
    why: 'An EQ turns frequencies up or down: cutting the low end of the chords leaves room for the bass.',
    target: ['fx-add-eq', 'fx-add-slot'],
    check: effectOnSelected('eq'),
  },
  {
    id: 'tweak-eq',
    stage: TRACK,
    instruction:
      'Drag the EQ’s **low cut** up to about **150 Hz**, or turn a band down where the chords sound muddy.',
    target: ['fx-slot-eq', 'chanstrip-tab-fx'],
    requires: { channelStripTab: 'fx' },
    check: effectTweaked('eq'),
  },
  {
    id: 'select-bass',
    stage: TRACK,
    instruction:
      'Now click the **bass** track’s name: the FX panel follows the track you select.',
    // Prism writes a band's parts in this order: drums, bass, chords.
    target: 'track-name-1',
    check: roleShowing('bass', 'fx'),
  },
  {
    id: 'add-compressor',
    stage: TRACK,
    instruction: '**Add effect** › **Compressor**.',
    why: 'A compressor evens out loud and quiet notes, so the bass sits steady under everything.',
    target: ['fx-add-compressor', 'fx-add-slot'],
    requires: { channelStripTab: 'fx' },
    check: effectOnSelected('compressor'),
  },
  {
    id: 'goto-mix',
    stage: MIX,
    instruction: 'Click **Mix** at the bottom: every track side by side.',
    target: 'view-switch-studio',
    check: (s) => s.currentView === 'studio',
  },
  {
    id: 'balance-fader',
    stage: MIX,
    instruction:
      'Balance the band: drag the **faders** until no track hides another.',
    why: 'Start with the drums and bass, then bring the chords up until they sit just behind.',
    target: ['mixer-fader', 'mixer-section'],
    requires: { view: 'studio' },
    check: someTrackChanged((t) => t.volume),
  },
  {
    id: 'use-send',
    stage: MIX,
    instruction:
      'Give the band some room: raise a strip’s **Send A** (the reverb) past **25%**. Try the chords and the drums.',
    why: 'A send shares one reverb across tracks, so the whole band sounds like one room.',
    target: ['mixer-sends-A', 'mixer-section'],
    requires: { view: 'studio' },
    check: (s, armed) =>
      s.tracks.some((t) => {
        const was = armed.tracks.find((a) => a.id === t.id);
        const now = t.sends?.['A'] ?? 0;
        return now > 0.25 && now !== (was?.sends?.['A'] ?? 0);
      }),
  },
  {
    id: 'tweak-return',
    stage: MIX,
    instruction:
      'Click **Send A**’s strip and shape the reverb in its rack: try a longer or shorter decay.',
    target: ['return-fx-A', 'return-strip-A', 'mixer-section'],
    requires: { view: 'studio' },
    check: (s, armed) => {
      const now = s.returns.find((r) => r.id === 'A');
      const was = armed.returns.find((r) => r.id === 'A');
      return !!now && !!was && now.effects !== was.effects;
    },
  },
  {
    id: 'mastering-fx',
    stage: MASTER,
    instruction:
      'Polish the whole mix: click an effect in the **Add effect** window (try the **Compressor**) to put it on the master.',
    why: 'Effects on the master shape everything at once, so a little goes a long way.',
    target: ['fx-add-compressor', 'mastering-chain', 'mastering-section'],
    rack: 'master',
    requires: {
      view: 'studio',
      mixRack: { kind: 'master' },
      effectsLibrary: true,
    },
    check: (s, armed) =>
      s.masteringFxChain.length > armed.masteringFxChain.length,
  },
  {
    id: 'master-volume',
    stage: MASTER,
    instruction:
      'Set the final level with the **master fader**: loud, but never into the red.',
    target: 'master-strip',
    requires: { view: 'studio' },
    check: (s, armed) => s.masterVolume !== armed.masterVolume,
  },
  {
    id: 'bounce-mixdown',
    stage: MASTER,
    instruction:
      'Click **Export** at the top right, keep **WAV**, and press **Export** to bounce your mix.',
    why: 'Listen to the bounce on headphones, a phone and a speaker: a good mix holds up on all three.',
    target: ['export-audio-run', 'export-pill'],
    check: doneMomentMoved('exportAudio'),
  },
];
