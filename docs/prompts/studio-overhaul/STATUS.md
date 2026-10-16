# Studio overhaul status log

Each prompt appends an entry: milestone, commits, pushed or not, verification numbers, open issues, owner sign-offs.

## Done before these prompts (2026-10-06 to 2026-10-08)

- **1.0–1.3** verified and on `origin/aaron` (`e10ac4db`), together with 2.2's `src/daw/ui` primitives, part of 1.17a (dead controls) and part of 1.8 (peak pyramid, piano-roll viewport canvases, opt-in incremental Score).
- **1.4** fully built (13 tracks, reviewed and fixed), partly integrated, pushed UNVERIFIED as snapshot `6fccb1e7` on `aaron`. Prompt 01 finishes it.
- **1.2b** deferred until after Stage B (owner decision 14).

## Owner sign-offs still open

- 1.3: drafts carry a `compat: 3` forward-compatibility marker (D1); the Guitar/Bass-to-MIDI binding stays session-only (D5); a legacy cloud save doesn't count a genre's own strum as unsaved (D7); Prism's genre strum numbering kept as before (fix in 1.16a?); an Oracle track never opened in its panel now plays the INITIALIZE patch; a Learn melody repair bug was fixed (`54fa9774`); the metronome turns off after a rollback to a pre-1.3 build.
- 1.2: master Bypass per student or room-wide in collab; firstChordsFor tonic-first in modes; the global `:not(:-webkit-autofill)` animation rule in `src/index.css` that makes menus linger.
- 1.4 defaults: see prompt 01.
- music-atlas-api (Ryan): does PUT keep track `settings` (incl. `sourceTrackId`), `midiClips` and `returns` verbatim?
- Stage D (2026-10-14): decisions SD1–SD11 in `29-D-teaching-features.md` (placement, sharing roles, comments, listening, chord keys free, no video calls, sections, key changes, assignments on `kind:'atlas'`, Google Classroom to the Teacher Office, starter genres).

## 01 — 1.4 finished and verified (2026-10-12)

- **Branch:** the checkout was on `main` (dirty with these prompt docs only). Owner chose to fast-forward `aaron` to `main` (`790fa542`, which also brings PR #191) and work there. `main`/prod already carried the unverified snapshot `6fccb1e7` through that merge; owner chose to leave it and finish 1.4 on `aaron`.
- **Group P:** re-checked every item against the code. The snapshot already held all of them (late take kept after the editor closes, R16 quota reload opens the mirror and shows the error, legacy backups not counted as unreadable, fixed take-upload toast, R12 `LOSS_OWNERS`, and the low items) except one comment conflict, fixed: `bd8ef2d5`. The fence-by-generation item is recorded as a decision in plan.md. `1.4-integration-findings.md` is now history, not a todo list.
- **Commits:** `bd8ef2d5` (comment), `91407532` (knownLosses.json: 140 new scenario baselines, 18 entries better, none worse).
- **Pushed:** yes, to `aaron` (fast-forward).
- **Verification:** `npm run lint` pass. `npx vitest run`: 894 files pass; the only failures (4 song-data suites) come from the gitignored local `src/curriculum/data/songs/_generated_index.ts` that their `import.meta.glob('../*.ts')` picks up, and they pass without it (file left in place). Funk L1 no longer fails. `studio:check:full --prev-base=http://localhost:5264` (1.3 build `e10ac4db` served from a `git archive` export): unit, lessons, perf, golden, golden-trace, bundle pass; roundtrip failed only on missing baselines, then `roundtrip --tier=full --profile=laptop,chromebook --update-known` recorded them with 0 goal-flag failures, 0 unowned losses and 0 page errors on both profiles (R11 crash, R13 two tabs + fork toast, R14 old tab real + simulated, R15 revert to 1.3 and back, R16 quota, R17 offline/failed saves, R18 Projects reopen, R4/R12 every boot path, R20 Song page, R22 shared device, R23 media, R25 chip UI). `bufferLoaded` fixed everywhere; remaining losses owned by 1.5, 1.15 and one pre-existing 1.10 (R3 audio clip ids). Fast `studio:check` after: pass. Lessons: 24/24 complete (3 sizes × 2 personas), all failing steps known (21, down from 36 at baseline), 8/8 Premium gated for free. `verify:prod` OK. Bundle: DawApp 275 kB gzip (budget 150, 1.12's).
- **Screenshots** (chip in every state + Projects dialog, 1366×655 and 1440×787): scratchpad of this session, `shots/`; the chip is 150 px, neutral, amber icon only in the error state.
- **Open issues:** (1) Every way of closing a Radix menu (Escape, outside click, any item) leaves its content mounted as `data-state=closed`, so the next click on File is swallowed. Same in 1.3; it is the 1.2 sign-off item about the global `:not(:-webkit-autofill)` animation rule in `src/index.css` (Presence waits for an animation whose keyframes don't exist). 1.4 makes it visible after File ▸ New, which no longer remounts the editor. Needs the owner's call on that rule. (2) A never-armed MIDI track comes back armed after a reload (Stage B, carried). (3) No R17 scenario uses the mock's `rejectAssetsForDeletedProjects` yet.
- **Owner sign-offs:** the 1.4 defaults in the spec (chip in the TopRail for Stage A; second tab forks a copy; legacy keys imported, never deleted, until Stage A exit + 30 days, redeploy rather than roll back past 1.4; takes in never-saved projects stay on device until first Save, except in collab rooms; media budget 256 MiB/user; sign-out policy) and plan.md's "1.4 decisions as built" 1–7. 1.3 and 1.2 items above still open.

## 02 — 1.5 cloud document field (2026-10-12)

- **Branch:** `aaron` at `91407532` (1.4 verified), tree dirty only with this prompt pack.
- **Commits:** `6fdc8155` (cloud document codec + open/save: chord lane, mode, metre, loop, notation + marks, markers, mastering, Prism, clip lengths, CC, note ids; interim `settings.projectDoc` on the first track; reader scans every track; stale/newer handling), `e2248795` (capability detection, `documentSchema`/`baseRevision`, revision kept in LastSaved/drafts, 409 handling, mode-aware gaps), `d4bfa2db` ("Changed on another device" dialog: Save as a copy / Overwrite; chip "Can't save – Reload" for `document_schema_too_old`; open notices), `6cb51738` (mock API document mode + contract tests, R3 both modes, R17 partial now a no-track project, knownLosses), `33072f1e` (`docs/studio-cloud-document-contract.md` for Ryan).
- **Pushed:** yes, to `aaron` (fast-forward). **The real API is unchanged**: until it ships the field, saves use the interim fallback (rides on the track `settings` blob, which the API is not yet confirmed to keep verbatim — Q1 in the contract).
- **Verification:** `npm run lint` pass. `npx vitest run`: all pass except the 4 known song-data suites (local `_generated_index.ts`); two song-link tests in `src/daw/session` time out at 5 s under full parallel load only (pass alone and in the full run). Persistence matrix: 30 cloud `it.fails` rows flipped (only the per-device input channel stays `it.fails`, by design). New: `cloudDocument.test.ts`, `cloudFixtures.test.ts` (fixtures `cloud-1.5/{document,interim}.json` from the all-fields draft: every cloud registry field round-trips in both modes; re-encode guard for schema bumps), `mockStudioApi.test.mjs`. `studio:check`: unit pass, lessons pass (66/78 steps, all 12 failing known, 12/12 complete, 4/4 Premium gated for free), roundtrip: only R3 changed — legacy 39 fields fixed, document mode new baseline (only `ids.audioClips`, 1.10's), both profiles, all flags true incl. `olderAppKeepsDocument` and `olderAppNoticeShown`; recorded with `--update-known` (R3 entries only). Screenshots of the dialog and both chip states at 1366×655 and 1440×787 in this session's scratchpad `shots/`; Overwrite verified end to end against the mock.
- **Open issues:** (1) The API work (Ryan): contract questions 1–8, notably whether `settings` and `returns` are stored verbatim and the request body limit. (2) After the API deploys: one manual save/open against staging to confirm the capability switch. (3) A PUT retried after a lost 5xx answer can meet its own revision bump (409); Overwrite resolves it. (4) Projects dialog doesn't show the new list fields yet (key/revision) — Stage B 2.3. (5) Drafts saved before 1.5 have no revision, so their first save is last-write-wins.
- **Owner sign-offs:** conflict choices and wording ("Save as a copy" names it `<name> (copy)` and moves the session to it; Cancel leaves the chip error); "Can't save – Reload" lead (Reload didn't fit after "Couldn't save –" in 150 px); a project with no tracks can't put the document in the account until the API ships ("… until the project has a track"); stale-document rule (rows win for what they carry; clip parts only on unchanged notes; notice shown on open); the document also carries copies of `returns` and Master automation.

## 03 — 1.6 command registry and scoped keymaps (2026-10-12)

- **Branch:** `aaron`. 1.4 and 1.5 already on `origin/aaron`. Another session committed classroom/Cortex and Globe work to local `aaron` meanwhile (16 commits, none touching 1.6 files).
- **Commits:** `08bca9ab` (registry + one dispatcher in `src/daw/commands/` — `keys.ts`, `registry.ts`, `keymaps.ts`, `dispatcher.ts`, `globalCommands.ts`, `clipCommands.ts`, `projectCommands.ts`; Score, Lead Sheet chart, piano roll, drum grid, Prism, pop-out, modal piano roll and practice converted to registered scopes; `useMusicalTyping` on the shared live-notes path `midi/liveNotes.ts`; Typing chip in the TopRail and the Practice header; '?' sheet `shell/help/ShortcutSheet.tsx` with the single-key switch; one-time notice; File ▸ Keyboard Shortcuts; `useKeyboardShortcuts` and the per-instrument QWERTY handlers deleted), `7d8e5f6e` (R26 scenario, harness marks the notice seen elsewhere, kitchen sink sets the new pref, R26 baselines).
- **Pushed:** yes, to `aaron` (fast-forward `33072f1e..7d8e5f6e`, with the owner's OK to include the other session's 16 commits).
- **Verification:** `npm run lint` pass. `npx vitest run`: 912 files pass; only the 4 known song-data suites fail (local `_generated_index.ts`). New: `commands/__tests__/keyboardCommands.test.tsx` (43, the dispatcher matrix: editable targets, dialogs/menus/list boxes, defaultPrevented, repeat, opening, Score Delete never removes a clip, ⌘= not prevented, ⌘S in an input, typing suppresses M and L, single-key switch, modal piano roll, practice), `registry.test.ts` (no duplicate bindings, no browser-reserved keys, Delete paired with Backspace, only Save in text fields, labels per platform). `studio:check`: unit 95/95, every round-trip ok with 0 new losses, R26 8/8 flags (Delete in Score keeps the clip, ⌥R in Lead Sheet no record, typing never toggles loop/metronome, R and the Record button both ask, '?' lists 77 rows in 10 scopes, ⌘+/⌘− not prevented and ⌥= zooms, chip fits at 1366×655 / 1440×787 / 1280×720, notice once); R26 recorded on laptop and chromebook with `--update-known`. Lessons: 66/78 steps, all 12 failing known (unchanged), 12/12 complete, 4/4 Premium gated for free. Screenshots of the chip, sheet and notice at 1366×655 and 1440×787 in this session's scratchpad `shots/`.
- **Open issues:** (1) Musical typing plays the monitored track, else the selected one (as a MIDI keyboard does), not "the panel on screen": the Oracle panel can show a synth track that isn't selected. (2) With a native `<select>` focused, letters go to the select (type-to-select), not to the piano. (3) No view-switch keys: Alt+1–8 is the Chromebook shelf and ⌘1–8 Chrome's tabs; left for 2.11. (4) Tools stay on 1–4 (V/B/C is 2.7's decision). (5) Piano-roll note keys (arrows nudge, ⌘A/C/V/D on notes) are not built; those keys now simply do nothing there.
- **Owner sign-offs (all signed off 2026-10-12):** musical typing off by default, A = C4 (the old dock map had A = C3); the chip wording "Typing / Typing · C4" in the TopRail; single-key switch default On; the notice wording, shown once per student also to new students (never during a lesson); ⌘N (new track) dropped as Chrome reserves it; ⌥=/⌥− for timeline zoom; Escape in Create stops and deselects, in Score/Lead Sheet only clears the selection. Also signed off: tools stay on 1–4 until 2.7 decides V/B/C.

## 04 — 1.7 frame-rate state out of React (2026-10-12)

- **Branch:** `aaron` at `7d8e5f6e` (1.6). A Globe session committed 9 commits to local `aaron` meanwhile (`baada93c`…`16deae57`, none touching Studio files); owner chose to push them with 1.7.
- **Commits:** `faf0d9a3` (playhead clock `engine/playheadClock.ts` on the one frame loop `engine/engineClock.ts`, latency-compensated; store `position` written on pause/stop/seek only; ref-driven playheads in Timeline, Piano Roll, drum machine, Score via an opt-in StaffView `playheadSource` prop; Lead Sheet and Practice render on system/chord change; paste/split/skip/snap/record read the live tick; harness reads `window.__MA_PLAYHEAD__`), `aaf8bf51` (per-track reconciler `engine/trackReconciler.ts` + registry in `engine/trackAudio.ts`; `engine/EngineHost.tsx` hosts transport/engines/MIDI/autosave/collab audio/analysis; narrow subscriptions in ChannelStrip, TrackControlsPanel, Insight), `a3e86e89` (MeterBus `engine/meterBus.ts`, `meterSource(key)` for the 2.2 Meter; 2048-sample meter taps `audio/meterTap.ts`; header reads `useTrack(id)`), `c20c2f2d` (analysis loops on the frame loop only while active, publish on change), `8276f068` (tutorial anchor registry `Tutorial/anchorRegistry.ts`, SVG-mask spotlight, reduced motion, alias map, rack-aware `fx-add-*`).
- **Pushed:** yes, to `aaron` (fast-forward `7d8e5f6e..8276f068`).
- **Verification:** `npm run lint` pass. `npx vitest run`: 935 files pass; only the 4 known song-data suites fail (local `_generated_index.ts`). New: playheadClock, staffPlayheadSource, trackReconciler (only changed fields reach the engine; colour/collab rebuild apply nothing; solo regates all), meterBus, anchorRegistry, Spotlight, fxRackStamp, and tests for chord detection, guitar-MIDI, pitch info, tuner, visualizers, mod indicator, wah, store write guards. `studio:check`: pass (unit, roundtrip 0 new losses, lessons). `studio:check:full --prev-base`: lessons, perf, golden, golden-trace, bundle pass; roundtrip all ok with 0 new losses except R14/R15, which need a pre-1.4 build: rerun against 1.3 (`e10ac4db` on :5264) both profiles ok, 0 losses. Unit tier there: song-content loads timed out under load (load avg 8–15); they pass alone, except `studentPath.characterization` whose snapshot breaks on the Globe session's uncommitted atlas edits (not Studio). Lessons: 66/78 → the two known `fx-add` failures (`edm/saturate`, `house/add-ducker`) now pass and left `KNOWN_FAILURES` (10 left); 12/12 complete; 4/4 Premium gated for free. Meters move in the browser (header fills 0→53% while playing, 0% at rest). Golden traces unchanged (metronome 0 ms, grid 0 ms). Bundle: DawApp 278.9 kB gzip (budget 150, 1.12a's).
- **Perf (chromebook, demo-midnight-groove, machine flagged busy):** store writes/s during playback 29 → **0**; React commits/s 29 → **0.15**, none in DawAppInner, top bar, Timeline, headers or dock (ChannelStrip was 154 ms/s); frame p95 16.8 ms (target ≤20 ✓). Not met: idle app rAF 420 → 240/s, all of it `react-globe.gl` frame tickers started by `AppContext`'s idle `import('react-globe.gl')` warm-up on every page (the editor itself runs 0 frame tasks idle); long tasks still 14 / ~950 ms per 20 s, all Tone's scheduler tick: the Oracle synth's `UnisonEngine` rebuilds oscillators per note and the drum machine makes sources per hit through standardized-audio-context, whose `detectCycles` walks the downstream graph on every connect (~700 ms of a 12 s profile at 4×). Voice pooling / native nodes belong to the engine milestones (1.11/1.13, Stage C).
- **Open issues:** (1) Globe warm-up rAF — owner handed it to the Globe session. (2) Long tasks — synth/drum voice allocation, Stage C. (3) Return-rack FX meters stay inert (AudioEngine has no `getReturnChain`; 2.10 RackDock). (4) EQ pop-out "IN/OUT" labels name post-EQ/post-comp taps (fx-mixer-15, left to avoid a visible change). (5) `useWtPosModulation.ts` and `useLiveUnisonAnalysis` are dead code. (6) Parked playhead in drafts is the play-start/pause point (the store no longer follows playback); refresh mid-play resumes there.
- **Owner sign-offs:** 2048-sample meter taps (signed off 2026-10-12); pause parks at the heard tick, so resume replays the last ~lookAhead+latency rather than skipping it; small spotlight look notes (pulse peak a touch brighter, the dim's hole jumps while the ring glides 120 ms); StaffView/GrandStaff gain an optional `playheadSource` prop (Learn unchanged).

## 05 — 1.8 canvas and notation render cost, remainder (2026-10-12/13)

- **Branch:** `aaron` at `8276f068` (1.7). A Globe session committed to local `aaron` meanwhile (`4950be14`, `a41bfef2` before these commits; `b2d96e76`…`77386c56` after), none touching Studio files.
- **Commits:** `d4b3b941` (Timeline: one rAF dirty flag `requestRedraw`; draw reads the store when it draws; a store subscription redraws only on drawn fields, tracks compared by `timelineGeometry.ts` (track id/colour, clip places, lengths, notes, offsets, fades); Timeline no longer subscribes to selection/loop/markers/chords/live peaks; drags redraw while playing and a clip/marker drag follows the pointer off the canvas; canvas sized from the scroll area so it shrinks again; ResizeObserver, theme-token and pixel-ratio redraws; tokens cached; AudioBufferStore notifications batched per frame with a 100 ms timer fallback for hidden tabs; DEV `ma:timeline:draw` measure), `8e034eea` (LibraryPanel: width in one step, content fades 120 ms, no animation on return to Create), `9d336bdd` (useScoreEditing: tie candidates, marks, chord marks, beat anchors and the overlay's slur/tie/barline lookups through maps in `Score/scoreLookups.ts`), `34feb939` (incremental engraving on in the Lead Sheet, with a ScorePartsCache, and in the piano roll's notation view via a new opt-in `GrandStaff` `incremental` prop; Learn unchanged, StaffView unchanged), `c6d1ec10` (perf scenarios `timeline-scroll` and `score-edit`).
- **Pushed:** not yet. The owner OK'd pushing with the Globe session's commits, but the first push stopped at the pre-push lint (another session's unformatted `docs/globe-ui/ENGINE.md`), and by the retry a teacher-app commit from a third session (`5403f647`, retiring the old curriculum) sat on local `aaron` too; owner chose to wait until that session says it is ready.
- **Verification:** `npm run lint` pass. `npx vitest run`: 951 files pass; failures only the 4 known song-data suites (local `_generated_index.ts`) and `studentPath.characterization` (song-page header snapshot, the Globe session's uncommitted atlas edits, as in 1.7). New: `Timeline.redraw.test.tsx` (first draw before paint; fader/rename/mute neither redraw nor re-render; changes in one frame draw once; a clip drag follows the pointer while playing, on and off the canvas; theme tokens read once), `timelineGeometry.test.ts`, `scoreLookups.test.tsx` (old searches vs maps on a fixture and 40 seeded pages), lead-sheet and studio-notation incremental tests (identical markup, one system redrawn per edit). Learn staff suites pass. `studio:check:full`: lessons pass (141/156 steps, all 15 failing known, 24/24 complete, 8/8 Premium gated for free), golden and golden-trace pass, bundle pass (DawApp 279.5 kB gzip, +0.6 vs 1.7; budget 150 is 1.12a's), perf ok except `note-drag` skipped ("grab point covered by canvas.block" — the 1.7 build `8276f068` skips the same way, so pre-existing) and one `autosave` chromebook error (page state lost mid-gesture) that passed on both profiles when re-run alone. Round-trips (full tier, both profiles, `--prev-base` = 1.3 build `e10ac4db` on :5264): laptop 100/100 ok, chromebook 98/100 ok, 0 new and 0 unowned losses, no new flags; the 2 chromebook errors (`R12:sameIdReopen` lost its page state, `R13` timed out) came while other sessions were editing files the harness's dev server serves (forced reloads), and both pass on both profiles against a frozen `git archive HEAD` copy. knownLosses.json unchanged (nothing improved).
- **Targets (machine flagged busy, load 5–8 on 14 cores):** Timeline draw while scrolling 6 × 3-minute stereo stems p95 **0.9 ms** laptop / **3.0 ms** chromebook (target ≤4 ✓); fader drag **0** Timeline draws on both (✓); Score note edit (6 parts × 32 bars, 735 notes) input→paint p95 **48 ms** laptop (target ≤50 ✓), 256 ms chromebook (not judged; ~216 ms is the key handler's processing). Idle editor: 0 Timeline draws per 10 s. jsdom: Score hook + overlay after a one-note edit ~127 → ~30 ms.
- **Open issues:** (1) The first full-tier run collapsed after ~13 h: the machine was already at load 16 and reached 50; timed-out round-trip pages stayed alive (~20 headless renderers at ~55% CPU each) and every later scenario timed out. Every round-trip that finished lost 0 unowned fields. The harness should make sure a timed-out scenario's context is closed (not investigated). (2) Timeline zoom on chromebook draws at p95 12.5 ms (scroll is fine); the zoom path redraws everything each wheel step. (3) The Timeline still re-renders each frame while scrolling (~58 commits/s), because it subscribes to the scroll position for its scrollbar and playhead: user input, but cheap to move into refs later. (4) Score edits on chromebook are ~250 ms, mostly the edit's own handler and store writes (score-06's 3+ writes per edit and the undo watcher's stringify, 1.9). (5) The piano roll notation view is one system, so incremental engraving there only saves re-measuring unchanged bars; its note ids follow clip position, so a delete re-measures the later bars (pre-existing). (6) The Lead Sheet doesn't pass pinned spellings to buildScoreParts (pre-existing).
- **Owner sign-offs:** incremental engraving now on in the Lead Sheet and the piano roll's notation view (markup-identical in tests); `GrandStaff` (shared with Learn) gains an optional `incremental` prop, off by default; the side panel no longer animates its width (fade only, none when returning to Create); AudioBufferStore notifications are batched (≤ one frame, ≤100 ms in a hidden tab).

## 06 — 1.9 edit transactions and undo (2026-10-13)

- **Branch:** `aaron` at `e462dab1` (1.8 and the Globe and teacher-app commits, all still unpushed). Tree dirty only with this prompt pack.
- **Commits:** `a5ee020a` (undo history, origins, seeds, asset stamps, collab scope and one Yjs update per transaction), `ec5aa75b` (engine previews and glide), `665d4687` (useContinuousControl on every fader, knob and slider), `03a1dedc` (piano roll and drum grid drafts, markers, automation points, clip and Score edits as one transaction), `fe65f120` (harness targets, note-drag aim fix, probe and R2), `5440e772` (autosave scenario as a run of short gestures). Each typechecks on its own.
- **Pushed:** not yet. Local `aaron` also carries the unpushed 1.8, Globe and teacher-app commits; the owner put the 1.8 push on hold until the teacher-app commit `5403f647` is ready, and pushing 1.9 would push them all. Waiting for the owner.
- **What changed:**
  - `store/history.ts`: undo records each edit by reference over the registry's undo fields (`UNDO_KEYS`, now typed `UndoKey`/`CollabUndoKey` in `fields.ts`). Each step has a label; the cap is 100 steps. Writes carry origins (`store/writeContext.ts`: user, system, remote, seed, undo).
  - `withTransaction(label, fn)` makes one step. Writes outside a transaction gather for 300 ms, and an equal rewrite is no step.
  - `withoutHistory` covers seeds and bookkeeping. `openSession`'s apply and the room's pull are seeds, and remote writes are tagged remote.
  - Asset stamps (`lib/studio-assets/assetStamps.ts`) are system writes that also rewrite the history's copies of the clip.
  - Undo of a key change brings back the key colour and the builder's chords. Each person's mute, solo, arm and inputs stay as they are.
  - Collab: the Yjs undo scope comes from the registry (`collab/undoScope.ts`). Keys the room's document doesn't hold yet are listed as null for 1.14.
  - Collab: a transaction is one Yjs update (`collabMiddleware`) and one labelled stack item (`stopCapturing`). Non-undoable changes are marked `ma:undoable=false` and not captured. The stack is capped at 100, and solo history pauses during a session.
  - `hooks/useContinuousControl.ts` (begin/change/end/cancel) handles drags: a rAF-coalesced preview, a local draw value, one commit in a transaction, a window-release safety net and commit on unmount. It is shared through `ControlGestureContext`.
  - `useSaveOnRelease` covers views that keep their own state (the pedal chains).
  - Engine: the `previewTrack` reconciler entry, and `engine/preview.ts` for the Master, mastering FX and returns.
  - Engine: glide (`setTargetAtTime`, 10 ms) on live changes. `EffectChain.update(…, {glide, deferIr})`. Waveshaper curves are swapped only when their amount changes, Overdrive included.
  - Engine: the guitar adapter gets the parameter-only path.
  - Call sites: every fader, knob and slider in the editor.
  - Call sites: piano roll and drum grid drafts, the marker drag, and automation point drags.
  - Call sites: clip move/trim and Score note edits each run as one transaction.
- **Verification:**
  - `npm run lint` pass.
  - `npx vitest run`: 966 files pass. The only failures are the 4 known song-data suites (the local `_generated_index.ts`) and `studentPath.characterization`. That one is the song-page header snapshot: the genre chip's `atlas-*` classes, from the Globe session's commits.
  - New tests:
    - history (23)
    - useContinuousControl (8, including a real knob drag: 0 store writes during it, 1 on release, 1 step)
    - collabUndo (9, Y.Doc: scope, one update per gesture, labels, genre and seed not captured, cap)
    - trackReconciler previews (4)
    - effectChainPreview (4)
    - PianoRoll.gesture (2)
  - 11 old test files were ported off `pushUndo`.
  - **`studio:check` (fast tier):**
    - unit: only the known `studentPath` snapshot fails.
    - round-trips: laptop all ok, 0 new or unowned losses. R2 `undoKeptOnReturn` passes after the probe fix. R25 (Undo/Redo buttons) and R26 (keys) are ok.
    - lessons: 69/78 steps, 9 failing, all known (66/78 with 12 at 1.6). 12/12 complete. 4/4 Premium lessons gated for free.
    - knownLosses.json unchanged.
  - **Exit check in the browser (perf, `--quick`):**
    - **fader drag:** 1 store write and 1 undo step per gesture on both profiles, 59 moves, 0 long tasks, frame p95 16.8 ms. The 2026-10-06 baseline was 160 writes/gesture on chromebook. The 2026-10-13 check run was 127–224.
    - **note drag:** 1 store write and 1 undo step on both profiles. Chromebook 24 moves/s (baseline 11.5), long-task 27.5 ms/move (baseline 55.7), p95 67 ms (baseline 83). Laptop 0 long tasks.
  - **Full tier, run without the round-trip suite (no persisted format changed):**
    - lessons on chromebook and small: 141/156 steps, 15 failing known, as in 1.8. 24/24 complete. 8/8 Premium gated.
    - golden and golden-trace pass: bounces are exact, since a new chain's first state never glides.
    - bundle pass: DawApp 281.8 kB gzip, +2.3 over 1.8. The 150 budget is 1.12a's.
    - **fader drag** (3 × 4 s): 1 write and 1 undo step per gesture on both profiles. Chromebook 60 moves/s (baseline 20.1), 0 long tasks, p95 16.7 ms (baseline 33.4).
    - **note drag:** 1/1 on both profiles. Chromebook 21–24 moves/s (baseline 11.5), long tasks 24–31 ms/move (baseline 55.7), p95 66.7 ms (baseline 83.4). Laptop 0 long tasks.
    - playback unchanged: 0 store writes/s, 0.15 commits/s.
    - The autosave scenario failed its premise (one 20 s drag now writes once). Rewritten as about 70 short gestures, it passes on both profiles: 3 draft writes, main-thread p95 within 5 ms (was unmeasured), final value committed. Its `slotCommitsOk` reads false: 18 slot commits for 7 chip flips. Each chip flip renders the chip and its portalled announcer (the one-drag run had 1 flip, 3 commits), so 1.4's one-commit-per-flip formula undercounts once the chip flips more than once. This is not from 1.9 (the chip doesn't read the history).
- **Harness:**
  - fader-drag and note-drag now fail on more than one target write or other than one undo step per gesture.
  - The note drag skipped from 1.8 until now: the grid finder picked the paint canvas. It is fixed.
  - The chord-id probe is no undo step.
  - R2 records the undo steps it saw.
  - Dev handle `window.__MA_HISTORY__` (labels, pushed, flush, withoutHistory).
  - The 1.9 tests are in the fast tier's unit list.
- **Open issues:**
  1. Score edits are one undo step and one Yjs update, but still one store write per touched clip plus one per changed mark list. Clip move/trim makes 2–4 writes (one `moveClip` is 1.10's).
  2. The piano roll redraws its draft on every move. On chromebook that is 24–31 ms of long tasks per move, half the baseline but not 0.
  3. The autosave check's `slotCommitsOk` formula (above) needs the owner's or 2.5's call: count announcer commits, or stop the announcer re-rendering the slot.
  4. Undo of a guitar or vocal pedal change doesn't reach an open pedal view until it reopens (pre-existing: the view keeps its own chain).
  5. Collab undo can't cover keys the room's document doesn't hold (Lead Sheet layout, Score spellings, breaks and text, clip colour mode), and the live observer ignores the Score marks the doc does hold. Both are 1.14.
  6. Oracle synth knobs are on their own store and outside main undo and collab (1.13b).
  7. The loop-region drag still writes per move. It is not an undo key and not shared.
  8. The track header's fader re-renders its own row about 2.4 times per move (local).
  9. The Undo/Redo buttons don't show step labels yet (`smartUndoLabel` exists; 2.5).
  10. The audit ledger (`phase-map.json`) is not updated, as before.
- **Owner sign-offs:**
  - **Undo granularity:**
    - One step per gesture, named.
    - A write outside a gesture joins the writes within 300 ms of it.
    - An edit is undoable the moment it's made, with no 300 ms wait.
  - **Lesson checks:** the steps for balance-fader, tweak-reverb, pad-mix and master-volume now complete on release, not mid-drag.
  - **Glide:**
    - Live parameter changes glide over about 30 ms (fader, knob, undo, collaborator).
    - Reverb Decay is heard on release.
  - **The pedal chain:** a track's first pedal chain saved on opening its panel is no undo step.
  - **Collab undo now covers more:** key and tempo, the Master and returns, and the Lead Sheet's sections, repeats and marks.

## 07 — 1.10 time model and audio asset model (2026-10-13)

- **Branch:** `aaron` at `a81e8904` (1.8, 1.9, Globe and teacher-app commits, all unpushed). Tree dirty only with this prompt pack.
- **Commits:** `08710f48` (time model, 4/4 removal, bar insert/delete, schema 4), `942e2770` (note editors bind to a clip; song-time piano roll and drum grid), `0b2474b1` (a save test assumed schema 3), `b8718b41` (chord lane follows its clip, `moveClip`, one snap grid, snap toggle), `4c2f43b9` (the dashboard's copy of the schema), `07fcc103` (audio asset store, collection, load status, honest tiles), `d956c193` (audio clip ids kept across cloud opens), `fa314447` (bar edits are named undo steps), `580729bd` (harness: kitchen sink and unit list), `e2e5d26f` (knownLosses: R3 improved). Not each typechecked on its own; `08710f48` left one save test failing until `0b2474b1`.
- **Pushed:** no. Pushing would push the 1.8, Globe and teacher-app commits under it, which wait for the teacher-app commit `5403f647` (owner's hold, as for 1.8 and 1.9).
- **What changed:**
  - **Time model** (`src/daw/time/timeModel.ts`): `ticksPerBar(ts)`, written and felt beats, song↔clip ticks, bar-relative metre-aware snapping (`snapTicks`, `timelineSnapGrid`: 'Bar' is the metre's bar, the quarter grid in 6/8, 9/8, 12/8 is the dotted quarter), chart slots around multi-bar rests (`barSlots`). The 4/4 defaults in `leadSheetUtils` and `timelineScale` are gone (state-reload-09, leadsheet-32).
  - **Bars** (`src/daw/time/measureEdits.ts`): + / − Measure insert or delete real bars of the metre and move chords, sections, repeats, rests, fermatas, row sizes, Score breaks, runs and text, markers and the shown melody, in one named undo step. + Measure with nothing selected appends (new doc field `leadSheetBars`). A new chord lasts to the next chord or its bar's end; chord moves and resizes snap to the metre's beat (leadsheet-07, prism-ui-21).
  - **Lead Sheet and exports:** the sheet works on real bars after multi-bar rests (leadsheet-05), its header shows the real metre and its callbacks follow a metre change (leadsheet-22, -23 header). Set-list copies keep 3/4 lengths (leadsheet-19). Prism suggestions and takes land on the metre's bar lines (prism-ui-06, ia-flows-34). Lead-sheet MusicXML and the MIDI file carry the time signature, and MIDI notes sit at their clip's place. A Score paste before a part's first clip makes a clip there (score-14). Session chord derivation is in song time; Practice loops on its own chords' length.
  - **Note editors:** `src/daw/model/editorClip.ts` picks the clip: the selected one on the track, else the one under the parked playhead, else the first. The dock roll, the keyboard roll and the drum grid all use it. `ClipPianoRoll` ({trackId, clipId}) derives the origin. The roll and the drum grid draw, number and snap in the song's bars (`rollGrid.ts`), and chord colours use song time, the timeline's mini-notes included (pianoroll-01, -02, -09, -10; dock-instruments-01, -03, -10). Only a track with no clips opens a blank roll, at the playhead's bar; Grooves add at the playhead's bar.
  - **Chord lane and moves:** `ChordRegion.sourceClipId` (set by Prism takes). `tracksSlice.moveClip` is one write; it refuses a collab-held track or the wrong track type with a toast, moves its own chords (never below 0), and the selection follows. A split hands later chords to the right half. Nudge moves by the grid step; paste is type-checked; paste, duplicate, delete and split are each one named undo step. Every timeline gesture snaps to one grid and moves freely with snap off, and the snap toggle never seeks (timeline-05, -06, -14, shell-18). `offsetChordRegions` is removed.
  - **Audio assets** (`src/daw/audio/assets/`): `assetStore` holds one asset per recording; clip ids link to it, and it is found by assetId, URL or buffer. `AudioBufferStore.ts` is now its facade.
  - **Freeing audio:** `assetGc` keeps what the project, the undo history and the clipboard play, and runs after a project switch and when the history drops edits. Cloud audio stays cached up to 128 MB; local-only takes stay until the drafts hold them. pendingMedia releases its buffers too.
  - **Loading:** `load-audio` makes one fetch per asset and retries after 1/4/16 s, then waits for a manual Retry; it also retries when the browser comes back online. `assetStatus` gives each clip loading, failed or missing.
  - **Honest UI:** Timeline tiles say "Loading…", "Couldn't load — click to retry" or "Audio missing — not uploaded"; the Chops sampler shows the status with Retry (audio-core-07, -08; state-reload-23, -27; timeline-25, -26; engine-hooks-16; live-input-17).
  - **Upload stamps** adopt the assetId; the recorder frees its chunks.
  - **Cloud:** tracks carry `settings.audioClipIds`; a cloud open reuses valid, unique ids (R3 `ids.audioClips`).
  - **Persistence:** `SESSION_SCHEMA_VERSION` 4, compat 3 (`leadSheetBars`, region `sourceClipId`, nothing changes meaning). New fixtures `v4-all-fields` and `cloud-1.10`; `v3-all-fields` and `cloud-1.5` are kept and still open whole. `v3Shape.test` is now `draftShape.test`.
- **Verification:**
  - `npm run lint` pass.
  - `npx vitest run`: everything passes except the known failures. Those are the 4 song-data suites from the local `_generated_index.ts` (songCredits, songDegrees, songRoadmaps, songEventLinks) and the `studentPath.characterization` snapshot from the Globe commits. New tests: timeModel 20, measureEdits 10, metreAwareChords 5, moveClip 7, editorClip 6, rollGrid 3, assetStore 10, assetGc 6, loadAudio 5, leadSheetPlayhead 3, plus cases in ChannelStrip.pianoRoll, clipRelativeEditors, toSetListChart, migrations and cloudOpen.
  - **Fast tier `studio:check`:**
    - unit: only the known snapshot fails.
    - round-trips (laptop): 75/75 ok, 0 new losses, R3 legacy and document mode fixed.
    - lessons: 69/78 steps, 9 failing, all known (same as 1.9). 12/12 complete; 4/4 Premium gated for free.
  - **Full-tier round-trips** (`--tier=full`, laptop and chromebook): 196 scenarios ok, 0 new or unowned losses, 0 page errors. R14 real and R15 skipped (no previous build). `knownLosses.json` changes only the four R3 entries: `ids.audioClips` 1 → 0.
  - **Full-tier lessons** (chromebook and small): 141/156 steps, 15 failing, all known (same as 1.8 and 1.9). 24/24 complete; 8/8 gated.
  - **Golden:** pass, every fixture the same at 44.1 and 48 kHz, export = render.
  - **Bundle:** pass. DawApp 283.1 kB gzip, +1.3 over 1.9.
  - **Perf `--quick`, both profiles:**
    - playback: 0 store writes/s and 0 commits/s. Chromebook 4 long tasks in 5 s (231 ms), the known Oracle per-note node cost.
    - fader drag and note drag: 1 write and 1 undo step per gesture. Note drag on chromebook 19.4 ms of long tasks per move (1.9: 24–31).
    - timeline scroll draw p95: 2.3 ms on chromebook, 1.3 ms on laptop.
  - **Browser probe** (scratchpad `probe-1.10.mjs`):
    - The dock roll on a clip at bar 5 numbers from 5 and shows both notes.
    - - Measure after bar 2 in 3/4 moves later chords by 1440 and section B from bar 2 to 3, and makes the chart 5 bars long.
    - The header says 3/4.
    - A clip never uploaded draws "Audio missing — not uploaded". A failing asset reports failed and stops after 4 attempts, then waits for a click.
- **Harness:**
  - The kitchen sink sets `leadSheetBars` and a region's `sourceClipId`; the fingerprint names `sourceClipId` by clip place.
  - The fast tier runs the 1.10 tests.
  - The golden suite's 36 "live track sync not seen" warnings are pre-existing: the same 36 show on `a81e8904`. The probe waits for `setAudible` calls that the 1.7 reconciler skips when a gate doesn't change.
- **Open issues:**
  1. Collab: `sourceClipId` and `leadSheetBars` aren't in the Y.Doc yet (1.14, like chord identity). On a peer's page, moving a Prism take leaves the lane alone. No Y.Doc shape changed, so there was no `COLLAB_DOC_SCHEMA_VERSION` bump and no PartyKit deploy.
  2. music-atlas-api (Ryan): `audioClipIds` rides in track settings, so settings must stay verbatim (already assumed for `sourceTrackId`). Split halves share one assetId (since 1.1): server asset GC must delete only unreferenced assets.
  3. The drum grid and roll don't show which clip they edit, and have no previous/next clip control (Stage B dock).
  4. No Grid menu yet (2.7), so the triplet and other grid sizes are unreachable from the UI.
  5. The Lead Sheet still draws no clef, key or time glyphs on bar 1 (second half of leadsheet-23).
  6. `measureRowSizes` counts chart slots, as the song export writes it, while the Score reads it as bars. They differ only around multi-bar rests (pre-existing).
  7. The Prism generator's patterns are 4/4. A take in 3/4 spans 6 bars that hold four 4/4 bars (engine, 1.16a / Stage C).
  8. The loop drag snaps to multiples of the grid from 0, not from each bar line. It matters only for grids that don't divide the bar.
  9. No single `splitClipAt` store action: the scissors and Split at Playhead use the existing single-write helpers in one transaction.
  10. The audit ledger (`phase-map.json`) is not updated, as before.
  11. A rollback to a pre-1.10 build opens drafts written by 1.10 read-only. That is 1.4's rule for newer schemas: they still read them (compat 3), and nothing writes over them.
- **Owner sign-offs:**
  - **No persisted `AudioClip.sourceId`:** the design asked for one. Instead the asset store keys a take by its assetId, or by its decoded buffer before upload, which 1.4's content-addressed drafts already share between split halves. This avoids a Y.Doc change and a PartyKit deploy.
  - **Schema 4 (compat 3):** a rollback opens 1.10's drafts read-only.
  - **Only Prism takes' chords move with a clip:** chords written on the sheet, seeded or analysed never move with a clip. Before, every MIDI clip drag moved the whole lane.
  - **Snap off means every gesture is free:** before, clip drags fell back to a beat and markers to a bar.
  - **Compound metres:** the beat grid is the dotted quarter.
  - **Nudge** moves by the grid step, or by the metre's beat with snap off.
  - **+ Measure:**
    - With nothing selected, it appends at the end.
    - Inserting inside a chord extends the chord.
    - Inserting inside a multi-bar rest lengthens the rest.
    - The melody the sheet shows moves with the bars.
  - **A new lead-sheet chord** lasts to the next chord or its bar's end (it was one beat).
  - **Note editors:**
    - They follow the selected clip, then the clip under the parked playhead, then the first clip.
    - A blank roll appears only for a track with no clips, at the playhead's bar.
    - Grooves are added at the playhead's bar, not stacked on bar 1.
  - **Audio memory:**
    - Up to 128 MB of decoded cloud audio stays after a switch.
    - A take that exists only on this device stays until the drafts store it.
  - **Failed loads** retry after 1, 4 and 16 s, then on a tile click or when the browser comes back online.
  - **MIDI export** now writes the time signature and clip positions (the clip positions were listed for 1.11).

## 08 — 1.12a unblock and split the route (2026-10-14)

- **Branch:** `aaron` at `e2e5d26f` (1.8, 1.9, 1.10, Globe and teacher-app commits, all unpushed). The tree also held another session's teacher-app WIP (routes, grades, teacher workspace, a staged rename); none of it is in these commits, which were made by pathspec.
- **Commits:** `ad31b3d1` (dashboard diet), `77bfaeab` (save and reload once after a failed chunk), `d4914bac` (early fetch, DawSkeleton, no content gate, content failures that retry), `324537cd` (lazy views, dock tabs, instruments, dialogs; crash boundary), `5a5a037e` (bundle budgets in the fast tier), `234bb484` (cache headers). Each typechecks on its own (`git archive` copies).
- **Pushed:** no. Pushing would push the 1.8–1.10, Globe and teacher-app commits under it, which wait for the teacher-app commit `5403f647` (owner's hold).
- **What changed:**
  - **Bundle:** DawApp chunk 283.1 → **93.6 kB gzip** (budget 150). The editor's boot closure (DawApp plus the chunks it imports that the page hasn't loaded) 552 → **356 kB gzip**. The Studio dashboard's own download 124 → **23 kB gzip**; no page outside the editor loads the store, codec, registry, save status or Yjs.
  - **Every-page items:** demoProjects writes its clips with a dependency-free `projectDocument/midiColumns.ts`; StudioRecentProjects reads `projectsClient`, not the save path. The other two listed items were already done by 1.4 (StudioNewProject reads the legacy name raw; useSongActions imports no editor code, `localSession` is gone).
  - **Early fetch:** `src/daw/preload.ts` (`preloadDaw`, `memoLoad`): the route module starts the fetch at boot on an editor URL (beside sign-in); `/studio` fetches when idle and on pointer-over, focus or press of its tiles; Save-Data skips idle and hover.
  - **No ContentGate:** the editor paints at once. A song link waits for the library under the Opening overlay; a library that fails says "The song library didn't load" (panel, Retry) instead of "not found", and `ensureSongContent` retries after a failure.
  - **Retry that works:** Chrome 153 never re-requests a dynamic import that failed (seen in the probe), so an open whose chunk didn't arrive is `reloadToRetry`: Retry saves and reloads onto the link's address. While a reload after a deploy is pending, refused links keep their keys.
  - **DawSkeleton** (`src/daw/shell/DawSkeleton.tsx`): the route's placeholder in the editor's shape; 0 px edge shift against the loaded editor at 1366×655 and 1440×787.
  - **Lazy parts** (`src/daw/shell/lazyParts.tsx`, one owner):
    - Score, Lead Sheet, Mix and Practice views.
    - FX, Grooves, Parts, Prism and piano-roll tabs, and the Master effects.
    - Every instrument view; CrystalIcons rides with the amp view, 26.9 kB.
    - Settings, the Prism suggestion, the piano-roll window, the chord-analysis offer, Export Audio, the Projects dialog, the shortcut sheet and the lesson overlay. These mount on first open and stay mounted.
    - Each part has a same-size placeholder and its own boundary. A part already fetched renders with no placeholder.
    - Hovering or focusing a view tab or a dock tab preloads it (VexFlow too for Score and Lead Sheet). A lesson preloads its steps' views and tabs when it starts.
    - Loaded on first use: WebMidi (16 kB gzip), the MIDI file reader and writer, the MusicXML writer and the practice generator.
  - **Errors:**
    - `DawErrorBoundary`: a crash writes the draft at once (`flushLiveDraft`), says whether that worked, and offers Reload editor or Back to Studio.
    - `PartBoundary`: a failed part costs only its own area.
    - `EditorRouteBoundary`: an editor chunk that fails keeps the app frame.
    - `vite:preloadError` (`src/lib/chunkReload.ts`, installed in main.tsx): saves through the new `src/lib/beforeReload.ts` hook, which the autosave registers, then reloads once a minute at most. It never reloads offline.
  - **Cache headers** (vercel.json): `/assets/*` immutable for a year. Samples, NAM models, MIDI and the SF2 under `/daw-assets` get a day plus a week of stale-while-revalidate. Worklet JS and JSON keep revalidating on every load.
  - **Harness:** `bundle.mjs` enforces the 150 kB boot-chunk budget and "editor core off other pages". It also reports the boot closure, the dashboard and each lazy part's chunk. The bundle suite now runs in the fast tier, with 1.12a's tests added to the unit list.
- **Verification:**
  - `npm run lint` pass.
  - `npx vitest run`: everything passes except the known failures (the 4 song-data suites from the local `_generated_index.ts`, and the `studentPath.characterization` snapshot). New tests: preload 8, lazyPart 11, chunkReload 8, contentBoots 10, editorRoute 2, songStoreRetry 1, MidiDeviceManager 3, autosave +3.
  - **Fast tier `studio:check`** (rerun on the final commit `234bb484`, unit list now with 1.12a's tests):
    - unit: 124 files, only the known snapshot fails.
    - round-trips (laptop): 75/75 ok, 0 new losses.
    - lessons (chromebook): 69/78 steps, 9 failing, all known (same as 1.9 and 1.10). 12/12 complete; 4/4 Premium gated for free.
    - bundle: pass, both budgets (DawApp 93.5 kB gzip on this build).
  - **Browser probe** (scratchpad `probe-1.12a.mjs`, warm dev server):
    - Songs held 6 s: the editor paints at 0.85 s and the song opens at 6.9 s.
    - Songs fail: the panel says the library didn't load; Retry reloads onto `?song=africa`, which opens.
    - Genre flows held 5 s: paints at 1.4 s, Practice at 6.1 s.
    - An MSP launch with songs never arriving opens its lesson (coach card shown) and keeps `msp`, `interactionId`, `module` and `activityRef`.
    - Skeleton vs editor: 0 px shift on both profiles.
  - **Chunk 404** (development-mode build served by `vite preview`): the ScoreView chunk routed to 404. The page reloaded exactly once, and the unsaved track was there after the reload. The second failure showed "The Score couldn't load" and did not reload again.
  - **Perf** `views,load --quick` (dev path):
    - First switches on chromebook settle at Score 466 ms, Lead Sheet 108 ms, Mix 142 ms (Oct 6 baseline: 424, 71, 90). The view's code is fetched on the first switch unless a hover fetched it first. Later switches are unchanged.
    - No page errors.
- **Open issues:**
  1. Collab is still in the editor's chunk (CollabProvider, Yjs managers, about 20 kB gzip). Yjs is on the boot path through the store's undo middleware anyway, so a collab facade wouldn't remove it. That's 1.14 and Stage C store work.
  2. The rest of the boot closure is structural: the store (32 kB), the audio engine (26), Yjs (25), the session (19), `chordProgressionLibrary` through the Unison slice (13) and the codec (11).
  3. `SetListUpdatePrompt` stays mounted, so the set-list hooks are in the boot closure (about 9 kB).
  4. A hover preload that 404s after a deploy also triggers the save-and-reload. Vite's event can't tell a hover from a click, and the session reopens in the same view.
  5. Fonts (Google Fonts @imports, Glacial OTF → WOFF2) were not in 1.12a's scope (bundle-load-14).
  6. The audit ledger (`phase-map.json`) is not updated, as before.
  7. The dev-path cold load on the chromebook profile is dominated by about 79 MB of unbundled dev modules. The production numbers are the bundle report's.
- **Owner sign-offs:**
  - **Reload policy:** a failed chunk reloads the page after saving, at most once a minute per tab, never offline.
  - **Retry for a failed content chunk** reloads the page, since Chrome won't fetch a failed module again.
  - **Cache policy:**
    - Samples get a day's cache, so a sample, IR or SoundFont replaced in place can play its old copy for up to a day. Version the names when 1.12c swaps assets (the reverb IRs especially).
    - `/assets` is immutable.
    - This ships to prod with the next merge to main.
  - **Dialogs** mount on first open and stay mounted (so close animations and state are kept).
  - **"Editor core off other pages"** is now an enforced budget; a change that puts the store, codec, registry, save status or Yjs on the dashboard or every page fails `studio:check`.

## Plan addition — Stage D, teaching features (2026-10-14)

- **What:** the owner asked for a plan from a competitor review: three videos (Andrew Huang's Soundtrap tour; Soundation Education's getting-started and Google Classroom import guides) plus hands-on sessions in Soundtrap and Soundation.
  - The result is Stage D, milestones 4.0–4.7: a sharing and comments API contract with a mock, read-only review, Studio assignments (each student gets their own copy; turn in), timeline comments, song sections, chord keys, key changes that move clips, and genre starters.
  - It runs beside Stage C; Stages A–C keep their order.
- **Where:** `29-D-teaching-features.md`, the Stage D plan, moved here from `reference/` the same day (design, evidence, decisions SD1–SD11, per-milestone notes, exit criteria). `reference/plan.md` has decision 15, the Stage D section, "Room for Stage D" notes under Stage B and the polish track, the ownership rows, and timeline comments moved out of Deferred. The README has the Stage D run order: the plan is 29 and prompts 30–37 aren't written yet.
- **Code:** none changed. The facts were checked read-only against the working tree on `aaron`, which holds another session's 1.15 WIP, untouched.
- **Pushed:** no; these docs are uncommitted.
- **Owner sign-offs:** SD1–SD11 before prompts 31–37 run.
- **Findings (same day):** `reference/plan.md` § "Findings added on 2026-10-14" lists F1–F12. These are code problems found during the review and verified by hand, each with an owning milestone:
  - collab viewer role, rejoin duplicates, room storage and kick logs → 1.14;
  - presence colour → 3.13;
  - the synth following the detected key → 1.16a;
  - audio clips vs tempo changes → 1.11;
  - marker hit area → 3.3;
  - unmounted `DialogHost` → 2.3;
  - dead MIDI-effect placeholders → 1.17b;
  - half-built drag payloads → 3.8;
  - the cloud contract's schema number → a doc fix.
  - Also: hands-on ideas for 1.12b, 2.11 and 3.8, and a personal clip library added to Deferred.
  - `29-D-teaching-features.md` gained the non-Suno extras for 4.2, 4.5 and 4.6. Suno research stays out of the plan, at the owner's request.

## 09 — 1.15 lesson and practice persistence (2026-10-14)

- **Branch:** `aaron` at `8671e0b0` (1.8–1.12a, Globe and teacher-app commits, all unpushed). The tree also held other sessions' WIP (teacher app, Globe, a staged grades rename, `verifyProdBundle.mjs`); none of it is in these commits, which were made from a temporary index by pathspec.
- **Commits:** `a2e2d7ba` (lesson completion scoped to its slide), `fff69f56` (the lesson and practice context in the draft; resume; preconditions once), `bafc8c5c` (practice keys play and record on the student's track), `96efe1c2` (harness: R27, context compared, 1.15 carve-outs gone), `becf691d` (knownLosses: 55 losses gone per profile, R27 added). The three code commits each typecheck, lint and pass their suites on their own (`git archive` copies of each tree).
- **Pushed:** no. `origin/aaron` is still `8276f068`; pushing would push 60 commits, among them the 1.8–1.12a, Globe and teacher-app commits that wait on the teacher-app commit `5403f647` (owner's hold, as for 1.8–1.12a). The pre-push lint would also stop on `docs/globe-ui/BASELINE.md`, which the Globe commit `f019271a` left unformatted.
- **What changed:**
  - **The context rides in the draft** (`src/daw/persistence/drafts/draftContext.ts`). The lesson `{id, stepIndex}`, the practice session (the student's track id inside it), the practice keyboard and the practice screen ride in the draft's meta (`DraftContext`, which 1.4 had reserved). The body is unchanged. Every write records the context from the live session (`draftContextOf`), so a kept draft, a fork and the hide-time mirror carry it too. A step or practice change is written on the 1 s debounce but isn't an edit: the save chip never shows "unsaved" for it. The registry has a new list, `CONTEXT_KEYS` (session keys of group `context`), and the autosave's trigger reads it.
  - **Only the same draft brings it back.** `applyPreparedDraft` restores the context (`restoreDraftContext`), so a refresh, a cold resume, Restore of kept work, a draft from Projects and a fork's copy resume it. Every other open resets it with the session, so a lesson never follows the student into another project, and the cloud copy never carries it. What a draft holds is checked first:
    - an unknown lesson, or a Premium lesson the plan no longer opens, is left out;
    - the step is clamped;
    - a practice session of another shape, or one whose "Back to lesson" leaves the app, is left out;
    - a student track the project no longer has is dropped.
  - **Resume:** the lesson comes back at its step with the view the draft kept. A new store flag, `tutorialStepPrepared`, means the layer applies a step's preconditions once, as the step arrives, never again on a remount or a resume. That closes the R2, R5 and R12 `channelStripTab` losses. The step's check arms on the restored project. A reopened lesson says "Lesson resumed at step N of M". The codec still opens a `practice` body on Create; the context puts the practice screen back with its session.
  - **Explicit exits:** Quit lesson and Back to lesson take the context out of the draft. Back to lesson clears the practice session and goes to Create before navigating.
  - **Completion scoped to the lesson** (practice-tutorial-09). `useMspModuleCompletion` takes an optional activity (`launchIsFor`, `studioTutorialActivityRef`), and the Studio overlay reports only when the stashed launch is `studio:tutorial:<this lesson>`. Learn, Genre and the Globe report as before.
  - **Practice inputs** (practice-tutorial-04, -11):
    - The practice keyboard's keys play through the live-notes path (`src/daw/midi/usePointerNotes.ts`). PianoKeyboard has a new optional `onKeyPointerDown`; its click path and the lesson piano are off on this screen. A note lasts until pointer-up anywhere, blur, hide or unmount, at velocity 100.
    - While the practice screen shows, `src/daw/midi/liveTarget.ts` sends every live note (keys, computer keyboard, MIDI) and every take to the session's student track, whatever the Studio has armed, monitored or selected since.
    - A take lands on the track it started on (`useMidiRecording`).
    - Take feedback reads the student's track (`practiceStudentTrack`).
    - The keyboard's view and scale choices live in the store (`practiceKeyboard`), so a trip to the Studio or a refresh keeps them.
    - The copy now says "Play along on these keys, your computer keyboard or a MIDI keyboard".
  - **Harness:**
    - New scenario R27 (fast, 7 flags): a refresh mid-lesson resumes at step 4 with tracks and view intact, plus the toast; File ▸ New ends the lesson and keeps its draft; Restore resumes it; two tabs keep their own lessons; practice keys pressed while recording make a 3-note take on the student's track; a practice refresh restores the screen, session and take.
    - `REOPEN_CLASSES` and `RESTORE_CLASSES` now compare the context, and the 1.15 `LOSS_OWNERS` and `withoutLessonResume` carve-outs are gone.
    - The fingerprint shows `context.practiceKeyboard`, and the kitchen sink's practice session names its student track.
    - 1.15's tests are in the fast unit list.
- **Verification:**
  - `npm run lint`: eslint (whole tree, 0 warnings) and `tsc -b` pass. Prettier passes on every file of these commits; it stops only on `docs/globe-ui/BASELINE.md` (the Globe commit's).
  - `npx vitest run`: 1000 files pass. The 6 that fail are known or another session's:
    - the 4 song-data suites from the local `_generated_index.ts`;
    - the `studentPath.characterization` snapshot;
    - `EraRail.test.tsx`, in the Globe commit `8671e0b0` ("expected '1980' to be '1979'").
  - Under full parallel load, the three song-link tests (contentBoots, intents, openSession) sometimes hit their 5 s timeout while the song library loads. They pass alone and in the full run.
  - New tests: draftContext 17, useMspModuleCompletion 4, pointerNotes 6, TutorialLayer +4, useMidiRecording +3, autosave +1 (context keys).
  - **Fast tier `studio:check`:**
    - unit: 128 files, only the known snapshot fails.
    - round-trips (laptop): every scenario ok, 0 new losses, all 1.15-owned losses fixed. R27: 7/7 flags.
    - lessons (chromebook): 69/78 steps, 9 failing, all known (same as 1.9–1.12a). 12/12 complete; 4/4 Premium gated for free.
    - bundle: pass. DawApp 94.2 kB gzip (1.12a: 93.6), boot closure 358 kB (356), dashboard 23.2 kB.
  - **Full-tier round-trips** (`--tier=full`, laptop and chromebook): 99 ok and 2 skipped per profile (R14 real and R15: no previous build). 0 new or unowned losses, 0 page errors. R11, R12 and R19 now compare the context too. `knownLosses.json`: 55 losses gone per profile, R27 added, nothing else changed.
  - **R27 in the browser:** a refresh at step 4 resumes at step 4 with tracks, tab and coach card, and the toast says "Lesson resumed at step 4 of 8". File ▸ New ends the lesson and keeps its draft; Restore resumes it at step 4. Two tabs keep make-first-track @4 and jazz-color-your-chords @3 across refreshes. Three keys pressed while recording each light one key and make a 3-note take on "Melody — D Dorian" (the other tracks unchanged). A practice refresh restores the screen, the session, the key and the take.
- **Open issues:**
  1. The practice screen keeps its teal accent (`#7ecfcf`); Stage B / 3.12 restyles Practice.
  2. There is no "Resume lesson" tile on the Production page. Restore from the kept toast or Projects resumes a lesson; the tile belongs to 1.2b's launcher.
  3. Learn and Genre lesson completions are still unscoped. The hook takes an activity now; adopting it there needs those modules' activityRef formats checked end to end.
  4. Practice keys don't glide: each press is one key.
  5. A context this build can't restore (for example a lesson only a newer build has) is dropped at the next write of that draft.
  6. The audit ledger (`phase-map.json`) is not updated, as before.
- **Owner sign-offs:**
  - **Context follows the draft, not only a refresh.** A new tab that resumes the draft, Restore and Projects also bring back the lesson or the practice screen.
  - **An untouched lesson is still not work** (1.4 rule). A lesson session with no edits is dropped when another session opens, so its step is lost. The lesson link restarts it.
  - **A resumed lesson keeps the student's view.** Its step's panel isn't forced open again; before 1.15, a remount re-opened it.
  - **Back to lesson ends the practice screen.** A browser Back afterwards lands on Create with the tracks.
  - **The practice screen records the student's track only,** even if another track is armed in the Studio.
  - **No schema bump.** The context lives in the draft's meta (an optional field both draft stores keep since 1.4), the body and the Y.Doc are unchanged, and the cloud never sees it.

## 10 — 1.16a harmony core (2026-10-15)

- **Branch:** `aaron`, started at `80161645` with a clean tree. While it ran, `origin/aaron` moved to `b88cb9c9` (20 commits from other sessions: Music Maps, 6/9 chords, the back office, a merge of `main`). The milestone's commits were rebased onto it; the one conflict (`seedStudioFromGenrePracticeTrack.ts`) kept both sides.
- **Owner decisions (2026-10-15):** fix the genre strum numbering (yes); keep `firstChordsFor` tonic-first in modes (yes, after a worked comparison: A minor opens and restarts on Am, not C).
- **Commits:**
  - `0a28481e` engine data: `'major/1'` voices F/C (it was B♭m/F); a slash chord's engine quality survives mode conversion (E/G♯ in A minor was stored as `'5 major/5'`, read as E/B); suggestions read a lane's style from canonical qualities (prism-engine-01); E/G♯ and E sus4 colours (prism-engine-15).
  - `46d8a7d1` chord identity filled everywhere a chord is made, and at load.
  - `cb3ab1cc` `effectiveKey`.
  - `d44ac832` validated chord entry.
  - `029a8477` Lead Sheet paste and clear local to their span.
  - `1779ec49` set-list update guard.
  - `be6c1873` genre strum numbering.
  - `b0e7ed6f` first-load weight back down (see bundle).
  - `c870a06a` the fast tier runs 1.16a's tests.
  - `fb8ca5fc` formatting of `PianoKeyboard.tsx`, which the incoming merge left unformatted (layout only; the pre-push lint stopped on it).
- **Pushed:** yes, to `aaron` (fast-forward from `b88cb9c9`). The bundle tier's every-page failure comes with `origin/aaron` (see Verification).
- **What changed:**
  - **Chord identity** (`src/daw/harmony/chordIdentity.ts`, decision D3). `{rootPc, quality, bassPc, source, label}` is filled:
    - by Prism Create (the built chords, `given`; past the sequence, from the notes, `detected`) and Suggest Chords (`given`);
    - by analysis, merge-mode recording and a bass under a chord (`detected`);
    - by seeds through `setChordRegions` (songs, practice tracks: `given`; anything else: `derived`);
    - by a typed or relabelled chord (`given`), which also drops the degreeKey that described the old chord.
    - At load, the codec's `decodeSession` runs `ensureChordIdentities` (`derived`): idempotent, the letter name first (a song's degrees can count from a local key), a slash degree read as the engine's inversion unless the degreeKey has no slash (the practice tracks' `'2 maj/1'` is D/C). Every chord of the 42 captured drafts gets one.
    - A key change carries each identity to the chord's new name and relabels the chord from it (`chordLabels`), slash chords included.
    - Readers: `formatChordRegion` (Timeline ruler, Lead Sheet, practice chart) writes Jazz and Roman from a current identity, keeping the region's own spelling; Suggest's style reads it.
  - **`keyFrame.ts`** (tonic, mode, parent key; lane ↔ graph degrees; degrees ↔ pitch classes) and **`chordLabels.ts`** (the labels a known chord is stored with).
  - **`effectiveKey.ts`**: the student's key, else a detected one marked `detected`, else none. The synth's "follow project key" (F6), "snap to song key", vocal pitch correction and the live chord detector read it; with no key, the offline and UNISON audio analyses get no prior (they assumed C major).
  - **Validated chord entry** (`harmony/chordInput.ts`, moved from the Score): Lead Sheet, Score and the Timeline ruler. A known chord is stored in the lane's dialect with its identity; text that names none stays in the box on Enter/Space with "Not a chord we know. Try Cmaj7, Dm7b5" (amber outline, 12 px), or is dropped with a toast when the box loses focus. Rename opens on the chord (`D−7`). A new Lead Sheet chord is pending until it names a chord, so Escape leaves no C behind. Escape in the Score closes the chord menu. The store's rule for a chord on a beat is one helper, `laneWithChordAt`.
  - **Paste and clear** (leadsheet-08, chord part): a block paste replaces chords across its span only, each as long as it was copied; clearing leaves the bars empty; loose chords go in as typed chords do; every chord outside the span is the same object.
  - **Set-list guard** (leadsheet-04, -27): no offer for a chart with no chords or fewer bars or sections than the set's copy; the dialog shows both ("6 bars · 1 section · C major"); "Keep the old one" is the white pill with focus; an update keeps the entry's title; the chart is built when a save asks. The Send dialog's buttons are the Studio's pills (no teal).
  - **Genre strum:** `GENRE_STRUM` holds `StrumMode` values. Jazz, R&B, Neo Soul, Bossa, Jam Band and Indie strum Human (were Up), Reggae Up (was Down), Rock and friends show Down (sounded Down, showed Synchronized). The D7 check also accepts the old numbering, so projects saved before don't count their genre's strum as the student's.
- **Verification** (on the rebased tree unless noted):
  - `npx yarn lint` passes.
  - `npx vitest run`: 15,624 pass. Failures are all on `origin/aaron` without these commits: the 4 song-data suites (local `_generated_index.ts`), the `studentPath.characterization` header snapshots, and two from the incoming work, `lineage.calibration` (Atlas) and `features/landing/music.test.ts` (`songDemoChart`). Checked by running them on a `git archive` of `b88cb9c9`.
  - New tests: harmony (`chordIdentityRead` 23, `chordLabels` 6, `keyFrame` 7, `effectiveKey` 4, `chordInput` 16), `chordIdentityWrites` (rewritten for 1.16a, 19), engine (slash conversion, `'major/1'`, every graph chord coloured and voiced root first, style from canonical qualities), Create and Suggest identities, `chordSymbolEntry` 6, paste locality 3, set-list offer 4 + guard helpers 2, genre strums, D7 with the old numbering, F6.
  - Persistence tests that compared a load with the stored draft now set aside the identities a load reads (`source: 'derived'`) and check them separately; a decode → encode → decode round trip is stable.
  - `studio:check` (before the rebase): unit only the known snapshot; round-trips every fast scenario ok, 0 new, 0 fixed, `knownLosses.json` unchanged; lessons 69/78 steps, the 9 failing all known (as 1.15), 12/12 complete, 4/4 Premium gated for free; bundle pass. After the rebase: round-trips the same (every fast scenario ok, 0 new, 0 fixed) and lessons the same (69/78, 9 known, 12/12, 4/4 gated). The unit tier also hit 5 s timeouts in the song-link tests (`contentBoots`, `intents`, `openSession`, `SongDetailView.openInStudio`, `useSongActions`) and `editorRoute` while the machine was loaded (35 s for the tier, 13 s before); all 6 files pass alone (105/105). The bundle tier fails, and fails the same way on `origin/aaron` without these commits: the editor store and `fields.ts` are on every page. Cause: `b61bbd77` (back office, Learn keyboard) made `features/practiceTracks/genre/openGenrePracticeTrack.ts` import `swapGenrePracticeBacking` statically from `seedStudioFromGenrePracticeTrack.ts`, which imports the store; a dynamic import there would fix it. Not changed here (another session's file).
  - **Bundle:** DawApp 94.6 kB gzip (94.2 before). The boot closure first came out at 386 kB (358.0 before): the always-mounted set-list offer took its buttons from the `src/daw/ui` barrel, which brought the kit's menu, select and dialog chunks. Fixed in `b0e7ed6f`: 360.9 kB (+2.9 kB: typed-chord reading and the key selector), dashboard 23.2 kB, unchanged. On the rebased tree: 313.5 kB against `origin/aaron`'s 310.7 (the store moved into the every-page entry there).
  - **Browser** (a scratch script on the harness, `?song=a_thousand_years`, chromebook and laptop): 87/87 chords with a current identity, F/A read as F over A, identities kept through a key change, rename opens on the chord, `xyz` + Enter shows the hint, `F#m7b5` stored as `b6 min7b5` / `F# min7b5` with its identity, a refresh keeps all 87 identities, no page errors. Screenshot checked at 1366×655.
- **Open issues:**
  1. The identity isn't in the Y.Doc: a collaborator's new chord arrives without one (readers fall back to its labels; a reload reads one). Carrying it bumps `COLLAB_DOC_SCHEMA_VERSION`: 1.14. The diff engine also doesn't sync a degreeKey change (pre-existing).
  2. Pitch Correction's own root and scale pickers still set the project key (live-input-12's "Follow project key" toggle is 3.5's).
  3. `'5 major/7'`, which the graph and curriculum mean as G/B ("G – G/B – C"), plays G/F♯: `CHORDS['major/7']` is the chord's major seventh below. Same family as `'major/1'`; left as it is for the owner.
  4. Set-list Send and Update still report success before the save lands (leadsheet-20).
  5. Insight still names a keyless audio analysis "in C Major" (its labels count from C; only the priors changed).
  6. For 3.2/3.7/3.8: Insight's key name (insight-16), suggestion label format (prism-engine-10), Create's labels for 2- and 3-chord loops and its per-click worker (prism-engine-04, -06), Synchronized/Balanced ignoring the amount (rest of prism-engine-07).
  7. The audit ledger (`phase-map.json`) is not updated, as before.
  8. Inherited: `studio:check`'s bundle tier fails on `origin/aaron` (the store on every page, from `b61bbd77`), and two vitest files from the incoming work fail on it too (`lineage.calibration`, `landing/music.test.ts`).
- **Owner sign-offs:**
  - **A key change relabels chords in the lane's own words.** A song's `F/A` reads `F maj/A` in Hybrid after a key change (Jazz and Roman still write F/A and V/7, from the identity). Before, song chords kept their chart text, but their degree names stayed in the old key.
  - **Typed chords are stored as chords, not text:** a typed `F#m7b5` shows `F# min7b5` in Hybrid letters and its degree in Numbers.
  - **Leaving a chord box with text that names no chord drops it**, with a toast; Enter and Space keep it in the box with the hint.
  - **Drafts carry identities:** up to 110 characters a chord (an 87-chord song draft grows by about 7.6k, about a third). No schema bump: identity has been a region field since schema 3, and older builds keep it as they find it.
  - **The set-list offer isn't made for a shorter chart.** A student who meant to shorten one sends it again from the Set List button.
  - **Cleared Lead Sheet bars stay empty** instead of the chord before them running on.
  - **No key, no prior:** chord detection with no key set no longer assumes C major.

## 11 — 1.17a honesty remainder and Stage A exit (2026-10-15)

- **Branch:** `aaron`, started at `c37f49f8` (1.16a) with a clean tree, level with `origin/aaron`.
- **Commits:**
  - `801e76ed` the synth FX panel lists every effect that is on or routed, in the chain's order (synth-ui-09);
  - `4fd5132d` clicking an effect already in the chain opens its controls (fx-mixer-19);
  - `1cb72852` Insight's Now Playing draws a played chord with the chord cards' parts; its lesson links carry the song (insight-21, markup);
  - `68135cad` the sampler's Start and Length are typed fields (live-input-22);
  - `6d6fd46f` faders, live levels, the Peak meter and the sampler's Gain read through 2.2's `formatDb`/`formatGain` (fx-mixer-13, design-system-15);
  - `92688392` the fast tier runs the honesty tests;
  - `89cc43c1` the editor store is off other pages again (bundle-load-15; another session's `b61bbd77` had made the practice-track swap a static import);
  - `536643d6` the audit ledger with every finding's status;
  - `677e24db` the Stage A exit report.
- **Pushed:** yes, to `aaron` (fast-forward).
- **What changed:**
  - **Synth FX panel** (`oracle-synth/components/fx/fxSlots.ts`). A row shows for every effect that is on or routed, in FXChain's order (drive, chorus, phaser, delay, reverb, compressor). Most pack presets switch an effect on with no route, so the panel used to say "No effects" while drive played.
    - An unrouted effect's row needs no store write, so opening a preset doesn't make the project unsaved.
    - Its first edit makes the route: switching it off keeps the row, × switches it off, and the menu swaps it.
    - - ADD skips an effect that is already on, and new route ids skip the patch's own.
  - **FX lists** (track rack, Master view, Master track, returns): a click on an effect already in the chain selects it and opens its controls.
  - **Now Playing:** `ChordTones`, `ChordLessonLinks` and `ChordAlternatives` are shared with ChordCard. A played chord gets "Learn this sound", the song's-key and parent-scale links with the song and chord in the address, and the same "Also found in" list (with `aria-expanded`). One `plural` helper replaces the three in the Insight panel.
  - **Sampler trim:** Start and Length are number fields, 24 px tall, 12 px text, 11 px uppercase labels.
    - A typed value saves once, on Enter or blur, like a marker drag. Escape puts the value back.
    - Start keeps the end, as its marker does. Values are clamped (minimum length 1 %) and rounded to hundredths.
  - **One dB format:** the master fader reads −1.9 dB at the default 80 % in both Master and Create, and unity reads 0.0 dB. Before, the Master view called 80 % "0 dB" and added 1.9 dB to everything else.
    - Track headers, the strips' live levels, the Peak meter (dBFS, −60 floor) and the sampler's Gain use the same formatter, so the Peak meter now shows one decimal under 10 dB.
- **Verification:**
  - `npx yarn lint` passes.
  - `npx vitest run`: 15,651 pass. The failures are the ones 1.16a recorded on `origin/aaron`: the 4 song-data suites (local `_generated_index.ts`), `studentPath.characterization` (4 snapshots, which also fail on a `git archive` of `c37f49f8`), `lineage.calibration` and `landing/music.test.ts`.
  - New tests: FX panel 6, FX list 1, Now Playing 3, sampler trim fields 4, master readouts +4 (the Peak format, now 5 levels; the fader in both views, 3 levels).
  - **`studio:check:full`** (both profiles; `git archive` of `92688392` on :5263; the 1.3 build `e10ac4db` on :5264):
    - unit fails only on `studentPath.characterization`;
    - round-trips: 202 scenarios ok, R14 real and R15 included, 0 lost fields, 0 page errors, 0 regressions. `knownLosses.json` already allows no loss anywhere and is unchanged;
    - lessons pass: 141/156 steps, 15 failing (all known), 24/24 complete, 8/8 Premium gated for free;
    - perf: every scenario ok, note-drag included (1.8 skipped it). Numbers are in the exit report;
    - golden: all 10 cases identical at 44.1 and 48 kHz. golden-trace passes;
    - bundle passes: DawApp 94.6 kB gzip, boot closure 362.0 kB, dashboard 23.2 kB, editor core off other pages.
  - **Browser** (a scratch script on the frozen server, 1366×655 and 1440×787):
    - a preset with drive and delay on and no routes shows two rows and no "No effects";
    - typing 12.5 in Start gives start 12.5 / length 87.5;
    - the Master strip reads "−1.9 dB" and Peak "−∞ dBFS";
    - D–F–A in C major shows "Learn this sound · D Dorian" linking to `/learn/dorian/d?from=studio&song=…&chord=D+min`;
    - no page errors.
- **Stage A exit:** `docs/studio-perf/stage-a-exit.md`. 22 of 25 criteria are met. Not met:
  1. **Long tasks:** 14 per 20 s of Chromebook playback (1,038 ms, baseline 1,553), from per-note audio node creation (1.7's profile). Belongs to 1.11/1.13, Stage C.
  2. **Idle rAF:** 240 calls a second while idle, all from `react-globe.gl`. Every page warms the Globe up from `AppContext.tsx:35`. Handed to the Globe session in 1.7 and still there.
  3. **Collab join:** a live join isn't tested. The harness closes PartyKit sockets; what it can check (kept before join, restored on failure, bad link) passes.
- **Audit ledger:** `reference/phase-map.json` (beside the plan copy; the original is on the unmerged PR #188 branch). 255 fixed, 50 partly fixed, 317 open; critical 22 / 0 / 3, the 3 being Stage C engine work.
- **Open issues:**
  1. **The sampler's waveform is hidden at the default dock height** on both profiles. Its row collapses to 0 px and the 64 px waveform overflows under the 77 px param row, which the Gain knob sets. This predates 1.17a (the new fields are 43 px). It belongs to the dock work in Stage B (B4).
  2. **Effect parameters' own dB labels** (EQ gains, thresholds; 15 in all) still format themselves. They move with the rack work.
  3. **insight-21 rest:** the dead slice state (`applyKeyToSession`, `unisonLoading`, `clearDetectedKey`, `keyConfidence`, `activeNotesBitmask`, `liveAnalysis`, all registry-classified), the `isDrumTrack` and `LIBRARY_ITEMS` copies, and LibraryPanel's unreachable ICON_MAP are left for 3.7.
  4. **design-system-15 rest:** Mute All only mutes, and Test Sound logs to the console.
  5. **Idle commits:** an idle editor makes 0.3 React commits a second outside every profiled region (0 at baseline). Not traced.
  6. **Timing:** audio clips still start 69–100 ms early and the count-in downbeat is 38–45 ms late. This is 1.11's scheduler; Stage A had no timing criterion.
  7. The synth FX panel keeps its teal accent and 9–11 px labels (synth polish, 3.11).
- **Owner sign-offs:**
  - **The master fader reads its real level:** −1.9 dB at the default 80 %, where the Master view said 0 dB. Teachers may notice.
  - **The Peak meter shows a decimal under 10 dB** ("−6.0 dBFS"), so it matches every other level. 1.2 had chosen whole dB.
  - **Preset effects appear in the synth's FX panel** in chain order. A preset's saved routes change only when the student edits one of those rows.
  - **Clicking an effect already in the chain selects it** (it did nothing before).
  - **This prompt changed another session's file** (`features/practiceTracks/genre/openGenrePracticeTrack.ts`) to put the bundle budget back. The behaviour is the same: the switch already awaited before the swap.
  - **The ledger lives beside the plan copy,** not in `docs/studio-audit-2026-10/`, until PR #188 merges.
  - **Stage A exit:** accept the three unmet criteria as owned by Stage C, the Globe session and the manual walk-through, and go on to Stage B (prompt 12). Gating the Globe warm-up off the editor route would close the idle-rAF criterion.

## 12 — B1: 2.1 tokens and guardrails, 2.3 overlays and settings (2026-10-15)

- **Branch:** `aaron`, started at `99e77232` (the owner's merge of `main`, not yet pushed then; it goes up with this push). Clean tree apart from another session's untracked `src/daw/collab/server/.partykit/`, left alone. `npm install` was run to install `partyserver` from that merge; the lockfile churn it made (`libc` fields) was reverted.
- **Commits:**
  - `9b11a9b8` one palette on `:root`: `src/daw/ui/daw-tokens.css` generated from `tokens.ts` (`npm run studio:tokens`, staleness test) and loaded by `src/main.tsx`; 1,293 `var(--color-*)` uses moved to `--daw-*`; `useTheme`, `THEMES`, `useDawBodyTokens`, `body.daw-active` and the FileMenu/PopOutOverlay/ExportAudio copies deleted; floating panels on the opaque popover surface; glass removed; teal retired; canvases on `getDawPalette()` (design-system-01/02/05, shell-11/23/36, ia-flows-13, collab-10, practice-tutorial-19/24, bundle-load-19, shell-31);
  - `d46e6c26` the legacy design ratchet (`designGuard.test.ts` + budgets) (design-system-17);
  - `f2e3559f` the editor's own questions: DialogHost mounted, Save As / Delete / section label / marker rename, ConfirmModal deleted (design-system-14, shell-22, ia-flows-33);
  - `7ecbd973` every dialog on DawDialog (design-system-13, collab-10/25, shell-23);
  - `dc6f3189` Audio & MIDI settings and the MIDI status (shell-21, engine-hooks-27);
  - `63d64afd` the global autofill animation rule scoped to form fields (menus closed with Escape stayed on screen);
  - `77851bc8` R28 overlays scenario, `designProbe.mjs`, budgets lowered, fast-tier unit list.
- **Pushed:** yes, to `aaron` (fast-forward), with the bundle tier's inherited failure below.
- **What changed:**
  - **Tokens.** The generated sheet is named `daw-tokens.css`, not `tokens.css`: beside `tokens.ts`, the extensionless `./src/daw/ui/tokens` import in `tailwind.config.ts` resolved to the CSS file under vitest's loader. Legacy `surface-2` maps to the translucent white/4 token, so the 26 floating panels that used it as their own fill take `popover`. `--daw-line-rgb` (`lineRgb`) added for canvas grid lines. Dim text is #8e8ea3; ruler text white/70 (was white/25).
  - **Teal.** Transport and collab toggles show white/10 when on; pill buttons are white with dark text; switches are a white track with a dark knob; the Vocal and Guitar input meters are meter green; synth, Practice and FX accents read `COLOR.accent.value` (near-white); teal tints became white tints. Track, key and amp-gem colours are untouched (meaning).
  - **Ratchet.** `src/daw` outside `ui/` and `shell/` keeps per-file counts (now 699 hex, 286 rgb, 316 text under 11 px, 71 literal z-index, 28 `whileTap`) that can only go down; stale budgets fail; `DESIGN_BUDGETS=lower` rewrites. Teal, `--color-*`, glass and `daw-active` are banned in all of `src/daw`, and so are native dialogs. Rendered side: `designProbe.mjs` checks the 12 px floor (11 px capitals) and 24×24 targets inside `[data-ds="v2"]`, skipping `[data-ds="legacy"]`. DawDialog and ConfirmDialog panels carry `data-ds="v2"`.
  - **Dialogs.** DialogHost shows a request a tick after it is asked (same tick as a closing Radix menu left `pointer-events: none` on `<body>`); `menuOpener` is shared with the Projects host. DawDialog gained `data`, `contentRef` and `closable`. Moved: Export Audio (Segmented, white-pill Export, anchors kept), chord analysis, Prism suggestions (keymap bound to the panel), Add Track, Premium lesson notice, both set-list dialogs, Invite (+ Copy invite link to `?collab=`), Removed from session, the leave prompt (not closable once the host left), the recording confirms, Pitch Correction's expanded frame (its body `data-ds="legacy"`). The Grooves BPM question stays in its panel (see sign-offs).
  - **Settings.** Lists devices without asking; picking an input is what asks; Selects throughout; Input/Output Config views removed; MIDI chip in the dialog, top-bar indicator removed; `MidiStatus` is `idle | ready | no-device | unsupported | denied`.
  - **Projects dialog.** Already on the 2.2 primitives from 1.4; R28 found nothing to restyle. Its sections take another group (room for 4.2's Assignments).
- **Verification:**
  - `npm run lint` passes.
  - `npx vitest run`: 15,753 pass; 12 files fail, all failing at `99e77232` before this milestone (song-data suites, `lineage.calibration`, `landing/music.test.ts`, harmony corpus/crosscheck, apiContract, repoContent, `songEventLinks`); EraRail passed this time (date-sensitive). The "Funk L1" snapshot is not among them.
  - **`studio:check`** (fast, own server on 5263): unit pass (166 files); round-trips pass, 0 lost fields, 0 page errors, R28 all 8 flags at both viewports; lessons pass after the Grooves fix: 69/78 steps, 9 known failures, 12/12 complete, 4/4 Premium gated for free; **bundle FAIL, inherited**: "editor core off other pages: every page: `src/daw/store/index.ts`, `fields.ts`, `saveStatusStore.ts`" fails identically on a `git archive` of `99e77232`. DawApp 94.0 kB gzip (94.8 before), initial JS +0.4 kB.
  - Browser (1366×655): Settings, Export, File menu screenshots checked; Settings opens with no `getUserMedia` call.
- **Open issues:**
  1. **Bundle leak from the `main` merge** (Peter's bands / genre practice tracks): e.g. `features/practiceTracks/genre/buildGenrePracticeTrack.ts` takes a value import from `@/daw/store/prismSlice`, and the curriculum reaches the band player's `@/daw/instruments`. Not traced to the line; not this milestone's code.
  2. **PianoRollModal and PopOutOverlay** stay as they are (opaque; the piano roll is a Radix dialog) until 2.9 deletes both.
  3. **Legacy popovers** (Key, Time Signature, collab, track colour) are opaque and teal-free but ignore Escape (the collab one); they move to the Popover primitive with the top bar (2.5) and track list (2.6).
  4. **Projects dialog extras** from the archived 2.3 design (All/Cloud/Device filter, Rename, Duplicate) were not built; the prompt asked for a restyle only.
  5. `NewTrackModal` has no callers (2.6's AddTrackSheet reuses its descriptions); restyled anyway.
  6. Export's focus can start on Cancel rather than the first Segmented option (Radix radio roving tabindex).
- **Owner sign-offs:**
  - **The look change (plan risk):** accent → white everywhere, dim text #8e8ea3, ruler labels brighter, no glass. Toggles on are white/10; previously teal text.
  - **The Grooves "Change Project BPM?" question stays inside its panel**, not a modal: the coach card sits above modals (z 80 vs 50) and covered a centred dialog's Add Anyway in the Hip Hop lesson.
  - **`src/index.css` (app-wide) changed:** the `onAutoFillCancel` animation hook applies to form fields only. Nothing listens for it; it was keeping Radix menus on screen after Escape across the app.
  - **The top bar loses its MIDI indicator**; MIDI status lives in Settings.
  - **"Removed from session" copy** is now "You left the session … The host removed you …".
  - **Copy invite link** shares `/studio/editor?collab=<code>`; joiners wait for the host as the link already did.
  - Colour sign-offs the plan defers to the Stage B review (presence colours, confetti) are untouched.
