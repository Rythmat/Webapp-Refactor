# Studio editor audit: area summaries and proposals

## audio-analysis

Slice "audio-analysis" covers the editor's analysis and live-input DSP:

- **Chord detection:** AudioChordDetector runs on the main thread at about 20 Hz from useAudioChordDetection. OfflineChordAnalyzer runs after each take. ChordAnalysisStream is Learn's driver.
- **Guitar/bass/vocal FX:** GuitarPedalChain plus 11 pedal processors.
- **NAM amps:** parser, bundled-model store and worklet wrapper.
- **Pitch correction:** PitchCorrectionNode and PitchCorrectionPedal.
- **Guitar-to-MIDI:** NodeTapCapture and instrumentPitchProfiles.

The DSP building blocks are mostly sound and well documented. The orchestration around them is fragile:

1. The pedal, amp and auto-tune chain reaches the audio graph only while that track's CONTROLS view is open. After a refresh, opening a cloud project, returning to the editor or joining a collab session, recorded guitar and vocal takes play back raw. Export is raw by design.
2. Inserting a pedal before the amp (the default position) rebuilds the NAM amp without its model, so it falls back to heavy fuzz.
3. Every knob drag rewires the whole chain and steps parameter values with no ramps.
4. The post-take "refined" chord analysis reads the previous take's audio because of a race. It also blocks the main thread for seconds (pure-JS FFT with trig in the inner loop, Viterbi over 457² transitions per frame).
5. Loading a NAM model prewarms about 4,000 samples on the audio thread. Each standard WaveNet then runs per sample in scalar JS, even on silence.
6. The wah's envelope follower runs on requestAnimationFrame.
7. The live detector writes to the store about 40 times a second, and pitch info re-renders the 2,445-line VocalView at 20 Hz.
8. Key handling assumes C major when no key is set and keeps a stale detected key across projects.

Highest-leverage fixes:

- An engine-owned chain reconciler that matches pedals by block id and applies only the differences, with NAM model resolution inside the chain.
- A Web Worker analysis service keyed by clip id, with progress shown in Insight.
- NAM loading that tags each request with an id and warms up gradually, plus a silence gate.
- A ramped parameter API for all pedals.

**Strengths to keep**

- AudioChordDetector has a clear, staged pipeline: RMS gate, adaptive noise floor, tuning estimate, harmonic suppression, priors, a parsimony rule and chord hold. It reuses its analyser buffers, and a golden-recording test locks its output frame by frame (src/daw/audio/**tests**/AudioChordDetector.exports.test.ts).
- ChordAnalysisStream is store-free and reused by Learn. Its throttle and FFT constants are exported so Studio and Learn stay in lockstep, and a test enforces that it doesn't import the DAW store.
- NodeTapCapture's teardown is careful. It never closes the shared AudioContext and removes only its own analyser edges, so the guitar track's other routing survives.
- instrumentPitchProfiles documents the physics behind each FFT size (for example why bass hi-res stays at 8192) and keeps per-instrument tuning in one small, typed place.
- NamModelParser validates weight counts per architecture and rejects unsupported variants (gated, non-Tanh, head) with readable errors. NamWorkletNode transfers weights without copying, has a 30 s load timeout and surfaces processor errors.
- PitchCorrectionPedal queues parameters that arrive before the worklet is ready and applies them after async init. The worklet module registration retries on failure.
- Distortion curves are quantised and cached (OverdrivePedal and NamAmpPedal), so 44,100-sample curves aren't rebuilt per knob step.
- VocalView already uses a parameter-only update path (updateChainParams → updateProcessorParams). This is the pattern to make the default inside GuitarPedalChain.
- Learn's GuitarAmpRig shows the right concurrency pattern for model loads (a wantedModelId check plus disposed guards), which the Studio can reuse.
- The pitch-correction worklet skips YIN on silence and the NAM worklet pre-allocates scratch buffers. Both are good starting points for audio-thread efficiency.

**Proposal**

Rebuild the slice around three engine-side services so React views stop owning audio state.

**1. InputFxEngine (fixes -01, -04, -06, -07, -14, -17, -18 and parts of -08)**

- A reconciler mounted with usePlaybackEngine subscribes to tracks[].guitarChain/vocalChain, bpm and namModelId with subscribeWithSelector.
- It calls GuitarPedalChain.apply(desired) on adapter init, on local and remote edits, and after reloads.
- apply() matches processors by stable block id, rewires only when the order changes, and updates parameters through a per-processor setParam with setTargetAtTime ramps. Bypass toggles crossfade over about 10 ms.
- NamAmpPedal resolves its own model from a module-level cache that de-duplicates in-flight loads. It plays a clean path while loading and exposes loading/ready/error, which the amp picker shows.
- NamWorkletNode and PitchCorrectionNode get per-request ids, per-context module registration, a dispose message (so process() returns false) and gradual NAM warm-up.
- The wah follower moves into an AudioWorklet.
- With no rAF and BaseAudioContext support, the same builder can render pedals offline for export (-06).
- GuitarBassView and VocalView become pure store editors: drags give live audio preview and commit to the store, undo and collab on pointerup.

**2. AudioAnalysisService Worker (fixes -02, -03, -10, -11, -12, -15, -16)**

- A shared, DOM-free chroma/template core is used by both the live detector and the offline analyzer.
- The offline analyzer runs in a Worker with a real FFT, an O(T·S) Viterbi and timestamps at the window centre, quantised to the project's bar grid from the clip's startTick. Tuning is estimated per take, and no key prior is applied unless the project has a key.
- It is triggered by a 'take committed' event carrying clipId, buffer and startTick. Results are cached per clipId, show progress and can be cancelled.
- Insight gets 'Chords in Take N', an on-demand 'Detect chords' on audio clips, and an honest key label. Audio results stop overwriting the session UNISON document.
- The live detector publishes only on change (-13). Later, its analyser FFT can move to an AudioWorklet that feeds a Worker.

**3. NAM performance (-05, -19)**

- Add a silence gate in the worklet now and profile on a Chromebook.
- Evaluate WASM SIMD or lite models for the defaults, add sample-rate handling and normalise output from metadata.loudness.

**Sequencing**

- Small (S) fixes first: -02, -10, -11, -13, -14, -17, -21.
- Then the chain reconciler (-01, -04, -07) and the Worker (-03, -12, -16).
- Then the large (L) items: offline rendering for export (-06) and WASM NAM (-05).

**Open questions**

- Should audio chord detection be an explicit, repeatable action on a recorded clip ('Detect chords in this recording', as Ableton and Logic do), or stay an automatic one-shot proposal after each take?
- When a project has no key, should the analyzer auto-detect one from the take and say so, or show chords without any key context? Today it silently assumes C major.
- Is it acceptable for exports to contain raw guitar DI and untuned vocals, or should rendering amps and pedals in export be prioritised? That requires the realtime-only pedals (rAF wah, global worklet registration, UI-owned NAM loading) to become renderable offline.
- Should every new guitar and bass track default to a NAM 'standard' WaveNet amp? Each one is estimated to use a large share of the audio-thread budget in scalar JS, even on silence. Has it been profiled on student Chromebooks? Would lite/feather models, a WASM SIMD build or a classic-amp default for low-end devices be acceptable?
- Should uploading your own .nam model ship? NamModelBrowser and loadModelFromFile exist but nothing mounts them. Should the Delay and Reverb pedals ship, or be deleted?
- Is live UNISON analysis (useLiveUnisonAnalysis, which is never mounted) still planned? If not, the 30-entry liveChordStream bus can shrink to a single liveChord value.
- Has the live chord detector been validated on single-note vocal input? vocal-fx tracks feed it with guitar-tuned harmonic suppression, and dB-domain harmonics may make single notes read as power or major chords.
- In collab, whose pedal chain should win when two people edit the same guitar track at once, and should partners hear each other's amp settings live?

## audio-core

The audio engine core has no on-screen UI of its own, so it affects students through sound, timing, lag and errors that fail silently. It covers the AudioEngine singleton (master bus, two return buses, meters, the collab monitor bus), a TrackEngine per track running a 1,597-line EffectChain, the schedulers for MIDI, audio clips, automation and the metronome, the audio and MIDI recorders, the AudioBufferStore, the reverb IR loader and the offline bounce/export.

The overall design is sound: the engine lives outside React and future events are scheduled against transport ticks. The problems sit at the edges:

- **Timing:** several immediate paths ignore Tone's 0.1 s lookAhead (mid-clip starts, loop laps, the playhead, recording placement). Seeking during playback never reschedules anything. The metronome's grid is anchored to wherever Play was pressed, not to the bar.
- **Export:** it throws on 48 kHz devices because the reverb IR caches ignore sample rate. A failed or hung export leaves Tone's global context stuck on a dead offline context, which breaks playback until the page is reloaded.
- **Buffer store lifecycle is backwards:** buffers are evicted at edit time, so Undo brings clips back silent. They are never cleared between projects, and every cloud open creates new clip ids, so memory keeps growing. Recording over part of an earlier take corrupts or orphans it.
- **Waveforms:** peaks are recomputed from raw samples on every Timeline redraw.
- **DSP:** the "no crush" stage is really a tanh soft-clipper on every chain. The de-esser's band filter is never connected. Gate and ducker run as main-thread polling loops and are missing or random in exports. No parameter change is smoothed. Every `tracks` change re-applies every chain (twice while playing).

How this slice's state behaves on each kind of reload:

- **(a) Browser refresh:** the engine is rebuilt from the store (effects and automation persist). Decoded audio is gone and is re-fetched only for clips that have an assetId. Split halves and overwrite remainders come back silent behind a fake waveform.
- **(b) Opening a cloud project:** clips get new ids, so a duplicate copy of every buffer is decoded and kept.
- **(c) Switching views or panels:** the engine is untouched (good).
- **(d) Leaving the editor and coming back:** AudioEngine and AudioBufferStore persist. Track engines, instruments and the metronome are disposed and rebuilt, and samples are fetched and decoded again.
- **(e) Collab join or rejoin:** every remote edit re-syncs every chain and re-anchors all automation during playback.

Visual-design criteria don't apply to this slice.

**Strengths to keep**

- The audio graph lives outside React (module singletons and registries), so view switches and panel remounts never rebuild audio, and no React state drives the audio path.
- Future audio clips, automation segments and MIDI (Tone.Part) are scheduled against transport ticks, so they are sample-accurate and re-fire correctly on loops in the common case.
- Defensive numeric guards (safeVal, clampParamValue, the ratio clamp in auto-makeup, NaN-safe feedback) keep bad values out of the shared mastering chain.
- Reverb, delay, presence, de-esser, saturator and multiband are truly bypassed (disconnected) when off, and the gate loop stops when the gate is disabled.
- Mute and solo use one ramped 'audible' gain that also silences meters and sends, so there are no clicks and one rule (isTrackAudible) is shared by live playback and the bounce.
- reverbIR deduplicates in-flight downloads, bounds its processed cache, never leaves the convolver empty (synthetic fallback), and guards against stale hot-swaps with reverbIrKey.
- A watchdog on context state changes and tab visibility recovers from OS sleep and iOS audio interruptions.
- Pure, well-commented helpers (recordingLimit, recordedClip, automation sampling, trackAudibility) are easy to unit-test.
- MidiRecorder already compensates for Tone's lookAhead and for event-loop delay, and anchors takes to the punch-in point so a late entry keeps its rest.
- Recorded clips keep MediaRecorder's original Opus bytes for upload instead of re-encoding to WAV, which is roughly 10x smaller.
- renderProject documents its gaps against live playback, and the export dialog surfaces some of them.

**Proposal**

Rebuild the engine around three layers:

1. **One playback scheduler.** A single scheduler owns MIDI, audio clips, automation and the metronome. It reacts only to Tone transport events (start, ticks/seek, loop, stop) and always schedules at the time Tone supplies, never at `ctx.currentTime`. This fixes audio-core-02, 03, 04, 05 and 21. Clips become option objects built from the clip itself, so offset, fades and gain can't be dropped.

2. **AudioWorklet effects.** Gate, sidechain ducker, the de-esser detector and (optionally) the meters move into AudioWorklets. Live and offline renders then sound the same, and no main-thread polling is left (10, 13). This is how openDAW and Audiotool work.

3. **A project-scoped asset store** keyed by assetId:
   - Clips reference an asset with an offset and duration, so split and overwrite are non-destructive.
   - Buffers are reference-counted and kept while undo/redo still references them, and cleared on project switch.
   - A peak pyramid is computed once per buffer (in a worker), and change notifications are batched per frame (06, 07, 08, 09).

EffectChain becomes an ordered list of per-effect modules that are created on first enable, update only what changed, ramp their parameters, and are fully bypassed when off, including EQ, compressor and crush (11, 12, 16, 19).

For export: render at the live sample rate with sample-rate-keyed IR caches, wrap Tone.Offline in try/finally, time out instrument loading, preload instrument samples, and encode in a worker (01, 20).

For timing: add a latency test in Settings, as BandLab and Soundtrap have. Recordings get a timestamp for when capture starts, and one visual-latency value (lookAhead + outputLatency) is shared by every playhead (14, 18). Use the native context for output-device selection and latency (23).

Before release, ship licensed IRs (17). Move the DAW onto AudioContextOwner as planned, so Learn and Studio share one context. Keep track engines alive when the user leaves the editor so instruments don't reload on return.

**Open questions**

- Is the placeholder reverb IR pack (license 'PLACEHOLDER-DO-NOT-SHIP', derived from Logic Space Designer) in production builds today, and is a licensed replacement planned?
- Should exports match the device's sample rate, or always be 44.1 kHz? Always 44.1 kHz means resampling IRs and buffers before rendering.
- Is the tanh coloration of the 'off' crush stage meant as deliberate warmth? If so, should it be a visible, switchable option rather than always on?
- How far back should Undo be able to restore deleted or overwritten audio: the whole session (memory cost) or only the last N steps?
- May recording keep the mic stream open while a track is armed? That is needed for accurate alignment, but students would see the mic indicator for longer.
- Can guest users (no auth token) record? Their audio never survives a refresh today, because nothing is uploaded.
- Should the metronome bypass the master bus (master effects, master fades) and get its own volume control? Should it ever appear in exports or the collab monitor stream?
- Which comes first: building AudioWorklet versions of the gate, ducker and de-esser, or hiding those effects from students until they work and export correctly?
- When is the DAW scheduled to move onto AudioContextOwner? Today Studio uses its own Tone context, and load-audio.ts can create a third, never-closed decode context.

## bundle-load

Cross-cutting audit of how /studio/editor reaches an interactive, audible state. Main problems: (1) The whole editor ships as one 1.13 MB chunk (286 KB gzip, 15% bigger than in June) with no internal splitting. (2) Its download can only start after the auth bootstrap and a songs ContentGate that only the ?song= branch needs, and the user sees a dashboard-shaped skeleton meanwhile. (3) No audio engine, instrument or sample loads until the first click or keypress. So the first Play on any template or demo is silent or partial, with no feedback, while about 50 MB downloads: a 30 MB GM SoundFont used only for the demo bass, a 19.5 MB 24-bit stereo WAV default drum kit decoded separately per track, and Rhodes/piano samples from third-party github.io hosts. (4) The load path also loses work: autosave never fires during playback, and the next boot without a URL parameter restores the older copy over newer in-memory edits. Dashboard entry points also wipe unsaved sessions without asking. (5) Several always-on costs: an invisible full-screen canvas animation, collab/RTC setup (including a TURN credential request) in solo sessions, render-blocking Google Fonts imports, and no cache headers. Already done well: VexFlow loads on demand, the reverb IR cache, the shared SoundFont singleton, and boot intents are stripped from the URL after use. Sizes come from the existing 2026-09-30 dist/ build (no new build was run).

**Strengths to keep**

- VexFlow + Bravura already live in their own on-demand chunk (vexflow-bravura, 389 KB gzip) via a memoised loadVexFlow() that waits for the font before drawing (src/components/notation/StaffView.tsx:49-61) — keep and add hover prefetch.
- reverbIR.ts is the model asset loader: lazy manifest, in-flight dedupe, module-level native + bounded processed caches, synthetic fallback on 404 (reverbIR.ts:39-106, 141-147). Reuse this pattern for drum kits and samplers.
- SoundFont synth is one shared AudioWorklet across all GM tracks with MIDI-channel allocation, and spessasynth_lib is dynamically imported (SoundFontAdapter.ts:30-56, 234).
- SamplerInstrument fails loudly when a sample is missing (onerror → reject, SamplerInstrument.ts:44-52); load-audio.ts dedupes in-flight downloads and decodes before the engine exists.
- Boot intents are stripped from the URL after use (DawApp.tsx:118-119 clearQuery), so a refresh falls back to crash recovery instead of re-running a destructive intent; recorded takes upload immediately so audio survives reloads (usePlaybackEngine.ts:1140-1160) and useCollabAudioLoader re-hydrates clip audio on every restore path.
- App entry shrank from 6.56 MB (June build.log) to 935 KB raw (Sep 30 dist) by moving content to a CDN and lazy routes; AppContext warms songs/events in the background (AppContext.tsx:27-45).
- EffectChain gate/duck polling only runs while those effects are enabled (EffectChain.ts:1530-1545); transport position push is throttled to ~30 fps and skips unchanged ticks (useTransport.ts:79-93); Oracle wavetables build lazily.

**Proposal**

EDITOR LOAD PATH, CODE-SPLITTING AND PRELOAD MAP
Measure each step with the existing `ANALYZE=1` visualizer build. Numbers come from the 2026-09-30 dist and source sizes.

1. Unblock the route (S, do first)
   a. ClassroomPages editor route: render <DawApp/> without ContentGate. In DawApp's ?song= branch, set bootedRef, then `void ensureSongContent().then(() => { const song = getSong(id); … })`.
   b. New src/daw/preload.ts:
   `let p; export const preloadDaw = () => (p ??= import('@/daw/DawApp'));` plus preloadDawView(name) and preloadCollab().
   The lazy() factory uses it: `lazy(() => preloadDaw().then(m => ({ default: m.DawApp })))`.
   Inside studioPages(): `if (location.pathname.startsWith('/studio/editor')) void preloadDaw();`, so the chunk downloads while Auth0 and /me resolve.
   c. DawSkeleton: pure CSS on the landing-look tokens (#101012 base, white/6 blocks, white/8 hairlines, Glacial, aria-busy, no colour). Layout: 48 px transport row, header column + ruler + 3 lanes, right panel, 32 px dock.
   Use it as the editor route fallback (ClassroomDashboard picks it when isStudioEditor) and as the ?project= boot overlay ("Opening 'Name'…").
   d. Resilience:

   - DAW ErrorBoundary that flushes writeLocalSession() and offers "Reload editor".
   - Per-panel boundaries.
   - `vite:preloadError` → flush autosave → reload once.

2. Code-split map (L). Target: boot chunk ≤150 KB gzip (now 286 KB).
   EAGER (first paint of CREATE):

- DawAppInner + boot router
- TransportBar (FileMenu trigger only)
- TimelineWithHeaders / Timeline / TrackHeader / MasterTrackHeader / AddTrackMenu
- LibraryPanel + InsightContent
- ChannelStrip shell + tab bar
- hooks: transport, playback core, autosave, shortcuts, MIDI routing
- engine core: AudioEngine, TrackEngine, EffectChain, schedulers
- studioRealtime + collabSlice/middleware (tiny, store-coupled)
  LAZY VIEWS (React.lazy + startTransition when switching views):
- score = ScoreView + Score/\* + ScoreMusicXmlExport + lib/notation/pageLayout
- leadsheet = LeadSheetView + LeadSheet/\* (ScorePalettes/roadmap become a shared chunk)
- master = StudioView
- practice = PracticeTrackView + Practice/\*. The boot effect preloads it when practiceMode/practiceGenre is present. Also turn seedStudioFromPracticeTrack, openGenrePracticeTrack and seedStudioFromGenrePracticeTrack into dynamic imports inside those already-async branches.
  LAZY DOCK TABS (fallback is a fixed 33vh panel skeleton, so no layout shift):
- fx = EffectsPanel + GraphicEQ + FxBrowser (shared with master)
- grooves = GroovesBrowser
- prism = PrismPanel / PrismStudio
- piano-roll = PianoRoll + StudioNotationView
  LAZY INSTRUMENT VIEWS (TrackControlsPanel.renderView):
- keys = KeyboardView
- organ = OrganView
- guitar = GuitarBassView + CrystalIcons + NamModelBrowser + TunerDisplay
- synth = OracleSynthInline / OracleSynthView + oracle-synth/components. Factory and pack presets load when the preset browser opens.
- gm = SoundFontView
- drums = DrumMachineView
- sampler = SamplerChopsView + SamplerWaveform
- vocal = VocalView + PitchMeter
  After first paint, idle-prefetch the chunk for the selected track's instrument.
  MOUNT-ON-OPEN MODALS (each wrapper subscribes only to its open flag):
- PitchEditorModal (+ pitch-analysis)
- PianoRollModal
- PrismSuggestionModal
- SettingsModal
- ExportAudioDialog (+ exportAudio, renderProject, encode-opus/webm-muxer)
- SetListUpdatePrompt (loaded on PROJECT_SAVED_EVENT)
- TutorialLayer internals: CoachCard, Spotlight, Confetti, useTutorialDetection (preloaded when ?tutorial=)
  COLLAB RUNTIME:
- CollabProvider becomes a facade whose joinRoom / createAndJoinRoom / joinRoomById first await preloadCollab().
- Chunk contents: YjsDocManager, ZustandYjsBridge, yjsToZustand, diffEngine, presence, transportSync, StudioRtcManager, turnCredentials, y-partykit, y-indexeddb, y-protocols, and collab/ui (UserList, ChatPanel, LeaveSavePrompt, KickedModal, WaitingForSessionModal, invite modal).
- Loaded on ?collab=, on roomId rejoin, or on Collab-button hover.
- useStudioMonitor's RTC runs only when isCollabActive.
  DYNAMIC IMPORTS INSIDE HANDLERS:
- MidiFileIO (@tonejs/midi, midi-writer-js) in Timeline drops (Timeline.tsx:2637, 2685) and FileMenu import/export
- MusicXmlExport
- PartialUploadError moves to lib/studio-assets/uploadErrors.ts
  ENGINE (phase 2): make createInstrument async, so OracleSynthAdapter + SynthEngine, GuitarFxAdapter/VocalFxAdapter (+ pedals, NAM, pitch-correction), TonewheelOrganEngine and ChopsSampler load with their first track.

3. Preload map

- /studio mount: requestIdleCallback(preloadDaw), unless saveData is set.
- pointerenter / focus / pointerdown on editor-bound tiles, all calling preloadDaw():
  - Blank, Continue, Project tab
  - Recent project: also prefetch the project JSON into a cache that the ?project= branch reads
  - Template / Demo: also a low-priority fetch of their sample URLs
  - Lesson: also the tutorial chunk
  - Collaborate: also the collab runtime
- Route evaluation on /studio/editor: preloadDaw() plus the chunk for the query intent (practice\*, tutorial, collab).
- In the editor, idle after first paint: selected instrument view, then the active dock tab, then EffectsPanel.
- Hover/focus in the editor:
  - SCORE / LEAD SHEET → view chunk + loadVexFlow()
  - MASTER → StudioView
  - File → ExportAudioDialog

4. First interaction (M)
   a. Load before the gesture: build AudioEngine + TrackEngines/instruments on the suspended Tone context at mount, and start fetch+decode immediately. The first click or key only resumes the context.
   Keep per-track readiness in the store. Play waits up to ~3 s for audible tracks, showing a white/10 transport pill "Loading sounds · 2/4" and a per-track spinner with a polite live region. This matches the load-progress state BandLab, Soundtrap, Ableton and Logic show on project open.
   b. Assets:

   - Re-master the Natural kit to ≤2 MB: trim tails, 16-bit, compressed.
   - Add a shared, bounded URL→AudioBuffer decode cache reused across tracks and remounts; drop `await Tone.loaded()`.
   - Demo bass → bass-electric (5.0 MB, already self-hosted).
   - GM bank as SF3 or a curated subset, kept in Cache Storage, with retry on failure.
   - Self-host piano/Rhodes/cello/organ (reuse /samples/piano); give PianoSampler onerror + a timeout.
   - Expected: a demo's first Play goes from ~50 MB to under ~10 MB (bass 5 MB + kit ≤2 MB + Rhodes).
     c. Remove MeshGradientBg from the editor. Gate the chord-detection, guitar-MIDI and RTC loops on their features. Assign reverb IRs only when reverb is enabled.

5. Persistence on the load path (S)

- Autosave via a selector over persisted fields only.
- Flush on unmount, pagehide and visibilitychange:hidden.
- On a param-less boot, the newer in-memory session wins over the autosave.
- Confirm with unsavedStudioSession() on every dashboard entry point.
- Boot state machine with an error state instead of the silent fallback.
- Keep location.search in the sign-in continue parameter.

6. Caching and globals (S)

- vercel.json headers: /assets immutable for 1 year; /daw-assets long max-age + stale-while-revalidate, with versioned filenames.
- Remove the Google Fonts @imports; ship WOFF2 and preload Regular.
- Stop the hooks/data barrel from pulling the DAW store into the entry.
- Delete useTheme.

Expected result:

- Boot DAW chunk: ~286 → ~120–150 KB gzip. About 1.5 MB of ~3.0 MB DAW-only source moves out; confirm with the analyzer.
- Cold editor first paint no longer waits on songs or on a chunk fetch that starts only after auth.
- First Play is audible within seconds, with visible progress.

**Open questions**

- Demos: is the GM SoundFont finger-bass sound required, or can the demos use the self-hosted electric bass (5 MB) that practice tracks already use?
- Natural kit: may we trim the tails (crash 8 s, ride 8.7 s) and ship compressed 16-bit audio to bring it under ~2 MB?
- Is it acceptable to prefetch the ~290 KB-gzip editor chunk on every /studio visit, and a few MB of samples when a demo or template tile is hovered, for students on metered connections? Should we skip this when the browser's data-saver setting is on?
- Before sounds are loaded, should Play wait with a progress pill, or start right away and bring tracks in as they finish loading?
- What should the Studio tab bar's 'Project' tab do: start a new blank project, continue the last session, or ask first?
- Does the Library need all 128 GM programs, or can a curated subset (and so a much smaller sound bank) cover the presets students actually see?
- Is Vercel's skew protection available on the current plan, to avoid stale chunks after deploys, or should we rely on an automatic reload when a chunk fails to load?

## collab

The collab slice is a Yjs + PartyKit sync layer that hooks the whole DAW store (collabMiddleware → diffEngine → Y.Doc; observeDeep → yjsToZustand → store), plus awareness presence, a WebRTC live-audio mesh and nine small UI surfaces. The core idea is sound, but it has problems in four areas. (1) Data safety. 'Leave without saving' can delete a user's existing cloud project, and joining from inside the editor silently replaces the open project while keeping its projectId. (2) A self-sustaining presence broadcast loop. Every store write calls awareness.setLocalState with a fresh lastActiveAt, and every remote awareness change is itself a store write, so connected clients keep sending updates back and forth. Each update re-renders the whole editor through useStudioMonitor and stops autosave from ever firing. (3) Connection lifecycle. The server-message listener is attached only to the first socket. Rejected connections are never torn down, so they reconnect every ~100 ms. Socket status is used as if it were session membership, and refresh/navigation drops or wrongly restores sessions. (4) Sync cost and coverage. Every remote change rebuilds all tracks. Note edits replace whole Y.Arrays on every mouse move. Some synced keys (score marks, chord-region fields, ccEvents, local input routing) are lost or wiped. On the UI side, the portaled dialogs render transparent because the DAW tokens are scoped to .daw-root. Three separate side panels compete with the Library panel for space. Lock and error feedback goes to a toast system that is never mounted, and none of the collab UI has ARIA attributes. Jam import ignores the jam tempo (it plays at 120 instead of 100) and can silently drop parts.

**Strengths to keep**

- Per-user-local semantics are explicit and consistent: mute/solo/arm/monitor, loop and metronome never sync (diffEngine.ts:51-53, yjsToZustand.ts:35-44, YjsDocManager.ts:149-151).
- Remote track rebuilds are deferred while the local user records and flushed when recording stops, so a peer's edit can't abort a take (yjsToZustand.ts:117-168).
- Only the room owner seeds the shared doc; joiners pull after the first sync, which stops a blank joiner from clobbering the host's project (CollabProvider.tsx:265-272, 339-345).
- Loop prevention is simple and well documented: ORIGIN_LOCAL transaction tags plus suppression flags (ZustandYjsBridge.ts:15-28, 116-127).
- Tolerates mixed app versions: DEFAULT_EFFECTS backfill for missing effect slots and a deterministic sampler sampleId (YjsDocManager.ts:297-323, yjsToZustand.ts:259-267, 416-421).
- Solid WebRTC hygiene: deterministic glare rule, queued ICE candidates, two-tier recovery (ICE restart, then rebuild), and server-minted short-lived TURN credentials with a STUN fallback (StudioRtcManager.ts:233-319, turnCredentials.ts:43-88).
- studioRealtime is a tiny React-free bus with a peer-count gate, so solo users never send live-MIDI traffic (studioRealtime.ts:85-101).
- Listen/mute choices are private to each user and never leak to peers (studioListenStore.ts:1-13).
- Save & Leave forces a brand-new project, so a guest never overwrites the host's project (LeaveSavePrompt.tsx:66-70).
- Jam import groups notes per participant × GM program, so instrument switches survive, and dedupes shared drum hits by (step, sound) (importJamSession.ts:70-139).
- Thorough 'why' comments throughout; round-trip tests exist for drumKit, sampler and automation sync (src/daw/collab/**tests**/drumKitSync.test.ts).

**Proposal**

Rebuild collab around three ideas: one session state, quiet presence, and incremental sync.

(1) Session state machine. Replace isCollabActive (which just mirrors socket status) with session = {phase: idle | connecting | live | reconnecting | ended(reason), roomId, role, joinedAt}. Persist it in sessionStorage so a refresh can offer 'Rejoin session?'. Gate the UI, File menu and permissions on 'in a session', not on 'socket open'. Re-attach the server-message handler on every provider 'status: connecting'. Treat not-found, full, kicked and closing as terminal (teardown first, then explain). On the server, give the host a reconnect grace period and reject unauthenticated sockets in onBeforeConnect.

(2) Presence that only speaks when something changes. Move presence to a tiny store, publish only on actual selection changes (shallow equality, no per-write lastActiveAt), and expose primitive selectors (useHasPeers, useTrackLockOwner). Remove the remoteUsers render subscription from DawAppInner. This ends the broadcast loop and lets autosave run again. Assign colours by lowest free slot from a non-semantic palette, and lock only while actively editing, with a host 'Take over'.

(3) Sync engine. Make yjsToZustand apply per-track patches with structural sharing and cached JSON. Make diffEngine compute deletions as prev−next, diff notes by a persisted \_cid, and commit drags on pointerup or throttle to ~10 Hz. Drive both directions from one field map so coverage can't drift (lead-sheet keys, chord-region fields, ccEvents, local input routing). Widen the collab undo scope.

UI. Collapse People, Chat, the invite link and Leave into a 'Session' tab beside Insight/Library, with one session pill in the transport (avatar stack, count, live/reconnecting state). Rebuild the four modals on the Radix ConfirmModal (portal-safe tokens, white-pill primary, focus trap, aria-live chat, 12-14 px text). Show all errors via sonner.

Data safety, first and small. Only ever delete a draft minted during this session. Confirm and reset before an in-editor Join. Reset in place on leave instead of reloading. For jam import, apply the jam's BPM, clear the saved jam only after a successful import, and report dropped parts.

**Open questions**

- Should a host's refresh, navigation or brief network drop end the room for everyone? Or should rooms survive with a reconnect grace period, or hand off to a teacher or another participant?
- What should 'Leave without saving' mean: discard this session's changes and keep my existing project, or delete drafts? Should leaving a session ever delete cloud data?
- Is 'selecting a track = exclusive lock' the intended classroom editing model? Should locks expire when idle, apply only while actively editing, or be overridable by the host?
- Moderation and safety for minors: should hosts or teachers be able to remove participants and turn chat off? What is the retention policy for chat stored in PartyKit snapshots (persist: snapshot) and in per-room IndexedDB on shared devices? Should presence show a full name (the fullName fallback) to anyone who has a room code?
- Should the classroom projector's 'Open in Studio' (ShowcaseProjectorFrame.tsx:18-20) join as a viewer, instead of as an editor that takes one of the 5 slots and can lock tracks?
- Is always-on WebRTC live monitoring (4 audio connections per client in a 5-person room) required for v1, or should it be opt-in per session?
- Should joining a room from inside the editor be allowed while a project is open, or should joining always start a clean session (as the ?collab= link does)?
- For free-time jams (no drum machine), should import snap notes to a 1/16 grid at the jam's tempo, or keep the raw timing?
- Should a session be resumable after a browser refresh (sessionStorage identity plus the local Yjs copy), or is 'refresh = leave' acceptable?

## design-system

Cross-cutting design-system audit of the /studio/editor UI: src/daw/components/**, src/daw/oracle-synth/components/**, src/daw/collab/ui/\*\*, daw.css and the theme files. That is 140 TSX files and about 57k lines.

The base palette is already close to the Music Atlas look: #101012 background, #e8e8f0 text, white/8 hairlines and Glacial on every UI surface, canvas included. What is missing is a design system.

**Tokens:**

- Every DAW token lives only on `.daw-root`. Each portaled overlay therefore renders transparent: 9 overlays plus 9 popover/menu surfaces are unpatched, and several have invisible primary buttons.
- The tokens have 3 sources of truth. useTheme writes an inline copy that overrides daw.css, so the A11Y#7 contrast fix as the audit describes it would do nothing.
- Counts: 690 hex and 434 rgba literals; 1,230 inline style objects in 115 of 140 files.

**Colour:**

- Teal is the catch-all accent, about 285 references.
- Lesson and Prism primary buttons use white text on teal, about 1.8:1.
- Choosing a key repaints every track with that key's colour.
- Several palettes are purely decorative: genre tags, amp 'gems', synth modules.

**Typography:**

- Text at 10px or smaller (330 Tailwind classes plus 48 CSS and canvas declarations) outnumbers 12–14px text.
- Only weights 400 and 700 ship.
- `tabular-nums` does nothing in Glacial, so live numbers jitter.

**Duplicated primitives:** 5 knobs, 4 fader styles, 7 or more segmented/tab controls, 5 select styles, and 5 modal implementations with 5 scrims.

**Performance:**

- Meters set React state 60 times a second per track.
- A fader drag re-renders 24 components and redraws the Timeline canvas.
- An invisible full-viewport mesh-gradient canvas redraws at 60fps for the whole session.

**Reload:**

- Side panels remount on every view switch.
- Layout state survives SPA navigation but not a refresh.
- clipColorMode is never saved with the project.

The proposal: a portal-safe `--daw-*` token layer mapped to the app's `--ui-*` tokens, an 11px type floor, size scales, about 15 primitives built on the shared Radix kit, strict colour meanings, motion rules, and compact/comfortable density modes.

**Strengths to keep**

- The base surface already matches the app chrome and landing look: --color-bg #101012, --color-text #e8e8f0, white/8 hairline border (daw.css:6-13). Re-skinning is a token remap, not a rebuild.
- Glacial Indifference is applied consistently: .daw-root font-family (daw.css:52-56), every canvas ctx.font names Glacial explicitly, and Bravura is used only for notation glyphs.
- FixedDigits (src/components/common/FixedDigits.tsx) solves Glacial's proportional digits and is already used for the transport position and mixer dB readouts. It is the ready-made Readout primitive.
- Good subscription patterns already exist to generalise: PositionDisplay isolates the 30Hz position subscription from TransportBar (TransportBar.tsx:106-118), and MixingSection uses useTrackIds/useTrack/useShallow (StudioView.tsx:598-607, 1077-1079).
- The Oracle Synth Knob is an accessible base for one unified Knob: role=slider, arrow/Home/End keys, Shift fine-drag, double-click reset, modulation arc, touch-action:none (Knob.tsx:126-221, Knob.module.css:36-39).
- Several components already show the right ARIA patterns: FxPowerButton (aria-pressed and aria-label, FxShared.tsx:53-61) and the Practice SegmentedToggle (role=group, aria-pressed, SegmentedToggle.tsx:28-44).
- FileMenu uses Radix DropdownMenu. SendToSetList uses the shared Dialog with white-opacity text, white/15 outlines, rounded-full buttons and 12-14px text, the closest existing match to the landing look.
- Canvases are DPR-aware and read tokens with literal fallbacks (Timeline.tsx:516-530, PianoRoll.tsx:95-105), so they survive inside portals.
- Colour already carries musical meaning where it matters: Prism key/chord colours, the circle-of-fifths key picker, and the rainbow border on 'no key yet', which matches the landing rule that the rainbow never stands for a single key.
- The portal/token problem is already documented in code (FileMenu.tsx:74-80, TutorialLayer.tsx:55-59, PopOutOverlay.tsx:79-81), so the root-cause fix is well understood.
- CoachCard uses readable 13-15px type. This shows the editor can carry larger text without breaking.

**Proposal**

DAW DESIGN SYSTEM: "Atlas Studio", aligned with the landing look

**Principles**

- Chrome is neutral: white-opacity steps on #101012.
- Colour means music (key and chord colours), plus record, warnings and meter data. Nothing else gets colour.
- Each surface has one primary action, and it is the white pill.
- Readable first: nothing below 11px, and 12px is the default label size.
- Every overlay is portal-safe.
- Every primitive works from the keyboard.
- No React state updates at frame rate.

**1. Tokens**
One source of truth: `src/daw/design/tokens.ts` generates `tokens.css` on `:root`, aliased to the app's `--ui-*` tokens. Canvases get their colours from `getDawPalette()`, resolved once per theme change. This lets you delete `useTheme`, `THEMES`, and the four portal workarounds (FileMenu, TutorialLayer, PopOutOverlay, ExportAudioDialog).

| Old token                                                                | New token                   | Value / use                                                                                                                                     |
| ------------------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-bg`                                                             | `--daw-bg`                  | `hsl(var(--ui-background))`, #101012                                                                                                            |
| `--color-surface`                                                        | `--daw-surface-1`           | #151518 (`--ui-card`, landing raised): panels, dock, track headers                                                                              |
| `--color-surface-2`                                                      | `--daw-surface-2`           | white/4: inputs and cards. Menus/popovers use `--ui-popover` #141416                                                                            |
| `--color-surface-3`                                                      | `--daw-hover`               | white/6 (`--ui-muted`)                                                                                                                          |
| new                                                                      | `--daw-selected`            | white/10 (`--ui-secondary`): active tab, selected row, pressed toggle                                                                           |
| `--color-border`                                                         | `--daw-hairline`            | white/8 (`--ui-border`)                                                                                                                         |
| new                                                                      | `--daw-outline`             | white/15 (`--ui-input`)                                                                                                                         |
| new                                                                      | `--daw-focus`               | white/60 (`--ui-ring`); 2px ring, 1px offset                                                                                                    |
| `--color-text`                                                           | `--daw-text`                | #e8e8f0                                                                                                                                         |
| new                                                                      | `--daw-text-2`              | white/70                                                                                                                                        |
| `--color-text-dim`                                                       | `--daw-text-3`              | #8e8ea3 (5.9:1, per A11Y#7). Never add extra opacity on top                                                                                     |
| `--color-accent`                                                         | (split)                     | UI state → `--daw-selected`; primary → `--daw-primary` #fff with `--daw-on-primary` #101012; focus → `--daw-focus`. Teal is retired from chrome |
| `--color-selection`                                                      | `--daw-range`               | Loop and marquee: white/12 fill with a white/45 edge. Note selection: white outline                                                             |
| `--color-record`                                                         | `--daw-record`              | #ef4444, only for record, arm, destructive and clip                                                                                             |
| `--color-play`                                                           | (removed)                   | Play is a white glyph; the playing state is a filled white circle                                                                               |
| `--color-meter-*`                                                        | `--daw-meter-safe/hot/clip` | Data only                                                                                                                                       |
| new                                                                      | `--daw-warning`             | Amber, warnings only                                                                                                                            |
| new                                                                      | `--daw-success`             | Confirmations only                                                                                                                              |
| `--color-brand-*`, `--gradient-brand`, `--grain-texture`, `.glass-panel` | (deleted)                   | Keep two shadows: `--daw-shadow-pop` 0 8px 32px /40%, `--daw-shadow-modal` 0 24px 64px /50%                                                     |

**Music colours**

- Expose the 12 key colours (`KEY_OF_COLORS` and the Prism chord colours) through one module.
- Add an `onColor(hex)` helper that returns #101012 or #fff by contrast ratio.

**2. Type scale (Glacial, weights 400 and 700 only)**

| Style   | Size / line height             | Use                                                                |
| ------- | ------------------------------ | ------------------------------------------------------------------ |
| micro   | 11/14, 700, uppercase, +0.08em | Eyebrows and ruler/tick labels, canvas included. This is the floor |
| label   | 12/16                          | Control labels, values, list rows, compact tabs                    |
| body    | 13/18                          | Panel text, menus, Insight, chat                                   |
| title   | 14/20, 700                     | Panel and section titles                                           |
| heading | 16/22, 700                     | Dialog titles                                                      |

- Coach card instructions use 15–18px.
- Every number goes through a `<Readout>` component (FixedDigits). Drop `tabular-nums`, which does nothing in Glacial.
- Comfortable density moves label to 13px and body to 14px.

**3. Spacing, size, shape and layers**

- **Spacing:** 4px grid: 2, 4, 6, 8, 12, 16, 24, 32.
- **Control heights:** 24px (compact), 28px (default), 32px (comfortable). Hit areas are at least 24×24.
- **Icons:** lucide 14px (compact) or 16px, stroke 1.75. One shared icon per concept (PrismLogo, PedalIcon).
- **Radii:**
  - 4px for dense inline controls and chips.
  - 8px for inputs, menus, cards and panels.
  - 12px for dialogs and sheets.
  - Full rounding for pills, primary buttons and toggles.
- **Z layers** (named CSS variables; literal z-index is banned): sticky 10, dock 20, panel 30, popover 40, modal 50, toast 60, tutorial 70.
- **Panel sizes:**
  - Inspector 300px (260–420, resizable).
  - Dock height 180px to 60vh, resizable and persisted.
  - Track header column 200px (compact) or 240px (comfortable).

**4. Primitives**
These live in `src/daw/ui` and wrap the shared Radix kit in `src/components/ui`, so they inherit the `:root` tokens and work inside portals.

- **Panel + PanelHeader**
  - Title, optional tabs, actions, and a labelled close button.
  - Used by Insight, Library, People, Chat, the mixer sections and the FX rack.
- **Tabs**
  - Radix Tabs: the active tab gets a 2px white underline plus white text; inactive tabs use `--daw-text-3`.
  - Used for the view switcher, dock, Inspector and Settings.
- **Toolbar + IconButton**
  - `role=toolbar` with roving focus.
  - IconButton requires a `label`, which becomes both the `aria-label` and a tooltip.
- **Toggle**
  - `aria-pressed`. On: `--daw-selected` background with a white glyph.
  - Record-arm on: red. Solo: white. Mute: dims the track.
  - Used for metronome, loop, snap, M/S/R/A and MON.
- **Button**
  - Primary: white pill. Secondary: white/15 outline. Ghost. Destructive: red text with a red outline.
  - Heights 28 and 32px.
- **Segmented**
  - One component replacing the 7 current variants. Active state is white/10, with radiogroup semantics.
- **Knob**
  - Built on the Oracle Knob: `role=slider`, arrow/PageUp/Home/End keys, Shift fine-drag, double-click reset, modulation arc, `touch-action: none`.
  - Adds a bipolar mode with a centre detent for pan.
  - Sizes 28, 36 and 44px.
  - Replaces RotaryKnob, PanKnob and MiniKnob.
- **Fader**
  - Radix Slider, vertical or horizontal; thumb at least 12×24 with a focus ring; double-click to reset.
  - One dB formatter: unity reads 0 dB everywhere.
  - While dragging it writes to the engine (transient); it commits to the store on release.
- **Meter**
  - Canvas-based, updated from refs.
  - One shared MeterBus animation-frame loop runs only while the transport plays or a level is still decaying.
  - Peak hold is drawn in the canvas; colour zones come from the meter tokens.
  - Real LUFS only if it is actually measured; otherwise label it 'Peak'.
- **Readout**
  - Fixed-width digits (FixedDigits) for every live number.
- **Select**
  - Radix Select, dense. Replaces the 19 native selects, the Settings device dropdown and the Oracle Dropdown.
- **Menu / ContextMenu**
  - Radix. Used by FileMenu, the chord menu and the marker menus.
- **Popover**
  - Radix. Used by the key picker, the time signature, the track colour picker and collab start.
- **Dialog / Sheet + ConfirmDialog / PromptDialog**
  - Sizes: sm 400, md 520, lg 720, full.
  - Scrim black/60 with a small blur; surface `--ui-popover`; 12px radius; actions on the right with a white-pill primary.
  - Replaces all custom overlays plus every `window.prompt` and `window.confirm`.
- **Chip / Tag**
  - Neutral white/8 at 11px. Key-coloured only when the chip is a key or chord.
- **Support components**
  - EmptyState, Spinner, and Toast (Sonner is already in the app).

**5. What each colour means**

- **UI chrome:** neutral only.
- **Key and chord colours:** keys, chords, the chord lane, and clips/notes when 'Colour clips by: Harmony' is on. This is a visible toggle, saved with the project, instead of repainting `track.color` when the key changes.
- **Track identity:** a muted palette of 12–16 colours that avoids the key hues. Every colour is at least 3:1 on #101012, and the user's choice is never overwritten.
- **Record red:** record, arm and destructive actions only.
- **Amber:** warnings only (e.g. the export coverage warning).
- **Green:** confirmations and the safe meter zone only.
- **Data colours:** meter zones, one EQ band palette constant, and presence colours with `onColor` labels.
- **Rainbow:** only the 'no key set' border, plus celebrations (confetti uses the 12 key colours in circle-of-fifths order).
- **Removed:** MeshGradientBg, the gem colours, and the colour-coded genre chips.

**6. Motion**

- **Durations:** 120ms (hover/press), 180ms (popover/tab), 240ms (dialog/sheet). Easing `cubic-bezier(.2,.8,.2,1)`.
- **What to animate:** transform and opacity only. Never width or height of a container next to a canvas. Panels resize instantly and fade their contents in over 120ms, or open as overlay sheets.
- **Interaction:** CSS `:hover` and `:active` (`scale(.97)`); drop the 31 `whileTap` and 18 JS hover handlers.
- **Loops:** infinite animations only for live states (the recording dot). Meters and the playhead never use CSS transitions.
- **Reduced motion:** `MotionConfig reducedMotion='user'` plus a `@media (prefers-reduced-motion)` block in `tokens.css`.

**7. Density modes**
`data-density` on `.daw-root`, persisted per user:

| Mode        | Controls | Type               | Panels                               | Default for                                                           |
| ----------- | -------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------- |
| compact     | 24px     | label 12, micro 11 | current widths                       | Teachers and power users                                              |
| comfortable | 32px     | label 13, body 14  | track headers 240px, Inspector 320px | Students; coarse pointers or windows under 1366px. Tutorials force it |

**8. Layout, drawing on other DAWs**
**Patterns borrowed:**

- BandLab, Soundtrap and Soundation (web DAWs used by learners): transport in the centre, a browser on the right, a resizable editor at the bottom, large targets.
- Ableton's Info View and Logic's Quick Help: a one-line help strip in the dock header that explains whatever control is hovered or focused, which suits students.
- openDAW and Audiotool: canvas rendering with one scheduler, so React doesn't redraw per frame.
- Suno: a single, obvious generate button, as the model for Prism 'Create' (white pill).

**Concrete layout:**

- **Transport bar:** [File · Project · Key/Tempo/Meter] | [⏮ ■ ▶ ● ⏭ · position] | [Loop · Click · Count-in · Snap] | [CREATE / MASTER / SCORE / LEAD SHEET tabs] | [People · Inspector · Settings].
- **Inspector:** one right-hand column with tabs (Insight / Library / People / Chat), rendered once outside the view branches.
- **Dock:** gets a drag handle.
- **Add Track:** a Sheet with a wrapping 3×3 grid.
- **Oracle Synth:** a responsive module grid with no scaling below 11px.

**9. Rollout**

| Phase   | Effort       | Work                                                                                                                                                                                                                                                                                   |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 | about 2 days | Tokens on `:root` (fixes the transparent overlays and invisible buttons); delete MeshGradientBg and the blur on opaque chrome; white-pill primaries + `onColor` (CoachCard, Prism Create, dialogs); fix the 'LUFS' label; delete dead files                                            |
| Phase 1 | 1–2 weeks    | `tokens.ts` plus a codemod (`--color-*` → `--daw-*`, literals → tokens); type scale and Readout; Button, IconButton, Toggle, Tabs, Dialog, Popover and Select primitives; migrate TransportBar, dock, Inspector and every overlay; persist layout preferences; render side panels once |
| Phase 2 | —            | Knob, Fader and Meter with MeterBus and transient fader commits; granular store selectors; colour meanings (track palette, persisted clip-colour toggle); density modes; resizable dock and Inspector                                                                                  |
| Phase 3 | —            | Responsive Oracle Synth; move the instrument views (Guitar, Vocal, Organ, Drum) onto the primitives                                                                                                                                                                                    |

**Guardrails added along the way:**

- ESLint bans hex/rgb literals, `text-[<11px]`, inline colour styles and literal z-index in `src/daw/components`.
- Playwright screenshot tests for every overlay in both density modes.

**Open questions**

- Should teal (#7ecfcf) be retired from the DAW chrome entirely, using white states and the white pill as on the landing pages, or kept as the DAW's single accent as a documented exception? If kept, should it be restricted to one meaning, such as the loop region or links?
- How should track colour relate to key colour? Today choosing a key repaints every track. Should tracks keep a user-chosen, key-hue-free identity colour, with harmony colouring as an explicit 'Colour clips by: Track | Harmony' toggle, and which of the two is the default for students?
- Should 'comfortable' density (32px controls, 13-14px text) be the default for student accounts and Chromebook-sized screens, with 'compact' as an opt-in?
- Mute and solo: keep DAW conventions (red mute, yellow solo), or move to neutral pressed states and reserve red for recording and yellow for musical meaning?
- Should the mastering 'LUFS' meter be implemented as real loudness (K-weighted, gated), or relabelled as a peak-level meter?
- Does the full Oracle Synth have to fit a 1280x720 or 1366x768 Chromebook without scrolling? Is a responsive redesign of its panels in scope, or should the pop-out keep a fixed layout with a minimum scale and scrolling?
- Can the DAW primitives be built as dense variants on top of the shared kit (src/components/ui/\*), or must the DAW keep a separate component library?
- Should collaborators and chat become tabs in a single right-hand Inspector, alongside Insight and Library, rather than separate side panels?
- Are the amp-model 'gem' colours (GuitarBassView) and the genre tag colours (Grooves) deliberate product branding that should survive, or can they become neutral?
- Is it acceptable to remove the animated mesh-gradient background? It is currently not visible, but if an ambient background is wanted, a static one would cost nothing per frame.

## dock-instruments

The bottom dock (ChannelStrip) and its instrument views work in the common case: a drum or melodic clip at bar 1, a large screen, playback stopped. Outside that case they break in ways a student will hit.

The most serious bug is that the dock's note editors (drum grid, dock Piano Roll, KeyboardView's Piano Roll mode) treat the clip's timeline start as the note origin, but note times are stored relative to the clip. Any clip that doesn't start at bar 1 looks empty, and new notes are saved in the wrong bar. A second, cross-slice problem: autosave is starved for as long as playback runs, so edits made while a loop plays are lost on refresh.

Other problems found:

- The drum editor always edits the track's first clip, and adding a groove stacks it on top of the existing beat at bar 1.
- Drum pad volume and pan only reach the audio engine while the drum view is open. Nudging a pad's volume also re-centres its pan.
- Playing notes from the computer keyboard toggles Loop (and Metronome in the synth pop-out). There are three different key maps across instruments.
- The drum view re-renders its whole editor about 30 times a second during playback.
- Groove preview can overlap two grooves, can't be stopped after leaving the tab, and drifts in time.
- The SoundFont panel waits behind a 31 MB download with no progress, and spins forever if it fails.
- The fixed 33vh dock height hides most of the drum grid and opens on the empty rows.
- Grooves, KeyboardView and PresetBrowser contain about ten controls that do nothing.
- Styling: rainbow accent colours, hard-coded hex values and 8–9px text drift from the Music Atlas look.

What should be kept: instrument sound state lives in the store and is re-applied by the playback engine, the canvas basics are sound, and pointer capture is used throughout.

**Strengths to keep**

- Instrument sound state is owned by the track in the store (gmProgram, organState, drumKit, presetName). usePlaybackEngine re-applies it (usePlaybackEngine.ts ~426-458), so undo, project load and collaborator changes reach the engine for programs, organ settings and kits.
- PopOutOverlay's Escape handler runs in the capture phase, skips inputs, and stops the event so closing a pop-out doesn't stop the transport (PopOutOverlay.tsx:36-62).
- Two synth panels can be open at once safely: reference-counted helpers keep the inline strip and the pop-out from rolling the patch back (acquireSynthBridge/releaseSynthBridge, acquireModIndicatorEngine).
- OrganView waits for its engine with useSyncExternalStore(subscribeEngineReady) instead of polling (OrganView.tsx:38-47). This is the right pattern for SoundFontView too.
- DrumMachineView's canvas basics are good: sized for devicePixelRatio and resized only when dimensions change; the playhead is a CSS transform rather than a canvas redraw; eventsRef avoids stale closures; a window-level mouseup catches releases outside the canvas; ruler drag zooms around the cursor.
- Pointer capture is used in RotaryKnob, the organ knobs and drawbars, MiniKnob and PianoKey, so drags survive leaving the control.
- On-screen keyboards are coloured by the live chord via useLiveChordColor. This is colour that carries musical meaning, exactly as the Music Atlas look intends; keep it.
- The dock's active tab is in the store (uiSlice channelStripTab), and data-tutorial-id hooks (chanstrip-tab-\*, drum-machine-view, drum-kit-selector, grooves-browser) let lessons drive the dock. Keep these ids in any redesign.
- KeyboardView releases held computer-keyboard notes on unmount (KeyboardView.tsx:161-170). The Grooves BPM-mismatch prompt teaches tempo in context.
- loadGrooveEvents.ts is a clean, reusable loader already shared by lessons and demos.

**Proposal**

Rework the bottom dock into an 'editor dock' in four steps, smallest risk first.

1. Correctness fixes (about 1–2 days):

   - Share one clip-relative note-origin helper with PianoRollModal and use it in ChannelStrip, KeyboardView and DrumMachineView (finding 01).
   - Autosave: subscribe to persisted state only, add a maximum wait, and flush on pagehide (finding 02).
   - Apply drum pad volume/pan in usePlaybackEngine and fix the default pan in updateDrumPad.
   - Musical typing: a capture-phase hook that stops global shortcuts for mapped keys.
   - Groove preview: cancel stale and unmounted previews; schedule notes with audio-clock time.
   - SoundFont: expose load errors, add Retry, and show the program list immediately.
   - Pop-out: don't mount a second copy of the instrument; delete the dead controls.

2. Tab model and layout:

   - Stable tabs: SOUND (the instrument), EDIT (drum grid for drum tracks, piano roll otherwise, bound to the selected clip, then the clip under the playhead, then the first clip), FX, and PRISM for melodic tracks. Tabs that don't apply are disabled with a reason, not hidden.
   - Grooves becomes a 'Grooves & loops' section of the right Library panel, with audio-clock preview, Add or Replace, and drag to the timeline, the way BandLab, Soundtrap and Soundation put loops in a side browser.
   - Presets open in a tall popover or the Library panel, like Logic's Library and BandLab's instrument picker.
   - A resizable splitter replaces 33vh, as in Ableton's Detail View or Logic's editor pane.
   - Dock settings (tab, height, per-track drum zoom/grid/tool/scroll) are saved in uiSlice + localStorage. The auto-open happens once per session.

3. Performance:

   - No top-level `position` subscribers: playheads move through useStore.subscribe and ref transforms.
   - Drags apply to the engine live and write to the store once on pointerup, giving one undo step and one collab update.
   - Narrow selectors (useShallow) on the selected track.
   - Split DrumMachineView into Toolbar / PadColumn / GridCanvas (sized to the viewport) / Playhead / VelocityLane.
   - The inline synth becomes a compact macro view, with visualizers that run only when visible and active.

4. Shared components and visuals:
   - One accessible Knob, Listbox/Popover, Segmented and Toggle; one useMusicalTyping (single A=C map, on-screen key letters, a toggle like Ableton's computer-MIDI-keyboard button or Logic's Musical Typing); one useInstrumentNotes for notes, chord colour and collab relay.
   - Neutral tokens, the white pill for primary actions, Glacial Indifference at 11px or larger, and colour only for track colour and live chord colours.
   - Optionally, a 16-step 'beat' mode for beginners, like the Soundtrap and BandLab beat makers.

Keep every data-tutorial-id, and keep the tutorial checks that depend on clip count ('load-groove') and on blank piano-roll mode (clearClipSelection).

**Open questions**

- What should loading a groove do: replace the current drum pattern, add it at the playhead or after the last clip, or keep today's 'new clip at bar 1' behaviour? The 'load-groove' tutorial check counts clips, so it would need to change too.
- Are 'Your Library', the row checkboxes, the ⋮ menu, Loop and Volume in Grooves planned features to finish, or should they be removed now? Should saved grooves be stored per user (server) or per device?
- Should Grooves move out of the bottom dock into the right Library panel, next to instruments and templates, with drag to the timeline?
- Which screens must the editor support? Many school Chromebooks are 1366×768, where 33vh shows about 3–4 drum rows. Should the dock open taller, or auto-maximise, for drum editing?
- Should computer-keyboard playing be always on whenever an instrument panel is open, or behind an explicit toggle? Single-key shortcuts R, M, L and Space, and the drum tool keys V/D/E, conflict with it today.
- Is the 31 MB GeneralUser GS sound bank required, or could a smaller General MIDI bank or per-program loading be used on school networks?
- For free users, the Prism tab shows a lock overlay where any click leaves the editor for the plan page. Is that intended, including during tutorial steps that need Prism?
- Should the inline Oracle synth become a compact macro view, with the full synth only in the pop-out?
- Is the drum view's 'Sample' section a placeholder for a planned sample editor (trim, replace sample, tune), or should it be removed?

## engine-hooks

The React-to-engine layer works, but it runs audio state through React, so the whole editor pays for it. Nine engine hooks run inside DawAppInner, which subscribes the editor shell to tracks, master, returns, bpm, loop and remote presence. Only TransportBar is memoized below it. The 1,204-line usePlaybackEngine re-applies every track's full FX chain on every edit, and while playing it re-asserts automation in a way that makes parameters jump for about 100 ms. It builds the playback schedule only once per Play, so edits, seeks and instrument swaps made while playing are not heard (or desync). Mid-clip and loop-lap audio starts about one Tone lookAhead (100 ms) ahead of MIDI, and audio takes are not latency-compensated. Meters, the tuner and the detectors use per-frame React state or loops that never stop. The most serious issues are: (1) autosave can silently drop edits (it starves during playback, drops the pending write on unmount, and misses synth edits), and the editor then restores that stale copy over the newer session on re-entry; (2) audio timing and scheduling correctness; (3) MIDI correctness: stuck notes, input pinned to track 1 after a project load, and a MIDI export that plays 3.75x slower with every clip stacked at bar 1. The device and status UX also misleads students: a red 'MIDI unavailable, use Chrome/Edge' when no keyboard is plugged in, tuner errors that never show, and missing audio that shows 'Loading...' forever or a fake waveform.

**Strengths to keep**

- A module-level trackEngineRegistry lets MIDI routing, collab monitoring and instrument panels reach engines synchronously, with no prop drilling.
- The play/stop scheduler reads tracks via getState() on purpose, so fader moves don't trigger a reschedule. That is the right instinct; it only needs incremental updates on top.
- The audio code is defensive: the master gain is NaN-guarded (applyStaticMasterVolume), malformed sampler root notes are caught, monitor-tap connects are wrapped in try/catch, and samples are applied idempotently via signatures.
- MidiRecorder anchors MIDI takes at punch-in and compensates for Tone lookAhead and event-loop delay. That is the model the audio-recording path should follow.
- Guitar-to-MIDI drives the synth on every note edge but throttles keyboard highlights to ~15 Hz with batched store writes (hwNotesBatch). Meters should copy this pattern.
- useTransport throttles the playhead to ~30 fps, skips unchanged ticks, and deliberately doesn't force the view to follow, so students can scroll freely while playing.
- Count-in clicks are scheduled on the audio clock, and their start time is published so the notation count-off can follow the same clock.
- Recorded takes upload to the cloud immediately so they can survive a reload, and the asset loader de-duplicates in-flight downloads.
- Mute, solo, arm and monitor stay per-user in collab, and per-peer listen gains keep live monitoring personal.
- Stopping hands automated params back to their static fader and knob values, and a deleted automation lane snaps back cleanly.
- useLiveChordColor uses colour only for musical meaning (chord function), which matches the Music Atlas look.

**Proposal**

Pull the audio engine out of React and give it explicit clocks.

1. Engine host. Add a renderless AudioEngineHost, or plain modules started once by DawApp, that owns every binding and talks to the store via useStore.subscribe(selector, fn, {equalityFn}). DawAppInner then renders only for layout state.
2. Reconciler. Diff each track against the last-applied Track object; zustand keeps unchanged tracks identical, so most tracks are skipped. Apply only changed fields. Re-assert automation only for tracks whose lanes or static values changed, at the same context time as the static writes. Guard async instrument init with a per-track generation token and dispose stale instruments. Expose an observable per-track registry (useTrackEngine) so meters and panels never read stale nodes.
3. Incremental scheduler. Key Parts and audio sources by clip id plus version and replace them in place on edits. On seek, cancel and reschedule from the new tick. At loop boundaries, use the event's time. Start mid-clip audio at an explicit transport start time, pass the trim offset, and validate loop ranges.
4. Clocks. One engine-clock rAF that runs only while playing, recording, an input is armed, peers are present or meters are visible. A MeterBus that writes to DOM or canvas with dt-based ballistics. A separate latency-compensated playhead channel, so the main store isn't written at 30 fps.
5. Recording service. AudioWorklet capture with context timestamps. Latency compensation plus a calibration step, as in Soundtrap and BandLab. Proper stream lifecycle. A 'take finished' event that feeds chord analysis running in a Worker.
6. MIDI.
   - Release each note to the tracks that received its note-on.
   - Input follows the selected track; arming records.
   - A status model (unsupported / denied / no device / ready) with lazy permission.
   - @tonejs/midi for import and export at 480 PPQ, with tempo, programs and drums.
7. Persistence.
   - Autosave scoped to content (including the synth store), with a maxWait.
   - Flush on pagehide and on unmount.
   - Restore only when the autosave's revision is newer than the in-memory session.
   - Visible clip-audio states: loading, failed, not uploaded.

Suggested order:

- Cheap, big wins: 01, 02, 08, 10, 15, 03, 07.
- Then the scheduler and recording rework: 04, 05, 06, 13, 14, 18.
- Then MIDI correctness and the UX items: 09, 11, 27, 30.

**Open questions**

- Should a MIDI keyboard always play the selected track, as in Ableton, Logic and BandLab, with 'monitor' only adding extra layers? And should arming a track be exclusive by default?
- Is the forced monitor-and-arm of the first MIDI track on every project load intentional (for example for lessons or tutorials), or can it go?
- Should live key detection from audio (useLiveUnisonAnalysis) be a product feature? It is built but never mounted, and it is the only reason the 20 Hz chord stream exists.
- When a student adds a second Oracle Synth track, should it start from the default patch, a chosen preset, or a copy of the last sound?
- Which hardware sets the performance budget: school Chromebooks, iPads, or recent laptops? This decides whether meters, the tuner and chord analysis must move to Workers or AudioWorklets.
- Is a one-time latency calibration step acceptable in onboarding for audio recording, as Soundtrap and BandLab do it?
- When a student leaves the editor mid-playback, should playback stop, or keep going in the background (with engines kept alive)?
- When re-entering the editor through in-app navigation, should the in-memory session or the local autosave win? Today the autosave always wins.
- For MIDI export, should audio tracks be skipped silently, should drum-machine tracks always export on GM channel 10, and should clip trims be honoured?

## fx-mixer

The FX rack and the MASTER view work for per-track effects, sends and return buses, and those settings save and reload correctly. The mastering half is not reliable:

- The mastering chain, master fader and bypass are never saved and never reset. They are lost on refresh and carried into the next project that is opened or created.
- The MASTER 'Bypass' button does nothing to the audio, and 'Gain Match' has no handler.
- The 'LUFS' number is the peak level relabelled.
- Undo skips mastering and return edits, so Cmd+Z undoes an unrelated earlier track edit instead.

Lag comes from three places:

- Meters are driven by React state, so every mixer strip re-renders every display frame during playback.
- The compressor-meter hook re-renders the whole rack 30 times a second, even when stopped and while its meters are hidden.
- Each knob or fader move costs work proportional to the whole project: undo serialises the project, DawAppInner re-renders, and every track's audio settings are re-applied.

Layout: the MASTER layout pins about 560 px of mastering on top, which leaves track faders about 25 px tall at 1440×900. Selecting a return then collapses the strips completely.

UX problems:

- The chain is drawn in the order effects were added, not the order the audio runs.
- Visualizers only appear behind an unlabelled pop-out, so the docked EQ is a wall of about 40 controls.
- Knobs cannot be used from the keyboard, and drags may not work on touch screens.
- There is no way to reach a track's effects from the mixer.
- The FX list can be dragged, but nothing accepts the drop.

Dead code: MixerPanel, Mixer/ChannelStrip, InfoPanel and five unused FxShared exports, plus four near-copies of the rack's wiring code.

**Strengths to keep**

- Mixer subscriptions are fine-grained. MixingSection only reads track ids and count, each MixingStrip is React.memo plus useTrack(trackId), and send targets are selected as flat primitives with useShallow so a return edit doesn't re-render every strip (StudioView.tsx:602-612). DuckerControls uses the same pattern (EffectsPanel.tsx:1361-1369).
- FxPowerButton is a real button with aria-pressed, aria-label/title and stopPropagation, placed outside the dimmed block so it stays readable when bypassed (FxShared.tsx:38-81, EffectsPanel.tsx:386-395).
- Per-track effects, activeEffects, sends and return buses round-trip through both local autosave and cloud saves. Missing effect slots are backfilled from DEFAULT_EFFECTS, and ducker key references are remapped when track ids change (SessionSerializer applyTrackSettings / restoreReturns / remapDuckerKeys).
- GraphicEQ computes the real biquad response (RBJ cookbook), memoised per band, and handles 24 dB/oct cuts. Its spectrum canvas uses a ResizeObserver and devicePixelRatio. It also has drag, wheel-to-Q and double-click reset, a good base for the primary EQ UI.
- The visualizers (CompressorCurve, GateCurve, DelayTaps, ReverbDecay) are pure SVG with no animation loops, so they are cheap and deterministic.
- Meter hooks are throttled where it matters (useCompressorMeters about 30 fps, useDuckReduction about 20 fps) and all loops are cancelled on unmount.
- PopOutOverlay handles Escape in the capture phase so closing a pop-out doesn't stop the transport, and it re-applies the DAW theme inside the portal.
- Bus racks hide the sidechain ducker where it can't work (FxBrowser.tsx:29-43), and the ducker's key select falls back to 'None' when the key track has been deleted (EffectsPanel.tsx:1389-1395).
- Stable data-tutorial-id anchors (fx-slot-_, fx-add-_, mastering-section, mixer-section, mixer-sends-_, return-strip-_, return-fx-_, master-strip, ducker-key-select, add-track-_) are used by tutorials.ts. Any redesign must keep them.
- FixedDigits keeps numeric readouts from jittering. The faders are Radix sliders, which are keyboard-operable and touch-none. ReturnFxRack is keyed by return id so effect selection can't bleed between returns.

**Proposal**

Rebuild this slice around three shared pieces and a mixer-first MASTER view, after fixing the data bugs.

**1. Data first (S/M).**

- Save and restore mastering (fxChain, effects, bypass, masterVolume) locally and in the cloud.
- Reset mastering and returns when a project is opened or created.
- Add mastering and returns to undo.
- Wire Bypass in the engine; build or remove Gain Match.
- Clamp reverb decay when the type changes.
- Show honest Level, or real BS.1770 LUFS.
- Make autosave ignore `position`.

**2. One `<FxRack target={track | master | return}>`** replaces EffectsPanel, MasterFxPanel, MasteringSection's rack and ReturnFxRack.

- The chain is drawn in true processing order (later, a reorderable engine like the Ableton/openDAW/Soundation device chains), with blocks as real buttons and a drop target.
- The selected effect's detail area has a compact inline visualizer: the EQ graph as the main EQ with knobs for the selected band only, the compressor curve with a live gain-reduction meter, and the reverb and delay sketches.
- A declarative parameter schema per effect (label, unit, range, scale, default, step) drives accessible knobs (role=slider, keys, reset, type-in, touch-none) and the automation parameter list.
- Meters live only inside the visualizer.

**3. One meter loop.** A single module loop at 30 Hz or less reads registered analysers and writes transforms through refs, with no React state. It does time-based peak hold and pauses when stopped. The spectrum gets its own analysers, separate from the metering taps. Engine-ready subscriptions re-bind meters when engines are created.

**4. Commit on release.** While dragging, knobs and faders write AudioParams directly and commit to the store once on release: one undo entry, one collab op, one autosave. usePlaybackEngine syncs through `subscribe()` per changed track instead of re-rendering DawAppInner. Collab stores effects as per-slot Y.Maps.

**5. MASTER view, mixer first.**

- Strips are full height and horizontally scrollable.
- Each strip shows its fader value in dB, one meter, mute and solo, sends labelled by return name with %, and an insert list that opens that track's FxRack.
- Return strips get a meter and mute; then the master strip.
- A right-hand detail column shows the FxRack for the selected track, return or master. For the master it adds the resizable spectrum, the loudness readout and a working before/after toggle (the simple one-click mastering pattern of BandLab; loudness readouts like Logic's Loudness Meter).

**6. Look.** Neutral white-opacity blocks and hairlines, the white pill for on and selected states, and colour only for meters, EQ band data and key colour. Labels at least 11 px, held in --fx-\* tokens.

**7. Cleanup.** Delete MixerPanel, Mixer/ChannelStrip, InfoPanel, the unused FxShared exports and the legacy mastering fields. Keep every data-tutorial-id anchor.

**Open questions**

- Mastering should presumably be saved per project. Can the cloud API get a project-level mastering field, or should it ride on track[0].settings the way masterAutomation does?
- Do you want a reorderable effect chain (an engine change), or is a fixed order that is clearly labelled acceptable for students?
- Should we build real LUFS (an AudioWorklet, more complexity) or relabel the readout as 'Level'? Is hitting a loudness target such as -14 LUFS part of the curriculum?
- Gain Match: build it (loudness-matched before/after comparison) or remove it?
- What is the smallest screen the MASTER view must support (iPad 1024×768 landscape, Chromebook 1366×768)? That decides between a side column and tabs for mastering.
- Should students be able to open and edit a track's effects from the mixer, or should track FX stay in CREATE only?
- Is the 5-effects-per-track cap a teaching choice or a performance guard? The store does not enforce it for tracks, only the UI does.
- In collab, should the master bus stay editable by everyone at once (as now, where simultaneous edits can overwrite each other), or be host-only?
- Should mixer and mastering edits share one undo history with note edits, or have their own?
- What should 'Import' in Add Track do? Today it creates an empty track with no instrument; should it open a file picker for audio or MIDI?

## ia-flows

Cross-cutting IA and flow audit of /studio/editor. Scope: the DawApp render tree, TransportBar, the Create/Master/Score/Lead Sheet/Practice views, side panels, the bottom dock, modals, lessons, collab, persistence and the global keymap. Evidence comes from code plus the a11y-studio-\*.png screenshots (1440×900).

SURFACE MAP

- App chrome: 72px sidebar + 56px TopRail. That leaves an editor box of about 1294×712 at 1366×768 (about 1294×600 in a real Chromebook Chrome window) and about 1368×844 at 1440×900.
- Top bar: a 48px TransportBar with about 30 controls. At 1440 it already wraps the Key label onto two lines; at 1366 it has no overflow menu, so controls get squeezed or clipped.
- CREATE: 200px track headers (80px rows), then the timeline, then a 200px Insight/Library panel (open by default). Rulers take 84px. The dock is a 32px tab bar plus a fixed 33vh (about 285px at 768, about 329px at 900).
  - Visible area: about 3.7 lanes and 5.6 bars at 1366×768; about 4.8 lanes and 6 bars at 1440×900.
  - The automation lane adds 132px. Collab adds a 200px users panel and a 240px chat panel.
- MASTER: a fixed mastering block of about 568px leaves about 68px for mixer strips at 768 (about 200px at 900). Faders and sends are clipped.
- SCORE: 216px palettes, an editor bar of about 108px and a 36px header.
- LEAD SHEET: 216px palette and a toolbar of about 44px.
- PRACTICE replaces the top bar.
- Overlays: piano-roll modal (90%×85%), pitch editor, three pop-outs, the Add Track picker (a row of about 1,070px), a 380px coach card, and 12 or more prompts and dialogs. They use four different dialog mechanisms, including native confirm and prompt.

CORE FLOWS

- Empty project → instrument → Prism chords → hear: about 10 actions. Two hidden gates (track type and the premium lock) are on the way, and it ends in a Create button that deletes the track's existing clips.
- Notes can be edited in three piano rolls, each picking its target differently.
- Effects live in four places (dock FX, Master pop-out, Master chain, return racks).
- Mix is unusable at Chromebook height.
- Export Audio works. Export MIDI moves every clip to bar 1.
- Saving: ⌘S gives no feedback. A refresh drops the time signature, markers, mastering, Score/Lead Sheet marks and pitch edits. A cloud reopen also drops the chord lane and mode, then shows an analysis prompt whose primary button is near-invisible.
- Every dashboard tab, lesson, demo, template or collab entry (and File ▸ Open) silently wipes unsaved work. Returning by SPA navigation overwrites the live session with the stale autosave.
- 4 of 8 lessons need the premium-locked Prism panel. A refresh mid-lesson loses the lesson.
- The global keymap hijacks text fields (Ctrl+A/Z/C/V, and page zoom). Delete, arrows and digits act across views. 'L' and 'M' collide with computer-keyboard notes.

PERFORMANCE

- Engine hooks in the root re-render the whole editor on every track, fader or loop edit.
- Undo tracking JSON-stringifies the project on each change and adds a new set of subscriptions on every visit.
- Meters held in React state re-render headers and strips 60×/s.
- An invisible full-screen gradient canvas animates forever.
- The spotlight forces layout every frame.
- Pitch analysis blocks the main thread for seconds.
- Every view loads in one chunk.

**Strengths to keep**

- DawApp's boot router (DawApp.tsx:101-428) is explicit and well documented per intent (project/template/demo/tutorial/song/practice/collab/jam), strips the query so a refresh restores the current session, and rejoins a collab room on SPA back/forward.
- PositionDisplay isolates the 30 Hz playhead subscription from the rest of TransportBar (TransportBar.tsx:104-118) — the pattern to replicate for Lead Sheet, Practice and Timeline playhead consumers.
- MixingStrip uses useTrack(id) + useShallow return metadata to avoid re-render storms (StudioView.tsx:593-612) — the right model for replacing whole-tracks-array subscriptions.
- ensureProjectId's in-flight guard prevents duplicate cloud projects on rapid saves, and saves honestly warn about audio clips/samples that could not be uploaded (api.ts:222-244, 320-351).
- ExportAudioDialog has a clear range model (whole project / loop / bar range with validation), instrument-coverage warnings and busy guards against closing mid-render.
- ChordAnalysisPrompt is consent-first: it shows proposed chord symbols before anything touches the chord lane.
- PopOutOverlay's capture-phase Escape avoids also stopping the transport, and DawApp disables trackpad back-swipe while mounted (DawApp.tsx:460-467) — thoughtful protections against accidental loss of context.
- The tutorial engine is data-driven (targets via data-tutorial-id, preconditions, validated steps, quiet advance when already satisfied) and easy to extend.
- PracticeTrackView is a strong one-purpose screen: large rounded targets, 14–30px text, aria-pressed loop, keyboard that sizes itself to fit — a ready template for a beginner 'Simple' mode.
- Recording safety: overwrite confirmation for armed audio tracks and an explanatory 5-minute cap dialog.
- Score and Lead Sheet share one roadmap model and one editing hook (useScoreEditing), so marks show up consistently in both.

**Proposal**

TARGET: "Studio Shell v2". Five fixed regions, one panel and tab model, Simple and Advanced modes, a focus-scoped keymap, and one save format for both the browser autosave and the cloud. It is designed to fit a 1280×600 usable box (a real Chromebook Chrome window) and checked at 1366×768 and 1440×900. Look: #101012 background, #e8e8f0 text, white-opacity surfaces and white/8 hairlines, a white pill for primary actions, Glacial Indifference type, and colour only for musical meaning.

1. REGIONS AND SPACE BUDGET (today the editor box is 1294×712 at 1366×768)

- Top bar: 44px, three zones (section 2).
- Track list on the left: 184px in Simple mode, 220px in Advanced. Create view only.
- Canvas in the middle: whatever the current view is.
- Inspector on the right: 280px wide, or a 44px icon rail. It defaults to the rail below 1440px wide.
- Editor dock at the bottom (Create only):
  - Default height 220px; drag-resizable from 120px to 85% with snap points at 25/40/60/85%.
  - The height is remembered per dock tab.

Result in Create at 1366×768, with the rail and a 220px dock:

- Timeline width about 1,066px (about 6.7 bars).
- About 364px of track lanes: 4.5 lanes at 80px, or 5.7 lanes at the 64px compact height.
- Today it is about 894px and about 3.7 lanes. At 1440×900 the new layout gives about 1,140px by 496px.
- If the editor may hide the 56px TopRail (a "focus mode"; see the open questions), the lanes gain another 56px.

2. TOP BAR (44px)
   It changes with the view and never clips. Below 1360px, items move into a "⋯" menu.

- Left zone:
  - "Project" menu: New, Open…, Save, Save as, Import, Export (audio, MIDI, MusicXML, PDF), Delete.
  - Project name.
  - Save chip: Saved / Saving… / Unsaved changes / Couldn't save – Retry.
  - Undo and Redo buttons.
- Centre zone:
  - Transport: go-to-start (or previous marker), Stop, Play as a 36px white pill, Record in red, skip forward.
  - Position readout (toggle bars:beats ⇄ mm:ss).
  - Loop, Click (metronome, with count-in in its caret menu) and Follow-playhead.
- Right zone:
  - A "Song" chip, e.g. "C major · 4/4 · 85". One popover holds the circle of fifths plus mode, a time-signature grid, and BPM with tap tempo. It replaces today's Key button, key lock, time-signature button and BPM field.
  - View tabs as a real tablist: Create · Mix · Score · Lead sheet (+ Practice when a practice session exists).
  - Share: start, join, invite, leave, plus avatars of who's in the session.
  - "?" button: lessons, shortcut sheet, help.
  - Audio settings button: devices, latency and MIDI status.
- Tools that only apply to the timeline move into a 32px toolbar inside the Create canvas: Select/Draw/Cut, Snap and grid, zoom −/fit/+, chord-ruler labels, "+ Marker" and "Suggest chords".

3. TRACK LIST

- "+ Add track" is pinned at the top; the Master row is pinned at the bottom.
- Rows are 64px in Simple mode and 80px in Advanced: colour, name, M, S, Arm, volume.
- A "⋯" menu holds role, monitor, test sound, automation lane, colour, duplicate, and delete (delete shows an undo toast).
- "Release" appears only during collab sessions.
- Keyboard:
  - Up/Down selects a track (aria-selected).
  - Enter moves focus into the editor dock.
  - Together these fix A11Y#3.
- The Master row's FX opens the Mix view's master column instead of a pop-out.

4. CANVAS, PER VIEW

- Create:
  - An empty project shows four tiles: Add an instrument / Start with chords (Prism) / Record your voice / Start a lesson.
  - The chord-lane header has "+ Suggest chords" and a key chip.
  - Follow-playhead uses page-flip scrolling and pauses while the user scrolls.
- Mix:
  - Channel strips fill the height (minimum 240px, scrolling when needed).
  - A Master column on the right holds the fader, a "Polish" amount, a collapsible master effects rack and a 96px spectrum.
  - Return (send) racks open in the Inspector.
  - Gain Match is hidden until it's built; the meter is relabelled "Peak", or real BS.1770 LUFS is implemented.
- Score and Lead sheet:
  - Content stays the same, but both read the time signature from the project.
  - Below 1440px their palettes move into an Inspector tab.
  - Their MuseScore-style keys belong to those views only.
- Practice: unchanged. It is the model for Simple mode.

5. INSPECTOR (one right-hand panel, in every view)

- Tabs: Insight · Browser · People.
  - Browser holds instruments, loops and grooves, effects, and templates. Click or press Enter to add; drag is optional.
  - People holds collaborators and chat, with an unread badge on the rail.
- During a lesson below 1440px wide, the coach card docks at the top of the Inspector instead of floating over the work.
- Whether it's open, and which tab, is remembered per view.

6. EDITOR DOCK (Create)

- Its title is the selected track: colour, name and instrument.
- The same tabs always appear:
  - Instrument
  - Effects
  - Notes: piano roll for melodic tracks, drum grid for drums, pitch editor for vocal clips.
  - Prism
  - Grooves: drums only.
- A tab that doesn't apply is greyed out with a reason (e.g. "Prism needs a melodic MIDI track"); tabs are never hidden.
- Notes always edits the selected track:
  - It opens the clip under the playhead, otherwise the first clip.
  - Drawing creates a new clip only in empty space at the playhead.
- Maximize (a button, double-clicking the tab, or Shift+E) expands the same panel to 85% height. That replaces PianoRollModal, PitchEditorModal and the PopOutOverlay copies.
- Prism's Create inserts at the playhead and never deletes anything.

7. OVERLAYS ONLY FOR BLOCKING TASKS

- Overlays are for: Export, Save as, Audio settings, Invite, and confirm sheets ("Discard this session?", "Replace these clips?").
- One DawDialog and one DawPopover (Radix, landing styles), mounted inside the colour-token scope.
- No native confirm() or prompt().

8. SIMPLE AND ADVANCED MODES

- A per-user setting; teachers can set the default for a class, and lessons can force a mode per step.
- Simple hides:
  - automation, track role, monitor and count-in;
  - snap/grid (snap stays on);
  - every send except "Space" (reverb);
  - the master effects chain (a "Polish" knob replaces it);
  - the MIDI and zoom indicators, and the Grooves filters.
- Advanced shows everything.

9. ONE PANEL AND TAB MODEL

- One shared Tabs component for view tabs, the Inspector and the dock: role=tablist, aria-selected, underline plus weight for the active tab, 32px tall, 12px text (A11Y#9).
- Panel state lives in uiSlice and persists to localStorage under "ma:daw:ui":
  - current view;
  - dock tab, and dock height per tab;
  - Inspector open/closed and tab, per view;
  - Follow-playhead and mode.
- Switching views never forces a panel open. The dock opens automatically only once, when the first track is ever added.

10. KEYBOARD MAP
    A focus-scoped dispatcher replaces useKeyboardShortcuts. Text fields receive nothing except ⌘S, and the browser's Ctrl +/− zoom is left alone.

- Global:
  - Space play/pause; Enter or Home go to start; R record.
  - ⌘/Ctrl+S save; ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z redo; ⌘/Ctrl+E export audio.
  - Alt+1–4 switch views; I toggles the Inspector; E toggles the dock; ? opens the shortcut sheet.
  - K toggles musical typing.
  - L loop and M click, but only while musical typing is off.
- Create canvas:
  - V select, B draw, C cut (digits no longer change tools).
  - Left/Right nudge by the grid (Shift = one bar); Delete deletes.
  - ⌘D duplicate; ⌘C / ⌘X / ⌘V clips.
  - Ctrl+scroll zooms the timeline.
- Track list: Up/Down select; M / S / A mute, solo, arm; Enter opens the track in the dock.
- Notes editor: arrows move notes (Shift = octave); Delete; Q quantize; D / E / V tools.
- Score and Lead sheet: MuseScore keys (digits = durations, S slur, T tie, ⌘K chord), active only in those views.
- Musical typing (toggled with K; a chip shows when it's on):
  - One key map for every instrument: A to ' are white keys from C4, W to P are black keys.
  - Z/X change octave; C/V change velocity.
  - While it's on, single-letter shortcuts are suspended.

11. SAVING AND RELOADING

- One save format (schema v3) shared by the autosave and the cloud. It holds:
  - tracks, the chord lane, key and mode, time signature and BPM;
  - markers, return buses, mastering settings and master volume, master automation;
  - Lead Sheet and Score marks, and pitch edits.
    The browser copy additionally holds lesson progress (tutorial id and step) and the practice session.
- One initialProjectState() is used for every reset and load. File ▸ New no longer reloads the page.
- Autosave:
  - watches only project data (not playback position or UI);
  - writes at most every 2 seconds;
  - writes immediately when the page is hidden or closed, or the editor unmounts;
  - a dirty flag drives the save chip.
- On boot, confirmLeaveSession() runs before anything that would discard work, including File ▸ Open. Returning to the editor by SPA navigation keeps the in-memory session instead of reloading the autosave.

12. PERFORMANCE GUARDRAILS

- An EngineHost component owns the audio-engine hooks, so the editor root stops re-rendering.
- Each region is memoized, and components subscribe to individual tracks by id.
- A shared MeterBus updates meters through refs instead of React state.
- Delete MeshGradientBg and the glass blur.
- Isolate the components that follow the playhead.
- Lazy-load Score, Lead sheet, Mix, Practice and the heavy dialogs.
- Run pitch analysis in a worker.
- Undo tracking registers once and only serializes after its debounce.

13. PHASING

- P1, data safety and correctness (about 1–2 weeks): ia-flows-01 to 08, 10, 11, 13, 15 and 18.
- P2, performance (about 1–2 weeks): ia-flows-09, 17, 19, 20, 29, 30, 31 and 37.
- P3, Shell v2 (about 3–4 weeks): top bar, Inspector, resizable dock, single Notes editor, mixer-first Mix, empty state, Simple mode, the new keymap and design primitives.

PATTERNS BORROWED (from these products' public interfaces; not checked during this read-only audit)

- BandLab and Soundtrap: empty-project tiles, an instrument picker with descriptions, a persistent "Saved" status, follow-playhead, a bottom editor and a right-hand browser.
- Soundation and Audiotool: resizable docks that remember their size.
- Ableton: a single detail view at the bottom, a hover-help pane, and a toggle for the computer MIDI keyboard.
- Logic: Simplified vs Advanced tools, and a Musical Typing toggle.
- Suno, and Music Atlas's own Practice screen: one-purpose creation flows for beginners.

**Open questions**

- Prism is premium-only, but 4 of the 8 Production lessons (19 steps) require it. Should Prism unlock while a lesson is running, or should those lessons be marked premium on the Production page?
- Can the editor hide the app TopRail (XP, Level, credits) in a focus mode? That would give back 56px of height on 768px-tall Chromebooks.
- Is a per-user Simple/Advanced Studio mode acceptable? Should teachers set the default per class, and can lessons force a mode?
- Can the cloud project schema be extended, or take a JSON 'meta' blob, to carry the chord lane, mode, time signature, markers, mastering, and Score/Lead Sheet marks? This is a backend change.
- Should the dashboard's 'Project' tab resume the current session rather than start a blank one? What wording do you want on the Save / Discard / Cancel prompt?
- Is 'Prism — Suggest Chords' meant to be a core student tool? Today it is only reachable by right-clicking an empty track lane.
- Is Gain Match planned, or should it be removed? Should the master meter become true integrated LUFS (ITU-R BS.1770) or be relabelled 'Peak'?
- Target hardware: is 1366×768 at 100% display scaling the baseline, and are touch devices (Chromebook tablets, iPads) in scope? This decides whether drag-only interactions and 20px targets are acceptable.
- Now that lessons live at /studio/production, should the editor offer 'Resume lesson' or a lesson picker from a Help menu?
- Should the editor keep its side-panel 'Library' tab, which now holds only four genre templates, or should the dashboard own templates entirely?
- Is audio file import (wav/mp3) intended for the 'Import' card in the Add Track picker? Today only .mid files can be imported (File menu or drag-and-drop).

## insight

The right side panel (LibraryPanel with Insight and Library tabs) and the music-intelligence code behind it: ChordAnalysisPrompt, unisonSlice, musicIntelligenceSlice, and the pure theory helpers. Insight shows the chord being played live, analyzes chord symbols and lets the student apply them, analyzes a selection, shows the key, gives one card per chord with Learn links, and adds UNISON extras (progression matches, vibes, rhythm, melody). It starts the full UNISON analysis itself, from a React effect. Since the lesson move, the Library tab holds only four genre templates.

The theory helpers are pure, well tested and colour-correct. The panel's lifecycle and the store design cause the main problems:

- **Lag:** the full analysis re-runs on the main thread after unrelated track edits (faders, mute, FX) and every time the panel mounts. The 200px width spring makes the Timeline re-render and reallocate its canvas every frame. The whole Insight tree re-renders on every MIDI key press.
- **Reload and persistence bugs:**
  - Cloud open drops the chord lane and the mode, so the analysis prompt re-fires and Insight reads the song in Ionian.
  - Replacing the project with a template from the Library tab keeps the old project's id, chord lane and key, so the next Save overwrites the saved project.
  - Learn links leave the editor, and coming back restores an older autosave.
  - The detected-key bus is never reset, so it carries over between projects, and it overrides the user's key for auto-tune.
  - Undo restores the chord lane but not the key.
- **UX:** 'Now Playing' ignores both playback and the QWERTY keyboard. The panel is fixed at 200px with the key buried. The top-bar toggle is labelled 'Library'. Text is 8–10px, teal is used for chrome and primary buttons, and colours are hard-coded off the Music Atlas look.

**Strengths to keep**

- Analysis proposes and the user applies (chordAnalysis, then applyChordSymbols). The chord lane only ever holds chords the user accepted. The notesKey staleness check and the 'already in the chord lane' check work like Logic's detect, review, apply chord-track flow.
- Theory logic is pure and unit-tested, separate from React: buildChordInsights, chordInKey, insightConstants, insightNotation, insightSelection, chordAnalysis, chordRegionNotation and the chord-symbol store tests.
- MODE_TO_SLUG (insightConstants.ts:303-356) is documented against the Prism API mode names. This prevents the old bug where non-diatonic Insight links taught the major scale.
- Colour carries musical meaning: KEY_COLORS drives the key dot and getChordColor drives cards and chips. This matches the brand rule that colour is for musical meaning.
- Chord labels follow the chosen notation (hybrid, jazz or Roman) through one adapter layer (insightNotation, formatChordRegion), with a size-bounded cache (chordRegionNotation.ts:104-210).
- Chord-card Learn links carry the song and chord (withStudioOrigin, ChordCard.tsx:44-45), so a lesson can say why the student is there and send them back.
- ChordAnalysisPrompt uses Radix Dialog (focus trap, Esc), real radio and checkbox inputs, and readable 11–12px text. The 'All tracks / Choose tracks' scope is clearly worded.
- freshProjectHarmony (SessionSerializer.ts:512-544) is the one place every load path uses to reset per-project analysis state, so previous-project analyses do not leak across normal loads.
- setAudioActiveNotes and hwNotesBatch already skip writes when nothing changed (midiDeviceSlice.ts:86-105). The music-intelligence bus should copy this pattern.

**Proposal**

Turn the right panel into one purpose-built Insight panel, and move the analysis engine out of React.

1. **Panel and tab model**

   - Rename the top-bar toggle and the panel 'Insight' (lightbulb icon) and drop the Library tab.
   - Templates move to File, New from template, using the dashboard's new-project flow: resetSessionToEmpty, projectId null.
   - Default width about 300px, resizable from 260 to 420px. Save open state, width and tab in localStorage, and stop forcing the panel open or closed in setCurrentView.
   - Add `showInsight()` so Analyze actions bring Insight forward.
   - Do not animate layout width: change the column once and fade the content (AnimatePresence initial={false}). Use an overlay drawer below about 1200px.
   - This follows the clearly named, collapsible side panels in Ableton, Logic, BandLab and Soundtrap, without importing an asset browser we don't have content for.

2. **Layout, top to bottom**

   - Sticky key header: correctly spelled tonic and mode ('C♯ minor') with the key-colour dot. Confidence only when the key was detected. Alternates are explicit 'Use as song key' suggestions that undo as one step.
   - A one-line 'Now' row: the chord under the playhead during playback (via a current-region selector, not position) plus live MIDI, QWERTY or audio input. It is aria-live.
   - The selection block when present, pinned and scrolled into view.
   - A 'Chords in this song' strip: one chip per distinct chord in chord colours. Tapping a chip expands one ChordCard, whose Learn link opens in a new tab or a side sheet so the editor never unmounts.
   - Chord symbols become a slim banner, shown only when the lane is empty or stale. This replaces the blocking modal, and 'Not now' is remembered per project.
   - Collapsible 'Song DNA' (progression matches, vibes and styles) and 'Rhythm & melody' (drop the BPM and time signature that repeat the top bar).

3. **Engine**

   - An InsightAnalysis controller (a store subscription, not a component) keyed on a harmony fingerprint: harmonyNotesKey, chordRegions, key and meter.
   - It runs sessionToUnison and analyzeChordSymbols in a Web Worker, caches by fingerprint and shows a loading state.
   - Audio and session analyses are stored separately.
   - analyzeChords no longer depends on timing.
   - The session key is authoritative on the music-intelligence bus, which is reset on every load. Live chord pushes skip repeats and tuning is throttled.
   - Cloud saves carry chordRegions and mode.

4. **Rendering**

   - A NowPlaying leaf is the only subscriber to live notes.
   - ChordCard is memoized, and the live chord reuses buildChordInsights and ChordCard.
   - Components select derived fingerprints instead of `tracks`.

5. **Visual**
   - Shared primitives on appTheme tokens: white pill for primary, white/55 for secondary text.
   - 12px minimum text and 24px targets.
   - Colour only for chord and key identity, plus labelled function badges. No teal chrome and no yellow.

This keeps what Insight already does well: Logic-style detect, review and apply, notation-aware labels, and lesson links that bring the student back to their song. It makes Insight fast, reload-safe and readable for students.

**Open questions**

- Should the editor keep a Library at all? If yes, should it become a real loops, samples and instruments browser with drag-to-timeline (the DragPayload kinds and the Timeline drop handler already exist)? Or should templates live only in File, New and on the dashboard?
- Should 'Now Playing' follow the song's playback (the chord under the playhead) as well as live input? Should computer-keyboard and on-screen keyboard notes count as live input?
- Can the backend store chordRegions and mode (and the lead-sheet layout) for cloud projects? Until it does, should the analysis prompt stay quiet after a student declines it once for a project?
- Should Learn links open the lesson in a new tab or a side sheet instead of leaving the editor?
- When the student has set a key, which should auto-tune, the live chord detector and synth 'snap to song key' follow: the session key or the detected key?
- Should the alternate-key chips be able to change the project key at all, or only suggest keys and link to lessons?
- What are the target devices and the smallest viewport (Chromebook 1366×768, iPad landscape)? This decides the default panel width and whether it docks or overlays.
- Are Rhythm, Melody, Vibes and Styles valuable to students, or should Insight focus on harmony and lessons?
- Is it intended that Insight's chord cards preview the Prism builder sequence (stringSeq) instead of the chord lane?

## instruments

The instrument slice is audio-only: 15 modules with no rendering, so visual-alignment and accessibility checks don't apply here. Its user-facing effects show up in other slices as missing, late, wrong or clicking sound. The main problems:

1. **Critical — SoundFont cross-talk.** The shared SoundFont synth is wired with connect(), which sends all 17 outputs (16 MIDI channels plus the reverb/chorus send) into every SoundFont track. With two or more SoundFont tracks (a Prism Chords track plus any demo's GM bass), every note plays through every SoundFont channel strip, and mute, solo, volume and FX stop isolating those tracks.
2. **Reload gaps for live-input tracks.** Guitar, bass and vocal tone, input device and NAM model reach the engine only while that track's CONTROLS view is mounted. After a reload, recorded DI clips play dry, and recording can fall back to the default mic.
3. **Latency and readiness.** Live drum hits use Tone.now(), adding about 100 ms. There is no readiness or error model: sounds load only after the first click, Play doesn't wait, and early notes are silently dropped.
4. **Heavy loading strategy.** Nothing is cached, and each instance fetches and decodes its own samples. The default drum kit is 19 MB of mostly padded 24-bit WAV and the SoundFont is a 31 MB SF2. Everything is fetched and decoded again on editor re-entry and on every export.
5. **Audio artefacts.** The organ disconnects released voices on a wall-clock timer that fires before Tone's look-ahead note-offs, so sequenced organ notes end with clicks. Drum pads are monophonic with hard cuts. Loop wraps stop notes and audio clips 50–100 ms early.

Smaller issues: silent load failures (one hangs forever, one is cached for the whole session), instruments orphaned while still loading (including SoundFont channel leaks on export), kit changes overriding pad pans, a latched sustain pedal on SoundFont tracks, fragile input-device handling, duplicated Guitar/Vocal adapters, third-party CDN dependence, and 21 of 50 presets that change only the label.

**Strengths to keep**

- ChopsSampler plus applySamplerState rebuild only when the sample signature (sampleId|root|trim) changes, and the AudioBufferStore subscription re-applies when buffers arrive late from rehydration or collab. Trim commits on pointer-up, so dragging causes no rebuild churn.
- drumKits.ts, samplerChops.ts and gmPrograms.ts don't import Tone, so the store, persistence and tests don't load the audio runtime. drumKits and samplerChops have unit tests.
- DrumMachineEngine.loadKit builds new players to the side and swaps them in, last request wins (loadSeq), so the old kit keeps playing until the new one is ready; setKit de-duplicates loads already in flight.
- The samplers and the 808 deliberately play live input at Tone.immediate(), avoiding the 100 ms look-ahead (PianoSampler.ts:73-75, SamplerInstrument.ts:64-66, ChopsSampler.ts:114-116).
- OracleSynthAdapter.dispose calls releaseResources() and never closes the shared AudioContext, so deleting tracks doesn't accumulate running LFO, macro or vibrato sources.
- SamplerInstrument rejects on any missing sample instead of hanging (SamplerInstrument.ts:44-52); the same pattern should be applied to PianoSampler.
- TonewheelOrganEngine is a careful setBfree-derived model (Leslie rotor accel/decel, chorus/vibrato depths, deterministic per-wheel detune) with a complete getState/setState round-trip, persisted on the track since 2026-10-01.
- Guitar and vocal adapters record the dry signal before the pedal chain, so tone can be changed after recording; the collab monitor send deliberately excludes transport playback.
- SoundFontAdapter documents its standardized-audio-context/native bridging (the silent activator node), reuses channels on dispose, and puts timeouts on the worklet init steps.

**Proposal**

Put an InstrumentHost layer between usePlaybackEngine and the adapters, with six parts.

1. **Lifecycle and readiness.** Each instrument goes through create, load (with an AbortSignal), then ready or error. Status and progress live in a small instrumentStatus store slice that drives a ring on the track header, a 'Loading sounds n/m' chip next to Play, and a Retry action on error. Play waits for audible tracks, with a 'play anyway' option. Loading starts when the editor mounts, on a suspended AudioContext, instead of on the first click.
2. **One shared sample cache.** A SampleCache (URL → decoded AudioBuffer, LRU capped by bytes) shared by all instances and by export, so extra tracks, editor re-entry and export reuse decoded audio. Assets should be self-hosted, trimmed and compressed, with immutable caching: the natural kit from about 19 MB to about 2–4 MB, SF3 instead of the 31 MB SF2, and the Studio piano reusing the lesson piano set.
3. **The engine applies all saved state.** Every adapter gets applyTrackState(track), so the engine — not the Controls views — applies guitar/vocal chain, device and NAM, drum pad overrides, organ state, GM program and bass voice. It runs on init, store change, undo, collab updates and reload; the views only write the store.
4. **Targeted fixes.**
   - SoundFont: per-channel routing (connectChannel) with the synth's own FX disabled, controller reset on stop and on channel reuse, a retryable init, and the channel released when init fails.
   - Drums: Tone.immediate for live hits, each pad awaiting its own buffer, persistent pad overrides, small voice pools with fades, and unmapped notes ignored.
   - Organ: voice cleanup driven by the audio clock, and one PeriodicWave oscillator per voice.
   - All adapters: allNotesOff(time) so loop seams are sample-accurate.
5. **Merge the input adapters.** Combine Guitar and Vocal into a LiveInputAdapter with a robust device lifecycle (request tokens, re-open on replug, visible input state).
6. **Honest presets.** Every preset maps to a real engine plus parameters, or is hidden.

For comparison, desktop DAWs keep one decoded copy per sample file in a shared pool and route each instrument to its own channel strip, and web DAWs generally show instrument-loading progress instead of silently dropping notes.

**Open questions**

- Fixing SoundFont cross-talk means choosing what happens to the synth's built-in GM reverb/chorus (output 0). Should GM tracks rely only on the DAW's reverb/delay returns (drier sound than today), or get a dedicated return for the GM reverb?
- Must Studio work on locked-down school networks? If so, can we commit to self-hosting all instrument samples (piano, EP, bass voices, cello, organ) and dropping the github.io CDNs?
- Should Play wait until every audible instrument has loaded (with a 'play anyway' option), or start immediately with per-track loading indicators?
- Should the 19 MB 'Natural' kit stay the default for new drum tracks once it's trimmed, or should new tracks default to a lighter kit?
- For the 21 label-only presets: map each to a GM program or Oracle patch, hide them, or mark them 'coming soon'? And should 'Hammond B3'/'Jazz Organ' use the tonewheel engine?
- In collab, the input adapters' monitor send carries raw mic/instrument input whatever the local Monitor toggle says (GuitarFxAdapter.ts:303-312). Does StudioRtcManager only stream it on record-arm or explicit sharing? If not, students' mics may be audible to peers without any visible indicator.
- MidiScheduler adds events in clip-array order, and updateMidiClipEvents doesn't sort. Should note-offs be ordered before note-ons at the same tick? Otherwise the organ drops a repeated note, and the samplers' triggerRelease stops every source of that pitch.
- Should GM 'Sound FX' programs such as 'Gunshot' (127) and 'Helicopter' (125) be shown in a K-12 product?
- What is the minimum target device (for example a 4 GB Chromebook), so we can set budgets for decoded-sample memory and organ voice count?

## leadsheet

The Lead Sheet view is really two editors behind one toggle. One is a hand-built SVG chord chart (LeadSheetChartView, about 950 lines in LeadSheetView.tsx). The other is a melody lead sheet built on the Score engine (LeadSheetScoreView). Around them sit Send to Set List and the save-time update prompt, a print stylesheet, and two MusicXML exporters. The child components are well memoised. Even so, the chart re-renders its whole tree about 30 times a second during playback, and melody mode inherits the Score editor's 30 Hz re-render. The most serious problems are about data and correctness:

- **Saving:** a cloud save drops the whole lead sheet. A browser refresh drops the roadmap, the layout and the time signature.
- **Keyboard:** the global DAW shortcuts delete, nudge and paste hidden timeline clips while you edit the chart.
- **Bar numbering:** multi-bar rests (in 203 library songs) shift every later bar index, so the chart and its edits land on the wrong bars.
- **4/4 assumptions:** bar insert/delete, MusicXML export and set-list durations assume 4/4.
- **Paste:** paste and clear rewrite every chord in the song, not just the selection.
- **Printing:** the print CSS leaks across the app, so set-list printouts come out blank.
- **Set lists:** the set-list update prompt can overwrite a gig chart with an empty one.

On the UX side, the toolbar overflows at laptop widths, acts on a hidden stale bar, and carries recording controls. 9 of the 14 palette cells do nothing on the chart. Chord typing is not validated. The melody track cannot be chosen.

**Strengths to keep**

- Clear comments explain the musical decisions in the code: barline naming, metre-aware beats, and why a set-list send is a copy and not a link. That makes the intent easy to audit.
- LeadSheetStaff, LeadSheetMeasure and ChordSymbol are memoised and the parent's callbacks are mostly stable. During playback, only the system that holds the playhead re-renders below the parent.
- The selection, clipboard, set-list conversion and melody-picking helpers are pure functions with their own unit tests (**tests** folder).
- The roadmap helpers (roadmap.ts) and the click-modifier logic (scoreSelection.applyClick) are shared with the Score instead of being duplicated.
- Melody mode reuses the Score engine, so there is one editor for ties and accidentals instead of a second renderer.
- Sending to a set list makes a copy, and later changes need explicit consent. That is the right model for a chart on a music stand. The dialog explains it in plain language and only mounts when it is open.
- Undo snapshots already cover lead-sheet sections, repeats, row sizes and fermatas.
- ScoreMusicXmlExport writes note children in schema order and handles voices with backup, ties, tuplets and articulations.
- The print CSS forces black ink, hides the playhead, and scales chart rows down to the page through their viewBox.
- formatChordRegion copes with a stale degreeKey after a rename and caches its results.

**Proposal**

Treat the lead sheet as one document with one command layer and two renderers.

1. **Data.** Create a single leadSheet object: chords including degreeKey, sections, repeats, system breaks, multi-bar rests, fermatas, jump and text marks, slash notes, metre, chord format and melody track. Save it in the local autosave and in the cloud project, and sync it over Yjs. Always address bars by their real index, with one selector that maps them to visual slots. That fixes saving, refresh, collaboration, rests and the set-list update prompt together.

2. **Commands.** Build a useLeadSheetCommands hook shared by chart mode, melody mode and the Score. It owns:

   - the selection target
   - palette dispatch for all 14 cells
   - a metre-aware add/delete bar that also moves the roadmap and the melody
   - paste limited to the target span
   - chord entry through readChordInput, with space to move to the next beat
   - view-scoped shortcuts that the global hook defers to through defaultPrevented

3. **Rendering and performance.** No editor component subscribes to position. Each view gets one transiently subscribed playhead that uses the staff's own layout function. Palettes and editor bars are memoised. Each bar receives only its own selection. Drag state lives in refs.

4. **Outputs.**

   - One print path: clear the selection, add a page root, hide the chrome, let the user choose the paper size, and scope the CSS to a body class added on beforeprint.
   - One exporter: buildScoreXml with a slash or melody part.
   - A set-list update that shows what will change and refuses empty charts.

5. **Layout in the landing look.**
   - A slim top bar (chord format, Melody track picker, Add bar, Roadmap popover) with a white-pill Export menu (PDF, MusicXML, Send to set list).
   - The MuseScore-style palette becomes an optional drawer.
   - iReal Pro-style four-bar rows with readable bar numbers and a real time signature.
   - Chord symbols tinted with their function colour, so colour carries musical meaning.
   - Selecting a beat offers diatonic quick-pick chips, as in Hookpad.

Of the DAWs named, only Logic pairs a chord track with a score editor. BandLab, Soundtrap, Soundation, Audiotool, openDAW, Suno and Ableton have no editable lead sheet. A reliable chart editor with MuseScore or iReal Pro-grade chord entry would be a Music Atlas differentiator, not catch-up.

**Open questions**

- Can chords and lead-sheet marks go into the cloud project schema now? If not, should we ship a stopgap (stored in a track settings blob) plus a visible 'only saved on this device' warning?
- Should the chord chart move onto the Score engine (a slash part with chord symbols) so there is a single notation editor, or stay a lightweight SVG chart that shares the Score's commands?
- Which paper size do your schools and teachers print on: Letter, A4, or both?
- Should bar numbers count real bars through multi-bar rests, as MuseScore does?
- Should opening the lead sheet ever auto-fill the composer? In a collaboration session, whose name should win?
- Is chord-record mode (Replace / Locked / Merge) meant to protect lead-sheet edits too, or only incoming recordings?
- In notation views, should Escape only clear the selection, or also stop playback as it does in the arrange view?
- With nothing selected, should '+ Measure' add a bar at the end? And should a chart be allowed to end in empty bars?

## live-input

Live-input instrument views shown in the ChannelStrip CONTROLS tab through TrackControlsPanel, which keys them by track.id: VocalView (vocal-fx), GuitarBassView (guitar-fx/bass-fx with NAM amps), SamplerChopsView + SamplerWaveform (Chops sampler), TunerDisplay/useTuner, PitchMeter/usePitchInfo, NamModelBrowser and AudioMidiSourcePanel (guitar to MIDI).

The main problem is architectural. VocalView and GuitarBassView keep the pedal chain in local React state, and they are the only code in src/daw that pushes chains, NAM models and the input device into the audio adapters. The saved guitarChain/vocalChain data is never applied by the engine, and audioInputChannel is never persisted. The result after every kind of reload (refresh, cloud open, SPA return, collab join):

- the tone and the live input are silently missing;
- an armed track records from the system default mic;
- undo and collaborator edits to pedals never reach the UI or the sound;
- the views' engine effects don't re-run once the engine becomes ready, which happens after the views mount on reload.

Performance:

- VocalView re-renders its whole 2,445-line tree about 20 times a second whenever a Pitch Correction block exists, because usePitchInfo is called at the top level and gets a new object every poll.
- GuitarBassView disconnects and reconnects the whole pedal graph on every knob pointermove, with two renders per tick plus a store/Yjs write.
- The tuner opens a second mic stream (with browser voice processing on, mixing all channels) and runs a roughly 3.6M multiply-add YIN pass every animation frame, with four setStates per frame.

UX:

- Picking a device switches monitoring on, with no headphone or latency guidance, so feedback is likely.
- Permission, blocked and disconnected states are invisible, and a dead input cannot be revived by re-selecting it.
- The 'Smooth' control is inverted.
- PitchMeter cents are measured against the wrong note.
- Pitch Correction root/scale edits silently re-key the whole project.
- The chain row's centred overflow makes the first pedals unreachable.
- Choosing a NAM amp gives no loading or error feedback.
- AudioMidiSourcePanel's warning is always shown.

Visual: decorative rainbow pedal colours and gem hues, 73 uses of 7–10px text, about 160 inline style objects in the two big views, and almost no ARIA.

SamplerChopsView/SamplerWaveform are the healthiest pieces (commit on release, lock-aware load, honest 'couldn't be restored' state), but they spin forever when a rehydrate fails. NamModelBrowser is dead code. A whitespace-insensitive diff leaves about 1,100 of GuitarBassView's 1,552 lines identical in VocalView.

**Strengths to keep**

- Input level meters write to the DOM through refs at about 15 fps instead of calling setState every frame (VocalView.tsx:635-654, GuitarBassView.tsx:577-596). Keep this pattern for any meter.
- VocalView already uses a fast path that updates parameters without rewiring (adapter.updateChainParams → GuitarPedalChain.updateProcessorParams, VocalView.tsx:547-563, GuitarPedalChain.ts:202-213). GuitarBassView should use it too.
- SamplerWaveform previews trim drags locally and commits one store write on release, with a devicePixelRatio-aware canvas sized by ResizeObserver (SamplerWaveform.tsx:4-7, 40-49, 145-152).
- SamplerChopsView's load flow is careful. It checks whether the lock-guarded store write took and frees orphan buffers, frees replaced buffers, uploads user samples eagerly with a retry on save, and shows an honest 'couldn't be restored' state plus a demo-sample call to action (SamplerChopsView.tsx:142-167, 266-273, 401-464).
- Chops state is owned by the engine (applySamplerState at instrument init and in the track-sync loop of usePlaybackEngine), so the sampler survives reload, undo and collab. This is the model to copy for guitar and vocal chains.
- Spelling follows the project key everywhere (midiNameInKey + displayAccidentals in useTuner, PitchMeter, sampler root labels and the PC keyboard). The pitch-correction controls use Music Atlas key and mode-family colours, which is on-brand colour with musical meaning.
- TunerDisplay is memoised, so its high-rate state stays out of the parent views. It already supports an externalAnalyser mode, which Learn's GuitarInputSetup uses (GuitarInputSetup.tsx:761).
- The guitar rig matches a real rig: the amp is pinned at the end of the chain and new pedals are inserted before it (GuitarBassView.tsx:624-645, 1218-1268).
- useGuitarMidiDetection taps the adapter's clean pre-amp node instead of opening a second getUserMedia stream. AudioMidiSourcePanel hides itself when there is no source, forces mono for bass and has honest latency tooltips.
- TrackControlsPanel keys the views by track.id (TrackControlsPanel.tsx:79), so local chain state never leaks between two vocal or guitar tracks.

**Proposal**

1. Make the store the single source of truth for live-input tone, as Organ and Chops already are. Add applyPedalChain and restoreNamModel to usePlaybackEngine's instrument-init .then and to the in-place track-sync loop: try the parameter-only fast path first, fall back to a full sync, and keep a module-level cache of parsed .nam models. Persist audioInputChannel, monitoring/arm and the guitar-to-MIDI binding as per-user-local state: write them in serializeSession and preserve them in the collab merge. Give adapters a subscribable connection status (connected / blocked / busy / disconnected) and clear deviceId on failure. This fixes reload types a–e, undo, collab overwrite and locks in one move, and the views stop owning the engine.

2. Split the two big views into shared, re-render-scoped parts:

- pedals/catalog: one set of definitions and icons.
- LiveInputSection: a status card reading 'Scarlett 2i2 · Input 2 · Mono — Connected' or 'Blocked/Disconnected — Fix/Reconnect', with a Monitor toggle and headphone prompt, a latency readout in ms, a dBFS peak/RMS meter with clip latch, channel options from the probed count, and a tuner fed by the adapter's post-channel analyser with YIN throttled or moved to a worklet. Reuse Learn's GuitarInputSetup/TroubleshootList pieces so /learn and /studio teach the same setup.
- Pedalboard: memoised tiles and slots, 'safe center' scrolling, keyboard reorder, and '+' opening an add-effect popover that replaces the two permanent catalog columns and frees about 280px.
- PedalControls: knobs that preview on the engine during a drag and commit once per gesture through a new RotaryKnob onChangeEnd, for one undo step and one Yjs update.
- PitchCorrectionPanel: non-modal, one Root/Scale control with a 'Follow project key' toggle, 'Retune speed (ms)' instead of the inverted 'Smooth', and a PitchMeter that owns its push-based subscription and measures cents against the target note.

Add student presets in the style of BandLab and Soundtrap (Vocal: Natural / Pop / Auto-pitch; Guitar: Clean / Crunch / Lead; Bass: Clean / Drive) so the empty chain has a one-click start. Logic's Pedalboard and Ableton's In/Auto/Off monitoring with a visible latency figure are the reference behaviours to match.

3. Visual pass to the landing look: neutral tiles (white/6 surface, white/8 hairline, white/55 icons), a white pill for primary actions, colour only for the enabled LED, clipping/warnings and key colours, gem hues reduced to small swatches, no text under 11px, accessible primitives (Radix menus, role=switch, a keyboard knob), and the missing tokens added to daw.css.

4. Sampler: expose load status (failed/retry) from AudioBufferStore, add editable Start/Length, set the cursor from a hit-test, and size the canvas only on resize.

5. Delete NamModelBrowser unless custom .nam support is wanted. If it is, build it into the amp list with asset persistence.

Order of work: 1 (critical correctness) → the usePitchInfo scoping and the GuitarBassView fast path (quick performance wins) → 2 → 3.

**Open questions**

- Should Pitch Correction follow the project key (with an explicit 'Follow project key' toggle), or should changing its root/scale really re-key the whole project as it does today?
- Is the per-pedal rainbow plus the gemstone amp colours a deliberate brand exception, or should pedals go neutral, with colour reserved for key colours and status as in the landing look?
- Should input channel, monitoring, record-arm and the guitar-to-MIDI binding persist per user across refreshes and cloud opens, the same way the input device already persists in localStorage?
- Should monitoring default to off with a headphone prompt, and should the DAW reuse Learn's GuitarInputSetup flow (permission states, latency calibration, troubleshooting) for guitar, bass and vocal tracks?
- renderProject currently exports guitar, bass and vocal tracks dry (a documented gap). Do students need exports to match what they hear, amp/NAM/pedals included?
- Do we want custom .nam uploads (NamModelBrowser exists but is unused)? If so, where should user models live so they survive reload and collab: assets or IndexedDB?
- Should modulation and time pedals be allowed after the amp (effects-loop placement), or is 'all pedals before the amp' an intentional simplification for students?
- Are the gemstone amp names final, given that real amp names appear to be avoided on purpose? Would a short tone descriptor ('Clean · bright', 'Crunch · British') be acceptable under that rule?

## pianoroll

The slice has three parts: the piano roll (PianoRoll.tsx, 1,911 lines, a canvas editor used in three places: PianoRollModal, the ChannelStrip PIANO ROLL dock tab and KeyboardView), the read-only notation view (StudioNotationView) and the Vocal Pitch Editor stack (PitchEditorModal, PitchEditor, PitchAnalyzer, PitchRenderer). The piano roll has good foundations. It keeps the playhead's position updates inside a tiny child component, shares its ruler and loop gestures with the timeline, spells notes in the project key, plays each note as you draw or move it, and can send selected notes to Insight. Its main problems are serious, though.
(1) The editor's origin is ambiguous. The dock and KeyboardView pass the clip's song position where a clip-relative origin is expected. As a result, any clip that does not start at bar 1 shows no notes there, and new notes are written at the wrong time. The modal's min(clip.startTick, firstNote) does the same thing to empty clips.
(2) Keys pressed in the editor fall through to the global handler. Arrow keys move the clip, Cmd+C/V/D copy or duplicate the whole clip, and Backspace in the dock deletes it.
(3) Every drag frame writes to the global store. That re-renders the whole DAW root, runs JSON.stringify over all tracks for undo and sends a Yjs update to collaborators.
(4) The canvases are sized to the whole clip rather than the screen and are fully repainted each time (up to about 0.9 GB of canvas memory at maximum zoom).
(5) Note edits made during playback are not heard until Stop and Play.
(6) A velocity drag gets stuck when the mouse is released outside the lane.
(7) Selection is stored as array positions, so after an undo or a clip switch it points at the wrong notes.
UX gaps: three editor hosts that behave differently; a modal that hides the transport; a cramped dock (about one octave visible); no playhead follow; no triplets; Quantize applies to all notes; drums shown on a 73-row grid; mouse-only input; and no keyboard way to edit notes.
The Vocal Pitch Editor can never be opened (nothing sets editingAudioClipId) but still ships, re-renders and has latent bugs. PitchAnalyzer is still used by UNISON analysis and freezes the UI for seconds after a recording, because its O(W²) YIN runs on the main thread.

**Strengths to keep**

- Playhead is its own component subscribed to `position` (PianoRoll.tsx:136-181), so the ~30 fps transport updates only move a 2px div via transform. This is the pattern other surfaces should copy.
- Wheel zoom uses a non-passive addEventListener (PianoRoll.tsx:1402) with cursor-anchored maths for both axes (1356-1399), so zoom gestures don't also scroll or zoom the page (unlike PitchEditor's React onWheel).
- Ruler gestures and loop drawing are shared with the Timeline through rulerLoop.ts: click to seek, draw/move/resize the loop, drag vertically to zoom. Behaviour is consistent, Logic-style.
- Notes play as you edit them: on draw (1066), on select (1042-1045), on a key-column click (469) and on every pitch change while dragging (1246-1249). This is good, low-latency musical feedback for students.
- Note names are spelled in the project key (midiNameInKey/noteNameInKey + displayAccidentals), drum tracks get pad labels, and the key column highlights and selects whole rows (405-411, 441-472).
- The notation toggle uses proper radiogroup semantics (RollViewToggle), is remembered per device (viewPreference.ts), and hides the roll instead of unmounting it so canvases and scroll survive (PianoRoll.tsx:1726-1749). The staff is spelled in the project key, uses song bar numbers and a percussion staff for drums.
- The editor-scoped loop never overwrites the project loop (PianoRollModal.tsx:23-31 with getPlaybackLoop).
- 'Analyze N notes in Insight' (PianoRollModal.tsx:50-78) turns a note selection into theory analysis. It is a distinctive, on-mission feature worth keeping in any redesign.
- Group moves record each note's position at grab time and keep the whole selection within valid bounds (1097-1106, 1225-1244).
- Lane shading is shared with Learn's piano roll (pianoRollLanes.ts), giving one neutral grey visual language across the platform; canvases are DPR-aware and only reallocate when their size changes.

**Proposal**

Replace the three piano-roll hosts (the PianoRollModal dialog, the ChannelStrip PIANO ROLL tab and KeyboardView's roll) with one Clip Editor docked at the bottom. That is how BandLab, Soundtrap, Soundation, Audiotool and openDAW work, and it matches Ableton's Clip View and Logic's editor pane. It would be resizable by drag and have a Maximize toggle that covers the arrangement but keeps the TransportBar visible. It opens by double-click, Enter on a selected clip, or an 'Edit notes' button, uses one loop rule everywhere (an explicit 'Loop this clip' toggle) and shows an empty-state hint. Lessons would target it instead of the dock tab.

Phase 0 (S, bug fixes):

- Fix the origin: the editor takes {trackId, clipId}, uses clip-relative origin 0 and computes song time internally (pianoroll-01/02).
- Fix the stuck velocity drag (pianoroll-07).
- Give the editor its own keymap so keys stop reaching the timeline (pianoroll-03).
- Compare chord colours in song ticks (pianoroll-09).
- Ignore right-clicks when drawing.
- Delete the unreachable PitchEditor, PitchEditorModal and PitchRenderer (pianoroll-21).

Phase 1 (M, responsiveness):

- Keep each gesture as a local draft drawn in rAF and commit once on pointer-up (pianoroll-04).
- Re-schedule only the edited clip while playing (pianoroll-06).
- Select only the clip from the store instead of the whole tracks array.
- Give notes stable ids and select by id (pianoroll-08).
- Move PitchAnalyzer into a Worker (pianoroll-20).

Phase 2 (L, editor core):

- Viewport-sized layered canvases: a cached grid layer, a culled notes layer and an overlay for the marquee and playhead. Redraw on a dirty flag, add a ResizeObserver, and use a single scroll source with sticky keys and ruler (pianoroll-05).
- Pointer Events with capture for touch and pen (pianoroll-23).
- Song-time grid and bar numbers (pianoroll-10).
- Per-clip view state (pianoroll-15).
- Note tools: the pencil can move and resize, click-drag sets length, Shift-click toggles, quantize applies to the selection with strength, triplet grids, snap bypass (pianoroll-12/13).
- Follow-playhead and visible zoom controls (pianoroll-14).
- A drum fold view with one lane per pad (pianoroll-16).
- A dynamic pitch range (pianoroll-17).
- Collab lock UI (pianoroll-18).
- Keyboard note cursor and ARIA (pianoroll-22).
- Optional tint on the key's root/scale lanes. pianoRollLaneBackground already accepts keyRoot/keyColor but isn't given them; this is colour with musical meaning, which fits the brand.

Visuals: shared editor primitives built on appTheme tokens, at least 12 px text, 24-32 px targets, a white pill for the primary action, teal only for selection and loop, chord colours on notes in Prism mode, and no blurred overlay. Keep the strengths: the isolated Playhead, ruler gestures shared with the timeline, note audition, key-aware spelling, the notation toggle and Analyze in Insight.

**Open questions**

- Should the full editor become a docked, resizable bottom panel with a Maximize toggle, replacing the modal, the PIANO ROLL dock tab and KeyboardView's roll? Lessons currently target the dock tab ('chanstrip-tab-piano-roll', with the clearClipSelection precondition in tutorials.ts), so they would need retargeting.
- Is vocal pitch correction on the roadmap? If not, can PitchEditorModal, PitchEditor and PitchRenderer (~1,350 lines) plus the pitchData slice be deleted now, keeping PitchAnalyzer for UNISON?
- Should the piano roll's loop stay a private editor loop that is discarded on close (modal today), or should it edit the project loop (dock today)? Or should it be an explicit 'Loop this clip' toggle?
- Are touch devices (school iPads, touch Chromebooks) in scope for Studio note editing? That decides whether Pointer Events and touch gestures are a priority.
- Should per-clip zoom, scroll and grid be remembered only for the session, or saved with the project so a teacher reopening a student project sees the same view?
- Should the notation toggle inside the piano roll become editable (at least click-to-select), or link to the Score view for editing?
- In collab, is it intended that a track becomes read-only for everyone as soon as one person selects it? Would edit locks per clip with a visible owner be preferable for classroom jams?
- Should Prism chord colouring of notes be the default in the editor, given the brand rule that colour carries musical meaning? Should the project key's root and scale lanes be tinted?

## practice-tutorial

The Practice Track screen and the Studio lesson system are thoughtfully authored. The Practice view gets the music right: cycle-cut chart, voicings, slash-chord bass, chord tones numbered against the voicing. The lessons are data-driven, with checks that don't care which control changed the state. The surrounding plumbing is fragile. (1) Performance: PracticeTrackView subscribes to the playhead at top level, so the whole screen and an unmemoized PianoKeyboard re-render about 30 times a second, though the highlight only changes at chord boundaries. The lesson overlay polls the DOM every frame, polls again every 150 ms, and runs an endless full-viewport box-shadow animation. (2) Reload: neither practiceSession nor the running lesson is persisted. Both disappear on refresh. Both also survive SPA navigation into unrelated projects, because no boot path clears them. The new ?tutorial= launch wipes unsaved work before it even checks the lesson id. (3) Lesson flow: three intro steps are satisfied by their own precondition and skip themselves after 300 ms. Back bounces forward. Some steps look already done after the Jazz preset. Undo or a collab sync can complete identity-based steps. Classroom completion can be reported for the wrong activity. (4) UX and brand: the practice keyboard is clickable, but a click plays a different piano and is never recorded, and the screen shows no MIDI status. The phone layout shrinks labels to 5–8 px. Teal-filled primary buttons, white-on-teal (1.8:1) Next, and silent coach cards depart from the white-pill Music Atlas look and its accessibility baseline.

**Strengths to keep**

- ScaleKeyboard's label layout puts black-key labels in an upper band and white-key labels in a lower band, so adjacent F♯/G labels never collide. The keyboard is scaled with a transform, so it keeps its proportions, and useFitScale settles in one or two passes thanks to a SETTLED_PX dead-band instead of hunting (ScaleKeyboard.tsx:42-57, 366-418).
- PracticeTrackView's music model is careful. The chart is cut to the progression cycle and the playhead wraps inside it. Slash-chord bass notes are lit from the section's bass floor. Chord tones are numbered against the voicing (the Pop L1 power-chord case). The keyboard window stays put across views and only grows a fourth octave when a voicing needs it (PracticeTrackView.tsx:183-288).
- A one-purpose practice screen shares the project and transport with the full Studio. 'Take it to the Studio' is one click, and the TransportBar adds a Practice tab to get back (TransportBar.tsx:46-53).
- Label toggles and the chosen chord voicing persist across tracks via useSettingsStore (ScaleKeyboard.tsx:106-109; PracticeTrackView.tsx:198-215).
- The tutorial engine is content-agnostic (tutorialSlice holds only id/step/status). Steps are declarative, with requires/check/synthCheck, and detection doesn't care which control produced the state change. Armed snapshots allow 'make a change' checks, and pre-satisfied steps advance quietly without confetti, a good idea that is misapplied only to the intro steps.
- Target fallback lists let the spotlight follow from a button into the modal card it opens (targetRect.ts:16-29; e.g. ['add-track-synth','add-track-button']), and CoachCard places itself in the larger free gap away from the target.
- Confetti has no dependencies, is DPR-aware and cancels its rAF on unmount. Lesson completion is persisted to drive Completed badges on /studio/production.
- The ?tutorial= launch follows the existing boot-intent pattern, strips the query, and the MSP launch params are stashed before the query is cleared, because the child effect runs first.

**Proposal**

PRACTICE. (1) Split PracticeTrackView along its data. A position-free usePracticeModel(session) returns scales, cycle, voicings and keyboard window. A useCurrentChordIndex(cycle) selector returns a number that changes only at chord boundaries. These feed memoized PracticeKeyboard, PracticeChart (index-driven, with a 'cued' style when paused) and PracticeTransport (subscribes only to isPlaying, isRecording, isCountingIn, loopEnabled and bpm). The goal is zero React renders between chord boundaries during playback. (2) Input parity: route on-screen key presses and a QWERTY map into hwNoteOn/hwNoteOff and the recorder, so clicks sound through the student's track and are captured. Show a MIDI status chip with a 'No MIDI? Use your computer keyboard' fallback. (3) Persistence: store practiceSession, the student track id and the view/scale choice with the autosave, and restore them on refresh. Clear them, along with currentView, in every non-practice load. Call resetUndoHistory() after seeding, and scope global shortcuts to Space/R/L/Esc in practice. (4) Layout and look: a header with a ghost 'Back', the task as the title and a quiet 'Open in Studio'. One white-pill Play, red-outline Record via the token, and Loop/Tempo as ghost controls. Put the chart directly above the keyboard with a ghosted next-chord preview (a common play-along pattern). Labels render at ≥12 px outside the transform, and phones get a 2-octave window. On wide screens, prompts become a collapsible side card. Teal is reserved for lit keys and the current chord. TUTORIAL. (1) Engine: tutorialSlice gains a phase (intro, waiting, done, review), a per-step minDwellMs, and a persisted {id, stepIndex} resume record. Every non-tutorial boot calls quitTutorial. The ?tutorial= launch validates the id first and confirms with unsavedStudioSession(). (2) Detection: steps declare `select` plus `isDone(value, armedValue)`, subscribed through subscribeWithSelector with an equalityFn. Comparing values, not references, stops undo and collab false-positives and playhead-tick evaluation. Back enters review mode, and validated steps get 'Skip step' after ~20 s, with feedback when the state is already met. (3) Overlay: one useTutorialTarget hook (MutationObserver + ResizeObserver + scroll, rAF bursts only while things move) shared by Spotlight and CoachCard. The dim becomes a static mask whose hole is the union of the target and any open popovers, with a compositor-only ring animation that honours reduced motion. Portal into an overlay host inside .daw-root, and add a 'Show me' button that re-applies requires and scrolls. (4) CoachCard: dock it bottom-left, or in a right rail like Ableton Live's docked Help View lessons, with an optional drag handle, constraints and a per-step reset. White-pill Next, role=dialog and an aria-live status, a ≥32 px Quit with confirm, and a completion card offering Save / Next lesson / Back to lessons. (5) Classroom: report MSP completion only when the stashed launch is module 'studio' and matches this tutorial, then clear the stash. Split a tutorialCatalog for the dashboard.

**Open questions**

- Should a refresh mid-lesson resume at the same step with the work kept (persist the lesson id and step with the autosave), or is restarting acceptable?
- When a student starts a lesson with unsaved Studio work, should we prompt (as the Song page does), or run lessons in a separate scratch session that never touches the autosave slot?
- If a student leaves the editor mid-lesson, should returning to /studio/editor resume the lesson, and should opening any other project end it?
- Should students without a MIDI keyboard (iPads/Safari, school Chromebooks) be able to play and record takes on the Practice screen with on-screen keys or the computer keyboard? If so, should clicks sound through the student's track instrument?
- Should the practice screen survive a browser refresh? For genre tracks this means persisting the hand-off data (scales, prompts, voicings, returnTo) with the project.
- Is the DAW teal meant to stay the primary-action colour in Practice and the coach card, or should those move to the white pill, keeping teal only for musical data (lit keys, current chord)?
- Should the coach card float and be draggable, or dock in a fixed rail (bottom-left or right side) so it never covers the work area?
- Were the 'Meet Prism', 'step sequencer' and 'Meet the Oracle Synth' steps meant to be read-and-Next orientation steps? Should 'drag Swing past N' steps accept a value that the genre preset already set?
- What activityRef format do classroom slides use for Studio lessons, so completion reporting can be matched to the exact tutorial id?

## prism-engine

The Prism engine (27 files, about 212 KB of source) is pure and cheap, and it does not cause editor lag. Create builds at most a few hundred MIDI events, a suggestion walk is typically about 20 graph steps, and nothing in the engine runs per frame. Its real problems are correctness bugs that students see directly.

(1) Prism Suggest Chords reads abbreviated display labels ('1 maj', '5 dom7'), so it classes every real project's style as 'extended'. The badge always says 'Style: Mixed' and slash chords win (C, F/C, C, F/C).
(2) Suggestions ignore the mode. Aeolian, Dorian and other modal projects get parallel-major progressions (A minor gives A, Bm, C#m, D), including in the EDM lesson, which sets Aeolian.
(3) Cloud saves drop the mode, and no save keeps strum/tilt or the progression being built.
(4) Create mislabels the repeated bars of 2- and 3-chord loops and silently drops chords past the 7th.
(5) Genre strum presets are off by one against the StrumMode enum.
(6) Swing does nothing on 7 of 41 rhythms, including the default 'Whole Notes'. A lesson step asks students to use it anyway.

On performance: replace the per-click module Worker with a synchronous call, remove about 90 KB of unreachable orchestration code and data from the DAW chunk, and precompute chord signatures. None of the generation or suggestion code has unit tests.

**Strengths to keep**

- The engine is pure and stateless (no React, store or DOM imports). It behaves identically after a refresh, a cloud open, a view switch, an SPA return or a collab join; only its inputs need persisting.
- Each interaction does very little work: Create builds at most about 400 events, a suggestion walk is about 20 graph steps, and nothing in the engine runs per frame. Optimisation effort is better spent elsewhere in the editor.
- Note spelling is centralised in notes.ts, cached per key and mode (keySpellingCache) and unit-tested (G-minor flats, leading-diminished respelling). Names are stored in ASCII and converted with displayAccidentals at render, which keeps persistence clean.
- The colour system matches the Music Atlas rule that colour carries musical meaning: chord colours rotate around the circle of fifths and remap for diatonic modes. resolveDegreeKey is shared by live chord colour and prismSlice, so the two cannot drift apart.
- PROGRESSION_GRAPH has an integrity test, and I separately confirmed that every quality used by its 84 chords exists in CHORDS. That makes it a solid teaching asset.
- naming.ts already provides getModeOffset, ionianToModeLabel and modeToIonianLabel, so the mode bug in suggestions is a few-line fix that reuses existing, proven helpers.

**Proposal**

Fix the engine at its seams rather than re-architecting it. It is pure, cheap and well-spelled; the bugs come from string labels and mismatched reference frames.

(1) Give every chord one canonical identity, {rootPc, quality as a CHORDS key, degreeKey relative to the tonic}, carried by ChordRegion and SuggestionChord. Derive every label from it at render time through lib/chordNotation, and delete the label re-parsing in analyzeChordStyle, extractGraphSeed and UNABBREV. This fixes prism-engine-01 and -10.
(2) Add one small helper for the key's reference frame (parentRoot, toGraph(label), fromGraph(label)), built on getModeOffset, modeToIonianLabel and ionianToModeLabel, and use it in both prismSlice and the suggestion engine (fixes -02).
(3) Make generateChordMidi return {events, spans}, derive chord regions from the spans, and enforce or explain the 7-chord limit (-04).
(4) Run Create synchronously, since it is pure and takes under 1 ms, show immediate feedback, and delete midiWorker.ts (-06).
(5) Make the musical presets correct: position-based swing with an isSwingable-driven Swing control, enum-correct GENRE_STRUM, and real Synchronized and Balanced modes (-07, -08).
(6) Make suggestions truthful: rank by weighted graph data or rename the strategies, make Re-roll re-randomise, use history up to 5 chords deep, and trim rather than delete overlapping regions on commit (-05, -09).
(7) Split the barrel so @prism/engine is the theory core only. Move orchestrator and band data behind a dynamic import, or delete them along with modeUtils, padGenerator and the unused exports (-11, -12).
(8) Persist mode, strum/tilt and the in-progress progression in both local and cloud saves, sync strum/tilt in Yjs, and reset the suggestion state on project load (-03, -13).
(9) Add unit tests for suggestionEngine (with every label source, Ionian and Aeolian), swingRhythm on every rhythm, distributeChords and derived regions for 1-8 chords, and the GENRE_STRUM to StrumMode mapping; none exist today.

All of this keeps the Music Atlas look intact: chord colour stays reserved for musical meaning, and labels become consistent across the ruler, the pills and the lead sheet.

**Open questions**

- In minor and modal keys, should Prism suggestions stay diatonic to the mode (the parent-major graph voiced from the parent root, as the Prism palette does), or should the graph get dedicated minor-key data (for example harmonic-minor V and vii°)?
- Is 'full band' Create (procedural drums, bass, pad and melody via orchestrate) on the roadmap? If not, about 90 KB of unreachable code and data can be deleted. If it is, the wrong-note and fallback bugs in prism-engine-12 must be fixed first.
- Should Commit in 'Prism — Suggest Chords' also write MIDI notes to the track the student right-clicked? Today it only adds chord-lane labels, so nothing becomes audible.
- Should the 'Most Common' ranking be backed by real frequency data (for example from the Music Atlas song library), or should the five strategies be renamed to describe what they actually do?
- Should cloud projects store the mode, chord regions, strum/tilt and the progression being built? Local saves already keep mode and chord regions; cloud saves keep neither.
- What is the intended maximum progression length for Create: a visible cap of 7 chords, or should Create grow past 4 bars?

## prism-ui

Prism is the harmony workshop in the Music Atlas editor. It has two surfaces. The first is a bottom-dock tab (PrismPanel → PrismStudio: Key circle, chord grid, colour spectrum, Rhythm & Expression, Style, Create). The second is a timeline right-click 'Prism — Suggest Chords' modal. Behind them sit prismSlice (2,106 lines) and prismSuggestionSlice. prismSlice holds key/mode, the Prism builder, the project chord lane, lead-sheet layout, global track selection, and about 1,200 lines of chord-detection algorithms.

**Performance** is mostly fine. No Prism component subscribes to the 30 Hz playback position. The real costs are two:

- PrismStudio subscribes to the whole tracks array.
- Every key or mode change rewrites every track object.

**Correctness and reload problems are the serious ones:**

- Create silently deletes the selected track's clips and the whole chord lane.
- The builder's 'Clear' also deletes the chord lane and lead-sheet layout. Undo cannot bring back the multi-bar rests.
- The suggestion modal's hotkeys also fire the global shortcuts: R starts recording, the arrow keys move the selected clip, Space plays the song.
- The root lock survives project loads. It blocks the lessons' 'Click G' step, and songs and practice tracks open with no key.
- Chord-region ids come from a per-tab counter, so they collide after a refresh and between collaborators.
- Opening a cloud project drops the mode. A refresh drops the builder progression, strum/tilt, lead-sheet layout, track selection and key colour.
- Committing a suggestion deletes chords that straddle the inserted bars, and assumes 4/4.

**UX:**

- The five fixed-width cards don't fit the 33vh dock: controls are clipped and scroll areas are nested.
- Controls are duplicated (two Undos, two Clears with different meanings, two sequence views, a doubled heading).
- No chord sounds before Create.
- The spectrum adds a random chord from the clicked colour, and ignores the mode limit (in 28 non-diatonic modes it adds major-scale chords on the tonic).
- Re-roll appears to do nothing.
- Commit only adds chord symbols, even though the menu is opened from a track.

**Visuals:** hard-coded greys, teal used for buttons and selected states, white-on-teal at about 1.8:1, and 7–11px text, all off the Music Atlas look.

Keyboard-accessible versions of the circle (CircleOfFifthsSvg) and the spectrum (the landing-page tour's HarmonySpectrum) already exist in the codebase.

**Strengths to keep**

- No Prism component subscribes to the transport `position` (Timeline/TransportBar do), so the Prism panel and the always-mounted suggestion modal stay idle during playback.
- Multi-field updates are batched into one set(): setRootNote/setMode comment 'Batch all updates into a single set() to avoid cascading re-renders' (prismSlice.ts:1430), and Create's four updates coalesce into one undo entry thanks to the 300ms undo debounce.
- Chord names are musically careful: they are spelled correctly for the key (noteNameInKey), leading diminished chords are respelled toward their resolution (respellLeadingChordRegions), and the user's chord-notation preference (useChordNotation) is respected in the builder, the sequence and the suggestion pills.
- The colour system means something musically. Modes take their parent key's colour and the non-diatonic families have fixed colours (CircleOfFifths.tsx:117-148, prismSlice.ts:177-250). This fits the brand rule that colour carries musical meaning.
- Every Prism module has a stable data-tutorial-id (prism-key, prism-chord-selection, prism-harmony, prism-create, prism-rhythm, prism-style), and 8 lessons depend on them. Preserve them in any redesign.
- The suggestion modal cleans up correctly (timers cleared, notes off, adapter disposed on close and unmount: PrismSuggestionModal.tsx:207-213, 223-240, 330-334), and its keyboard-first intent (←/→, Space, Enter, 1–9) is good once scoped.
- The pure helpers (groupChordsByColor, SPECTRUM_GRADIENT, deriveChordRegions\*) are reusable and already shared with the landing tour; the detection functions are pure and testable.
- Key, mode, genre, rhythm, swing and the chord lane already sync through Yjs for collaboration (diffEngine.ts:349-404, yjsToZustand.ts:379-387).

**Proposal**

**1. One Prism surface, one flow.** Keep Prism as the bottom-dock tab (lessons target `chanstrip-tab-prism`), but lay it out in three zones that fit roughly 250–300px:

- **Key:** the store-bound, keyboard-accessible CircleOfFifthsSvg at 160px or more, with a mode Select grouped 'Diatonic' / 'Advanced (no chord suggestions)'.
- **Progression:** one row of removable chord pills, plus a palette of colour-coded, named chord pills that play on click through auditionNote on the selected track. The spectrum becomes a legend and filter instead of a random picker.
- **Feel:** genre preset chips that say what they set, a rhythm select, and strum/tilt under 'More'.
- **Footer:** a sticky white-pill primary, 'Write 4 bars to <Track> at bar N'. It shows a pending state and an Undo toast, inserts at the playhead or loop instead of clearing the track, and changes chord symbols only over the written bars.

**2. Fold the right-click modal into the panel** as a 'Suggest' mode seeded with that bar and track:

- 'Use this' loads the progression into the builder (the existing loadProgression), then the same Write path runs.
- Preview plays through the track's own engine at the committed rhythm.
- Hotkeys are scoped with a capture-phase listener or Radix Dialog.
- Re-roll visibly changes the shown result.

This matches patterns students meet elsewhere: chord palettes that play before you commit (Scaler-style pads, the chord helpers in BandLab and Soundtrap MIDI editors), a project-level chord track that instruments follow (Logic's Chord Track with Session Players), in-place undoable generation (Ableton Live 12 generators), and Suno-style browse-and-regenerate variations.

**3. State.** Split prismSlice into:

- **harmonySlice:** rootNote, mode, chord lane and lead-sheet layout. Saved both locally and to the cloud, part of undo, UUID ids, and a single setKey(root, mode) that doesn't rewrite tracks, with the key colour derived instead of stored.
- **prismBuilderSlice:** the progression plus rhythm, genre, swing, strum and tilt, persisted with the project.
- **src/daw/harmony/:** the pure detection and reconcile code, with tests.

Also:

- Move selectedTrackId to the tracks/ui slice.
- Delete the dead actions and components.
- Reset UI-only state (rootLocked, suggestion state) on every project load.
- Derive ticks per bar from the time signature everywhere.

**4. Look and performance.**

- Build from shared DAW primitives mapped to the landing tokens: white/6 cards, white/8 hairlines, one radius scale, Glacial Indifference at 11–12px or more, white-pill primary, neutral selected states. Reserve colour for key slices and chord pills.
- Use narrow selectors and memoized cards.
- Drop the per-click Worker.
- Apply each Create in one set().
- Stop rewriting every track on key change.

**Open questions**

- Should Create insert a new clip at the playhead or loop (non-destructive), or keep replacing all of the selected track's clips? Should it ever change chord symbols outside the bars it writes?
- Should 'Prism — Suggest Chords', opened from a track, write notes onto that track, or is adding chord symbols to the chord lane the intended result? Should it be premium-gated like the Prism tab?
- Is recolouring every track with the key colour on each key change intended? If yes, should colours students picked themselves be exempt?
- Can the cloud project API and schema store prism.mode (plus the chord lane and lead-sheet layout)? Cloud opens currently drop the mode and the chords, and fixing that needs a backend change.
- Is the Prism builder's progression (chords, strum, tilt) project data that should survive a refresh or save, or scratch state that can be thrown away?
- What should the root lock mean? Today the Transport bar locks the key whenever its key popover closes. Should project loads and lessons reset it, or should the lock be removed?
- Keep Prism as a bottom-dock tab (lessons and the spotlight depend on it), or move it to the right side panel as a vertical Key → Chords → Feel → Create flow and leave the dock to the Piano Roll?
- Should Prism offer the 28 non-diatonic modes when its chord-suggestion data only covers the 7 diatonic modes?
- Which default chord labels should students see in the builder: degree codes ('1 maj', '3 dom7#5'), Roman numerals, or letter names (the chord lane shows letter names)?

## score

The Score view is a full-page VexFlow notation editor. It is made of ScoreView, the 2,442-line useScoreEditing hook (shared with Lead Sheet), NoteEditorBar, ScorePalettes, ScorePartsPanel and 10 pure helper modules, and it renders through the shared StaffView. The helpers know their music theory and are cleanly factored. The problems are in data, keyboard handling, performance and UX:
(1) Almost nothing the Score authors persists. Local autosave and cloud save both drop articulations, slurs, rhythmic slashes, pinned spellings, staff text and jumps, system and page breaks, sections, repeats and chord visibility; cloud save also drops chord symbols. Five of these fields are never reset between projects and never sync to collaborators. The fields that do sync are written as whole-array JSON (last writer wins).
(2) The DAW-wide shortcut handler runs underneath the Score's keys. Delete removes the clip still selected in CREATE, which the user can't see; ⌥R, advertised as 'Write rests', starts recording; digits 2–4 switch the arrange tool; Space plays; ←/→ nudge a clip.
(3) During playback the whole page re-renders about 30 times a second because the hook subscribes to `position`. Every edit, and every remote track change in collab, rebuilds every part and re-engraves the entire score synchronously, formatting each measure twice.
(4) Follow-playhead and page navigation never work, because StaffView is not the element that scrolls.
(5) Several editing bugs: marks are re-attached to notes by array index, so they can land on the wrong notes or instruments; the first click on a Rests or Rhythmic cell applies the old row; a 3 px wobble while clicking moves a note; pasting before a part's first clip piles the notes onto one tick; touch drags get stuck.
(6) There is no way to enter new notes.
The visual layer is dense: about 150 px of always-on chrome, 8–10 px dim text, teal pressed states, native checkboxes, and Arial inside the SVG.

**Strengths to keep**

- The pure helper modules (noteEditor, scoreEdit, scoreClipboard, scoreSelection, scoreMarks, scoreText, roadmap, chordInput, scoreChords) have no React or store coupling and are well commented, so they are easy to unit-test and reuse. scoreChords already has tests.
- Score and Lead Sheet share one editing hook, so the tools behave identically in both views and can't drift apart.
- The interaction vocabulary matches MuseScore: digits for durations, ⌥N/⌥R/⌥H for rows, ↑/↓ with Shift for octaves, Shift for range and ⌘ for toggle selection, Return for a system break. Students learn skills that carry over to real notation software.
- The music logic is correct. An accidental moves the pitch but pins the spelling, and clicking it again returns the note to the key's alteration (toggledAlteration). Ties absorb rests and same-pitch notes as sound (planTie). Each chord gets one articulation on the correct side (groupChordArticulations). Chord entry accepts many typed spellings (Δ, -, ø, °, mi, maj).
- Selection highlights and drag previews restyle the existing SVG instead of re-engraving (StaffView noteStyles/noteOffsets effects). This is the right pattern to extend to the playhead.
- The score is engraved at true page size (Letter), and the print CSS prints only the score with its title block, so what is on screen is what prints. MusicXML export includes articulations, slurs, sections and repeats.
- VexFlow and the Bravura font are already code-split behind a memoized dynamic import that waits for the font before measuring.
- In solo mode, undo snapshots cover most Score marks, and edits return new note ids so the selection survives an edit.
- Tooltips explain the musical meaning (Tie vs Slur), and chord symbols are placed above stems and ledger lines rather than colliding with them.

**Proposal**

Fix the data and keyboard layers before the pixels.

1. Persistence and collab. Give MidiNoteEvent a stable id so marks stop depending on tick and pitch. Move every Score and Lead Sheet field into one `scoreDoc` object that is:

- saved in the local autosave and in the cloud project, together with chordRegions;
- reset in one place for every load path;
- synced as per-key Y.Maps so concurrent edits merge;
- covered by both solo and collab undo.

2. Keyboard. Each view owns its keymap. Global DAW shortcuts yield in SCORE and LEAD SHEET (except ⌘S and ⌘Z). Clip selection clears on view switch. The Score gains ←/→ navigation with a visible, announced note cursor, plus an N note-input mode: letter keys A–G, MIDI step entry, and click-to-place with a ghost note. Selected and moved notes play a short audition.

3. Performance.

- Take `position` out of useScoreEditing. StaffView drives the playhead from a ref and follows the real scroll container.
- Split the 2,442-line hook into a session-only selection store shared with Lead Sheet, pure commands that apply one store transaction with an explicit old-to-new id map, a scoped keymap, and memoized overlay layers.
- In StaffView, cache each part by midiClips reference and each measure's formatting by content hash. Redraw only dirty systems, rescale by CSS transform instead of re-engraving, and render off-screen pages at idle.
- Lazy-load the Score and Lead Sheet views, and prefetch VexFlow when the user hovers the tab.

4. UX and visuals. Use one contextual toolbar row in the landing look: white/10–15 pressed states, a single white-pill Export, 12 px minimum text, and Glacial for all text including the SVG. Make palettes a collapsible drawer that acts on any selection. Add a zoom control, a Parts panel (visibility, order, clef and transposition, chords), inline chord-entry validation, and an empty state with a next step.

Benchmark this view against Logic's Score Editor and dedicated notation apps (MuseScore, Noteflight, Flat.io) for note entry, selection and palettes. The clip-based browser DAWs on the list (BandLab, Soundation, Audiotool, openDAW, Ableton) don't offer a comparable staff editor, so the Score is a real differentiator once it saves its work.

**Open questions**

- Is the Score meant to be a full notation editor where students write notes from scratch, or a view for engraving and annotating MIDI recorded elsewhere? This decides whether note input (score-11) is in scope.
- Can the cloud project schema and API take a score/harmony payload? Today cloud projects drop both chord symbols and every Score mark, and fixing that needs a backend change.
- In SCORE and LEAD SHEET, which keyboard model should win: MuseScore-style (digits for durations, arrows move between notes) or the DAW's global keys (1–4 for tools, R to record, ←/→ to nudge)? Should ⌘S and ⌘Z stay global?
- Should the composer default to the signed-in user, and who owns that field in shared classroom sessions?
- Should bass and guitar parts be written an octave up (8vb) by default, and should drums appear in printed scores by default?
- How important is iPad and touch editing for the Score (dragging, palettes, 44 px targets) compared with desktop?
- Should Score, Lead Sheet and Piano Roll share one selection and clipboard?
- US Letter is hard-coded (useScoreEditing.tsx:2379, `size: letter` in the print CSS) even though A4_PORTRAIT exists in pageLayout.ts. Do international schools need A4?
- No tutorial targets the Score view. Should one of the 8 guided lessons introduce reading and editing notation?

## shell

The editor shell works and its code is well commented. The 30 fps position readout is already split into its own small component (PositionDisplay), so the TransportBar body does not re-render during playback; the brief's 'line 107' worry is already handled.

The worst problems are trust and reload issues, not rendering speed:

- **Returning to the editor overwrites newer work.** Coming back by in-app navigation reloads an older local autosave over the live session. That autosave never held lead-sheet or score layout, so those are lost, along with the last edits and the undo history.
- **Unsaved work is discarded without asking.** Dashboard links and File actions wipe the current session with no prompt; some wipe it before checking the link is valid.
- **Save overstates what it saved.** Cloud Save says "Project saved" but drops chord symbols, lead sheet, time signature, mode and markers.
- **⌘S gives no feedback at all.**

Global keyboard shortcuts ignore which view is open and which element has focus:

- Delete in Score or Lead Sheet also deletes the clip last selected in Create.
- ⌘Z in a text field undoes a musical edit instead of the typo.
- R and ⌥R start recording without the overwrite warning the Record button shows.
- Space, Delete and Escape act on the session behind open dialogs.

Performance:

- The editor root runs the engine hooks, so the whole tree re-renders on every track edit, fader tick, mastering change and collab presence update.
- Collab presence is broadcast about 30 times a second during playback.
- Undo tracking adds more store listeners every time the student re-enters the editor.
- An animated background canvas is fully hidden yet redraws the whole viewport every frame.

Visual:

- Dialogs and popovers rendered outside the editor root lose the DAW colour tokens: the recording-limit OK button is invisible, Settings menus are see-through, and the selected time signature can't be read.
- The top bar is cramped and splits the transport in two. It shows view-specific toggles in every view and a permanent red MIDI badge.
- Export uses the retired amber/yellow, teal is used as a general highlight, and much of the text is 9–10 px.

**Strengths to keep**

- PositionDisplay (TransportBar.tsx:104-118) keeps the 30 fps position subscription out of the 1,107-line TransportBar. TransportBar is memoized and its props are stable (initEngine is a useCallback with no dependencies), so the bar itself does not re-render during playback.
- FixedDigits keeps the bar:beat:sixteenth readout from shifting sideways, since Glacial Indifference's digits differ in width.
- The boot effect is clearly documented per entry link. It removes boot parameters from the URL so a refresh doesn't re-run them, waits for auth before cloud or collab work, and rejoins a collab room after browser back/forward (DawApp.tsx:389-404).
- overscroll-behavior-x: none blocks the Mac two-finger swipe-back during a session and is restored on unmount (DawApp.tsx:450-467).
- Timeline zoom/scroll (uiSlice timelineScrollLeft) and the channel-strip tab live in the store, so they survive view switches and remounts.
- ensureProjectId's in-flight guard stops concurrent saves from creating duplicate cloud projects, and PartialUploadError gives specific messages for partially failed uploads.
- ExportAudioDialog warns about tracks that won't render fully (SoundFont, dry amp tracks), validates inclusive bar ranges with role=alert, shows 'Add a track first' for empty projects, guards against changes while busy, and falls back to WAV when Opus encoding isn't supported.
- Radix Dialog and DropdownMenu already give the File menu, ConfirmModal, Settings and Export focus trapping, Escape handling and keyboard navigation.
- The shell is collab-aware: New Project is hidden and Open disabled during a session, and only the host can rename the project (TransportBar.tsx:188-191, 384-395).
- unsavedStudioSession() (localSession.ts:62-72) is a tested guard for destructive transitions that can be reused across the Studio.
- The Record button asks before recording over an existing take (TransportBar.tsx:265-281); only the keyboard path skips it.
- Shell controls carry stable data-tutorial-id anchors (file-menu, transport-bpm, view-switch-\*, export-audio-run) that the Production lessons target. These must survive any redesign.

**Proposal**

**Target:** a full-screen editor shell in three zones that matches the landing look and never re-renders as a whole.

**1. Data safety first (about 1–2 days)**

- **Boot:** check the entry link is valid, ask with unsavedStudioSession() and ConfirmModal, then reset. Never restore the local autosave over a session that is already in memory. Show a blocking 'Opening…' state for ?project=, and an error with Retry if it fails.
- **Autosave:** subscribe only to saved fields, add a 5 s maximum wait, and flush when the page closes or the editor unmounts.
- **Persistence:** save the time signature, markers and practice/lesson context locally. Make the cloud-save toast honest until the cloud format includes chords, lead sheet, meter and mode.
- **Keyboard:** limit clip shortcuts to Create; ignore Alt, already-handled events, text fields and dialogs; send R and ⌘S through the same commands as the buttons (overwrite confirm, save status).

**2. Performance (about 2–3 days)**

- Delete MeshGradientBg.
- Move the engine, loader, monitor and collab hooks into a component that renders nothing (EngineBridge), so the editor root stops re-rendering on every edit.
- Stop undo tracking from adding new listeners on every visit.
- Fix the collab presence subscription so it uses shallow equality.
- Drop TransportBar's subscription to the whole tracks list.
- Start background loops only when their feature is in use.
- Lazy-load the Score, Lead Sheet, Master and Practice views and the dialogs.

**3. Layout and look (about 1 week)**

- Hide the app's top rail inside the editor and collapse the sidebar to a 'Back to Studio' button.
- Top bar:
  - Project: back button, Project menu, name with a save chip ('Saved · 2 min ago', 'Saving…', 'Unsaved'), Undo/Redo
  - Transport: to start, back, stop, play, record, loop, metronome, count-in, position
  - Song: tempo, meter and key as one group (Logic's control bar and BandLab's top bar both group them this way)
  - Views: Create, Master, Score, Lead Sheet as a proper tablist
  - Utilities: collab, side panel, settings
- Put snap, chord-ruler and zoom in a toolbar that only appears in Create.
- Use 12–13 px labels and targets of at least 28 px.
- Primary actions use the white pill, 'on' states a white/10 fill, and teal only marks selection and the loop region. No amber.
- Point the DAW tokens at the app's --ui-\* values and define them so dialogs rendered outside the editor inherit them. This removes four separate workarounds plus useTheme.
- Use Radix Popover for the key and meter pickers.
- Replace File ▸ Open with a Projects dialog (search, last edited, dates, rename/delete). It is now the only way to reach older projects.
- Restructure Settings into 'Audio & MIDI', 'Editor' and 'Shortcuts', remove channel configuration, and add a switch to turn off single-key shortcuts.
- Drive menus, tooltips and a '?' shortcut sheet from one command registry.

Keep every data-tutorial-id anchor (file-menu, transport-bpm, view-switch-\*, export-audio-run) stable so the Production lessons keep working.

**Open questions**

- Should the Studio editor run full-screen (hide the XP/level/coins top rail and collapse the sidebar), or must that progress display stay visible while composing?
- MeshGradientBg is currently invisible. Can it be deleted, rather than changed so it shows? Its colours conflict with the neutral landing look.
- For entry points that discard work (the Studio 'Project' tab, which opens a blank project; templates; demos; Production lessons; Recent Projects over unsaved edits): prompt every time, or keep several local drafts so nothing is ever thrown away?
- Can the cloud project format be extended now to include chord symbols, lead-sheet/score marks, mode, time signature and markers? If not, what should the save message promise students?
- Keep Space/R/M/L/1–4 as single-key shortcuts by default, with a setting to turn them off (WCAG 2.1.4)? And should ⌘+/− go back to browser zoom, with timeline zoom on ⌥ or ⌘ plus the scroll wheel?
- Is Settings ▸ Channel Configuration meant to control track input routing (it needs wiring up), or can it be removed?
- Should a collab host get a confirmation before leaving the editor, given that leaving closes the room for every participant?
- What is the smallest screen to support (for example a 1280×720 Chromebook)? That decides where the top bar collapses into an overflow menu.
- Should the position readout offer minutes:seconds as well as bars:beats for students?
- Should the developer-oriented 'Export Analysis JSON' stay in the student File menu?

## state-reload

State layer of the Studio editor: a 14-slice zustand store with subscribeWithSelector and collabMiddleware, JSON-snapshot undo, a 1.5 s localStorage autosave, two serializers (local and cloud) and the Yjs mapping. Six hand-maintained field lists decide what survives a reload: serializeSession, serializeSessionForCloud, freshProjectHarmony, resetSessionToEmpty, MARK_KEYS, and the diffEngine/yjsToZustand maps. They have drifted apart, with these results:

- Score and lead-sheet notation, time signature, mastering, markers, pitch edits, MIDI clip length and CC data, track roles and input routing are lost on refresh.
- Cloud saves also drop the chord lane and the mode.
- Every dashboard, lesson and collab entry silently wipes unsaved work and its crash copy.
- Going back into the editor overwrites the live session with the stale autosave.
- Chord-region ids collide after a reload, so edits land on the wrong chord.

Performance: undo serializes the whole project to JSON on every edit frame and leaks its subscriptions on each editor visit, the DAW root re-renders on every track or presence change, and autosave never fires while playback, recording or a collab session keeps writing to the store.

**Strengths to keep**

- Compact, versioned MIDI format: columnar, delta-encoded ticks with legacy v1 decoding (SessionSerializer.ts:114-176, 690-716).
- The settings blob only adds fields and backfills defaults (effects merged over DEFAULT_EFFECTS, ensureSamplerSampleId, normalizeSynthTrackState), so old saves keep loading.
- Careful audio durability: recordings upload as soon as recording stops, in-flight uploads are deduplicated, PartialUploadError and reconcileMissingAssets handle failures, and the user is warned honestly about clips that were not uploaded (upload-pending.ts; api.ts:262-354).
- When cloud load mints new track ids, the ducker's key-track references are remapped (SessionSerializer.ts:346-362).
- Boot intents are explicit and well commented, bootedRef makes the boot effect safe under StrictMode, and ?seeded=1 cleanly hands off a store the Song page already filled.
- seedStudioFromSong is the model seed: it sets key, mode, tempo, time signature and layout, and resets undo at the end so seeding is not an undoable edit.
- Undo availability reaches the UI through useSyncExternalStore; the stack is rebaselined after undo/redo so redo is not buried; collab uses a per-user Yjs UndoManager.
- Collab treats mute/solo/arm/monitor as per-user fields and defers remote track rebuilds while the local user is recording.
- Fine-grained selectors (useTrack, useTrackIds with useShallow), and automation/drum-pad edits always create new references so change detection works.
- Track limits are enforced in the store, so every way of creating a track is covered.

**Proposal**

PROPOSAL: one project document, one field registry, three stores.

Root cause: six hand-maintained field lists decide what survives a reload: serializeSession, serializeSessionForCloud, freshProjectHarmony, resetSessionToEmpty, MARK_KEYS, and the diffEngine / yjsToZustand / pullDocIntoStore maps. They have drifted apart, so each reload path keeps a different subset. Autosave and undo also observe the whole store instead of the document.

1. Field registry. One table lists every document field with flags {local, cloud, collab, undo, perUser, resetOnNew}. Serializers, resets, undo scope and the Yjs mapping are generated from it, and a unit test fails when a store field appears in none of them.

2. Split the store into three:

- doc (persisted and undoable): project meta; musical transport settings including time signature; tracks and clips including trackRole, durationTicks, ccEvents, pitch edits and synth patches; harmony (chord lane, mode, measure layout); notation; markers; mixer (mastering, returns, master automation).
- session (not persisted): playhead, live recording, meters, selection, view, panels, presence, analysis.
- prefs (per user): input routing per device; loop, metronome and count-in; zoom and view per project.
  High-rate writes (position, peaks, tuning, presence) never touch doc or bump the document version.

3. Persistence:

- Schema v3 with migrations.
- IndexedDB drafts keyed by draftId (several drafts, one lock per tab).
- Debounce 1 s with maxWait 5 s, driven by the document version; flush on pagehide, on visibilitychange to hidden, and on editor unmount.
- A save-status chip: Saved / Saving / Unsaved / Saved locally only / Failed.
- Cloud gets a JSON document column (stopgap: the track settings blob, as masterAutomation does today) and stops minting new track and clip ids on load.

4. Boot:

- A single openSession(intent) state machine with loading and error UI.
- One unsaved-work guard for every entry point: dashboard tabs and tiles, lessons, collab links, File > Open.
- Keep the intent in the URL or sessionStorage (tutorial step, practice session, collab room) so a refresh resumes.
- On SPA return, reuse the live draft instead of restoring the autosave.

5. Undo:

- Patch-based history over doc only, grouped per gesture, with step labels.
- Origin tags so system and remote writes are ignored.
- Reset at the end of every seed.
- Audio buffers kept alive while referenced by history.
- Initialized once, never JSON.stringify per change.

6. Ids: UUIDs for chord regions; track and clip ids stay stable across cloud round-trips.

7. Rendering: the root subscribes to nothing that changes per frame; engine sync uses store.subscribe.

Reference DAWs (product knowledge, not code evidence): BandLab, Soundtrap, Soundation and Audiotool save continuously and show a visible saved state; Ableton and Logic keep named undo and offer crash recovery rather than restoring silently; openDAW is local-first. Music Atlas should never lose work and should always show its save state.

MATRIX. Columns: L = local autosave, C = cloud, Y = collab live sync, U = solo undo. Values: Y = yes, N = no, ~ = partial.

- Track core (name, instrument, colour, volume, pan, FX, sends, automation, chains, kit, organ, sampler, preset, GM program): L Y, C Y, Y Y, U Y.
- Mute/solo: L Y, C Y, Y N (per user), U Y.
- Arm/monitor: L Y, C N, Y N, U Y.
- trackRole: L N (undefined), C N (re-guessed), Y Y, U Y.
- Input routing: L ~ (channel lost), C N, Y N (wiped on remote edits), U Y.
- MIDI notes: Y, Y, Y, Y.
- Clip length (durationTicks): N, N, Y, Y.
- CC data (sustain etc.): N, N, ~ (on clip add only), Y.
- Audio clip references: L Y, C ~ (uploaded clips only, new ids), Y Y, U Y.
- Audio buffers: L ~ (re-download needs assetId and token), C Y, Y Y, U N (delete drops the buffer).
- Pitch edits: N, N, N, N.
- Synth patch: L ~ (synth edits do not trigger autosave), C Y, Y N, U N.
- Chord regions: L Y (ids collide after reload), C N, Y Y, U Y.
- Root note: Y, Y, Y, N. Mode: Y, N, Y, N. Rhythm/genre/swing: Y, Y, Y, N.
- Prism builder (progression, strum, tilt, filter, record mode): N, N, N, N. Key lock and key colour: not saved, and they leak into the next project.
- Measure row sizes and fermatas: N, N, N, Y. Rests and melody overrides: N, N, N, N.
- Lead-sheet sections and repeats: N, N, Y, Y. Chord format and showRepeats: N, N, Y, N. Show-melody settings: N, N, N, N.
- Score articulations, slurs, hidden chords: N, N, ~ (on join only), Y. Slash notes and chord tracks: N, N, ~, N. Spellings, system/page breaks, system runs, text marks: N, N, N, Y, and never reset between projects.
- Markers: N, N, Y, N (collab undo: Y).
- Returns: Y, Y, Y, N. Master automation: Y, Y, Y, Y. Mastering chain and master volume: N, N, Y, N.
- BPM: Y, Y, Y, N. Time signature: N, N, Y, N. Loop and metronome: Y, N, N (per user), N. Count-in: N everywhere. Playhead position: L only.
- Project id, name, composer: L Y; C name and composer; Y name and composer; U N.
- View, zoom, scroll, selection, dock tab, panels: N everywhere (survive SPA navigation only).
- Tutorial step, practice session, collab room: not persisted (survive SPA navigation only; URL intent is stripped).

BOOT PATHS:

- ?project=: waits for the auth token with no UI; loads the cloud subset and resets harmony; keeps stale markers, mastering, time signature and score text marks from memory; on error, silently restores the autosave.
- ?new, ?template, ?demo, ?tutorial, ?song, ?practiceMode, ?practiceGenre, ?jam, ?collab: clear the autosave and do a partial reset with no guard. Only ?song resets undo; the others leave the empty project as the first undo step. The key lock survives, so the song or practice key may not apply. Lesson, practice and collab context cannot be resumed after a refresh.
- ?seeded=1: trusts the Song page's seeding.
- Default (refresh, Continue last session, browser Back): restores the autosave over the live store, losing notation, undo history and the last 1.5 s of edits. After a refresh, also: trackRole and input channel undefined, 4/4, no mastering, markers, pitch edits, CC or clip lengths, and chord ids that collide.
- SPA return with a guest in a collab room rejoins; a host return or any refresh forks into a solo copy.

**Open questions**

- Should the cloud become the continuously saved source of truth with version history (as in BandLab and Soundtrap), or stay explicit Save plus local crash recovery? This decides whether 'unsaved' means 'not in the cloud' or 'not in the local draft'.
- Is a project-level JSON 'document' column on studio_project acceptable on the API side, or must new data keep riding on track[0].settings?
- Which state belongs to the project and which is a per-user preference: loop range, metronome, count-in, zoom/view, input routing, and mute/solo (saved to the cloud today, but local-only in collab)?
- Should there be multiple local drafts (one per project, listed on the dashboard) or a single crash-recovery slot?
- When a student starts a template, demo or lesson with unsaved work, should we prompt, or auto-stash the current session as a draft?
- Undo scope: should mixer moves (volume, pan, mute, solo) and mastering be undoable? Should undo history survive a reload?
- After a refresh during a lesson or practice track, should it resume at the same step or restart?
- Should Oracle Synth patches sync live in collab (bandwidth cost), and whose patch wins on conflict?
- Label-only presets (808s, Leads, Pads, Percussion): remove them now, or back them with real sounds?
- Should pitch-correction edits be stored as edits (re-analysed on load) or as rendered audio assets?

## synth-engine

The Oracle Synth engine (33 files, about 6.1k lines) is a native Web Audio polysynth run from the main thread. Voices are created lazily (about 43 nodes each). Each voice has two A/B-crossfaded wavetable oscillators whose unison OscillatorNode sets are rebuilt on every note. Around them sit a modulation matrix that creates nodes per connection, 4-bar LFOs rendered into AudioBuffers, a setInterval arpeggiator, and a fixed six-effect FX chain per track.

The engine has no UI of its own, so visual alignment does not apply here. It is, however, the source of most of the synth's audible defects in /studio/editor. Graph hygiene is good: NaN guards, leak-aware teardown, and disabled effects are detached.

The timing model is the core problem. Voice lifetimes, voice stealing, oscillator start/stop, glide and the arp all use 'now' (ctx.currentTime) instead of the scheduled `time` the DAW passes, and that time arrives 100-150 ms early because of Tone's lookahead. Wall-clock setTimeout calls free the voices. As a result:

- Offline export of Oracle tracks is broken.
- Note and chord transitions get truncated, click and leave gaps, both live and in the piano roll.
- Toggling the arp while keys are held leaves stuck notes.

Patch application on load and export is incomplete:

- Reverb is never applied.
- The project BPM is ignored (patches carry a stale 120).
- Pack wavetables are not registered until a panel mounts, and that registration loses a race with the panel's first sync.
- Wavetable-position modulation (used by 50 of the 82 bundled pack presets) is never driven in the Studio.

So tracks sound different after a refresh than while editing.

CPU and GC waste comes mainly from:

- full-rate re-renders of the 4-bar LFOs (36-40 per engine init or panel mount, about 110 MB of allocations per track at 120 BPM)
- a duplicate unison engine that doubles oscillator count for every factory preset
- node churn on every note
- 4 s of noise buffers per voice
- full matrix rebuilds on every mod-amount knob move, doubled while the full-screen pop-out is open.

**Strengths to keep**

- NaN/Infinity guards at the main points where parameters are written (constants.ts:20-25 smoothParam, UnisonEngine.ts:46-48, wavetableImport.ts:81-85) keep one bad value from silencing the shared DAW master.
- Leak-aware teardown: releaseResources stops every source node the engine owns without closing the shared context (SynthEngine.ts:295-386), UnisonEngine and SubOscillator cut incoming detune connections so destroyed oscillators can be garbage-collected (UnisonEngine.ts:198-214, SubOscillator.ts:72-85), and Voice.dispose stops its ConstantSources.
- FXProcessor detaches the wet sub-graph of disabled effects, so a disabled convolver, oversampled shaper or compressor costs no CPU (FXProcessor.ts:56-78).
- voiceSeed seeds lazily created voices with the current patch, so a voice born after a preset load does not play the default patch (SynthEngine.ts:81-100, 240-254).
- ScaleQuantizer's per-key LIFO stack plus output refcount correctly handles many-to-one quantizing, key changes mid-hold and overlapping same-pitch notes (ScaleQuantizer.ts:96-168).
- Wavetable frames are cached app-wide and duplicate fetches are deduplicated (wavetableImport.ts:152-218); drive curves and reverb IR data use bounded static caches (DriveEffect.ts:39-58, ReverbEffect.ts:30-34, 114-118).
- The math and DSP modules (modMath, ModCurves, wavetableWarp, ScaleQuantizer, wavetableImport) don't depend on AudioContext and have unit tests; registerModSource/Target/Transform give clean extension points.
- CC automation is already sample-accurate: handleCC passes the scheduled `time` into smoothParam (SynthEngine.ts:693-713). Note handling should follow the same pattern.
- Persistent visualization filters let the filter-response display draw before any note plays (SynthEngine.ts:144-154).

**Proposal**

Rebuild the engine around scheduled time and a single patch path.

1. **Voice timing.** Every note, CC and allNotesOff carries `time`. Allocation order becomes: free voice, new voice, steal oldest releasing, steal oldest active. A steal fades the old voice over 5-10 ms ending at `time` and stops its sources with osc.stop(when). Voices are freed from `onended` or a context-time queue, never setTimeout. Release starts from a computed envelope level. Glide starts at `time` from the last played pitch, and LEG/MONO get a real held-note stack.

2. **One patch path.** A single diffed `applyPatch(patch, {projectBpm})` is shared by instrument init, panel mount, preset load and export. It:

   - includes reverb
   - takes tempo from the project
   - waits for pack registration
   - batches LFO renders
   - skips unchanged fields
   - updates mod-route gains in place.

   Mounting the inline panel plus the pop-out should not double-subscribe the engine.

3. **Transport-aware modulation.** LFOs are rendered per bar into a low-rate buffer and started at a transport-aligned offset. The arp emits scheduled notes from the transport. WT position and blend are driven inside the engine for every track and in export.

4. **Cheaper voices.** Keep a persistent per-voice graph and recreate only OscillatorNodes. Run a single unison engine unless a morph is in progress. Share PeriodicWaves and noise buffers per AudioContext. Pre-allocate voices off the note path, and enforce a voices × unison CPU budget with UI feedback.

5. **Longer term.** Move the voice engine into an AudioWorklet, as worklet-based web DAWs such as openDAW do. Desktop DAWs like Ableton and Logic bounce through the same engine as playback; a worklet engine lets playback and export share one sample-accurate path.

Fix the dead controls (filter ON/OFF and PAN, GAIN on LP/HP, compressor mix, FX order) so every visible knob audibly does something. Ship with OfflineAudioContext regression tests:

- sequenced notes render at the right times and pitches
- reverb is present after load
- arp steps land on the grid
- toggling ARP mid-hold leaves no stuck notes.

**Open questions**

- Should Oracle LFOs be locked to the song's bars (the 4-bar editor implies they are) or stay free-running? Must exports reproduce the playback modulation phase exactly?
- Is Firefox a supported browser for students? Under the Web Audio spec the phaser's feedback loop without a DelayNode is muted, and Firefox follows the spec.
- Do any saved v1 projects or presets still depend on the inverted 'legacy' cutoff down-sweep, or can it be limited to migrated routes so new routes open the filter upward?
- What is the lowest-spec target device (for example school Chromebooks)? That determines the voices × unison CPU budget the engine should enforce and show.
- Should the arpeggiator be a transport-synced MIDI effect (notes on the grid, captured in export and possibly printable to the piano roll), or stay a live performance tool?
- Until export is fixed, should Export Audio warn about or exclude Oracle tracks rather than silently render them wrong?
- Should tempo belong only to the project, dropping `bpm` from saved synth patches so every patch follows the song tempo?

## synth-store

The Oracle Synth keeps ONE global zustand store (useSynthStore) holding the live patch of whichever Oracle track is open. Other tracks' patches sit in a module-level Map (synthTrackState.ts) that a 'bridge' hook swaps in and out when a synth panel mounts or unmounts. Per-module UI rendering is efficient: slices update immutably with structural sharing, and modules are React.memo with narrow selectors. The 'live store + side cache' architecture causes most of the reload bugs:
(1) synth edits are invisible to the local autosave, Cmd+Z and collab, which all watch only the main useStore;
(2) never-opened tracks have no patch and silently inherit whatever the singleton store last held, across tracks, projects and lessons, because nothing ever resets the store or the cache;
(3) the load/export path (applySynthStateToEngine) has drifted from the panel path: it skips reverb, uses a frozen per-patch BPM (the synth store's bpm is never updated), and runs before pack wavetables are registered, and 81 of the 82 pack presets use pack wavetables;
(4) snapshot restore skips the preset migrations, which risks an app-level crash on old projects;
(5) FX and mod route ids come from module counters that restart at 0, so they collide after a reload and corrupt patches.
Performance: every patch application (track select, return to the CONTROLS tab, pop-out open, project load, preset switch) rebuilds each full-sample-rate LFO buffer 9-10 times (about 36-40 rebuilds of about 384k samples each). The SMOOTH knob rebuilds once per pointer move. factoryPresets.ts IS eagerly imported (presetSlice.ts:7, demoSynthPresets.ts:1), but it is only about 37 KB of source for 11 presets, so lazy-loading is not worth it. The problems there are boilerplate, wrong version labels and student-facing metadata that never reaches the UI. The preset UX is weak for students: a flat, uncategorised list of more than 93 entries, an asterisk that lies, user presets that can be shadowed and can't be deleted, kept in per-browser localStorage only, and a menu without keyboard semantics.

**Strengths to keep**

- Immutable, structurally shared slice updates (setOscParam, setFilterParam, setEnvParam, setLFONodes, fx setters) replace only the edited element. Sibling modules and per-module engine subscriptions with shallow equality skip unchanged parts, and selectors return existing references or primitives, so no useShallow is needed and there is no zustand-v5 unstable-snapshot hazard.
- Synth UI modules are React.memo with narrow selectors (OscillatorModule s.oscillators[index], FilterModule s.filters[index], LFOArea s.lfos[s.activeLFOIndex]), so a knob move re-renders one module.
- synthTrackState.ts centralises per-track patch ownership with clear docs. It has a sound 'active track reads the live store' rule for saving, and a ref-counted bridge so the inline strip and full-screen pop-out can coexist, with regression tests in useStoreBridge.test.tsx.
- applyPresetData has careful, documented migrations: v1 mod routes, flat to nested rateDivs, inert warp and reverb backfill, and v1-inert routes shipped disabled. PresetData.ts keeps a version history.
- Licensed pack content stays out of the bundle: public assets, lazy wavetable fetch, silent 404, and saved projects degrade gracefully.
- Machine-driven key mirroring deliberately avoids dirtying the preset (useStoreBridge.ts:97-101), and restore explicitly clears dirty (synthTrackState.ts:135-137).
- withDemoSynthPresets seeds demo patches at open time without pulling the synth into the dashboard bundle. synthTrackStateFromPreset reuses the same migration path as the UI.
- LFONodeEditor keeps drag state locally and commits on pointer-up (LFONodeEditor.tsx:205-212), avoiding per-move LFO rebuilds for node drags.

**Proposal**

Make the per-track patch first-class data instead of a 'live global store plus side cache'.
(1) Schema. Introduce one PATCH_SCHEMA module listing each key with its default, a version-driven migrate step and an applyToEngine function. Derive Patch (with `version`), capture and extract, the dirty selector, migratePatch (shared by presets, snapshots, import, demos and packs) and a single engine.applyPatch from it. This removes the five drifting lists behind the missing reverb and stale bpm.
(2) Ownership. Store patches in the main useStore as `oraclePatches: Record<trackId, Patch>`, edited through actions keyed by selectedTrackId. The synth UI then reads `oraclePatches[selectedTrackId]` with the same narrow selectors it uses now. Autosave, undo (coalesced per gesture), the unsaved-session prompt and Yjs collab (via diffEngine, like organState) cover synth edits for free. The bridge, the active-track flag and the cache disappear, and 'reload' becomes ordinary deserialisation. Keep pitchBend, modWheel and UI tab state in a small transient store. Remove bpm from the patch, and have usePlaybackEngine push project bpm to every Oracle engine. If a full move is too big now, do the cheap fixes first: subscribe autosave to the synth store, add a pagehide flush, reset the store and cache on project changes, seed new and template tracks, use UUID route ids, add reverb to apply, and apply the shared migration on restore.
(3) Engine sync. Create one subscription set per track engine, owned by usePlaybackEngine rather than by mounted panels, and diff the patch per section. Make applyPatch batch the LFO work (one rebuild per LFO), build LFO buffers at a control rate, and limit knob commits to one per animation frame. Load packs at boot when any patch references pack tables, and re-ensure wavetables on registry change. Exports should await wavetables and use the project bpm.
(4) Presets for students. Offer an account-synced library with factory and pack categories, search, one-line descriptions or 'try this' hints taken from the factoryPresets comments, preview, favourites, delete and rename, and reserved names. Build it on the app's Radix menu or side-sheet primitive with Music Atlas tokens: the white pill for Save, colour only for musical meaning.
(5) Tests. Cover the capture, serialize, deserialize and apply round-trip with a spy on every engine setter, migration fixtures for v1, v2 and v3, isDirty staying false after loadPreset, unique route ids after reload, and new-track seeding. The audio-engine slice should also consider phase-locking LFOs to the transport, since LFO.createSource starts at an arbitrary phase.

**Open questions**

- What should a newly added Oracle track sound like: INITIALIZE, a factory preset matched to its role (template 'Bass' gets BASS, 'Pad' gets PAD), or a copy of the last patch? useStoreBridge's docstring promises defaults, but today it copies the previous track's patch.
- Should user presets be account-level and synced across devices (school Chromebook vs home), or is per-browser storage acceptable?
- Is the SERUM-derived pack (82 presets, 66 wavetables, labelled 'SERUM' in the menu) licensed for distribution to students, and is a third-party trademark acceptable as a section label?
- In collab sessions, should Oracle patches sync live on every knob move or only at the end of a gesture or on preset load? Who wins when two people edit the same track's synth?
- Should Cmd+Z undo synth parameter changes on the shared timeline history, or should the synth have its own undo scope with a visible indicator?
- Should exports be blocked or delayed until every Oracle track's patch is fully applied (pack wavetables loaded, project tempo applied), so the export always matches what the student hears?

## synth-ui

The Oracle Synth reaches the DAW in two ways. OracleSynthInline is a fixed-slot strip about 3,200px wide that scrolls horizontally inside the 33vh CONTROLS dock. DawSynthLayout is a fixed 1440×932 canvas, transform-scaled to fit a full-screen PopOutOverlay; while the pop-out is open, the dock copy stays mounted underneath it. The standalone shell (main.tsx, App.tsx, SynthLayout, useViewportScale, useAudioEngine) is not in any build entry, and OracleSynthPanel/Bridge are unused placeholders. The worst defects sit at the boundary between the UI and the audio engine, and in persistence. (1) Wavetable-position/blend modulation, which 50 of the 82 bundled pack presets use, only runs in the dead standalone shell. (2) The project-load/export path skips reverb and DAW tempo. (3) Synth-only edits never trigger an autosave. (4) FX and mod route ids restart after a reload and collide with saved ones. (5) The FX panel shows 'No effects' while effects are audible (70 of 82 pack presets). (6) The LFO editor maps the pointer wrongly inside the scaled pop-out, and its rate knobs overwrite drawn shapes. (7) QWERTY note keys in the pop-out change focused dropdowns and toggle the DAW's metronome and loop. Performance problems are moderate. Store-to-engine pushes are per section rather than per field: every drag tick on a mod amount tears down and rebuilds the modulation audio graph, and this happens twice while the pop-out and dock are both mounted. The modulation dot keeps per-frame React state that re-renders whole modules 30×/s. Up to 11 canvas loops run at all times. No synth UI component subscribes to the DAW's transport position. UX and visual: the dock clips the lower knob rows of the source modules, and macros, the keyboard and key lock exist only in the pop-out, even though the tutorial asks students to use them from the dock. The pop-out's 8-10px labels render at about 5-7px on laptops. The preset browser is a flat list of 93+ names; saving under a factory name shadows the user's preset, and INIT has no confirm and no undo. The styling is hard-coded greys plus a rainbow of accents, off the Music Atlas look.

**Strengths to keep**

- Knob is a real ARIA slider: role=slider, aria-label and aria-valuetext, Arrow/Home/End keys, Shift for fine drag, double-click to reset to default (Knob.tsx:162-221).
- LFONodeEditor keeps node and curve drags in local state and commits to the store once on pointerup (LFONodeEditor.tsx:127-212), so dragging causes no store or engine churn.
- EnvelopeModule teaches. It has PLUCK/PIANO/PAD shape buttons with tooltips (EnvelopeModule.tsx:22-35, 69-80), and it dims Decay with an explanation when Sustain is 100% (37-38, 94-112).
- KeyScaleBar ties the synth to Music Atlas theory. Key Lock uses displayAccidentals spelling and offers 'Snap to song key' / 'Analyze key' from the project's detected key (KeyScaleBar.tsx:13-17, 56-111). The arp can be chord-aware, and held keys show the live chord colour, so colour carries musical meaning.
- useSyncStoreToEngine uses per-section selectors with shallow equality, per-bar LFO subscriptions, per-index macro diffs, a ref-counted indicator engine and an explicit initial sync (useSyncStoreToEngine.ts:17-348).
- The visualizers keep per-frame work out of React: canvas plus refs, and a rAF loop that reads the latest callback from a ref. EnvelopeVisualizer redraws only when its params change. The cutoff knob is log-scaled, and the wavetable registry hands useSyncExternalStore a stable snapshot.
- PresetSelector's flip-aware body-portal placement works both inside scroll containers and inside the transformed pop-out (PresetSelector.tsx:6-32).
- useWtPosModulation filters out non-finite values before they can reach an AudioParam (useWtPosModulation.ts:98-101).
- No synth UI component subscribes to the DAW's 30 Hz position, so the synth is isolated from the transport hot path.

**Proposal**

Merge the three synth shells (standalone SynthLayout, pop-out DawSynthLayout, docked OracleSynthInline) into one responsive <OracleSynth density='dock'|'full'> built from the same module components. Drop transform scaling in favour of CSS grid with container queries, a 12px text minimum, 32-40px knobs, and Music Atlas tokens: near-black base, white/6 surfaces, white/8 hairlines, the white pill for primary actions, and colour only where it means something musically (key colour for Key Lock and scale-highlighted keys, chord colour on held keys). The dock becomes a student-first 'Play' page that fits within 33vh: a category preset browser with audition and prev/next, 8 named macros, Key Lock with Snap to song key, the amp/filter essentials, and an on-screen QWERTY keyboard. Tabs (Sound · Shape · Motion · FX & Arp) hold everything else, and the pop-out remains the full editor. This follows the patterns of Logic Alchemy's Simple/Advanced views, Ableton's macro-first racks, and the preset-first instruments in BandLab and Soundtrap. Move all audio state below the UI: one applyPatch parameter table shared by live sync, project load and export (this fixes the reverb and tempo drift); engine-owned WT/blend modulation and DAW-tempo following; per-field diffs with in-place mod-amount updates; one store bridge per engine. Give useSynthStore undo, autosave hooks, Yjs participation and UUID route ids, and show the FX list as a projection of the real chain. For performance, replace per-module 30fps React state with one visibility-gated visualization scheduler (single rAF, DPR-aware canvases, filter curve redrawn only on change) and ref-driven mod dots; unmount the dock content while the pop-out is open. Fix pointer-cancel handling and unify QWERTY musical typing across instruments. Delete the dead shells: the standalone app, OracleSynthPanel/Bridge and Slider.

**Open questions**

- Should the dock become a student-first 'Play' view (presets, named macros, Key Lock, keyboard) with the full module editor only in the pop-out, or must the dock expose every module?
- Keep Vital/Serum-style per-module colour coding (helps students follow signal flow), or move fully to the neutral Music Atlas look where colour is reserved for key/chord meaning?
- Should user presets live in the student's account and be shareable within a class, for example teacher-provided patches for a lesson?
- Should synth patch edits sync live in collab sessions? If so, who owns a track's patch in a classroom session?
- Is per-quarter LFO rate sequencing (4 bars × 4 quarters) intended for this audience, or can the default be one shape plus one sync rate, with per-bar sequencing as an advanced option?
- FX TARGET routing: build per-source FX sends, or remove the control?
- Should synth edits join the DAW's Cmd+Z history (one undo stack), or have their own undo?
- Is the standalone Oracle app (main.tsx/App.tsx/SynthLayout) needed for any other product, such as a public synth page? If not, can it be deleted?

## timeline

Scope: the CREATE (arrange) view's timeline, track headers, automation lane, and ruler/loop/marker code.

Where the lag comes from:

- **Playhead updates don't repaint the canvas.** Each position tick (~30 Hz from useTransport.ts:72-93) re-renders only Timeline in this slice. Its top-level `position` selector (Timeline.tsx:416) re-runs the 3,058-line component (26 store selectors, all hooks, JSX), re-attaches the playhead handle's inline ref (which reads scrollTop), and re-renders the unmemoised PresenceCursors. The canvas itself is not redrawn: `position` isn't in the redraw deps (1342-1366), and the playhead is a CSS-transformed div.
- **Track header meters.** TrackHeader and MasterTrackHeader ignore position but re-render every animation frame through useMeterLevel's per-frame setState.
- **Full canvas redraws.** These fire on any change to the whole `tracks` array (fader step, FX knob, automation drag), on every wheel or drag event, and 15 times a second while recording. Each one rescans the raw samples of every visible audio clip, because waveform peaks aren't cached.

Data-integrity bugs:

- Splitting an audio clip discards its uploaded recording (critical).
- The MIDI scissors mix clip-relative and absolute ticks, so they fail for clips that don't start at bar 1.
- Moving any MIDI clip shifts the entire chord lane.
- In collab, clip moves ignore track locks and can delete or duplicate clips.

Reload behaviour:

- Never saved: markers, time signature, MIDI clip length and CC data, master volume and master FX.
- Not reset when a project opens, so they leak from the previous project: markers, loop, zoom/scroll, master settings.
- Vertical scroll position resets on every view switch.

UX gaps: no follow-playhead; no drag feedback while playing; the grid is fixed at 1/4 and the Snap toggle doesn't affect clip moves; the automation editor is docked away from its track and only edits values; editing is mouse-only and hidden behind right-click; headers and lanes drift out of alignment; the canvas isn't redrawn when panels resize.

**Strengths to keep**

- Canvas arrangement with a CSS-transform playhead: `position` is deliberately left out of the redraw deps (Timeline.tsx:1342-1366, 2864-2873), so playback itself never repaints the canvas.
- Clips outside the visible tick range (±1 bar) are culled, and notes and waveforms are skipped below 5 px/beat or 8 px clip width (Timeline.tsx:532-540, 694, 735, 938).
- DPR-aware canvas sizing, with DAW tokens resolved from CSS custom properties on the canvas (--color-bg, --color-grid-rgb, --color-selection-rgb), so themes apply without code changes (Timeline.tsx:492-530).
- rulerLoop.ts gives the timeline and piano roll the same Logic-style loop and playhead gestures as small, testable pure functions. It also stops the default bars 1-4 loop from swallowing seek clicks (rulerLoop.ts:92-109).
- Zoom-adaptive grid, bar shading and ruler levels with smooth alpha fades that follow the time signature through ticksPerBeatUnit (timelineScale.ts:73-215).
- Clear trim semantics: audio trims are non-destructive via offsetSeconds and the waveform follows the trim; MIDI trims are bounded by content and clamp notes that straddle the edge (Timeline.tsx:2379-2446).
- Clips whose cloud audio is still downloading show an honest 'Loading…' instead of a placeholder, and the canvas redraws when the buffer arrives via subscribeAudioBufferChanges (Timeline.tsx:442-452, 948-973).
- Careful gesture handling: drag thresholds tell clicks from drags, window listeners keep gestures going off the canvas, and only the canvas wheel listener is non-passive, so vertical scroll stays native (Timeline.tsx:62-70, 2511-2566).
- Collab-aware headers: a lock border in the collaborator's presence colour that pulses on live audio, local Mute and Listen that stay usable under the lock, and mute/solo kept per user (TrackHeader.tsx:71-88, 164-201, 303-349).
- AutomationLaneEditor reuses the timeline's tick↔pixel math, zoom and scroll, so it stays x-aligned, and has one write path for track and master lanes (AutomationLaneEditor.tsx:74-88, 107-119).
- MasterTrackHeader is deliberately minimal and correctly uses aria-pressed on its automation toggle (MasterTrackHeader.tsx:17-22, 119-121), a good model for the track headers.
- The chord lane uses colour for musical meaning (Prism harmony colours), and Click / Shift / Cmd selection for Insight fits the 'colour means music' brand rule (Timeline.tsx:1228-1281, 1447-1476).
- Tutorial anchors (data-tutorial-id) on the add-track, automation-toggle and automation-lane controls let the guided lessons drive the real UI.
- Track limits are enforced in one place: addTrack returns '' with a toast, and callers keep the picker open (tracksSlice.ts:551-563).

**Proposal**

1. Fix data integrity before redesigning anything.

   - Move clip operations out of Timeline.tsx into a pure timelineModel with lock- and type-aware store actions: splitClipAt (non-destructive for audio, rebased for MIDI), moveClip and trimClip. Unit-test them.
   - Stop moving the chord lane when unrelated clips move.
   - Add one projectDefaults() reset that every load path uses.
   - Bump SessionData to v3 (and the cloud schema) to carry markers, time signature, MIDI clip length and CC data, master volume and FX, and the loop. Also save per-project view state (zoom, scroll, follow, open lane).

2. Rebuild rendering for low lag.

   - A <Playhead/> driven outside React rendering, interpolated per frame from Tone.Transport, with Follow mode (page or smooth) on by default.
   - A TimelineRenderer with three stacked canvases: grid and rulers, clips, and overlays (marquee, drag ghost).
   - Redraws fed by a narrow geometry selector, coalesced into one requestAnimationFrame, and triggered by ResizeObserver and pixel-ratio changes.
   - Waveforms drawn from a per-buffer peak pyramid computed once (in a worker).
   - One shared meter loop writing CSS variables instead of per-header React state.
   - Remove the 30 Hz Timeline subscription, PresenceCursors' per-tick render, the Reorder layout measuring and the backdrop blur on opaque panels.

3. Interaction and layout, borrowing proven patterns from the reference DAWs.

   - Pointer Events with pointer capture, so mouse, touch and pen share one path (BandLab and Soundtrap work on tablets).
   - A single scroll container: a CSS grid with a sticky 200-240 px header column.
   - Variable row heights, so automation lanes open inline under their track (as in Logic and Ableton), plus a real Master lane and an 'Add track' ghost row at the bottom that also accepts drops.
   - Clips get a name header strip in the track colour, fade handles, edge trims, Alt-drag copy, multi-select, and Radix context menus with keyboard support.
   - The ruler: dragging the bar-number lane scrubs; drawing loops stays in the top strip (Logic's cycle area); markers become section flags with presets and a marker list.
   - An arrange toolbar holds the grid menu, snap, a zoom slider with Fit, and Follow.

4. Visual alignment with the landing look.
   - #101012 background with white-opacity steps and white/8 hairlines.
   - Text at least 11-12 px in Glacial Indifference with at least 4.5:1 contrast, and targets at least 24 px.
   - A white playhead that turns red only while recording.
   - Teal used only for selection, colour kept for musical meaning (chord lane, track colours), and no amber or yellow.
   - The white pill for primary actions (Add Track, Import), and a shared DawToggle primitive with aria-pressed and focus-visible rings in place of inline style objects.

**Open questions**

- Which devices must the arrange view support at launch: iPads and touch Chromebooks, or mouse and trackpad only? This decides whether Pointer Events, 24 px targets and a touch-first track header are must-haves.
- Can the cloud project schema change (a backend migration) to carry markers, time signature, MIDI clip length and CC data, master settings and the loop? Or should these ride on track settings for now, the way masterAutomation does?
- When a student moves the chords clip, should the chord lane move with it (linked to that clip)? Or should chord symbols stay independent and be re-analysed on request?
- Follow-playhead: page-by-page (Logic's Catch) or continuous scrolling, and should it be on by default for students?
- Is it acceptable to replace the docked automation editor with automation lanes that open under each track? That needs variable row heights in both the canvas and the header column, which is a larger refactor.
- Should students be able to import their own audio files (WAV, MP3, M4A) by drag-and-drop, given GCS storage cost and the 6-audio-track cap?
- Is the 10-track / 6-audio-track cap permanent? Vertical virtualisation isn't needed today, but would be if the cap is raised.
- Playhead colour: keep the DAW-convention red, or move to white per the landing look and turn it red only while recording?
- Grid: an explicit Grid menu (Soundtrap and Logic style) or an adaptive grid that follows zoom (Ableton style)? What should the default be in 6/8 lessons?
- Should zoom, scroll and follow state be saved per project and restored after a refresh, or should every project open fitted to its content?
- Should the 'Release' button and the track-role picker (Auto / Chords / Melody / Bass / Drums) be visible in solo sessions, or only in collab and in an advanced track menu?
