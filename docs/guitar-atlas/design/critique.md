## Guitar in Learn: adversarial review of the three sub-plans

> **Placement update (2026-09-29).** The guitar content moved from Technique ("Applied Theory Fundamentals") to **Learn → Theory → Ionian (Major)**. It is at `/learn/guitar/ionian` (overview) and `/learn/guitar/ionian/:key` (lesson); the old `/curriculum/guitar/applied-theory-fundamentals` paths redirect there. Access follows Theory: C free, the other keys Premium. With Guitar selected, Technique is hidden and the other Theory tiles show "Coming soon for guitar". Ids are unchanged, so progress carries over. Route and placement notes below predate this.

I checked the claims against the code. Nearly all cited line numbers and APIs are correct; the exceptions are listed as issues below. One brief correction first: the project uses `react` 18.3.1, not React 19. `react-router` 6.30.3, `vexflow` 5.0.0, `tone` 15.0.4 and `tsx` 4.19.3 are installed.

### (1) Issues (severity, problem, fix)

**H1 (High): Chord changes faster than about 600 ms can't be judged from the detector's smoothed output.**

- Verified numbers:
  - `AudioChordDetector` uses a 16384-point analyser, which is a 341 ms window at 48 kHz.
  - Its vote needs a 0.55 weighted share of a 10-frame window with 0.85 decay, which takes about 5 frames (250 ms) after the chroma changes.
  - Identity therefore arrives about 350–500 ms after the strum.
- B4.4 and B4.5 (a new chord every eighth note: 500 ms at 60 BPM, 300 ms at 100 BPM) will be judged wrong. input-eval's segmenter ties an onset to the identity reported 150–450 ms later, so it overlaps the next strum.
- The Phase-2 offline refinement cannot fix this. `OfflineChordAnalyzer` uses `FFT_SIZE = 32768`, a 680 ms window.
- The IT timer also races the last chord. `totalMs = (maxContentTick + 1920) × msPerTick`. At 60 BPM, B2.4's last strum is at about 5.5 s, its identity arrives around 5.9 s, and the timer fires at 5.98 s.
- Fix:
  - Add a read-only accessor to `AudioChordDetector.ts`, e.g. `getLastFrameMatch()`, that returns the match `matchChord()` produced before the vote. No logic change.
  - The segmenter votes locally in a window after each onset: `[onset+60ms, min(nextOnset, onset+600ms)]`. The smoothed vote is used only for the "heard chord" chip.
  - For guitar audio, flush the segmenter and add about 500 ms of grace before `handleComplete`.
  - Test that the stream and grace work on real recordings (Phase 7a) before building on them.

**H2 (High): Arpeggios where the strings ring (B1/B5/B7 = 28 steps per key) break the Studio's single-note detector.**

- The direction copy says to fret the shape and pick each string. The strings then ring together, and the mono pitch tracker (YIN) will lock onto the ringing lower strings.
- Fix: decide after the Phase 7a recording test. The options are:
  - per-onset checking against only the next expected note, using the detector's strong prior for expected notes;
  - plus the chord detector's growing chord as secondary credit (its `MIN_ACTIVE_PCS = 2` allows it once two strings ring);
  - or the polyphonic tracker, if the recordings favour it.

**H3 (High): The microphone would open at lesson mount, possibly on a suspended audio context.**

- The container calls `startInput()` on mount (`GenreLessonContainerV2.tsx:889-892`). input-eval starts the audio engine inside `start()`.
- That causes a permission prompt on page load. The noise-floor calibration (`AdaptiveNoiseFloor`) then runs on a context that may still be suspended.
- The OOT Play Now path (`handleStartPerformance` at :1449-1452) never calls `startTone()`.
- Fix:
  - Add `guitar.enable()` and call it only from a user gesture: the setup modal, or the first Practice / Play Now press.
  - On the guitar paths, call `audioContextOwner.resume()` or `startTone()` first, then recalibrate.
  - Test that nothing calls `getUserMedia` before a gesture.

**H4 (High): The sub-plans' types conflict and would not compile or merge together.** Details and the chosen resolution are in U1–U6 below:

- where the instrument field lives;
- how fret positions are stored on notes;
- two different `src/lib/guitar/fretboard.ts` files (see H6);
- two `GuitarChordShape` definitions;
- two `step.guitar` types;
- two names for the flow builder.

**H5 (High): content-data never updates `toPianoRollEvents`, so fret positions never reach the TAB view.**

- `toPianoRollEvents` (`resolveStepContent.ts:251-266`) is typed to return the Games `NoteEvent` from `PianoRollPlay.tsx:7-15`, which has neither `hand` nor fret fields.
- Fix: add a conditional spread `...(note.fretPosition ? { fretPosition } : {})` and widen the return type to a local lesson-event type. Test that piano event objects keep the same keys.

**H6 (High): The two `fretboard.ts` plans number strings in opposite directions.**

- ui-ia's `STANDARD_TUNING` array is indexed with string 1 first. content-data's `parseShape` puts string 6 at index 0.
- Fix: key the tuning by string number (`Record<GuitarStringNumber, number>`). Document `parseShape`'s order. Add tests: `midiAt(6,3)=43` and `'X-3-2-0-1-0'` gives [48, 52, 55, 60, 64].

**M1 (Medium): input-eval rewrites the Studio's `useAudioChordDetection.ts` without need.**

- The user asked to reuse the detector, not to change the Studio.
- Fix: the new `ChordAnalysisStream` calls `AudioChordDetector` directly. Only additive exports go into `AudioChordDetector.ts` (`TIER1_QUALITIES`, `CHORD_PRIOR`, the frame accessor). Leave the Studio hook alone; migrating it is an optional last phase.

**M2 (Medium): The Db and Eb true-octave boxes are not in the book.**

- The new shapes (`X-16-18-17-18-X`, `X-18-20-19-20-X`) conflict with "only Guitar Atlas material". The book's drawn Db and Eb boxes are theory-correct maj7 chords; only the "octave" label is wrong.
- Fix: default to the drawn shape labelled "1 maj7" (not an octave). Record the true octave as a suggested correction in the errata. Add an exception to the integrity test. Ask the user.

**M3 (Medium): Enharmonic keys produce a flow whose key disagrees with its content.**

- `/gflat` resolves to `Gb`, which is not a book key. The builder falls back to C content, but `defaultKey` would still say `Gb Major`, so `keyRoot` becomes 66.
- Fix: map Gb→F#, C#→Db, G#→Ab, D#→Eb, A#→Bb, Cb→B, E#→F. Build `defaultKey` from the resolved book key. Add a test.

**M4 (Medium): Four ways to build a chord timeline.**

- ui-ia's `chordShapeTimeline`, input-eval's `groupTargetChords`, content-data's `chordTargets`, and the existing `src/curriculum/engine/genreGeneration/chordTimeline.ts` (`buildChordTimeline`, `chordAtTick`).
- Fix: `step.chordTargets` is the single source (see U8). Don't add a second `chordTimeline.ts`.

**M5 (Medium): What `activeMidis` means for audio chords is undefined.**

- If input-eval feeds `chordResultToMidiNotes` (octave 4) into `activeMidis`, the Fretboard marks them wrong and the container's colour logic turns grey.
- Fix: for audio chords, leave `activeMidis` empty. Pass `heardChord` and show a hit on the target shape when identity ≥ 0.8.

**M6 (Medium): Guide notes scheduled with `setTimeout` have about 8 stop sites.**

- The GM guitar ignores `NoteOptions.time` (`SoundFontInstrument.noteOn`), so `setTimeout` is necessary. But `Tone.getTransport().cancel()` doesn't cancel those timeouts.
- Fix: one effect in the guitar hook cancels all scheduled notes whenever `activityState !== 'practice'`, or on `activityInstanceId`, step or section change.

**M7 (Medium): Nobody owns the setup modal's entry point, the input status, or error states.**

- input-eval says the UI places `GuitarInputSetup`. ui-ia only offers an `inputStatus` slot. The container shows no `LearnInput.error` today.
- Fix: assign to ui-ia (U14).

**M8 (Medium): The metronome click is pitched and sweeps.**

- It is a `MembraneSynth` playing C5/C6, and its pitch sweeps down. C5 (72) is a real target in C pentatonic.
- Fix: gate on the scheduled click times (transport beat → `performance.now()`) instead of on MIDI 72/84. Recommend headphones in setup.

**M9 (Medium): The generator script would break `npx tsc -b`.**

- `tsconfig.node.json` includes `scripts/` with `lib: ES2023`, no DOM and no `@/` path aliases.
- Fix: the generator uses relative imports of DOM-free modules only, or is written as `.mjs`.

**M10 (Medium): The source extraction lives only in the session scratchpad.**

- Fix: commit the slim fixture in Phase 0.

**M11 (Medium): Some guitar rules differ from piano and need user sign-off.**

- Guitar B3 puts one chord per beat (piano spaces chords by their length: 0/140 ticks).
- Out-of-time holds complete while the chord is still ringing (D7).
- Ringing notes are not penalised for being long (D8).
- Chords are scored by pitch-class identity.
- Fix: list these explicitly in the PR description. Piano B3 stays unchanged.

**M12 (Medium): content-data's parity claim for B1 cannot hold.**

- A guitar shape arpeggio has 5–6 notes; piano's has 3.
- Fix: parity for B1 means the same pitch-class set, ascending order, one note per beat, 460 ticks. It does not mean the same number of onsets.

**M13 (Medium): Keep the edits to the 2,265-line container minimal.** Drop:

- the variant merge (no variants);
- the `isDualStaff` guard (guitar never sets `instrument_config`);
- the `guitarHints` / `resolveFretPositions` memo (data guarantees positions; keep only a dev check in `LearnTabView`);
- input-eval's "filter backing to drums" (dead code: neither flow has `backing_parts`).

**Low**

- **L1:** `LessonVoice` doesn't exist. Define it in `useDemoPlayback.ts`.
- **L2:** `GuitarFxAdapter` asks for `channelCount: { ideal: 32 }`, not 2.
- **L3:** `jamProgramChange` does nothing until the synth has loaded. Await `initJamSynth()` and reapply the program. Preload after the first gesture.
- **L4:** A VexFlow `TabNote` with no positions throws `NoYValues` (`tabnote.js` `draw`). Hidden or empty items must be `GhostNote`.
- **L5:** `TunerDisplay` and `useTuner` import `@/daw/store`. Lazy-load them and confirm the import has no side effects, or leave the tuner out of the first release.
- **L6:** Hand-graphic finger "fixes" don't change app data, because hand graphics are dropped. Set `appDataChanged: false`, or the cross-check test fails. The exception is the G#m barre, which does change fingering.
- **L7:** Octave credit of 0.75 lets a whole scale played an octave off pass out-of-time (the pass mark is 0.75). Use ≤ 0.7, or require at least 50% exact.
- **L8:** For `heardTicksAt`, prefer `AudioContext.getOutputTimestamp()` to map `performance.now()` to context time.
- **L9:** Map bars without a stored diagram window need `diagramStartFret ?? defaultDiagramStart(frets)`.
- **L10:** Add `flow` to the guitar hook's reset dependencies, for key-to-key navigation.
- **L11:** The generic `components/guitar` should not import from `curriculum/data`. Shared primitives go in `lib/guitar`.

**Missing tests**

- `toPianoRollEvents`: fret positions pass through, and piano event keys are unchanged.
- A jsdom smoke test of the container with Tone, sampler and VexFlow mocked:
  - piano: keyboard present, no `getUserMedia`, `assess` called without a policy;
  - guitar: TAB and guitar visuals present, and MIDI-guitar note-ons drive the out-of-time auto-complete.
- Enharmonic key mapping.
- The IT completion grace period.
- Cancelling scheduled guitar notes.
- No audio start before a gesture.
- Offline tests on recorded WAV fixtures for detector accuracy (Phase 7a).

### (2) Unified decisions where the sub-plans disagree

- **U1 Instrument field:** `ActivityFlowParamsV2.instrument?: LessonInstrument` (`'piano' | 'guitar'`), read through `flowInstrument(flow)`. `isGuitar` is defined once in the container, near `keyRoot` (~:250). ui-ia's `flow.instrument` is dropped.
- **U2 Note positions:** `fretPosition?: FretPosition` on `TargetNote`, `GenreNoteEvent` and GenrePianoRoll's `NoteEvent`, passed through `toPianoRollEvents` with a conditional spread. Invariant: `midi === fretToMidi(fretPosition)`.
- **U3 `src/lib/guitar/`** (owned by the data phase):
  - `types.ts`: `GuitarStringNumber` (1 = high E … 6 = low E), `FretPosition`, `GuitarBarre {fret, fromString, toString, finger?}`, `GuitarFingerPlacement`, `GuitarShapeDiagram {frets: 'X-3-2-0-1-0' (string 6→1), diagramStartFret, fingering, barre?}`.
  - `fretboard.ts`: tuning as a Record keyed by string; `fretToMidi` / `midiAt`; `parseShape`; `shapeNotes`; `shapePitchClasses`; `fretSpan`; `positionsFor`; `nearestPosition`; `fretWindow`; `defaultDiagramStart`.
- **U4 Chord shapes:** the curriculum `GuitarChordShape extends GuitarShapeDiagram` with degree, quality, `isOctaveRepeat` and `erratumIds`. `ChordBox` and `ScaleBox` take the lib diagram types. A pure adapter, `src/curriculum/components/guitar/guitarVisualModel.ts`, builds them from step metadata.
- **U5 Step fields:** `ActivityStepV2.guitar?: GuitarStepMeta` (ids only) plus `chordTargets?: ChordTarget[]`. No `GuitarStepVisuals`, no `ActivityVariant.guitar`.
- **U6 Naming:**
  - builder `buildGuitarAppliedTheoryFundamentalsFlow` in `src/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals.ts`;
  - genre `guitar-applied-theory-fundamentals`;
  - routes `/curriculum/guitar/applied-theory-fundamentals[/:key]`;
  - ui-ia's lazy page, which sets the instrument to guitar on mount.
- **U7 Scale id:** `defaultScaleId: 'major'`, the same as piano. The resulting colour mismatch with the picker tile already exists. Adding `major: 'ionian'` to `SCALE_TO_MODE` would change piano's colour, so ask first.
- **U8 Chord timeline:** comes from `chordTargets[].onsetTick`, plus `COUNT_IN_OFFSET` in time. The evaluator consumes `chordTargets`; `groupTargetChords` is only a test oracle.
- **U9 Arpeggios:** judged in single-note mode, per note, as piano does. `attack: 'arpeggio'` targets are for display only unless the Phase 7a test says otherwise.
- **U10 Chord identity:** voted locally in a window after each onset over per-frame matches (H1). The smoothed vote is for the UI only.
- **U11 Studio:** `useAudioChordDetection.ts` is untouched. `AudioChordDetector.ts` only gains exports.
- **U12 Tempo:** guitar `tempoRange` is [60, 100].
- **U13 Octave box:** the book's drawn voicing by default (M2), pending the user.
- **U14 Input UI ownership:** input-eval builds `GuitarInputSetup`. ui-ia places an input chip (source, level, "Set up", error or permission-denied state that falls back to MIDI) in `GuitarLessonVisuals`, and auto-opens setup before the first Practice or Play Now when no settings are saved.
- **U15 Type names:** `LessonInstrument` lives in `activity.v2.ts`. The instrument store's menu type is `LessonInstrument | 'bass' | 'ukulele'`.
- **U16 Container edits** (the only ones allowed): imports; `isGuitar`; the StepContext instrument; the `useDemoPlayback` voice; guards on the three piano input effects (601, 695, 894); `heardTicksAt` plus the guitar evaluation hook after 948; the `handleComplete` policy and grace period; the guide-note switch at 1341 and preload at 1295; `instrument` and meta selection on GenrePianoRoll; the keyboard/visuals swap (1932-1990); dot wrap (1628); `instrument` on the `LearnInputProvider` wrapper (2261).
- **U17 Rollout flag:** a localStorage flag, following the `AudioSystemSelector` pattern, hides Guitar in the picker until audio evaluation ships.

### (3) Phase order (each phase: `npx tsc -b` and vitest green)

- **P0 Safety net:**
  - commit the slim fixture;
  - golden snapshots of the piano flow for all 12 keys, and of the piano notes after `resolveStepContent`;
  - piano never calls `getUserMedia` (`useLearnInput`);
  - pin `LearnNotationView`'s note styles before extracting them.
- **P1 Library and data:** `lib/guitar`, the 12 key files from the generator, errata (TypeScript and `docs/guitar-atlas/book-one-errata.md`), integrity tests (fixture diff, errata cross-checks). Nothing is imported by the app yet.
- **P2 Types, resolver and flow:** additive types; the resolver bypass; one StepContext line in the container; the builder and flow tests (counts 20/46/9, parity, `chordTargets`, rests over two passes). Golden snapshots still pass.
- **P3 Navigation behind the flag:**
  - instrument store, selector, technique catalog, routes, key picker, lazy page.
  - Test: routes resolve (`matchRoutes`), selector and catalog tests pass.
  - Manual: all 12 keys work with a MIDI guitar through the existing exact-MIDI path. The book shapes are exact MIDI, so this needs no evaluator changes.
  - Manual piano QA.
- **P4 TAB and guitar visuals:** `buildTab`, `TabStaffView` and its CSS, `LearnTabView`, the toggle, the guitar branch in GenrePianoRoll, 8vb notation, the diagram components and `GuitarLessonVisuals`.
  - Test: rendering with real VexFlow; GenrePianoRoll still shows the roll by default.
  - Manual: rests, the white-rect fix, readable digits, Studio staff unchanged.
- **P5 Guitar sound:** `LessonVoice` and `guitarVoice` (GM 24/25) for demo, practice guide and MIDI echo; the single cancel effect. Test scheduling and cancel.
- **P6 Scoring core and MIDI guitar:** `chordIdentity`, the MIDI chord aggregator, assessment policies (with "no policy gives identical results" tests), the guitar evaluation hook for MIDI, the three guards, the `handleComplete` policy. Manual MIDI-guitar QA.
- **P7a Recording test (go/no-go):**
  - Record WAV fixtures of scales, ringing arpeggios, quarter- and eighth-note chord changes at 60/80/100 BPM, re-strums with rests, and metronome bleed.
  - Replay them offline through `AudioChordDetector` (raw and voted) and the single-note pipeline.
  - Fix the arpeggio strategy (H2), B4.4 handling (H1) and the constants.
- **P7b Audio input:** capture, the new `ChordAnalysisStream`, onset-window segmenter, engine, gesture-gated `useLearnInput` branch, context additions, setup modal and chip, click filter, completion grace.
  - Test: piano never calls `getUserMedia`; engine tests.
  - Manual: Chrome, Safari and Firefox; built-in mic and audio interface; speakers and headphones.
- **P8 Launch:** remove the flag, add search and assistant entries, finalise the errata doc, run a full regression plus a manual check of the Studio chord lane.
- **P9 Optional:** offline refinement for steps with half-note or slower changes; move the Studio hook onto `ChordAnalysisStream`.

### Critical Files for Implementation

- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/pages/GenreLessonContainerV2.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/engine/genreGeneration/resolveStepContent.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/types/activity.v2.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/daw/audio/AudioChordDetector.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/hooks/music/useLearnInput.ts
