# Studio checks (full tier)

| Suite        | Result | Time  |
| ------------ | ------ | ----- |
| unit         | pass   | 3 s   |
| roundtrip    | pass   | 348 s |
| lessons      | pass   | 437 s |
| perf         | FAIL   | 419 s |
| golden       | pass   | 44 s  |
| golden-trace | pass   | 34 s  |
| bundle       | pass   | 36 s  |

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

# Studio lesson walkthrough

Every lesson in `src/daw/components/Tutorial/tutorials.ts`, step by step, as the editor behaves today (milestone 1.0 baseline: problems are recorded, not fixed). Written by `scripts/studio-perf/lessons.mjs` on 2026-10-07T01:08:07.888Z at commit `f96b3ecc` (studio/stage-a-1.0, with uncommitted changes under src), against http://localhost:5263, in Chrome 153.0.8010.12 (GPU: metal, audio at 44100 Hz), as the dev bypass's premium user and as a free student (the bypass user served a free subscription, so Prism is locked).

A step passes when its anchor (the first id of its `target` list that is in the DOM) is on screen, inside the window, not clipped and not covered, when its driver can do what the step asks, and when the store's `tutorialStepIndex` then advances. The JSON report beside this file has every measurement; shots/ has a screenshot of each failing step.

Driver: `click` is a real click (or menu pick) on or in the anchor, `select` an option picked in a `<select>`, `store` an action on the editor or synth store standing in for a drag, `next` the coach card’s Next button, `none` nothing (the step’s own preconditions satisfy it). Advanced: the time from the driver’s last action to the next step; a validated step waits 950 ms for its confetti first.

**Result: pass.** 80/116 steps pass (6 with warnings), 16/16 lessons complete. 36 failing step(s) are known (KNOWN_FAILURES in `scripts/studio-perf/lessonDrivers.mjs`, 27 entries).

## chromebook (1366×655, 4× CPU), premium

Idle for 3 s in the same empty editor without a lesson, once quiet: 599.72 rAF calls/s, 0 commits/s, frame p95 16.7 ms. The table's idle column is the same measure with the lesson open on step 1.

| Lesson                        | Steps | Pass | Fail | Completed | Idle on step 1                                     | Time   |
| ----------------------------- | ----- | ---- | ---- | --------- | -------------------------------------------------- | ------ |
| `make-first-track`            | 8     | 8    | 0    | yes       | 659.38 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 19.8 s |
| `jazz-color-your-chords`      | 8     | 8    | 0    | yes       | 659.65 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 22.6 s |
| `hiphop-build-the-beat`       | 7     | 7    | 0    | yes       | 659.32 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 18.2 s |
| `pop-flip-a-sample`           | 4     | 4    | 0    | yes       | 659.8 rAF calls/s, 0 commits/s, frame p95 16.8 ms  | 14.2 s |
| `edm-design-the-drop`         | 11    | 10   | 1    | yes       | 659.76 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 25.2 s |
| `house-make-it-pump`          | 5     | 4    | 1    | yes       | 659.76 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 16.5 s |
| `rnb-mix-and-polish`          | 11    | 6    | 5    | yes       | 659.38 rAF calls/s, 0 commits/s, frame p95 16.8 ms | 54.7 s |
| `indie-movement-and-dynamics` | 4     | 2    | 2    | yes       | 659.56 rAF calls/s, 0 commits/s, frame p95 16.7 ms | 16.5 s |

| Console or page error                                                                                                                                             | Lessons |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Failed to list cloud projects Error: GET /api/studio/projects failed (401): Invalid Compact JWS                                                                   | all 8   |
| Failed to load resource: the server responded with a status of 401 ()                                                                                             | all 8   |
| Warning: Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See /link/unsafe-component-lifecycles for details. | all 8   |

### Make your first track (`make-first-track`)

| #   | Step         | Anchor                                              | Driver | Advanced               | Result              |
| --- | ------------ | --------------------------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-track`  | `add-track-button`: visible                         | click  | after 0.1 s            | pass                |
| 2   | `open-prism` | `chanstrip-tab-prism`: covered while the card moved | none   | by itself after 351 ms | pass, with warnings |
| 3   | `pick-key`   | `prism-key`: visible                                | click  | after 1.0 s            | pass                |
| 4   | `add-chords` | `prism-chord-selection`: visible                    | click  | after 1.0 s            | pass                |
| 5   | `pick-genre` | `prism-style`: visible                              | click  | after 1.0 s            | pass                |
| 6   | `add-swing`  | `prism-rhythm`: visible                             | store  | after 1.0 s            | pass                |
| 7   | `experiment` | `prism-rhythm`: visible                             | next   | after 0.0 s            | pass                |
| 8   | `create`     | `prism-create`: visible                             | click  | after 1.1 s            | pass                |

- **open-prism** warning: while it was up, the anchor chanstrip-tab-prism: it is covered at 9/9 points (its centre among them) by the coach card
- **open-prism** warning: it advanced by itself 351 ms after it began, so its copy cannot be read
- **add-swing** note: Swing was already 40 (past 20) when the step began

### Jazz — Color your chords (`jazz-color-your-chords`)

| #   | Step            | Anchor                           | Driver | Advanced    | Result |
| --- | --------------- | -------------------------------- | ------ | ----------- | ------ |
| 1   | `select-track`  | `add-track-button`: visible      | click  | after 0.1 s | pass   |
| 2   | `genre-jazz`    | `prism-style`: visible           | click  | after 1.0 s | pass   |
| 3   | `mode-dorian`   | `prism-key`: visible             | click  | after 1.0 s | pass   |
| 4   | `seventh-chord` | `prism-chord-selection`: visible | click  | after 1.0 s | pass   |
| 5   | `four-chords`   | `prism-chord-selection`: visible | click  | after 1.0 s | pass   |
| 6   | `jazz-rhythm`   | `prism-rhythm`: visible          | select | after 1.0 s | pass   |
| 7   | `swing`         | `prism-rhythm`: visible          | store  | after 1.0 s | pass   |
| 8   | `create`        | `prism-create`: visible          | click  | after 1.1 s | pass   |

- **jazz-rhythm** note: Rhythm Pattern was "Jazz 2b" when the step began
- **swing** note: Swing was already 40 (past 25) when the step began

### Hip Hop — Build the beat (`hiphop-build-the-beat`)

| #   | Step             | Anchor                            | Driver | Advanced               | Result              |
| --- | ---------------- | --------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-drums`      | `add-track-button`: visible       | click  | after 0.8 s            | pass                |
| 2   | `open-sequencer` | `chanstrip-tab-controls`: visible | none   | by itself after 313 ms | pass, with warnings |
| 3   | `swap-kit`       | `drum-kit-selector`: visible      | click  | after 1.0 s            | pass                |
| 4   | `program-hits`   | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |
| 5   | `slow-bpm`       | `transport-bpm`: visible          | store  | after 1.1 s            | pass                |
| 6   | `load-groove`    | `grooves-browser`: visible        | click  | after 1.1 s            | pass                |
| 7   | `pad-mix`        | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |

- **open-sequencer** warning: it advanced by itself 313 ms after it began, so its copy cannot be read
- **load-groove** note: A "Change Project BPM?" dialog asked to undo the BPM the lesson just set; chose Add Anyway

### Pop — Flip a sample (`pop-flip-a-sample`)

| #   | Step           | Anchor                              | Driver | Advanced    | Result |
| --- | -------------- | ----------------------------------- | ------ | ----------- | ------ |
| 1   | `add-chops`    | `add-track-button`: visible         | click  | after 0.9 s | pass   |
| 2   | `load-sample`  | `sampler-dropzone`: visible         | click  | after 1.1 s | pass   |
| 3   | `play-notes`   | `chanstrip-tab-piano-roll`: visible | store  | after 1.0 s | pass   |
| 4   | `space-it-out` | `fx-add-delay`: visible             | click  | after 0.9 s | pass   |

### EDM — Design the drop (`edm-design-the-drop`)

| #   | Step           | Anchor                                                 | Driver | Advanced               | Result              |
| --- | -------------- | ------------------------------------------------------ | ------ | ---------------------- | ------------------- |
| 1   | `add-synth`    | `add-track-button`: visible                            | click  | after 0.1 s            | pass                |
| 2   | `open-synth`   | `chanstrip-tab-controls`: covered while the card moved | none   | by itself after 316 ms | pass, with warnings |
| 3   | `load-wobble`  | `synth-preset-selector`: visible                       | store  | after 1.0 s            | pass                |
| 4   | `tweak-wobble` | `chanstrip-tab-piano-roll`: visible                    | next   | after 0.0 s            | pass                |
| 5   | `genre-edm`    | `prism-style`: visible                                 | click  | after 1.0 s            | pass                |
| 6   | `minor-mode`   | `prism-key`: visible                                   | click  | after 1.0 s            | pass                |
| 7   | `riff-chords`  | `prism-harmony`: visible                               | click  | after 1.0 s            | pass                |
| 8   | `create`       | `prism-create`: visible                                | click  | after 1.1 s            | pass                |
| 9   | `saturate`     | `fx-add-saturator`: NOT visible (clipped)              | click  | after 0.9 s            | FAIL (known)        |
| 10  | `add-ott`      | `fx-add-multiband`: visible                            | click  | after 1.0 s            | pass                |
| 11  | `push-depth`   | `fx-slot-multiband`: visible                           | store  | after 1.0 s            | pass                |

- **open-synth** warning: while it was up, the anchor chanstrip-tab-controls: it is covered at 9/9 points (its centre among them) by the coach card
- **open-synth** warning: it advanced by itself 316 ms after it began, so its copy cannot be read
- **saturate** fails: anchor fx-add-saturator: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **saturate** is a known failure: practice-tutorial-20: fx-add-saturator is scrolled out of the dock’s FX list, so the spotlight points below the list

### House — Make it pump (`house-make-it-pump`)

| #   | Step           | Anchor                                 | Driver | Advanced    | Result       |
| --- | -------------- | -------------------------------------- | ------ | ----------- | ------------ |
| 1   | `add-drums`    | `add-track-button`: visible            | click  | after 0.7 s | pass         |
| 2   | `add-bass`     | `add-track-button`: visible            | click  | after 0.0 s | pass         |
| 3   | `add-ducker`   | `fx-add-ducker`: NOT visible (clipped) | click  | after 1.0 s | FAIL (known) |
| 4   | `set-key`      | `ducker-key-select`: visible           | select | after 1.0 s | pass         |
| 5   | `raise-amount` | `fx-slot-ducker`: visible              | store  | after 1.0 s | pass         |

- **add-ducker** fails: anchor fx-add-ducker: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **add-ducker** is a known failure: practice-tutorial-20: fx-add-ducker is scrolled out of the dock’s FX list, so the spotlight points below the list

### R&B — Mix & polish (`rnb-mix-and-polish`)

| #   | Step             | Anchor                                  | Driver | Advanced                          | Result       |
| --- | ---------------- | --------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`   | `add-track-button`: visible             | click  | after 0.1 s                       | pass         |
| 2   | `genre-rnb`      | `prism-style`: visible                  | click  | after 1.0 s                       | pass         |
| 3   | `add-reverb`     | `fx-add-reverb`: visible                | click  | after 0.9 s                       | pass         |
| 4   | `tweak-reverb`   | `fx-slot-reverb`: visible               | click  | after 1.0 s                       | pass         |
| 5   | `goto-master`    | `view-switch-studio`: visible           | click  | after 0.9 s                       | pass         |
| 6   | `balance-fader`  | `mixer-section`: NOT visible (empty)    | store  | after 1.0 s                       | FAIL (known) |
| 7   | `use-send`       | `mixer-sends-A`: NOT visible (clipped)  | store  | after 1.0 s                       | FAIL (known) |
| 8   | `tweak-return`   | `return-strip-A`: NOT visible (clipped) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 9   | `mastering-fx`   | `fx-add-compressor`: visible            | click  | after 0.9 s                       | pass         |
| 10  | `master-volume`  | `master-strip`: NOT visible (clipped)   | store  | after 1.0 s                       | FAIL (known) |
| 11  | `bounce-mixdown` | `file-menu`: visible                    | click  | only through its fallback (2.3 s) | FAIL (known) |

- **balance-fader** fails: anchor mixer-section: its box is empty (nothing drawn on screen) (see ia-flows-12, fx-mixer-04)
- **balance-fader** is a known failure: ia-flows-12, fx-mixer-04: mixer-section has a 0 px tall box in MASTER at 1366×655
- **use-send** fails: anchor mixer-sends-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA0B0SynthReturn AReverb1 FXR" (scrolls) (see ia-flows-12, fx-mixer-04, fx-mixer-14)
- **use-send** is a known failure: ia-flows-12, fx-mixer-04: mixer-sends-A is cut off by the scrolling strips row (none of it shows at 1366×655, 31% at 1280×720)
- **tweak-return** fails: anchor return-strip-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: click "Return A" label failed: locator.click: Timeout 10000ms exceeded. — &lt;div class="flex shrink-0 flex-col" data-tutorial-id="mastering-section"&gt;…&lt;/div&gt; intercepts pointer events (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: it did not advance (its check is false in the page) (see ia-flows-12, fx-mixer-04)
- **tweak-return** is a known failure: ia-flows-12, fx-mixer-04: return-strip-A is cut off by the scrolling strips row (none of it shows at 1366×655, where mastering-section also takes the click on its label; 75% at 1280×720)
- **tweak-return**: went on through its driver’s fallback
- **master-volume** fails: anchor master-strip: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **master-volume** is a known failure: ia-flows-12, fx-mixer-04: master-strip is cut off by the scrolling strips row
- **bounce-mixdown** fails: click Export Audio… failed: locator.click: Timeout 10000ms exceeded. — &lt;div&gt;…&lt;/div&gt; from &lt;div aria-hidden="true" data-aria-hidden="true"&gt;…&lt;/div&gt; subtree intercepts pointer events (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** fails: it did not advance (its check is false in the page) (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** is a known failure: new (nearest practice-tutorial-18): the coach card covers File &gt; Export Audio…, so the click on it times out
- **bounce-mixdown** warning: then file-export-audio: it is covered at 9/9 points (its centre among them) by the coach card
- **bounce-mixdown**: went on through its driver’s fallback

### Indie — Movement & dynamics (`indie-movement-and-dynamics`)

| #   | Step              | Anchor                                     | Driver | Advanced    | Result       |
| --- | ----------------- | ------------------------------------------ | ------ | ----------- | ------------ |
| 1   | `open-automation` | `automation-toggle`: NOT visible (missing) | click  | after 0.9 s | FAIL (known) |
| 2   | `draw-volume`     | `automation-lane`: NOT visible (covered)   | click  | after 1.0 s | FAIL (known) |
| 3   | `hear-it`         | `automation-lane`: visible                 | store  | after 1.0 s | pass         |
| 4   | `second-lane`     | `automation-param-select`: visible         | click  | after 0.9 s | pass         |

- **open-automation** fails: anchor automation-toggle: none of automation-toggle is in the DOM
- **open-automation** fails: The lesson opens in an empty session and its first step asks to pick a track, but there is no track and no step adds one, so there is no automation button
- **open-automation** is a known failure: new: ?tutorial= boots an empty session and no step adds a track, so there is no automation button to click
- **draw-volume** fails: anchor automation-lane: it is covered at 3/9 points by the coach card
- **draw-volume** is a known failure: new (nearest practice-tutorial-18): the coach card is clamped back over the wide automation lane

## chromebook (1366×655, 4× CPU), free

| Lesson                        | Steps | Pass | Fail | Completed | Idle on step 1 | Time   |
| ----------------------------- | ----- | ---- | ---- | --------- | -------------- | ------ |
| `make-first-track`            | 8     | 2    | 6    | yes       |                | 40.5 s |
| `jazz-color-your-chords`      | 8     | 1    | 7    | yes       |                | 52.1 s |
| `hiphop-build-the-beat`       | 7     | 7    | 0    | yes       |                | 13.8 s |
| `pop-flip-a-sample`           | 4     | 4    | 0    | yes       |                | 9.8 s  |
| `edm-design-the-drop`         | 11    | 6    | 5    | yes       |                | 45.0 s |
| `house-make-it-pump`          | 5     | 4    | 1    | yes       |                | 12.3 s |
| `rnb-mix-and-polish`          | 11    | 5    | 6    | yes       |                | 56.2 s |
| `indie-movement-and-dynamics` | 4     | 2    | 2    | yes       |                | 11.5 s |

| Console or page error                                                                                                                                             | Lessons |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Failed to list cloud projects Error: GET /api/studio/projects failed (401): Invalid Compact JWS                                                                   | all 8   |
| Failed to load resource: the server responded with a status of 401 ()                                                                                             | all 8   |
| Warning: Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See /link/unsafe-component-lifecycles for details. | all 8   |

### Make your first track (`make-first-track`)

| #   | Step         | Anchor                                                  | Driver | Advanced                          | Result              |
| --- | ------------ | ------------------------------------------------------- | ------ | --------------------------------- | ------------------- |
| 1   | `add-track`  | `add-track-button`: visible                             | click  | after 0.1 s                       | pass                |
| 2   | `open-prism` | `chanstrip-tab-prism`: covered while the card moved     | none   | by itself after 359 ms            | pass, with warnings |
| 3   | `pick-key`   | `prism-key`: NOT visible (clipped, covered)             | click  | only through its fallback (1.1 s) | FAIL (known)        |
| 4   | `add-chords` | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 5   | `pick-genre` | `prism-style`: NOT visible (clipped, covered)           | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 6   | `add-swing`  | `prism-rhythm`: NOT visible (clipped, covered)          | store  | after 1.0 s                       | FAIL (known)        |
| 7   | `experiment` | `prism-rhythm`: NOT visible (clipped, covered)          | next   | after 0.0 s                       | FAIL (known)        |
| 8   | `create`     | `prism-create`: NOT visible (covered)                   | click  | only through its fallback (1.1 s) | FAIL (known)        |

- **open-prism** warning: while it was up, the anchor chanstrip-tab-prism: it is covered at 9/9 points (its centre among them) by the coach card
- **open-prism** warning: it advanced by itself 359 ms after it began, so its copy cannot be read
- **pick-key** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see prism-ui-03)
- **pick-key** fails: click G slice failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see prism-ui-03)
- **pick-key** fails: it did not advance (its check is false in the page) (see prism-ui-03)
- **pick-key** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **pick-key**: went on through its driver’s fallback
- **add-chords** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **add-chords** fails: click chord "1 major" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **add-chords** fails: it did not advance (its check is false in the page)
- **add-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **add-chords**: went on through its driver’s fallback
- **pick-genre** fails: anchor prism-style: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **pick-genre** fails: click Jazz pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **pick-genre** fails: it did not advance (its check is false in the page)
- **pick-genre** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **pick-genre**: went on through its driver’s fallback
- **add-swing** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **add-swing** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **add-swing** note: Swing was already 40 (past 20) when the step began
- **experiment** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianClearChord Sel" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **experiment** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback

### Jazz — Color your chords (`jazz-color-your-chords`)

| #   | Step            | Anchor                                                  | Driver | Advanced                          | Result       |
| --- | --------------- | ------------------------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`  | `add-track-button`: visible                             | click  | after 0.1 s                       | pass         |
| 2   | `genre-jazz`    | `prism-style`: NOT visible (clipped, covered)           | click  | only through its fallback (1.0 s) | FAIL (known) |
| 3   | `mode-dorian`   | `prism-key`: NOT visible (clipped, covered)             | click  | only through its fallback (1.0 s) | FAIL (known) |
| 4   | `seventh-chord` | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 5   | `four-chords`   | `prism-chord-selection`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 6   | `jazz-rhythm`   | `prism-rhythm`: NOT visible (clipped, covered)          | select | only through its fallback (1.0 s) | FAIL (known) |
| 7   | `swing`         | `prism-rhythm`: NOT visible (clipped, covered)          | store  | after 1.0 s                       | FAIL (known) |
| 8   | `create`        | `prism-create`: NOT visible (covered)                   | click  | only through its fallback (1.1 s) | FAIL (known) |

- **genre-jazz** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-jazz** fails: click Jazz pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-jazz** fails: it did not advance (its check is false in the page)
- **genre-jazz** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-jazz**: went on through its driver’s fallback
- **mode-dorian** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-20)
- **mode-dorian** fails: click mode menu failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see practice-tutorial-20)
- **mode-dorian** fails: it did not advance (its check is false in the page) (see practice-tutorial-20)
- **mode-dorian** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **mode-dorian**: went on through its driver’s fallback
- **seventh-chord** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **seventh-chord** fails: click chord "1 major7" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **seventh-chord** fails: it did not advance (its check is false in the page)
- **seventh-chord** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **seventh-chord**: went on through its driver’s fallback
- **four-chords** fails: anchor prism-chord-selection: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **four-chords** fails: click chord "1 dominant7" failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **four-chords** fails: it did not advance (its check is false in the page)
- **four-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **four-chords**: went on through its driver’s fallback
- **jazz-rhythm** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **jazz-rhythm** fails: pick "Jazz 1" in Rhythm Pattern failed: "Jazz 1" in Rhythm Pattern: &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;&lt;div class="flex flex-col items-cente is on top of the menu (see practice-tutorial-14)
- **jazz-rhythm** fails: it did not advance (its check is false in the page) (see practice-tutorial-14)
- **jazz-rhythm** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **jazz-rhythm** note: Rhythm Pattern was "Jazz 6" when the step began
- **jazz-rhythm**: went on through its driver’s fallback
- **swing** fails: anchor prism-rhythm: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FDorianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-14)
- **swing** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **swing** note: Swing was already 40 (past 25) when the step began
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback

### Hip Hop — Build the beat (`hiphop-build-the-beat`)

| #   | Step             | Anchor                            | Driver | Advanced               | Result              |
| --- | ---------------- | --------------------------------- | ------ | ---------------------- | ------------------- |
| 1   | `add-drums`      | `add-track-button`: visible       | click  | after 0.9 s            | pass                |
| 2   | `open-sequencer` | `chanstrip-tab-controls`: visible | none   | by itself after 312 ms | pass, with warnings |
| 3   | `swap-kit`       | `drum-kit-selector`: visible      | click  | after 1.0 s            | pass                |
| 4   | `program-hits`   | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |
| 5   | `slow-bpm`       | `transport-bpm`: visible          | store  | after 1.0 s            | pass                |
| 6   | `load-groove`    | `grooves-browser`: visible        | click  | after 1.1 s            | pass                |
| 7   | `pad-mix`        | `drum-machine-view`: visible      | store  | after 1.0 s            | pass                |

- **open-sequencer** warning: it advanced by itself 312 ms after it began, so its copy cannot be read
- **load-groove** note: A "Change Project BPM?" dialog asked to undo the BPM the lesson just set; chose Add Anyway

### Pop — Flip a sample (`pop-flip-a-sample`)

| #   | Step           | Anchor                              | Driver | Advanced    | Result |
| --- | -------------- | ----------------------------------- | ------ | ----------- | ------ |
| 1   | `add-chops`    | `add-track-button`: visible         | click  | after 0.9 s | pass   |
| 2   | `load-sample`  | `sampler-dropzone`: visible         | click  | after 1.0 s | pass   |
| 3   | `play-notes`   | `chanstrip-tab-piano-roll`: visible | store  | after 1.0 s | pass   |
| 4   | `space-it-out` | `fx-add-delay`: visible             | click  | after 1.0 s | pass   |

### EDM — Design the drop (`edm-design-the-drop`)

| #   | Step           | Anchor                                                 | Driver | Advanced                          | Result              |
| --- | -------------- | ------------------------------------------------------ | ------ | --------------------------------- | ------------------- |
| 1   | `add-synth`    | `add-track-button`: visible                            | click  | after 0.1 s                       | pass                |
| 2   | `open-synth`   | `chanstrip-tab-controls`: covered while the card moved | none   | by itself after 314 ms            | pass, with warnings |
| 3   | `load-wobble`  | `synth-preset-selector`: visible                       | store  | after 1.0 s                       | pass                |
| 4   | `tweak-wobble` | `chanstrip-tab-piano-roll`: visible                    | next   | after 0.0 s                       | pass                |
| 5   | `genre-edm`    | `prism-style`: NOT visible (clipped, covered)          | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 6   | `minor-mode`   | `prism-key`: NOT visible (clipped, covered)            | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 7   | `riff-chords`  | `prism-harmony`: NOT visible (clipped, covered)        | click  | only through its fallback (1.0 s) | FAIL (known)        |
| 8   | `create`       | `prism-create`: NOT visible (covered)                  | click  | only through its fallback (1.1 s) | FAIL (known)        |
| 9   | `saturate`     | `fx-add-saturator`: NOT visible (clipped)              | click  | after 1.0 s                       | FAIL (known)        |
| 10  | `add-ott`      | `fx-add-multiband`: visible                            | click  | after 1.0 s                       | pass                |
| 11  | `push-depth`   | `fx-slot-multiband`: visible                           | store  | after 1.0 s                       | pass                |

- **open-synth** warning: while it was up, the anchor chanstrip-tab-controls: it is covered at 9/9 points (its centre among them) by the coach card
- **open-synth** warning: it advanced by itself 314 ms after it began, so its copy cannot be read
- **genre-edm** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-edm** fails: click EDM pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-edm** fails: it did not advance (its check is false in the page)
- **genre-edm** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-edm**: went on through its driver’s fallback
- **minor-mode** fails: anchor prism-key: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20 (see practice-tutorial-20)
- **minor-mode** fails: click mode menu failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events (see practice-tutorial-20)
- **minor-mode** fails: it did not advance (its check is false in the page) (see practice-tutorial-20)
- **minor-mode** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **minor-mode**: went on through its driver’s fallback
- **riff-chords** fails: anchor prism-harmony: only 53% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FAeolianChord Selecti" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20; div.flex.flex-col.items-center
- **riff-chords** fails: click a colour in the spectrum failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **riff-chords** fails: it did not advance (its check is false in the page)
- **riff-chords** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **riff-chords**: went on through its driver’s fallback
- **create** fails: anchor prism-create: it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **create** fails: click prism-create failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **create** fails: it did not advance (its check is false in the page)
- **create** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **create**: went on through its driver’s fallback
- **saturate** fails: anchor fx-add-saturator: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **saturate** is a known failure: practice-tutorial-20: fx-add-saturator is scrolled out of the dock’s FX list, so the spotlight points below the list

### House — Make it pump (`house-make-it-pump`)

| #   | Step           | Anchor                                 | Driver | Advanced    | Result       |
| --- | -------------- | -------------------------------------- | ------ | ----------- | ------------ |
| 1   | `add-drums`    | `add-track-button`: visible            | click  | after 0.9 s | pass         |
| 2   | `add-bass`     | `add-track-button`: visible            | click  | after 0.0 s | pass         |
| 3   | `add-ducker`   | `fx-add-ducker`: NOT visible (clipped) | click  | after 1.0 s | FAIL (known) |
| 4   | `set-key`      | `ducker-key-select`: visible           | select | after 1.0 s | pass         |
| 5   | `raise-amount` | `fx-slot-ducker`: visible              | store  | after 1.0 s | pass         |

- **add-ducker** fails: anchor fx-add-ducker: only 0% of it shows: cut by div.flex-1.overflow-y-auto "AudioCompressorGateEQReverbDelayPresence" (scrolls)
- **add-ducker** is a known failure: practice-tutorial-20: fx-add-ducker is scrolled out of the dock’s FX list, so the spotlight points below the list

### R&B — Mix & polish (`rnb-mix-and-polish`)

| #   | Step             | Anchor                                        | Driver | Advanced                          | Result       |
| --- | ---------------- | --------------------------------------------- | ------ | --------------------------------- | ------------ |
| 1   | `select-track`   | `add-track-button`: visible                   | click  | after 0.1 s                       | pass         |
| 2   | `genre-rnb`      | `prism-style`: NOT visible (clipped, covered) | click  | only through its fallback (1.0 s) | FAIL (known) |
| 3   | `add-reverb`     | `fx-add-reverb`: visible                      | click  | after 0.9 s                       | pass         |
| 4   | `tweak-reverb`   | `fx-slot-reverb`: visible                     | click  | after 1.0 s                       | pass         |
| 5   | `goto-master`    | `view-switch-studio`: visible                 | click  | after 1.0 s                       | pass         |
| 6   | `balance-fader`  | `mixer-section`: NOT visible (empty)          | store  | after 1.0 s                       | FAIL (known) |
| 7   | `use-send`       | `mixer-sends-A`: NOT visible (clipped)        | store  | after 1.0 s                       | FAIL (known) |
| 8   | `tweak-return`   | `return-strip-A`: NOT visible (clipped)       | click  | only through its fallback (1.1 s) | FAIL (known) |
| 9   | `mastering-fx`   | `fx-add-compressor`: visible                  | click  | after 1.0 s                       | pass         |
| 10  | `master-volume`  | `master-strip`: NOT visible (clipped)         | store  | after 1.0 s                       | FAIL (known) |
| 11  | `bounce-mixdown` | `file-menu`: visible                          | click  | only through its fallback (2.1 s) | FAIL (known) |

- **genre-rnb** fails: anchor prism-style: only 49% of it shows: cut by div.overflow-y-auto "KeyCGDAEBF♯D♭A♭E♭B♭FIonianChord Selectio" (scrolls); it is covered at 9/9 points (its centre among them) by div.absolute.inset-0.z-20
- **genre-rnb** fails: click R&B pill failed: locator.click: Timeout 3000ms exceeded. — &lt;div class="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"&gt;…&lt;/div&gt; intercepts pointer events
- **genre-rnb** fails: it did not advance (its check is false in the page)
- **genre-rnb** is a known failure: ia-flows-14, prism-ui-23: Prism is premium-locked for a free student, yet the lesson starts anyway; the lock covers the panel (and lays it out taller than the dock, so it is clipped too)
- **genre-rnb**: went on through its driver’s fallback
- **balance-fader** fails: anchor mixer-section: its box is empty (nothing drawn on screen) (see ia-flows-12, fx-mixer-04)
- **balance-fader** is a known failure: ia-flows-12, fx-mixer-04: mixer-section has a 0 px tall box in MASTER at 1366×655
- **use-send** fails: anchor mixer-sends-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA0B0SynthReturn AReverb1 FXR" (scrolls) (see ia-flows-12, fx-mixer-04, fx-mixer-14)
- **use-send** is a known failure: ia-flows-12, fx-mixer-04: mixer-sends-A is cut off by the scrolling strips row (none of it shows at 1366×655, 31% at 1280×720)
- **tweak-return** fails: anchor return-strip-A: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: click "Return A" label failed: locator.click: Timeout 10000ms exceeded. — &lt;div class="flex shrink-0 flex-col" data-tutorial-id="mastering-section"&gt;…&lt;/div&gt; intercepts pointer events (see ia-flows-12, fx-mixer-04)
- **tweak-return** fails: it did not advance (its check is false in the page) (see ia-flows-12, fx-mixer-04)
- **tweak-return** is a known failure: ia-flows-12, fx-mixer-04: return-strip-A is cut off by the scrolling strips row (none of it shows at 1366×655, where mastering-section also takes the click on its label; 75% at 1280×720)
- **tweak-return**: went on through its driver’s fallback
- **master-volume** fails: anchor master-strip: only 0% of it shows: cut by div.flex.flex-1.overflow-x-auto "-infMuteSoloA50B0SynthReturn AReverb1 FX" (scrolls) (see ia-flows-12, fx-mixer-04)
- **master-volume** is a known failure: ia-flows-12, fx-mixer-04: master-strip is cut off by the scrolling strips row
- **bounce-mixdown** fails: click Export Audio… failed: locator.click: Timeout 10000ms exceeded. — &lt;div&gt;…&lt;/div&gt; from &lt;div aria-hidden="true" data-aria-hidden="true"&gt;…&lt;/div&gt; subtree intercepts pointer events (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** fails: it did not advance (its check is false in the page) (see practice-tutorial-20, audio-core-01)
- **bounce-mixdown** is a known failure: new (nearest practice-tutorial-18): the coach card covers File &gt; Export Audio…, so the click on it times out
- **bounce-mixdown** warning: then file-export-audio: it is covered at 9/9 points (its centre among them) by the coach card
- **bounce-mixdown**: went on through its driver’s fallback

### Indie — Movement & dynamics (`indie-movement-and-dynamics`)

| #   | Step              | Anchor                                     | Driver | Advanced    | Result       |
| --- | ----------------- | ------------------------------------------ | ------ | ----------- | ------------ |
| 1   | `open-automation` | `automation-toggle`: NOT visible (missing) | click  | after 0.9 s | FAIL (known) |
| 2   | `draw-volume`     | `automation-lane`: NOT visible (covered)   | click  | after 1.0 s | FAIL (known) |
| 3   | `hear-it`         | `automation-lane`: visible                 | store  | after 1.0 s | pass         |
| 4   | `second-lane`     | `automation-param-select`: visible         | click  | after 1.0 s | pass         |

- **open-automation** fails: anchor automation-toggle: none of automation-toggle is in the DOM
- **open-automation** fails: The lesson opens in an empty session and its first step asks to pick a track, but there is no track and no step adds one, so there is no automation button
- **open-automation** is a known failure: new: ?tutorial= boots an empty session and no step adds a track, so there is no automation button to click
- **draw-volume** fails: anchor automation-lane: it is covered at 3/9 points by the coach card
- **draw-volume** is a known failure: new (nearest practice-tutorial-18): the coach card is clamped back over the wide automation lane

# Studio editor perf baseline

2026-10-07T01:08:08.330Z · commit f96b3ecc (dirty) · http://localhost:5263 · Chrome 153.0.8010.12 · GPU metal

**The machine was busy during this run (see Machine load), so its
timings are inflated and are not a baseline.**

Written by scripts/studio-perf/perf.mjs; this run only. Times in ms;
load times are from navigation start. Profiles: chromebook 1366×655 4×
CPU throttle (10 Mbps / 40 ms on loads), laptop 1440×787 DPR 2, small
1280×720. A cell that reads "a (b–c)" is the median of the repeats and
their range. Region counts come from the DevProfiler wrappers in
DawApp; TransportBar also counts its own commits under the same id, and
Timeline and DawAppInner count only their own (no render time).

## Idle (stopped, 10 s)

| profile    | s   | frame p50 / p95 / max (ms) | long tasks (n / total) | LoAF (n / blocking) | app rAF/s | React commits/s | store writes/s | top store keys (/s) | region commits/s |
| ---------- | --- | -------------------------- | ---------------------- | ------------------- | --------- | --------------- | -------------- | ------------------- | ---------------- |
| chromebook | 10  | 16.7 / 16.7 / 16.8         | 0 / 0 ms               | 0 / 0 ms            | 599.92    | 0               | 0              | –                   | –                |
| laptop     | 10  | 16.7 / 16.7 / 16.8         | 0 / 0 ms               | 0 / 0 ms            | 599.92    | 0               | 0              | –                   | –                |

Stage A exit target (chromebook): no rAF loops while idle.

## Playback (20 s, demo-midnight-groove, 4-bar loop on)

| profile    | s     | frame p50 / p95 / max (ms) | long tasks (n / total) | LoAF (n / blocking) | app rAF/s | React commits/s | store writes/s | top store keys (/s) | region commits/s                                                                                                            | master peak | audible share | playhead (distinct / wraps) |
| ---------- | ----- | -------------------------- | ---------------------- | ------------------- | --------- | --------------- | -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | --------------------------- |
| chromebook | 20.01 | 16.7 / 16.8 / 116.7        | 14 / 1553 ms           | 13 / 844 ms         | 619.04    | 140.64          | 28.29          | position 28.29      | TimelineWithHeaders 140.64 (78.49 ms/s) · TransportBar 28.29 (5.17 ms/s) · ChannelStrip 28.29 (94.59 ms/s) · Timeline 28.29 | 0.5295      | 1             | 80 / 1                      |
| laptop     | 20    | 16.7 / 16.8 / 33.4         | 0 / 0 ms               | 3 / 0 ms            | 656.54    | 149.16          | 29.89          | position 29.89      | TimelineWithHeaders 149.16 (32.55 ms/s) · TransportBar 29.89 (3.43 ms/s) · ChannelStrip 29.89 (40.44 ms/s) · Timeline 29.89 | 0.7534      | 1             | 81 / 2                      |

Stage A exit targets (chromebook): 0 store writes/s; 0 commits/s in DawAppInner, top bar, Timeline, track headers and dock; ≤1 long task per 20 s; p95 frame ≤20 ms. The playhead column counts the distinct store positions in the 250 ms samples and the loop wraps among them.

## View switches (1st switch, then 3 later rounds)

| profile    | switch to | first frame, 1st switch (ms) | first frame, later (ms) | settled, 1st switch (ms) | settled, later (ms) | React commits, 1st switch | long tasks, 1st switch (n / total / max ms) | long-task ms, later | region commits, 1st switch (render ms)                                                                                               |
| ---------- | --------- | ---------------------------- | ----------------------- | ------------------------ | ------------------- | ------------------------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| chromebook | score     | 96.4                         | 154 (151–164.4)         | 423.6                    | 182.7 (181.9–184.7) | 6                         | 2 / 255 / 182                               | 98 (97–104)         | ScoreView 5 (54 ms) · TransportBar 2 (6 ms) · DawAppInner 1                                                                          |
| chromebook | leadsheet | 53.1                         | 40.7 (38.7–40.7)        | 71.3                     | 54.3 (53.8–54.9)    | 3                         | 0 / 0 / 0                                   | 0                   | LeadSheetView 2 (24 ms) · TransportBar 1 (0 ms) · DawAppInner 1                                                                      |
| chromebook | studio    | 69                           | 54 (54–56.6)            | 90.4                     | 73.4 (72.1–74.6)    | 7                         | 1 / 55 / 55                                 | 0                   | StudioView 8 (37 ms) · TransportBar 1 (0 ms) · LibraryPanel 1 · DawAppInner 1                                                        |
| chromebook | arrange   | 124.8                        | 112.8 (112.2–118.3)     | 150.7                    | 137.7 (136.3–219.8) | 9                         | 1 / 102 / 102                               | 91 (91–98)          | TimelineWithHeaders 9 (26 ms) · Timeline 6 · TransportBar 3 (7 ms) · ChannelStrip 2 (13 ms) · LibraryPanel 1 (10 ms) · DawAppInner 1 |
| laptop     | score     | 36.6                         | 60.1 (44.6–65.4)        | 64.5                     | 75.1 (52.8–105.2)   | 3                         | 0 / 0 / 0                                   | 0                   | TransportBar 3 (4 ms) · ScoreView 2 (13 ms) · DawAppInner 1                                                                          |
| laptop     | leadsheet | 25.9                         | 18.6 (16.4–19.2)        | 39.5                     | 41.1 (38.3–43.9)    | 3                         | 0 / 0 / 0                                   | 0                   | LeadSheetView 2 (14 ms) · TransportBar 1 (0 ms) · DawAppInner 1                                                                      |
| laptop     | studio    | 32.5                         | 23.9 (20.4–25.5)        | 43                       | 36.2 (36.1–42.5)    | 6                         | 0 / 0 / 0                                   | 0                   | StudioView 8 (18 ms) · TransportBar 1 (0 ms) · LibraryPanel 1 · DawAppInner 1                                                        |
| laptop     | arrange   | 46.6                         | 43.1 (40.9–51.2)        | 55.3                     | 70.1 (58.2–76.8)    | 8                         | 0 / 0 / 0                                   | 0                   | TimelineWithHeaders 8 (11 ms) · Timeline 4 · TransportBar 2 (3 ms) · ChannelStrip 2 (5 ms) · LibraryPanel 1 (4 ms) · DawAppInner 1   |

A 1st switch mounts the view for the first time in the session; "later" is the median and range of the later rounds. arrange is the view the editor opened on, so its 1st switch is a return.

### Practice track first render (3 cold opens of ?practiceMode=dorian&practiceRoot=d)

| profile    | opens measured | module mark (ms)       | mounted mark (ms)      | practice screen (ms)   | mounted → screen (ms) | long tasks to then (n) | long-task ms to then |
| ---------- | -------------- | ---------------------- | ---------------------- | ---------------------- | --------------------- | ---------------------- | -------------------- |
| chromebook | 3 of 3         | 1830.5 (1824.8–1834.5) | 2317.6 (2308.6–2358.7) | 2719.3 (2716.2–2728.8) | 410.7 (357.5–411.2)   | 6                      | 1010 (996–1019)      |
| laptop     | 3 of 3         | 835.4 (819.2–894)      | 895.9 (884.5–962)      | 1005.5 (988.4–1075.7)  | 109.6 (103.9–113.7)   | 2                      | 137 (133–144)        |

## Fader drag (first track volume, 3 gestures of 4 s)

| profile    | target | gestures | moves/s          | store writes/s      | React commits/s     | store writes / move | store writes / gesture | React commits / move | long-task ms / move | frame p95 (ms)   | long tasks, all gestures (n / ms) | store keys / move                 | region commits / move                                                                                                   |
| ---------- | ------ | -------- | ---------------- | ------------------- | ------------------- | ------------------- | ---------------------- | -------------------- | ------------------- | ---------------- | --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| chromebook | Keys   | 3        | 20.1 (19.9–20.2) | 39.2 (38.6–39.2)    | 58.8 (57.9–58.8)    | 1.98                | 160 (158–160)          | 2.96                 | 0 (0–1)             | 33.4             | 1 / 78                            | tracks 0.99 · liveAudioPeaks 0.99 | TimelineWithHeaders 2.73 · TransportBar 2.47 · Timeline 1.98 · LibraryPanel 0.99 · ChannelStrip 0.99 · DawAppInner 0.99 |
| laptop     | Keys   | 3        | 59.4 (59–59.4)   | 109.6 (108.3–110.1) | 156.7 (142.1–164.5) | 1.87 (1.86–1.88)    | 446 (442–448)          | 2.7 (2.43–2.82)      | 0 (0–0.2)           | 16.7 (16.7–16.8) | 1 / 52                            | tracks 0.94 · liveAudioPeaks 0.94 | TimelineWithHeaders 2.65 · TransportBar 2.35 · Timeline 1.87 · LibraryPanel 0.94 · ChannelStrip 0.94 · DawAppInner 0.94 |

Stage A target: one store write, one undo entry and one Yjs update per gesture. Compare per-move numbers across profiles: a slower page takes fewer moves, so its per-second rates drop.

## Note drag (docked Piano Roll, 3 gestures of 4 s)

| profile    | target  | gestures | moves/s          | store writes/s   | React commits/s     | store writes / move | store writes / gesture | React commits / move | long-task ms / move | frame p95 (ms)   | long tasks, all gestures (n / ms) | store keys / move           | region commits / move                                                                                         |
| ---------- | ------- | -------- | ---------------- | ---------------- | ------------------- | ------------------- | ---------------------- | -------------------- | ------------------- | ---------------- | --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| chromebook | Lead C5 | 3        | 11.5 (11.2–11.5) | 22.1 (21.6–22.1) | 61.4 (61.1–67.1)    | 2                   | 92 (90–92)             | 5.64 (5.54–6.09)     | 55.7 (54.7–57.8)    | 83.4             | 81 / 7678                         | tracks 1 · liveAudioPeaks 1 | TimelineWithHeaders 5.74 · TransportBar 2.5 · Timeline 2 · ChannelStrip 1.02 · LibraryPanel 1 · DawAppInner 1 |
| laptop     | Lead C5 | 3        | 50.1 (49.8–50.3) | 97.6 (97.6–98.5) | 221.9 (220.6–222.9) | 2                   | 402 (400–404)          | 4.52 (4.52–4.55)     | 0                   | 16.7 (16.7–16.8) | 0 / 0                             | tracks 1 · liveAudioPeaks 1 | TimelineWithHeaders 4.53 · TransportBar 2.5 · Timeline 2 · ChannelStrip 1 · LibraryPanel 1 · DawAppInner 1    |

The longest note of a melodic clip at bar 1 (the dock draws later clips in the wrong place today), dragged with the Select tool; every gesture starts from the clip as it was.

## Cold load and first sound

| profile    | load                 | DawApp request | module mark | mounted mark | Add Track shown | Play clicked | engine-ready mark | Play → first sound        | first sound | MB before Play      | MB before first sound | requests before first sound | MB by run end        |
| ---------- | -------------------- | -------------- | ----------- | ------------ | --------------- | ------------ | ----------------- | ------------------------- | ----------- | ------------------- | --------------------- | --------------------------- | -------------------- |
| chromebook | demo-sunset-keys     | 54230.1        | 66010.7     | 66260.5      | 66386.6         | 66687.4      | 66986.3           | 2976                      | 69663.4     | 77.99 / 0.13 / 0.86 | 77.99 / 2.93 / 1.44   | 2165 / 22 / 52              | 77.99 / 2.98 / 1.44  |
| chromebook | template project-pop | 51793.1        | 64709       | 65038.1      | 65247.4         | 65492.7      | 66311.8           | none in 19.5 s (expected) | –           | 76.18 / 0.13 / 0.86 | 77.99 / 20.25 / 0.86  | 2165 / 22 / 22              | 77.99 / 20.25 / 0.86 |
| laptop     | demo-sunset-keys     | 657.5          | 816         | 874.9        | 910.4           | 1029.8       | 1105.9            | 882                       | 1911.8      | 77.99 / 0.13 / 0.86 | 78.76 / 51.53 / 1.44  | 2166 / 24 / 51              | 78.76 / 51.53 / 1.44 |
| laptop     | template project-pop | 668.2          | 828.7       | 902.2        | 945.9           | 1015.5       | 1193.5            | none in 10.2 s (expected) | –           | 77.99 / 0.13 / 0.86 | 77.99 / 20.25 / 0.86  | 2165 / 22 / 21              | 77.99 / 20.25 / 0.86 |

Times are ms from navigation start; Play is clicked as soon as Add
Track shows. MB and request columns read dev-server code / app assets
(e.g. /daw-assets/ samples) / third-party hosts. The dev server sends
unbundled modules with inline source maps, far heavier than production
chunks (see bundle.mjs), so these loads are a regression baseline for
the dev path, not a production estimate. project-pop has empty tracks
and no metronome, so silence is expected there: its run ends once its
downloads finish, at least 10 s after Play.
Stage A targets: boot chunk ≤150 KB gzip; the editor paints without
waiting for songs content; Play is never silent (1.12b).

## Problems

- idle on chromebook: the machine was busy (1-minute load average 5.66, limit 4.7), so these timings are not a baseline
- playback on chromebook: the machine was busy (1-minute load average 5.66, limit 4.7), so these timings are not a baseline
- note-drag on chromebook: the machine was busy (1-minute load average 4.73, limit 4.7), so these timings are not a baseline
- load on chromebook: the machine was busy (1-minute load average 4.73, limit 4.7), so these timings are not a baseline
- playback on laptop: the machine was busy (1-minute load average 4.81, limit 4.7), so these timings are not a baseline
- views on laptop: the machine was busy (1-minute load average 4.81, limit 4.7), so these timings are not a baseline

## Page errors

None.

## Machine load

**Busy: the 1-minute load average reached 3.13–5.66 on 14 cores (busy above 4.7).** Timings are likely inflated; re-run on a quiet machine before comparing them with a baseline. The cores were 17–26% busy during the scenarios, this run's browser included. Page CPU check (a fixed JS loop timed in each scenario's page, ms): chromebook 99.9 (99.4–100.7) · laptop 25.1 (24.8–25.2). Under one profile it should not change between runs; when it is slower, so is everything else. This run writes a baseline, so a load average above 4.7 or a slowed-down page fails it.

# Studio editor bundle

2026-10-07T01:16:59.962Z · commit f96b3ecc (dirty) · Vite 8.0.2 · built in 33 s

Written by scripts/studio-perf/bundle.mjs from a production build. Sizes
in kB (1,000 bytes): gzip level 9, brotli quality 11.

| chunk                               | file                      | raw     | gzip   | brotli |
| ----------------------------------- | ------------------------- | ------- | ------ | ------ |
| DawApp (the editor)                 | assets/DawApp-BnLe4--M.js | 1125.8  | 284.9  | 220.0  |
| entry                               | assets/index-T7PuolGk.js  | 680.3   | 179.0  | 143.8  |
| initial JS (entry and 173 preloads) | –                         | 3442.0  | 957.9  | –      |
| all JS chunks (514 files)           | –                         | 19911.9 | 4969.5 | –      |

DawApp against the June figure (1130.0 kB raw, 286.0 kB gzip): −4.2 kB raw, −1.1 kB gzip. Stage A's boot chunk budget (1.12a) is 150.0 kB gzip, and this chunk is 134.9 kB over it. Vite's own log: 1125.8 kB raw, 288.6 kB gzip.

## What the DawApp chunk is made of

Rendered size, before minification.

| source       | kB     |
| ------------ | ------ |
| src/daw      | 1677.3 |
| src (other)  | 181.4  |
| node_modules | 124.8  |

Largest packages in it: webmidi 100.6 kB · lucide-react 9.8 kB · framer-motion 8.5 kB · y-indexeddb 3.6 kB · lib0 2.3 kB.

## Largest src/daw modules (402 in all)

Rendered size before minification; gzip of the module alone.

| module                                               | rendered kB | gzip kB | chunk                                |
| ---------------------------------------------------- | ----------- | ------- | ------------------------------------ |
| src/daw/components/Controls/VocalView.tsx            | 73.8        | 11.5    | DawApp-BnLe4--M.js                   |
| src/daw/components/Timeline/Timeline.tsx             | 72.7        | 14.8    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/CrystalIcons.ts          | 62.7        | 19.5    | DawApp-BnLe4--M.js                   |
| src/daw/components/Score/useScoreEditing.tsx         | 61.7        | 13.1    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/DrumMachineView.tsx      | 50.2        | 11.2    | DawApp-BnLe4--M.js                   |
| src/daw/components/PianoRoll/PianoRoll.tsx           | 45.9        | 10.4    | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/GuitarBassView.tsx       | 43.6        | 8.2     | DawApp-BnLe4--M.js                   |
| src/daw/store/prismSlice.ts                          | 41.9        | 9.9     | store-DBQiZKJD.js                    |
| src/daw/components/Effects/EffectsPanel.tsx          | 41.8        | 6.7     | DawApp-BnLe4--M.js                   |
| src/daw/prism-engine/data/melodyContours.ts          | 39.6        | 3.8     | prism-engine-CkKWRN1o.js             |
| src/daw/prism-engine/data/progressionGraph.ts        | 37.0        | 4.0     | prism-engine-CkKWRN1o.js             |
| src/daw/components/Transport/TransportBar.tsx        | 32.6        | 6.4     | DawApp-BnLe4--M.js                   |
| src/daw/components/Studio/StudioView.tsx             | 32.4        | 6.6     | DawApp-BnLe4--M.js                   |
| src/daw/audio/EffectChain.ts                         | 31.3        | 6.3     | store-DBQiZKJD.js                    |
| src/daw/oracle-synth/store/presets/factoryPresets.ts | 27.4        | 3.2     | SessionSerializer-B2K5nRxb.js        |
| src/daw/components/LeadSheet/LeadSheetView.tsx       | 26.1        | 6.2     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/GroovesBrowser.tsx       | 25.9        | 5.1     | DawApp-BnLe4--M.js                   |
| src/daw/hooks/usePlaybackEngine.ts                   | 25.2        | 6.1     | DawApp-BnLe4--M.js                   |
| src/daw/components/Tutorial/tutorials.ts             | 23.1        | 5.6     | useTutorialProgressStore-BE5di4TO.js |
| src/daw/components/PitchEditor/PitchEditor.tsx       | 22.3        | 5.2     | DawApp-BnLe4--M.js                   |
| src/daw/instruments/TonewheelOrganEngine.ts          | 21.9        | 5.1     | DawApp-BnLe4--M.js                   |
| src/daw/components/Transport/SettingsModal.tsx       | 19.2        | 3.8     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/OrganView.tsx            | 18.2        | 3.9     | DawApp-BnLe4--M.js                   |
| src/daw/components/Effects/GraphicEQ.tsx             | 17.6        | 4.9     | DawApp-BnLe4--M.js                   |
| src/daw/components/Controls/SamplerChopsView.tsx     | 17.3        | 4.3     | DawApp-BnLe4--M.js                   |
