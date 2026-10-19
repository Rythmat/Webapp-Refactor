import type { TutorialStep } from '../../tutorials';
import {
  noteAdded,
  noteDeleted,
  noteMoved,
  noteResized,
  pianoRollClosed,
  pianoRollOpen,
} from '../pianoRollChecks';

// ── Studio Basics 4 · The Piano Roll ───────────────────────────────────────
// A clip's notes, up close: open one (a double-click on the timeline), then
// the roll's tools, Draw, Select and Erase, to add a note, move one, change
// one's length and delete one. The first demo opens a clip (CLIP) and
// closes it again; the student opens any clip. The tool a demo
// picks stays picked (it is the roll's own, not the song's), so the student
// starts on the tool the step teaches.

const STAGE = 'The piano roll';

/**
 * The student's turn in the roll frames its whole window: the coach card
 * then sits at its side, over the bars past a short clip, and not over the
 * first bars' notes, as it would beside the grid or a tool.
 */
const ROLL = 'piano-roll-modal';

/**
 * The clip the demo opens: the second track's first, an instrument part on
 * the Studio Basics song (its chords) and on a band song (its bass, under
 * the drums); the top track's if the second has none.
 */
const CLIP = ['timeline-clip-1-0', 'timeline-clip-0-0'];

export const pianoRollSteps: TutorialStep[] = [
  {
    id: 'open',
    stage: STAGE,
    instruction: 'Double-click a clip to open it in the Piano Roll.',
    hint: 'Or right-click the clip and choose Open in Piano Roll.',
    target: ['piano-roll-modal', ...CLIP],
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      { caption: 'The Piano Roll: your notes, up close' },
      {
        target: CLIP,
        caption: 'A clip holds a part’s notes',
        action: 'hover',
      },
      {
        target: CLIP,
        caption: 'Double-click a clip to open it',
        action: 'doubleClick',
      },
      {
        target: 'piano-roll-grid',
        caption: 'Each little block is one note',
      },
      {
        target: 'piano-roll-close',
        caption: 'The **✕** closes it',
        action: 'click',
      },
    ],
    check: pianoRollOpen,
  },
  {
    id: 'add-note',
    stage: STAGE,
    instruction:
      'Pick **Draw**, then click an empty spot in the grid to add a note.',
    hint: 'Closed the Piano Roll? Double-click the clip again.',
    target: ROLL,
    demo: [
      {
        target: 'piano-roll-tool-draw',
        caption: '**Draw** adds notes',
        action: 'click',
      },
      {
        target: 'piano-roll-keys',
        caption: 'The keys show each row’s note',
      },
      {
        target: 'piano-roll-grid',
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
        target: 'piano-roll-grid',
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
        target: 'piano-roll-grid',
        caption: 'Grab a note by its right end',
      },
      { caption: 'Drag it to change how long it plays' },
    ],
    check: noteResized,
  },
  {
    id: 'delete-note',
    stage: STAGE,
    instruction:
      'Click a note to select it, then press the **Delete** key or the **Delete** button above the grid.',
    hint: 'Made a mistake? Undo (⌘Z or Ctrl+Z) brings it back.',
    target: ROLL,
    demo: [
      {
        target: 'piano-roll-grid',
        caption: 'Click a note to select it',
      },
      {
        target: 'piano-roll-select-all',
        caption: '**Select all** picks every note',
      },
      {
        target: 'piano-roll-tool-erase',
        caption: '**Erase** deletes with one click',
      },
    ],
    check: noteDeleted,
  },
  {
    id: 'close',
    stage: STAGE,
    instruction: 'Close the Piano Roll with the **✕** at its top right.',
    target: 'piano-roll-close',
    check: pianoRollClosed,
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'You opened a clip and added, moved, stretched and deleted notes. Next: Insight names the chords your notes make. Press **Finish**.',
    target: 'inspector-toggle',
  },
];
