import type { StepCheck, TutorialStep } from '../../tutorials';
import { doneMomentMoved } from '../saveAndExportChecks';

// ── Studio Basics 7 · The Lead Sheet ───────────────────────────────────
// The chords over the melody. The lead sheet is the Score page's other
// layout, so the lesson opens the Score page, then switches it to Lead
// sheet. There it turns Melody on, picks the tracks it shows, turns it off
// for the chord chart, changes a chord symbol, and prints. Each demo leaves
// the page as it found it: the layout switches and back, Melody goes on and
// off again, the picker opens and closes, and the chord the demo opens for
// editing is left with Esc.
//
// With Melody on, the sheet's chords are drawn on the engraved staff, which
// has no anchor per chord, so the chord step comes after Melody is off.

const STAGE = 'The lead sheet';

/** Bar 3's chord first (the song's 4 chord on the course's song), else the first. */
const A_CHORD = ['leadsheet-chord-2-0', 'leadsheet-chord-0-0'];

/**
 * Each track's box in the melody picker, top track first: one for each of
 * the tracks a song can have (tracksSlice's MAX_TOTAL_TRACKS, which the
 * lesson's test keeps this equal to).
 */
export const PICKER_TRACKS = Array.from(
  { length: 10 },
  (_, i) => `leadsheet-melody-track-${i}`,
);

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

/** The tracks the sheet writes as its melody are not the ones it armed with. */
export const melodyTracksChanged: StepCheck = (s, armed) =>
  !sameIds(s.leadSheetMelodyTrackIds, armed.leadSheetMelodyTrackIds);

/**
 * A chord symbol says something new: a chord renamed in place (it keeps its
 * id), or one written on an empty beat.
 */
export const chordChanged: StepCheck = (s, armed) => {
  if (s.chordRegions === armed.chordRegions) return false;
  const before = new Map(armed.chordRegions.map((r) => [r.id, r]));
  return s.chordRegions.some((region) => {
    const was = before.get(region.id);
    return !was || was.name !== region.name || was.noteName !== region.noteName;
  });
};

export const leadSheetSteps: TutorialStep[] = [
  {
    id: 'open-score',
    stage: STAGE,
    instruction:
      'Click **Score** at the top. The lead sheet is on the same page.',
    target: 'view-switch-score',
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      {
        target: 'view-switch-score',
        caption: 'Sheet music lives under **Score**',
        action: 'click',
      },
      {
        // Leaves the page on its Full score, which the Score tab then opens
        // for the student: the switch to the lead sheet is the next step.
        target: 'view-switch-fullscore',
        caption: 'The page has a **Full score**',
        action: 'click',
      },
      {
        target: 'view-switch-leadsheet',
        caption: 'And a **Lead sheet**, beside it',
        action: 'hover',
      },
      {
        target: 'view-switch-arrange',
        caption: '**Create** takes you back',
        action: 'click',
      },
    ],
    // Either layout: the Score tab opens the one last shown.
    check: (s) => s.currentView === 'score' || s.currentView === 'leadsheet',
  },
  {
    id: 'open-lead-sheet',
    stage: STAGE,
    instruction:
      'Click **Lead sheet**, at the top left of the page, to see your song’s chords.',
    hint: 'A lead sheet is what a band plays from: the chords, with the tune when you want it.',
    target: 'view-switch-leadsheet',
    requires: { view: 'score' },
    demo: [
      {
        target: 'view-switch-leadsheet',
        caption: 'A **lead sheet** shows the chords',
        action: 'click',
      },
      {
        target: 'leadsheet-sheet',
        caption: 'Each chord sits over its bar',
        action: 'hover',
      },
      {
        target: 'view-switch-fullscore',
        caption: '**Full score** goes back to every staff',
        action: 'click',
      },
    ],
    check: (s) => s.currentView === 'leadsheet',
  },
  {
    id: 'melody-on',
    stage: STAGE,
    instruction:
      'Click **Melody** to write the tune on a staff, under the chords.',
    hint: 'The staff is the five lines the notes sit on.',
    target: 'leadsheet-melody-toggle',
    requires: { view: 'leadsheet' },
    demo: [
      {
        target: 'leadsheet-melody-toggle',
        caption: '**Melody** adds the tune’s notes',
        action: 'click',
      },
      {
        target: 'leadsheet-sheet',
        caption: 'Now the notes sit under the chords',
        action: 'hover',
      },
      {
        target: 'leadsheet-melody-toggle',
        caption: 'Click again to hide them',
        action: 'click',
      },
    ],
    check: (s) => s.leadSheetShowMelody,
  },
  {
    id: 'pick-melody-track',
    stage: STAGE,
    instruction:
      'Open the menu beside **Melody** and tick a track to show its notes.',
    hint: 'Auto picks the tune for you. Each track you tick gets its own staff.',
    target: ['leadsheet-melody-menu', 'leadsheet-melody-picker'],
    requires: { view: 'leadsheet' },
    demo: [
      {
        target: 'leadsheet-melody-picker',
        caption: 'This picks which track is the tune',
        action: 'click',
      },
      {
        target: 'leadsheet-melody-auto',
        caption: '**Auto** picks one for you',
        action: 'hover',
      },
      {
        target: PICKER_TRACKS,
        caption: 'Or tick the tracks you want',
        action: 'hover',
      },
      {
        target: 'leadsheet-melody-picker',
        caption: 'Click again to close it',
        action: 'click',
      },
    ],
    check: melodyTracksChanged,
  },
  {
    id: 'melody-off',
    stage: STAGE,
    instruction:
      'Now click **Melody** again to turn it off. The chord chart comes back, ready to edit.',
    target: 'leadsheet-melody-toggle',
    requires: { view: 'leadsheet' },
    demo: [
      {
        target: 'leadsheet-melody-toggle',
        caption: 'Off, the sheet shows only chords',
        action: 'hover',
      },
    ],
    check: (s) => !s.leadSheetShowMelody,
  },
  {
    id: 'change-a-chord',
    stage: STAGE,
    instruction:
      'Double-click a chord symbol, type a new chord (try **Dm** or **Fmaj7**), and press **Enter**.',
    hint: 'A chord symbol is the chord’s name over a bar, like F maj for F major. No chord there? Double-click a beat to write one.',
    target: [...A_CHORD, 'leadsheet-sheet'],
    requires: { view: 'leadsheet' },
    demo: [
      {
        target: A_CHORD,
        caption: 'Every chord symbol can change',
        action: 'hover',
      },
      {
        target: A_CHORD,
        caption: 'Double-click one to edit it',
        action: 'doubleClick',
      },
      {
        target: 'leadsheet-chord-input',
        caption: 'Type a new one, like **Fmaj7**',
      },
      {
        // Leaves the box with the chord it had: nothing is written.
        target: 'leadsheet-chord-input',
        caption: '**Esc** keeps the chord it had',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: chordChanged,
  },
  {
    id: 'print',
    stage: STAGE,
    instruction:
      'Click **PDF**, in the bar above the sheet, to print the lead sheet, or save it as a PDF from the print window.',
    target: 'leadsheet-print',
    requires: { view: 'leadsheet' },
    demo: [
      {
        target: 'leadsheet-print',
        caption: '**PDF** prints the lead sheet',
        action: 'hover',
      },
      {
        target: 'leadsheet-export-musicxml',
        caption: '**MusicXML** is a file notation apps open',
        action: 'hover',
      },
    ],
    check: doneMomentMoved('printLeadSheet'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'That’s the lead sheet: the chords a band reads, with the tune when you want it. **Full score** and **Lead sheet** switch the page between the two. Press **Finish** to go on to looping.',
    target: 'leadsheet-sheet',
  },
];
