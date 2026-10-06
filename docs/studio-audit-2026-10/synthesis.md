# Studio editor audit: synthesis

## Root-cause themes

### No single project document: hand-maintained field lists have drifted (critical)

**Root cause.** Six hand-written lists decide what survives a reload or reset: serializeSession, serializeSessionForCloud, freshProjectHarmony/resetSessionToEmpty, MARK_KEYS, diffEngine TRACK_SCALAR_KEYS and the yjsToZustand observers. They have drifted apart. The cloud API has no project-level field: CloudProjectInput carries only name, composer, bpm, a 4-field prism block, returns and tracks. Chord-region ids also come from a per-tab counter that restarts on every load.

**What students see.** A refresh or cloud reopen loses chord symbols, mode, time signature, markers, mastering and every Score and Lead Sheet mark, while Save still says 'Project saved'. The next project also inherits the previous one's metre, markers, key lock and mastering.

**Fix strategy.** Create one PROJECT_FIELDS registry ({key, default, local, cloud, collab, undo, perUser, resetOnNew, migrate}) and generate everything from it: the local and cloud codec (schema v3), the initialProjectState() used by every reset and load, the Yjs write, observe and pull maps, and the undo scope. Add a unit test that fails when a store field appears in no column. For the cloud, add a versioned JSON document column. Until it exists, carry the document on tracks[0].settings, the way masterAutomation already does. Mint chord ids with crypto.randomUUID and dedupe on load. Make the save toast honest until the cloud carries the full document.

**Findings:** shell-03, insight-01, score-01, leadsheet-01, state-reload-01, state-reload-04, ia-flows-01, ia-flows-03, fx-mixer-01, shell-10, timeline-02, timeline-03, leadsheet-03, prism-ui-07, prism-engine-03, state-reload-09, state-reload-12, state-reload-13, state-reload-14, state-reload-10, state-reload-16, ia-flows-06, score-03, prism-ui-03, state-reload-15, prism-ui-08, prism-engine-13, score-15, leadsheet-24, collab-11, collab-18, state-reload-19, score-04, state-reload-05, prism-ui-05

### Autosave, boot and save status have no document version (critical)

**Root cause.** useAutosave subscribes to every store write and restarts a 1.5 s debounce, so the 30 Hz playhead and presence writes starve it. It never flushes on unmount or pagehide, writes a single localStorage slot shared by all tabs, and ignores useSynthStore. Boot restores that slot over a live in-memory session, and every entry intent resets the session without a guard. 'Unsaved' is inferred from canUndo(), and nothing records what was last saved.

**What students see.** Edits made while a loop plays are lost on refresh. Returning to the editor quietly restores an older copy over newer work. Dashboard tiles, lessons, collab links and File > Open discard work without asking, and the editor never shows whether work is saved.

**Fix strategy.** Add documentVersion (bumped only by registry fields) and lastSavedVersion to the store. Autosave: 1 s debounce with a 5 s maxWait, keyed on documentVersion, flushed synchronously on pagehide, on hidden visibility and on unmount. Store drafts in IndexedDB keyed by draftId, with a navigator.locks lock per tab and a synchronous localStorage copy of the last write. Mark the store as hydrated so an in-app return never restores over it. Add one openSession(intent) state machine (validate, confirmLeaveSession() with Save / Keep as draft / Discard, reset, load) with an 'Opening…' overlay and an error panel. File > New resets in place without a reload. One saveProject() command serves the menu and Cmd+S and drives a save chip (Saved / Saving… / Unsaved / Saved on this device / Couldn't save – Retry). Replace the Open submenu with a searchable Projects dialog.

**Findings:** state-reload-02, shell-01, ia-flows-05, engine-hooks-01, shell-07, dock-instruments-02, fx-mixer-21, state-reload-06, bundle-load-01, ia-flows-04, synth-store-01, synth-ui-04, state-reload-29, state-reload-28, insight-08, ia-flows-02, bundle-load-02, shell-08, state-reload-03, practice-tutorial-07, collab-03, insight-03, shell-09, state-reload-25, bundle-load-10, shell-22, shell-28, shell-14, state-reload-20, ia-flows-18, leadsheet-20, shell-15

### One unscoped global keydown handler (critical)

**Root cause.** useKeyboardShortcuts is a single window listener. It never checks currentView, the focused element, open dialogs, e.defaultPrevented or Alt, and its Cmd branch fires even inside text fields. Score, Lead Sheet, the piano roll, the Prism modal and three computer-keyboard pianos each add their own listener and key map, but none can stop the global one. Record, save and MIDI export are re-implemented inside the handler instead of shared with the buttons.

**What students see.** Deleting a note in Score also deletes a hidden arrangement clip. ⌥R in notation starts recording, and R records over a take without the warning. Text fields and browser zoom are hijacked, and playing the computer keyboard toggles loop and the metronome.

**Fix strategy.** Build one command registry with a scope-stack dispatcher (global > view > focused region > musical typing > dialog). It returns early on editable targets (except Cmd+S), [role=dialog] and [role=menu], defaultPrevented and e.repeat. The global scope keeps only transport, view switching, save and undo. Score, Lead Sheet and the Notes editor own capture-phase keymaps. One useMusicalTyping hook (A = C4, Z/X octave, C/V velocity, K toggles with a visible chip) suspends single-letter shortcuts and feeds the shared live-notes path. Buttons and keys call the same commands (requestRecord, saveProject, exportProjectMidi). Clear clip selection on view change, build the '?' sheet and tooltips from the registry, and leave Cmd +/− to the browser.

**Findings:** shell-02, score-02, leadsheet-02, pianoroll-03, prism-ui-04, shell-12, ia-flows-07, ia-flows-08, dock-instruments-05, synth-ui-06, shell-13, shell-33, practice-tutorial-10, state-reload-24, dock-instruments-18, shell-32, insight-07

### No shared time model (clip vs song ticks, visual vs real bars, metre) (critical)

**Root cause.** PianoRoll takes two ambiguous origin numbers, so the dock and KeyboardView pass song positions where a clip-relative origin is expected. The drum grid binds to the first clip, and chord colours and the scissors tool compare clip-relative ticks with song ticks. Lead Sheet mixes visual slot indexes with real bar indexes, and many tools hard-code 1920 ticks per bar.

**What students see.** Clips after bar 1 look empty in the dock and new notes land bars late. Bars shift after multi-bar rests, 3/4 and 6/8 songs get 4/4 maths, and moving any MIDI clip drags the whole chord lane with it.

**Fix strategy.** Add a tested timeModel module: ticksPerBar(ts), toSongTick and toClipTick, midiClipLength, splitMidiClip, snapTicks(state), and a barSlots selector (real bar to visual slot) shared with toSetListChart. The Clip Editor takes {trackId, clipId} and derives its origin itself. Editors bind to the selected clip, then the clip under the playhead, then the first clip. ticksPerBar becomes a required argument everywhere, with no 4/4 defaults. Chord regions record their source clip, so a move shifts only the regions derived from that clip.

**Findings:** pianoroll-01, dock-instruments-01, pianoroll-02, pianoroll-09, pianoroll-10, timeline-04, dock-instruments-03, dock-instruments-10, leadsheet-05, leadsheet-07, prism-ui-21, prism-ui-06, leadsheet-19, leadsheet-22, leadsheet-23, ia-flows-34, score-14, timeline-14, timeline-05

### Audio clip edits copy and evict buffers; there is no asset model (critical)

**Root cause.** AudioBufferStore keys decoded audio by clip id. Split and overwrite therefore slice or copy buffers, drop assetId, gain and offset, and evict at edit time. Undo snapshots end up pointing at evicted buffers, and cloud loads mint new clip ids, so buffers are never shared or released.

**What students see.** Splitting a clip or recording over a take can discard the uploaded recording or play the wrong audio. Undo brings back silent clips, memory grows with every project opened, and failed downloads show a fake waveform or 'Loading…' forever.

**Fix strategy.** Add a project-scoped asset store keyed by assetId, with reference counts held by the document and the undo/redo stacks. Clips become {assetId, offsetSeconds, duration, gain, fades}. Split, trim and overwrite only create new clip references; the scheduler and serializer already honour offsetSeconds. Evict buffers on project switch or when nothing references them. Keep track and clip ids stable across cloud round trips. Track a per-clip load status (loading / failed / missing) with backoff retry and explicit tiles. Route clip moves through one moveClip action that checks locks and track types.

**Findings:** timeline-01, audio-core-06, audio-core-07, state-reload-23, audio-core-08, timeline-26, state-reload-27, engine-hooks-16, timeline-25, live-input-17, timeline-06

### Audio is scheduled at 'now' instead of the supplied time (critical)

**Root cause.** Immediate paths use ctx.currentTime, Tone.now(), setTimeout or setInterval instead of the event time Tone supplies, ignoring the 100 ms lookAhead. This affects mid-clip starts, loop laps, the metronome grid and count-in, Oracle voice allocation, stealing, release and the arp, organ cleanup, live drum hits, allNotesOff, the gate, ducker and wah loops, recording placement and the displayed playhead.

**What students see.** Audio clips play about 100 ms ahead of MIDI, the metronome is off the beat after pause, takes land off the beat and notes get cut short or stick. Oracle tracks export wrong, and the playhead runs ahead of what students hear.

**Fix strategy.** Give one playback scheduler ownership of MIDI, audio clips, automation and the metronome. It reacts only to Tone transport events (start, seek, loop, stop) and always schedules at the supplied time. Every adapter API takes a time argument (noteOn, noteOff, allNotesOff, panic). Voices are freed from onended or a context-time queue, and the transport starts at an explicit t0. Move the gate, ducker, de-esser detector and wah follower into AudioWorklets so live playback and offline render match. Display tick = transport.getTicksAtTime(ctx.currentTime − outputLatency). Add golden offline-render tests for loop, seek and count-in.

**Findings:** synth-engine-01, synth-engine-02, synth-engine-03, synth-engine-04, synth-engine-05, synth-engine-11, synth-engine-16, audio-core-02, audio-core-03, engine-hooks-06, audio-core-05, engine-hooks-22, engine-hooks-18, instruments-06, instruments-18, instruments-03, audio-core-14, engine-hooks-13, audio-core-18, engine-hooks-24, engine-hooks-10, dock-instruments-07, audio-core-10, audio-analysis-09, fx-mixer-27

### Frame-rate state flows through the main store and React state (critical)

**Root cause.** useTransport writes the playhead into the main store at about 30 Hz. That wakes every whole-store listener (autosave, collab middleware, presence, undo) and re-renders nine position subscribers, including the roughly 3,000-line Timeline at its top level. useMeterLevel and its siblings call setState every frame. The presence selector returns a new object with no equalityFn, so every store write rebroadcasts presence. Analysis and RTC loops keep running while idle.

**What students see.** During playback, large parts of the editor re-render 30–60 times a second. Collab sessions loop presence updates and starve autosave, and Chromebooks stutter even when nothing is playing.

**Fix strategy.** Add a small playheadClock external store fed by one requestAnimationFrame loop that reads the Tone transport, with latency compensation. PlayheadLayer components (copying PianoRoll's Playhead) write transform through refs. The main store's position is written only on stop, seek and pause. Derived selectors (current chord index, current system) replace raw position. One MeterBus loop, at 30 Hz or less and only while playing, recording or monitoring, writes to canvas or CSS variables. Publish presence with shallow equality and refresh lastActiveAt at most every 10 s. Analysers publish only when a value changes, and one EngineClock service starts and stops the detection, RTC and visualiser loops.

**Findings:** collab-02, engine-hooks-15, engine-hooks-25, timeline-23, score-05, leadsheet-12, leadsheet-13, practice-tutorial-01, ia-flows-30, dock-instruments-06, pianoroll-26, fx-mixer-05, fx-mixer-06, engine-hooks-07, design-system-04, ia-flows-19, timeline-08, insight-10, audio-analysis-13, engine-hooks-19, live-input-04, audio-analysis-14, collab-23, synth-ui-13, synth-ui-14, fx-mixer-15, fx-mixer-23, fx-mixer-26, engine-hooks-26, shell-24, collab-29, bundle-load-12, practice-tutorial-22

### Coarse subscriptions: engine sync and panels watch the whole tracks array (high)

**Root cause.** Nine engine hooks run inside DawAppInner, so the editor shell re-renders on every track, fader or presence change. usePlaybackEngine's [isReady, tracks] effects re-apply every track's mixer and FX chain on each edit, and the schedule is built only once per Play. TransportBar, PrismStudio, Insight and the track headers select the whole tracks array, and remote collab changes rebuild every track object.

**What students see.** Edits made during playback aren't heard until the transport restarts. Seeking desyncs audio and can leave notes hanging, automated parameters jump, and every drag repaints the whole editor.

**Fix strategy.** Move the engine bindings into a renderless EngineHost (or plain modules) driven by useStore.subscribe(selector, fn, {equalityFn}). DawAppInner then subscribes only to layout state. A reconciler keeps the last-applied object per track, skips tracks whose reference hasn't changed and diffs the rest field by field. The incremental scheduler keys Parts by clip id plus version and exposes reschedule(fromTick, when) for seeks. Guard async instrument init with a per-track token. Panels use useTrackIds() + useTrack(id) or derived fingerprints. Remote collab changes rebuild only the tracks they touched, keeping unchanged objects.

**Findings:** shell-04, ia-flows-09, engine-hooks-02, state-reload-08, engine-hooks-03, audio-core-11, engine-hooks-14, engine-hooks-04, pianoroll-06, engine-hooks-05, audio-core-04, audio-core-21, engine-hooks-08, engine-hooks-20, instruments-09, engine-hooks-23, shell-27, shell-17, prism-ui-20, prism-ui-12, insight-09, collab-06, state-reload-26, collab-30

### No edit-transaction model: pointer moves commit to the whole project, and undo snapshots an ad-hoc subset (high)

**Root cause.** Knobs, faders, note drags and clip drags write to the store on every pointer move. Each write triggers a JSON undo check, a whole-array Yjs transaction, a full engine re-apply and an autosave restart. initUndoTracking adds more than 20 subscriptions on every editor mount and never removes them. Undo covers only tracks, chordRegions and MARK_KEYS; it records seeds and system writes and leaves out mastering, returns, key/mode and synth patches.

**What students see.** Dragging a control lags more as the project grows. One gesture can create dozens of undo steps or collab overwrites, and Cmd+Z can undo an unrelated earlier edit or empty a freshly loaded template.

**Fix strategy.** Add a useContinuousControl(preview, commit) contract to every knob, fader and drag. Preview sets the AudioParam with setTargetAtTime (5–20 ms) and updates a ref-driven readout. Commit writes the store once on pointerup: one undo entry, one Yjs update, one autosave bump. Coalesce with requestAnimationFrame and skip unchanged values. Make initUndoTracking idempotent now. Then replace snapshot diffing with a labelled, per-gesture patch history over the registry's undo fields, using origin tags to ignore seed, system and remote writes, plus a withoutHistory(seed) wrapper. Generate the collab UndoManager scope from the same registry.

**Findings:** fx-mixer-07, design-system-03, pianoroll-04, dock-instruments-13, live-input-05, audio-analysis-07, collab-07, fx-mixer-20, synth-ui-12, synth-engine-14, synth-engine-21, score-20, leadsheet-26, shell-06, ia-flows-10, state-reload-07, state-reload-22, state-reload-21, fx-mixer-08, prism-ui-11, insight-06, score-12, collab-19, synth-store-11, synth-ui-05

### Views, not the engine, apply instrument and input state, and devices have no service (critical)

**Root cause.** VocalView, GuitarBassView and DrumMachineView keep pedal chains, the NAM model, input device and channel, and pad mix in local state. They are the only code that pushes this state into the audio adapters, so it reaches the engine only while that view is mounted. audioInputChannel is never persisted, and remote collab edits wipe it. Permission, connection, monitoring and latency handling live inside two views of 1,500–2,400 lines, with no persistent input stream and no capture timestamps.

**What students see.** After a refresh, cloud open or collab join, guitar and vocal takes play back without their tone, and armed tracks record from the wrong input until the student opens that track's Controls tab. Mic errors are invisible, and feedback through speakers is likely.

**Fix strategy.** Make the store the only source of truth, as Organ and Chops already are. An engine-side applyTrackState(track) runs at instrument init and in the track-sync reconciler, using the parameter-only fast path and a module-level NAM model cache. Treat input routing as per-user local preferences that every collab merge preserves. Build a LiveInputService that owns device lifecycle, a connection status (connected / blocked / busy / disconnected), a permission explainer, monitoring off by default with a headphone prompt, a stream kept open while armed, AudioWorklet capture timestamps and latency calibration. Move the shared guitar and vocal code into a LiveInputAdapter base and shared view modules.

**Findings:** live-input-01, live-input-02, live-input-03, audio-analysis-01, instruments-02, dock-instruments-04, live-input-08, instruments-11, fx-mixer-10, engine-hooks-21, collab-08, state-reload-11, live-input-13, live-input-06, live-input-07, instruments-13, live-input-14, audio-core-15, shell-21, audio-core-23, engine-hooks-27, live-input-09, engine-hooks-17, live-input-16, audio-analysis-04, audio-analysis-05, audio-analysis-08, live-input-20, instruments-16, live-input-26, engine-hooks-11, practice-tutorial-04, live-input-24

### Load path: instruments have no lifecycle contract and the editor ships as one gated chunk (critical)

**Root cause.** Instruments are created only after the first click, Play doesn't wait for them, and load failures are silent and cached for the session. There is no shared decode cache, and assets are oversized or hosted by third parties (a 19.5 MB WAV kit decoded per track, a 31 MB SoundFont). The shared SoundFont synth is connected with connect(), so every SoundFont track receives every channel. The editor itself is one 1.13 MB chunk that starts downloading only after auth and an unrelated songs gate.

**What students see.** The first Play on a demo is silent or partial, with no feedback, while about 50 MB downloads. GM tracks bleed into each other and ignore mute and solo, a failed load stays silent until reload, and cold opens are slow on school networks.

**Fix strategy.** Add an InstrumentHost lifecycle (create, load with an AbortSignal, then ready or error). Status and progress live in an instrumentStatus slice that drives a ring on the track header, a 'Loading sounds 3/5' pill and a Retry action. Build the audio graph on the suspended context at mount so the first gesture only resumes it. Add a shared SampleCache (URL to Promise<AudioBuffer>, LRU by bytes) used by every adapter and by export. Route SoundFont output per channel. Shrink the kit to about 2 MB or less, use SF3 or a curated GM subset, self-host every sample and replace the placeholder reverb IRs. Drop the route gate; add preloadDaw(), React.lazy per view, dock tab, instrument view and modal, a DAW skeleton, an ErrorBoundary that flushes the draft, a vite:preloadError reload, and immutable cache headers. Target a boot chunk of 150 KB gzip or less.

**Findings:** instruments-01, instruments-07, instruments-04, bundle-load-03, bundle-load-04, bundle-load-05, instruments-05, instruments-10, instruments-12, instruments-14, instruments-15, instruments-19, bundle-load-11, instruments-17, dock-instruments-08, prism-ui-17, dock-instruments-22, engine-hooks-29, audio-core-17, bundle-load-06, bundle-load-08, bundle-load-09, bundle-load-13, bundle-load-14, bundle-load-15, bundle-load-16, bundle-load-17, bundle-load-18, shell-30, ia-flows-37, score-21, practice-tutorial-25, prism-engine-11, dock-instruments-25

### Oracle Synth patches live in a global store plus a side cache, applied by two drifting paths (high)

**Root cause.** The selected track's patch lives in a singleton useSynthStore that a bridge swaps on panel mount; other tracks' patches sit in a module-level Map. The load and export path (applySynthStateToEngine) has drifted from the panel's sync: it skips reverb, uses a frozen per-patch tempo, and wavetable-position modulation runs only in a dead UI hook. Pack wavetables register only when a panel mounts, route ids come from per-page counters, and patch fields are listed in five places.

**What students see.** After a reload and in exports, saved synth sounds play without reverb, at the wrong tempo and on basic waveforms. A new synth track copies the previous track's patch, and synth edits miss autosave, undo and collaborators.

**Fix strategy.** Define one PATCH_SCHEMA (key, default, migrate, applyToEngine). From it, build a versioned migratePatch shared by presets, snapshots, imports and demos, and one diffed engine.applyPatch(patch, {projectBpm}) used by init, panel mount, preset load and export. Store patches in the main store as oraclePatches[trackId] (registry fields), so autosave, undo and Yjs cover them. Seed every new track with INITIALIZE or a preset matched to its role. Treat tempo as host state pushed to every engine. Register the pack manifest at boot, run wavetable-position and blend modulation inside the engine, mint route ids with UUIDs, and rebuild LFOs at control rate in batches.

**Findings:** synth-store-02, synth-ui-01, synth-engine-06, synth-store-04, synth-engine-07, synth-ui-02, synth-engine-09, synth-store-03, synth-engine-08, synth-store-05, engine-hooks-28, state-reload-32, synth-ui-17, synth-store-06, synth-ui-11, synth-store-07, synth-store-08, synth-ui-18, synth-store-10, synth-store-12, synth-store-16, synth-store-09, synth-engine-10, synth-ui-26, synth-engine-12, synth-engine-13, synth-engine-18, synth-engine-19, synth-engine-20, synth-engine-23, synth-ui-19, synth-store-13, synth-ui-23

### Generators replace work instead of previewing and inserting (high)

**Root cause.** Prism Create clears the selected track and the chord lane, and the builder's Clear wipes the chord lane. Suggestion commits delete regions that only partly overlap, chord paste and clear rewrite every chord in the song, the set-list update can overwrite with a blank chart, and jam import deletes the saved jam before importing. None of these has a preview or an explicit insert target.

**What students see.** One click on Create or Clear can silently destroy a student's clips or chord symbols, and undo can't always bring them back.

**Fix strategy.** Generators produce preview takes (a ghost clip or chord-lane preview). The student auditions them and commits one labelled undo step at the playhead, loop or selection; nothing ever clears a track. Chord-lane reconciliation runs only over the written range. Builder Clear stays scoped to the builder, and 'Clear chord lane' becomes a separate, confirmed action. Update prompts show a before/after summary, with Keep as the primary action. Run Create synchronously and drop the per-click worker.

**Findings:** prism-ui-01, ia-flows-15, prism-ui-02, prism-engine-05, prism-engine-04, prism-ui-15, prism-ui-16, prism-engine-09, leadsheet-08, leadsheet-04, collab-14, prism-engine-06

### Chords are identified by display labels, and key and mode have several sources of truth (high)

**Root cause.** The suggestion engine re-parses abbreviated display labels and ignores the mode. The detected-key bus overrides the key the student set, and key colour is written onto every track. Insight cards follow the unsaved builder draft instead of the chord lane, and chord entry accepts any text.

**What students see.** Minor-key projects get major-key suggestions, and auto-tune and synth snap follow a stale detected key. Chord labels disagree between Prism, Insight, Lead Sheet and exports, which undermines the theory teaching.

**Fix strategy.** Give every chord one canonical identity {rootPc, quality (CHORDS key), degreeKey}, carried by ChordRegion and SuggestionChord, and derive every label through lib/chordNotation. Add a keyFrame helper built on getModeOffset, modeToIonianLabel and ionianToModeLabel, shared by prismSlice and the suggestion engine. Make the session key authoritative through an effectiveKey selector; detection fills it only when no key is set. Derive key colour at render time behind a 'Colour clips by: Track | Harmony' toggle. Validate chord entry with readChordInput and show inline feedback.

**Findings:** prism-engine-02, prism-engine-01, prism-engine-10, insight-05, audio-analysis-10, prism-ui-10, insight-16, insight-14, insight-15, prism-engine-07, prism-engine-08, prism-engine-15, insight-24, insight-25, leadsheet-17, score-26, live-input-12, prism-ui-09, prism-ui-14

### Analysis runs on the main thread and is triggered by the wrong events (high)

**Root cause.** Offline chord analysis, YIN pitch analysis and the full UNISON analysis run synchronously on the main thread. Post-take refinement is triggered by transport polling, so it analyses the previous take, and Insight re-runs on any track change or panel mount. Competing writers overwrite a single unisonDoc.

**What students see.** The editor freezes for seconds after each take. The 'refined' chords describe the wrong take, and the whole-song Insight is replaced by one recording placed at bar 1.

**Fix strategy.** Run analysis in a Web Worker with progress and cancel. The recorder emits onTakeCommitted({trackId, clipId, startTick, buffer}), and refinement analyses exactly that clip. Schedule Insight from a store subscription keyed on a harmony fingerprint (notes, chord lane, key and mode, bpm, metre) and cache the last result. Keep per-clip audio analyses keyed by clipId as a separate layer. Make 'Detect chords' an explicit clip action, and replace the blocking analysis modal with a chord-lane banner.

**Findings:** audio-analysis-03, engine-hooks-12, audio-analysis-02, audio-analysis-11, audio-analysis-12, audio-analysis-15, audio-analysis-16, pianoroll-20, ia-flows-17, insight-02, ia-flows-31, insight-12, insight-13, insight-22, insight-07

### UI controls are not projections of the engine (high)

**Root cause.** Rack, mixer, synth FX and preset UIs draw from their own lists instead of the engine graph, so labels, order and readouts drift from what is actually processed. Bypass and Gain Match do nothing, and 'LUFS' is the peak level relabelled. Effects run in a fixed order unlike the one shown, the 'off' crush stage soft-clips every track, and most presets only rename the track.

**What students see.** Students learn wrong things: Bypass changes nothing, the 'loudness' reading isn't loudness, the effect order on screen isn't the signal order, and half the presets sound the same.

**Fix strategy.** Draw effect chains from one ENGINE_ORDER list of effect modules (later, a reorderable chain built from activeEffects). Split EffectChain into per-effect modules created on first enable and fully bypassed when off. Put one dB formatter inside Fader and Readout. Hide controls until they work (Gain Match, FX TARGET, the filter's ON and PAN, de-esser FREQUENCY). Wire Bypass in the engine, and either relabel the meter 'Peak' or implement real BS.1770 LUFS in a worklet. Map each preset to a real engine and parameters, or hide it. Smooth parameter changes with setTargetAtTime and crossfade reverb IR swaps.

**Findings:** fx-mixer-02, fx-mixer-03, ia-flows-35, fx-mixer-09, synth-ui-09, synth-engine-24, fx-mixer-13, design-system-15, fx-mixer-14, fx-mixer-18, fx-mixer-19, audio-core-12, audio-core-13, audio-core-16, audio-core-19, synth-engine-15, synth-engine-17, synth-engine-22, audio-analysis-18, audio-analysis-19, instruments-08, state-reload-31, dock-instruments-11, dock-instruments-17, live-input-10, live-input-11, live-input-21, synth-ui-10, synth-ui-15

### No design-system layer: tokens scoped to .daw-root, three token sources, hand-rolled controls (high)

**Root cause.** DAW tokens exist only on .daw-root, and 22 files render into portals outside it. useTheme writes an inline copy of the tokens that overrides daw.css, and --color-text-dim (#6b6b80) fails contrast. With no shared primitive set, knobs, dialogs, menus, selects and segmented controls are each implemented 5–7 times. They use teal as a generic accent, white text on colour and 6–10 px labels, handle the mouse only and carry no ARIA.

**What students see.** Dialogs and popovers render transparent, with invisible primary buttons. Text is too small and faint for classroom screens, and effect, mixer, synth and notation controls can't be used with a keyboard, a screen reader or a touch screen.

**Fix strategy.** Generate tokens.css on :root (--daw-_ aliased to the app's --ui-_) from one tokens.ts, with getDawPalette() for canvases. Delete useTheme, THEMES and the four places that copy tokens into portals. Build src/daw/ui primitives on the existing Radix kit in src/components/ui: Button (white pill primary), IconButton (label required), Toggle, Tabs, Segmented, Select, Menu and ContextMenu, Popover, DawDialog, Sheet, Confirm and Prompt dialogs, Knob (based on the Oracle Knob: role=slider, arrow keys, fine drag, reset, touch-action:none), Fader, Meter, Readout (FixedDigits) and Chip, plus an onColor(hex) helper. Set an 11 px type floor (12 px labels), 24 px targets, and Pointer Events with capture. Enforce with lint rules: no hex literals, no text below 11 px, no literal z-index.

**Findings:** design-system-01, shell-11, collab-10, ia-flows-13, design-system-05, bundle-load-19, practice-tutorial-24, shell-36, design-system-02, ia-flows-32, shell-23, design-system-07, design-system-08, design-system-09, design-system-17, design-system-14, design-system-13, ia-flows-33, dock-instruments-21, fx-mixer-16, dock-instruments-20, live-input-18, synth-ui-21, synth-store-14, synth-store-15, collab-25, shell-25, timeline-21, timeline-22, timeline-27, timeline-28, prism-ui-18, insight-20, score-22, pianoroll-22, leadsheet-29, practice-tutorial-19, dock-instruments-19, fx-mixer-22, prism-ui-19, score-28, synth-ui-20, insight-19, leadsheet-28, practice-tutorial-13, live-input-19, pianoroll-24, shell-35, collab-21, synth-ui-08, engine-hooks-31, practice-tutorial-12, pianoroll-23, score-17, fx-mixer-17, synth-ui-16, score-31, synth-ui-22, synth-ui-24, synth-ui-25

### Layout regions are tied to views, fixed in size and duplicated (high)

**Root cause.** DawApp renders the right panels inside each view branch, so they remount on every view switch, and setCurrentView forces libraryOpen on or off. The dock is a fixed 33vh drawer, animated from height 0 to auto, whose tabs change with the track type. Notes can be edited in three hosts plus pop-out copies. The 48 px top bar holds about 30 controls with no overflow menu, the app sidebar and TopRail surround the editor, and collab adds two more side columns.

**What students see.** On a Chromebook, students see about 3.7 track lanes and a 68 px mixer. Panel state is lost on every view switch, and the same notes can be edited in several places with different rules.

**Fix strategy.** Adopt five regions rendered once, outside the view switch: top bar, track list, canvas, Inspector and editor dock. Keep layout preferences in uiSlice, persisted to localStorage, and per-project view state in the draft. Remove the view-to-libraryOpen coupling and resize panels instantly, with no animated widths next to canvases. Use one Inspector (Insight, Browser, Session), one resizable dock with a constant tab set and a Maximize action instead of modals and pop-outs, and a mixer-first Mix view with a master column. See targetLayoutSketch.

**Findings:** shell-19, ia-flows-24, shell-29, design-system-10, ia-flows-22, ia-flows-23, collab-20, shell-20, design-system-11, ia-flows-21, insight-11, insight-17, insight-18, state-reload-33, state-reload-30, dock-instruments-09, dock-instruments-12, dock-instruments-14, dock-instruments-15, dock-instruments-16, dock-instruments-23, pianoroll-11, pianoroll-15, ia-flows-16, fx-mixer-04, ia-flows-12, fx-mixer-11, fx-mixer-12, fx-mixer-24, prism-ui-13, live-input-15, live-input-25, synth-ui-07, synth-ui-19, synth-store-13, leadsheet-15, score-23, score-18, leadsheet-30, ia-flows-25, ia-flows-26, ia-flows-36, timeline-12, timeline-13, pianoroll-25, score-30, insight-04, design-system-12

### Each editor re-implements interaction basics (medium)

**Root cause.** Timeline, piano roll, drum grid, Score and Lead Sheet each implement their own selection, snapping, zoom, follow-playhead, pointer and context-menu handling. The results include selection by array index, mouse events without pointer capture, no follow-playhead, a grid stuck at 1/4, and marks keyed by tick and pitch instead of stable note ids.

**What students see.** The same gesture behaves differently in each editor, edits hit the wrong notes after an undo or a collaborator's change, and the view never follows playback.

**Fix strategy.** Build a shared editor core: stable ids on MidiNoteEvent (generated on load when missing) and selection by id; one snapTicks with a metre-aware grid menu and a modifier to bypass snap; Pointer Events with setPointerCapture and pointercancel handling; a Follow toggle that pages ahead and pauses while the user scrolls; zoom −/fit/+ buttons; and Radix ContextMenu actions shared by clips and notes. Score and Lead Sheet share one lead-sheet document and command layer, and Score gains a note-input mode.

**Findings:** pianoroll-07, pianoroll-08, pianoroll-12, pianoroll-13, pianoroll-14, pianoroll-16, pianoroll-17, pianoroll-18, pianoroll-19, score-07, score-08, score-10, score-11, score-16, score-24, score-25, score-27, score-29, leadsheet-09, leadsheet-14, leadsheet-16, leadsheet-18, leadsheet-21, leadsheet-25, leadsheet-31, timeline-09, timeline-10, timeline-11, timeline-15, timeline-16, timeline-17, timeline-18, timeline-19, timeline-20, ia-flows-27, shell-18

### Export and interchange don't share the playback model (critical)

**Root cause.** renderProject swaps Tone's global context and rebuilds engines without the realtime-only parts (pedals, timer-driven gate and ducker, Oracle scheduling against currentTime), and its reverb IR cache ignores sample rate. The MIDI and MusicXML exporters re-derive the music with 4/4 assumed and clip offsets ignored, and the lead-sheet print CSS applies to every page.

**What students see.** Export fails on 48 kHz devices and can leave audio dead until reload. Exported audio differs from playback, and exported MIDI plays 3.75× slower with every clip at bar 1.

**Fix strategy.** Use one context-agnostic graph builder for both live playback and OfflineAudioContext, registering worklets per context through a WeakMap. Render at the live sample rate and restore the captured Tone context in a finally block. Encode in a worker with real progress and a Cancel button. Exporters read the project document: one exportProjectMidi on @tonejs/midi at 480 PPQ that applies clip offsets, metre and key, and MusicXML through buildScoreXml with all marks. Scope print CSS to a body class added on beforeprint.

**Findings:** audio-core-01, audio-analysis-06, audio-core-20, shell-34, engine-hooks-09, ia-flows-11, leadsheet-10, score-13, engine-hooks-30, shell-26, leadsheet-11, leadsheet-06, leadsheet-33, audio-analysis-17, synth-engine-25

### Collab session identity is modelled as socket status (critical)

**Root cause.** isCollabActive mirrors the socket's connection state, so there is no real session state. As a result, 'Leave without saving' deletes the user's existing project, and the server-message handler is attached only to the first socket. Rejected rooms reconnect every ~100 ms, a host network blip closes the room, and a refresh forks guests out of it. Deletions are inferred from differences between the doc and the store, and the server lets unauthenticated sockets through.

**What students see.** Leaving a session can delete a student's cloud project, and a network blip ends the class session for everyone. Errors and edit locks are invisible.

**Fix strategy.** Model the session as {phase: idle | connecting | live | reconnecting | ended(reason), roomId, role}, persisted in sessionStorage, and offer 'Rejoin session?' after a refresh. Gate the UI on being in a session, not on the socket. Re-attach the message handler on every 'connecting' status. Treat not-found, full, kicked and closing as terminal and tear down first. Give the host a reconnect grace period on the server, and reject unauthenticated sockets in onBeforeConnect. Only ever delete a draft created during this session, and compute deletions as previous ids minus new ids. Lock a track only while someone is actively editing it, and say so in place ('Ana is editing Bass').

**Findings:** collab-01, collab-04, collab-05, collab-15, state-reload-18, collab-12, collab-09, collab-13, collab-16, collab-17, collab-22, collab-24, collab-26, collab-27, collab-28, pianoroll-18

### Lesson and practice context is temporary, and the overlay is expensive (medium)

**Root cause.** tutorialSlice and practiceSession live only in memory, and their URL parameters are removed after boot. A refresh therefore ends them, while in-app navigation carries them into unrelated projects. The spotlight queries the DOM every frame and runs an endless full-viewport box-shadow animation. Step checks run on every store update and compare references, not values.

**What students see.** Refreshing mid-lesson loses the lesson and the work, a stale practice screen appears over other projects, and half the Production lessons run into a premium lock.

**Fix strategy.** Persist {tutorialId, stepIndex, practiceSession, studentTrackId, view} with the draft in sessionStorage. Resume only in the matching session, and clear the tutorial and practice state in every boot that isn't a lesson. Have components register their own anchors (openDAW's TourAnchors pattern) instead of polling, and measure them with ResizeObserver. Draw the dimmed background as a static SVG mask with a ring that animates only opacity, and respect prefers-reduced-motion. Give each step a selector for the values it checks, a minimum dwell time and a Skip link. Unlock Prism while a lesson is running.

**Findings:** state-reload-17, shell-16, practice-tutorial-02, practice-tutorial-03, practice-tutorial-05, practice-tutorial-06, ia-flows-28, practice-tutorial-08, practice-tutorial-09, practice-tutorial-11, practice-tutorial-14, practice-tutorial-15, practice-tutorial-16, practice-tutorial-17, practice-tutorial-18, practice-tutorial-20, practice-tutorial-21, practice-tutorial-23, ia-flows-29, ia-flows-14, prism-ui-23

### Dead and duplicated code ships in the single chunk (low)

**Root cause.** Earlier layouts and experiments were never removed: MeshGradientBg, StatusBar, minimal-dock, MixerPanel, the PitchEditor stack, the standalone synth shell, the orchestrator and NamModelBrowser. Logic was copied between modules instead of shared, and the copies have drifted.

**What students see.** An invisible full-viewport canvas animates every frame for the whole session, and each fix has to be applied to several drifting copies.

**Fix strategy.** Delete the listed modules, starting with the MeshGradientBg mount in DawApp's root render, and extract the helpers they duplicate. Add an unused-exports check (knip) and a bundle-size budget to CI.

**Findings:** shell-05, design-system-06, bundle-load-07, ia-flows-20, timeline-24, pianoroll-21, pianoroll-27, shell-31, timeline-29, dock-instruments-24, live-input-22, live-input-23, fx-mixer-25, prism-ui-22, insight-21, insight-23, leadsheet-27, leadsheet-32, audio-analysis-20, audio-analysis-21, audio-core-22, collab-31, state-reload-34, design-system-16, ia-flows-38, prism-engine-12, prism-engine-14

## Quick wins

- collab-02, engine-hooks-15: add {equalityFn: shallow} to the presence selector in CollabProvider (it builds a new object on every store write) and stop stamping lastActiveAt on each write. This ends the broadcast loop that re-renders the editor and starves autosave.
- shell-02, score-02, leadsheet-02, pianoroll-03, prism-ui-04 (interim guard): in useKeyboardShortcuts, return early on e.defaultPrevented, e.altKey, editable targets (outside the Cmd+S path) and [role=dialog]; run clip shortcuts only when currentView === 'arrange'; clear clip selection on view change.
- pianoroll-01, dock-instruments-01, pianoroll-02: pass a clip-relative origin of 0 (and clip.startTick as the song offset) from ChannelStrip, KeyboardView and DrumMachineView.
- instruments-01: connect the SoundFont synth per channel with connectChannel/disconnectChannel instead of connect().
- collab-01: record the draft id created in this session and only ever delete that one. Never delete a project that existed before joining.
- audio-core-01: render at the live sample rate, key the IR caches by ctx.sampleRate, and restore the captured Tone context in a finally block.
- state-reload-05, prism-ui-05: mint chord-region ids with crypto.randomUUID() and dedupe them on deserialize.
- bundle-load-01, shell-07, ia-flows-04, dock-instruments-02, fx-mixer-21: make useAutosave subscribe to persisted keys only (shallow equality), add a 5 s maxWait, and flush on pagehide, on hidden visibility and on unmount.
- state-reload-02, ia-flows-05: set a sessionLoadedAt marker on every load and reset path, and skip restoreLocalSessionIfPresent when it is set.
- ia-flows-02, bundle-load-02, shell-08, practice-tutorial-07: validate the boot intent first, then check unsavedStudioSession() and show the existing ConfirmModal (Save first / Discard / Cancel) before resetting.
- shell-06, ia-flows-10: make initUndoTracking idempotent and return its unsubscribes from the effect; build the JSON only inside the debounce.
- design-system-01, shell-11, ia-flows-13, collab-10: alias the DAW tokens on :root (or toggle a body class while the DAW is mounted) so portaled dialogs and popovers stop rendering transparent.
- shell-05, design-system-06, bundle-load-07, ia-flows-20: delete MeshGradientBg and its mount in DawApp.
- live-input-02, state-reload-11, collab-08: persist audioInputChannel locally, preserve per-user track fields in both collab merges, and default null to mono channel 0.
- live-input-03: add the engine-ready version (subscribeEngineReady/getEngineReadyVersion already exist) to the dependencies of the engine-facing effects in VocalView and GuitarBassView.
- state-reload-10: persist trackRole in both serializers and treat undefined as 'auto'.
- synth-store-02, synth-ui-01, synth-engine-06: call setReverbParams inside applySynthStateToEngine, and pass the project bpm into it.
- instruments-03: use time ?? Tone.immediate() in DrumMachineEngine.noteOn.
- audio-core-03, audio-core-05: pass clip.offsetSeconds and clip.gain on the loop-lap path; anchor the metronome with scheduleRepeat(cb, interval, 0) and work out the beat from the transport ticks.
- shell-13: one requestRecord() command, with the overwrite confirm mounted at shell level, used by the button and by the R key.
- score-09: pass the row explicitly to applyDuration; leadsheet-06: scope the print CSS to a body class added on beforeprint.
- collab-04, collab-05, collab-16: re-attach the message listener on every 'connecting' status, tear down terminal rooms, and close unauthenticated sockets on the server.
- prism-engine-02: convert suggestion seeds with the existing modeToIonianLabel, ionianToModeLabel and getModeOffset helpers.
- insight-05, prism-ui-03, state-reload-15: reset rootLocked, rootTrackColor and the detected-key bus in freshProjectHarmony and resetSessionToEmpty.
- practice-tutorial-03, practice-tutorial-06: clear practiceSession and call quitTutorial() in every boot branch that isn't a lesson or practice launch.
- state-reload-21: call resetUndoHistory() at the end of every seed (template, demo, practice), as seedStudioFromSong already does.
- shell-27, engine-hooks-23: initialise isReady from audioEngine.getIsInitialized(), and pause the transport on unmount.
- fx-mixer-02, ia-flows-35, fx-mixer-03: wire master Bypass in the engine, hide Gain Match, and relabel 'LUFS' as 'Peak'.
- timeline-23, shell-17, prism-ui-20: move Timeline's top-level position subscription into a Playhead child (copy PianoRoll.tsx:141), and replace whole-tracks selectors with primitive ones.
- ia-flows-14: unlock Prism while a lesson is active, since 4 of the 8 Production lessons need it.
- design-system-02, ia-flows-32: make primary actions the white pill (#fff fill, #101012 text), starting with CoachCard Next, Prism Create and the shell dialogs.

## Design principles (from the research)

- Never lose work, and always show save state (from BandLab and Soundtrap continuous save, Soundtrap Time Restore, BandLab Revisions and Suno Studio Versions). For Music Atlas: a local-first IndexedDB draft that syncs to the cloud, a save chip next to the project name, and an automatic checkpoint before any lesson, template, demo or collab join replaces the session. Version history is never a paid feature.
- One place per job (from BandLab and Soundtrap's docked bottom editor, Ableton's Detail View and Logic's editors area). Each task gets one surface: one bottom editor dock whose Notes tab switches by track type, one right-hand Inspector, and a Maximize action instead of modal piano rolls or pop-out copies.
- Data that changes every frame never goes through React state (from openDAW, which polls engine state once per animation frame and writes straight to DOM attributes). For Music Atlas: a playheadClock and MeterBus outside the store. The main store holds only the document, and position is written only on stop and seek.
- Harmony is a first-class lane (from Logic's Chord Track and Chord ID, and Ableton 12's scale awareness). A chord lane and key chip always sit above the tracks. Prism, Grooves, Insight, Lead Sheet and the piano roll's scale highlighting all read and write that lane, so students see the progression they hear.
- Preview, then commit (from Suno Studio's Take Lanes and Ableton 12's MIDI Tools Auto Apply/Apply). Generators produce ghost takes the student auditions, then commits as one labelled undo step at the playhead or selection. Nothing is overwritten silently.
- Explain the musical why (from Ableton's Info View and Logic's Quick Help, extended by Music Atlas Insight). A context-help strip in the dock header explains the musical meaning of whatever is focused, tapped or hovered and links to the matching lesson. It avoids the hover-only, interface-only help of the pro DAWs.
- Progressive disclosure with a visible mode (from Logic's Show Advanced Tools and Smart Controls, and Soundtrap Chords' three-step flow). Simple mode for students and Advanced for teachers, shown as a pill in the top bar; teachers can set it per class and lessons declare the mode they need. Generators lead with 2–3 large controls and put the rest under More.
- Neutral chrome, with colour only for music (from Ableton 12's flat UI refresh; avoid Soundtrap's rainbow-coded effect types). Use #101012 base, white/4–10 surfaces, white/8 hairlines, #e8e8f0 text, the white pill for the single primary action, and Glacial Indifference with an 11 px floor. Key and chord colours mean harmony, red means record or destructive, amber means warning; teal leaves the chrome.
- Keys belong to the focused area (from Logic's Musical Typing toggle, Ableton's Computer MIDI Keyboard and Ableton's Navigate shortcuts). Use one command registry, scoped keymaps per view, and one computer-keyboard note map with a visible on/off chip. Text fields and the browser's own zoom are never hijacked.
- Load what the view needs, and show readiness (from BandLab for Education 2.0's lighter Studio for school laptops, openDAW's worker-generated peaks, and the load progress Soundtrap and Logic show on project open). Split code per view, tab and instrument; start sample loads at mount; show a 'Loading sounds' pill, and let Play wait briefly instead of starting silent.
- The layout remembers (from Logic's screensets saved per project; avoid openDAW's in-memory-only panel state). Dock height per tab, Inspector tab, zoom, scroll and selected track restore after a refresh and survive view switches.
- Collaboration is quiet presence plus optimistic edits (from openDAW's presence dots and shared-transport rejoin, Audiotool NEXUS's optimistic local edits, and Soundtrap's timeline comments for teacher feedback). Presence publishes only on change, locks apply only while someone is actively editing, and the session survives a host's network blip.

## Target layout sketch (superseded where plan.md differs)

TARGET: Studio Shell v2. All figures are estimates.

FOCUS MODE
On /studio/editor, hide the app TopRail. Collapse the 72 px app sidebar into a Back to Studio button in the top bar, and move the avatar and notifications to the top bar's right group. Today's editor box is about 1294×600 inside a real 1366×768 Chrome window; focus mode gives about 1366×655.

FIVE REGIONS
They render once, outside the view switch, so nothing remounts when the view changes.

1. TOP BAR (44 px), three zones

- Left: Project menu (New, New from template, Open… as a searchable Projects dialog, Save, Save as, Import, Export audio/MIDI/MusicXML/PDF, Versions, Delete), project name, save chip, Undo and Redo.
- Centre: go-to-start, Stop, Play as a 36 px white pill, Record in red, then the position readout (bars:beats, or mm:ss), Loop, Click (count-in in its caret menu) and Follow.
- Right: a Song chip ('C major · 4/4 · 92'). It opens one popover with the circle of fifths, mode, a time-signature grid, and BPM with tap tempo. This replaces today's separate Key button, key lock, time-signature button and BPM field.
- Also right: the view tablist (Create · Mix · Score · Lead sheet, plus Practice when a practice session exists), a Share pill (avatar stack with status), the Inspector toggle, '?', settings, and a Simple/Advanced pill.
- Internal view ids stay arrange/studio/score/leadsheet/practice, so the view-switch-\* tutorial anchors survive.
- Below about 1360 px wide, Share, '?' and settings move into a '⋯' menu, and the Song chip shortens to 'C · 92'.

2. TRACK LIST (left, Create only)

- 184 px wide in Simple mode, 220 px in Advanced. Rows are 64 px (Simple) or 80 px (Advanced): colour, name, M, S, Arm, volume.
- A '⋯' menu holds role, monitor, automation, colour, duplicate, and delete with an undo toast. The Release button shows only during collab sessions.
- '+ Add track' is pinned at the top and opens a typed picker sheet (Instrument, Drums, Sampler, Voice/Audio, Guitar/Bass, Import). The Master row is pinned at the bottom.
- Headers and lanes share one vertical scroller (a CSS grid with a sticky header column).

3. CANVAS (centre, changes with the view)

- Create: a 32 px canvas toolbar (Select/Draw/Cut, Grid menu with snap, zoom −/fit/+, + Marker). Below it a sticky 24 px chord lane with a key chip and '+ Suggest chords', then the rulers, then the lanes.
- Create rendering: layered canvases (grid, clips, overlay) with a PlayheadLayer. An empty project shows four tiles: Add an instrument, Start with chords, Record your voice, Start a lesson.
- Mix: channel strips fill the height (at least 240 px; horizontal scroll). Each strip shows its insert list, and clicking an insert opens that track's FX rack in the dock area.
- Mix master column (right): fader, a Polish amount in Simple mode, a collapsible mastering chain in Advanced mode, and a 96 px spectrum. Return racks open in the Inspector.
- Score and Lead sheet: full-width canvas with one contextual toolbar row. Print and MusicXML move into the Project menu's Export.
- Practice: keeps its own full-screen layout and is unchanged.

4. INSPECTOR (right, every view)

- Tabs: Insight · Browser · Session.
- Browser holds instruments, presets, grooves, effects and loops; click or Enter adds, and dragging is optional. Templates leave the editor panel and move to Project > New from template.
- Session merges today's People list, Chat, invite link and Leave, replacing the separate UserList and ChatPanel columns and the four collab toolbar buttons.
- Width 300 px (resizable 260–420), or a 44 px icon rail. Open state and tab are remembered per view.
- During lessons narrower than 1440 px, the coach card docks at the top of the Inspector. Below 1440 px, the Score and Lead Sheet palettes move into an Inspector tab.

5. EDITOR DOCK (bottom, Create only)

- The header shows the selected track (colour, name, instrument), the context-help strip, and Maximize.
- Tabs never change: Instrument · Effects · Notes · Prism · Grooves. Unavailable tabs are disabled with a reason instead of hidden.
- Notes is the piano roll for melodic tracks and the drum grid for drums. It binds to the selected clip, then the clip under the playhead, then the first clip.
- Default height 220 px (a 32 px tab bar plus body). Drag to resize between 120 px and 85%, with snap points at 25, 40, 60 and 85%; height is remembered per tab.
- Maximize (button, Shift+E, or double-clicking a tab) grows the same instance to 85% and keeps the top bar visible. This replaces PianoRollModal, PitchEditorModal and the PopOutOverlay copies.
- Keep the existing tab ids so the chanstrip-tab-\* anchors survive: controls (now labelled Instrument), fx, piano-roll (now labelled Notes), prism, grooves.
- Prism becomes three zones (Key, Progression, Feel) with a sticky footer ('Write 4 bars to Rhodes at bar 9'). Suggest Chords becomes a mode inside Prism.
- Oracle Synth in the dock is a Play page (presets, 8 macros, Key Lock, keyboard) with tabs for Sound, Shape, Motion and FX/Arp. The full responsive editor opens through Maximize.

OVERLAYS
Overlays are only for blocking tasks: Export, Save as, Projects, Audio settings, Invite and confirm sheets. All use one DawDialog and are mounted only while open.

SIMPLE VS ADVANCED

- Simple is the default for students and uses comfortable density (32 px controls, 13 px labels).
- Simple hides: automation lanes, track role, monitor, count-in, the Grid menu (snap stays on), every send except 'Space', the mastering chain, the Grooves filters, the deeper synth pages, and Prism's strum/tilt (under More).
- Advanced uses compact density (24–28 px controls, 12 px labels) and shows everything. Teachers set the default per class, and lessons declare the mode they need.

AT 1366×768 (Chrome window about 1366×655, focus mode on)

- Height: 655 − 44 (top bar) = 611; minus the 220 px dock and 96 px of toolbar, chord lane and rulers leaves about 295 px of lanes, roughly 4.6 Simple rows (today: about 3.7).
- Width: 1366 − 184 (track list) − 44 (Inspector rail) leaves a timeline about 1,138 px wide, roughly 7 bars at default zoom.
- The Inspector opens as an overlay drawer that can be pinned, so the timeline canvas doesn't reflow.
- The dock can be minimised to its 32 px tab bar, giving about 483 px of lanes.
- Mix: strips fill about 579 px of height, and the master column is 240 px wide.
- Without focus mode (TopRail and sidebar present) the box is about 1294×600 and lanes drop to about 240 px, so focus mode is the recommended default.

AT 1440×900 (Chrome window about 1440×787)

- The Inspector is pinned open at 300 px.
- Advanced width: 1440 − 220 − 300 leaves a timeline about 920 px wide (Simple: about 956 px).
- With a 260 px dock: 787 − 44 − 260 − 96 leaves about 387 px of lanes, roughly 6 Simple rows or 4.8 Advanced rows.
- Score and Lead Sheet keep their palettes on the canvas side, and the coach card floats beside its spotlight target.

## Risks

- Saved-project compatibility, local: deserializeSession only accepts version 1 or the current SESSION_SCHEMA_VERSION. Bumping to 3 without changing that guard in the same commit would make every existing v2 autosave fail to restore, with only a console warning. Add a v1→v2→v3 migration chain with fixture tests, and quarantine unreadable drafts instead of dropping them.
- Saved-project compatibility, cloud: the API's update is a full replace of the track tree. An older tab or app version that saves after the new fields ship will erase the document column or the tracks[0].settings blob. The interim blob also moves or disappears when the first track is deleted or reordered. The server needs to preserve unknown document fields on PUT (or reject saves from older document versions), and the reader should look in any track's settings, not only the first.
- Stable ids: deserializeCloudProject mints new track and clip ids today. The ducker sourceTrackId remap, AudioBufferStore keys, the Oracle per-track patch cache and collab docs all depend on that behaviour, so moving to stable ids must migrate all of them in one change.
- Tutorial anchors: 40 data-tutorial-id anchors back 58 step targets. Steps preset the store through StepRequires (view, libraryOpen, channelStripTab from controls/fx/prism/piano-roll/grooves, clearClipSelection), and checks read the AllSlices shape and useSynthStore directly. Renaming tabs or views, removing the modal piano roll, splitting the store, moving synth patches into the main store, or lazy-loading panels will break lessons. Keep ids stable through an alias map, wait for anchors to register, and add a Playwright walkthrough per lesson before shipping each phase.
- Audio changes alter how existing projects sound: SoundFont per-channel routing removes today's doubled level and the GM reverb send; removing the always-on tanh crush lowers every mix by about 2.4 dB; fixing Oracle voice stealing, glide, the legacy down-sweep cutoff and tempo-locked LFOs changes saved patches; a re-mastered drum kit and replacement IRs sound different. Gate each change with offline golden-render comparisons and release notes for teachers.
- Scheduler rewrite: moving to time-based scheduling, incremental Parts and reschedule-on-seek touches loop seams, count-in, recording placement and export together. Regressions show up as clicks, hung notes or double triggers. Keep the old scheduler behind a flag until loop, seek, count-in and record tests pass on Chrome, Safari and Firefox.
- Taking position out of the store: keyboard paste-at-playhead, seekTo, export ranges, tutorial checks, collab transport sync and nine components read state.position. Keep writing it on stop, seek and pause, and add getPlayheadTick() for live reads; otherwise those features silently use stale positions.
- Undo: commit-on-release and patch-based history change Cmd+Z granularity, which students will notice. Solo and collab undo scopes must come from the same registry or they will diverge again. Reference-counting audio buffers for undo can grow memory, so cap history depth and bytes.
- Collab with mixed versions: during rollout, older clients will keep writing whole arrays while new clients write per-key Y.Maps or registry fields, which can corrupt a shared doc. Store a document schema version in the room and refuse or upgrade older peers. Requiring auth in onBeforeConnect may drop guests who have no token today.
- Autosave durability: IndexedDB writes started on pagehide may not finish. Keep a synchronous localStorage copy of the last document version, coordinate tabs with navigator.locks, and handle quota errors visibly in the save chip.
- Entry guards and prompts: confirmLeaveSession() adds a step to the newly shipped Production lessons, the Song page and dashboard tiles. unsavedStudioSession() currently relies on canUndo(), so seeds that leak into undo would cause false prompts. Switch it to documentVersion against lastSavedVersion before adding guards, or students will get prompt fatigue.
- Keyboard scoping: removing Cmd+=/− timeline zoom, digit tool keys and global Delete changes muscle memory. The unified musical-typing map changes existing key layouts, and single-key shortcuts must stay switchable off (WCAG 2.1.4). Ship the '?' sheet and a one-time 'shortcuts changed' notice.
- Layout and product decisions: focus mode hides the TopRail's XP, level and coins; removing the editor's Library tab, the modal piano roll and pop-outs changes familiar paths; on 768 px screens the dock's minimum height competes with lanes. Get explicit product sign-off and run the layout at 1366×768 and 1440×900 in Playwright screenshot tests.
- Code-splitting: lazy views and dialogs add loading flashes and chunk-load failures after a deploy. Lesson spotlights may target components that haven't loaded yet. Ship the DAW skeleton, the vite:preloadError save-and-reload and anchor registration before the split.
- Licensing and hosting: the bundled reverb IRs are marked PLACEHOLDER-DO-NOT-SHIP, and the SERUM-derived preset pack and the third-party github.io sample hosts need licence checks before they are self-hosted or redistributed.
- Persisting lesson, practice and collab context in the URL or sessionStorage risks resuming the wrong lesson on a shared school device and exposing room codes in shared links. Bind the context to its draftId and clear it on explicit exit.
