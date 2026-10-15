# Studio editor audit: findings register

622 verified findings (25 critical, 140 high, 364 medium, 93 low).
Full evidence, impact and verifier notes for each id are in `findings.json`.
Which milestone owns each finding is in `phase-map.json`.

## Critical (25)

### audio-core

- **audio-core-01** (correctness, effort S, confirmed): Export fails on 48 kHz devices (IR cache ignores sample rate), and a failed or hung export leaves Tone's global context stuck on the dead offline context. `src/daw/audio/reverbIR.ts`, `src/daw/audio/EffectChain.ts`, `src/daw/audio/renderProject.ts`
- **audio-core-06** (reload-persistence, effort M, confirmed): Recording over an earlier take corrupts or orphans it: remainders ignore offsetSeconds, drop assetId and gain, and lose their buffer reference. `src/daw/audio/overwriteAudioRegion.ts`, `src/daw/audio/AudioBufferStore.ts`, `src/daw/hooks/usePlaybackEngine.ts`

### collab

- **collab-01** (correctness, effort S, confirmed): 'Leave without saving' deletes the user's pre-existing cloud project. `src/daw/collab/ui/LeaveSavePrompt.tsx`, `src/daw/collab/collabSlice.ts`, `src/daw/collab/ui/CollabToolbar.tsx`
- **collab-02** (performance, effort S, confirmed): Presence publishing becomes a self-sustaining broadcast loop that re-renders the whole editor and starves autosave. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/presence.ts`, `src/daw/hooks/useStudioMonitor.ts`

### dock-instruments

- **dock-instruments-01** (correctness, effort S, confirmed): Dock note editors use the clip's timeline start as the note origin: clips not at bar 1 look empty and new notes land in the wrong bar. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/components/Controls/KeyboardView.tsx`

### fx-mixer

- **fx-mixer-01** (reload-persistence, effort M, confirmed): The mastering chain, master fader and bypass are never saved or reset: lost on refresh and carried into the next project. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/masteringSlice.ts`, `src/daw/components/Studio/StudioView.tsx`

### ia-flows

- **ia-flows-01** (reload-persistence, effort M, confirmed): Cloud save then reopen drops the chord lane, mode, time signature, markers, mastering and Score/Lead Sheet marks. `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-projects/api.ts`, `src/daw/DawApp.tsx`
- **ia-flows-02** (reload-persistence, effort S, confirmed): Dashboard tabs, lessons, demos, templates, collab links and File > Open silently destroy an unsaved session. `src/daw/DawApp.tsx`, `src/components/ClassroomLayout/studio/StudioTabBar.tsx`, `src/daw/components/Transport/FileMenu.tsx`

### insight

- **insight-01** (reload-persistence, effort M, confirmed): Cloud save/open drops the chord lane and the mode, so Insight re-prompts and reads the song in the wrong mode. `src/daw/persistence/SessionSerializer.ts`, `src/daw/DawApp.tsx`, `src/daw/components/Transport/FileMenu.tsx`

### instruments

- **instruments-01** (correctness, effort S, confirmed): Every SoundFont track receives every SoundFont channel: cross-talk, doubled level, mute/solo/FX don't isolate. `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/components/Prism/PrismSuggestionModal.tsx`, `src/daw/store/prismSlice.ts`

### leadsheet

- **leadsheet-01** (reload-persistence, effort M, confirmed): Cloud save and open drop the entire lead sheet. `src/daw/persistence/SessionSerializer.ts`, `src/daw/DawApp.tsx`, `src/daw/components/LeadSheet/toSetListChart.ts`

### live-input

- **live-input-01** (reload-persistence, effort M, partially): Saved guitar/bass/vocal tone is not applied after any reload until each track's Controls tab is opened. `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/components/Controls/VocalView.tsx`, `src/daw/hooks/usePlaybackEngine.ts`
- **live-input-02** (reload-persistence, effort S, confirmed): Live input silently disconnects after every reload and on any collaborator edit (audioInputChannel not persisted or preserved). `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/persistence/SessionSerializer.ts`

### pianoroll

- **pianoroll-01** (correctness, effort S, confirmed): Docked piano rolls (PIANO ROLL tab, Keyboard controls) misplace every clip that doesn't start at bar 1. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/PianoRoll/PianoRoll.tsx`

### score

- **score-01** (reload-persistence, effort L, confirmed): Score markings and layout are never saved: refresh or reopening a project wipes them. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/uiSlice.ts`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-02** (correctness, effort M, confirmed): DAW-wide shortcuts fire underneath Score keys: Delete removes a clip the user can't see, ⌥R starts recording. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/store/uiSlice.ts`, `src/daw/components/Score/useScoreEditing.tsx`

### shell

- **shell-02** (correctness, effort S, confirmed): Global clip shortcuts fire inside Score and Lead Sheet: deleting a note or chord also deletes the selected arrangement clip, and ⌥R starts recording. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **shell-03** (reload-persistence, effort L, confirmed): File ▸ Save says 'Project saved' while the cloud copy drops chord symbols, lead-sheet/score layout, time signature, mode and markers. `src/daw/components/Transport/FileMenu.tsx`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/DawApp.tsx`

### state-reload

- **state-reload-01** (reload-persistence, effort M, confirmed): Score and lead-sheet notation is never persisted, and every load path wipes it. `src/daw/store/uiSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/prismSlice.ts`
- **state-reload-02** (reload-persistence, effort S, confirmed): Going back into the editor overwrites the live session with the stale autosave. `src/daw/DawApp.tsx`, `src/daw/hooks/useAutosave.ts`, `src/lib/studio-projects/localSession.ts`
- **state-reload-04** (reload-persistence, effort M, confirmed): Cloud saves drop the chord lane and the mode (plus time signature, loop, markers and mastering). `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-projects/api.ts`, `src/daw/DawApp.tsx`
- **state-reload-05** (correctness, effort S, partially): Chord-region ids restart at cr-1 on every page load, so edits after a reload hit the wrong chord. `src/daw/store/prismSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/collab/diffEngine.ts`

### synth-engine

- **synth-engine-01** (correctness, effort L, confirmed): Offline export renders Oracle tracks wrong: the engine schedules against ctx.currentTime and wall-clock timers. `src/daw/oracle-synth/audio/UnisonEngine.ts`, `src/daw/oracle-synth/audio/Voice.ts`, `src/daw/oracle-synth/audio/VoiceManager.ts`
- **synth-engine-02** (correctness, effort M, confirmed): Voice allocator steals releasing voices before using spare polyphony, and steals hard-stop at 'now' instead of the scheduled time. `src/daw/oracle-synth/audio/VoiceManager.ts`, `src/daw/oracle-synth/audio/Voice.ts`, `src/daw/oracle-synth/audio/UnisonEngine.ts`

### timeline

- **timeline-01** (correctness, effort M, confirmed): Splitting an audio clip discards its uploaded recording and slices the wrong audio. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/audio/AudioBufferStore.ts`, `src/daw/persistence/SessionSerializer.ts`

## High (140)

### audio-analysis

- **audio-analysis-01** (reload-persistence, effort M, confirmed): Pedal/amp/auto-tune chains only reach the audio graph while that track's CONTROLS view is open: takes play back raw after every kind of reload. `src/daw/audio/GuitarPedalChain.ts`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/components/Controls/VocalView.tsx`
- **audio-analysis-02** (correctness, effort S, confirmed): Post-take 'refined' chord analysis reads the previous take (the first take is never refined). `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/OfflineChordAnalyzer.ts`
- **audio-analysis-03** (performance, effort M, confirmed): Offline chord analysis blocks the main thread for seconds after every audio take (twice when Insight analysis is active). `src/daw/audio/OfflineChordAnalyzer.ts`, `src/daw/hooks/useAudioChordDetection.ts`, `src/unison/converters/audioToUnison.ts`
- **audio-analysis-04** (correctness, effort M, confirmed): Adding, removing or reordering a pedal before the amp rebuilds the NAM amp without its model; it falls back to heavy fuzz until the next edit. `src/daw/audio/GuitarPedalChain.ts`, `src/daw/audio/pedals/NamAmpPedal.ts`, `src/daw/audio/pedals/PedalProcessor.ts`
- **audio-analysis-05** (performance, effort L, confirmed): Each guitar/bass NAM amp runs a full 'standard' WaveNet per sample in scalar JS on the audio thread, even on silence. `src/daw/audio/pedals/NamAmpPedal.ts`, `src/daw/audio/nam/NamWorkletNode.ts`, `src/daw/instruments/GuitarFxAdapter.ts`

### audio-core

- **audio-core-02** (correctness, effort M, confirmed): Audio clips started mid-clip play ~100 ms ahead of the beat, and loop laps cut audio early, because immediate start/stop paths ignore Tone's lookAhead. `src/daw/audio/AudioClipScheduler.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useTransport.ts`
- **audio-core-03** (correctness, effort S, confirmed): From the second loop lap on, trimmed clips play their trimmed-away start; per-clip gain is never applied. `src/daw/audio/AudioClipScheduler.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/renderProject.ts`
- **audio-core-04** (correctness, effort M, confirmed): Seeking during playback never reschedules: old audio keeps playing, the new position is silent, automation is stale, and notes can hang. `src/daw/audio/AudioClipScheduler.ts`, `src/daw/audio/AutomationScheduler.ts`, `src/daw/audio/MidiScheduler.ts`
- **audio-core-05** (correctness, effort S, confirmed): The metronome grid starts wherever Play was pressed: off-beat clicks after pause/resume, missing clicks on later loop laps, wrong accent. `src/daw/audio/MetronomeEngine.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **audio-core-07** (reload-persistence, effort M, confirmed): Undo brings back audio clips whose buffers were already evicted: they are silent, and unrecoverable if they were never uploaded. `src/daw/audio/AudioBufferStore.ts`, `src/daw/audio/overwriteAudioRegion.ts`, `src/daw/store/undoMiddleware.ts`
- **audio-core-08** (performance, effort M, confirmed): Decoded audio is never cleared between projects, and every cloud open creates new clip ids, so audio piles up in memory for the whole session. `src/daw/audio/AudioBufferStore.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/audio/AudioRecorder.ts`
- **audio-core-09** (performance, effort M, confirmed): Waveforms rescan every sample of every visible audio clip on each Timeline redraw, because computePeaks is uncached. `src/daw/audio/AudioBufferStore.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **audio-core-14** (correctness, effort M, confirmed): Recorded takes land off the beat: there is no timestamp for when capture actually starts and no latency compensation. `src/daw/audio/AudioRecorder.ts`, `src/daw/audio/MidiRecorder.ts`, `src/daw/audio/AudioEngine.ts`
- **audio-core-17** (code-health, effort M, confirmed): The bundled reverb IR pack is marked PLACEHOLDER-DO-NOT-SHIP (derived from Logic Space Designer) and is served from public/. `src/daw/audio/reverbIR.ts`, `public/daw-assets/reverb-irs/manifest.json`

### bundle-load

- **bundle-load-01** (reload-persistence, effort S, confirmed): Autosave never fires during playback and is cancelled on unmount; the next param-less boot restores the older autosave over newer work. `src/daw/hooks/useAutosave.ts`, `src/daw/hooks/useTransport.ts`, `src/daw/store/transportSlice.ts`
- **bundle-load-02** (correctness, effort S, confirmed): Studio dashboard entry points discard the only copy of unsaved work without asking. `src/daw/DawApp.tsx`, `src/components/ClassroomLayout/studio/StudioTabBar.tsx`, `src/components/ClassroomLayout/studio/StudioNewProject.tsx`
- **bundle-load-03** (performance, effort M, confirmed): Nothing loads until the first click, and the first Play starts the transport before any instrument is ready, with no feedback. `src/daw/DawApp.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **bundle-load-04** (performance, effort M, confirmed): Default 'Natural' drum kit is 19.5 MB of 24-bit stereo WAV, decoded separately for every drum track. `public/daw-assets/samples/drums/natural`, `src/daw/instruments/drumKits.ts`, `src/daw/instruments/DrumMachineEngine.ts`
- **bundle-load-05** (performance, effort M, confirmed): A 30 MB GM SoundFont gates every demo's bass and 17 of 27 instrument presets; a failed load is permanent and silent. `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/data/demoProjects.ts`, `src/daw/data/instrumentPresets.ts`

### collab

- **collab-03** (correctness, effort S, confirmed): Joining from inside the editor silently replaces the open project and keeps its projectId. `src/daw/collab/ui/CollabToolbar.tsx`, `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/yjsToZustand.ts`
- **collab-04** (correctness, effort S, confirmed): Server-message listener is attached only to the first WebSocket, so it's lost after any reconnect. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/studioRealtime.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **collab-05** (correctness, effort S, confirmed): Rejected or closed rooms are never torn down: ~100 ms reconnect loop that can silently join later and replace the project. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/server/party.ts`
- **collab-07** (performance, effort M, confirmed): Note edits replace the whole Y.Array on every mouse move. `src/daw/collab/diffEngine.ts`, `src/daw/collab/YjsDocManager.ts`, `src/daw/components/PianoRoll/PianoRoll.tsx`
- **collab-10** (visual-design, effort S, partially): Portaled collab dialogs and popover render transparent because DAW tokens are scoped to .daw-root. `src/daw/collab/ui/InviteModal.tsx`, `src/daw/collab/ui/KickedModal.tsx`, `src/daw/collab/ui/LeaveSavePrompt.tsx`
- **collab-13** (ux, effort S, confirmed): Errors are invisible, lock/limit toasts never render, and the waiting modal can trap the user. `src/daw/collab/ui/CollabToolbar.tsx`, `src/daw/collab/ui/WaitingForSessionModal.tsx`, `src/daw/collab/CollabProvider.tsx`
- **collab-14** (correctness, effort S, confirmed): Jam import plays at the wrong tempo, deletes the saved jam before importing, and drops parts silently. `src/daw/jam-import/importJamSession.ts`, `src/daw/jam-import/jamSession.ts`
- **collab-15** (reload-persistence, effort M, confirmed): A host's network blip closes the room for everyone; guests then silently rejoin behind a 'host ended' dialog. `src/daw/collab/server/party.ts`, `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/ui/LeaveSavePrompt.tsx`
- **collab-16** (correctness, effort S, confirmed): Server lets connections without a valid token straight through to the Yjs sync (outside this slice). `src/daw/collab/server/party.ts`, `src/daw/collab/server/auth.ts`

### design-system

- **design-system-01** (correctness, effort S, confirmed): DAW tokens are scoped to .daw-root, so portaled dialogs and popovers render transparent and several primary buttons are invisible. `src/daw/daw.css`, `src/daw/hooks/useTheme.ts`, `src/constants/theme.ts`
- **design-system-04** (performance, effort M, confirmed): Meters set React state at 60fps per track and keep polling when stopped; the mastering 'LUFS' value is a relabelled peak reading. `src/daw/hooks/useMeterLevel.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`

### dock-instruments

- **dock-instruments-02** (reload-persistence, effort S, confirmed): Autosave never runs during playback, so edits made while a loop plays are lost on refresh or crash (cross-slice). `src/daw/hooks/useAutosave.ts`, `src/daw/hooks/useTransport.ts`, `src/daw/store/transportSlice.ts`
- **dock-instruments-03** (correctness, effort M, confirmed): The drum editor always edits the track's first clip, and 'Add to track' stacks every groove on bar 1. `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/components/Controls/GroovesBrowser.tsx`, `src/daw/components/Controls/KeyboardView.tsx`
- **dock-instruments-05** (correctness, effort M, confirmed): Playing from the computer keyboard toggles Loop/Metronome, and three panels use three different key maps. `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/Controls/SoundFontView.tsx`, `src/daw/components/Controls/DawSynthLayout.tsx`
- **dock-instruments-08** (ux, effort M, confirmed): The SoundFont panel waits behind a 31 MB download with no progress, and spins forever if loading fails. `src/daw/components/Controls/SoundFontView.tsx`, `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **dock-instruments-09** (ux, effort M, confirmed): The fixed 33vh dock hides most of the drum grid, opens it on the empty rows, and clips the organ. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/components/Controls/OrganView.module.css`
- **dock-instruments-10** (ux, effort M, confirmed): PIANO ROLL opens empty on a track that has notes, drawing in it creates an overlapping clip, and where you edit notes depends on the track type. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/KeyboardView.tsx`

### engine-hooks

- **engine-hooks-01** (reload-persistence, effort M, confirmed): Autosave can silently drop recent edits, and re-entering the editor restores that stale copy over the newer session. `src/daw/hooks/useAutosave.ts`, `src/daw/DawApp.tsx`, `src/lib/studio-projects/localSession.ts`
- **engine-hooks-03** (performance, effort M, confirmed): The [isReady, tracks] effect rewrites every track's whole mixer and FX chain on every edit. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/EffectChain.ts`, `src/daw/audio/TrackEngine.ts`
- **engine-hooks-04** (correctness, effort L, confirmed): Edits made during playback aren't heard until the transport restarts. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/MidiScheduler.ts`, `src/daw/audio/AutomationScheduler.ts`
- **engine-hooks-05** (correctness, effort M, confirmed): Seeking while playing desyncs audio clips and can leave notes hanging. `src/daw/hooks/useTransport.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/AudioClipScheduler.ts`
- **engine-hooks-06** (correctness, effort M, confirmed): Audio clips started mid-clip or on loop laps play ~100 ms ahead of MIDI and the metronome, and loop laps ignore the clip trim. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useTransport.ts`, `src/daw/audio/AudioClipScheduler.ts`
- **engine-hooks-07** (performance, effort M, confirmed): Level meters re-render whole track headers, mixer strips and the FX panel every frame. `src/daw/hooks/useMeterLevel.ts`, `src/daw/hooks/useCompressorMeters.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`
- **engine-hooks-09** (correctness, effort M, confirmed): MIDI export writes a file that plays 3.75x slower, with flattened dynamics, every clip stacked at bar 1, and wrong channels. `src/daw/midi/MidiFileIO.ts`, `src/daw/components/Transport/FileMenu.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **engine-hooks-11** (ux, effort M, confirmed): After opening or restoring a project, live MIDI and recorded takes are pinned to the first MIDI track. `src/daw/persistence/SessionSerializer.ts`, `src/daw/hooks/useMidiInputRouting.ts`, `src/daw/hooks/useMidiRecording.ts`
- **engine-hooks-12** (correctness, effort M, confirmed): Post-recording chord analysis analyses the wrong take and blocks the main thread. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/audio/OfflineChordAnalyzer.ts`, `src/daw/audio/AudioRecorder.ts`
- **engine-hooks-13** (correctness, effort L, confirmed): Audio takes land off the beat with no latency compensation, and the mic-fallback path starts late and never releases the mic. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/AudioRecorder.ts`, `src/daw/audio/MidiRecorder.ts`
- **engine-hooks-15** (performance, effort S, confirmed): In collab sessions every peer presence update re-renders the whole editor. `src/daw/hooks/useStudioMonitor.ts`, `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/StudioRtcManager.ts`

### fx-mixer

- **fx-mixer-02** (correctness, effort S, confirmed): MASTER 'Bypass' changes nothing in the audio path, and 'Gain Match' has no handler. `src/daw/components/Studio/StudioView.tsx`, `src/daw/store/masteringSlice.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **fx-mixer-04** (ux, effort M, confirmed): MASTER layout starves the mixer: about 25 px faders at 1440×900, and selecting a return collapses the strips. `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Tutorial/tutorials.ts`
- **fx-mixer-05** (performance, effort M, confirmed): Mixer meters re-render whole strips every display frame during playback. `src/daw/hooks/useMeterLevel.ts`, `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`
- **fx-mixer-06** (performance, effort S, partially): The compressor-meter hook re-renders the entire FX rack 30×/s, even when stopped and when no meter is visible. `src/daw/hooks/useCompressorMeters.ts`, `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Studio/StudioView.tsx`
- **fx-mixer-07** (performance, effort L, partially): Every knob, fader, pan or send drag step does work proportional to the whole project. `src/daw/store/undoMiddleware.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/DawApp.tsx`
- **fx-mixer-16** (accessibility, effort M, confirmed): Effect parameters can't be changed from the keyboard or with a screen reader. `src/daw/components/Controls/RotaryKnob.tsx`, `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/Effects/EffectsPanel.tsx`
- **fx-mixer-21** (reload-persistence, effort S, confirmed): Mixer edits made while the transport is playing are not autosaved until it stops. `src/daw/hooks/useAutosave.ts`, `src/daw/hooks/useTransport.ts`

### ia-flows

- **ia-flows-03** (reload-persistence, effort M, confirmed): Browser refresh restores only part of the project: time signature, markers, mastering, Score/Lead Sheet marks and pitch edits are lost. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/transportSlice.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **ia-flows-04** (reload-persistence, effort S, confirmed): Autosave never runs while the transport plays and is dropped on unmount or unload. `src/daw/hooks/useAutosave.ts`, `src/daw/hooks/useTransport.ts`, `src/lib/studio-projects/localSession.ts`
- **ia-flows-05** (reload-persistence, effort S, confirmed): Returning to the editor by SPA navigation overwrites the live session with the autosave. `src/daw/DawApp.tsx`, `src/lib/studio-projects/localSession.ts`, `src/daw/persistence/SessionSerializer.ts`
- **ia-flows-07** (correctness, effort S, confirmed): Global Cmd/Ctrl shortcuts hijack text fields and the browser's page zoom. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/collab/ui/ChatPanel.tsx`
- **ia-flows-08** (correctness, effort M, confirmed): Single-key, Delete and arrow shortcuts act across views and collide with computer-keyboard note input. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/store/uiSlice.ts`, `src/daw/components/Score/useScoreEditing.tsx`
- **ia-flows-09** (performance, effort M, partially): The editor root re-renders the whole tree on every track, fader or loop edit. `src/daw/DawApp.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useCollabAudioLoader.ts`
- **ia-flows-10** (performance, effort S, confirmed): Undo tracking serializes the whole project on every change and adds duplicate subscriptions on every editor visit. `src/daw/DawApp.tsx`, `src/daw/store/undoMiddleware.ts`
- **ia-flows-11** (correctness, effort S, confirmed): Export MIDI puts every clip at bar 1 and drops the time signature. `src/daw/components/Transport/FileMenu.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/midi/MidiFileIO.ts`
- **ia-flows-12** (ux, effort M, confirmed): MASTER (Mix) view leaves the mixer about 68 px tall on a 1366x768 screen. `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/Tutorial/tutorials.ts`
- **ia-flows-13** (visual-design, effort S, confirmed): Popovers and dialogs portaled to <body> lose the DAW colour tokens. `src/daw/daw.css`, `src/daw/hooks/useTheme.ts`, `src/daw/components/Library/ChordAnalysisPrompt.tsx`
- **ia-flows-14** (ux, effort S, confirmed): Four of the eight Production lessons need the premium-locked Prism panel. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/components/ui/LockedFeatureOverlay.tsx`, `src/daw/components/Tutorial/tutorials.ts`
- **ia-flows-16** (ux, effort M, confirmed): Three piano rolls with three targeting rules; the docked one often edits the wrong thing. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`
- **ia-flows-18** (ux, effort S, confirmed): No save status: Cmd+S is silent, there is no unsaved indicator, and Undo/Redo buttons exist only in Score. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Transport/FileMenu.tsx`, `src/daw/components/Transport/TransportBar.tsx`
- **ia-flows-19** (performance, effort M, confirmed): Live meters re-render track headers and mixer strips on every animation frame. `src/daw/hooks/useMeterLevel.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`

### insight

- **insight-03** (correctness, effort S, confirmed): Library tab 'Replace current project' keeps the old project's id, chord lane and key; the next Save overwrites the saved project. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/store/tracksSlice.ts`, `src/daw/DawApp.tsx`
- **insight-05** (correctness, effort S, confirmed): The detected-key bus goes stale and overrides the user's key for vocal pitch correction, chord detection and synth snap. `src/daw/store/musicIntelligenceSlice.ts`, `src/daw/store/unisonSlice.ts`, `src/daw/components/Library/InsightContent.tsx`

### instruments

- **instruments-02** (reload-persistence, effort M, confirmed): Guitar/Bass/Vocal tone, input device and NAM model are applied only while that track's Controls view is open. `src/daw/instruments/GuitarFxAdapter.ts`, `src/daw/instruments/VocalFxAdapter.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **instruments-03** (performance, effort S, confirmed): Live drum pad and MIDI drum hits sound ~100 ms late (Tone.now() instead of Tone.immediate()). `src/daw/instruments/DrumMachineEngine.ts`, `src/daw/components/Controls/DrumMachineView.tsx`
- **instruments-07** (correctness, effort S, confirmed): Load failures are silent and often permanent: PianoSampler can hang forever, and a SoundFont failure is cached for the session. `src/daw/instruments/PianoSampler.ts`, `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/hooks/usePlaybackEngine.ts`

### leadsheet

- **leadsheet-02** (correctness, effort S, confirmed): Global DAW shortcuts change hidden timeline clips while you edit the lead sheet. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/store/uiSlice.ts`
- **leadsheet-03** (reload-persistence, effort M, confirmed): A browser refresh restores chords but loses the roadmap, layout and time signature. `src/daw/persistence/SessionSerializer.ts`, `src/daw/hooks/useAutosave.ts`, `src/features/songs/seedStudioFromSong.ts`
- **leadsheet-04** (correctness, effort S, confirmed): 'Update the Set List chart?' can overwrite a set's page with a blank or degraded chart. `src/daw/components/LeadSheet/SendToSetList.tsx`, `src/features/setlists/useSetLists.ts`, `src/features/setlists/setListsStore.ts`
- **leadsheet-05** (correctness, effort M, confirmed): Multi-bar rests shift every later bar index: sections, rests, fermatas, playhead and edits. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`, `src/daw/components/LeadSheet/LeadSheetMeasure.tsx`
- **leadsheet-06** (correctness, effort S, confirmed): The lead-sheet print stylesheet stays loaded and blanks other pages' printouts. `src/daw/components/LeadSheet/leadsheet-print.css`, `src/features/setlists/print/setlist-print.css`, `src/features/setlists/pages/SetListWorkspace.tsx`
- **leadsheet-07** (correctness, effort M, confirmed): +/− Measure assumes 4/4, leaves the roadmap and melody behind, and can't add bars at the end. `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/midi/leadSheetUtils.ts`

### live-input

- **live-input-03** (correctness, effort S, confirmed): Views never re-apply device or chain when the engine becomes ready after they mount (always the case on reload). `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/hooks/usePlaybackEngine.ts`

### pianoroll

- **pianoroll-02** (correctness, effort S, confirmed): Modal origin mixes song and clip ticks: emptying a clip at bar > 1 makes new notes land bars late. `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/StudioNotationView.tsx`
- **pianoroll-03** (correctness, effort M, confirmed): Keys pressed in the piano roll edit the timeline behind it: arrows move the clip, Cmd+C/V/D duplicate it, Backspace in the dock deletes it. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`
- **pianoroll-06** (ux, effort M, confirmed): Note edits made while playing aren't heard until playback is restarted. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/MidiScheduler.ts`, `src/daw/components/PianoRoll/PianoRollModal.tsx`

### practice-tutorial

- **practice-tutorial-03** (reload-persistence, effort S, confirmed): A stale practice screen appears over other projects after leaving the editor. `src/daw/DawApp.tsx`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/components/Practice/PracticeTrackView.tsx`
- **practice-tutorial-04** (ux, effort M, confirmed): Practice keyboard is MIDI-only; clickable keys play a different piano and are never recorded. `src/daw/components/Practice/ScaleKeyboard.tsx`, `src/components/PianoKeyboard/PianoKeyboard.tsx`, `src/contexts/PianoContext.tsx`
- **practice-tutorial-06** (reload-persistence, effort S, confirmed): A running lesson carries over into unrelated projects (no boot path ends it). `src/daw/DawApp.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/daw/store/tutorialSlice.ts`

### prism-engine

- **prism-engine-02** (correctness, effort S, confirmed): Suggestions ignore the key's mode: an A-minor project gets A-major progressions. `src/daw/prism-engine/engine/suggestionEngine.ts`, `src/daw/store/prismSlice.ts`, `src/daw/prism-engine/engine/naming.ts`

### prism-ui

- **prism-ui-01** (correctness, effort M, confirmed): Prism 'Create' silently deletes the selected track's clips and the whole chord lane. `src/daw/store/prismSlice.ts`, `src/daw/store/tracksSlice.ts`, `src/daw/components/Prism/PrismStudio.tsx`
- **prism-ui-02** (correctness, effort S, confirmed): The builder's 'Clear' also deletes the song's chord lane and lead-sheet layout (rests can't be undone). `src/daw/components/Prism/ChordBuilder.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/store/undoMiddleware.ts`
- **prism-ui-03** (reload-persistence, effort S, partially): The root lock carries over between projects: lessons can't set the key, and songs and practice tracks open with no key. `src/daw/store/prismSlice.ts`, `src/daw/components/Transport/TransportBar.tsx`, `src/daw/persistence/SessionSerializer.ts`
- **prism-ui-04** (correctness, effort S, confirmed): Suggestion-modal hotkeys also fire the global DAW shortcuts (R records, Space plays, arrows move clips). `src/daw/components/Prism/PrismSuggestionModal.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/store/transportSlice.ts`
- **prism-ui-05** (correctness, effort S, confirmed): Chord-region ids come from a per-tab counter and collide after a refresh and between collaborators. `src/daw/store/prismSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/collab/diffEngine.ts`
- **prism-ui-07** (reload-persistence, effort M, confirmed): Opening a saved cloud project silently resets the mode to Ionian (and drops the chord lane). `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-projects/api.ts`

### score

- **score-06** (performance, effort L, confirmed): Every edit rebuilds every part and re-engraves the whole score, blocking paint. `src/daw/components/Score/ScoreView.tsx`, `src/components/notation/StaffView.tsx`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-09** (correctness, effort S, confirmed): Clicking a Rests or Rhythmic cell applies the previous row's action. `src/daw/components/Score/NoteEditorBar.tsx`, `src/daw/components/Score/useScoreEditing.tsx`

### shell

- **shell-01** (reload-persistence, effort M, confirmed): Returning to the editor overwrites the live session with an older autosave, losing lead-sheet/score layout, recent edits and undo. `src/daw/DawApp.tsx`, `src/lib/studio-projects/localSession.ts`, `src/daw/persistence/SessionSerializer.ts`
- **shell-04** (performance, effort M, confirmed): Engine hooks at the editor root re-render the whole DAW on every track edit, fader tick, mastering change or collab presence update. `src/daw/DawApp.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useCollabAudioLoader.ts`
- **shell-06** (performance, effort S, confirmed): Undo tracking adds another set of store listeners on every editor visit, and each one serialises the whole project on every edit. `src/daw/DawApp.tsx`, `src/daw/store/undoMiddleware.ts`
- **shell-07** (reload-persistence, effort S, confirmed): Autosave never runs during playback, writes on UI-only changes, and never flushes on close or navigation. `src/daw/hooks/useAutosave.ts`, `src/lib/studio-projects/localSession.ts`, `src/daw/hooks/useTransport.ts`
- **shell-08** (reload-persistence, effort M, confirmed): Editor entry links wipe unsaved work without asking, and some wipe it before checking the link is valid. `src/daw/DawApp.tsx`, `src/lib/studio-projects/localSession.ts`, `src/components/ClassroomLayout/studio/StudioTabBar.tsx`
- **shell-10** (reload-persistence, effort M, confirmed): Time signature and markers are saved nowhere and carry over from one project into the next. `src/daw/components/Transport/TransportBar.tsx`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/transportSlice.ts`
- **shell-11** (visual-design, effort M, confirmed): Dialogs and popovers rendered outside .daw-root lose the DAW colour tokens, so buttons, menu backgrounds and borders disappear. `src/daw/daw.css`, `src/daw/components/Transport/SettingsModal.tsx`, `src/daw/components/common/ConfirmModal.tsx`
- **shell-12** (accessibility, effort M, confirmed): Global shortcuts ignore focus and context: ⌘Z/⌘A/⌘C/⌘V hijacked in text fields, Space/Delete/Escape act behind open dialogs, browser zoom overridden. `src/daw/hooks/useKeyboardShortcuts.ts`
- **shell-13** (correctness, effort S, confirmed): The R key skips the overwrite warning and records over an existing audio take. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Transport/TransportBar.tsx`, `src/daw/store/transportSlice.ts`
- **shell-14** (ux, effort M, confirmed): ⌘S gives no feedback, and the editor never shows whether work is saved. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Transport/FileMenu.tsx`, `src/daw/components/Transport/TransportBar.tsx`
- **shell-15** (ux, effort L, confirmed): File ▸ Open is now the only way to reach older projects, and it doesn't hold up as a project browser. `src/daw/components/Transport/FileMenu.tsx`, `src/lib/studio-projects/api.ts`

### state-reload

- **state-reload-03** (ux, effort M, confirmed): Dashboard, lesson, collab and project entries silently discard unsaved work and its crash copy. `src/daw/DawApp.tsx`, `src/components/ClassroomLayout/studio/StudioTabBar.tsx`, `src/components/ClassroomLayout/studio/StudioNewProject.tsx`
- **state-reload-06** (reload-persistence, effort M, confirmed): Autosave never fires while playing, recording or collaborating, never flushes, and ignores synth edits. `src/daw/hooks/useAutosave.ts`, `src/daw/hooks/useTransport.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **state-reload-07** (performance, effort M, confirmed): Undo auto-capture serializes the whole project to JSON on every edit frame and leaks subscriptions on each editor visit. `src/daw/store/undoMiddleware.ts`, `src/daw/DawApp.tsx`, `src/daw/components/Mixer/ChannelStrip.tsx`
- **state-reload-09** (reload-persistence, effort S, confirmed): Time signature is never saved, and measure edits assume 4/4. `src/daw/store/transportSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/features/songs/seedStudioFromSong.ts`
- **state-reload-10** (correctness, effort S, confirmed): Track roles become undefined after a refresh, which breaks chord analysis. `src/daw/persistence/SessionSerializer.ts`, `src/daw/utils/chordAnalysis.ts`, `src/daw/store/prismSlice.ts`
- **state-reload-12** (reload-persistence, effort M, confirmed): Mastering chain, master volume and timeline markers are lost on refresh and cloud reopen. `src/daw/store/masteringSlice.ts`, `src/daw/store/markersSlice.ts`, `src/daw/persistence/SessionSerializer.ts`
- **state-reload-15** (correctness, effort S, confirmed): The key lock survives a reset, so the next song or practice track opens without its key. `src/daw/store/prismSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **state-reload-17** (reload-persistence, effort M, confirmed): A refresh ends tutorials and practice screens. `src/daw/DawApp.tsx`, `src/daw/store/tutorialSlice.ts`, `src/daw/store/uiSlice.ts`
- **state-reload-18** (reload-persistence, effort M, confirmed): A refresh during a collab session forks guests out of the room and ends it for the host. `src/daw/DawApp.tsx`, `src/daw/collab/collabSlice.ts`, `src/daw/collab/CollabProvider.tsx`
- **state-reload-20** (ux, effort S, confirmed): Saving gives no feedback and the editor never shows unsaved changes. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Transport/FileMenu.tsx`, `src/daw/components/Transport/TransportBar.tsx`

### synth-engine

- **synth-engine-05** (correctness, effort M, confirmed): Arpeggiator runs on setInterval and discards the scheduled time, so it never locks to the transport. `src/daw/oracle-synth/audio/Arpeggiator.ts`, `src/daw/oracle-synth/audio/SynthEngine.ts`
- **synth-engine-07** (reload-persistence, effort S, confirmed): Oracle LFOs and arps ignore the project tempo after reload, on unselected tracks, and in export. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/hooks/useStoreBridge.ts`, `src/daw/oracle-synth/store/slices/globalSlice.ts`
- **synth-engine-08** (reload-persistence, effort S, confirmed): Pack wavetables aren't registered on reload, so tracks silently fall back to a basic waveform. `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/store/presets/packLoader.ts`, `src/daw/oracle-synth/audio/wavetableImport.ts`
- **synth-engine-10** (performance, effort M, confirmed): LFO edits re-render the whole 4-bar buffer at audio rate, 36-40 times per engine init or panel mount. `src/daw/oracle-synth/audio/LFO.ts`, `src/daw/oracle-synth/audio/LFOWaveformBuilder.ts`, `src/daw/oracle-synth/audio/SynthEngine.ts`

### synth-store

- **synth-store-01** (reload-persistence, effort S, partially): Synth-only edits never trigger the crash-recovery autosave, so a refresh silently loses sound design. `src/daw/hooks/useAutosave.ts`, `src/daw/oracle-synth/store/index.ts`, `src/lib/studio-projects/localSession.ts`
- **synth-store-02** (correctness, effort S, confirmed): applySynthStateToEngine never applies REVERB, so loaded projects and every export play Oracle tracks dry. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **synth-store-03** (reload-persistence, effort M, confirmed): Pack wavetables register only when a synth panel mounts, so 81 of 82 SERUM presets play basic waveforms after reload and in exports. `src/daw/oracle-synth/store/presets/packLoader.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/audio/wavetableImport.ts`
- **synth-store-04** (correctness, effort S, confirmed): Oracle LFO/arp tempo is frozen per patch: synth-store bpm is never updated, and only the open engine follows the DAW tempo. `src/daw/oracle-synth/store/slices/globalSlice.ts`, `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/hooks/useStoreBridge.ts`
- **synth-store-05** (reload-persistence, effort M, confirmed): Unopened Oracle tracks have no patch and inherit whatever the singleton store last held; the store and cache are never reset. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/hooks/useStoreBridge.ts`, `src/daw/persistence/SessionSerializer.ts`
- **synth-store-09** (performance, effort M, confirmed): Every patch application rebuilds full-sample-rate LFO buffers ~36-40 times (track select, tab return, pop-out, load, preset switch). `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/hooks/useStoreBridge.ts`

### synth-ui

- **synth-ui-01** (reload-persistence, effort S, confirmed): Saved synth patches replay without reverb and at a stale tempo after reload and in exports. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/hooks/useStoreBridge.ts`
- **synth-ui-02** (correctness, effort M, confirmed): Wavetable-position/blend modulation never runs in the DAW (50 of 82 bundled pack presets use it). `src/daw/oracle-synth/hooks/useWtPosModulation.ts`, `src/daw/oracle-synth/components/layout/SynthLayout.tsx`, `src/daw/components/Controls/DawSynthLayout.tsx`
- **synth-ui-03** (correctness, effort S, confirmed): The LFO node editor maps the pointer wrongly in the scaled pop-out. `src/daw/oracle-synth/components/visualizers/LFONodeEditor.tsx`, `src/daw/components/Controls/DawSynthLayout.tsx`, `src/daw/hooks/useContainerScale.ts`
- **synth-ui-05** (ux, effort M, confirmed): The preset workflow loses student work: same-name saves become unreachable, and INIT or a preset switch wipes edits with no confirm or undo. `src/daw/oracle-synth/components/preset/PresetSelector.tsx`, `src/daw/oracle-synth/components/preset/PresetSelector.module.css`, `src/daw/oracle-synth/store/slices/presetSlice.ts`
- **synth-ui-06** (correctness, effort S, confirmed): QWERTY playing in the pop-out changes focused dropdowns and toggles the metronome and loop. `src/daw/oracle-synth/hooks/useKeyboardShortcuts.ts`, `src/daw/oracle-synth/components/controls/Dropdown.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **synth-ui-08** (ux, effort L, confirmed): The pop-out is a fixed 1440×932 canvas scaled to fit, so its 8-10px labels render at about 5-7px. `src/daw/oracle-synth/components/layout/SynthLayout.module.css`, `src/daw/components/Controls/DawSynthLayout.tsx`, `src/daw/hooks/useContainerScale.ts`
- **synth-ui-09** (correctness, effort M, confirmed): The FX panel misrepresents the audio chain: effects with no slot, a TARGET control that does nothing, and slot order that isn't processing order. `src/daw/oracle-synth/components/fx/FXPanel.tsx`, `src/daw/oracle-synth/components/fx/FXSlot.tsx`, `src/daw/oracle-synth/store/slices/presetSlice.ts`
- **synth-ui-10** (correctness, effort M, confirmed): LFO edits are destructive: a rate change redraws the whole bar, and the hidden zoom view inserts zero dips. `src/daw/oracle-synth/components/layout/LFOArea.tsx`, `src/daw/oracle-synth/components/layout/LFOArea.module.css`

### timeline

- **timeline-02** (reload-persistence, effort M, confirmed): Markers are never saved, never cleared between projects, and can't be undone. `src/daw/store/markersSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/undoMiddleware.ts`
- **timeline-03** (reload-persistence, effort M, confirmed): Time signature, MIDI clip length and CC data, and master volume and FX are lost on reload and leak between projects. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/tracksSlice.ts`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`
- **timeline-04** (correctness, effort S, confirmed): The scissors tool compares clip-relative MIDI note ticks with an absolute split tick. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **timeline-05** (correctness, effort M, confirmed): Dragging any MIDI clip shifts the whole chord lane. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **timeline-07** (performance, effort L, confirmed): Every redraw rescans raw audio samples, and almost any edit triggers a full redraw. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/audio/AudioBufferStore.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`
- **timeline-10** (ux, effort S, confirmed): Clip moves, trims and the note marquee show no visual feedback while the transport is playing. `src/daw/components/Timeline/Timeline.tsx`

## Medium (364)

### audio-analysis

- **audio-analysis-06** (correctness, effort L, partially): The pedal layer is realtime-only, so exports bounce guitar/bass/vocal tracks raw. `src/daw/audio/renderProject.ts`, `src/daw/audio/pedals/WahPedal.ts`, `src/daw/audio/pitch-correction/PitchCorrectionNode.ts`
- **audio-analysis-07** (performance, effort M, confirmed): Each knob pointermove rewires the whole guitar chain, re-applies every pedal's parameters with no ramps, and writes the chain to the store and collab. `src/daw/audio/GuitarPedalChain.ts`, `src/daw/audio/pedals/OverdrivePedal.ts`, `src/daw/audio/pedals/NamAmpPedal.ts`
- **audio-analysis-08** (performance, effort M, confirmed): Loading a NAM model stalls the audio thread; concurrent loads race on a single resolver; no loading or error feedback. `src/daw/audio/nam/NamWorkletNode.ts`, `src/daw/audio/nam/NamModelStore.ts`, `src/daw/audio/pedals/NamAmpPedal.ts`
- **audio-analysis-09** (correctness, effort M, confirmed): The wah's envelope follower runs on main-thread requestAnimationFrame: zipper noise, frame-rate-dependent timing, and it freezes on jank. `src/daw/audio/pedals/WahPedal.ts`
- **audio-analysis-10** (correctness, effort S, confirmed): Audio chord proposals assume C major when no key is set; the live detector keeps a stale 'detected' key across projects. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/audio/OfflineChordAnalyzer.ts`, `src/daw/store/musicIntelligenceSlice.ts`
- **audio-analysis-11** (correctness, effort S, confirmed): Offline chord timing is early and measured from the take start, not the project's bars. `src/daw/audio/OfflineChordAnalyzer.ts`, `src/daw/hooks/useAudioChordDetection.ts`
- **audio-analysis-12** (correctness, effort M, confirmed): The offline analyzer has no tuning compensation at twice the FFT resolution, and duplicates about 300 lines of the live detector that have already diverged. `src/daw/audio/OfflineChordAnalyzer.ts`, `src/daw/audio/AudioChordDetector.ts`
- **audio-analysis-13** (performance, effort S, confirmed): The live detector writes to the store about 40 times a second while a student strums, mostly unchanged values. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/store/musicIntelligenceSlice.ts`, `src/daw/components/Controls/TunerDisplay.tsx`
- **audio-analysis-14** (performance, effort S, confirmed): Pitch info re-renders the 2,445-line VocalView about 20 times a second while auto-tune is on; worklet failures are silent. `src/daw/audio/pitch-correction/PitchCorrectionNode.ts`, `src/daw/audio/pedals/PitchCorrectionPedal.ts`, `src/daw/hooks/usePitchInfo.ts`
- **audio-analysis-15** (correctness, effort M, confirmed): Recording a take replaces the whole-song Insight (UNISON) analysis with an analysis of just that take, placed at tick 0. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/store/unisonSlice.ts`, `src/unison/converters/audioToUnison.ts`
- **audio-analysis-16** (ux, effort M, confirmed): Students can't ask 'what chords did I play?' about a recording on demand, and get no progress or source feedback. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/utils/chordAnalysis.ts`, `src/daw/components/Library/ChordSymbolsSection.tsx`

### audio-core

- **audio-core-10** (correctness, effort L, confirmed): Gate and sidechain ducker run as main-thread timer loops: late and jittery live, missing or random in exports. `src/daw/audio/EffectChain.ts`, `src/daw/audio/TrackEngine.ts`, `src/daw/audio/renderProject.ts`
- **audio-core-11** (performance, effort M, confirmed): Every change to the tracks list re-applies every track's whole effect chain (twice while playing), and automation re-anchoring briefly snaps automated controls to their fader values. `src/daw/audio/EffectChain.ts`, `src/daw/audio/AutomationScheduler.ts`, `src/daw/audio/TrackEngine.ts`
- **audio-core-12** (correctness, effort S, confirmed): The crush stage is not neutral when off: every track, return and master passes through a tanh soft-clipper (+2.4 dB) that hard-clips at 0 dBFS. `src/daw/audio/EffectChain.ts`
- **audio-core-13** (correctness, effort M, confirmed): The de-esser doesn't target a frequency: its band filter is never connected, so FREQUENCY does nothing and the whole vocal gets compressed. `src/daw/audio/EffectChain.ts`, `src/daw/components/Effects/EffectsPanel.tsx`
- **audio-core-15** (ux, effort S, confirmed): Recording failures are silent, and the microphone is never released. `src/daw/audio/AudioRecorder.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **audio-core-16** (performance, effort M, confirmed): Faders, sends and effect parameters jump with no smoothing, and changing reverb Decay rebuilds impulse responses on the main thread. `src/daw/audio/TrackEngine.ts`, `src/daw/audio/EffectChain.ts`, `src/daw/audio/reverbIR.ts`
- **audio-core-18** (ux, effort S, confirmed): The playhead runs about 100 ms (plus output latency) ahead of what students hear, and live drum pads add the same delay. `src/daw/audio/AudioEngine.ts`, `src/daw/hooks/useTransport.ts`, `src/daw/instruments/DrumMachineEngine.ts`
- **audio-core-19** (performance, effort L, confirmed): Every track builds a ~64-node effect graph and keeps 8 EQ filters, a compressor and an oversampled waveshaper in the signal path even with all effects off. `src/daw/audio/EffectChain.ts`, `src/daw/audio/TrackEngine.ts`
- **audio-core-20** (ux, effort M, confirmed): Export is slow and gives little feedback, and the result differs from playback in ways the dialog doesn't mention. `src/daw/audio/renderProject.ts`, `src/daw/audio/exportAudio.ts`, `src/daw/components/Transport/ExportAudioDialog.tsx`
- **audio-core-23** (ux, effort S, confirmed): The output-device picker can never appear, because supportsOutputSelection checks the wrapper context, which has no setSinkId. `src/daw/audio/AudioEngine.ts`, `src/daw/components/Transport/SettingsModal.tsx`

### bundle-load

- **bundle-load-06** (performance, effort S, partially): The 1.13 MB editor chunk is only requested after auth bootstrap and the songs bundle, behind a dashboard-shaped skeleton. `src/features/classroom/ClassroomPages.tsx`, `src/content/ContentGate.tsx`, `src/daw/DawApp.tsx`
- **bundle-load-07** (performance, effort S, confirmed): MeshGradientBg redraws four full-viewport gradients every frame, hidden behind an opaque background. `src/daw/components/MeshGradientBg.tsx`, `src/daw/DawApp.tsx`
- **bundle-load-08** (performance, effort L, confirmed): One 1.13 MB DAW chunk with no internal code-splitting; secondary views and instrument UIs load at boot. `src/daw/DawApp.tsx`, `src/daw/components/Controls/TrackControlsPanel.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`
- **bundle-load-09** (performance, effort S, confirmed): No prefetch from the Studio dashboard or the view switcher. `src/components/ClassroomLayout/studio/StudioInlet.tsx`, `src/components/ClassroomLayout/studio/StudioNewProject.tsx`, `src/components/ClassroomLayout/studio/StudioRecentProjects.tsx`
- **bundle-load-10** (reload-persistence, effort M, confirmed): Opening a saved project has no loading state, failure silently swaps in a different project, and sign-in drops the boot intent. `src/daw/DawApp.tsx`, `src/contexts/AuthContext/ProtectedPage.tsx`, `src/daw/persistence/SessionSerializer.ts`
- **bundle-load-11** (correctness, effort S, confirmed): Core instrument samples come from third-party GitHub Pages, and the default grand piano can hang forever. `src/daw/instruments/PianoSampler.ts`, `src/daw/instruments/SamplerInstrument.ts`, `src/daw/instruments/sampleConfigs.ts`
- **bundle-load-13** (performance, effort S, confirmed): No caching policy for 67 MB of DAW assets; engines and decoded samples are thrown away every time the editor is left. `vercel.json`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/instruments/DrumMachineEngine.ts`
- **bundle-load-14** (performance, effort S, partially): Global CSS blocks first paint on two Google Fonts @imports; the UI font ships as OTF. `src/index.css`, `index.html`, `src/daw/daw.css`
- **bundle-load-15** (performance, effort M, confirmed): The DAW runtime is pulled into the global entry for every route. `src/hooks/data/index.ts`, `src/hooks/data/useRecentActivity.ts`, `src/lib/studio-projects/api.ts`
- **bundle-load-16** (correctness, effort S, confirmed): No editor-level error boundary or recovery from failed chunk loads. `src/components/GlobalErrorBoundary.tsx`, `src/daw/DawApp.tsx`, `vercel.json`

### collab

- **collab-06** (performance, effort M, confirmed): Every remote change rebuilds every track, defeating all memoization downstream. `src/daw/collab/yjsToZustand.ts`, `src/daw/collab/YjsDocManager.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **collab-08** (correctness, effort S, confirmed): Any remote track change wipes each user's local input routing. `src/daw/collab/YjsDocManager.ts`, `src/daw/collab/yjsToZustand.ts`
- **collab-09** (ux, effort M, confirmed): Socket status is treated as session membership: every blip looks like the session ended and re-enables destructive actions. `src/daw/collab/collabSlice.ts`, `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/ui/CollabToolbar.tsx`
- **collab-11** (correctness, effort S, confirmed): Live score/lead-sheet marks are written to the doc but never applied by peers. `src/daw/collab/yjsToZustand.ts`, `src/daw/collab/diffEngine.ts`
- **collab-12** (reload-persistence, effort M, confirmed): Refresh and navigation: hosts end the room with no warning, joiners can't get back, and stale room identity triggers unwanted rejoins. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/collabSlice.ts`, `src/daw/DawApp.tsx`
- **collab-17** (correctness, effort S, confirmed): Deletions are inferred as 'in the doc but not in my store', so peers' tracks get deleted when the two are out of sync. `src/daw/collab/diffEngine.ts`, `src/daw/collab/yjsToZustand.ts`
- **collab-18** (correctness, effort S, confirmed): Partial field diffs: chord-region edits and MIDI CC changes never reach peers. `src/daw/collab/diffEngine.ts`, `src/daw/collab/YjsDocManager.ts`
- **collab-19** (correctness, effort S, confirmed): Collab undo covers only tracks, chord regions and markers, so Cmd-Z reverts an unrelated earlier edit. `src/daw/collab/CollabProvider.tsx`, `src/daw/store/undoMiddleware.ts`
- **collab-20** (ux, effort M, confirmed): Three separate side columns and four transport-bar controls for one session. `src/daw/DawApp.tsx`, `src/daw/collab/ui/UserList.tsx`, `src/daw/collab/ui/ChatPanel.tsx`
- **collab-21** (visual-design, effort S, confirmed): Presence colours often collide and reuse the record/play colours. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/types.ts`, `src/daw/collab/ui/UserList.tsx`
- **collab-22** (ux, effort M, confirmed): Selecting a track locks it indefinitely, and the host has no moderation controls. `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/ui/UserList.tsx`, `src/daw/collab/ui/KickedModal.tsx`
- **collab-23** (performance, effort S, confirmed): Live-audio activity level re-renders track headers almost every frame. `src/daw/collab/studioListenStore.ts`, `src/daw/collab/presence.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **collab-24** (correctness, effort S, confirmed): WebRTC setup can deadlock when a joiner hasn't clicked yet. `src/daw/collab/StudioRtcManager.ts`, `src/daw/collab/studioRealtime.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **collab-25** (accessibility, effort M, confirmed): Collab UI has no ARIA attributes, unlabelled controls and 7-9 px text (adds to A11Y#6/#8/#14/#19). `src/daw/collab/ui/ChatPanel.tsx`, `src/daw/collab/ui/CollabToolbar.tsx`, `src/daw/collab/ui/UserList.tsx`
- **collab-26** (ux, effort S, confirmed): Leaving reloads the whole app, the saved copy isn't opened, and the host isn't warned that leaving ends the session. `src/daw/collab/ui/LeaveSavePrompt.tsx`, `src/lib/studio-projects/newProject.ts`

### design-system

- **design-system-02** (accessibility, effort S, partially): Primary buttons and colour-filled labels put white text on teal, key, track and presence colours (1.5-2.3:1). `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Tutorial/CoachCard.tsx`, `src/daw/components/Prism/RootNoteSelector.tsx`
- **design-system-03** (performance, effort M, confirmed): Dragging a volume fader re-renders 24 store subscribers and redraws the Timeline canvas on every pointer move. `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **design-system-05** (code-health, effort M, confirmed): Token values have three sources of truth; the inline runtime copy overrides daw.css, so the A11Y#7 fix as written would not take effect. `src/daw/constants/themes.ts`, `src/daw/hooks/useTheme.ts`, `src/daw/daw.css`
- **design-system-06** (performance, effort S, confirmed): MeshGradientBg redraws an invisible full-viewport canvas at 60fps for the whole session, in the retired brand colours. `src/daw/components/MeshGradientBg.tsx`, `src/daw/DawApp.tsx`, `src/daw/daw.css`
- **design-system-07** (visual-design, effort M, confirmed): Colour carries no consistent meaning: teal for everything, amber primaries, decorative palettes, and key selection repaints every track. `src/daw/components/Transport/ExportAudioDialog.tsx`, `src/daw/components/Effects/FxShared.tsx`, `src/daw/components/Controls/GroovesBrowser.tsx`
- **design-system-08** (visual-design, effort L, confirmed): Tiny type is the DAW's default; the medium and semibold weights don't exist; numeric readouts jitter. `src/daw/components/Library/UnisonSections.tsx`, `src/daw/components/Library/SelectionAnalysis.tsx`, `src/daw/components/Library/InsightContent.tsx`
- **design-system-09** (code-health, effort L, confirmed): Core controls are implemented 5-7 times with different behaviour; the shared Radix kit is barely used. `src/daw/components/Controls/RotaryKnob.tsx`, `src/daw/oracle-synth/components/controls/Knob.tsx`, `src/daw/components/Studio/StudioView.tsx`
- **design-system-10** (ux, effort M, confirmed): Layout and density: fixed 33vh dock, three stacking 200-240px side panels, split transport, Add Track menu that clips on narrow screens. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/collab/ui/UserList.tsx`
- **design-system-11** (reload-persistence, effort S, confirmed): Side panels remount on every view switch; layout state survives SPA navigation but not a refresh; clipColorMode is never saved. `src/daw/DawApp.tsx`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/store/uiSlice.ts`
- **design-system-12** (performance, effort S, partially): Panels animate width/height beside canvases, there is no reduced-motion support, and hover is JS-driven. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/collab/ui/UserList.tsx`, `src/daw/collab/ui/ChatPanel.tsx`
- **design-system-13** (accessibility, effort M, confirmed): Hand-rolled Studio overlays lack dialog semantics, focus handling and Escape; the audio-device pickers are keyboard-inoperable. `src/daw/collab/ui/KickedModal.tsx`, `src/daw/collab/ui/InviteModal.tsx`, `src/daw/collab/ui/WaitingForSessionModal.tsx`
- **design-system-14** (ux, effort S, confirmed): Core flows use native window.prompt/confirm; Delete Project sits in the main File list styled like a disabled item. `src/daw/components/Transport/FileMenu.tsx`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/components/Timeline/Timeline.tsx`

### dock-instruments

- **dock-instruments-04** (reload-persistence, effort S, confirmed): Drum pad volume and pan reach the audio engine only while the drum view is open, and the first volume tweak re-centres a pad's pan. `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/store/tracksSlice.ts`
- **dock-instruments-06** (performance, effort S, partially): DrumMachineView re-renders its entire editor about 30 times a second during playback just to move a 1px playhead. `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/hooks/useTransport.ts`
- **dock-instruments-07** (correctness, effort S, partially): Groove preview: two previews can overlap, audio can't be stopped after leaving the tab, and timing drifts. `src/daw/components/Controls/GroovesBrowser.tsx`, `src/daw/audio/TrackEngine.ts`
- **dock-instruments-11** (ux, effort S, partially): The Grooves browser has six controls that do nothing, plus four genres with no grooves. `src/daw/components/Controls/GroovesBrowser.tsx`, `src/daw/data/groovesLibrary.ts`
- **dock-instruments-12** (reload-persistence, effort S, confirmed): The dock re-opens on CONTROLS after every view switch or return to the editor, and panels forget their settings on each tab switch. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/DawApp.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`
- **dock-instruments-13** (performance, effort M, confirmed): Knob, drawbar, pad-knob and grid drags write to the store on every pointer move, and each write fans out across the app. `src/daw/components/Controls/OrganView.tsx`, `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/store/undoMiddleware.ts`
- **dock-instruments-14** (performance, effort M, confirmed): The inline synth mounts 14 panels in a ~3,200px strip and runs five 30fps canvas loops even when silent or off-screen. `src/daw/components/Controls/OracleSynthInline.tsx`, `src/daw/oracle-synth/hooks/useAnimationFrame.ts`, `src/daw/components/Controls/TrackControlsPanel.tsx`
- **dock-instruments-15** (correctness, effort S, confirmed): The pop-out mounts a second copy of the instrument, and its button covers KeyboardView's Piano Roll toggle. `src/daw/components/Controls/TrackControlsPanel.tsx`, `src/daw/components/Controls/KeyboardView.tsx`
- **dock-instruments-16** (ux, effort M, confirmed): The instrument preset browser is squeezed into the 140px keyboard strip. `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/Controls/PresetBrowser.tsx`
- **dock-instruments-17** (ux, effort S, confirmed): Fake or dead controls in the instrument views. `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/Controls/PresetBrowser.tsx`, `src/daw/components/Controls/DrumMachineView.tsx`
- **dock-instruments-18** (correctness, effort S, confirmed): Drum grid: pad labels can scroll out of line with the rows, tool keys fire with Cmd held, and the kit menu never closes on its own. `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **dock-instruments-19** (visual-design, effort M, confirmed): Dock surfaces drift from the Music Atlas look: rainbow accents, hard-coded hex colours and text under 11px. `src/daw/components/Controls/GroovesBrowser.tsx`, `src/daw/components/Controls/OrganView.tsx`, `src/daw/components/Controls/OrganView.module.css`
- **dock-instruments-20** (accessibility, effort M, confirmed): Four incompatible knob implementations, none of which can be operated from the keyboard. `src/daw/components/Controls/RotaryKnob.tsx`, `src/daw/components/Controls/OrganView.tsx`, `src/daw/components/Controls/OrganView.module.css`
- **dock-instruments-21** (accessibility, effort S, confirmed): PopOutOverlay (shared by four surfaces) isn't a real dialog and can close on stray clicks. `src/daw/components/ChannelStrip/PopOutOverlay.tsx`

### engine-hooks

- **engine-hooks-02** (performance, effort M, confirmed): Engine hooks re-render the whole unmemoized editor on every drag frame. `src/daw/DawApp.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useTransport.ts`
- **engine-hooks-08** (performance, effort S, confirmed): Recording effects write the store on every edit, doubling Timeline renders and full canvas redraws. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useMidiRecording.ts`, `src/daw/store/transportSlice.ts`
- **engine-hooks-10** (correctness, effort S, confirmed): Live MIDI note-offs go to whichever track is targeted at release time, so notes hang. `src/daw/hooks/useMidiInputRouting.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **engine-hooks-14** (correctness, effort M, confirmed): Any edit while playing makes automated parameters jump to their fader value for ~100 ms. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/AutomationScheduler.ts`, `src/daw/audio/TrackEngine.ts`
- **engine-hooks-16** (reload-persistence, effort M, confirmed): Missing audio is invisible after a reload: failed downloads retry on every edit, and un-uploaded takes come back as a fake waveform. `src/daw/hooks/useCollabAudioLoader.ts`, `src/lib/studio-assets/load-audio.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **engine-hooks-17** (performance, effort M, partially): The tuner runs heavy YIN pitch detection every frame and can never show an error. `src/daw/hooks/useTuner.ts`, `src/audio/pitch/YinCore.ts`, `src/daw/components/Controls/TunerDisplay.tsx`
- **engine-hooks-18** (correctness, effort S, confirmed): A zero-length loop is passed to Tone unchecked and fires the loop handler on every tick. `src/daw/hooks/useTransport.ts`, `src/daw/store/transportSlice.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **engine-hooks-19** (performance, effort S, confirmed): The chord detector writes to the store ~40 times a second, and its intended consumer is never mounted. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/store/musicIntelligenceSlice.ts`, `src/daw/hooks/useLiveUnisonAnalysis.ts`
- **engine-hooks-20** (performance, effort S, confirmed): Instruments that finish loading after their engine was replaced are leaked. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/TrackEngine.ts`
- **engine-hooks-21** (correctness, effort S, confirmed): Components read the engine registry during render, so meters bind to missing or disposed analysers. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/Effects/EffectsPanel.tsx`
- **engine-hooks-22** (correctness, effort S, confirmed): The first downbeat after a count-in lands late. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useTransport.ts`
- **engine-hooks-23** (reload-persistence, effort S, confirmed): Leaving and re-entering the editor leaves the shared transport running and audio off until the next click. `src/daw/hooks/useTransport.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useAudioEngine.ts`
- **engine-hooks-24** (ux, effort S, confirmed): The on-screen playhead runs ahead of what students hear. `src/daw/hooks/useTransport.ts`
- **engine-hooks-25** (performance, effort M, confirmed): The 30 fps playhead goes through the main store and wakes every whole-store listener. `src/daw/hooks/useTransport.ts`, `src/daw/hooks/useAutosave.ts`, `src/daw/collab/CollabProvider.tsx`
- **engine-hooks-26** (performance, effort M, confirmed): Always-on polling loops run while the editor is idle. `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/hooks/useGuitarMidiDetection.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **engine-hooks-27** (ux, effort S, confirmed): Device status misleads: red 'MIDI unavailable, use Chrome/Edge' with no keyboard plugged in, and a blocked mic looks like 'no device'. `src/daw/hooks/useMidiDevices.ts`, `src/daw/midi/MidiDeviceManager.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **engine-hooks-28** (correctness, effort S, confirmed): A new Oracle Synth track opens with the previous synth track's patch. `src/daw/hooks/useStoreBridge.ts`, `src/daw/oracle-synth/synthTrackState.ts`
- **engine-hooks-29** (performance, effort S, confirmed): Synth panels re-render on every edit and say 'not available' while the synth is just loading. `src/daw/hooks/useOracleSynthInstance.ts`, `src/daw/components/Controls/OracleSynthInline.tsx`
- **engine-hooks-30** (ux, effort M, confirmed): MIDI import drops tempo, time signature, sustain pedal and instruments. `src/daw/midi/MidiFileIO.ts`, `src/daw/components/Transport/FileMenu.tsx`
- **engine-hooks-31** (accessibility, effort M, partially): Synth pop-out text shrinks to 5-7 px, and the panel flashes at half size on open. `src/daw/hooks/useContainerScale.ts`, `src/daw/components/Controls/DawSynthLayout.tsx`

### fx-mixer

- **fx-mixer-03** (correctness, effort M, confirmed): The 'LUFS' readout is the peak level rescaled, not a loudness measurement. `src/daw/components/Studio/StudioView.tsx`, `src/daw/hooks/useMeterLevel.ts`
- **fx-mixer-08** (correctness, effort S, confirmed): Undo ignores mastering and return-bus edits, so Cmd+Z undoes an unrelated earlier edit. `src/daw/store/undoMiddleware.ts`, `src/daw/store/masteringSlice.ts`, `src/daw/store/returnsSlice.ts`
- **fx-mixer-09** (correctness, effort M, confirmed): The FX chain is drawn in the order effects were added, but the audio runs in a fixed order. `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/audio/EffectChain.ts`, `src/daw/store/tracksSlice.ts`
- **fx-mixer-10** (correctness, effort S, confirmed): Meters and the EQ spectrum lock onto audio nodes at render time and go dead after an engine is created or rebuilt. `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Studio/StudioView.tsx`, `src/daw/hooks/usePlaybackEngine.ts`
- **fx-mixer-11** (ux, effort M, confirmed): The docked rack is a wall of knobs; the visualizers are only behind an unlabelled pop-out. `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Effects/FxShared.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`
- **fx-mixer-12** (ux, effort M, confirmed): The mixer has no way to reach a track's effects. `src/daw/DawApp.tsx`, `src/daw/components/Studio/StudioView.tsx`
- **fx-mixer-13** (correctness, effort S, confirmed): The master fader's dB readout is wrong and disagrees with the CREATE view. `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`, `src/daw/hooks/usePlaybackEngine.ts`
- **fx-mixer-14** (ux, effort S, confirmed): Strip readouts and labels are unclear: peak shown instead of fader value, fake stereo meters, unlabelled sends, return strips without meters. `src/daw/components/Studio/StudioView.tsx`, `src/daw/audio/TrackEngine.ts`, `src/daw/components/Tutorial/tutorials.ts`
- **fx-mixer-15** (performance, effort S, confirmed): Spectrum analyser never resizes, redraws everything every frame, and retunes the shared meter analysers. `src/daw/components/Studio/StudioView.tsx`, `src/daw/audio/AudioEngine.ts`, `src/daw/components/Effects/GraphicEQ.tsx`
- **fx-mixer-17** (ux, effort S, confirmed): Knob drags on touch screens are likely to scroll the panel instead of turning the knob. `src/daw/components/Controls/RotaryKnob.tsx`, `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Studio/StudioView.tsx`
- **fx-mixer-18** (correctness, effort S, confirmed): Reverb DECAY isn't clamped when the type changes, and the reverb plot puts filter frequencies on its time axis. `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/components/Effects/visualizers/ReverbDecay.tsx`, `src/daw/audio/reverbIR.ts`
- **fx-mixer-19** (ux, effort S, confirmed): The FX list can be dragged but nothing accepts the drop, and the 5-effect cap is silent. `src/daw/components/Effects/FxBrowser.tsx`, `src/daw/components/Timeline/Timeline.tsx`, `src/daw/components/Tutorial/tutorials.ts`
- **fx-mixer-20** (reload-persistence, effort M, confirmed): Collab sends whole effect and return objects on every drag step, so simultaneous edits overwrite each other. `src/daw/collab/diffEngine.ts`
- **fx-mixer-22** (visual-design, effort M, confirmed): Rack and mixer styling departs from the Music Atlas look, with many 6-9 px labels. `src/daw/components/Effects/FxShared.tsx`, `src/daw/components/Effects/EffectsPanel.tsx`, `src/daw/data/libraryItems.ts`

### ia-flows

- **ia-flows-06** (correctness, effort S, confirmed): New projects, demos, templates, lessons and cloud opens inherit the previous project's time signature, markers, mastering, returns and Score layout. `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-projects/newProject.ts`, `src/daw/store/tutorialSlice.ts`
- **ia-flows-15** (correctness, effort S, confirmed): Prism 'Create' silently replaces the track's clips and the song's chord lane. `src/daw/store/prismSlice.ts`, `src/daw/components/Prism/PrismStudio.tsx`
- **ia-flows-17** (performance, effort M, confirmed): Vocal pitch analysis blocks the main thread for seconds. `src/daw/components/PitchEditor/PitchEditorModal.tsx`, `src/daw/audio/pitch-analysis/PitchAnalyzer.ts`, `src/audio/pitch/YinCore.ts`
- **ia-flows-20** (performance, effort S, confirmed): MeshGradientBg animates an invisible full-viewport canvas forever. `src/daw/components/MeshGradientBg.tsx`, `src/daw/DawApp.tsx`, `src/daw/daw.css`
- **ia-flows-21** (reload-persistence, effort S, confirmed): Panels lose their state whenever the student switches views. `src/daw/store/uiSlice.ts`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`
- **ia-flows-22** (ux, effort M, confirmed): The right side is three stacked panels, a near-empty Library, and toggles that do nothing in Score/Lead Sheet. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/data/libraryItems.ts`, `src/daw/DawApp.tsx`
- **ia-flows-23** (ux, effort M, confirmed): The bottom dock is a fixed 33vh drawer whose tabs come and go with track type, and pop-outs mount a second copy. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/TrackControlsPanel.tsx`, `src/daw/components/Prism/PrismPanel.tsx`
- **ia-flows-24** (ux, effort M, confirmed): TransportBar is overloaded, doesn't adapt to the current view, and overflows at 1366 px. `src/daw/components/Transport/TransportBar.tsx`, `src/daw/collab/ui/CollabToolbar.tsx`
- **ia-flows-25** (ux, effort S, confirmed): First run: no empty state, a 10 px 'Add Track' link, and a track picker with jargon and a dead end. `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/daw/components/Mixer/AddTrackMenu.tsx`, `src/daw/components/Controls/TrackControlsPanel.tsx`
- **ia-flows-26** (ux, effort S, confirmed): Key setting is duplicated, and Suggest Chords and markers are right-click only. `src/daw/components/Transport/TransportBar.tsx`, `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **ia-flows-27** (ux, effort S, confirmed): The view doesn't follow the playhead during playback. `src/daw/hooks/useTransport.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **ia-flows-28** (reload-persistence, effort S, confirmed): Lesson and Practice state live only in memory. `src/daw/store/tutorialSlice.ts`, `src/daw/DawApp.tsx`, `src/daw/store/uiSlice.ts`
- **ia-flows-29** (performance, effort S, confirmed): The lesson spotlight forces layout and repaints the whole screen every frame. `src/daw/components/Tutorial/Spotlight.tsx`, `src/daw/components/Tutorial/targetRect.ts`, `src/daw/components/Tutorial/TutorialLayer.tsx`
- **ia-flows-30** (performance, effort S, confirmed): Lead Sheet and Practice screens fully re-render on every playhead tick. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/Practice/PracticeTrackView.tsx`, `src/daw/components/Transport/TransportBar.tsx`
- **ia-flows-31** (performance, effort S, confirmed): Insight re-runs the full theory analysis after mixer tweaks. `src/daw/components/Library/InsightContent.tsx`, `src/daw/store/unisonSlice.ts`
- **ia-flows-32** (visual-design, effort M, confirmed): Off-brand colour and low-contrast primary buttons. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Tutorial/CoachCard.tsx`, `src/daw/collab/ui/CollabToolbar.tsx`
- **ia-flows-33** (accessibility, effort M, confirmed): Four different dialog mechanisms, two of them without dialog semantics. `src/daw/collab/ui/KickedModal.tsx`, `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/daw/components/ChannelStrip/PopOutOverlay.tsx`
- **ia-flows-34** (correctness, effort S, confirmed): Time signature is ignored outside the timeline. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/components/Transport/FileMenu.tsx`
- **ia-flows-35** (correctness, effort S, confirmed): Mix view has a dead 'Gain Match' button and a 'LUFS' meter that isn't LUFS. `src/daw/components/Studio/StudioView.tsx`
- **ia-flows-36** (ux, effort S, confirmed): Track headers pack 12 controls into 200x80 px and show the collab-only 'Release' button in solo sessions. `src/daw/components/TrackControls/TrackHeader.tsx`

### insight

- **insight-02** (performance, effort M, partially): Insight re-runs the whole UNISON analysis on the main thread after any track edit and every time it mounts. `src/daw/components/Library/InsightContent.tsx`, `src/daw/store/unisonSlice.ts`, `src/daw/store/tracksSlice.ts`
- **insight-04** (performance, effort S, partially): Opening or closing the panel animates its width, re-rendering the Timeline and reallocating its canvas every frame. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/DawApp.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **insight-06** (correctness, effort S, partially): Alternate-key chips silently re-key the project, and Cmd-Z then leaves the chord lane and the key out of sync. `src/daw/components/Library/KeySection.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/store/undoMiddleware.ts`
- **insight-07** (ux, effort M, partially): 'Now Playing' ignores the song's playback and the QWERTY/on-screen keyboard. `src/daw/components/Library/InsightContent.tsx`, `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/store/midiDeviceSlice.ts`
- **insight-08** (reload-persistence, effort S, confirmed): Insight's Learn links leave the editor; coming back restores an older autosave and wipes Insight state. `src/daw/components/Library/ChordCard.tsx`, `src/daw/components/Library/InsightContent.tsx`, `src/daw/hooks/useAutosave.ts`
- **insight-09** (performance, effort M, confirmed): The whole Insight tree re-renders on every track edit and every MIDI key press. `src/daw/components/Library/InsightContent.tsx`, `src/daw/components/Library/ChordSymbolsSection.tsx`, `src/daw/components/Library/SelectionAnalysis.tsx`
- **insight-10** (performance, effort S, confirmed): Live chord and tuning are written to the store about 20 times a second with no change check; the live-analysis consumer is dead. `src/daw/store/musicIntelligenceSlice.ts`, `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/hooks/useAutosave.ts`
- **insight-11** (reload-persistence, effort S, confirmed): Panel open state, tab and scroll position are not saved and are overridden by view switches. `src/daw/store/uiSlice.ts`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/DawApp.tsx`
- **insight-12** (correctness, effort S, confirmed): 'Analyze Chords' results depend on whether Insight had already run, and two writers race for unisonDoc. `src/daw/store/unisonSlice.ts`, `src/daw/utils/chordAnalysis.ts`, `src/daw/components/Library/ChordAnalysisPrompt.tsx`
- **insight-13** (ux, effort S, confirmed): Misleading error, empty and loading states in Insight. `src/daw/components/Library/InsightContent.tsx`, `src/daw/store/unisonSlice.ts`
- **insight-14** (correctness, effort S, confirmed): Chord cards follow Prism's unsaved builder sequence instead of the chord lane. `src/daw/components/Library/InsightContent.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/persistence/SessionSerializer.ts`
- **insight-15** (correctness, effort S, confirmed): Chord-selection analysis stays 'current' after the selected chords change. `src/daw/utils/insightSelection.ts`, `src/daw/components/Library/SelectionAnalysis.tsx`, `src/daw/store/prismSlice.ts`
- **insight-16** (correctness, effort S, confirmed): Key name is misspelled for sharp keys, leaves out the mode, and shows the detector's confidence. `src/daw/components/Library/KeySection.tsx`, `src/daw/components/Library/InsightContent.tsx`, `src/daw/components/Library/ChordSymbolsSection.tsx`
- **insight-17** (ux, effort L, confirmed): Insight's content order follows the code, not the student, and is crammed into a fixed 200px column. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/components/Library/InsightContent.tsx`, `src/daw/components/Library/ChordCard.tsx`
- **insight-18** (ux, effort S, confirmed): The Library tab is four non-draggable templates, and the top-bar toggle says 'Library' while the panel is Insight. `src/daw/data/libraryItems.ts`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/components/Transport/TransportBar.tsx`
- **insight-20** (accessibility, effort S, confirmed): Accessibility gaps not covered by the 2026-09-20 audit. `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/components/Library/ChordCard.tsx`, `src/daw/components/Library/InsightContent.tsx`

### instruments

- **instruments-04** (ux, effort M, confirmed): No readiness model: sounds load only after the first click, Play doesn't wait, and early notes are silently dropped. `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/TrackEngine.ts`, `src/daw/instruments/InstrumentAdapter.ts`
- **instruments-05** (performance, effort L, confirmed): Sample strategy: no shared buffer cache, a 19 MB padded default drum kit, a 31 MB SoundFont, and full rebuilds on re-entry and export. `src/daw/instruments/DrumMachineEngine.ts`, `src/daw/instruments/drumKits.ts`, `src/daw/instruments/PianoSampler.ts`
- **instruments-06** (correctness, effort S, confirmed): Organ disconnects released voices on a wall-clock timer that fires before scheduled note-offs, so sequenced notes are cut short and click. `src/daw/instruments/TonewheelOrganEngine.ts`
- **instruments-08** (ux, effort M, partially): Instrument presets that don't change the sound: 21 of 50 are label-only and 8 more collapse onto 3 sounds. `src/daw/data/instrumentPresets.ts`, `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/Controls/PresetBrowser.tsx`
- **instruments-09** (correctness, effort S, confirmed): Instruments still loading when their track goes away are orphaned (memory, live graph nodes, leaked SoundFont channels). `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/audio/TrackEngine.ts`, `src/daw/instruments/SoundFontAdapter.ts`
- **instruments-10** (performance, effort S, confirmed): Drum kit loads wait on every download in flight across the app, and fail if any of them fails. `src/daw/instruments/DrumMachineEngine.ts`
- **instruments-11** (reload-persistence, effort S, confirmed): Changing kit in the Drum view resets custom pad pans in the audio while the knobs and store keep the old values. `src/daw/instruments/DrumMachineEngine.ts`, `src/daw/components/Controls/DrumMachineView.tsx`, `src/daw/hooks/usePlaybackEngine.ts`
- **instruments-12** (correctness, effort S, confirmed): SoundFont stop/panic leaves the sustain pedal latched and channel controllers dirty. `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/instruments/InstrumentAdapter.ts`, `src/daw/instruments/PianoSampler.ts`
- **instruments-13** (correctness, effort S, confirmed): Input adapters don't recover from a device unplug and can race when the device is switched. `src/daw/instruments/GuitarFxAdapter.ts`, `src/daw/instruments/VocalFxAdapter.ts`, `src/daw/components/Controls/GuitarBassView.tsx`
- **instruments-14** (performance, effort M, confirmed): Drum pads are monophonic with hard cuts (cymbal and tom tails chopped, clicks). `src/daw/instruments/DrumMachineEngine.ts`
- **instruments-15** (performance, effort M, confirmed): Organ: ~20 audio nodes per note, an always-running Leslie/vibrato graph, and the overdrive curve rebuilt on every knob step. `src/daw/instruments/TonewheelOrganEngine.ts`
- **instruments-16** (code-health, effort M, confirmed): GuitarFxAdapter and VocalFxAdapter are ~90% duplicated and have already drifted apart (guitar rewires the graph on every knob step). `src/daw/instruments/GuitarFxAdapter.ts`, `src/daw/instruments/VocalFxAdapter.ts`, `src/daw/audio/GuitarPedalChain.ts`
- **instruments-17** (performance, effort M, confirmed): Core instrument samples depend on three third-party github.io hosts, and the Studio piano differs from the lesson piano. `src/daw/instruments/PianoSampler.ts`, `src/daw/instruments/sampleConfigs.ts`, `src/audio/pianoSampler.ts`
- **instruments-18** (correctness, effort S, partially): Loop seams: allNotesOff has no time argument, so loop wraps cut notes and audio clips 50–100 ms early. `src/daw/instruments/InstrumentAdapter.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/instruments/PianoSampler.ts`

### leadsheet

- **leadsheet-08** (correctness, effort S, confirmed): Paste and clear rewrite every chord in the song, not just the selection. `src/daw/components/LeadSheet/leadSheetClipboard.ts`, `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/store/prismSlice.ts`
- **leadsheet-09** (ux, effort S, partially): Toolbar bar actions target a hidden, stale bar. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/components/LeadSheet/ChordSymbol.tsx`
- **leadsheet-10** (correctness, effort M, confirmed): Lead-sheet MusicXML export is always 4/4 and drops the melody and the roadmap. `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/midi/MusicXmlExport.ts`, `src/daw/midi/ScoreMusicXmlExport.ts`
- **leadsheet-11** (correctness, effort S, confirmed): Printing: melody mode prints the editor UI with mis-sized pages; chart mode prints the selection. `src/daw/components/LeadSheet/LeadSheetScoreView.tsx`, `src/daw/components/LeadSheet/leadsheet-print.css`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`
- **leadsheet-12** (performance, effort M, confirmed): The chord chart re-renders about 30 times a second during playback, and the palette with it. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`, `src/daw/components/Score/ScorePalettes.tsx`
- **leadsheet-13** (performance, effort M, confirmed): Melody mode re-renders the entire Score editor about 30 times a second. `src/daw/components/LeadSheet/LeadSheetScoreView.tsx`, `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/NoteEditorBar.tsx`
- **leadsheet-14** (correctness, effort S, confirmed): Playhead position disagrees with the staff's width rule, and follow-scroll fights the user. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`
- **leadsheet-15** (ux, effort S, partially): Toolbar has no overflow handling, so the export buttons are cut off at common laptop widths. `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **leadsheet-16** (ux, effort M, confirmed): Most palette cells do nothing on the chord chart. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/Score/ScorePalettes.tsx`, `src/daw/components/LeadSheet/toSetListChart.ts`
- **leadsheet-17** (correctness, effort M, confirmed): Typing a chord accepts any text, which breaks Numbers view and MusicXML for edited chords. `src/daw/components/LeadSheet/ChordSymbol.tsx`, `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/midi/leadSheetUtils.ts`
- **leadsheet-18** (ux, effort M, confirmed): The two notation editors drift apart: system breaks, chord menu, clipboard and header differ. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetScoreView.tsx`, `src/daw/components/LeadSheet/ChordSymbol.tsx`
- **leadsheet-19** (correctness, effort S, confirmed): Set-list copies get 4/4 chord durations in other metres. `src/daw/components/LeadSheet/toSetListChart.ts`, `src/daw/midi/leadSheetUtils.ts`
- **leadsheet-20** (ux, effort S, confirmed): 'Sent' and 'Updated' messages don't reflect whether the set list was saved. `src/daw/components/LeadSheet/SendToSetList.tsx`, `src/features/setlists/storage/gameOptionsSetListsStore.ts`
- **leadsheet-21** (ux, effort S, confirmed): The melody track can't be chosen; it falls back to whichever MIDI track comes first. `src/daw/components/LeadSheet/leadSheetMelody.ts`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/store/uiSlice.ts`
- **leadsheet-23** (correctness, effort S, confirmed): The chart header always says 'Time: 4/4', and the staff has no clef, key or time signature. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetMeasure.tsx`
- **leadsheet-24** (reload-persistence, effort M, partially): Collaboration: layout, rests and fermatas don't sync, and opening the lead sheet sets the viewer as composer. `src/daw/collab/YjsDocManager.ts`, `src/daw/collab/yjsToZustand.ts`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **leadsheet-25** (ux, effort M, confirmed): The toolbar carries misleading and duplicate controls. `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`, `src/daw/store/prismSlice.ts`, `src/daw/components/Score/roadmap.ts`
- **leadsheet-26** (performance, effort M, confirmed): Every click and every pixel of a drag re-renders the whole sheet. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`

### live-input

- **live-input-04** (performance, effort S, partially): VocalView re-renders entirely about 20 times a second whenever a Pitch Correction block exists. `src/daw/components/Controls/VocalView.tsx`, `src/daw/hooks/usePitchInfo.ts`, `src/daw/audio/pitch-correction/PitchCorrectionNode.ts`
- **live-input-05** (performance, effort S, confirmed): GuitarBassView rewires the whole pedal graph and writes the store on every knob pointermove. `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/audio/GuitarPedalChain.ts`, `src/daw/components/Controls/RotaryKnob.tsx`
- **live-input-06** (ux, effort M, confirmed): Picking an input device switches on monitoring with no headphone or latency guidance, so feedback is likely. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/instruments/VocalFxAdapter.ts`
- **live-input-07** (ux, effort M, confirmed): Mic permission and device errors are invisible, and a dead input cannot be revived by re-selecting it. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/midi/AudioInputEnumerator.ts`
- **live-input-08** (correctness, effort M, confirmed): Undo and collaborator edits to pedal chains never reach the UI or the sound, and the next local edit overwrites them. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/store/undoMiddleware.ts`
- **live-input-09** (performance, effort M, confirmed): Tuner opens a second voice-processed mic stream, ignores the selected channel, runs YIN every frame and never shows its errors. `src/daw/components/Controls/TunerDisplay.tsx`, `src/daw/hooks/useTuner.ts`, `src/daw/midi/AudioInputEnumerator.ts`
- **live-input-10** (ux, effort S, confirmed): Pitch Correction 'Smooth' control is inverted: turning it up makes correction faster and more robotic. `src/daw/components/Controls/VocalView.tsx`
- **live-input-11** (correctness, effort S, confirmed): PitchMeter pairs the corrected note name with cents measured from the detected pitch's nearest chromatic note. `src/daw/components/Controls/PitchMeter.tsx`
- **live-input-12** (ux, effort S, partially): Pitch Correction root/scale edits silently re-key the whole project, and key changes overwrite the block. `src/daw/components/Controls/VocalView.tsx`
- **live-input-13** (correctness, effort S, confirmed): AudioMidiSourcePanel always warns 'Select an input', and its binding is fragile. `src/daw/components/Controls/AudioMidiSourcePanel.tsx`, `src/daw/hooks/useGuitarMidiDetection.ts`, `src/daw/collab/yjsToZustand.ts`
- **live-input-14** (ux, effort S, confirmed): Channel picker is hard-coded to '1 / 2 / 1-2' and ignores the probed channel count. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/store/audioIOSlice.ts`
- **live-input-15** (ux, effort S, confirmed): Chain row hides its first pedals when it overflows, and three fixed columns crowd the dock. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`
- **live-input-16** (ux, effort S, confirmed): Choosing a NAM amp gives no loading or error feedback, can finish out of order, and re-parses the model each time. `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/audio/nam/NamModelStore.ts`
- **live-input-17** (reload-persistence, effort S, confirmed): Chops sampler shows 'Loading sample…' forever when rehydration fails or there is no token. `src/daw/components/Controls/SamplerChopsView.tsx`, `src/lib/studio-assets/load-audio.ts`
- **live-input-18** (accessibility, effort M, confirmed): Live-input views are almost entirely unusable with a keyboard or screen reader (extends A11Y#3, #8, #13, #14, #19). `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/components/Controls/TunerDisplay.tsx`
- **live-input-20** (ux, effort S, confirmed): Input meter turns red long before clipping and misses real clipping. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/instruments/VocalFxAdapter.ts`

### pianoroll

- **pianoroll-04** (performance, effort M, confirmed): Every drag frame commits to the global store and re-renders the whole DAW (undo JSON and collab update included). `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/store/tracksSlice.ts`
- **pianoroll-05** (performance, effort L, confirmed): Grid, ruler and velocity canvases are sized to the whole clip (not the screen) and fully repainted on every change. `src/daw/components/PianoRoll/PianoRoll.tsx`
- **pianoroll-07** (correctness, effort S, confirmed): Velocity drag sticks after the mouse is released outside the lane; later hovering rewrites the note. `src/daw/components/PianoRoll/PianoRoll.tsx`
- **pianoroll-08** (correctness, effort M, confirmed): Selection is stored as array indices and survives undo, clip switches and collab inserts, so the wrong notes get edited. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/KeyboardView.tsx`
- **pianoroll-09** (correctness, effort S, confirmed): Prism chord colours compare clip-relative note ticks with song-time chord regions. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **pianoroll-10** (ux, effort M, confirmed): Bar lines, ruler numbers and snapping are clip-relative, while playhead, loop and notation use song bars. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/StudioNotationView.tsx`, `src/daw/utils/quantize.ts`
- **pianoroll-11** (ux, effort L, confirmed): Three piano-roll hosts with different rules; the full editor is a modal that hides the transport, and the dock is about one octave tall. `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/KeyboardView.tsx`
- **pianoroll-12** (ux, effort M, confirmed): Mouse gestures fall short of DAW conventions (Draw can't move notes; right-click draws; no additive click). `src/daw/components/PianoRoll/PianoRoll.tsx`
- **pianoroll-13** (ux, effort M, confirmed): Quantize hits every note and the grid has no triplets and no snap-off. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/utils/quantize.ts`
- **pianoroll-14** (ux, effort S, confirmed): No playhead follow, hidden zoom, and wheel scrolling dead over the keys and ruler. `src/daw/components/PianoRoll/PianoRoll.tsx`
- **pianoroll-15** (reload-persistence, effort S, confirmed): Zoom, grid, tool and scroll reset every time the editor opens, the dock tab changes or the dock collapses. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`
- **pianoroll-16** (ux, effort M, confirmed): Drum clips open on a 73-row pitch grid where every unlabelled row plays the kick. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/instruments/drumKits.ts`
- **pianoroll-17** (correctness, effort S, confirmed): Notes outside C1-C7 are invisible and can't be edited, yet still play and are counted. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **pianoroll-18** (ux, effort S, partially): In collab, edits silently do nothing when another user merely has the track selected. `src/daw/store/tracksSlice.ts`, `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/PianoRollModal.tsx`
- **pianoroll-19** (ux, effort S, confirmed): Read-only notation mode keeps the roll's editing controls active. `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/daw/components/PianoRoll/StudioNotationView.tsx`, `src/lib/notation/viewPreference.ts`
- **pianoroll-20** (performance, effort M, confirmed): PitchAnalyzer's YIN costs O(frame²) on the main thread and still runs via UNISON after recordings. `src/daw/audio/pitch-analysis/PitchAnalyzer.ts`, `src/audio/pitch/YinCore.ts`, `src/daw/hooks/useAudioChordDetection.ts`
- **pianoroll-21** (code-health, effort S, confirmed): The Vocal Pitch Editor can never be opened but is still mounted, re-rendered and shipped. `src/daw/components/PitchEditor/PitchEditorModal.tsx`, `src/daw/components/PitchEditor/PitchEditor.tsx`, `src/daw/audio/pitch-analysis/PitchRenderer.ts`
- **pianoroll-22** (accessibility, effort L, confirmed): No keyboard path for notes, tiny text and unlabelled editor controls (builds on A11Y#3/#7/#11/#13/#14/#19). `src/daw/components/PianoRoll/PianoRoll.tsx`, `src/lib/pianoRollLanes.ts`, `src/daw/components/PianoRoll/PianoRollModal.tsx`
- **pianoroll-23** (ux, effort M, confirmed): Mouse-only input: touch and pen drags don't edit (iPads, touch Chromebooks). `src/daw/components/PianoRoll/PianoRoll.tsx`

### practice-tutorial

- **practice-tutorial-01** (performance, effort M, partially): Practice view re-renders the whole screen and keyboard ~30x/s during playback. `src/daw/components/Practice/PracticeTrackView.tsx`, `src/daw/components/Practice/ScaleKeyboard.tsx`, `src/daw/components/Practice/ChordChart.tsx`
- **practice-tutorial-02** (reload-persistence, effort M, confirmed): A browser refresh loses the practice screen for good (practiceSession is never persisted). `src/daw/DawApp.tsx`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **practice-tutorial-05** (reload-persistence, effort M, confirmed): Refreshing mid-lesson ends the lesson, and restarting it wipes the lesson work. `src/daw/store/tutorialSlice.ts`, `src/daw/DawApp.tsx`, `src/lib/studio-projects/localSession.ts`
- **practice-tutorial-07** (correctness, effort S, confirmed): Starting a lesson wipes unsaved work without a prompt, even for an unknown lesson id. `src/daw/DawApp.tsx`, `src/components/ClassroomLayout/studio/StudioProduction.tsx`, `src/lib/studio-projects/localSession.ts`
- **practice-tutorial-08** (correctness, effort M, partially): Intro steps flash past in 300 ms, and Back immediately bounces forward. `src/daw/components/Tutorial/tutorials.ts`, `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/daw/components/Tutorial/useTutorialDetection.ts`
- **practice-tutorial-09** (correctness, effort S, confirmed): Finishing any lesson can report completion for an unrelated classroom activity. `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/features/classroom/msp/useMspModuleCompletion.ts`, `src/features/classroom/msp/mspLaunchParams.ts`
- **practice-tutorial-10** (correctness, effort M, confirmed): Hidden DAW shortcuts stay live on the practice screen; Cmd+Z can erase the backing track. `src/daw/DawApp.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/store/undoMiddleware.ts`
- **practice-tutorial-11** (correctness, effort S, confirmed): Practice treats the selected track as the student's track, so take feedback can be wrong. `src/daw/components/Practice/PracticeTrackView.tsx`, `src/daw/hooks/useMidiRecording.ts`, `src/features/practiceTracks/seedStudioFromPracticeTrack.ts`
- **practice-tutorial-12** (ux, effort M, confirmed): On phones the scaled keyboard shrinks labels to 5–8 px, and 4-octave windows overflow. `src/daw/components/Practice/ScaleKeyboard.tsx`, `src/daw/components/Practice/PracticeTrackView.tsx`, `src/components/PianoKeyboard/useExpandedRange.ts`
- **practice-tutorial-14** (ux, effort S, partially): Some validated steps look already done, and the student is stuck with no feedback or skip. `src/daw/components/Tutorial/tutorials.ts`, `src/daw/store/prismSlice.ts`, `src/daw/components/Tutorial/CoachCard.tsx`
- **practice-tutorial-15** (correctness, effort M, confirmed): Detection runs on every store update, and identity checks pass on undo or collab sync. `src/daw/components/Tutorial/useTutorialDetection.ts`, `src/daw/components/Tutorial/tutorials.ts`, `src/daw/store/undoMiddleware.ts`
- **practice-tutorial-17** (performance, effort S, confirmed): The spotlight's endless box-shadow pulse repaints the whole viewport every frame. `src/daw/components/Tutorial/Spotlight.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/daw/components/Tutorial/CoachCard.tsx`
- **practice-tutorial-18** (ux, effort S, confirmed): Coach card drag is unconstrained, and its offset carries over to later steps. `src/daw/components/Tutorial/CoachCard.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`
- **practice-tutorial-19** (accessibility, effort M, confirmed): Coach card's primary button fails contrast, and step changes are silent to assistive tech. `src/daw/components/Tutorial/CoachCard.tsx`
- **practice-tutorial-20** (ux, effort M, confirmed): The spotlight misses menus and work areas, and can't recover when the student clicks away. `src/daw/components/Tutorial/Spotlight.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/daw/components/Tutorial/tutorials.ts`
- **practice-tutorial-21** (ux, effort M, confirmed): Lessons end abruptly, with no completion screen or next step, and Quit has no confirm. `src/daw/components/Tutorial/TutorialLayer.tsx`, `src/daw/components/Tutorial/CoachCard.tsx`, `src/daw/persistence/SessionSerializer.ts`

### prism-engine

- **prism-engine-01** (correctness, effort S, partially): Suggest Chords reads display labels as chord types, so every real project counts as 'extended' and slash chords win. `src/daw/prism-engine/engine/suggestionEngine.ts`, `src/daw/store/prismSlice.ts`, `src/daw/utils/chordRegionNotation.ts`
- **prism-engine-03** (reload-persistence, effort M, confirmed): Engine inputs don't survive reloads: cloud saves drop the mode, and strum/tilt and the progression being built are never saved. `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-projects/api.ts`, `src/daw/store/prismSlice.ts`
- **prism-engine-04** (correctness, effort M, confirmed): Create mislabels the repeated bars of 2- and 3-chord loops and silently drops chords past the 7th. `src/daw/prism-engine/engine/midiExport.ts`, `src/daw/store/prismSlice.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **prism-engine-05** (correctness, effort S, confirmed): Committing a suggestion deletes whole chord regions that only partly overlap the insertion window. `src/daw/store/prismSuggestionSlice.ts`, `src/daw/store/undoMiddleware.ts`
- **prism-engine-06** (performance, effort S, confirmed): Create starts a fresh module Worker per click for under a millisecond of work, with no error handling or loading state. `src/daw/store/prismSlice.ts`, `src/daw/workers/midiWorker.ts`, `src/daw/prism-engine/engine/midiExport.ts`
- **prism-engine-07** (correctness, effort S, confirmed): Genre strum presets are off by one, and 'Synchronized' and 'Balanced' aren't implemented. `src/daw/prism-engine/data/genreMap.ts`, `src/daw/prism-engine/types.ts`, `src/daw/store/prismSlice.ts`
- **prism-engine-08** (ux, effort S, partially): Swing silently does nothing on 7 of 41 rhythms, including the default. `src/daw/prism-engine/engine/rhythmUtils.ts`, `src/daw/prism-engine/data/chordRhythms.ts`, `src/daw/store/prismSlice.ts`
- **prism-engine-09** (ux, effort M, confirmed): The 'Most Common' label has no data behind it, Re-roll leaves the visible set unchanged, and the walk ignores 24% of the graph. `src/daw/prism-engine/engine/suggestionEngine.ts`, `src/daw/prism-engine/data/progressionGraph.ts`, `src/daw/prism-engine/engine/progression.ts`

### prism-ui

- **prism-ui-06** (correctness, effort S, confirmed): Committing a suggestion deletes chords outside the inserted bars, and the bar maths assumes 4/4. `src/daw/store/prismSuggestionSlice.ts`, `src/daw/components/Prism/PrismSuggestionModal.tsx`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **prism-ui-08** (reload-persistence, effort M, confirmed): Refresh, SPA return and collaboration restore Prism state inconsistently. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/prismSlice.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **prism-ui-09** (ux, effort M, partially): Building chords is silent and opaque: no audition, random colour picks, no key required. `src/daw/components/Prism/ColorSpectrum.tsx`, `src/daw/components/Prism/ChordBuilder.tsx`, `src/daw/components/Prism/PrismStudio.tsx`
- **prism-ui-10** (correctness, effort S, confirmed): The Harmony spectrum keeps adding major-scale chords in the 28 non-diatonic modes. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Prism/ChordBuilder.tsx`, `src/daw/store/prismSlice.ts`
- **prism-ui-11** (correctness, effort M, confirmed): Prism edits sit outside undo: Cmd+Z skips them or half-reverts key changes. `src/daw/store/undoMiddleware.ts`, `src/daw/store/prismSlice.ts`
- **prism-ui-12** (performance, effort S, partially): Every key or mode click rewrites every track and overwrites custom track colours. `src/daw/store/prismSlice.ts`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/store/undoMiddleware.ts`
- **prism-ui-13** (ux, effort M, confirmed): Five fixed-width cards don't fit the 33vh dock: clipped controls, nested scrolling, clipped mode menu. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Prism/PrismPanel.tsx`, `src/daw/components/Prism/ChordBuilder.tsx`
- **prism-ui-14** (ux, effort S, confirmed): Duplicated and misleading controls: two Undos, two Clears, two sequence views, a doubled heading. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Prism/ChordBuilder.tsx`, `src/daw/components/Prism/CircleOfFifths.tsx`
- **prism-ui-15** (ux, effort M, confirmed): 'Suggest Chords' from a track only writes chord symbols, and can't feed the Prism builder. `src/daw/store/prismSuggestionSlice.ts`, `src/daw/components/Prism/PrismSuggestionModal.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **prism-ui-16** (ux, effort S, confirmed): Re-roll shows the same 'Most Common' suggestion every time. `src/daw/store/prismSuggestionSlice.ts`, `src/daw/prism-engine/engine/suggestionEngine.ts`
- **prism-ui-17** (performance, effort M, confirmed): Suggestion preview: silent first play (31 MB SoundFont), routing that leaks into the master, wrong instrument. `src/daw/components/Prism/PrismSuggestionModal.tsx`, `src/daw/instruments/SoundFontAdapter.ts`, `src/daw/audio/auditionNote.ts`
- **prism-ui-18** (accessibility, effort M, confirmed): New accessibility gaps: mouse-only circle and spectrum, unlabelled dialog, 7px labels, white on teal. `src/daw/components/Prism/CircleOfFifths.tsx`, `src/daw/components/Prism/ColorSpectrum.tsx`, `src/daw/components/Prism/PrismSuggestionModal.tsx`
- **prism-ui-19** (visual-design, effort M, confirmed): Prism styling is off the Music Atlas look: hard-coded greys, teal buttons and chips, 8–11px text. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/Prism/CircleOfFifths.tsx`, `src/daw/components/Prism/ChordBuilder.tsx`
- **prism-ui-20** (performance, effort S, confirmed): PrismStudio subscribes to the whole tracks array, so all of Prism re-renders during fader drags. `src/daw/components/Prism/PrismStudio.tsx`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/Mixer/ChannelStrip.tsx`
- **prism-ui-21** (correctness, effort S, confirmed): Lead-sheet Insert/Delete Measure assume 4/4 and leave rests, fermatas and row breaks on the wrong bars. `src/daw/store/prismSlice.ts`, `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetToolbar.tsx`

### score

- **score-03** (reload-persistence, effort S, confirmed): Text marks, breaks and spellings carry over into the next project you open. `src/daw/store/uiSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/undoMiddleware.ts`
- **score-04** (reload-persistence, effort M, confirmed): Collab: some Score marks never sync, and the rest are overwritten by whoever writes last. `src/daw/collab/YjsDocManager.ts`, `src/daw/collab/diffEngine.ts`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-05** (performance, effort M, confirmed): Playback re-renders the entire Score page about 30 times a second. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/ScoreView.tsx`, `src/daw/components/Score/NoteEditorBar.tsx`
- **score-07** (correctness, effort S, confirmed): Follow-playhead and page navigation never work in the Score. `src/daw/components/Score/ScoreView.tsx`, `src/components/notation/StaffView.tsx`, `src/components/notation/grandStaff.css`
- **score-08** (correctness, effort M, confirmed): Edits move articulations and slurs onto the wrong notes; slashes and spellings fall off. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/scoreEdit.ts`, `src/components/notation/StaffView.tsx`
- **score-10** (correctness, effort S, partially): A 3–4 px wobble while clicking a note changes its pitch. `src/daw/components/Score/useScoreEditing.tsx`, `src/components/notation/StaffView.tsx`
- **score-11** (ux, effort L, confirmed): The Score has no way to write new notes. `src/daw/components/Score/ScoreView.tsx`, `src/daw/components/Score/NoteEditorBar.tsx`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-12** (correctness, effort S, confirmed): Undo misses slash notation and chord visibility; in collab no Score mark can be undone. `src/daw/store/undoMiddleware.ts`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-13** (correctness, effort M, confirmed): MusicXML export doesn't match what the student sees. `src/daw/components/Score/ScoreView.tsx`, `src/daw/midi/ScoreMusicXmlExport.ts`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-14** (correctness, effort S, confirmed): Pasting into bars before a part's first clip piles every note onto one tick. `src/daw/components/Score/scoreClipboard.ts`
- **score-15** (correctness, effort S, confirmed): Opening Score writes the viewer's name as composer, and it can't be cleared. `src/daw/components/Score/ScoreView.tsx`, `src/daw/collab/YjsDocManager.ts`, `src/daw/persistence/SessionSerializer.ts`
- **score-16** (correctness, effort S, confirmed): One failed engrave leaves the Score broken until you switch views. `src/components/notation/StaffView.tsx`
- **score-17** (correctness, effort S, confirmed): Touch drags get stuck and commit on the next tap. `src/daw/components/Score/useScoreEditing.tsx`, `src/components/notation/StaffView.tsx`
- **score-18** (reload-persistence, effort M, confirmed): Switching views throws away all Score working state and re-engraves from scratch. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/ScorePalettes.tsx`, `src/components/notation/StaffView.tsx`
- **score-19** (performance, effort M, confirmed): Resizing re-engraves the whole score even though page layout doesn't depend on width. `src/components/notation/StaffView.tsx`, `src/lib/notation/pageLayout.ts`
- **score-20** (performance, effort S, confirmed): Dragging re-renders everything on every pointer event. `src/daw/components/Score/useScoreEditing.tsx`, `src/components/notation/StaffView.tsx`
- **score-21** (performance, effort S, confirmed): Score code ships in the main editor bundle, and the first visit waits for VexFlow. `src/daw/DawApp.tsx`, `src/components/notation/StaffView.tsx`, `src/daw/components/Score/NoteEditorBar.tsx`
- **score-22** (accessibility, effort M, confirmed): Score editing is mouse-only and its controls are misnamed for assistive technology. `src/daw/components/Score/NoteEditorBar.tsx`, `src/daw/components/Score/ScorePalettes.tsx`, `src/daw/components/Score/useScoreEditing.tsx`
- **score-23** (ux, effort M, confirmed): The toolbar is three always-on rows with labels that look like buttons. `src/daw/components/Score/NoteEditorBar.tsx`, `src/daw/components/Score/ScoreView.tsx`, `src/daw/components/Score/ScorePalettes.tsx`
- **score-24** (ux, effort M, confirmed): Palettes ignore note selections, jump marks can't be deleted, and imported line breaks are locked. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/ScorePalettes.tsx`, `src/daw/components/Score/scoreText.ts`
- **score-25** (ux, effort S, confirmed): The dot button and the active row don't reflect the selected note. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/NoteEditorBar.tsx`
- **score-26** (ux, effort S, confirmed): Chord entry silently discards text it doesn't recognize. `src/daw/components/Score/useScoreEditing.tsx`, `src/daw/components/Score/chordInput.ts`
- **score-27** (ux, effort M, confirmed): No sound feedback when editing, and no click-to-play from the score. `src/daw/components/Score/useScoreEditing.tsx`, `src/components/notation/StaffView.tsx`
- **score-28** (visual-design, effort M, confirmed): Styling doesn't match the Music Atlas look. `src/daw/components/Score/NoteEditorBar.tsx`, `src/daw/components/Score/ScorePartsPanel.tsx`, `src/daw/components/Score/ScorePalettes.tsx`

### shell

- **shell-05** (performance, effort S, confirmed): MeshGradientBg is invisible but redraws a full-viewport, high-DPI canvas every frame. `src/daw/components/MeshGradientBg.tsx`, `src/daw/DawApp.tsx`, `src/daw/daw.css`
- **shell-09** (reload-persistence, effort M, confirmed): Opening a project shows no loading state, and failures silently land in a different session. `src/daw/DawApp.tsx`, `src/daw/components/Transport/FileMenu.tsx`
- **shell-16** (reload-persistence, effort M, confirmed): Refreshing during a Practice Track or Production lesson drops the student into plain Create. `src/daw/DawApp.tsx`, `src/daw/persistence/SessionSerializer.ts`
- **shell-17** (performance, effort S, confirmed): TransportBar re-renders on every track edit to support one button; the position readout renders 30 times a second. `src/daw/components/Transport/TransportBar.tsx`, `src/daw/components/Transport/FileMenu.tsx`, `src/daw/components/Transport/ExportAudioDialog.tsx`
- **shell-18** (correctness, effort S, confirmed): Snap toggle moves the playhead when snap is turned off instead of on. `src/daw/components/Transport/TransportBar.tsx`, `src/daw/store/uiSlice.ts`
- **shell-19** (ux, effort L, confirmed): Top bar is cramped, splits the transport, and shows controls that don't apply to the current view. `src/daw/components/Transport/TransportBar.tsx`
- **shell-20** (reload-persistence, effort M, confirmed): Switching views remounts shared panels and loses their state. `src/daw/DawApp.tsx`, `src/daw/store/uiSlice.ts`
- **shell-21** (ux, effort M, confirmed): Settings asks for the microphone on open, its dropdowns are mouse-only, and channel configuration has no effect. `src/daw/components/Transport/SettingsModal.tsx`, `src/daw/store/audioIOSlice.ts`, `src/daw/midi/AudioInputEnumerator.ts`
- **shell-22** (ux, effort M, confirmed): Native confirm/prompt dialogs, a Save As that can detach the project, and a full page reload for New Project. `src/daw/components/Transport/FileMenu.tsx`, `src/lib/studio-projects/newProject.ts`, `src/lib/studio-projects/api.ts`
- **shell-23** (visual-design, effort M, confirmed): Shell colours break the landing look: amber Export button, teal as a general highlight, unreadable Key chip. `src/daw/components/Transport/ExportAudioDialog.tsx`, `src/daw/components/Transport/TransportBar.tsx`, `src/daw/components/common/ConfirmModal.tsx`
- **shell-25** (accessibility, effort M, confirmed): Key and time-signature popovers can't be reached or closed from the keyboard. `src/daw/components/Transport/TransportBar.tsx`
- **shell-26** (ux, effort S, confirmed): MIDI import fails silently on bad files and partially imports at the track limit. `src/daw/components/Transport/FileMenu.tsx`, `src/daw/midi/MidiFileIO.ts`, `src/daw/store/tracksSlice.ts`
- **shell-27** (reload-persistence, effort S, confirmed): Returning to the editor leaves it silent until the student clicks. `src/daw/DawApp.tsx`, `src/daw/hooks/useAudioEngine.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **shell-28** (ux, effort M, confirmed): Leaving the editor isn't guarded, and a collab host's stray click ends the session for everyone. `src/daw/DawApp.tsx`
- **shell-29** (ux, effort M, confirmed): App sidebar and top rail take editor space, and the editor loads behind a dashboard skeleton. `src/layouts/DashboardLayout/ClassroomDashboard.tsx`, `src/daw/DawApp.tsx`
- **shell-33** (ux, effort M, confirmed): Shortcuts collide with the computer-keyboard piano and piano-roll keys, and can't be discovered. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/oracle-synth/hooks/useKeyboardShortcuts.ts`
- **shell-36** (visual-design, effort M, confirmed): DAW colour tokens diverge from the app theme. `src/daw/daw.css`, `src/daw/components/Transport/TransportBar.tsx`

### state-reload

- **state-reload-08** (performance, effort M, confirmed): The DAW root re-renders on every track, mixer and presence change. `src/daw/DawApp.tsx`, `src/daw/hooks/usePlaybackEngine.ts`, `src/daw/hooks/useCollabAudioLoader.ts`
- **state-reload-11** (correctness, effort S, confirmed): Per-track input routing is dropped on refresh and on every remote collab edit. `src/daw/persistence/SessionSerializer.ts`, `src/daw/collab/yjsToZustand.ts`, `src/daw/collab/YjsDocManager.ts`
- **state-reload-13** (reload-persistence, effort S, confirmed): MIDI clip length and controller data (sustain pedal) are dropped by both serializers. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/tracksSlice.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **state-reload-14** (reload-persistence, effort M, confirmed): Pitch-correction edits are never saved and cannot be undone. `src/daw/store/tracksSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **state-reload-16** (correctness, effort M, confirmed): Starting or loading a project carries over state from the previous one. `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/uiSlice.ts`, `src/daw/store/musicIntelligenceSlice.ts`
- **state-reload-19** (correctness, effort M, confirmed): Collab sync is one-sided for score marks and leaves out synth patches. `src/daw/collab/diffEngine.ts`, `src/daw/collab/yjsToZustand.ts`, `src/daw/store/undoMiddleware.ts`
- **state-reload-21** (correctness, effort S, confirmed): Undo history starts before seeding finishes, so the first Cmd+Z empties templates and practice tracks. `src/daw/DawApp.tsx`, `src/daw/store/tracksSlice.ts`, `src/daw/data/applyDemoDrums.ts`
- **state-reload-22** (correctness, effort L, confirmed): Undo covers an inconsistent subset of the project and records system writes. `src/daw/store/undoMiddleware.ts`, `src/daw/store/prismSlice.ts`, `src/lib/studio-assets/upload-pending.ts`
- **state-reload-23** (correctness, effort S, confirmed): Undoing an audio clip delete or split brings back a silent clip. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Timeline/Timeline.tsx`, `src/daw/audio/AudioBufferStore.ts`
- **state-reload-24** (ux, effort S, confirmed): Cmd+Z steals text-field undo, and there is no visible undo/redo outside the Score. `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/components/Transport/TransportBar.tsx`, `src/daw/components/Score/useScoreEditing.tsx`
- **state-reload-25** (correctness, effort M, confirmed): Opening a project by URL has no loading state, can land after the user starts editing, and fails silently. `src/daw/DawApp.tsx`, `src/daw/hooks/useMidiDevices.ts`, `src/daw/hooks/useAutosave.ts`
- **state-reload-26** (performance, effort M, confirmed): Any remote collab change rebuilds every track object. `src/daw/collab/yjsToZustand.ts`, `src/daw/collab/YjsDocManager.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **state-reload-27** (performance, effort S, confirmed): Decoded audio is never evicted, and every reopen downloads it again. `src/daw/audio/AudioBufferStore.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/lib/studio-assets/load-audio.ts`
- **state-reload-28** (reload-persistence, effort M, confirmed): A single autosave slot is shared by all tabs and fails silently. `src/lib/studio-projects/localSession.ts`, `src/daw/persistence/SessionSerializer.ts`
- **state-reload-29** (performance, effort M, confirmed): Autosave re-serializes the whole session after UI-only changes, on the main thread. `src/daw/hooks/useAutosave.ts`, `src/lib/studio-projects/localSession.ts`, `src/daw/persistence/SessionSerializer.ts`
- **state-reload-30** (reload-persistence, effort S, confirmed): The editor forgets where the student was on every refresh. `src/daw/store/uiSlice.ts`, `src/daw/store/prismSlice.ts`, `src/daw/persistence/SessionSerializer.ts`
- **state-reload-31** (ux, effort S, confirmed): Most instrument presets only rename the track. `src/daw/data/instrumentPresets.ts`, `src/daw/components/Controls/KeyboardView.tsx`
- **state-reload-32** (correctness, effort S, confirmed): Opening a never-edited synth track copies the previous track's patch onto it. `src/daw/hooks/useStoreBridge.ts`, `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/data/projectTemplates.ts`

### synth-engine

- **synth-engine-03** (correctness, effort M, confirmed): Note-off is only half-scheduled: release starts from the level at call time, and voices are freed by a timer started at call time. `src/daw/oracle-synth/audio/Envelope.ts`, `src/daw/oracle-synth/audio/Voice.ts`, `src/daw/oracle-synth/audio/SynthEngine.ts`
- **synth-engine-04** (correctness, effort S, partially): Toggling ARP while keys are held strands notes: stuck voices, leaked quantizer refs and phantom arpeggios. `src/daw/oracle-synth/audio/SynthEngine.ts`, `src/daw/oracle-synth/audio/Arpeggiator.ts`, `src/daw/oracle-synth/audio/ScaleQuantizer.ts`
- **synth-engine-06** (reload-persistence, effort S, confirmed): Reverb is never applied when a project loads or exports; never-opened tracks also run a hidden convolver. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/audio/fx/FXProcessor.ts`
- **synth-engine-09** (correctness, effort L, confirmed): Wavetable-position and unison-blend modulation never runs in the Studio, although 50 of 82 bundled pack presets use it. `src/daw/oracle-synth/audio/ModulationMatrix.ts`, `src/daw/oracle-synth/audio/Oscillator.ts`, `src/daw/oracle-synth/hooks/useWtPosModulation.ts`
- **synth-engine-11** (correctness, effort M, confirmed): LFOs free-run from their last rebuild and restart on every edit, so bar shapes don't line up with song bars. `src/daw/oracle-synth/audio/LFO.ts`, `src/daw/oracle-synth/audio/types.ts`
- **synth-engine-12** (performance, effort M, confirmed): Duplicate unison engine and per-note node rebuilds double oscillator CPU, with no voices × unison budget. `src/daw/oracle-synth/audio/Oscillator.ts`, `src/daw/oracle-synth/audio/UnisonEngine.ts`, `src/daw/oracle-synth/audio/WavetableBank.ts`
- **synth-engine-13** (correctness, effort S, confirmed): Unison gains start at 1.0 and settle with a 20 ms time constant, so live notes start with a loud spike. `src/daw/oracle-synth/audio/UnisonEngine.ts`
- **synth-engine-14** (performance, effort M, confirmed): Dragging a mod-amount knob tears down and rebuilds the entire matrix for every sounding voice on each pointer move. `src/daw/oracle-synth/audio/ModulationMatrix.ts`, `src/daw/oracle-synth/audio/SynthEngine.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`
- **synth-engine-15** (ux, effort S, confirmed): Every unipolar cutoff route, including the default new route, sweeps the filter DOWN from the knob. `src/daw/oracle-synth/audio/ModulationMatrix.ts`, `src/daw/oracle-synth/audio/modMath.ts`, `src/daw/oracle-synth/store/slices/modulationSlice.ts`
- **synth-engine-16** (correctness, effort M, confirmed): MONO and LEG behave the same, and glide is inaudible in the piano roll or starts from the wrong pitch. `src/daw/oracle-synth/audio/VoiceManager.ts`, `src/daw/oracle-synth/audio/UnisonEngine.ts`, `src/daw/oracle-synth/audio/SubOscillator.ts`
- **synth-engine-17** (ux, effort S, confirmed): Filter ON/OFF and PAN do nothing, GAIN has no effect on LP/HP, and RES goes to +30 dB. `src/daw/oracle-synth/audio/Filter.ts`, `src/daw/oracle-synth/components/modules/FilterModule.tsx`, `src/daw/oracle-synth/audio/types.ts`
- **synth-engine-18** (performance, effort M, confirmed): Voices are built inside note-on, each generating 4 s of noise even when noise is off. `src/daw/oracle-synth/audio/VoiceManager.ts`, `src/daw/oracle-synth/audio/Voice.ts`, `src/daw/oracle-synth/audio/NoiseGenerator.ts`
- **synth-engine-19** (performance, effort M, confirmed): WavetableBank duplicates 56 PeriodicWaves per track, builds imported tables inside note-on, and never evicts warp variants. `src/daw/oracle-synth/audio/WavetableBank.ts`, `src/daw/oracle-synth/audio/Oscillator.ts`, `src/daw/oracle-synth/audio/wavetableImport.ts`
- **synth-engine-21** (performance, effort M, confirmed): Every knob move re-sends the whole module object to every voice with no diffing, and routing changes reconnect all voices. `src/daw/oracle-synth/audio/SynthEngine.ts`, `src/daw/oracle-synth/audio/Oscillator.ts`, `src/daw/oracle-synth/audio/UnisonEngine.ts`
- **synth-engine-22** (correctness, effort S, confirmed): Phaser's feedback loop has no DelayNode (silent in Firefox) and its sweep clamps at 0 Hz. `src/daw/oracle-synth/audio/fx/PhaserEffect.ts`

### synth-store

- **synth-store-06** (correctness, effort S, confirmed): FX/mod route ids come from per-page-load counters and collide with restored routes, corrupting patches. `src/daw/oracle-synth/store/slices/fxSlice.ts`, `src/daw/oracle-synth/store/slices/modulationSlice.ts`, `src/daw/oracle-synth/components/fx/FXPanel.tsx`
- **synth-store-07** (reload-persistence, effort M, confirmed): Snapshot restore skips the preset migrations; pre-v3 projects can crash the whole app when the synth panel opens. `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/store/slices/presetSlice.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`
- **synth-store-08** (reload-persistence, effort M, confirmed): Oracle patches are not part of collab: peers hear different sounds and patch edits never propagate. `src/daw/collab/YjsDocManager.ts`, `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/hooks/useMidiInputRouting.ts`
- **synth-store-10** (correctness, effort S, confirmed): The preset 'modified \*' flag is wrong both ways: set right after loading a preset, cleared after a track switch. `src/daw/oracle-synth/store/index.ts`, `src/daw/oracle-synth/store/slices/presetSlice.ts`, `src/daw/oracle-synth/synthTrackState.ts`
- **synth-store-11** (ux, effort M, confirmed): Cmd+Z ignores synth edits and undoes an unrelated timeline edit instead. `src/daw/oracle-synth/store/index.ts`, `src/daw/hooks/useKeyboardShortcuts.ts`, `src/daw/store/undoMiddleware.ts`
- **synth-store-12** (reload-persistence, effort M, confirmed): User preset library is per-browser, can be shadowed or lost silently, and can't be deleted. `src/daw/oracle-synth/store/slices/presetSlice.ts`, `src/daw/oracle-synth/components/preset/PresetSelector.tsx`
- **synth-store-13** (ux, effort M, confirmed): The preset browser is a flat, uncategorised list of 93+ terse names with no descriptions, search or loading feedback. `src/daw/oracle-synth/components/preset/PresetSelector.tsx`, `src/daw/oracle-synth/store/slices/presetSlice.ts`, `src/daw/oracle-synth/store/presets/factoryPresets.ts`
- **synth-store-14** (accessibility, effort S, confirmed): The preset menu has no keyboard or screen-reader semantics (new; not covered by the accessibility audit). `src/daw/oracle-synth/components/preset/PresetSelector.tsx`, `src/daw/oracle-synth/components/preset/PresetSelector.module.css`
- **synth-store-16** (code-health, effort M, confirmed): Patch fields are hand-listed in five drifting places; dead API, persisted dead fields, and no persistence tests. `src/daw/oracle-synth/store/index.ts`, `src/daw/oracle-synth/synthTrackState.ts`, `src/daw/oracle-synth/store/slices/presetSlice.ts`

### synth-ui

- **synth-ui-04** (reload-persistence, effort S, confirmed): Edits made only to the synth never trigger an autosave. `src/daw/hooks/useAutosave.ts`, `src/daw/oracle-synth/store/index.ts`, `src/daw/persistence/SessionSerializer.ts`
- **synth-ui-07** (ux, effort L, partially): The docked synth cuts off its own controls, hides half of itself off-screen, and lacks the features the tutorial asks for. `src/daw/components/Controls/OracleSynthInline.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/oracle-synth/components/modules/OscillatorModule.module.css`
- **synth-ui-11** (reload-persistence, effort S, confirmed): Route ids restart after a reload, so new FX and mod routes collide with saved ones. `src/daw/oracle-synth/store/slices/fxSlice.ts`, `src/daw/oracle-synth/store/slices/modulationSlice.ts`, `src/daw/oracle-synth/components/fx/FXPanel.tsx`
- **synth-ui-12** (performance, effort M, confirmed): Store-to-engine sync pushes whole sections, rebuilds the mod graph on every drag tick, and runs twice while the pop-out is open. `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/audio/Oscillator.ts`, `src/daw/oracle-synth/audio/ModulationMatrix.ts`
- **synth-ui-13** (performance, effort M, confirmed): The modulation live dot is missing after any remount; when it does run, it re-renders whole modules 30 times a second. `src/daw/oracle-synth/hooks/useModIndicator.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/components/modules/OscillatorModule.tsx`
- **synth-ui-14** (performance, effort M, confirmed): The visualizers redraw continuously, even when nothing has changed or nothing is visible. `src/daw/oracle-synth/components/visualizers/WaveformVisualizer.tsx`, `src/daw/oracle-synth/components/visualizers/FilterResponseVisualizer.tsx`, `src/daw/oracle-synth/components/visualizers/EnvelopeVisualizer.tsx`
- **synth-ui-15** (ux, effort S, confirmed): Time knobs are linear and snap to 10ms, and Shift+Arrow fine adjustment does nothing. `src/daw/oracle-synth/components/controls/Knob.tsx`, `src/daw/oracle-synth/components/modules/EnvelopeModule.tsx`, `src/daw/oracle-synth/components/fx/FXSlot.tsx`
- **synth-ui-16** (correctness, effort S, partially): Pointer gestures have no cancel path, causing stuck pitch bend, stuck notes and runaway knobs. `src/daw/oracle-synth/components/controls/WheelControl.tsx`, `src/daw/oracle-synth/components/keyboard/PianoKey.tsx`, `src/daw/oracle-synth/components/controls/Knob.tsx`
- **synth-ui-17** (reload-persistence, effort S, confirmed): A new synth track copies whichever patch was last open, and its sound changes when its panel first opens. `src/daw/hooks/useStoreBridge.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **synth-ui-18** (reload-persistence, effort L, confirmed): Synth patches and live synth playing don't reach collaborators. `src/daw/collab/YjsDocManager.ts`, `src/daw/collab/diffEngine.ts`, `src/daw/hooks/useStoreBridge.ts`
- **synth-ui-19** (ux, effort M, confirmed): The preset browser doesn't scale to 93+ presets, and pack presets load eagerly. `src/daw/oracle-synth/components/preset/PresetSelector.tsx`, `src/daw/oracle-synth/store/presets/packLoader.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`
- **synth-ui-20** (visual-design, effort M, confirmed): The synth uses its own grey-and-rainbow visual language instead of the Music Atlas look. `src/daw/oracle-synth/components/modules/OscillatorModule.module.css`, `src/daw/oracle-synth/components/modules/EnvelopeModule.tsx`, `src/daw/oracle-synth/components/layout/SynthLayout.tsx`
- **synth-ui-21** (accessibility, effort M, confirmed): Most synth control primitives are mouse-only and have no accessible name. `src/daw/oracle-synth/components/controls/Toggle.tsx`, `src/daw/oracle-synth/components/controls/WheelControl.tsx`, `src/daw/oracle-synth/components/keyboard/PianoKey.tsx`
- **synth-ui-22** (ux, effort S, confirmed): Panels use inconsistent names and unexplained abbreviations. `src/daw/oracle-synth/components/modules/EnvelopeModule.tsx`, `src/daw/oracle-synth/components/modulation/ModulationSlot.tsx`, `src/daw/oracle-synth/components/routing/RoutingPanel.tsx`

### timeline

- **timeline-06** (correctness, effort M, confirmed): In collab, clip moves, splits and deletes ignore track locks and can delete or duplicate clips. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/store/tracksSlice.ts`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **timeline-08** (performance, effort M, partially): Level meters re-render every track header each animation frame, and track meters stay dead after a reload. `src/daw/hooks/useMeterLevel.ts`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`
- **timeline-09** (ux, effort M, confirmed): The arrange view never follows the playhead, and you can't scroll past content plus 4 bars. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/utils/timelineScale.ts`
- **timeline-11** (correctness, effort S, confirmed): The canvas isn't redrawn when its container resizes, and its height can only grow. `src/daw/components/Timeline/Timeline.tsx`
- **timeline-12** (correctness, effort M, confirmed): Track headers and lanes drift out of alignment when the header column is scrolled. `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/daw/components/Timeline/Timeline.tsx`
- **timeline-13** (reload-persistence, effort S, confirmed): Zoom and scroll aren't reset or clamped when a project loads, and vertical scroll is lost on view switches. `src/daw/store/uiSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **timeline-14** (ux, effort S, confirmed): The grid is stuck at 1/4, and the Snap toggle doesn't affect clip, loop or marker drags. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/store/uiSlice.ts`, `src/daw/components/Transport/TransportBar.tsx`
- **timeline-15** (ux, effort S, confirmed): Zoom is hard to find and behaves inconsistently, and dragging on the ruler creates loops instead of scrubbing. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/components/Transport/TransportBar.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **timeline-16** (ux, effort M, confirmed): Audio files can't be dropped onto the timeline, and drops ignore where they land. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/store/tracksSlice.ts`, `src/daw/components/Mixer/AddTrackMenu.tsx`
- **timeline-17** (ux, effort L, confirmed): Arrange editing is mouse-only and hidden behind right-click, and clips have no names. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/hooks/useKeyboardShortcuts.ts`
- **timeline-18** (ux, effort L, confirmed): The automation editor is docked away from its track, only edits values, and shows no playback position. `src/daw/components/Timeline/AutomationLaneEditor.tsx`, `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`
- **timeline-19** (correctness, effort S, confirmed): The track name field shows stale text after undo or a collaborator's rename, then writes it back. `src/daw/components/TrackControls/TrackHeader.tsx`
- **timeline-20** (correctness, effort S, confirmed): Right-click track targeting and the chord-rename field are wrong when the timeline is scrolled vertically. `src/daw/components/Timeline/Timeline.tsx`
- **timeline-21** (accessibility, effort M, confirmed): Track header toggles show state by colour only, with tiny targets and jargon labels. `src/daw/components/TrackControls/TrackHeader.tsx`, `src/daw/components/TrackControls/MasterTrackHeader.tsx`, `src/daw/components/Timeline/TimelineWithHeaders.tsx`
- **timeline-22** (visual-design, effort S, confirmed): Ruler labels overprint each other when zoomed in, and canvas text contrast is 1.3-3.7:1. `src/daw/utils/timelineScale.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **timeline-23** (performance, effort S, confirmed): The whole Timeline re-renders about 30 times a second to move the playhead, which steps at 30 fps. `src/daw/components/Timeline/Timeline.tsx`, `src/daw/hooks/useTransport.ts`, `src/daw/collab/ui/PresenceCursors.tsx`
- **timeline-24** (performance, effort S, confirmed): Track header reordering measures every row on each track edit, and the opaque header column still pays for a backdrop blur. `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/daw/daw.css`, `src/daw/components/MeshGradientBg.tsx`
- **timeline-25** (ux, effort S, confirmed): Missing audio shows a fake waveform, and failed downloads show 'Loading…' forever while retrying on every edit. `src/daw/components/Timeline/Timeline.tsx`, `src/lib/studio-assets/load-audio.ts`, `src/daw/hooks/useCollabAudioLoader.ts`
- **timeline-26** (performance, effort S, confirmed): Decoded audio is never released when switching projects. `src/daw/audio/AudioBufferStore.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/store/tracksSlice.ts`

## Low (93)

### audio-analysis

- **audio-analysis-17** (code-health, effort S, confirmed): Disposed NAM and pitch-correction worklets stay alive; dispose during async init leaks nodes; worklet registration isn't per context. `src/daw/audio/nam/NamWorkletNode.ts`, `src/daw/audio/pitch-correction/PitchCorrectionNode.ts`, `src/daw/audio/pedals/PitchCorrectionPedal.ts`
- **audio-analysis-18** (correctness, effort S, confirmed): Flanger sweep is clamped by the feedback loop; phaser sweep goes below 0 Hz; rate knobs are linear. `src/daw/audio/pedals/FlangerPedal.ts`, `src/daw/audio/pedals/PhaserPedal.ts`
- **audio-analysis-19** (correctness, effort M, confirmed): NAM tone accuracy: 48 kHz models run at the device rate; output level ignores each model's loudness metadata. `src/daw/audio/nam/NamModelParser.ts`, `src/daw/audio/nam/NamModelStore.ts`, `src/daw/audio/pedals/NamAmpPedal.ts`
- **audio-analysis-20** (code-health, effort S, confirmed): NodeTapCapture hands out the guitar adapter's own node, so peer worklet edges outlive each Guitar-to-MIDI rebuild. `src/daw/audio/NodeTapCapture.ts`, `src/learn/audio/v2/BasicPitchPeer.ts`, `src/daw/hooks/useGuitarMidiDetection.ts`
- **audio-analysis-21** (code-health, effort S, confirmed): Dead modules, legacy APIs and stale docs; no tests where most of these defects live. `src/daw/audio/VocalProcessingChain.ts`, `src/daw/audio/pedals/DelayPedal.ts`, `src/daw/audio/pedals/ReverbPedal.ts`

### audio-core

- **audio-core-21** (performance, effort M, confirmed): Every Play rebuilds a Tone.Part with two ToneEvents per note for every MIDI clip. `src/daw/audio/MidiScheduler.ts`, `src/daw/hooks/usePlaybackEngine.ts`
- **audio-core-22** (code-health, effort S, confirmed): midiWorker is spawned fresh for every Generate and never terminated on error. `src/daw/workers/midiWorker.ts`, `src/daw/store/prismSlice.ts`

### bundle-load

- **bundle-load-12** (performance, effort S, partially): Solo sessions start collab/RTC and analysis loops they don't use. `src/daw/hooks/useStudioMonitor.ts`, `src/daw/collab/StudioRtcManager.ts`, `src/daw/collab/turnCredentials.ts`
- **bundle-load-17** (code-health, effort S, confirmed): A static import of upload-pending for one error class makes three dynamic imports useless. `src/daw/components/Transport/FileMenu.tsx`, `src/lib/studio-assets/upload-pending.ts`, `src/lib/studio-projects/api.ts`
- **bundle-load-18** (performance, effort S, confirmed): The Oracle pack loader fires 83 requests when a synth panel first mounts. `src/daw/oracle-synth/store/presets/packLoader.ts`, `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`
- **bundle-load-19** (visual-design, effort S, confirmed): useTheme writes 18 inline tokens that override daw.css. `src/daw/hooks/useTheme.ts`, `src/daw/constants/themes.ts`, `src/daw/daw.css`

### collab

- **collab-27** (reload-persistence, effort S, partially): Per-room IndexedDB databases accumulate and are never read back. `src/daw/collab/CollabProvider.tsx`
- **collab-28** (ux, effort S, confirmed): Chat panel UX gaps. `src/daw/collab/ui/ChatPanel.tsx`, `src/daw/collab/collabSlice.ts`, `src/daw/collab/ui/CollabToolbar.tsx`
- **collab-29** (performance, effort S, partially): RTC manager, TURN fetch, a 5 s stats loop and an rAF loop run in every editor session, even without a room. `src/daw/collab/StudioRtcManager.ts`, `src/daw/collab/turnCredentials.ts`, `src/daw/hooks/useStudioMonitor.ts`
- **collab-30** (performance, effort S, confirmed): The collab middleware opens a Yjs transaction on every store set, and chat history is appended one set at a time. `src/daw/collab/collabMiddleware.ts`, `src/daw/collab/ZustandYjsBridge.ts`, `src/daw/collab/CollabProvider.tsx`
- **collab-31** (code-health, effort S, confirmed): Dead code and leftover debug logging across the collab API. `src/daw/collab/ui/PresenceCursors.tsx`, `src/daw/collab/CollabProvider.tsx`, `src/daw/collab/types.ts`

### design-system

- **design-system-15** (ux, effort S, confirmed): Mixer readouts disagree between views, and some controls are dead. `src/daw/components/TrackControls/MasterTrackHeader.tsx`, `src/daw/components/Studio/StudioView.tsx`, `src/daw/components/TrackControls/TrackHeader.tsx`
- **design-system-16** (code-health, effort S, partially): About 1,470 lines of dead UI ship in the single editor chunk and carry off-brand patterns. `src/daw/components/TrackControls/TrackList.tsx`, `src/daw/components/TrackControls/NewTrackModal.tsx`, `src/daw/components/Mixer/MixerPanel.tsx`
- **design-system-17** (visual-design, effort M, confirmed): No spacing, size, radius or z-index scales. `src/daw/collab/ui/CollabToolbar.tsx`, `src/daw/components/LeadSheet/ChordSymbol.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`

### dock-instruments

- **dock-instruments-22** (ux, effort S, confirmed): Loading and empty states read as errors and hide controls that could be used. `src/daw/components/Controls/OracleSynthInline.tsx`, `src/daw/components/Controls/OracleSynthView.tsx`, `src/daw/components/Controls/OrganView.tsx`
- **dock-instruments-23** (correctness, effort S, confirmed): The dock badge labels Tonewheel Organ tracks as 'AUDIO', and the collapse button has no name. `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Controls/TrackControlsPanel.tsx`
- **dock-instruments-24** (code-health, effort S, confirmed): Instrument plumbing is copied in several places and the copies have already drifted (computer keyboard, groove loading, pad mapping, collab note relay). `src/daw/components/Controls/KeyboardView.tsx`, `src/daw/components/Controls/SoundFontView.tsx`, `src/daw/components/Controls/OrganView.tsx`
- **dock-instruments-25** (performance, effort S, confirmed): CrystalIcons ships 64 KB of high-precision path data in the single DAW chunk, and one icon is duplicated. `src/daw/components/Controls/CrystalIcons.ts`

### fx-mixer

- **fx-mixer-23** (correctness, effort S, confirmed): Mixer peak-hold markers freeze after playback stops. `src/daw/components/Studio/StudioView.tsx`, `src/daw/hooks/useMeterLevel.ts`
- **fx-mixer-24** (ux, effort S, confirmed): Add-track menu: 'Import' creates an empty track, the cards overflow narrow screens, and there are no descriptions. `src/daw/components/Mixer/AddTrackMenu.tsx`, `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/components/ui/circle-animations-collection-3.tsx`
- **fx-mixer-25** (code-health, effort S, confirmed): Dead code, and four copies of the rack's wiring code. `src/daw/components/Mixer/MixerPanel.tsx`, `src/daw/components/Mixer/ChannelStrip.tsx`, `src/daw/components/Effects/InfoPanel.tsx`
- **fx-mixer-26** (performance, effort S, confirmed): Per-frame waste in the EQ spectrum and the FX meters. `src/daw/components/Effects/GraphicEQ.tsx`, `src/daw/components/Effects/FxMeter.tsx`
- **fx-mixer-27** (performance, effort M, confirmed): The gate effect runs on a 16 ms main-thread timer for every chain, so UI lag degrades the audio. `src/daw/audio/EffectChain.ts`, `src/daw/audio/TrackEngine.ts`, `src/daw/audio/AudioEngine.ts`

### ia-flows

- **ia-flows-37** (performance, effort S, partially): Every view, modal and VexFlow load in the single DAW chunk. `src/daw/DawApp.tsx`, `src/daw/components/Score/ScoreView.tsx`
- **ia-flows-38** (code-health, effort S, confirmed): About 1,360 lines of unused UI from an older layout. `src/daw/components/StatusBar.tsx`, `src/daw/components/ui/minimal-dock.tsx`, `src/daw/components/ui/demo.tsx`

### insight

- **insight-19** (visual-design, effort M, partially): Insight's visual language drifts from the Music Atlas look: teal for chrome and primary actions, hard-coded colours, 8–10px type, inline styles everywhere. `src/daw/components/Library/ChordAnalysisPrompt.tsx`, `src/daw/components/Library/LibraryPanel.tsx`, `src/daw/components/Library/ChordSymbolsSection.tsx`
- **insight-21** (code-health, effort M, partially): Live-chord logic and markup are duplicated in InsightContent, and the slice carries dead state. `src/daw/components/Library/InsightContent.tsx`, `src/daw/components/Library/buildChordInsights.ts`, `src/daw/components/Library/ChordCard.tsx`
- **insight-22** (ux, effort S, confirmed): ChordAnalysisPrompt blocks with a modal, forgets 'Not now', and analyzes synchronously. `src/daw/components/Library/ChordAnalysisPrompt.tsx`, `src/daw/store/unisonSlice.ts`, `src/daw/DawApp.tsx`
- **insight-23** (performance, effort S, confirmed): The Cmd-drag note marquee de-duplicates with Array.includes on every pointer move. `src/daw/utils/insightSelection.ts`, `src/daw/components/Timeline/Timeline.tsx`
- **insight-24** (correctness, effort S, confirmed): Role guessing reads lead instruments as chords, and the prompt includes them by default. `src/daw/utils/trackRole.ts`, `src/daw/utils/chordAnalysis.ts`, `src/daw/components/Library/ChordAnalysisPrompt.tsx`
- **insight-25** (correctness, effort S, confirmed): Some chord descriptions state a role, breaking the map's own rule. `src/daw/components/Library/chordTheoryMap.ts`

### instruments

- **instruments-19** (correctness, effort S, confirmed): Drum note mapping: unknown notes play as kicks, and GM side-stick and clap play as full snare. `src/daw/instruments/DrumMachineEngine.ts`, `src/daw/instruments/drumKits.ts`

### leadsheet

- **leadsheet-22** (correctness, effort S, partially): Callbacks keep the old metre after a time-signature change. `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **leadsheet-27** (performance, effort S, confirmed): The always-mounted set-list prompt rebuilds the chart on every edit. `src/daw/components/LeadSheet/SendToSetList.tsx`, `src/daw/midi/leadSheetUtils.ts`, `src/daw/components/LeadSheet/LeadSheetScoreView.tsx`
- **leadsheet-28** (visual-design, effort M, confirmed): Off-brand colours and tiny type in the lead-sheet chrome. `src/daw/components/LeadSheet/SendToSetList.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`, `src/daw/components/LeadSheet/LeadSheetMeasure.tsx`
- **leadsheet-29** (accessibility, effort M, confirmed): Chord and composer editing are mouse-only. `src/daw/components/LeadSheet/ChordSymbol.tsx`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **leadsheet-30** (reload-persistence, effort S, confirmed): Switching views resets the sheet's scroll position, palettes and clipboard. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/Score/ScorePalettes.tsx`, `src/daw/DawApp.tsx`
- **leadsheet-31** (correctness, effort S, partially): The final barline can't be selected on the chart. `src/daw/components/LeadSheet/LeadSheetView.tsx`, `src/daw/components/LeadSheet/LeadSheetStaff.tsx`, `src/daw/components/LeadSheet/LeadSheetMeasure.tsx`
- **leadsheet-32** (code-health, effort S, confirmed): Dead code and 4/4 default arguments hide what the lead sheet actually does. `src/daw/components/LeadSheet/leadSheetMelody.ts`, `src/daw/components/LeadSheet/leadSheetClipboard.ts`, `src/daw/components/LeadSheet/LeadSheetView.tsx`
- **leadsheet-33** (correctness, effort S, confirmed): Score MusicXML slur numbers overflow the allowed range. `src/daw/midi/ScoreMusicXmlExport.ts`

### live-input

- **live-input-19** (visual-design, effort M, partially): Off-brand decorative colour and token drift in the pedal UI. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`, `src/daw/components/Controls/TunerDisplay.tsx`
- **live-input-21** (correctness, effort S, confirmed): Tuner string indicator measures distance wrongly across octave boundaries. `src/daw/components/Controls/TunerDisplay.tsx`
- **live-input-22** (performance, effort S, confirmed): Sampler waveform reallocates the canvas and recomputes styles on every drag move; its cursor suggests the whole wave is draggable. `src/daw/components/Controls/SamplerWaveform.tsx`, `src/daw/components/Controls/SamplerChopsView.tsx`
- **live-input-23** (code-health, effort S, confirmed): NamModelBrowser is dead code, and its custom-model flow would not persist. `src/daw/components/Controls/NamModelBrowser.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`
- **live-input-24** (ux, effort S, confirmed): Guitar view loses the selected block after remount. `src/daw/components/Controls/GuitarBassView.tsx`
- **live-input-25** (ux, effort M, confirmed): Pitch Correction editor is a modal that duplicates the inline controls and hides the arrangement. `src/daw/components/Controls/VocalView.tsx`
- **live-input-26** (code-health, effort L, partially): Two near-identical 1,500–2,400-line views block scoped re-renders and consistent fixes. `src/daw/components/Controls/VocalView.tsx`, `src/daw/components/Controls/GuitarBassView.tsx`

### pianoroll

- **pianoroll-24** (visual-design, effort M, confirmed): Editor chrome drifts from the Music Atlas look (glass vs flat modals, teal primary, mixed radii, hard-coded canvas colours). `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/components/PitchEditor/PitchEditorModal.tsx`, `src/daw/components/PianoRoll/PianoRoll.tsx`
- **pianoroll-25** (performance, effort S, confirmed): A blurred full-screen overlay sits over the live arrangement while the editor is open. `src/daw/components/PianoRoll/PianoRollModal.tsx`, `src/daw/components/PitchEditor/PitchEditorModal.tsx`
- **pianoroll-26** (performance, effort S, confirmed): StudioNotationView re-renders the staff component at playhead rate. `src/daw/components/PianoRoll/StudioNotationView.tsx`, `src/components/notation/StaffView.tsx`
- **pianoroll-27** (correctness, effort L, confirmed): Latent defects that would surface if the pitch editor were wired back up. `src/daw/components/PitchEditor/PitchEditor.tsx`, `src/daw/components/PitchEditor/PitchEditorModal.tsx`, `src/daw/audio/pitch-analysis/PitchRenderer.ts`

### practice-tutorial

- **practice-tutorial-13** (visual-design, effort M, partially): Practice UI uses teal primaries, hard-coded colours and glyph icons, off the Music Atlas look. `src/daw/components/Practice/PracticeTrackView.tsx`, `src/daw/components/Practice/ScaleKeyboard.tsx`, `src/daw/components/Practice/ChordChart.tsx`
- **practice-tutorial-16** (performance, effort M, partially): Spotlight queries the DOM and reads layout every frame for the whole lesson. `src/daw/components/Tutorial/Spotlight.tsx`, `src/daw/components/Tutorial/targetRect.ts`, `src/daw/components/Tutorial/CoachCard.tsx`
- **practice-tutorial-22** (ux, effort S, confirmed): The chord chart lights nothing while paused, though the keyboard shows the parked chord. `src/daw/components/Practice/ChordChart.tsx`, `src/daw/components/Practice/PracticeTrackView.tsx`
- **practice-tutorial-23** (performance, effort S, confirmed): The confetti canvas stays mounted as a full-screen high-DPR layer after its 1.1 s burst. `src/daw/components/Tutorial/Confetti.tsx`, `src/daw/components/Tutorial/TutorialLayer.tsx`
- **practice-tutorial-24** (code-health, effort S, confirmed): The tutorial portal copies theme tokens once instead of inheriting them. `src/daw/components/Tutorial/TutorialLayer.tsx`
- **practice-tutorial-25** (code-health, effort S, partially): The dashboard imports the full lesson file, including step logic and the prism-engine barrel. `src/components/ClassroomLayout/studio/StudioProduction.tsx`, `src/daw/components/Tutorial/tutorials.ts`

### prism-engine

- **prism-engine-10** (ux, effort S, partially): Suggested chord names and committed labels use their own format. `src/daw/prism-engine/engine/suggestionEngine.ts`, `src/daw/prism-engine/engine/naming.ts`, `src/daw/store/prismSuggestionSlice.ts`
- **prism-engine-11** (performance, effort S, partially): Unreachable orchestration code ships about 90 KB of generators and pattern data in the eagerly loaded DAW chunk. `src/daw/prism-engine/engine/orchestrator.ts`, `src/daw/store/prismSlice.ts`, `src/daw/prism-engine/index.ts`
- **prism-engine-12** (correctness, effort M, confirmed): The disabled band generators hide wrong-note and silent-fallback bugs. `src/daw/prism-engine/data/keyColors.ts`, `src/daw/prism-engine/engine/bassGenerator.ts`, `src/daw/prism-engine/engine/melodyGenerator.ts`
- **prism-engine-13** (reload-persistence, effort S, confirmed): Suggestion modal state survives project switches and SPA navigation. `src/daw/store/prismSuggestionSlice.ts`, `src/daw/persistence/SessionSerializer.ts`, `src/daw/components/Prism/PrismSuggestionModal.tsx`
- **prism-engine-14** (performance, effort S, confirmed): detectChordWithInversion rebuilds normalized chord definitions on every call. `src/daw/prism-engine/engine/naming.ts`, `src/daw/hooks/useLiveChordColor.ts`, `src/daw/components/Library/InsightContent.tsx`
- **prism-engine-15** (correctness, effort S, confirmed): E/G# (graph chord '3 major/3') has no colour entry and shows in the home-key colour. `src/daw/prism-engine/data/keyColors.ts`, `src/daw/prism-engine/engine/colorSystem.ts`, `src/daw/prism-engine/data/progressionGraph.ts`

### prism-ui

- **prism-ui-22** (code-health, effort M, confirmed): Dead code and an oversized 2,106-line slice. `src/daw/store/prismSlice.ts`, `src/daw/components/Prism/RootNoteSelector.tsx`, `src/daw/components/Prism/PrismDrawer.tsx`
- **prism-ui-23** (correctness, effort S, confirmed): The premium lock on Prism only blocks the mouse, and the Prism suggestion menu isn't gated. `src/components/ui/LockedFeatureOverlay.tsx`, `src/daw/components/ChannelStrip/ChannelStrip.tsx`, `src/daw/components/Timeline/Timeline.tsx`

### score

- **score-29** (ux, effort M, partially): One clef per part, chosen by average pitch, means heavy ledger lines. `src/daw/components/Score/scoreParts.ts`, `src/daw/components/Score/ScoreView.tsx`, `src/components/notation/StaffView.tsx`
- **score-30** (ux, effort M, confirmed): The empty state is a dead end, and the parts panel only toggles chords. `src/daw/components/Score/ScoreView.tsx`, `src/daw/components/Score/ScorePartsPanel.tsx`, `src/daw/components/Score/scoreParts.ts`
- **score-31** (correctness, effort S, confirmed): Undo and Redo tooltips show a literal '⌘Z'. `src/daw/components/Score/NoteEditorBar.tsx`

### shell

- **shell-24** (performance, effort S, partially): Background loops keep the main thread awake every frame, even when nothing is happening. `src/daw/DawApp.tsx`, `src/daw/hooks/useAudioChordDetection.ts`, `src/daw/hooks/useGuitarMidiDetection.ts`
- **shell-30** (performance, effort M, confirmed): Every view and dialog ships in one DAW download. `src/daw/DawApp.tsx`, `src/daw/components/Transport/FileMenu.tsx`
- **shell-31** (code-health, effort S, partially): Dead and duplicated shell code. `src/daw/components/StatusBar.tsx`, `src/daw/components/ui/minimal-dock.tsx`, `src/daw/components/ui/demo.tsx`
- **shell-32** (correctness, effort S, confirmed): ⌘⇧F zoom-to-fit can't find the timeline and always assumes 800 px. `src/daw/hooks/useKeyboardShortcuts.ts`
- **shell-34** (ux, effort M, partially): Export can't be cancelled and its progress bar doesn't track progress. `src/daw/components/Transport/ExportAudioDialog.tsx`, `src/daw/components/Transport/FileMenu.tsx`
- **shell-35** (visual-design, effort S, confirmed): Track colour palette includes colours that vanish on the dark background. `src/daw/constants/trackColors.ts`, `src/daw/store/tracksSlice.ts`

### state-reload

- **state-reload-33** (ux, effort S, confirmed): Switching views resets whether the Library panel is open. `src/daw/store/uiSlice.ts`, `src/daw/DawApp.tsx`
- **state-reload-34** (code-health, effort S, confirmed): Dead data and state blur the persistence model. `src/daw/data/sampleLibrary.ts`, `src/daw/data/projectMeta.ts`, `src/lib/studio-projects/api.ts`

### synth-engine

- **synth-engine-20** (performance, effort M, partially): Reverb IR is generated at construction and regenerated during SIZE/DECAY drags, cutting the tail and blocking the main thread. `src/daw/oracle-synth/audio/fx/ReverbEffect.ts`
- **synth-engine-23** (ux, effort S, confirmed): OSC 2 / SUB / NOISE on-off toggles only take effect at the next note. `src/daw/oracle-synth/audio/Voice.ts`
- **synth-engine-24** (ux, effort S, confirmed): Compressor is a hidden 50/50 parallel blend, and FX card order has no effect on processing. `src/daw/oracle-synth/audio/fx/CompressorEffect.ts`, `src/daw/oracle-synth/audio/fx/FXProcessor.ts`, `src/daw/oracle-synth/audio/fx/FXChain.ts`
- **synth-engine-25** (code-health, effort S, confirmed): If the track is disposed while init is still awaiting ctx.resume(), the half-built engine's running nodes leak. `src/daw/oracle-synth/audio/SynthEngine.ts`, `src/daw/instruments/OracleSynthAdapter.ts`

### synth-store

- **synth-store-15** (visual-design, effort S, confirmed): Preset picker styling ignores the Music Atlas tokens: low-contrast greys, 9-10 px text, navy and teal primary button. `src/daw/oracle-synth/components/preset/PresetSelector.module.css`, `src/daw/components/Controls/OracleSynthInline.tsx`

### synth-ui

- **synth-ui-23** (code-health, effort S, confirmed): Dead and duplicated synth shells have already drifted apart. `src/daw/oracle-synth/main.tsx`, `src/daw/oracle-synth/App.tsx`, `src/daw/oracle-synth/App.module.css`
- **synth-ui-24** (ux, effort S, confirmed): Fine tuning (−100 to +100 cents) is set by clicking a stepper one cent at a time. `src/daw/oracle-synth/components/modules/OscillatorModule.tsx`, `src/daw/oracle-synth/components/controls/NumberStepper.tsx`
- **synth-ui-25** (ux, effort S, confirmed): The LFO editor's controls are hidden and easy to trigger by accident. `src/daw/oracle-synth/components/visualizers/LFONodeEditor.tsx`, `src/daw/oracle-synth/components/visualizers/LFONodeEditor.module.css`
- **synth-ui-26** (reload-persistence, effort S, confirmed): The mod wheel position isn't re-applied after a remount or track switch. `src/daw/oracle-synth/hooks/useSyncStoreToEngine.ts`, `src/daw/oracle-synth/synthTrackState.ts`

### timeline

- **timeline-27** (accessibility, effort S, confirmed): The Add Track picker isn't an accessible dialog and overflows narrow screens. `src/daw/components/Timeline/TimelineWithHeaders.tsx`, `src/daw/components/Mixer/AddTrackMenu.tsx`
- **timeline-28** (visual-design, effort S, confirmed): Off-brand colours and inline styles in the timeline slice. `src/daw/utils/rulerLoop.ts`, `src/daw/components/Timeline/Timeline.tsx`, `src/daw/components/Timeline/AutomationLaneEditor.tsx`
- **timeline-29** (code-health, effort S, confirmed): Dead components and duplicated tick logic. `src/daw/components/TrackControls/TrackList.tsx`, `src/daw/components/TrackControls/NewTrackModal.tsx`, `src/daw/collab/ui/PresenceCursors.tsx`
