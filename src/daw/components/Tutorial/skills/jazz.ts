import type { AllSlices } from '@/daw/store';
import type { TutorialStep } from '../tutorials';
import {
  addedAndSelected,
  newPartsOn,
  notesAddedOnSelected,
  playedThenStopped,
} from '../lessonChecks';
import { insightOpen } from '../studioBasics/insightChecks';
import { pianoRollOpen } from '../studioBasics/pianoRollChecks';
import { instrumentChanged } from '../studioBasics/trackChecks';
import { ADD_INSTRUMENTS } from './targets';

// ── Jazz — Color your chords (owner, 2026-11-09) ───────────────────────────
// Harmony, from a blank project: an electric piano, the ii–V–I typed into
// the chord lane as seventh chords, each chord built note by note in the
// piano roll, a walking bass and drums from Prism that follow the lane, and
// Insight to read the progression back. Prism is asked for bass and drums
// only: asked for chords, it writes a progression of its own over the lane.

const KEYS = 'The keys';
const CHORDS = 'Seventh chords';
const BUILD = 'Build the chords';
const BAND = 'The band';
const READ = 'Read it back';

/** Chords on the lane that are seventh chords: a 7 in their name. */
const sevenths = (s: AllSlices): number =>
  s.chordRegions.filter((r) => /7/.test(`${r.noteName ?? ''} ${r.name ?? ''}`))
    .length;

/** At least `n` more seventh chords on the lane than when the step began. */
const seventhsAdded =
  (n: number): NonNullable<TutorialStep['check']> =>
  (s, armed) =>
    sevenths(s) >= sevenths(armed) + n;

export const jazzSteps: TutorialStep[] = [
  {
    id: 'pick-key',
    stage: KEYS,
    instruction:
      'Open **Key** at the top and pick **C** major: the chords in this lesson are in C.',
    target: ['key-popover', 'song-key'],
    requires: { view: 'arrange', libraryOpen: false, promptOpen: false },
    check: (s) => s.rootNote === 0,
  },
  {
    id: 'add-keys',
    stage: KEYS,
    instruction: 'Click **+ Add track**, then **Add MIDI** › **Instruments**.',
    target: ADD_INSTRUMENTS,
    check: addedAndSelected('soundfont'),
  },
  {
    id: 'electric-piano',
    stage: KEYS,
    instruction:
      'Pick **Piano** › **Electric Piano 1**: the classic jazz keys.',
    target: 'instrument-picker',
    requires: { channelStripTab: 'controls', soundsOpen: true },
    check: instrumentChanged,
  },
  {
    id: 'first-chord',
    stage: CHORDS,
    instruction:
      '**Double-click** the **chord lane** (the strip under the ruler) at bar 1. A chord appears with its name ready to change: type **Dm7** over it and press Enter.',
    why: 'Jazz harmony is built on seventh chords: four notes instead of three, so every chord has more color.',
    target: 'timeline-chord-lane',
    check: seventhsAdded(1),
  },
  {
    id: 'ii-v-i',
    stage: CHORDS,
    instruction:
      'Finish the **ii–V–I** the same way: **G7** at bar 2 and **Cmaj7** at bar 3.',
    why: 'ii–V–I (two, five, one) is the most played chord move in jazz: tension, then home.',
    target: 'timeline-chord-lane',
    check: seventhsAdded(2),
  },
  {
    id: 'open-roll',
    stage: BUILD,
    instruction:
      'Click **Edit** at the bottom left to open the piano’s piano roll.',
    target: 'chanstrip-tab-piano-roll',
    requires: { clearClipSelection: true },
    check: pianoRollOpen,
  },
  {
    id: 'build-dm7',
    stage: BUILD,
    instruction:
      'Build **Dm7** at bar 1: **double-click** **D**, **F**, **A** and **C** stacked on the same beat. The note names are on the keys at the left.',
    why: 'A seventh chord stacks every other note of the scale: D, skip E, F, skip G, A, skip B, C.',
    target: 'piano-roll-grid',
    check: notesAddedOnSelected(4),
  },
  {
    id: 'build-g7-cmaj7',
    stage: BUILD,
    instruction:
      'Now **G7** at bar 2 (**G, B, D, F**) and **Cmaj7** at bar 3 (**C, E, G, B**).',
    hint: 'Can’t see a note? Scroll the piano roll up or down.',
    target: 'piano-roll-grid',
    check: notesAddedOnSelected(8),
  },
  {
    id: 'ask-band',
    stage: BAND,
    instruction:
      'Open **Prism**, type **jazz drums and bass** and press **Create**: the bass walks through your chords.',
    why: 'A walking bass steps through each chord’s notes, a note on every beat, and leads into the next one.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { promptOpen: true },
    check: newPartsOn('drums', 'bass'),
  },
  {
    id: 'hear-it',
    stage: BAND,
    instruction: 'Press **Play** and listen to your trio, then stop.',
    target: 'transport-play',
    requires: { promptOpen: false },
    check: playedThenStopped,
  },
  {
    id: 'open-insight',
    stage: READ,
    instruction: 'Click **Insight** (the light bulb) on the side rail.',
    target: 'rail-insight',
    check: insightOpen,
  },
  {
    id: 'read-chords',
    stage: READ,
    instruction:
      'Each card is one of your chords with its number in the key: **2**, **5** and **1**. Open a card to see the scale that fits it, then click **Next**.',
    why: 'Learn it by number and you can play the same ii–V–I in all twelve keys.',
    target: 'insight-chords',
  },
];
