import type { TutorialStep } from '../../tutorials';
import { doneMomentMoved } from '../saveAndExportChecks';
import { noteAdded, noteChanged } from '../scoreChecks';

// ── Studio Basics 6 · The Score ────────────────────────────────────────
// The song as sheet music: open the Score page on its Full score, turn on
// Add notes (at the top of the palettes), write a note with a click on a
// staff, move it with the arrow keys, stop adding notes, and print. Each
// demo leaves the Score as it found it: Add notes is turned on and off
// again, and the note the student wrote is moved up a step and back.
//
// The Score tab opens the layout last shown, which can be the Lead sheet.
// The first demo clicks Full score on its way, so the student's own click
// opens the Full score; if the Lead sheet comes up anyway, the step points
// at the page's Full score switch until it is on.

const STAGE = 'The score';

export const scoreSteps: TutorialStep[] = [
  {
    id: 'open-score',
    stage: STAGE,
    instruction: 'Click **Score** at the top to see your song as sheet music.',
    hint: 'If the lead sheet shows instead, click Full score at the top left of the page.',
    // Full score first: it is on screen only when the Score page is, and
    // then only the switch is left to click.
    target: ['view-switch-fullscore', 'view-switch-score'],
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      {
        target: 'view-switch-score',
        caption: 'The **Score** is your song as sheet music',
        action: 'click',
      },
      {
        target: 'view-switch-fullscore',
        caption: '**Full score** shows every track',
        action: 'click',
      },
      {
        target: 'score-sheet',
        caption: 'Each track gets its own staff',
        action: 'hover',
      },
      {
        // Back where it started, so the student's turn has the move to make.
        target: 'view-switch-arrange',
        caption: '**Create** takes you back',
        action: 'click',
      },
    ],
    check: (s) => s.currentView === 'score',
  },
  {
    id: 'add-notes-on',
    stage: STAGE,
    instruction:
      'Click **Add notes** at the top of the palettes, on the left, or press **N**.',
    hint: 'While it is on, a click on a staff (the five lines) writes a note.',
    target: 'score-note-input',
    requires: { view: 'score' },
    demo: [
      {
        target: 'score-note-input',
        caption: '**Add notes** lets you write notes',
        action: 'click',
      },
      {
        target: 'score-sheet',
        caption: 'A ghost note shows where one goes',
        action: 'hover',
      },
      {
        target: 'score-note-input',
        caption: 'Click again to stop adding notes',
        action: 'click',
      },
    ],
    check: (s) => s.scoreNoteInput,
  },
  {
    id: 'add-a-note',
    stage: STAGE,
    instruction:
      'With **Add notes** on, click a line or a space on any staff to write a note there.',
    hint: 'Higher up is a higher note. The ghost note shows which one before you click.',
    target: 'score-sheet',
    requires: { view: 'score' },
    demo: [
      {
        target: 'score-sheet',
        caption: 'Each line and space is a note',
        action: 'hover',
      },
      {
        target: 'score-sheet',
        caption: 'Higher on the staff sounds higher',
      },
    ],
    check: noteAdded,
  },
  {
    id: 'move-the-note',
    stage: STAGE,
    instruction:
      'Your new note is selected. Press **↑** or **↓** to move it up or down.',
    hint: 'To change another note, press Esc, click that note, then use the arrow keys.',
    target: 'score-sheet',
    requires: { view: 'score' },
    demo: [
      {
        target: 'score-sheet',
        caption: 'The note you wrote is selected',
      },
      {
        // The note moves and comes back: ↑ and ↓ walk the key's own steps,
        // so the one written there (in the key) lands where it was.
        target: 'score-sheet',
        caption: '**↑** moves it up a step',
        action: { key: 'ArrowUp' },
      },
      {
        target: 'score-sheet',
        caption: '**↓** moves it down again',
        action: { key: 'ArrowDown' },
      },
    ],
    check: noteChanged,
  },
  {
    id: 'add-notes-off',
    stage: STAGE,
    instruction:
      'Press **Esc**, or click **Add notes** again, to stop adding notes.',
    hint: 'Then a click on a note selects it instead of writing a new one.',
    target: 'score-note-input',
    requires: { view: 'score' },
    demo: [
      {
        target: 'score-note-input',
        caption: 'It says **On** while it adds notes',
      },
    ],
    check: (s) => !s.scoreNoteInput,
  },
  {
    id: 'print',
    stage: STAGE,
    instruction:
      'Click **Print / PDF** at the top right to print your score, or save it as a PDF from the print window.',
    target: 'score-print',
    requires: { view: 'score' },
    demo: [
      {
        target: 'score-print',
        caption: '**Print / PDF** prints every staff',
        action: 'hover',
      },
      {
        target: 'score-print',
        caption: 'The print window can save a PDF',
      },
    ],
    check: doneMomentMoved('printScore'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'That’s the Score: turn on **Add notes** to write notes, move them with the arrow keys, and print when it looks right. Press **Finish** to go on to the lead sheet.',
    target: 'view-switch-leadsheet',
  },
];
