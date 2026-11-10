import type { AllSlices } from '@/daw/store';
import type { TutorialStep } from '../tutorials';
import {
  clipAddedAnd,
  newPartsOn,
  playedThenStopped,
  sectionAdded,
  trackPlaying,
} from '../lessonChecks';
import { doneMomentMoved } from '../studioBasics/saveAndExportChecks';

// ── Indie — Movement & dynamics (owner, 2026-11-09) ────────────────────────
// Arrangement and automation, from a blank project: Prism writes the band,
// the student lays out a verse and a chorus, then automates the chords'
// volume into a swell and their pan across the stereo field, and bounces it.

const SONG = 'The song';
const FORM = 'Verse and chorus';
const MOVE = 'Movement';
const SHARE = 'Bounce it';

/** The track whose automation lane is open. */
const laneTrack = (s: AllSlices) =>
  s.tracks.find((t) => t.id === s.automationOpenTrackId);

export const indieSteps: TutorialStep[] = [
  {
    id: 'ask-band',
    stage: SONG,
    instruction:
      'Open **Prism**, type **indie drums, bass and chords** and press **Create**.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { view: 'arrange', libraryOpen: false, promptOpen: true },
    check: newPartsOn('drums', 'bass', 'chords'),
  },
  {
    id: 'hear-it',
    stage: SONG,
    instruction: 'Press **Play** to hear it, then stop.',
    target: 'transport-play',
    requires: { promptOpen: false },
    check: playedThenStopped,
  },
  {
    id: 'add-verse',
    stage: FORM,
    instruction:
      'Click **+ Section** above the ruler and choose **Verse**: it marks the bars you have.',
    why: 'Sections are the song’s map: verses tell the story, the chorus is what people sing back.',
    target: 'add-section',
    check: sectionAdded,
  },
  {
    id: 'duplicate-verse',
    stage: FORM,
    instruction:
      'Right-click the **Verse** and choose **Duplicate with its clips**.',
    target: ['clip-menu-duplicateSection', 'sections-lane'],
    check: clipAddedAnd(sectionAdded),
  },
  {
    id: 'make-chorus',
    stage: FORM,
    instruction:
      'Right-click the **copy** and choose **Change type** › **Chorus**.',
    hint: 'The copy starts at bar 9: scroll the timeline right, or zoom out with − at the bottom right.',
    target: 'sections-lane',
    check: (s, armed) =>
      s.sections.filter((x) => x.type === 'chorus').length >
      armed.sections.filter((x) => x.type === 'chorus').length,
  },
  {
    id: 'open-automation',
    stage: MOVE,
    instruction:
      'Select the **chords** track, then click **Automation** at the bottom left: its lane opens under the timeline.',
    why: 'Automation moves a control for you over time: a fade, a swell, a sweep.',
    target: 'dock-automation',
    check: (s) => {
      const chords = trackPlaying(s, 'chords');
      return !!chords && s.automationOpenTrackId === chords.id;
    },
  },
  {
    id: 'draw-volume',
    stage: MOVE,
    instruction:
      '**Click** in the lane to drop two points: one low at the start of the verse, one high at the chorus. That’s a swell.',
    hint: 'Between points the level glides in a straight line.',
    target: 'automation-lane',
    requires: { automationParam: 'volume' },
    check: (s) => (laneTrack(s)?.automation?.volume?.length ?? 0) >= 2,
  },
  {
    id: 'hear-swell',
    stage: MOVE,
    instruction:
      'Press **Play** and watch the chords’ volume move on its own. Stop when you’ve heard it.',
    target: 'transport-play',
    check: playedThenStopped,
  },
  {
    id: 'pan-lane',
    stage: MOVE,
    instruction:
      'Pick **Pan** in the list beside the lane and drop a few points, left to right: the chords travel across your speakers.',
    target: 'automation-param-select',
    check: (s) => Object.keys(laneTrack(s)?.automation ?? {}).length >= 2,
  },
  {
    id: 'bounce',
    stage: SHARE,
    instruction:
      'Click **Export** at the top right, keep **WAV**, and press **Export**.',
    why: 'Automation is part of the mix: the bounce plays every move you drew.',
    target: ['export-audio-run', 'export-pill'],
    check: doneMomentMoved('exportAudio'),
  },
];
