import type { TutorialStep } from '../tutorials';
import { newPartOn, notesOn, someTrackChanged } from '../lessonChecks';
import { insightOpen } from './insightChecks';
import {
  clipAdded,
  clipCount,
  loopMoved,
  playedThenStopped,
} from './loopAndRepeatChecks';
import {
  clipChosen,
  noteAdded,
  noteDeleted,
  noteMoved,
  noteResized,
  pianoRollOpen,
} from './pianoRollChecks';
import { playedLive, takeKept, takeStarted } from './recordChecks';
import { doneMomentMoved } from './saveAndExportChecks';
import { chordChanged } from './scoreChecks';
import {
  instrumentChanged,
  selectedTrack,
  switchedOff,
  switchedOn,
  trackAdded,
} from './trackChecks';

// ── Studio Basics: make your first song (owner, 2026-11-09) ────────────────
//
// One lesson, from a blank project to a saved and exported song: the first
// time in the Studio. It walks the whole screen once, then makes a short
// song with every basic tool on the way — drums in the step grid, chords
// and a bass line from Prism (the prompt bar), a melody recorded live and
// fixed in the piano roll, the track controls, a loop, sections, Insight,
// the Score — and ends by saving and exporting it. It replaces the nine
// short Studio Basics lessons and Make your first track.
//
// Every target is a control or a container, never a canvas cell, and every
// check looks for a change against `armed` (the Studio as the step began),
// so no step passes before the student has done its move.

const TOUR = 'Find your way';
const SETUP = 'Set up the song';
const DRUMS = 'Drums';
const CHORDS = 'Chords with Prism';
const RECORD = 'Record a melody';
const ROLL = 'The piano roll';
const TRACKS = 'Track controls';
const BASS = 'A bass line';
const ARRANGE = 'Loop and repeat';
const INSIGHT = 'Insight';
const SCORE = 'The Score';
const SHARE = 'Save and export';

export const studioBasicsSteps: TutorialStep[] = [
  // ── 1. Find your way ────────────────────────────────────────────────────
  {
    id: 'welcome',
    stage: TOUR,
    instruction:
      'Welcome to the Studio. In about 25 minutes you’ll make a short song from this empty project, then save it and export it. Click **Next** for a quick look around.',
    why: 'Every tool you meet on the way is one you’ll use on every song after this one.',
    requires: { view: 'arrange', libraryOpen: false, promptOpen: false },
  },
  {
    id: 'tour-transport',
    stage: TOUR,
    instruction:
      'The **transport** sits at the top: Click (the metronome), Back to start, Rewind, **Record**, **Play**, Fast-forward and **Loop**. Space bar plays and stops.',
    why: 'You’ll press Play more than anything else: listening is how you decide what to change.',
    target: 'transport-play',
  },
  {
    id: 'tour-project',
    stage: TOUR,
    instruction:
      'The **Project** menu, top left, is where you save, open, import and export. Undo and Redo sit beside it.',
    why: 'Nothing you try here is permanent: Undo takes any change back.',
    target: 'file-menu',
  },
  {
    id: 'tour-views',
    stage: TOUR,
    instruction:
      'At the bottom are the three views: **Create** (where you make the song), **Mix** (where you balance it) and **Score** (the song as sheet music).',
    target: 'view-tabs',
  },
  {
    id: 'tour-rail',
    stage: TOUR,
    instruction:
      'On the right is the **side rail**: **Prism** (∆) writes parts for you, **Insight** reads your song’s key and chords, and **Lessons** brings you back here.',
    target: 'side-rail',
  },

  // ── 2. Set up the song ──────────────────────────────────────────────────
  {
    id: 'set-tempo',
    stage: SETUP,
    instruction:
      'Set the **Tempo** at the top right. Click it and type **100**, or drag it up or down.',
    why: 'Tempo is the song’s speed in beats per minute: 70 feels laid back, 128 makes people dance.',
    hint: 'Tap tempo is beside it: tap along with a song you like to find its speed.',
    target: 'transport-bpm',
    check: (s, armed) => s.bpm !== armed.bpm,
  },
  {
    id: 'set-key',
    stage: SETUP,
    instruction:
      'Choose the song’s **Key**: click the dashed **Key** button beside the tempo and pick a key on the circle, like **C major**.',
    why: 'The key is the set of notes that sound at home together. Prism and Insight both use it.',
    target: ['key-popover', 'song-key'],
    check: (s, armed) => s.rootNote !== null && s.rootNote !== armed.rootNote,
  },
  {
    id: 'click-on',
    stage: SETUP,
    instruction:
      'Turn on the **Click**, the metronome at the left of the transport.',
    why: 'The click counts the beat for you, so what you play and record lines up with the grid.',
    target: 'metronome-toggle',
    // On already (a setting kept from an earlier song): nothing to do.
    check: (s) => s.metronomeEnabled,
  },

  // ── 3. Drums ────────────────────────────────────────────────────────────
  {
    id: 'add-drums',
    stage: DRUMS,
    instruction:
      'Every song needs a pulse. Click **+ Add track**, then **Add MIDI** › **Drums**.',
    why: 'A track is one instrument in your song. MIDI tracks play notes you write or record.',
    target: ['add-track-drum-machine', 'add-track-midi', 'add-track-button'],
    check: (s, armed) =>
      trackAdded(s, armed) && selectedTrack(s)?.instrument === 'drum-machine',
  },
  {
    id: 'open-grid',
    stage: DRUMS,
    instruction:
      'The panel under the timeline is the **dock**. Click **Edit** at the bottom left to open the drums’ **step grid**.',
    why: 'The dock always shows the selected track: its sound, its effects or its notes.',
    target: 'chanstrip-tab-piano-roll',
    check: (s, armed) =>
      s.channelStripTab === 'piano-roll' &&
      (armed.channelStripTab !== 'piano-roll' || armed.dockMaster) &&
      selectedTrack(s)?.instrument === 'drum-machine',
  },
  {
    id: 'program-beat',
    stage: DRUMS,
    instruction:
      'Each row is a drum and each column a step. **Double-click** to add hits: kick on steps 1 and 9, snare on 5 and 13, and hi-hats on every other step. Add at least **8** hits.',
    why: 'Kick on 1 and 3, snare on 2 and 4 is the backbeat under most pop, rock and hip hop.',
    hint: 'Double-click a hit again to remove it.',
    target: 'drum-machine-view',
    check: (s, armed) =>
      notesOn(s, s.selectedTrackId) >= notesOn(armed, s.selectedTrackId) + 8,
  },
  {
    id: 'hear-beat',
    stage: DRUMS,
    instruction:
      'Press **Play** to hear your beat, then press it again to stop.',
    target: 'transport-play',
    check: playedThenStopped,
  },
  {
    id: 'swap-kit',
    stage: DRUMS,
    instruction:
      'Same pattern, new sound: open the **kit** menu under the grid and pick another kit.',
    why: 'Swapping the kit changes the whole feel without touching your pattern.',
    target: 'drum-kit-selector',
    check: someTrackChanged((t) => t.drumKit),
  },

  // ── 4. Chords with Prism ────────────────────────────────────────────────
  {
    id: 'back-to-start',
    stage: CHORDS,
    instruction:
      'Press **Back to start** (⏮) so the next part starts at bar 1.',
    why: 'New parts land at the playhead: the line that shows where you are in the song.',
    target: 'transport-to-start',
    check: (s) => !s.isPlaying && s.position === 0,
  },
  {
    id: 'open-prism',
    stage: CHORDS,
    instruction: 'Open **Prism**: click the **∆** at the top of the side rail.',
    why: 'Prism writes drums, bass lines and chords that fit your key and tempo, when you ask.',
    target: 'rail-prompt',
    promptCheck: (bar) => !bar.collapsed,
  },
  {
    id: 'ask-chords',
    stage: CHORDS,
    instruction:
      'Type **chords** in Prism’s box and press **Create**. Four bars of chords land on a new track, named for the style (like **Pop Keys comping**).',
    hint: 'Pick a style on the tag at the bottom left first, if you like: Pop, Rock, Lo-fi…',
    target: 'prompt-box',
    requires: { promptOpen: true },
    check: newPartOn('chords'),
  },
  {
    id: 'select-chords',
    stage: CHORDS,
    instruction:
      'Click the new **chords** track’s name to select it, then click **Instrument** at the bottom left.',
    target: ['chanstrip-tab-controls', 'track-name-1'],
    check: (s, armed) =>
      selectedTrack(s)?.trackRole === 'chords' &&
      s.channelStripTab === 'controls' &&
      (armed.channelStripTab !== 'controls' ||
        selectedTrack(armed)?.trackRole !== 'chords'),
  },
  {
    id: 'pick-sound',
    stage: CHORDS,
    instruction:
      'Give the chords a new sound: pick a category on the left, then a sound, like **Piano › Electric Piano 1**.',
    why: 'The same notes on a different instrument can change the whole mood of a song.',
    target: 'instrument-picker',
    requires: { channelStripTab: 'controls', soundsOpen: true },
    check: instrumentChanged,
  },

  // ── 5. Record a melody ──────────────────────────────────────────────────
  {
    id: 'add-melody',
    stage: RECORD,
    instruction:
      'Add a track for your melody: **+ Add track** › **Add MIDI** › **Instruments**.',
    target: ['add-track-soundfont', 'add-track-midi', 'add-track-button'],
    check: (s, armed) =>
      trackAdded(s, armed) && selectedTrack(s)?.instrument === 'soundfont',
  },
  {
    id: 'arm-melody',
    stage: RECORD,
    instruction:
      'A new track is **armed**: its red circle is on, so it plays and records what you play. Arming one track disarms the others. Click **Next**.',
    why: 'Recording goes to the armed track, so arm the one you mean to play.',
    hint: '⌘-click (Ctrl-click) a circle to arm a track alongside the others.',
    target: 'track-arm-2',
  },
  {
    id: 'play-keys',
    stage: RECORD,
    instruction:
      'Turn on **Typing keys** at the bottom left and play a few notes on your computer keyboard: **A S D F G H J** are the white keys. A MIDI keyboard works too.',
    why: 'Practise the tune before you record it: a few tries make a better take.',
    target: 'musical-typing',
    check: playedLive,
  },
  {
    id: 'count-in',
    stage: RECORD,
    instruction:
      '**Right-click** the Click and choose a **1 bar** count-in, so you hear four beats before recording starts.',
    // The count-in's choices once the settings are open, the Click until then.
    target: ['count-in-choices', 'metronome-toggle'],
    // Set already (a setting kept from an earlier song): nothing to do.
    check: (s) => s.countInBars > 0,
  },
  {
    id: 'record',
    stage: RECORD,
    instruction:
      'Press **Back to start**, then **Record** (or press **R**). After the count-in, play a simple tune over the chords.',
    target: 'transport-record',
    check: takeStarted,
  },
  {
    id: 'stop',
    stage: RECORD,
    instruction:
      'When you’re done, press **Play** or the space bar to stop. Your take is a new clip on the track.',
    why: 'Not happy with it? Undo, and record again: every take is a try.',
    target: 'transport-play',
    check: takeKept,
  },

  // ── 6. The piano roll ───────────────────────────────────────────────────
  {
    id: 'choose-take',
    stage: ROLL,
    instruction: 'Click your new **clip** on the timeline to select it.',
    // The melody track's first clip: the take (Prism's clip stays selected).
    target: ['timeline-clip-2-0', 'timeline-lane-2'],
    check: clipChosen,
  },
  {
    id: 'open-roll',
    stage: ROLL,
    instruction:
      'Click **Edit** to open it in the **piano roll**: time runs left to right, pitch goes up the keys.',
    target: 'chanstrip-tab-piano-roll',
    check: pianoRollOpen,
  },
  {
    id: 'add-note',
    stage: ROLL,
    instruction: '**Double-click** an empty spot in the grid to add a note.',
    target: 'piano-roll-grid',
    check: noteAdded,
  },
  {
    id: 'move-note',
    stage: ROLL,
    instruction:
      '**Drag** a note to move it: sideways in time, up or down in pitch.',
    target: 'piano-roll-grid',
    check: noteMoved,
  },
  {
    id: 'resize-note',
    stage: ROLL,
    instruction: 'Drag a note’s **right edge** to make it longer or shorter.',
    target: 'piano-roll-grid',
    check: noteResized,
  },
  {
    id: 'delete-note',
    stage: ROLL,
    instruction: '**Double-click** a note to delete it.',
    target: 'piano-roll-grid',
    check: noteDeleted,
  },
  {
    id: 'quantize',
    stage: ROLL,
    instruction:
      'Press **Quantize** in the bar under the notes: every note snaps onto the grid. Listen, then click **Next**.',
    why: 'Quantize tidies the timing of a live take. Use it when you want it tight, skip it when you want it human.',
    hint: 'The **Grid** menu beside it sets how fine the grid is: 1/16 snaps to sixteenth notes.',
    target: 'piano-roll-quantize',
  },

  // ── 7. Track controls ───────────────────────────────────────────────────
  {
    id: 'mute',
    stage: TRACKS,
    instruction: 'Press a track’s **M** to **mute** it.',
    target: 'track-mute-0',
    check: switchedOn('mute'),
  },
  {
    id: 'unmute',
    stage: TRACKS,
    instruction: 'Press **M** again to bring it back.',
    target: 'track-mute-0',
    check: switchedOff('mute'),
  },
  {
    id: 'solo',
    stage: TRACKS,
    instruction:
      'Press a track’s **S** to **solo** it: you hear only that track. Press Play to listen.',
    why: 'Solo is how you check one part closely without the rest of the band.',
    target: 'track-solo-2',
    check: switchedOn('solo'),
  },
  {
    id: 'unsolo',
    stage: TRACKS,
    instruction: 'Press **S** again to hear everything.',
    target: 'track-solo-2',
    check: switchedOff('solo'),
  },
  {
    id: 'volume',
    stage: TRACKS,
    instruction: 'Drag a track’s **volume** bar to make it louder or quieter.',
    hint: 'Double-click it to put it back where it started.',
    target: 'track-volume-1',
    check: someTrackChanged((t) => t.volume),
  },
  {
    id: 'pan',
    stage: TRACKS,
    instruction:
      'Turn a track’s **pan** knob to move it left or right in your speakers.',
    target: 'track-pan-1',
    check: someTrackChanged((t) => t.pan),
  },
  {
    id: 'rename',
    stage: TRACKS,
    instruction:
      '**Double-click** your melody track’s name and give it a name of your own, then press Enter.',
    target: 'track-name-2',
    check: someTrackChanged((t) => t.name),
  },

  // ── 8. A bass line ──────────────────────────────────────────────────────
  {
    id: 'ask-bass',
    stage: BASS,
    instruction:
      'Press **Back to start**, then ask **Prism** for a **bass line** and press **Create**.',
    why: 'The bass ties the drums to the chords: it plays the chords’ roots in the drums’ rhythm.',
    target: ['prompt-box', 'rail-prompt'],
    requires: { promptOpen: true },
    check: newPartOn('bass'),
  },
  {
    id: 'open-bass',
    stage: BASS,
    instruction:
      'Now make it yours: select the **Bass** track and open its notes with **Edit**.',
    target: ['chanstrip-tab-piano-roll', 'track-name-3'],
    requires: { promptOpen: false },
    check: (s, armed) =>
      selectedTrack(s)?.trackRole === 'bass' && pianoRollOpen(s, armed),
  },
  {
    id: 'fix-bass',
    stage: BASS,
    instruction:
      'Move **one note** of the bass line to a new pitch or place. Listen, and keep it if you like it.',
    why: 'A generated part is a starting point: a few changes of your own make it your song.',
    hint: 'Can’t see the notes? Scroll the piano roll up or down: a bass plays low.',
    target: 'piano-roll-grid',
    check: noteMoved,
  },

  // ── 9. Loop and repeat ──────────────────────────────────────────────────
  {
    id: 'loop-on',
    stage: ARRANGE,
    instruction: 'Turn on **Loop** in the transport (or press **L**).',
    target: 'transport-loop',
    check: (s, armed) => s.loopEnabled && !armed.loopEnabled,
  },
  {
    id: 'loop-range',
    stage: ARRANGE,
    instruction:
      'Drag along the **loop strip** at the top of the ruler to set the bars it repeats: try bars **1 to 3**.',
    target: ['timeline-loop-strip', 'timeline-ruler'],
    check: loopMoved,
  },
  {
    id: 'play-loop',
    stage: ARRANGE,
    instruction:
      'Press **Play**: the loop repeats until you stop it. Stop when you’ve heard it go round.',
    why: 'Looping a few bars is how producers work on one part again and again.',
    target: 'transport-play',
    check: playedThenStopped,
  },
  {
    id: 'repeat-drums',
    stage: ARRANGE,
    instruction:
      'Your beat is one bar long. Right-click the **drum clip** and choose **Duplicate** (or select it and press ⌘D / Ctrl+D) until it fills four bars.',
    target: ['clip-menu-duplicate', 'timeline-clip-0-0'],
    check: (s, armed) => clipCount(s) >= clipCount(armed) + 3,
  },
  {
    id: 'add-section',
    stage: ARRANGE,
    instruction:
      'Name this part of the song: click **+ Section** above the ruler and choose **Verse**.',
    why: 'Sections (intro, verse, chorus) are the song’s map, and Prism and the Score use them too.',
    target: 'add-section',
    check: (s, armed) => s.sections.length > armed.sections.length,
  },
  {
    id: 'duplicate-section',
    stage: ARRANGE,
    instruction:
      'Right-click the **Verse** and choose **Duplicate with its clips**: the whole verse is copied after it.',
    target: ['clip-menu-duplicateSection', 'sections-lane'],
    check: (s, armed) =>
      s.sections.length > armed.sections.length && clipAdded(s, armed),
  },
  {
    id: 'undo',
    stage: ARRANGE,
    instruction:
      'Press **Undo** at the top (or ⌘Z / Ctrl+Z) to take the copy back…',
    target: 'undo-button',
    check: (s, armed) => clipCount(s) < clipCount(armed),
  },
  {
    id: 'redo',
    stage: ARRANGE,
    instruction: '…and **Redo** (⇧⌘Z / Ctrl+Y) to bring it back.',
    why: 'Undo and Redo make it safe to try anything.',
    target: 'redo-button',
    check: (s, armed) => clipCount(s) > clipCount(armed),
  },

  // ── 10. Insight ─────────────────────────────────────────────────────────
  {
    id: 'open-insight',
    stage: INSIGHT,
    instruction: 'Click **Insight** (the light bulb) on the side rail.',
    target: 'rail-insight',
    check: insightOpen,
  },
  {
    id: 'read-insight',
    stage: INSIGHT,
    instruction:
      'Insight reads your song: each card is a chord, with its number in the key and the notes it uses. Open one to see more, then click **Next**.',
    why: 'Knowing a chord’s number in the key (1, 4, 5, 6…) lets you play the same song in any key.',
    target: 'insight-chords',
  },

  // ── 11. The Score ───────────────────────────────────────────────────────
  {
    id: 'open-score',
    stage: SCORE,
    instruction:
      'Click **Score** at the bottom to see your song as sheet music.',
    target: 'view-switch-score',
    check: (s, armed) =>
      s.currentView === 'score' && armed.currentView !== 'score',
  },
  {
    id: 'read-score',
    stage: SCORE,
    instruction:
      'This is your song as sheet music: the chords on top, then a staff for each track. Click **Next** when you’ve had a look.',
    why: 'Sheet music lets anyone who reads music play your song, without hearing it first.',
    target: 'score-staves',
  },
  {
    id: 'chords-only',
    stage: SCORE,
    instruction:
      'Open **Staves** at the top left and choose **Chords only**: the page becomes a **lead sheet**, the chord chart a band plays from.',
    target: ['score-staves-none', 'score-staves'],
    check: (s, armed) =>
      s.scoreHiddenTrackIds.length > armed.scoreHiddenTrackIds.length,
  },
  {
    id: 'change-chord',
    stage: SCORE,
    instruction:
      '**Double-click** a chord, type a new one (like **Am**) and press Enter.',
    why: 'Changing a chord here changes it everywhere: the chord lane, Insight and what Prism writes next.',
    target: ['leadsheet-chord-0-0', 'leadsheet-sheet'],
    check: chordChanged,
  },
  {
    id: 'back-to-create',
    stage: SCORE,
    instruction: 'Go back to **Create**.',
    target: 'view-switch-arrange',
    check: (s, armed) =>
      s.currentView === 'arrange' && armed.currentView !== 'arrange',
  },

  // ── 12. Save and export ─────────────────────────────────────────────────
  {
    id: 'save',
    stage: SHARE,
    instruction:
      'Open the **Project** menu and choose **Save** (or press ⌘S / Ctrl+S). Give your song a name.',
    why: 'Saved songs live in your account: open them again from Project › Open or the Library.',
    target: ['file-save', 'file-menu'],
    check: doneMomentMoved('save'),
  },
  {
    id: 'export-audio',
    stage: SHARE,
    instruction:
      'Click **Export** at the top right, keep **WAV**, and press **Export** to save your song as an audio file.',
    why: 'An audio file plays anywhere: send it to a friend, or put it in a video.',
    target: ['export-audio-run', 'export-pill'],
    check: doneMomentMoved('exportAudio'),
  },
  {
    id: 'export-midi',
    stage: SHARE,
    instruction:
      'One more: **Project** › **Export** › **MIDI file** saves the notes, ready for any other music app.',
    target: ['file-export-midi', 'file-menu'],
    check: doneMomentMoved('exportMidi'),
  },
  {
    id: 'done',
    stage: SHARE,
    instruction:
      'You made a song: drums, chords, a melody and a bass line, arranged, saved and exported. Click **Finish**.',
    why: 'Next, the Studio Production lessons go deeper: beats, sound design, harmony, mixing and arrangement.',
  },
];
