import type { TutorialStep } from '../../tutorials';
import {
  clipChosen,
  dockTabKeeper,
  noteAdded,
  noteDeleted,
  noteMoved,
  noteResized,
  pianoRollClosed,
  pianoRollMaximized,
  pianoRollOpen,
} from '../pianoRollChecks';

// ── Studio Basics 4 · The Piano Roll ───────────────────────────────────────
// A clip's notes, up close, in the dock's Notes tab: choose a clip (a click
// on it chooses it and its track), open Notes, then Maximize, which gives
// the roll the timeline's room (in the dock's own height a Chromebook's
// roll shows three rows). Then the roll's tools, Draw, Select and Erase, to
// add a note, move one, change one's length and delete one, and the dock's
// arrow to close it (which restores a maximized dock too).
//
// During a lesson a click on a clip keeps the dock's tab (dockSelection.ts:
// a step's tab stays put), so the lesson teaches the Notes tab, which opens
// the roll in a lesson and out of one alike. The tool a demo picks stays
// picked (it is the roll's own, not the song's), so the student starts on
// the tool the step teaches.

const STAGE = 'The piano roll';

/**
 * The student's turn in the roll (and a demo's beat on its grid) frames the
 * whole maximized dock: the coach card then sits at its right, over the
 * bars past a short clip, not over the first bars' notes, as it would
 * beside a tool or the grid.
 */
const ROLL = 'dock-body';

/**
 * The clip the demo points at: the second track's first, an instrument part
 * on the Studio Basics song (its chords) and on a band song (its bass,
 * under the drums); the top track's if the second has none.
 */
const CLIP = ['timeline-clip-1-0', 'timeline-clip-0-0'];

/** The open-notes demo opens Notes and puts the dock back as it was. */
const notesTab = dockTabKeeper();

export const pianoRollSteps: TutorialStep[] = [
  {
    id: 'choose-clip',
    stage: STAGE,
    instruction:
      'Click a clip with notes, like the melody’s or the chords’, to choose it.',
    hint: 'Not the drums: their notes open in a drum grid.',
    target: CLIP,
    // No clip chosen yet, so any click on one is a choice.
    requires: { view: 'arrange', libraryOpen: false, clearClipSelection: true },
    demo: [
      { caption: 'The Piano Roll: your notes, up close' },
      {
        target: CLIP,
        caption: 'A clip holds one part’s notes',
        action: 'hover',
      },
      {
        target: CLIP,
        caption: 'Click a clip to choose it',
        action: 'hover',
      },
    ],
    check: clipChosen,
  },
  {
    id: 'open-notes',
    stage: STAGE,
    instruction:
      'Click **Notes** in the dock under the timeline. It shows your clip’s notes: the Piano Roll.',
    hint: 'Notes always shows the chosen track’s clip.',
    target: 'chanstrip-tab-piano-roll',
    demo: [
      {
        target: 'chanstrip-tab-piano-roll',
        caption: 'The dock has a **Notes** tab',
        action: notesTab.remember,
      },
      {
        target: 'chanstrip-tab-piano-roll',
        caption: '**Notes** opens the Piano Roll',
        action: 'click',
      },
      {
        target: 'piano-roll-grid',
        caption: 'Each block is one note',
      },
      {
        target: 'chanstrip-tab-piano-roll',
        caption: 'Now you open it',
        action: notesTab.restore,
      },
    ],
    check: pianoRollOpen,
  },
  {
    id: 'maximize',
    stage: STAGE,
    instruction:
      'Click **Maximize** (the corner arrows at the dock’s right) to give the notes more room.',
    hint: 'It grows the dock over the timeline. Click it again to shrink it back.',
    target: 'dock-maximize',
    demo: [
      {
        target: 'dock-maximize',
        caption: '**Maximize** gives the notes room',
        action: 'click',
      },
      {
        target: ROLL,
        caption: 'Now you see many more rows',
      },
      {
        target: 'dock-maximize',
        caption: 'Click again to shrink it',
        action: 'click',
      },
    ],
    check: pianoRollMaximized,
  },
  {
    id: 'add-note',
    stage: STAGE,
    instruction:
      'Pick **Draw**, then click an empty spot in the grid to add a note.',
    hint: 'Closed it? Click **Notes** again.',
    target: ROLL,
    demo: [
      {
        target: 'piano-roll-tool-draw',
        caption: '**Draw** adds notes',
        action: 'click',
      },
      {
        target: 'piano-roll-keys',
        caption: 'The keys name each row',
      },
      {
        target: ROLL,
        caption: 'Click an empty spot for a note',
      },
    ],
    check: noteAdded,
  },
  {
    id: 'move-note',
    stage: STAGE,
    instruction:
      'Pick **Select**, then drag a note: sideways to move it in time, up or down to change its pitch.',
    target: ROLL,
    demo: [
      {
        target: 'piano-roll-tool-select',
        caption: '**Select** picks notes up',
        action: 'click',
      },
      {
        target: ROLL,
        caption: 'Drag a note to move it',
      },
    ],
    check: noteMoved,
  },
  {
    id: 'resize-note',
    stage: STAGE,
    instruction:
      'Now drag the right end of a note to make it longer or shorter.',
    hint: 'The pointer turns into a double arrow at a note’s end.',
    target: ROLL,
    demo: [
      {
        target: ROLL,
        caption: 'Grab a note by its right end',
      },
      { caption: 'Drag to make it longer or shorter' },
    ],
    check: noteResized,
  },
  {
    id: 'delete-note',
    stage: STAGE,
    instruction:
      'Click a note to select it, then press the **Delete** key or the **Delete** button above the grid.',
    hint: 'Made a mistake? **Undo** (⌘Z or Ctrl+Z) brings it back.',
    target: ROLL,
    demo: [
      {
        target: ROLL,
        caption: 'Click a note to select it',
      },
      {
        target: 'piano-roll-select-all',
        caption: '**Select all** picks every note',
        action: 'hover',
      },
      {
        target: 'piano-roll-tool-erase',
        caption: '**Erase** deletes with one click',
        action: 'hover',
      },
    ],
    check: noteDeleted,
  },
  {
    id: 'close',
    stage: STAGE,
    instruction:
      'Close the dock with the arrow at its top right. The timeline comes back.',
    hint: 'Clicking **Notes** again closes it too.',
    target: 'dock-toggle',
    check: pianoRollClosed,
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'You opened a clip and added, moved, stretched and deleted notes. Next: Insight names the chords your notes make. Press **Finish**.',
    target: 'rail-insight',
  },
];
