# Sub-plan: Guitar input and evaluation (reusing the Studio chord analyser)

## Goals

1. Guitar lessons use the Studio's chord analysis component, `AudioChordDetector`, to judge chords the student plays. The detector code does not change. Its driving loop moves out of `useAudioChordDetection` into a class that does not depend on the DAW, and the Studio and Learn both use that class. Studio behaviour stays identical.
2. Single notes (scales, melodies, arpeggios) are detected by the Studio's mono guitar note pipeline: `ProbabilisticOrchestrator` with `GUITAR_PITCH_PROFILE`.
3. Microphone and audio-interface input comes back only when `instrument === 'guitar'`. Piano stays MIDI-only; a regression test proves `getUserMedia` is never called for piano. MIDI guitar is also supported.
4. Guitar steps follow the same step logic as piano (OOT hold then auto-complete; IT with timer, `performanceMeta`, then assessment). Only the input source, matching policy and sound output change. All piano code paths run exactly as today.
5. The guitar sound for MIDI-guitar echo, the demo and the practice guide uses the GM soundfont, program 25 (steel string, with 24 nylon as an option). Audio input is never echoed.

## Design decisions

**D1. Chord steps are judged by chord identity: pitch-class set equality with partial credit. The exact MIDI notes are not compared.**

- A strummed open C (C3 E3 G3 C4 E4) has the set {0,4,7}, so it matches any C major target.
- Comparing sets also removes the label ambiguity the detector can produce (Am7 vs C6, Bm7b5 vs Dm6): the sets are equal, so the score is 1.0.
- `chordIdentityScore(target, played)`:
  - 1.0 if the sets are equal.
  - 0.8 if played ⊂ target, has at least 3 pitch classes and includes the target root (for example the 7th of a chord was not heard).
  - 0.6 if played ⊂ target without the root, or played = target plus one extra pitch class (a ringing open string).
  - 0 otherwise.
- `IDENTITY_PASS = 0.8` (OOT hold, and the OOT hit rule). `IDENTITY_MATCH = 0.6` (IT pairing; anything below counts as a wrong chord).
- Rejected: using the piano's exact MIDI matching (a guitar voicing never equals the piano voicing, and the detector does not report octaves). Rejected: comparing detector labels (Am7 vs C6 would fail).

**D2. Chord _events_ are built from onsets, and their identity comes from the detector.**

- The detector gives identity only, at about 20 Hz, about 300 ms late (its vote buffer).
- Strum timing comes from a separate `OnsetStream` (the existing v2 class) running on the 512-point onset analyser, accurate to about 25 ms.
- The new `GuitarChordSegmenter` ties each strum onset to the identity the detector reports 150–450 ms later.
- If no onset was seen, it falls back to Studio's rule: `reportTime − CHORD_VOTE_LATENCY_MS` (300 ms).
- Repeated strums of the same chord in a Music Map rhythm become separate events (`strumId`).
- Rejected: a fixed 300 ms offset only (jitter of ±100 ms against a timing sigma of 90 ms at 100 BPM).

**D3. Timestamps use `performance.now()`, and the container converts them to "heard" ticks.**

- An acoustic guitar is heard with no delay, and the student lines it up with the metronome they hear (which is late by the output latency). So audio events are stamped on the heard timeline, the same formula as `playbackTicks()` shifted back by the event's age.
- MIDI guitar keeps piano's `soundingTicks()`, because the student hears the app's echo.
- Rejected: using the capture's AudioContext clock (Firefox may force a separate context; see R6).

**D4. One engine per lesson, always running; a "mode" only gates which events are sent out.**

- `AdaptiveNoiseFloor` needs about 2.4 s to calibrate (`MIN_WINDOW_FRAMES = 96`), so the engines are not started per step.
- Modes: `'off' | 'notes' | 'chords'`, set per step by `classifyGuitarStep(targetNotes)`:
  - `chords` if every onset group has 2 or more notes;
  - `notes` if every group has 1 note;
  - mixed steps are disallowed for guitar (a flow-data test enforces it).

**D5. Note-pipeline settings are exactly the Studio's mono configuration** (`useGuitarMidiDetection.ts:165-181`): guitar profile, `disableMl: true`, `usePolyTracker: false`, `retriggerOnOnset: true` (needed for the repeated E in [1,2,3,3,2,1]), `hiResSkipFactor: 6`.

- `setExpectedNotes(targets)` gives the target notes a 10× prior, which counters YIN octave errors.
- Rejected: the poly `PolyphonicNoteTracker` for notes (its NMF templates are tuned for piano; it adds ML cost).

**D6. MIDI guitar maps to chord identity from held pitch classes**, using the same `CHORDS` table restricted to the detector's quality list (`TIER1_QUALITIES`, exported). Both sources are scored by identity, so the pass criteria are the same whatever the device. Whether a MIDI chord matches the book's exact shape is shown as feedback only, not graded.

**D7. Guitar hold policy (OOT)**, replacing piano's "held at least 80% of the duration at 100 BPM, completes on release":

- Chords complete while still ringing once they have matched (score ≥ 0.8) for `min(0.8·dur@100BPM, 1000 ms)`.
- Notes complete once matched for `min(0.8·dur@100BPM, 300 ms)`.
- Guitar sound decays and "release" is ambiguous, which is why completion does not wait for release.
- Consecutive target groups need a new `strumId` (a re-strum or re-pluck).

**D8. Guitar duration policy (IT), called "let ring".**

- Targets whose duration is at least 0.75 × the gap to the next onset (or the last event): overlong is not penalised (ratio capped at 1). Cutting short is still penalised.
- Staccato targets (duration below 0.5 × that gap): symmetric scoring as today, so the student must mute.
- All scoring maths reuse `scoreNoteContinuous`.

**D9. Audio notes use octave-tolerant pitch matching** (`octaveEquivalenceWeight = 0.75`, through the existing `ContinuousScoringOptions`). MIDI guitar stays exact.

**D10. Shared code lives in `src/daw/audio/ChordAnalysisStream.ts`, next to the detector.** Its header comment states that it must not import `@/daw/store` or `trackEngineRegistry`. Rejected: moving `AudioChordDetector` (a larger Studio change for no benefit).

**D11. Guards against false notes (the reason for commit 70b5e5f3).** That commit found stray audio creating notes, partly the piano sampler echoing into the mic. Guards:

- guitar only, explicit opt-in;
- a noise gate calibrated in setup;
- events only in the practice and performance states;
- a 60 ms confirm window for note-ons;
- input suppressed during demo playback, and during the practice guide if bleed was detected;
- a speaker-bleed test in setup;
- a filter against the metronome's pitched click (it plays C5/C6, inside the guitar range);
- chord detection itself needs at least 2 pitch classes and a stable vote.

**D12. Offline refinement with `OfflineChordAnalyzer` is Phase 2, behind a flag.**

- Used for identity only, and only for IT chord steps.
- `analyzeChords` must be called **without** `bpm`: with a bpm it snaps onsets to the beat grid (`OfflineChordAnalyzer.ts:779-781`), and its hop of 8192 samples (about 170 ms) is too coarse for timing.
- Final identity per group = max(live, offline).

## Exact file changes

### New files

1. **`src/daw/audio/ChordAnalysisStream.ts`** — the detector's driving loop, independent of the DAW.

   ```ts
   export const CHORD_ANALYSER_FFT_SIZE = 16384,
     CHORD_ANALYSER_SMOOTHING = 0.4,
     CHORD_STREAM_THROTTLE_MS = 50,
     CHORD_VOTE_LATENCY_MS = 300;
   export interface ChordStreamSource {
     analyser: AnalyserNode;
     sourceKey: string;
     inputType: InputType;
   }
   export interface ChordStreamKey {
     key: string | null;
     rootPc: number | null;
     modeIntervals?: number[];
   }
   export interface ChordStreamFrame {
     result: AudioChordResult | null;
     notes: number[];
     perfMs: number;
     sourceKey: string;
   }
   export interface ChordStreamHost {
     resolveSource(): ChordStreamSource | null;
     resolveKey?(): ChordStreamKey;
     onFrame(f: ChordStreamFrame): void;
     onIdle?(): void;
   }
   export class ChordAnalysisStream {
     constructor(o?: { fftSize?; throttleMs?; inputType?: InputType });
     start(host): void;
     stop(): void;
     step(host, rafTimeMs): void;
     reset(): void;
   }
   export function chordResultToMidiNotes(
     r: AudioChordResult | null,
     base = 60,
   ): number[];
   export function createChordAnalyser(ctx: BaseAudioContext): AnalyserNode; // 16384 / 0.4
   ```

   `step()` reproduces `useAudioChordDetection.ts:60-166` in order:

   - throttle first;
   - no source: call `onIdle`, and reset only if a source was active before (lines 96-107);
   - source key changed: recreate the detector if the input type changed, otherwise `reset()` (109-123);
   - key context re-applied only when the key string changes, including `clearKeyContext` when the intervals are missing (133-147). The existing quirk is kept: a recreated detector does not get the key re-applied;
   - `analyze`, then map to notes (151-166).

2. **`src/learn/audio/guitar/types.ts`**

   ```ts
   type GuitarInputSource = 'audio' | 'midi';
   type GuitarEvaluationMode = 'off' | 'notes' | 'chords';
   interface GuitarChordEvent {
     phase: 'on' | 'change' | 'off';
     strumId: number;
     rootPc: number;
     quality: string;
     pcs: number[];
     confidence: number;
     onsetPerfMs: number;
     offsetPerfMs?: number;
     source: GuitarInputSource;
     midis?: number[];
   }
   interface GuitarInputPrefs {
     source;
     deviceId: string | null;
     channel: number;
     trimDb: number;
     gateRms: number;
     inputLatencyMs: number;
     bleedDetected: boolean;
     echoMidi: boolean;
     program: 24 | 25;
     setupCompletedAt?: number;
   }
   interface GuitarInputHandle {
     status;
     prefs;
     restart(p: Partial<GuitarInputPrefs>): Promise<void>;
     setEvaluationMode(m): void;
     setSuppressed(b: boolean): void;
     calibrateGate(ms?: number): Promise<number>;
     getTunerAnalyser(): AnalyserNode | null;
     getLastChord(): AudioChordResult | null;
     getStream(): MediaStream | null;
   }
   ```

3. **`src/learn/audio/guitar/guitarInputPrefs.ts`** — `load` / `save` for localStorage key `learn-guitar-input-v1`. This is deliberately not the removed piano key `learn-audio-device-id`.

4. **`src/learn/audio/guitar/GuitarLearnCapture.ts`**

   - `getUserMedia` with `{deviceId exact, echoCancellation/noiseSuppression/autoGainControl: false, channelCount ideal 2}` (same as `GuitarFxAdapter.ts:185-193`), on `audioContextOwner.get()`.
   - Graph: source → `ChannelSplitter` (chosen channel) → `inputGain` (trim). From `inputGain`:
     - **`new NodeTapCapture(inputGain, GUITAR_PITCH_PROFILE)`**, which provides the onset, fast and hi-res analysers, reused as is;
     - `createChordAnalyser(ctx)`;
     - a 4096-point tuner analyser.
   - No connection to the output.
   - `stop()` stops the tracks and disconnects its own nodes. It **never closes the shared context** (same pattern as NodeTapCapture).
   - If creating the source throws `NotSupportedError` (Firefox sample-rate mismatch), fall back to a dedicated `AudioContext({sampleRate: track.getSettings().sampleRate})`.
   - Exposes `onDisconnect`, `getLevel()` and `getStream()`.

5. **`src/learn/audio/guitar/chordIdentity.ts`** (pure)

   ```ts
   chordPcs(rootPc: number, quality: string): number[];
   identifyChordFromPitchClasses(pcs: Iterable<number>, bassPc?: number): {rootPc; quality} | null;
     // exact set match within DETECTABLE_CHORD_QUALITIES, prefer root===bassPc, then CHORD_PRIOR order
   chordIdentityScore(t: {pcs; rootPc}, p: {pcs; rootPc}): number;  // D1
   export const IDENTITY_PASS = 0.8, IDENTITY_MATCH = 0.6;
   ```

6. **`src/learn/audio/guitar/GuitarChordSegmenter.ts`** (pure state machine)

   - Methods: `pushOnset(perfMs, strength)`, `pushFrame(perfMs, result, gateOpen)`, `reset()`, callback `onEvent(GuitarChordEvent)`.
   - Constants:
     - `MIN_INTER_ONSET_MS 90`;
     - `ID_SETTLE_MS 150`;
     - `ID_REVISE_MS 450` (a late identity flip within this window revises the same strum, sent as a `'change'` with the same `strumId`);
     - `ONSET_ID_TIMEOUT_MS 600` (an onset that never gets an identity, such as a metronome click or a muted strum, is dropped);
     - `RELEASE_FRAMES 3`;
     - `CHORD_RELEASE_LATENCY_MS 150`.
   - Offset = the earlier of the first gate-closed time and (first null frame − release latency).
   - Identity with no onset seen: onset = `perfMs − CHORD_VOTE_LATENCY_MS`.

7. **`src/learn/audio/guitar/MidiGuitarChordAggregator.ts`** (pure)

   - `noteOn(midi, vel, perfMs)` and `noteOff(midi, perfMs)`.
   - Ghost filter: velocity < 12, or on/off within 40 ms.
   - Notes within a 60 ms strum window form one chord; identity from `identifyChordFromPitchClasses(heldPcs, lowestHeld % 12)`.
   - Sends `'off'` when fewer than 2 pitch classes are held for 150 ms.

8. **`src/learn/audio/guitar/GuitarLearnInputEngine.ts`** (no framework dependency)

   - Owns the capture, `ProbabilisticOrchestrator(capture.getNoteCapture(), 'monophonic', orchestratorOptionsFor(GUITAR_PITCH_PROFILE,'monophonic'))`, a `ChordAnalysisStream` (fixed source = chord analyser; key from `setKeyContext`), a 40 Hz loop (`OnsetStream.process(onsetAnalyser)`, level, noise gate with 150 ms hold), the segmenter, a 60 ms note-confirm buffer, and onset attribution.
   - Onset attribution:
     - note onset = latest onset in [noteOn − 200 ms, noteOn], otherwise `noteOn − 80 ms`;
     - then − `prefs.inputLatencyMs`.
   - Sends events only when the mode allows and the input is neither suppressed nor gated.
   - API: `start/stop/restart(prefs)`, `setEvaluationMode`, `setSuppressed`, `setKeyContext`, `setExpectedNotes`, `setCallbacks({onNoteOn,onNoteOff,onChord,onLevel,onError})`, `calibrateGate`, `getTunerAnalyser`.

9. **`src/learn/audio/guitar/guitarVoice.ts`** — sound output through `jamSoundFont`:

   - `initJamSynth`, `allocateChannel('learn-guitar')`, `jamProgramChange(ch, prefs.program)`, `jamNoteOn/Off`.
   - Volume through CC7 on the leased channel only (`jamControllerChange(ch, 7, …)`) from `getLessonVolume` / `subscribeLessonVolume`. `setJamMasterVolume` is not used because it is global.
   - `playGuitarGuideNote(midi, durSec, vel, toneTime?)` scales velocity by `GUIDE_VELOCITY_SCALE`. Tone times are turned into `setTimeout` calls (`(time − Tone.now())·1000`), and the handles are kept so `cancelScheduledGuitarNotes()` can clear them.
   - `strumGuitarChord(midis, durSec, vel, toneTime?)` staggers strings low to high, 12 ms apart.
   - `guitarLessonVoice: LessonVoice` for `useDemoPlayback`.

10. **`src/curriculum/guitar/useGuitarLessonEvaluation.ts`** — the container-side guitar path. It is always called and does nothing when `!isGuitar`.

    - **Inputs:** `isGuitar`, `pianoRollEvents`, `targetNotes`, `isIT`, `activityState`, `activityStateRef`, `activityInstanceId`, `stepIndex`, `activeSection`, `completedEventIdsRef`, `setHoldTick`, `holdTick`, `setUserNotes`, `setActiveMidis`, `heardTicksAt(perfMs)`, `soundingTicks`, `currentTickRef`, `isPlayingDemo`, `metronomeOn`, `keyRoot`, `scaleIntervals`.
    - **Returns:** `{ noteHoldMeta, performanceMeta, userChords, activeChord, stepKind, buildPolicy(countInOffset): AssessmentPolicy }`.
    - Subscribes to `subscribeNoteOn/Off/subscribeChord`.
    - Stamps audio events with `heardTicksAt(e.onsetPerfMs)` and MIDI with `soundingTicks()`, falling back to `currentTickRef` (OOT).
    - Snaps audio notes that are octave-equivalent to the current target group.
    - OOT holds: D7, writing to the container's `completedEventIdsRef` and calling `setHoldTick`, so the existing auto-complete effect at 1160-1196 fires unchanged.
    - IT `performanceMeta`: a chord `'on'` inside `[g.start−240, g.start+g.dur)` with score ≥ 0.6 sets `startTick` for every event in the group; `'off'` or the next strum sets `endTick`. Notes use the same window with pitch or snapped match.
    - `userChords` and internal state reset whenever `[activityInstanceId, stepIndex, activeSection]` change or the activity leaves practice/performance. This covers every existing reset site without editing them.
    - Echoes MIDI through `guitarVoice` when `prefs.echoMidi` is on; audio input is never echoed.
    - Calls `setSuppressed(isPlayingDemo || (guidePlaying && prefs.bleedDetected))`.
    - Metronome click filter: drop audio notes with midi 72 or 84, within 40 ticks of a beat and shorter than 150 ms, while the metronome is on.
    - Calls `setEvaluationMode(isActive ? stepKind : 'off')`, `setExpectedNotes`, and `setKeyContext(keyRoot % 12, flow.params.defaultScale)`.
    - `classifyGuitarStep()` is exported.

11. **`src/learn/components/guitar/GuitarInputSetup.tsx`** — setup modal, placed by the UI/TAB subsystem. Steps:

    1. Source: audio (device list via `getAudioInputs`, channel via `probeDeviceChannelCount`) or MIDI guitar.
    2. Level check with trim.
    3. Gate calibration (2 s of quiet; gate = clamp(ambient × 2.5, 0.003, 0.03)).
    4. Tuner: `React.lazy(TunerDisplay)` with `deviceId={null} externalAnalyser={guitar.getTunerAnalyser()} instrumentType="guitar"`. No second `getUserMedia`. Lazy loading keeps the DAW store off the lesson's critical path. The detector's `tuningCents` is shown as a global offset.
    5. Chord check: pass when E minor is reported stably for 500 ms or more.
    6. Bleed test: the GM guitar strums C for 1.5 s; if the detector reports C, set `bleedDetected`, recommend headphones, and warn against Bluetooth-headset mics.
    7. Optional timing check: strum along with 8 clicks; the median offset becomes `inputLatencyMs`.
       Saves prefs.

12. _(Phase 2, flag `GUITAR_OFFLINE_REFINE`)_ **`src/learn/audio/guitar/refineChordTake.ts` and `offlineChordRefine.worker.ts`**
    - Reuses DAW `AudioRecorder` on `capture.getStream()`; record the `perfMs` at MediaRecorder `onstart`.
    - After the take, run `analyzeChords(buffer, keyRootPc, ionian)` (no bpm) in the worker.
    - Frame centre = `startPerfMs + timeMs + 16384/sr·1000`.
    - Offline identity for each group = the most common frame identity within the group's span.
    - 3 s timeout; if it fails, keep the live result.

### Modified files

- **`src/daw/hooks/useAudioChordDetection.ts`**
  - Replace lines 40-45 and 54-166 with a `ChordAnalysisStream` plus a host:
    - `resolveSource` = lines 67-94 lookup, with `sourceKey = trackId` and `inputType` from `VOCAL_TYPES`;
    - `resolveKey` = lines 127-134;
    - `onIdle` = lines 98-101;
    - `onFrame` = lines 168-287 verbatim; idle frames skip them, as today's early return does.
  - Line 194 uses `CHORD_VOTE_LATENCY_MS`.
  - Cleanup at 292-299 calls `stream.stop()`.
  - `THROTTLE_MS` (line 29) becomes `CHORD_STREAM_THROTTLE_MS`.
- **`src/daw/audio/AudioChordDetector.ts`** — add `export const DETECTABLE_CHORD_QUALITIES = TIER1_QUALITIES` (lines 118-157) and export `CHORD_PRIOR` (73-112). No logic change.
- **`src/daw/audio/instrumentPitchProfiles.ts`** — add `orchestratorOptionsFor(profile, mode): OrchestratorOptions` (a type-only import). **`src/daw/hooks/useGuitarMidiDetection.ts:166-180`** uses it (identical values).
- **`src/hooks/music/useMidiInput.ts:3-8`** — `MidiNoteEvent` gets `onsetPerfMs?: number` (optional, additive).
- **`src/hooks/music/useLearnInput.ts`**
  - Options (30-37): `instrument?: 'piano'|'guitar'` (default `'piano'`), `guitarPrefs?: Partial<GuitarInputPrefs>`.
  - Return (39-72): `instrument`, `subscribeChord(cb): () => void`, `guitar: GuitarInputHandle | null`.
  - New refs: `guitarEngineRef`, `midiChordAggRef`, `chordSubscribersRef`.
  - `start()` (251-283): **only if guitar and `prefs.source === 'audio'`**, start the engine first (generation-guarded; on error set `error` but keep going to MIDI). Its callbacks feed the existing note subscriber sets and `activeNotesRef`, plus the chord subscribers; set `activeSource('audio')`; inputLevel is set at 15 Hz. For guitar, the MIDI aggregator subscribes to the note sets.
  - `stop()` and `stopAudio` (226-247, 285-299) also stop the guitar engine.
  - `setKeyContext`, `clearKeyContext`, `setExpectedNotes` (325-341) forward to the engine.
  - Update the header comment: MIDI-only for piano, audio only for guitar.
- **`src/learn/context/LearnInputContext.tsx`** — `StableContextValue` (30-45) and the stable memo (72-104) gain `instrument`, `subscribeChord` and `guitar`. No change to the Provider signature (options are passed through).
- **`src/curriculum/hooks/useGenreAssessment.ts`**
  - `AssessmentResult`: optional `missedChords?: string[]; wrongChords?: string[]`.
  - `assessPitchOnly` and `assessPitchAndTiming` gain a trailing optional `opts?: { match: 'exact'|'octave_tolerant'; octaveCredit?: number }`. When it is absent, the current body runs unchanged. When present, new internal functions `assessPitchOnlyTolerant` / `assessPitchAndTimingTolerant` run: candidates include ±12, scoring goes through `scoreNoteContinuous(..., {octaveEquivalenceWeight})`, and a note is wrong only if it matches no target and no target's octave.
  - New exports: `UserChordEvent {rootPc; quality; pcs; onset; duration; confidence; source}`, `TargetChordGroup {onset; duration; pcs; rootPc; midis}`, `groupTargetChords(targets)` (root = `identifyChordFromPitchClasses(pcs, lowestPc).rootPc`), `AssessmentPolicy = {kind:'notes'; match} | {kind:'chords'; userChords}`.
  - `assessChordsPitchOnly`: pitch accuracy = mean best identity per group; hit if ≥ 0.8; wrong = events matching no group at ≥ 0.6; same penalty; pass at ≥ 0.75 with nothing missed.
  - `assessChordsInTime`: candidates at ≥ 0.6, closest onset (non-exclusive, as in piano); `scoreNoteContinuous` gives timing and duration using D8 ratios; the pitch term becomes the identity score; same weights, penalty and 0.6 pass mark; chord failure feedback text.
  - `assess(...)` gains an optional 7th parameter `policy?`. When undefined, the existing branches run unchanged.
- **`src/curriculum/hooks/useDemoPlayback.ts`** — `useDemoPlayback(keyRoot, tempo, voice?: LessonVoice)`. If `voice` is undefined, the existing piano calls run unchanged. For guitar, groups with 2 or more notes go to `voice.strum`.
- **`src/curriculum/pages/GenreLessonContainerV2.tsx`**
  1. Read `const isGuitar = (flow.params.instrument ?? 'piano') === 'guitar'`. This is a new optional field in `ActivityFlowParamsV2`, owned by the flow subsystem. The wrapper at 2259-2265 passes `instrument` to `LearnInputProvider`.
  2. Line 278-279: `useDemoPlayback(keyRoot, tempo, isGuitar ? guitarLessonVoice : undefined)`.
  3. Add `if (isGuitar) return;` guards to the piano hold-tracking effect (601-626), the `performanceMeta` effect (695-729) and the piano subscription effect (894-948). Add `isGuitar` to their dependencies.
  4. After 877, add `heardTicksAt(perfMs)`: the `playbackTicks` formula (850-864) with `(performance.now() − perfMs)/1000` subtracted, minus `COUNT_IN_OFFSET`. `playbackTicks` itself is untouched.
  5. After 948, call `const guitarEval = useGuitarLessonEvaluation({...})`. Render and TAB props use `isGuitar ? guitarEval.noteHoldMeta : noteHoldMeta` and the same for `performanceMeta`.
  6. `handleComplete` (971-978): pass `isGuitar ? guitarEval.buildPolicy(isIT ? COUNT_IN_OFFSET : 0) : undefined`. Phase 2: await refinement before `recordResult`, recording once.
  7. Practice guide (1341): `isGuitar ? playGuitarGuideNote(...) : playGuideNote(...)`. At 1295, for guitar also `await loadGuitarVoice()`. `handleStopPractice` and `stopDemo` paths call `cancelScheduledGuitarNotes()` when guitar.
  8. `handleStartPerformance` (1412-1430): for guitar audio with `bleedDetected`, pass `backing_parts.engine_generates` filtered to `['drums']` into `startBacking`.

## Reuse list

- `src/daw/audio/AudioChordDetector.ts` — `AudioChordDetector`, `analyze`, `setKeyContext`, `reset` (unchanged).
- `src/daw/audio/OfflineChordAnalyzer.ts` — `analyzeChords` (Phase 2, no bpm).
- `src/daw/hooks/useAudioChordDetection.ts` — its loop is extracted.
- `src/daw/audio/NodeTapCapture.ts`; `src/learn/audio/v2/StreamingAudioCapture.ts` (`StreamingCaptureLike`).
- `src/learn/audio/v2/ProbabilisticOrchestrator.ts`; `src/learn/audio/v2/OnsetStream.ts`.
- `src/daw/audio/instrumentPitchProfiles.ts` (`GUITAR_PITCH_PROFILE`).
- `src/daw/hooks/useGuitarMidiDetection.ts:165-181` (mono configuration).
- `src/daw/midi/AudioInputEnumerator.ts` (`getAudioInputs`, `probeDeviceChannelCount`).
- `src/audio/core/AudioContextOwner.ts`.
- `src/daw/components/Controls/TunerDisplay.tsx` and `src/daw/hooks/useTuner.ts` (external analyser mode).
- `src/components/JamRoom/jamSoundFont.ts` and `src/audio/instruments/SoundFontInstrument.ts` (GM programs 24/25; `src/daw/instruments/gmPrograms.ts:63-64`).
- `src/learn/audio/lessonVolumeStore.ts`; `src/learn/audio/practiceGuide.ts` (`GUIDE_VELOCITY_SCALE`).
- `src/curriculum/engine/continuousMatchers.ts` (`scoreNoteContinuous` with `octaveEquivalenceWeight`).
- `@prism/engine` `CHORDS` and `ALL_MODES`; `src/lib/chordNotation` (`parseChord`, `qualityIntervals` in the data-validation test).
- `src/daw/audio/AudioRecorder.ts` (Phase 2).
- `src/learn/audio/v2/__tests__/testUtils.ts` (`createMockAnalyser`, `makeSine`).

## Risks and mitigations

- **R1 — false notes, speaker bleed, metronome C5/C6 clicks.** Covered by D11. The chord path is naturally resistant (it needs at least 2 pitch classes and a stable vote). Harmonic backing parts are muted when bleed is detected.
- **R2 — detector latency and fast chord changes.** Onset-anchored events handle timing; the 450 ms revise window handles late identity flips. Book Music Maps change chord per bar or half bar, so strum counting comes from onsets.
- **R3 — label ambiguity (Am7/C6, sus/add from open strings).** Set-equality scoring plus the 0.6 superset credit (which does not pass the OOT threshold).
- **R4 — mono octave errors on the low strings.** Expected-note prior, octave-tolerant matching with credit 0.75 for audio.
- **R5 — Studio regression.** Golden equivalence test between the stream and the old tick logic; only additive `export`s in the detector.
- **R6 — Firefox refuses mismatched sample rates on the shared context.** Fall back to a dedicated context; timing is based on `performance.now()`, so it is unaffected.
- **R7 — CPU (YIN plus a 16384-point read, plus onsets).** The same load as the Studio runs; hi-res decimation ×6; the 40 Hz loop only reads a 512-point analyser.
- **R8 — MIDI guitar same note on different strings/channels collides** (note-off is keyed by note number in the shared handler). This is accepted; the aggregator uses held pitch classes, and the shared handler is not changed.
- **R9 — `applyRegisterRules` would move guitar targets.** A flow-subsystem dependency: register rules must be skipped when `instrument === 'guitar'`. A test asserts guitar targets survive `resolveStepContent` unchanged.
- **R10 — no active idle policy today (`suspendForIdle` is unused).** A comment requires any future idle policy to respect an active capture.

## Tests

- `src/daw/audio/__tests__/AudioChordDetector.test.ts`: synthetic dB spectra plus RMS through `createMockAnalyser` (fftSize 16384). Open C (C3 E3 G3 C4 E4) is reported as C major within 10 frames; open Am7 gives an identity score of 1; silence gives null; a single pitch class gives null; the diatonic boost resolves an ambiguous frame; frames-to-detect ≤ 6 (checks `CHORD_VOTE_LATENCY_MS`).
- `src/daw/audio/__tests__/ChordAnalysisStream.test.ts`: `step()` matches an inline copy of the old `useAudioChordDetection` loop over a scripted sequence (source switches, guitar↔vocal recreate, key changes, idle). `chordResultToMidiNotes` matches the old 151-166 mapping. Throttle is tested with a stubbed `requestAnimationFrame`.
- `src/learn/audio/guitar/__tests__/chordIdentity.test.ts` — the score matrix; `identifyChordFromPitchClasses` for all book qualities; bass preference.
- `.../GuitarChordSegmenter.test.ts` — onset attribution, fallback −300 ms, same-strum revision, re-strums of the same chord, release offset, click onset without identity dropped, gate closure.
- `.../MidiGuitarChordAggregator.test.ts` — strum window, ghost filter, on/change/off.
- `.../GuitarLearnInputEngine.test.ts` — with fake capture, orchestrator and stream: mode gating, suppression, 60 ms confirm, onset attribution, latency offset.
- `src/hooks/music/__tests__/useLearnInput.guitar.test.tsx` (jsdom): **piano (default) never calls `getUserMedia`**; guitar audio starts the engine; MIDI source does not open the mic; chord subscription works.
- `src/curriculum/__tests__/useGenreAssessment.guitar.test.ts` (new file; the existing 139-line file is untouched): `assess` without a policy gives results identical to the direct calls on the existing fixtures; octave-tolerant OOT and IT; chord OOT pass with a strummed open C against the book voicing; IT timing and duration including let-ring vs staccato; wrong-chord penalty; missed chord.
- `src/curriculum/guitar/__tests__/useGuitarLessonEvaluation.test.tsx` — OOT group completion writes `completedEventIdsRef`; re-strum required for repeated groups; IT `performanceMeta` window; resets on instance, step or section change; no echo for audio, echo for MIDI.
- Flow-data test (with the flow subsystem): every guitar chord step's `groupTargetChords` identity equals its `chordSymbols` (`parseChord` + `qualityIntervals`); no mixed steps; register rules leave guitar notes unchanged.
- Studio manual QA checklist: live chord lane, recording snapshots and offline proposal, vocal-fx switch.

## Open questions

1. Should duration be graded at all for guitar _audio_ on B3 staccato/legato steps? The proposal is D8 (let-ring, but staccato must mute). The alternative is to grade only pitch and timing for audio input.
2. Should the setup modal be required before the first guitar lesson, or skippable (defaults: gate 0.01, no bleed check)?
3. Should electric guitar through an interface get an optional "monitor input" (`inputGain` to output)? It can feed back on speakers; the proposal is off by default, shown only when the source is an interface.
4. Default GM program: 25 (steel) or 24 (nylon), or tied to a user preference?

### Critical Files for Implementation

- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/daw/hooks/useAudioChordDetection.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/hooks/music/useLearnInput.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/hooks/useGenreAssessment.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/pages/GenreLessonContainerV2.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/daw/audio/AudioChordDetector.ts
