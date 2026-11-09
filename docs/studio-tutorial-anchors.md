# Studio tutorial anchors (Studio Basics)

The controls a Studio Basics lesson step can point at, by their `data-tutorial-id`, in the Stage B shell (the side rail, the bottom rail, one 64 px track row with its ⋯ menu, the dock under the timeline, the one Score page, the Export pill). A step's `target` names one or more of these; the first one on screen wins (`src/daw/components/Tutorial/anchorRegistry.ts`). Ids are stable kebab-case. If one has to change, add the old id to `ANCHOR_ALIASES` (the ids Stage B moved are listed at the end).

The nine Studio Basics lessons are written for this shell (rewritten after the Stage B merge, 2026-10-19).

How to read the ids:

- `{i}` is a track's index in the project, 0 for the top track, in the order the track list shows them. The same `{i}` names the same track in the track list, the timeline, Insight and the Lead sheet's melody picker.
- `{c}` is a clip's index on its track (its place in the track's `midiClips`, or `audioClips` on an audio track). `{bar}` is a bar of the lead sheet (0 for the first) and `{n}` the nth chord in that bar.
- Menus, popovers and dialogs mount only while open, so their anchors exist only then. A step that points at an item should also name what opens it, for example `['track-menu-duplicate', 'track-header-1']`.
- The timeline is a canvas. Its anchors (`timeline-*`, `loop-region`) are invisible boxes laid over it that let clicks pass through to the canvas. To click one in a demo, click at the box's center on the canvas (`document.elementFromPoint` finds the canvas there). Don't click the box itself.
- The anchor inventory test (`src/daw/components/Tutorial/__tests__/tutorialAnchors.test.ts`) needs an entry in `TEMPLATE_SOURCES` for each `{…}` template a lesson targets: for example `track-mute-` with the values `'0'` to `'9'` (`MAX_TOTAL_TRACKS` is 10). A Segmented control's segments carry the `anchor` of their option; the test reads those from the lists in its `SEGMENT_ANCHORS`. The ids below with no braces are exact. `src/daw/__tests__/studioBasicsAnchors.test.ts` keeps this file in step with the code.

## Views

| Id                      | Points at                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `view-switch-arrange`   | The Create tab (tracks, timeline, the dock with the Piano Roll)                                |
| `view-switch-studio`    | The Mix tab                                                                                    |
| `view-switch-score`     | The Score tab: one page for the full score and the lead sheet, on the layout last shown        |
| `view-switch-fullscore` | The Score page's Full score segment (its Full score \| Lead sheet switch, first in the header) |
| `view-switch-leadsheet` | The Score page's Lead sheet segment (its Full score \| Lead sheet switch, first in the header) |

## Tracks (Lessons 1 and 2)

A track is one 64 px row: grip, instrument, name and ⋯ on top, M, S, Arm and the volume below. Everything else is in its ⋯ menu, which a right-click on the row also opens.

| Id                             | Points at                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `track-header-{i}`             | Track i's row. A click selects the track; a right-click selects it and opens its ⋯ menu at the pointer.     |
| `selected-track-header`        | The selected track's row                                                                                    |
| `track-name-{i}`               | The track's name: a click selects it, a double-click renames it                                             |
| `track-instrument-{i}`         | The instrument button at the row's left: it selects the track and opens the dock on its Instrument tab      |
| `track-mute-{i}`               | M (mute)                                                                                                    |
| `track-solo-{i}`               | S (solo)                                                                                                    |
| `track-arm-{i}`                | The record-arm circle                                                                                       |
| `track-volume-{i}`             | The volume fader                                                                                            |
| `track-menu-button`            | The ⋯ button of the selected row (of the first row while none is selected)                                  |
| `track-menu-change-instrument` | ⋯ menu: Instrument… (MIDI tracks), which opens the instrument picker for the track                          |
| `track-menu-duplicate`         | ⋯ menu: Duplicate track (⌘D on the name). The copy is "<name> copy", right after it.                        |
| `track-menu-monitor`           | ⋯ menu: Monitor input (the row has no MON button)                                                           |
| `automation-toggle`            | ⋯ menu: Show automation                                                                                     |
| `track-menu-delete`            | ⋯ menu: Delete track                                                                                        |
| `dock-instrument`              | The dock header's instrument button (MIDI tracks): names what the selected track plays and opens the picker |
| `instrument-dialog`            | The Instrument dialog the two above open                                                                    |
| `chanstrip-tab-controls`       | The dock's Instrument tab                                                                                   |

## Instrument picker (Lessons 1 and 2)

It opens in the Instrument dialog from `track-menu-change-instrument` and `dock-instrument`, and as the second step of the Add-track picker's Instruments category.

| Id                           | Points at                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instrument-picker`          | The picker                                                                                                                                                                                                                                     |
| `instrument-family-{family}` | A family tab: `piano`, `electric-piano`, `organ`, `guitar`, `bass`, `strings`, `brass`, `woodwinds`, `mallets`, `voice`, `world`, `drums`. A drum track's picker lists its kits only, with no tabs. A melodic track's picker has no Drums tab. |
| `instrument-{id}`            | One instrument (ids below). The one playing now has `aria-current="true"`.                                                                                                                                                                     |

Instrument ids by family (`src/daw/instruments/simpleInstruments.ts`):

- **piano**: `instrument-grand-piano`, `instrument-bright-piano`, `instrument-honky-tonk-piano`, `instrument-harpsichord`
- **electric-piano**: `instrument-electric-piano`, `instrument-soft-electric-piano`, `instrument-bell-electric-piano`, `instrument-electric-grand`, `instrument-clavinet`
- **organ**: `instrument-tonewheel-organ`, `instrument-church-organ`, `instrument-drawbar-organ`, `instrument-rock-organ`, `instrument-accordion`, `instrument-harmonica`
- **guitar**: `instrument-acoustic-guitar`, `instrument-nylon-guitar`, `instrument-steel-guitar`, `instrument-jazz-guitar`, `instrument-clean-electric-guitar`, `instrument-muted-guitar`, `instrument-overdrive-guitar`, `instrument-distortion-guitar`
- **bass**: `instrument-bass-guitar`, `instrument-electric-bass`, `instrument-finger-bass`, `instrument-upright-bass`, `instrument-fretless-bass`, `instrument-pick-bass`, `instrument-slap-bass`, `instrument-synth-bass`, `instrument-bass-808`
- **strings**: `instrument-violin`, `instrument-viola`, `instrument-cello`, `instrument-double-bass`, `instrument-string-section`, `instrument-pizzicato-strings`, `instrument-tremolo-strings`, `instrument-harp`
- **brass**: `instrument-trumpet`, `instrument-muted-trumpet`, `instrument-trombone`, `instrument-french-horn`, `instrument-tuba`, `instrument-brass-section`
- **woodwinds**: `instrument-flute`, `instrument-piccolo`, `instrument-clarinet`, `instrument-oboe`, `instrument-bassoon`, `instrument-recorder`, `instrument-pan-flute`, `instrument-soprano-sax`, `instrument-alto-sax`, `instrument-tenor-sax`, `instrument-baritone-sax`
- **mallets**: `instrument-vibraphone`, `instrument-marimba`, `instrument-xylophone`, `instrument-glockenspiel`, `instrument-celesta`, `instrument-music-box`, `instrument-tubular-bells`
- **voice**: `instrument-choir`, `instrument-voice-oohs`
- **world**: `instrument-steel-drums`, `instrument-kalimba`, `instrument-banjo`, `instrument-sitar`, `instrument-koto`, `instrument-bagpipe`
- **drums**: `instrument-acoustic-kit`, `instrument-kit-808`, `instrument-house-kit`

A step can check the store for the result: the track's `instrument`, plus its `gmProgram`, `bassVoice` or `drumKit`. The command is `setTrackInstrument(trackId, id)` in `src/daw/commands/trackCommands.ts`.

## Add a track (Lesson 2)

`+ Add track` opens the Add-track picker: eight category tiles, then a second step for Keys, Drums, Instruments and the amp. A one-choice category's tile carries its choice's anchor.

| Id                            | Points at                                             |
| ----------------------------- | ----------------------------------------------------- |
| `add-track-button`            | + Add track, in the header cell over the track list   |
| `add-track-menu`              | The Add-track picker (a dialog)                       |
| `add-track-cat-keys`          | Keys (second step: Piano, Electric piano, Organ)      |
| `add-track-cat-drums`         | Drums (second step: Drum grid, Grooves)               |
| `add-track-soundfont`         | Instruments: its second step is the instrument picker |
| `add-track-instrument-picker` | The picker step (it holds `instrument-picker`)        |
| `add-track-cat-amp`           | Guitar & bass amp (second step: Guitar, Bass)         |
| `add-track-back`              | All tracks: back from a second step to the categories |
| `add-track-piano-sampler`     | Keys ▸ Piano                                          |
| `add-track-electric-piano`    | Keys ▸ Electric piano                                 |
| `add-track-tonewheel-organ`   | Keys ▸ Organ                                          |
| `add-track-drum-machine`      | Drums ▸ Drum grid (opens Notes, the step sequencer)   |
| `add-track-grooves`           | Drums ▸ Grooves                                       |
| `add-track-bass-electric`     | Bass (the playable bass guitar)                       |
| `add-track-synth`             | Synth (Oracle Synth)                                  |
| `add-track-sampler`           | Sampler                                               |
| `add-track-vocal-fx`          | Voice (audio)                                         |
| `add-track-guitar-fx`         | Amp ▸ Guitar (audio)                                  |
| `add-track-bass-fx`           | Amp ▸ Bass (audio)                                    |
| `add-track-import`            | Import MIDI file…                                     |
| `add-track-browser`           | Browse the library                                    |

A track picked from the Instruments picker is added at the bottom (index = the old track count), named after its instrument and selected (`selectedTrackId`), with the dock on Instrument (not during a lesson). `addInstrumentTrack(id)` in `trackCommands.ts` adds it the same way.

## Transport and recording (Lesson 3)

The transport is in the bottom rail: Play, Record, Go to start, Rewind, Fast-forward, the position, Loop, and Click with its settings caret. There is no Stop button: Play pauses, Esc stops.

| Id                    | Points at                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `transport-play`      | Play / Pause                                                                                                    |
| `transport-record`    | Record                                                                                                          |
| `transport-to-start`  | Go to start                                                                                                     |
| `transport-loop`      | Loop on or off                                                                                                  |
| `metronome-toggle`    | Click (metronome) on or off                                                                                     |
| `count-in-menu`       | The caret beside Click: the click's sound, volume and count-in, in a popover                                    |
| `count-in-0`          | The popover's count-in: Off                                                                                     |
| `count-in-1`          | The popover's count-in: 1 bar                                                                                   |
| `count-in-2`          | The popover's count-in: 2 bars                                                                                  |
| `top-bar-more`        | The top bar's ⋯ menu                                                                                            |
| `top-bar-more-typing` | ⋯ menu: Play notes from the computer keyboard (Typing on or off; also the backquote key)                        |
| `musical-typing`      | The Typing pill in the top bar, shown only while Typing is on (A S D F G … are C D E F G …); its × turns it off |
| `undo-button`         | Undo                                                                                                            |
| `redo-button`         | Redo                                                                                                            |
| `transport-bpm`       | The tempo field, in the bottom rail's song controls                                                             |

## Timeline: lanes, clips, loop (Lessons 4, 5 and 8)

The canvas has one menu (`clip-menu`) for clips, lanes, markers, the ruler and sections; `data-menu-target` says which. A right-click opens it at the pointer, and the selected clip's Edit pill opens it under itself. A click on a clip selects it and its track and opens it in the dock (Notes), except during a lesson, when the dock keeps the tab the step chose.

| Id                       | Points at                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `timeline-lane-{i}`      | Track i's lane on the timeline. A right-click on an empty stretch opens `clip-menu` for the lane.  |
| `timeline-lane-end-{i}`  | Track i's lane just after its last clip, half a beat wide (in view): Paste here lands on the bar   |
| `timeline-clip-{i}-{c}`  | Clip c of track i (only while it is in view). A right-click opens `clip-menu`.                     |
| `timeline-clip-selected` | The selected clip                                                                                  |
| `clip-edit-pill`         | The selected clip's Edit pill, which opens its menu                                                |
| `timeline-ruler`         | The bar ruler at the top (click to move the playhead)                                              |
| `timeline-loop-strip`    | The thin strip at the top of the ruler. Drag along it to draw a loop, which also turns looping on. |
| `loop-region`            | The loop region drawn on that strip (shown when it is in view). Drag its ends to resize it.        |
| `timeline-chord-lane`    | The chord lane under the ruler                                                                     |
| `clip-menu`              | The canvas menu                                                                                    |
| `clip-menu-duplicate`    | Duplicate: a copy right after the clip (⌘D)                                                        |
| `clip-menu-copy`         | Copy (⌘C)                                                                                          |
| `clip-menu-cut`          | Cut (⌘X)                                                                                           |
| `clip-menu-paste`        | Paste (⌘V) on a clip's menu; Paste here on a lane's, at the bar clicked                            |
| `clip-menu-delete`       | Delete                                                                                             |
| `clip-menu-split`        | Split at playhead                                                                                  |

## Piano Roll (Lesson 4)

The Piano Roll is the dock's Notes tab on a melodic track (the drum grid on drums); there is no Piano Roll window. Maximize grows the dock over the timeline.

| Id                         | Points at                                                    |
| -------------------------- | ------------------------------------------------------------ |
| `chanstrip-tab-piano-roll` | The dock's Notes tab                                         |
| `dock-body`                | The dock's body: the Notes tab's piano roll                  |
| `dock-toggle`              | Close (or open) the dock                                     |
| `dock-maximize`            | Maximize (or restore) the dock, over the timeline            |
| `dock-analyze-notes`       | Analyze N notes, in the dock header while notes are selected |
| `piano-roll-tool-select`   | Select tool (V)                                              |
| `piano-roll-tool-draw`     | Draw tool (D): click the grid to add a note, drag to size it |
| `piano-roll-tool-erase`    | Erase tool (E)                                               |
| `piano-roll-select-all`    | Select all                                                   |
| `piano-roll-delete`        | Delete the selected notes (shown while notes are selected)   |
| `piano-roll-quantize`      | Quantize                                                     |
| `piano-roll-grid`          | The note grid                                                |
| `piano-roll-keys`          | The keyboard down the side (a click selects a row's notes)   |

## Insight (Lesson 5)

Insight is a panel of the side rail. Selecting notes across tracks used to need a ⌘-drag over the clips; Insight lists each instrument track with notes as a button: one click selects all of that track's notes, a second click takes them out. Pick the chord track and the bass track, then Analyze.

| Id                  | Points at                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `rail-insight`      | The side rail's Insight button (opens the Inspector on Insight)                           |
| `rail-library`      | The side rail's Library button                                                            |
| `insight-tracks`    | The Analyze Tracks group                                                                  |
| `insight-track-{i}` | Track i's button (`aria-pressed` when all its notes are selected). Drum tracks have none. |
| `insight-selection` | The selection summary (shown once something is selected)                                  |
| `insight-analyze`   | Analyze N notes (or chords)                                                               |
| `insight-harmony`   | The analysis's Harmony: the chords by number in the key (1 maj → 6 min …), then by name   |
| `insight-clear`     | Clear the selection                                                                       |
| `file-analyze`      | Project menu: Analyze (the whole song)                                                    |

A step can check `selectedNotes` (one entry per clip) and `selectionAnalysis` (set once Analyze has run).

## Score (Lesson 6)

The Score tab opens the layout last shown, which can be the Lead sheet: `view-switch-fullscore` switches the page to the Full score, and a step's `requires: { view: 'score' }` opens it there.

| Id                      | Points at                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `view-switch-score`     | The Score tab                                                                                                     |
| `view-switch-fullscore` | The page's Full score segment                                                                                     |
| `score-note-input`      | Add notes, at the top of the palettes (N). While it is on, a click on a staff, or a letter A to G, writes a note. |
| `score-sheet`           | The engraved score                                                                                                |
| `score-print`           | Print / PDF                                                                                                       |
| `score-export-musicxml` | MusicXML                                                                                                          |

## Lead sheet (Lesson 7)

The lead sheet is the Score page's other layout: `view-switch-leadsheet` switches to it.

| Id                           | Points at                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `view-switch-leadsheet`      | The Score page's Lead sheet segment                                                               |
| `leadsheet-melody-toggle`    | Melody on or off                                                                                  |
| `leadsheet-melody-picker`    | The melody-track picker beside it                                                                 |
| `leadsheet-melody-menu`      | The picker's panel                                                                                |
| `leadsheet-melody-auto`      | Picker: Auto                                                                                      |
| `leadsheet-melody-track-{i}` | Picker: track i's box                                                                             |
| `leadsheet-sheet`            | The sheet                                                                                         |
| `leadsheet-chord-{bar}-{n}`  | A chord symbol on the chord chart (with Melody off). A click selects it; a double-click edits it. |
| `leadsheet-chord-input`      | The chord being typed (after a double-click)                                                      |
| `leadsheet-add-measure`      | + Measure                                                                                         |
| `leadsheet-print`            | PDF (print)                                                                                       |
| `leadsheet-export-musicxml`  | MusicXML (with Melody on, the melody under its chords)                                            |

With Melody on, the sheet is engraved like the Score. Its chords are drawn there too, but have no anchors of their own. To edit chords, turn Melody off. `score-note-input` writes melody notes.

## Save and export (Lesson 9)

Export is the top bar's white pill, opening one dialog with Audio and Notation. Project ▾ has Audio… and Notation… (both open that dialog) and MIDI file (downloads at once, as ⇧⌘E does).

| Id                          | Points at                                                           |
| --------------------------- | ------------------------------------------------------------------- |
| `file-menu`                 | The Project menu                                                    |
| `file-save`                 | Project menu: Save                                                  |
| `file-save-as`              | Project menu: Save as…                                              |
| `save-chip`                 | The save status chip beside the project name                        |
| `export-pill`               | The Export pill at the top bar's right                              |
| `file-export-audio`         | Project menu: Export, Audio… (the dialog, on Audio)                 |
| `file-export-notation`      | Project menu: Export, Notation (MIDI, MusicXML)…                    |
| `file-export-midi`          | Project menu: Export, MIDI file                                     |
| `export-audio-dialog`       | The Export dialog                                                   |
| `export-audio-run`          | Its Export button on the Audio side                                 |
| `export-notation-midi`      | Notation side, Format: MIDI file                                    |
| `export-notation-leadsheet` | Notation side, Format: MusicXML: lead sheet                         |
| `export-notation-score`     | Notation side, Format: MusicXML: full score (one track's: its part) |
| `export-notation-run`       | Its Export button on the Notation side                              |

The dialog remembers the last format: Notation… opens on it (MIDI file at first), so a MusicXML step points at `export-notation-score` before Export. The Export pill opens the dialog on Audio.

## Done moments (what a Save, Export or Print step checks)

`doneMoments` in the store counts how often each of these things has happened on the page (`src/daw/store/doneMomentsSlice.ts`): `save`, `exportMidi`, `exportMusicXml`, `exportAudio`, `printScore`, `printLeadSheet`. A count only goes up. It survives a new project or a load, and it is never saved or undone. To check a step, compare with the snapshot the step armed with:

```ts
check: (s, armed) => s.doneMoments.exportMidi > armed.doneMoments.exportMidi,
```

- `save`: the cloud accepted a save (Save, ⌘S, Save As, the chip's Retry). A failed save doesn't count.
- `exportMidi`: a MIDI file was downloaded (Project ▾ ▸ MIDI file, ⇧⌘E, the Export dialog's Notation side, a track's Export track ▸ MIDI file). A project with no notes downloads nothing and doesn't count.
- `exportMusicXml`: a MusicXML file was downloaded from the Export dialog's Notation side, or from the Score page's MusicXML button in either layout.
- `exportAudio`: an audio file was rendered and downloaded from the Export dialog (the song, the stems or one track). `lastAudioExportAt` is still set too.
- `printScore` and `printLeadSheet`: the browser's print dialog opened from the Score page, by the layout printed: the Full score's Print / PDF, the Lead sheet's PDF.

## Ids Stage B moved (`ANCHOR_ALIASES`)

A step, slide or saved lesson that still names one of these old ids resolves to the new one:

- `transport-back` → `transport-to-start` (Go to start)
- `inspector-toggle` → `rail-insight`, `insight-tab` → `rail-insight`, `library-tab` → `rail-library` (the side rail)
- `lane-menu` → `clip-menu`, `ruler-menu` → `clip-menu`, `lane-menu-paste` → `clip-menu-paste` (one canvas menu)
- `piano-roll-modal` → `dock-body`, `piano-roll-analyze` → `dock-analyze-notes`, `piano-roll-close` → `dock-toggle` (the dock's Notes tab)
- `file-export-musicxml` → `file-export-notation` (the Export dialog's Notation side)

Gone with no place in Stage B: `transport-stop` (no Stop button), `track-monitor-{i}` (Monitor input is `track-menu-monitor`), `clip-menu-open-piano-roll` (a click on a clip opens Notes) and `song-chip` (the bottom rail shows the key, tempo and meter). The anchor inventory test lists the Studio Basics steps that still name them as known missing until the lessons are rewritten (lessons 1 to 5 name none: Record stops a take with Pause, and Monitor input is taught in the ⋯ menu).
