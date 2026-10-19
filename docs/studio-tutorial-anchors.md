# Studio tutorial anchors (Studio Basics)

The controls a Studio Basics lesson step can point at, by their `data-tutorial-id`. A step's `target` names one or more of these; the first one on screen wins (`src/daw/components/Tutorial/anchorRegistry.ts`). Ids are stable kebab-case. If one has to change, add the old id to `ANCHOR_ALIASES`.

How to read the ids:

- `{i}` is a track's index in the project, 0 for the top track, in the order the track list shows them. The same `{i}` names the same track in the track header, the timeline, Insight and the Lead Sheet's melody picker.
- `{c}` is a clip's index on its track (its place in the track's `midiClips`, or `audioClips` on an audio track). `{bar}` is a bar of the lead sheet (0 for the first) and `{n}` the nth chord in that bar.
- Menus, popovers and dialogs mount only while open, so their anchors exist only then. A step that points at an item should also name what opens it, for example `['track-menu-duplicate', 'track-header-1']`.
- The timeline is a canvas. Its anchors (`timeline-*`, `loop-region`) are invisible boxes laid over it that let clicks pass through to the canvas. To click one in a demo, click at the box's center on the canvas (`document.elementFromPoint` finds the canvas there). Don't click the box itself.
- The anchor inventory test (`src/daw/components/Tutorial/__tests__/tutorialAnchors.test.ts`) needs an entry in `TEMPLATE_SOURCES` for each `{…}` template a lesson targets: for example `track-mute-` with the values `'0'` to `'9'` (`MAX_TOTAL_TRACKS` is 10). The ids below with no braces are exact. `src/daw/__tests__/studioBasicsAnchors.test.ts` keeps this file in step with the code.

## Views

| Id                      | Points at                                                       |
| ----------------------- | --------------------------------------------------------------- |
| `view-switch-arrange`   | The Create tab (tracks, timeline, the dock with the Piano Roll) |
| `view-switch-studio`    | The Mix tab                                                     |
| `view-switch-score`     | The Score tab                                                   |
| `view-switch-leadsheet` | The Lead sheet tab                                              |

## Tracks (Lessons 1 and 2)

| Id                             | Points at                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `track-header-{i}`             | Track i's header. A click selects the track; a right-click opens its menu.                                                                     |
| `selected-track-header`        | The selected track's header (its white selection ring)                                                                                         |
| `track-name-{i}`               | The track's name field                                                                                                                         |
| `track-instrument-{i}`         | The instrument button, which names what the track plays and opens the instrument picker. On an audio track it is a plain label with no picker. |
| `track-monitor-{i}`            | MON (monitor)                                                                                                                                  |
| `track-mute-{i}`               | M (mute)                                                                                                                                       |
| `track-solo-{i}`               | S (solo)                                                                                                                                       |
| `track-arm-{i}`                | The record-arm circle                                                                                                                          |
| `track-volume-{i}`             | The volume slider                                                                                                                              |
| `automation-toggle`            | The automation button (on every header; the first one on screen wins)                                                                          |
| `track-menu-change-instrument` | Right-click menu: Change Instrument… (MIDI tracks)                                                                                             |
| `track-menu-duplicate`         | Right-click menu: Duplicate Track                                                                                                              |
| `track-menu-delete`            | Right-click menu: Delete Track                                                                                                                 |

## Instrument picker (Lessons 1 and 2)

It opens from `track-instrument-{i}`, from `track-menu-change-instrument`, and from the Add Track menu's Instruments card.

| Id                           | Points at                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instrument-picker`          | The picker panel                                                                                                                                                                                                                               |
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

## Add Track (Lesson 2)

| Id                            | Points at                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `add-track-button`            | + Add Track, under the track headers                                              |
| `add-track-menu`              | The Add Track dialog (the track-type cards)                                       |
| `add-track-soundfont`         | The **Instruments** card, which opens the instrument picker in place of the cards |
| `add-track-instrument-picker` | The picker step of the Add Track dialog (it holds `instrument-picker`)            |
| `add-track-back`              | All Track Types (back to the cards)                                               |
| `add-track-vocal-fx`          | Vocal card (audio)                                                                |
| `add-track-synth`             | Synth card (Oracle Synth)                                                         |
| `add-track-tonewheel-organ`   | Organ card                                                                        |
| `add-track-drum-machine`      | Drums card                                                                        |
| `add-track-sampler`           | Sampler card                                                                      |
| `add-track-guitar-fx`         | Guitar card (audio)                                                               |
| `add-track-bass-fx`           | Bass card (audio)                                                                 |
| `add-track-none`              | Import card                                                                       |

A track picked from the Instruments picker is added at the bottom (index = the old track count), named after its instrument and selected (`selectedTrackId`). `addInstrumentTrack(id)` in `trackCommands.ts` does the same.

## Transport and recording (Lesson 3)

| Id                 | Points at                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `transport-play`   | Play / Pause                                                                                                    |
| `transport-stop`   | Stop (a double-click goes back to the start)                                                                    |
| `transport-record` | Record                                                                                                          |
| `transport-back`   | Back to the previous marker or the start                                                                        |
| `transport-loop`   | Loop on or off                                                                                                  |
| `metronome-toggle` | Click (metronome) on or off                                                                                     |
| `musical-typing`   | Typing: the computer keyboard plays notes (A S D F G … are C D E F G …) while it is on                          |
| `count-in-menu`    | The count-in caret beside Click                                                                                 |
| `count-in-0`       | Count-in menu: No count-in                                                                                      |
| `count-in-1`       | Count-in menu: Count in 1 bar                                                                                   |
| `count-in-2`       | Count-in menu: Count in 2 bars                                                                                  |
| `top-bar-more`     | The top bar's ⋯ menu. In a narrow window the count-in choices (`count-in-*`) move into it from `count-in-menu`. |
| `undo-button`      | Undo                                                                                                            |
| `redo-button`      | Redo                                                                                                            |
| `song-chip`        | The Song chip (key and tempo)                                                                                   |
| `transport-bpm`    | The tempo field in the Song popover                                                                             |

## Timeline: lanes, clips, loop (Lessons 4, 5 and 8)

| Id                          | Points at                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `timeline-lane-{i}`         | Track i's lane on the timeline. A right-click on an empty stretch opens `lane-menu`.                                      |
| `timeline-clip-{i}-{c}`     | Clip c of track i (only while it is in view). A double-click opens it in the Piano Roll; a right-click opens `clip-menu`. |
| `timeline-clip-selected`    | The selected clip                                                                                                         |
| `timeline-ruler`            | The bar ruler at the top (click to move the playhead)                                                                     |
| `timeline-loop-strip`       | The thin strip at the top of the ruler. Drag along it to draw a loop, which also turns looping on.                        |
| `loop-region`               | The loop region drawn on that strip (shown when it is in view). Drag its ends to resize it.                               |
| `timeline-chord-lane`       | The chord lane under the ruler                                                                                            |
| `clip-menu`                 | A clip's right-click menu                                                                                                 |
| `clip-menu-duplicate`       | Duplicate: a copy right after the clip (⌘D)                                                                               |
| `clip-menu-copy`            | Copy (⌘C)                                                                                                                 |
| `clip-menu-paste`           | Paste at Playhead (⌘V), on the clip's track                                                                               |
| `clip-menu-open-piano-roll` | Open in Piano Roll (as a double-click does)                                                                               |
| `clip-menu-delete`          | Delete                                                                                                                    |
| `lane-menu`                 | The right-click menu of an empty stretch of a lane                                                                        |
| `lane-menu-paste`           | Paste Here: pastes the copied clip onto that track at the bar clicked (shown once something is copied)                    |
| `ruler-menu`                | The ruler's right-click menu (markers)                                                                                    |

## Piano Roll (Lesson 4)

The roll opens in two places. One is the dock under the timeline, through its tab `chanstrip-tab-piano-roll`; it shows the selected clip, or the selected track's. The other is a large window opened by double-clicking a clip or choosing `clip-menu-open-piano-roll`. Both have the same tools.

| Id                         | Points at                                                    |
| -------------------------- | ------------------------------------------------------------ |
| `chanstrip-tab-piano-roll` | The dock's Piano Roll tab (melodic MIDI tracks)              |
| `piano-roll-modal`         | The Piano Roll window                                        |
| `piano-roll-tool-select`   | Select tool (V)                                              |
| `piano-roll-tool-draw`     | Draw tool (D): click the grid to add a note, drag to size it |
| `piano-roll-tool-erase`    | Erase tool (E)                                               |
| `piano-roll-select-all`    | Select all                                                   |
| `piano-roll-delete`        | Delete the selected notes (shown while notes are selected)   |
| `piano-roll-quantize`      | Quantize                                                     |
| `piano-roll-grid`          | The note grid                                                |
| `piano-roll-keys`          | The keyboard down the side (a click selects a row's notes)   |
| `piano-roll-analyze`       | The window's Analyze in Insight                              |
| `piano-roll-close`         | The window's close button                                    |

## Insight (Lesson 5)

Selecting notes across tracks used to need a ⌘-drag over the clips. Insight now lists each instrument track with notes as a button: one click selects all of that track's notes, a second click takes them out. Pick the chord track and the bass track, then Analyze.

| Id                  | Points at                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `inspector-toggle`  | The Inspector button in the top bar (opens the Insight column)                            |
| `insight-tab`       | Insight's tab in that column                                                              |
| `library-tab`       | The Library tab                                                                           |
| `insight-tracks`    | The Analyze Tracks group                                                                  |
| `insight-track-{i}` | Track i's button (`aria-pressed` when all its notes are selected). Drum tracks have none. |
| `insight-selection` | The selection summary (shown once something is selected)                                  |
| `insight-analyze`   | Analyze N notes (or chords)                                                               |
| `insight-harmony`   | The analysis's Harmony: the chords by number in the key (1 maj → 6 min …), then by name   |
| `insight-clear`     | Clear the selection                                                                       |
| `file-analyze`      | Project menu: Analyze (the whole song)                                                    |

A step can check `selectedNotes` (one entry per clip) and `selectionAnalysis` (set once Analyze has run).

## Score (Lesson 6)

| Id                      | Points at                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `view-switch-score`     | The Score tab                                                                                     |
| `score-note-input`      | Add notes (the pencil; N). While it is on, a click on a staff, or a letter A to G, writes a note. |
| `score-sheet`           | The engraved score                                                                                |
| `score-print`           | Print / PDF                                                                                       |
| `score-export-musicxml` | MusicXML                                                                                          |

## Lead Sheet (Lesson 7)

| Id                           | Points at                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `view-switch-leadsheet`      | The Lead sheet tab                                                                                |
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
| `leadsheet-export-musicxml`  | MusicXML                                                                                          |

With Melody on, the sheet is engraved like the Score. Its chords are drawn there too, but have no anchors of their own. To edit chords, turn Melody off. `score-note-input` writes melody notes.

## Save and export (Lesson 9)

| Id                     | Points at                                    |
| ---------------------- | -------------------------------------------- |
| `file-menu`            | The Project menu                             |
| `file-save`            | Project menu: Save                           |
| `file-save-as`         | Project menu: Save as…                       |
| `save-chip`            | The save status chip beside the project name |
| `file-export-audio`    | Project menu: Export, Audio…                 |
| `export-audio-dialog`  | The Export Audio dialog                      |
| `export-audio-run`     | Its Export button                            |
| `file-export-midi`     | Project menu: Export, MIDI                   |
| `file-export-musicxml` | Project menu: Export, Lead sheet (MusicXML)  |

## Done moments (what a Save, Export or Print step checks)

`doneMoments` in the store counts how often each of these things has happened on the page (`src/daw/store/doneMomentsSlice.ts`): `save`, `exportMidi`, `exportMusicXml`, `exportAudio`, `printScore`, `printLeadSheet`. A count only goes up. It survives a new project or a load, and it is never saved or undone. To check a step, compare with the snapshot the step armed with:

```ts
check: (s, armed) => s.doneMoments.exportMidi > armed.doneMoments.exportMidi,
```

- `save`: the cloud accepted a save (Save, ⌘S, Save As, the chip's Retry). A failed save doesn't count.
- `exportMidi`: a MIDI file was downloaded (Project menu or ⌘E). A project with no notes downloads nothing and doesn't count.
- `exportMusicXml`: a MusicXML file was downloaded from the Project menu, the Lead Sheet or the Score.
- `exportAudio`: a mixdown was rendered and downloaded from Export Audio. `lastAudioExportAt` is still set too.
- `printScore` and `printLeadSheet`: the browser's print dialog opened from the Score's Print / PDF or the Lead Sheet's PDF.
