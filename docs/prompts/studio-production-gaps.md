# Studio Production Gaps — Phased Master Prompt

> **Purpose.** Close the feature gaps that prevent the Music Atlas Studio from teaching a
> full audio-production curriculum through its interactive tutorial system ("Duolingo for
> the Studio"). Gaps were identified by decoding the beatspark reference lessons (Ableton
> UK-dubstep series) and auditing `src/daw/` on 2026-07-22.
>
> **How to use this document.** Run one phase per fresh Claude Code session, in order
> (P1 → P8, then the Capstone). Phases are dependency-ordered but individually
> self-contained — you may cherry-pick, except where a phase names a prerequisite.
> For every session: paste **§Shared Context** plus the single phase prompt.
> Every phase ships *teachable* — the Definition of Done includes tutorial
> instrumentation, a lesson, and E2E verification, not just the feature.

---

## §Shared Context (paste with every phase)

You are working in `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` — a Vite 8 +
React 18 + TypeScript app. The Studio (web DAW) lives in `src/daw/`, mounted by
`src/daw/DawApp.tsx` at `/studio/editor`.

### Architecture cheat-sheet

- **State**: one composed Zustand 5 store `useStore` (`src/daw/store/index.ts`,
  `AllSlices` = ~13 slices, `subscribeWithSelector` + `collabMiddleware`). Key slices:
  `tracksSlice` (tracks/clips/effects), `transportSlice` (bpm, loop, record, count-in,
  metronome, time signature), `uiSlice` (`currentView: 'arrange'|'studio'|'leadsheet'`,
  `channelStripTab`), `masteringSlice`, `prismSlice`, `tutorialSlice`.
- **Audio graph**: per track, `TrackEngine` (`src/daw/audio/TrackEngine.ts`) wires
  `instrument → gainNode → EffectChain → pannerNode → masterGain`. `AudioEngine`
  (`src/daw/audio/AudioEngine.ts`) wires `masterGain → mastering EffectChain →
  ctx.destination`. A module-level `trackEngineRegistry: Map<trackId, TrackAudioState>`
  lives in `src/daw/hooks/usePlaybackEngine.ts` (≈line 58, accessor `getTrackAudioState`)
  — reach any track's engine by id.
- **Effects**: `src/daw/audio/EffectChain.ts` — `EffectSlotType` union of 8 single-band
  slots (`compressor|gate|eq|reverb|delay|presence|de-esser|saturator`), each a
  `TrackEffectState` entry with `enabled` + params; per-track `Track.activeEffects`
  (max 5) and the mastering rack (`masteringFxChain`) use the SAME chain class.
- **Instruments**: engine-per-instrument factory `createInstrument(type, gmProgram)` in
  `usePlaybackEngine.ts` (≈line 85); `InstrumentType` union in
  `src/daw/store/tracksSlice.ts` (≈line 85); Add-Track cards in
  `src/daw/components/Mixer/AddTrackMenu.tsx` (`TRACK_TEMPLATES`).
  The Oracle Synth has its **own** Zustand store `useSynthStore`
  (`src/daw/oracle-synth/store/`), snapshotted per-track by
  `src/daw/oracle-synth/synthTrackState.ts` — it is NOT mirrored into the main store.
- **Persistence & collab — the 6-site touch-list.** Any new per-track field must be
  threaded through all of (copy the `drumPads` precedent):
  1. `src/daw/store/tracksSlice.ts` — `Track` field + action + track-creation defaults;
  2. the owning view/component (read from store, not local `useState`);
  3. `src/daw/hooks/usePlaybackEngine.ts` — apply to the engine on (re)create;
  4. `src/daw/persistence/SessionSerializer.ts` — `SerializedTrackSettings`,
     `trackSettings()`, `applyTrackSettings()`, AND the cloud paths
     `serializeSessionForCloud` / `deserializeCloudProject`;
  5. `src/daw/collab/diffEngine.ts` — scalars go in `TRACK_SCALAR_KEYS`; objects get a
     JSON branch;
  6. `src/daw/collab/YjsDocManager.ts` — `trackToYMap` + `yMapToTrack`.
- **Audio assets**: decoded `AudioBuffer`s live in the module-level `AudioBufferStore`
  (`src/daw/audio/AudioBufferStore.ts`) keyed by clip id; serialized clips carry a GCS
  `assetId` (upload via `@/lib/studio-assets/upload-pending`), never the buffer.

### Tutorial-system contract (every phase must satisfy it)

- **Lessons** are data in `src/daw/components/Tutorial/tutorials.ts`
  (`Tutorial`/`TutorialStep`). A step has: `stage`, `instruction` (`**bold**` supported),
  optional `hint`, `target` (a `data-tutorial-id` string or array — first id present in
  the DOM wins), optional `requires` (`{view, libraryOpen, channelStripTab}` —
  auto-applied on step entry), and a validation predicate:
  `check(s: AllSlices, armed: AllSlices)` for main-store state, or
  `synthCheck(synth, armedSynth)` for Oracle-Synth store state (never both). `armed` is
  the snapshot when the step arms — use it to require a *change*, not an absolute value.
  Steps with no predicate are free-form (user clicks Next).
- **Anchors**: add `data-tutorial-id` attributes to any region a lesson highlights.
  Existing conventions: `chanstrip-tab-<id>`, `add-track-<instrument>` (oracle-synth
  keeps legacy `add-track-synth`), `fx-add-<type>`, `fx-slot-<type>`, `view-switch-<id>`,
  `prism-*`, `drum-machine-view`, `grooves-browser`, `mixer-section`, `master-strip`,
  `mastering-section`, `synth-preset-selector`, `transport-bpm`, `add-track-button`.
  Canvas surfaces (timeline, piano roll, drum grid) can only anchor containers/toolbars,
  never individual cells/notes.
- **Detectability rule**: if the user's action doesn't change the main store or the synth
  store, a lesson cannot validate it. Never leave a new user-facing control in component
  `useState` — lift it (which also fixes persistence/collab).
- **Tests**: `src/daw/components/Tutorial/tutorialDetection.test.ts` — add pure tests for
  each new step `check`, and update the data-integrity test's expected `TUTORIALS.length`
  when adding lessons.

### Verification recipe (run for every phase)

1. **Toolchain**: `nvm use 20` first (engines.node=20; husky hooks call `npx yarn`).
2. **Static gates**: `npx prettier --write <changed files>`;
   `npx eslint --max-warnings 0 <changed files>`; `npx tsc -b` (capture the REAL exit
   code — don't pipe it away); `npx vitest run src/daw/components/Tutorial/tutorialDetection.test.ts`
   plus any new test files.
3. **E2E**: `VITE_DEV_AUTH_BYPASS=1 npx vite --port 5200 --strictPort` (DEV-only bypass
   renders `/studio/editor` as an authed premium user; NEVER weaken its
   `import.meta.env.DEV` gating). Drive with Playwright: the page exposes
   `window.__MA_STORE__` and `window.__MA_SYNTH_STORE__` under the flag. Sync lesson
   progress on `tutorialStepIndex` (never on UI text). Use REAL clicks for DOM controls;
   store calls only for canvas surfaces. Screenshot each new spotlight and READ the
   screenshots — verification has caught real bugs (missing anchors, wrong components,
   CSS-var scoping) every time. Prior drivers live in the session scratchpad
   (`pw/drive.js`, `pw/drive-pack.js`) — recreate the pattern if absent.
4. **Prod safety**: `npx vite build` then
   `grep -rl "dev-bypass-token\|dev@localhost\|__MA_STORE__\|__MA_SYNTH_STORE__" dist/`
   must return nothing.
5. **Audio correctness**: for DSP features, verify audibly-meaningful behavior via the
   Web Audio graph (e.g. assert node wiring in a unit test, or render a short
   `OfflineAudioContext` buffer in a vitest and assert RMS/peak expectations).

### Hard constraints

- **Do not touch the uncommitted Oracle-Synth v2 working-tree files** (Mod Matrix 2.0 +
  Key/Scale: `src/daw/oracle-synth/**`, `store/index.ts`, `store/uiSlice.ts`,
  `store/prismSlice.ts`, `hooks/useStoreBridge.ts`, `instruments/OracleSynthAdapter.ts`)
  — except Phase 8, which explicitly builds on that branch AFTER it lands. Check
  `git status --short` at session start; if those files are still dirty, avoid them.
- **Preset compatibility**: any `PresetData` schema change bumps `PRESET_VERSION` and adds
  a migration in `applyPresetData` (v1→v2 precedent in `presetSlice.ts`). Old projects
  must load unchanged.
- **Collab safety**: every persisted field must round-trip through the Yjs path (6-site
  list) or be explicitly documented as user-local (like mute/solo).
- **Premium gating**: Prism stays behind `LockedFeatureOverlay`; do not move features
  across the premium boundary without asking.
- Match the codebase's style: Tailwind + inline styles with `var(--color-*)` tokens
  (scoped to `.daw-root` — portals must copy tokens or use `var(--x, fallback)`),
  lucide-react icons, framer-motion.

### Definition of Done (every phase)

- [ ] Feature works end-to-end in the running app (not just tests).
- [ ] New user-facing state lives in the store; persisted + collab-synced (6-site list)
      or documented user-local.
- [ ] `data-tutorial-id` anchors on every new control a lesson targets.
- [ ] Lesson steps authored in `tutorials.ts` (extend an existing lesson or add one);
      checks are pure + unit-tested; integrity test updated.
- [ ] Static gates green; E2E lesson run completes + persists; screenshots reviewed.
- [ ] Prod build clean of dev-bypass markers; old projects still load.

---

## Phase 1 — Electronic drum kits (+ lift kit state into the store)

**Goal.** Ship at least two electronic kits — an **808-style** kit (long sub kick, clap,
crisp closed/open hats) and a **house/EDM** kit — alongside `natural`, and make kit
selection a first-class, persisted, collab-synced, tutorial-detectable track property.

**Why (lessons).** The Hip Hop and EDM lessons currently teach beats on an acoustic kit;
electronic genres need electronic timbres. Kit choice is also the canonical "pick a sound"
teaching beat, and today it is invisible to the tutorial engine.

**Current state.**
- `src/daw/instruments/DrumMachineEngine.ts`: `DRUM_KIT_CONFIGS` (≈line 15) has exactly one
  kit `'natural'`. Schema `DrumKitConfig = { id, label, baseUrl, samples:
  Record<midiNote, filename>, ext, defaultPan? }`; samples resolve as
  `${baseUrl}${filename}${ext}` under `/public/daw-assets/samples/drums/<kitId>/`;
  fixed 11-pad GM layout (`DRUM_PADS`); `setKit(kitId)` already reloads samples.
- Kit selection is **local** `useState` in
  `src/daw/components/Controls/DrumMachineView.tsx` (≈line 175); `handleKitChange`
  (≈line 292) calls the engine directly — nothing in the store, nothing persisted,
  nothing synced.

**Build.**
1. Source/author royalty-free one-shots for the two kits (11 pads each, WAV, short);
   place under `/public/daw-assets/samples/drums/<kitId>/`. Keep file sizes lean.
2. Append two `DrumKitConfig` entries; the kit dropdown and `getDefaultPan` pick them up
   automatically. Tune `defaultPan` per kit.
3. Lift kit state: `Track.drumKit?: DrumKitId` + `setDrumKit(trackId, kitId)` action —
   full 6-site touch-list (`drumPads` is the exact precedent; `drumKit` is a scalar, so
   collab diff = add `'drumKit'` to `TRACK_SCALAR_KEYS`). `usePlaybackEngine` applies
   `track.drumKit` when creating the `DrumMachineEngine`.
4. Anchor the kit dropdown: `data-tutorial-id="drum-kit-selector"`.

**Lesson requirement.** Extend the Hip Hop lesson ("Build the beat") with a step:
spotlight `drum-kit-selector`, "Swap to the **808 kit**" — `check`: selected track's
`drumKit === '808'` (name per your kit id). Update tests.

**Verify.** Full recipe; specifically: switch kits → reload page → kit persists; two
browser contexts in a collab session both see the kit change; E2E lesson run passes with
a REAL dropdown interaction.

---

## Phase 2 — Sampler "Chops" instrument (vocal chops)

**Goal.** A new `sampler` instrument track: the user drops (or picks) a one-shot sample,
and plays it chromatically from MIDI — the vocal-chop / sample-flip workflow.

**Why (lessons).** Vocal chops are a defining technique of the reference dubstep series
(and modern pop/EDM broadly); today `vocal-fx` is live-input-only and MIDI-inert.

**Current state.**
- `src/daw/instruments/SamplerInstrument.ts` wraps `Tone.Sampler` — chromatic
  pitch-shifting from a sparse sample map ALREADY works; MIDI + sustain pedal handled.
  Limitation: `SamplerConfig` takes URL maps only (CDN configs in `sampleConfigs.ts`).
- `Tone.Sampler` accepts `AudioBuffer`/`ToneAudioBuffer` values in its `urls` map — one
  root sample pitch-shifts across the whole keyboard.
- Registration points: `InstrumentType` union (`tracksSlice.ts` ≈85), `createInstrument`
  (`usePlaybackEngine.ts` ≈85), `TRACK_TEMPLATES` (`AddTrackMenu.tsx` ≈33).
- Buffers: `AudioBufferStore` (keyed by clip id today); serialized assets ride GCS
  `assetId` via `@/lib/studio-assets/upload-pending`.

**Build.**
1. Extend `SamplerInstrument` (or add a subclass) to accept
   `{ buffer: AudioBuffer, rootNote: string }`.
2. Add `'sampler'` to `InstrumentType`; `case 'sampler'` in `createInstrument`; a
   "Chops" card in `TRACK_TEMPLATES` (`add-track-sampler` anchor comes free from the
   generalized card anchor).
3. Sample-in UX: a compact panel for the sampler in the Controls tab
   (`TrackControlsPanel` routes by instrument) — drop zone (reuse the timeline's
   WAV/MP3 `decodeAudioData` path from `Timeline.tsx` drag-import) + root-note picker +
   a few playback params (attack/release at minimum). Anchor the panel
   (`sampler-view`) and the drop zone (`sampler-dropzone`).
4. Persist: `Track.samplerSample?: { assetId, rootNote }` (6-site touch-list; upload the
   buffer through the existing studio-assets path; rehydrate on project load like audio
   clips do).
5. Detectability: sample-loaded state must be readable from the main store (the
   `samplerSample` field), so a lesson can `check` it.

**Lesson requirement.** New short lesson "Pop — Flip a sample" (or extend EDM): add a
Chops track → drop/pick a sample (`check`: `samplerSample` set) → play/draw notes in the
piano roll (`check`: clip events grew) → add an effect. Ship one bundled demo one-shot so
the lesson works offline (a "use demo sample" button in the drop zone is acceptable and
makes the lesson deterministic).

**Verify.** Full recipe; plus: reload restores the sample (assetId rehydration); prod
build clean; E2E lesson with a REAL drop-zone interaction (Playwright `setInputFiles` or
the demo-sample button).

---

## Phase 3 — OTT / multiband compressor effect

**Goal.** A new `multiband` effect slot (3-band up/down compression, OTT-style `depth`
macro + per-band gain), available in both the track FX rack and the mastering rack.

**Why (lessons).** OTT is the signature loudness/texture tool of modern electronic
production; the reference series leans on it. Its absence blocks any honest "make it
slap" lesson.

**Current state.** All compression is single-band. Track + master racks share
`EffectChain`, so ONE implementation serves both. No band-splitting exists anywhere.

**Build — the complete 12-site registry touch-list (all verified):**
1. `EffectSlotType` union — `src/daw/audio/EffectChain.ts` ≈94.
2. `TrackEffectState` — add `multiband: MultibandParams` (≈104).
3. `DEFAULT_EFFECTS` (≈115) — sensible OTT-ish defaults, `enabled: false`.
4. New `MultibandParams` interface (near the other param interfaces ≈53–92): crossover
   freqs (lo/mid ≈ 120 Hz, mid/hi ≈ 2.5 kHz), per-band up/down amounts, per-band gain,
   overall `depth` (dry/wet of the whole effect), `time` (attack/release scale).
5. `EffectChain` internals: node fields, constructor creation, `buildChain()` insertion,
   a `wireMultibandBypass()` following the existing true-bypass pattern, `update()`
   branch, `dispose()`. DSP: split with parallel `BiquadFilter` crossovers
   (LP/BP/HP, matched slopes) → per band an upward+downward pair built from
   `DynamicsCompressorNode` + makeup `GainNode` (upward compression = heavy downward
   compression on an inverted-threshold path with makeup — document the approximation)
   → merge → `depth` crossfade with the dry signal. Keep it audibly OTT-like; perfection
   is not required, but band-split correctness is (verify flat null at depth 0).
6. `FX_CATALOG` — `src/daw/data/libraryItems.ts` ≈94–188 (label "OTT", its color/icon).
7. `FxBlockIcon` switch — `src/daw/components/Effects/EffectsPanel.tsx` ≈61.
8. `FxKnobs` switch — ≈585 (depth, time, 3 band-gain knobs, crossovers).
9. Optional but recommended: `FxVisualizer` (≈1182) + `HAS_VIZ` (≈31) — 3-band
   gain-reduction meters make a great teaching visual.
10–12. `tracksSlice` / `masteringSlice` / `store/index.ts` — generic over the union;
   compile-check only.

**Anchors.** Free: `fx-add-multiband` + `fx-slot-multiband` come from the existing
dynamic anchors.

**Lesson requirement.** Extend "EDM — Design the drop": after the Saturator step, add
"Glue it with **OTT** — add the Multiband and push its depth past 40%" —
`check`: `activeEffects.includes('multiband')` then a second step
`effects.multiband.depth > 0.4 && !== armed`. Update tests.

**Verify.** Full recipe; plus a vitest DSP sanity: render a sine through the chain in an
`OfflineAudioContext` — depth 0 ≈ null vs dry; depth 1 changes crest factor measurably.

---

## Phase 4 — Sends / returns / bus routing

**Goal.** Two global **return tracks** (A: Reverb, B: Delay — expandable), per-track
**send levels** (post-fader), and returns surfaced as strips in the mixer. This is the
routing foundation for Phase 5 (sidechain) and enriches Phase 6 (bounce).

**Why (lessons).** Send/return reverb, shared delay, and parallel processing are core
mixing curriculum — currently unteachable because every track hard-wires to master.

**Current state.** `TrackType = 'midi'|'audio'`; `Track` has no sends; every
`TrackEngine` outputs straight to `masterGain`. The only bus is master. The dead
`src/daw/components/Mixer/MixerPanel.tsx` is NOT the live mixer — the live one is
`MixingSection`/`MixingStrip`/`MasterStrip` inside
`src/daw/components/Studio/StudioView.tsx` (studio view).

**Build.**
1. **Model**: a `sendsSlice` (or extend masteringSlice) holding return definitions
   (id, label, effect chain state) + per-track `Track.sends: Record<returnId, number>`
   (0–1, default 0). Track sends follow the 6-site touch-list (object → JSON diff branch
   like `drumPads`); return definitions persist in the session serializer + collab doc.
2. **Audio**: in `TrackEngine`, add per-return post-fader send taps
   (`pannerNode → sendGain[returnId] → returnBus`). Each return bus = its own
   `EffectChain` (reuse!) → `masterGain`. Wire in `usePlaybackEngine`/`AudioEngine`
   where masterGain is owned.
3. **UI**: send knobs on each `MixingStrip` (studio view); return strips rendered after
   track strips with their own FX (reuse `FxBrowser` + `FxChainRow` against the return's
   chain state) + level fader. Anchors: `mixer-sends-<returnId>` on the send knob
   cluster, `return-strip-<returnId>` on each return strip.
4. Keep scope honest: no track grouping/submix buses in this phase (note as follow-up);
   returns are global, not per-track-creatable.

**Lesson requirement.** Extend "R&B — Mix & polish": replace/augment the insert-reverb
step with "Send your track to the **Reverb return** — raise Send A past 25%" —
`check`: `tracks[i].sends['A'] > 0.25 && !== armed`. Add a step tweaking the return's FX.
Update tests.

**Verify.** Full recipe; plus: send at 0 = exact previous mix (no level change — null
test in vitest); persistence + collab round-trip of sends and return chains; E2E lesson.

---

## Phase 5 — Sidechain ducking (kick-triggered pump)

**Prerequisite: Phase 4** (routing conventions + mixer UI patterns; not strictly the
audio path, but do it after).

**Goal.** A per-track **Ducker** effect: pick any other track as the key source; the
target track's level ducks on the key's transients (threshold/amount/attack/release),
with a visible gain-reduction meter. The classic kick→bass/pad pump.

**Why (lessons).** Sidechain pumping is THE electronic-mixing lesson; the EDM lesson's
coach card currently apologizes for its absence
(`tutorials.ts`: "sidechain pumping [is] Ableton territory").

**Current state (verified).**
- Web Audio's `DynamicsCompressorNode` has **no external key input** — do NOT try to reuse
  the compressor slot. Build an **envelope-follower ducker**: tap the key track, rectify +
  smooth (AudioWorklet preferred; `WaveShaper`+lowpass acceptable), map to a `GainNode.gain`
  on the target track via inverted scaling.
- Key-source access exists: `TrackEngine.getAnalyserNode()` (`audio/TrackEngine.ts` ≈46,
  tapped off pannerNode) and `trackEngineRegistry`/`getTrackAudioState`
  (`usePlaybackEngine.ts` ≈58) resolve any track's engine by id.
- Structural template: the de-esser's internal keyed chain
  (`EffectChain.ts` ≈445–460 + `wireDeEsserBypass` ≈682–737) — but it is self-keyed;
  yours is cross-track.

**Build.**
1. New `ducker` effect slot via the same 12-site registry list as Phase 3. Params:
   `keyTrackId: string | null`, threshold, amount (max GR dB), attack, release.
2. Cross-track wiring: EffectChain can't see other tracks — inject a key-source resolver
   (callback `(trackId) => AudioNode | null` provided by `usePlaybackEngine` from the
   registry) when constructing/updating the ducker. Handle: key track deleted (fail
   silent to unity gain), key = self (disallow in UI), project load order (resolve
   lazily on first process).
3. `keyTrackId` is a track→track reference inside `TrackEffectState` — it already
   persists with `effects`, but ADD a collab/persistence note: assert clip/track ids are
   stable across serialize/deserialize (they are — verify with a test), and handle a
   missing key id gracefully.
4. UI: `FxKnobs` branch with a **key-source dropdown** (track names from the store) +
   knobs + GR meter (reuse meter drawing from the compressor visualizer). Anchor comes
   free (`fx-slot-ducker`, `fx-add-ducker`).

**Lesson requirement.** Extend "EDM — Design the drop" (or a new "House — Make it pump"
lesson): drums track + synth/bass track → add Ducker on the bass → "Set the **key** to
your Drums track" (`check`: `effects.ducker.keyTrackId` equals the drum track's id) →
"Raise the amount until it pumps" (`check`: amount changed & above threshold). Update
tests.

**Verify.** Full recipe; plus an OfflineAudioContext vitest: kick impulses on the key,
sustained tone on the target → rendered target RMS dips at impulse times (assert
modulation depth > X dB); E2E lesson with REAL dropdown + knob interactions.

---

## Phase 6 — Audio mixdown / bounce (WAV + MP3 export)

**Prerequisite: Phase 4 recommended** (so the render includes sends/returns; if run
earlier, add the parity items when P4 lands).

**Goal.** File → **Export Audio…**: render the project (or the loop region) offline to
WAV (16/24-bit PCM) and MP3/Opus, with progress UI. The capstone deliverable of every
production course: "bounce your track."

**Why (lessons).** Only MIDI/MusicXML export exists (`FileMenu.tsx` ≈316–345,
`midi/MidiFileIO.ts`); the sole `OfflineAudioContext` in the repo encodes single clips
(`src/lib/studio-assets/encode-opus.ts` ≈113). There is no project mixdown.

**Build.**
1. **Offline render engine** (`src/daw/audio/renderProject.ts` or similar): construct an
   `OfflineAudioContext` and rebuild the FULL graph — per-track instruments scheduling
   `midiClips` events (reuse the scheduling math from `usePlaybackEngine`; factor shared
   logic out rather than duplicating), audio clips from `AudioBufferStore` (with fades /
   `offsetSeconds` / gain), each track's `EffectChain` settings, sends/returns (post-P4),
   pan, mute/solo, mastering chain, master volume. This is the hard part — write a
   **render-parity checklist** in the file header enumerating every audible feature and
   how it is covered, and add to it in future phases (P5 ducker, P7 automation).
   Live-input tracks (guitar/bass/vocal monitoring) render their recorded clips only.
2. **Encoders**: WAV via a small PCM writer (no dependency needed); MP3 — prefer reusing
   the existing Opus path for a `.opus`/`.ogg` option and add `lamejs` (or similar) for
   MP3 ONLY if product wants true MP3 (ask; WAV + Opus may suffice — flag the choice).
3. **UI**: FileMenu entry + a small export dialog (range: whole project / loop region;
   format; bit depth), progress + toast on completion, browser download. Anchors:
   `file-menu` (if absent), `export-audio-item`, `export-audio-confirm`.
4. Store: an `exportState` slice or transient UI state; the *completed* export should be
   observable for lesson detection (e.g. `lastAudioExportAt: number` in the store —
   deliberately NOT persisted).

**Lesson requirement.** Capstone-lesson step (also used in the Capstone series): "Bounce
your track — File → Export Audio → **Export**" — `check`:
`lastAudioExportAt !== armed.lastAudioExportAt`. Update tests.

**Verify.** Full recipe; plus vitest: render a 2-bar project with a known synth note +
gain settings → assert non-silent buffer, correct length (± one buffer), WAV header
valid; a mute-all render is silent. E2E: run export in the browser, assert the download
event fires and `lastAudioExportAt` updates.

---

## Phase 7 — Parameter automation (lanes)

**Goal.** Time-indexed automation for, at minimum: track **volume**, **pan**, and one FX
parameter per effect worth riding (start with filter/EQ-relevant params + `ducker.amount`
+ send levels if P4/P5 landed). Editable as breakpoint lanes under each track in the
timeline; applied during playback AND in the offline render (P6 parity).

**Why (lessons).** Automation is the single biggest absent pillar of a production
curriculum (mix movement, filter sweeps, build-ups). Nothing time-indexed exists on
tracks today (`MidiClip.ccEvents` exists but is unsurfaced).

**Build (scope-controlled MVP).**
1. **Model**: `Track.automation?: Record<paramId, AutomationPoint[]>` where
   `AutomationPoint = { tick, value }`, linear interpolation; `paramId` is a
   closed union to start (`'volume' | 'pan' | 'send.A' | 'send.B' |
   'effect.<slot>.<param>'` for an allow-listed param set). 6-site touch-list (JSON
   branch in diffEngine, like `drumPads`).
2. **Playback**: in `usePlaybackEngine`'s scheduling loop, sample each automated param
   per tick window and apply via `AudioParam.linearRampToValueAtTime` (volume/pan/sends)
   or the EffectChain `update()` path for FX params. The store's static values remain
   the "no-lane" default; a lane overrides during playback. Define and document the
   interaction (lane wins while playing; fader writes... keep read-only faders-vs-lane
   MVP: no touch/latch write modes yet — note as backlog).
3. **UI**: an automation disclosure per track header in the arrange view; when open,
   render a lane strip (canvas, consistent with the timeline) with click-to-add /
   drag-point / delete breakpoints, param selector dropdown. Anchor:
   `automation-lane-<trackId>` is NOT possible per-canvas-point — anchor the lane
   container `automation-lane` and the param selector `automation-param-selector`.
4. **Render parity**: extend the P6 render-parity checklist + implementation.
5. Undo: verify `undoMiddleware` snapshots cover the new field (it is store-wide — add a
   test).

**Lesson requirement.** New lesson "Indie — Movement & dynamics": open the automation
lane (`check`: UI-state flag in store), add ≥2 points on volume
(`check`: `automation.volume.length >= 2`), play through and hear it (free-form), then
automate a send/filter (`check`: second lane exists). Update tests.

**Verify.** Full recipe; plus vitest: interpolation math (edge cases: before first point,
after last, exact hit); an OfflineAudioContext render with a volume ramp lane produces a
measurably ramping RMS; collab round-trip of lanes.

---

## Phase 8 — FM synthesis in the Oracle Synth (growl bass)

**Prerequisite: the uncommitted Oracle-Synth v2 branch (Mod Matrix 2.0 + Key/Scale) must
be COMMITTED/landed first.** At session start run `git status --short`; if
`src/daw/oracle-synth/**` is dirty, STOP and coordinate — do not build on shifting sand.

**Goal.** Real, key-tracked FM: per-oscillator FM with a ratio'd modulator
(`fmRatio`, `fmDepth`, optional mod-envelope routing), enabling Skrillex-style growls —
plus a `GROWL` factory preset and lesson.

**Why (lessons).** The reference dubstep series is built on FM bass design; v2's
`'audio'` mod source (fixed 55 Hz sine → `detune` in cents) is only a crude wobble, not
FM (not key-tracked, no ratio, exponential cents not linear frequency).

**Current state (verified against the v2 working tree).**
- Seams exist and the matrix core does NOT need editing:
  `SynthEngine.registerModSource/registerModTarget/registerModTransform` (≈507–529);
  `ModulationMatrix.extraTargets` consulted first (≈75–80, 202–203).
- `Oscillator.ts` exposes `getDetuneModInput()` (≈256) fanned into unison `osc.detune`;
  true linear FM needs a parallel `getFrequencyModInput()` into `osc.frequency`
  (Hz-linear), or a phase-mod worklet if the wavetable path bypasses `OscillatorNode`
  frequency — inspect the final v2 `UnisonEngine` and choose; document the choice.
- Param plumbing: `OscillatorParams` (`types.ts` ≈95–108) + `setOscillatorParams`
  (`SynthEngine.ts` ≈383). Preset schema: `PresetData`, `PRESET_VERSION = 2` → bump to 3
  with migration in `applyPresetData`; defaults in `factoryPresets.ts`.

**Build.**
1. Per-oscillator modulator: key-tracked `OscillatorNode` at `carrierFreq × fmRatio`,
   output → `fmDepth` scaler → carrier frequency input (new `getFrequencyModInput()`).
   Ratio presets (0.5, 1, 2, 3.5…) + free mode.
2. `OscillatorParams` + `fmRatio`/`fmDepth`/`fmEnabled`; UI knobs in the oscillator
   module (inline + pop-out layouts); `PRESET_VERSION` 3 + migration (old presets get
   `fmEnabled: false`).
3. Register an `'fm-depth'` mod target so envelopes/LFOs can ride the growl (this is
   what makes it *talk*).
4. New factory preset `GROWL` (FM + LFO on depth + drive), and keep `WOBBLE` untouched.
5. Anchors: the oscillator FM knob cluster `synth-fm-controls` (both layouts).

**Lesson requirement.** Extend "EDM — Design the drop" (or new "Dubstep — Growl lab"):
load `GROWL` (`synthCheck: presetName === 'GROWL'`), raise `fmDepth`
(`synthCheck`: oscillator fmDepth changed & > threshold), free-form modulation play, then
remove the old "FM is Ableton territory" apology from the wobble step's hint.

**Verify.** Full recipe (synth steps verified via `__MA_SYNTH_STORE__`); plus vitest:
preset v1/v2 files still load post-migration; an offline render with fmDepth 0 vs high
differs spectrally (assert via simple FFT bin comparison or RMS-of-difference).

---

## Capstone — "Produce a full track" lesson series

**Prerequisite: P1–P7 (P8 optional).**

Author a 3-lesson advanced series that strings the new features into the full arc the
beatspark reference teaches, using only REAL, detectable actions:

1. **"Produce: Foundation"** — drums (electronic kit) → bassline (synth/sampler) → chords
   (Prism) → loop-region workflow.
2. **"Produce: Design & movement"** — sound design (wobble/growl), sidechain pump,
   automation build-up.
3. **"Produce: Mix, master, ship"** — sends/returns balance, OTT/mastering chain,
   **bounce to audio** as the finale (P6 `lastAudioExportAt` check) + confetti.

Add a `series`/`order` field to `Tutorial` ONLY if the picker needs grouping (keep the
picker simple otherwise — ordered cards with numbered titles suffice). Update the
integrity test, run the full lesson pack E2E (extend `drive-pack.js` pattern), read every
screenshot, and update `docs/` + the project memory with the final lesson catalog.

---

## Backlog appendix (not in any phase; pick up opportunistically)

- **Humanize / groove templates / quantize-strength** for user MIDI (piano roll + drum
  grid; today only hard-quantize of start ticks — `utils/quantize.ts`).
- **Audio reverse & time-stretch** on audio clips (no `playbackRate`/warp today).
- **Punch-in/out and loop-record take comping** (recording is otherwise solid:
  count-in, metronome, limits).
- **Track freeze / bounce-in-place** (unlocked by the P6 render engine).
- **Mastering macro params UI** (`masteringSlice` fields `masteringStyle`, `masteringEq*`,
  `masteringLoudness`, `masteringStereoField`, `masteringDynamics*` exist store-only —
  no UI, currently untouchable and unteachable).
- **Mid-song time-signature changes** (single global signature today).
- **Groove-browser preview detectability** (preview is engine-local; a `previewingGrooveId`
  store field would make a "listen before you pick" step checkable).
- **Prism `filterPercent` UI** (store + engine support exist; no control).
- **Track grouping / submix buses** (follow-on from P4's returns).
