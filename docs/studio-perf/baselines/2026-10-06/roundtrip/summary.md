# Studio reload round-trips

What survives a refresh, an in-app return, a tab close, a cloud save and reopen, a boot of every kind and a bad link in today's editor (milestone 1.0 baseline: losses are recorded, not fixed). Written by `scripts/studio-perf/roundtrip.mjs` on 2026-10-07 at commit `f96b3ecc` (studio/stage-a-1.0, with uncommitted changes under src) against http://localhost:5263. Every scenario starts from the kitchen sink (`scripts/studio-perf/fixtures/kitchenSink.mjs`), a value that is not the default for every field of the audit's persistence matrix, and the Studio API is the in-memory mock (`mockStudioApi.mjs`). The JSON report beside this file has every difference with its values before and after.

Against `scripts/studio-perf/knownLosses.json`: 0 regression(s), 0 improvement(s). Keys count one per track or clip, so `tracks[].trackRole` (lost ×9) is nine tracks' roles, and a track or clip that is gone altogether counts once, as `tracks[] (whole track)` or `tracks[].midiClips[] (whole clip)`.

## laptop

| Scenario                       | Result  | Fields lost | Keys lost | Page errors | New | Fixed | Time   |
| ------------------------------ | ------- | ----------- | --------- | ----------- | --- | ----- | ------ |
| R1-refresh-while-playing       | ok      | 65          | 74        | 0           | 0   | 0     | 18.2 s |
| R2-spa-return                  | ok      | 20          | 29        | 0           | 0   | 0     | 8.4 s  |
| R3-cloud-save-open:legacy      | ok      | 73          | 77        | 0           | 0   | 0     | 13.2 s |
| R3-cloud-save-open:document    | skipped | –           | –         | 0           | –   | –     | 0 s    |
| R4-leak:new                    | ok      | 44          | 44        | 0           | 0   | 0     | 11.6 s |
| R4-leak:template               | ok      | 43          | 43        | 0           | 0   | 0     | 15 s   |
| R4-leak:demo                   | ok      | 43          | 43        | 0           | 0   | 0     | 16.1 s |
| R4-leak:tutorial               | ok      | 41          | 41        | 0           | 0   | 0     | 15 s   |
| R4-leak:song                   | ok      | 41          | 41        | 0           | 0   | 0     | 16.6 s |
| R4-leak:practiceMode           | ok      | 39          | 39        | 0           | 0   | 0     | 15.2 s |
| R4-leak:practiceGenre          | ok      | 40          | 40        | 0           | 0   | 0     | 15.3 s |
| R4-leak:jam                    | ok      | 45          | 47        | 0           | 0   | 0     | 16.2 s |
| R5-bad-link:tutorial:spa       | ok      | 19          | 28        | 0           | 0   | 0     | 8.4 s  |
| R5-bad-link:tutorial:cold      | ok      | 64          | 73        | 0           | 0   | 0     | 9.9 s  |
| R5-bad-link:demo:spa           | ok      | 33          | 41        | 0           | 0   | 0     | 8.4 s  |
| R5-bad-link:demo:cold          | ok      | 73          | 81        | 0           | 0   | 0     | 9.3 s  |
| R5-bad-link:song:spa           | ok      | 33          | 41        | 0           | 0   | 0     | 8.4 s  |
| R5-bad-link:song:cold          | ok      | 73          | 81        | 0           | 0   | 0     | 9.4 s  |
| R5-bad-link:template:spa       | ok      | 33          | 41        | 0           | 0   | 0     | 13.5 s |
| R5-bad-link:template:cold      | ok      | 73          | 81        | 0           | 0   | 0     | 14.5 s |
| R5-bad-link:project:spa        | ok      | 19          | 28        | 0           | 0   | 0     | 13.5 s |
| R5-bad-link:project:cold       | ok      | 64          | 73        | 0           | 0   | 0     | 15 s   |
| R5-bad-link:practiceMode:spa   | ok      | 33          | 41        | 0           | 0   | 0     | 8.3 s  |
| R5-bad-link:practiceMode:cold  | ok      | 73          | 81        | 0           | 0   | 0     | 9.4 s  |
| R5-bad-link:practiceGenre:spa  | ok      | 33          | 41        | 0           | 0   | 0     | 8.3 s  |
| R5-bad-link:practiceGenre:cold | ok      | 73          | 81        | 0           | 0   | 0     | 9.3 s  |
| R6-synth-edit-refresh          | ok      | 1           | 1         | 0           | 0   | 0     | 16.6 s |
| R7-tab-close                   | ok      | 64          | 73        | 0           | 0   | 0     | 10 s   |

### R1-refresh-while-playing: Edit while playing, then refresh

Flags: autosave written during playback: no (goal: yes).

Checks: a chord written afterwards got id cr-1, which an existing chord already has.

- project: `harmony.keyColour`, `harmony.keyLock`, `markers`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `tracks[].audioClips[].bufferLoaded` (changed), `tracks[].audioClips[].pitchEdits`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9), `tracks[].volume` (changed), `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `tracks[].audioInputChannel` (lost ×2), `transport.countInBars`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab` (changed), `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`
- ids: `ids.newChordIdUnique` (changed)

### R2-spa-return: Editor → /studio → history.back()

Checks: a chord written afterwards got id cr-6 (unique).

- project: `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `prism.progression`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9), `tracks[].volume` (changed)
- per-user prefs: `tracks[].audioInputChannel` (lost ×2)
- view: `view.channelStripTab` (changed), `view.selectedClip`

### R3-cloud-save-open:legacy: File ▸ Save, then ?project= in a fresh context (legacy API)

Flags: "Project saved" shown: yes; the save uploaded the in-memory clip (POST /assets, signed PUT, finalize): yes.

Checks: saved through File ▸ Save; prism sent as {genre, rhythmName, rootNote, swing}; requests: GET /api/studio/projects 200, GET /api/studio/projects 200, GET /api/studio/assets/6603910a-686a-4300-977b-0e196aedb181/url 200, GET /download/6603910a-686a-4300-977b-0e196aedb181 200, POST /api/studio/projects 200, POST /api/studio/assets 200, PUT /upload/a87931b0-9f98-49bd-b837-cf3a6dd72e58 200, POST /api/studio/assets/a87931b0-9f98-49bd-b837-cf3a6dd72e58/finalize 200, POST /api/studio/assets/status 200, PUT /api/studio/projects/7ed3de8f-bf7d-42a2-a903-7861ecbd4a0e 200, GET /api/studio/projects 200; 0 of 9 track ids after the open are the server's row ids: the client mints its own on open (deserializeCloudProject), and the save sends no track or audio-clip id, so the id losses do not depend on how the mock keys rows; toasts: success "Project saved".

- project: `harmony.chordRegions`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `markers`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `tracks[].audioClips[].pitchEdits`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (changed ×2), `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `tracks[].audioInputChannel` (lost ×2), `tracks[].audioInputId`, `tracks[].midiInputId`, `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `tracks[].monitoring` (changed ×2), `tracks[].recordArmed` (changed ×2), `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab` (changed), `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`
- ids: `ids.audioClips` (changed), `ids.tracks` (changed)

### R3-cloud-save-open:document: File ▸ Save, then ?project= in a fresh context (document API)

skipped: mock Studio API mode "document" is the milestone 1.5 contract and is not implemented yet (milestone 1.5)

### R4-leak:new: In-app ?new=1 after the kitchen sink vs a cold boot

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `transport.timeSignature` (carried-over), `view.clipColorMode` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.currentView` (carried-over), `view.libraryOpen` (carried-over), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:template: In-app ?template=project-pop after the kitchen sink vs a cold boot

Checks: left out as volatile: harmony.rhythmName.

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.tilt` (carried-over), `transport.timeSignature` (carried-over), `view.clipColorMode` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.currentView` (carried-over), `view.libraryOpen` (carried-over), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:demo: In-app ?demo=demo-sunset-keys after the kitchen sink vs a cold boot

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `tracks[].color` (changed), `transport.timeSignature` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.currentView` (carried-over), `view.libraryOpen` (carried-over), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:tutorial: In-app ?tutorial=jazz-color-your-chords after the kitchen sink vs a cold boot

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `transport.timeSignature` (carried-over), `view.clipColorMode` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)

### R4-leak:song: In-app ?song=a_thousand_years after the kitchen sink vs a cold boot

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `harmony.rootNote`, `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `tracks[].color` (changed)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (changed), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:practiceMode: In-app ?practiceMode=dorian&practiceRoot=d after the kitchen sink vs a cold boot

- project: `harmony.keyLock` (carried-over), `harmony.rootNote`, `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `transport.timeSignature` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:practiceGenre: In-app ?practiceGenre=funk&practiceLevel=1&practiceSection=A after the kitchen sink vs a cold boot

Checks: left out as volatile: tracks[].midiClips[].events.

- project: `harmony.keyLock` (carried-over), `harmony.rootNote`, `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `transport.timeSignature` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R4-leak:jam: In-app ?jam=1 after the kitchen sink vs a cold boot

- project: `harmony.keyColour` (carried-over), `harmony.keyLock` (carried-over), `markers` (carried-over), `mixer.masteringAmount` (carried-over), `mixer.masteringBypass` (carried-over), `mixer.masteringDeEsser` (carried-over), `mixer.masteringDynamics` (carried-over), `mixer.masteringEffects` (carried-over), `mixer.masteringEq` (carried-over), `mixer.masteringFxChain` (carried-over), `mixer.masteringLoudness` (carried-over), `mixer.masteringPresence` (carried-over), `mixer.masteringStereoField` (carried-over), `mixer.masteringStyle` (carried-over), `mixer.masterVolume` (carried-over), `mixer.returns` (carried-over), `notation.leadSheetChordFormat` (carried-over), `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetShowMelody` (carried-over), `notation.leadSheetShowRepeats` (carried-over), `notation.scorePageBreaks` (carried-over), `notation.scoreSpellings` (changed), `notation.scoreSystemBreaks` (carried-over), `notation.scoreSystemRuns` (carried-over), `notation.scoreTextMarks` (carried-over), `prism.chordRecordMode` (carried-over), `prism.chordRulerShowNotes` (carried-over), `prism.filterPercent` (carried-over), `prism.strum` (carried-over), `prism.tilt` (carried-over), `tracks[].color` (changed ×3), `transport.timeSignature` (carried-over), `view.clipColorMode` (carried-over)
- per-user prefs: `transport.countInBars` (carried-over), `transport.loop` (carried-over), `transport.metronome` (carried-over)
- view: `view.activeTool` (carried-over), `view.automationLane` (changed), `view.channelStripTab` (changed), `view.currentView` (carried-over), `view.libraryOpen` (carried-over), `view.timelineGrid` (carried-over), `view.timelineScrollLeft` (carried-over), `view.timelineZoom` (carried-over)
- lesson/practice context: `context.tutorial` (carried-over)

### R5-bad-link:tutorial:spa: ?tutorial=bogus-id (in-app) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: yes.

Checks: toasts: error "That lesson could not be found."; a chord written afterwards got id cr-6 (unique).

- project: `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `prism.progression`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9)
- per-user prefs: `tracks[].audioInputChannel` (lost ×2)
- view: `view.channelStripTab` (changed), `view.selectedClip`

### R5-bad-link:tutorial:cold: ?tutorial=bogus-id (full page load) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: yes.

Checks: toasts: error "That lesson could not be found."; a chord written afterwards got id cr-1, which an existing chord already has.

- project: `harmony.keyColour`, `harmony.keyLock`, `markers`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `tracks[].audioClips[].bufferLoaded` (changed), `tracks[].audioClips[].pitchEdits`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9), `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `tracks[].audioInputChannel` (lost ×2), `transport.countInBars`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab` (changed), `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`
- ids: `ids.newChordIdUnique` (changed)

### R5-bad-link:demo:spa: ?demo=bogus-id (in-app) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That demo could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `mixer.masterAutomation`, `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings` (changed), `prism.progression`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`
- session: `transport.position`
- view: `view.automationLane` (changed), `view.channelStripTab` (changed), `view.selectedClip`, `view.selectedTrack`
- lesson/practice context: `context.practiceSession`

### R5-bad-link:demo:cold: ?demo=bogus-id (full page load) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That demo could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `markers`, `mixer.masterAutomation`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `mixer.returns`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`, `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab`, `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`

### R5-bad-link:song:spa: ?song=bogus-id (in-app) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That song could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `mixer.masterAutomation`, `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings` (changed), `prism.progression`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`
- session: `transport.position`
- view: `view.automationLane` (changed), `view.channelStripTab` (changed), `view.selectedClip`, `view.selectedTrack`
- lesson/practice context: `context.practiceSession`

### R5-bad-link:song:cold: ?song=bogus-id (full page load) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That song could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `markers`, `mixer.masterAutomation`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `mixer.returns`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`, `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab`, `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`

### R5-bad-link:template:spa: ?template=bogus-id (in-app) after the kitchen sink

Flags: an error was shown: no (goal: yes); crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: none.

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `mixer.masterAutomation`, `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings` (changed), `prism.progression`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`
- session: `transport.position`
- view: `view.automationLane` (changed), `view.channelStripTab` (changed), `view.selectedClip`, `view.selectedTrack`
- lesson/practice context: `context.practiceSession`

### R5-bad-link:template:cold: ?template=bogus-id (full page load) after the kitchen sink

Flags: an error was shown: no (goal: yes); crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: none.

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `markers`, `mixer.masterAutomation`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `mixer.returns`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`, `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab`, `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`

### R5-bad-link:project:spa: ?project=00000000-0000-4000-8000-00000000dead (in-app) after the kitchen sink

Flags: an error was shown: no (goal: yes); crash copy (the autosave) kept: yes.

Checks: toasts: none; a chord written afterwards got id cr-6 (unique).

- project: `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `prism.progression`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9)
- per-user prefs: `tracks[].audioInputChannel` (lost ×2)
- view: `view.channelStripTab` (changed), `view.selectedClip`

### R5-bad-link:project:cold: ?project=00000000-0000-4000-8000-00000000dead (full page load) after the kitchen sink

Flags: an error was shown: no (goal: yes); crash copy (the autosave) kept: yes.

Checks: toasts: none; a chord written afterwards got id cr-1, which an existing chord already has.

- project: `harmony.keyColour`, `harmony.keyLock`, `markers`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `tracks[].audioClips[].bufferLoaded` (changed), `tracks[].audioClips[].pitchEdits`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9), `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `tracks[].audioInputChannel` (lost ×2), `transport.countInBars`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab` (changed), `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`
- ids: `ids.newChordIdUnique` (changed)

### R5-bad-link:practiceMode:spa: ?practiceMode=bogus-id&practiceRoot=d (in-app) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That practice track mode could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `mixer.masterAutomation`, `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings` (changed), `prism.progression`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`
- session: `transport.position`
- view: `view.automationLane` (changed), `view.channelStripTab` (changed), `view.selectedClip`, `view.selectedTrack`
- lesson/practice context: `context.practiceSession`

### R5-bad-link:practiceMode:cold: ?practiceMode=bogus-id&practiceRoot=d (full page load) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That practice track mode could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `markers`, `mixer.masterAutomation`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `mixer.returns`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`, `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab`, `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`

### R5-bad-link:practiceGenre:spa: ?practiceGenre=bogus-id&practiceLevel=1&practiceSection=A (in-app) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That practice track could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `mixer.masterAutomation`, `notation.leadSheetMelodyTrack` (changed), `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings` (changed), `prism.progression`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`
- session: `transport.position`
- view: `view.automationLane` (changed), `view.channelStripTab` (changed), `view.selectedClip`, `view.selectedTrack`
- lesson/practice context: `context.practiceSession`

### R5-bad-link:practiceGenre:cold: ?practiceGenre=bogus-id&practiceLevel=1&practiceSection=A (full page load) after the kitchen sink

Flags: an error was shown: yes; crash copy (the autosave) kept: no (goal: yes).

Checks: toasts: error "That practice track could not be found.".

- project: `harmony.chordRegions`, `harmony.genre`, `harmony.keyColour`, `harmony.keyLock`, `harmony.mode`, `harmony.rhythmName`, `harmony.rootNote`, `harmony.swing`, `markers`, `mixer.masterAutomation`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `mixer.returns`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `project.composer`, `project.name`, `tracks.count`, `tracks[] (whole track)` (lost ×9), `transport.bpm`, `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `transport.countInBars`, `transport.loop`, `transport.metronome`
- session: `transport.position`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab`, `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`

### R6-synth-edit-refresh: A synth-only edit, then refresh (the patch alone is compared)

Flags: autosave written after the synth edit: no (goal: yes).

- project: `tracks[].synthPatch` (changed)

### R7-tab-close: An edit, the tab closes inside the debounce, a new tab opens

Flags: autosave written as the tab closed: no (goal: yes).

Checks: the tab closed 28 ms after the edit.

- project: `harmony.keyColour`, `harmony.keyLock`, `markers`, `mixer.masteringAmount`, `mixer.masteringBypass`, `mixer.masteringDeEsser`, `mixer.masteringDynamics`, `mixer.masteringEffects`, `mixer.masteringEq`, `mixer.masteringFxChain`, `mixer.masteringLoudness`, `mixer.masteringPresence`, `mixer.masteringStereoField`, `mixer.masteringStyle`, `mixer.masterVolume`, `notation.leadSheetChordFormat`, `notation.leadSheetMelodyTrack`, `notation.leadSheetRepeats`, `notation.leadSheetSections`, `notation.leadSheetShowMelody`, `notation.leadSheetShowRepeats`, `notation.measureFermatas`, `notation.measureRestMap`, `notation.measureRowSizes`, `notation.measuresPerLine`, `notation.melodyOverrides`, `notation.scoreArticulations`, `notation.scoreChordHidden`, `notation.scoreChordTracks`, `notation.scorePageBreaks`, `notation.scoreSlashNotes`, `notation.scoreSlurs`, `notation.scoreSpellings`, `notation.scoreSystemBreaks`, `notation.scoreSystemRuns`, `notation.scoreTextMarks`, `prism.chordRecordMode`, `prism.chordRulerShowNotes`, `prism.filterPercent`, `prism.progression`, `prism.strum`, `prism.tilt`, `tracks[].audioClips[].bufferLoaded` (changed), `tracks[].audioClips[].pitchEdits`, `tracks[].midiClips[].ccEvents`, `tracks[].midiClips[].durationTicks`, `tracks[].trackRole` (lost ×9), `tracks[].volume` (changed), `transport.timeSignature`, `view.clipColorMode`
- per-user prefs: `tracks[].audioInputChannel` (lost ×2), `transport.countInBars`
- view: `view.activeTool`, `view.automationLane`, `view.channelStripTab` (changed), `view.currentView`, `view.libraryOpen`, `view.selectedClip`, `view.selectedTrack`, `view.timelineGrid`, `view.timelineScrollLeft`, `view.timelineZoom`
- lesson/practice context: `context.practiceSession`, `context.tutorial`
