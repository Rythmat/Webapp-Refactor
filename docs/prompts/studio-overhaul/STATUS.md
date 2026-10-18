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
- **Pushed:** yes, to `aaron`, after merging origin/aaron (16 commits: the owner's `main` merge `be0c35ab` with Peter's band and genre work, PRs #198–#200; no conflicts), with the bundle tier's inherited failure below.
- **Inherited from that merge, not this milestone** (the same 4 fail on a `git archive` of origin/aaron alone, run as `npx vitest run src/daw src/layouts src/components/ClassroomLayout`): `designGuard` "lets no file go over its budget" (the incoming `PianoRoll.tsx` edits are over its legacy budget), and three song-link tests that fail only in that larger run (`contentBoots` slow song library, `intents` and `openSession` song transpose); all three pass alone.
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

## 13 — B2: 2.4 shell frame, 2.5 top bar v2 and focus mode (2026-10-16)

- **Branch:** `aaron`, started at `9e206689` (B1). Clean tree apart from another session's untracked `src/daw/collab/server/.partykit/`, left alone.
- **Commits:**
  - `0a75fa31` layout prefs per user: `inspectorOpenByView`, `inspectorWidth`, `dockHeights`, `readoutMode` (registry `pref`, prefsStore); a view switch opens the Inspector as the student keeps it there (ia-flows-21); fingerprint and kitchen sink cover them;
  - `0c89beb5` the `Resizer` primitive (`src/daw/ui/Resizer.tsx`);
  - `4b0d7365` the shell (`src/daw/shell/StudioShell.tsx`, `layout/`) and the top bar (`shell/topbar/TopBar.tsx` and parts), the interim tools strip (`shell/canvas/InterimTools.tsx`), lesson copy, harness selectors (shell-19/20/29, ia-flows-24, insight-04, design-system-12);
  - `a8a93079` focus mode (`ClassroomDashboard`);
  - `cceb3687` R29 shell scenario, fast-tier unit list, designProbe skips resize edges;
  - `0f7205dd` two known lesson failures off the list; R25/R26/perf selectors.
- **Pushed:** yes, to `aaron`, after merging origin/aaron (16 commits: the owner's `main` merge `be0c35ab` with Peter's band and genre work, PRs #198–#200; no conflicts), with the bundle tier's inherited failure below.
- **Inherited from that merge, not this milestone** (the same 4 fail on a `git archive` of origin/aaron alone, run as `npx vitest run src/daw src/layouts src/components/ClassroomLayout`): `designGuard` "lets no file go over its budget" (the incoming `PianoRoll.tsx` edits are over its legacy budget), and three song-link tests that fail only in that larger run (`contentBoots` slow song library, `intents` and `openSession` song transpose); all three pass alone.
- **What changed:**
  - **Shell.** Grid `top top / main inspector / dock inspector`, 44 px top row, rendered once outside the view switch. The Inspector column (LibraryPanel, UserList, ChatPanel until 2.8) is mounted in every view (one `data-mount-id` across Create → Mix → Score → Lead sheet → Create); the dock region is Create's. The practice screen hides the top bar and the Inspector (`hidden`, still mounted). Sizes are CSS variables on the shell root (`--daw-dock-h`, `--daw-insp-w`, `layout/shellGeometry.ts`): drags write them without a render and commit once on release. Dock: 36% of the body by default (40% for Prism and the piano roll), 120 px to 85%, snaps at 25/40/60/85%, double-click default ⇄ 60%, Enter closes it; Inspector 200–420 px. Width/height springs removed from ChannelStrip, LibraryPanel, UserList, ChatPanel (content fades in, opacity only). `leadsheet-print.css`'s direct-child rule now also shows the child that holds the sheet. DawSkeleton follows the new geometry.
  - **Inspector default.** Before the student chooses: open in Create from 1440 px, closed below (and in the other views). `useInspectorFollowsPrefs` applies the choice when an open settles and when prefs arrive; a running lesson is left alone. `setLibraryOpen` is now "for the moment" (lessons, Analyze, chord analysis); `toggleLibrary` / `setInspectorOpenFor` are the student's choice.
  - **Top bar.** Project zone: Back to Studio, Project menu (was FileMenu; Import and Export as labelled groups, not submenus; Delete in red at the bottom), name (140/96 px), the 150 px save chip, Undo/Redo. Transport: Back (previous marker or start), Forward (next marker or end), Stop, Play (36 px white pill), Record (red; red fill and a ping while recording; the readout says Count-in…), readout (bars ⇄ m:ss.t, click to switch), Loop, Click with a count-in caret. Right: Song chip + popover (CircleOfFifths with its mode list, 12 metres + custom, BPM with −/+ and Tap), view tabs (Create · Mix · Score · Lead sheet, Practice first with a session; manual activation), Share pill (start/join; in a session faces, count, status dot, Invite/People/Chat/Leave), typing chip, Inspector toggle (key I), Help menu (Keyboard shortcuts, Lessons), Audio & MIDI settings, avatar menu. `SaveChipAnnouncer` moved into the top bar.
  - **Fold** (`useToolbarOverflow`, measured per level, cached, re-measured on content change): 1 typing chip icon-only while off, 2 Share icon-only, 3 Help + Settings into '⋯', 4 Song chip short, 5 name 96 px, 6 count-in into '⋯', 7 tighter tabs. Measured: 1440 → level 2, 1366 → 4, 1280 → 7, nothing clipped at any.
  - **Interim tools** (until 2.7): Snap, chord-ruler labels, zoom −/level/+/fit in the empty 200×62 corner above the track headers, so the lanes lose no height.
  - **Focus mode.** No ClassroomSidebar, TopRail or MobileChordNotationBar on `/studio/editor`. `useTopRailStats` shared by TopRail and the avatar menu; the TopRail's leading slot (`topRailSlot.ts`, `EditorTopRailSlot`) is deleted. The practice header has the avatar menu.
  - **Deleted/moved:** TransportBar → TransportControls, FileMenu → ProjectMenu, CollabToolbar → SharePill (git moves, tests ported), ZoomIndicator, the MIDI pill (B1), EditorTopRailSlot.
  - **Lessons:** step ids and anchors unchanged. Copy: "Click **Mix**", "**Project → Export → Audio…**", slow-bpm says to open the Song chip and targets `['transport-bpm', 'song-chip']` (the tempo once open, the chip until then). The Song popover closes when a lesson step done in it moves on.
- **Verification:**
  - `npm run lint` passes.
  - `npx vitest run`: 15,794 pass; 12 files fail, the same 12 that failed at `99e77232` (B1's list). The "Funk L1" snapshot is not among them. `editorRoute.test.tsx` timed out once while two suites shared the CPU; it passes alone (3/3) and in the final run.
  - **`studio:check`** (fast, own pages on 5263): round-trips all ok, 0 lost fields, 0 page errors, after fixing R25/R26 selectors (both re-run ok); R28 all 8 flags at both sizes, with the Song and Share popovers on the design floors too; **R29 (new) all 7 flags at 1366×655, 1440×787 and 1280×720**: dock 221/268/244 px, timeline 1,166 px on a Chromebook, Inspector closed/open/closed, one Inspector mount, a resized dock restored after reload, no floors broken in the top bar, 0 top-bar commits in 3 s of playback. Lessons at **all three sizes, both personas**: 221/234 steps, only known failures, 36/36 complete, 12/12 Premium gated; R&B balance-fader (chromebook) and bounce-mixdown (all) pass now and left the known list. **Bundle FAIL, inherited** (identical to B1: store, registry and save status on every page); DawApp 98.9 kB gzip (+4.9 kB), budget 150.
  - Browser (Chrome at 1366×711 and 1512, plus headless at the three target sizes): Project menu, New, Song popover (key, metre, tempo, lock on close, focus back to the chip), Share, account menu, '⋯', Inspector toggle and per-view memory, a dock drag committed once and restored after reload, Hip Hop slow-bpm and R&B Mix/Export done by hand, practice screen and Take it to the Studio, Lead sheet and Mix views; no console errors but a pre-existing third-party StrictMode warning.
- **Open issues:**
  1. **Follow** (centre zone) is not built: it belongs to 2.7's `src/daw/editor/follow`, and a toggle without it would be a dead control.
  2. **No Alt+1–4 view keys and no F6 region cycling:** the keymap rules reserve Alt+1–8 for the Chromebook shelf and forbid F-key-only bindings. Views stay on the tabs (Tab and Enter); regions keep their aria-labels.
  3. **Not built from the archived design:** New from template ▸ (templates stay in the Library), the DEV-only Developer group (Analyze and Export analysis stay for everyone, as before), print buttons moved out of Score/Lead sheet, a shared `importMidiToTracks`, the per-project view-state sidecar (1.15's draft meta and the 'view' fields already restore view, zoom, scroll, track and dock tab).
  4. The Song popover's top overlaps the coach card's header on Hip Hop's tempo step (the instruction stays readable); lesson-overlay docking is 1.2b's.
  5. Zones are `role="group"`, not `role="toolbar"` (no roving tabindex yet).
  6. A taller dock shows empty space under content that doesn't stretch (the instrument keyboard); 2.9's dock content.
  7. Mix's strips row still cuts off sends, returns and the master strip at 1366×655 (known lesson failures, 2.10).
  8. Chrome here may report the full screen width at first after a window resize; exact-size checks are headless.
- **Owner sign-offs:**
  - **Focus mode's avatar menu:** name, Level · XP, streak, Profile, Awards (count), Notifications ("No notifications" while there is no feed), Chord notation (only once it's on in Settings), App settings, Back to Studio. The credits stub is not shown.
  - **Label changes:** Master → **Mix**, File → **Project**. Dock labels (Controls/FX/Piano Roll) are unchanged until 2.9.
  - **The Inspector starts closed on a Chromebook** (below 1440 px) and open on a laptop, until the student toggles it; then their choice per view is kept on that device. Lessons are unaffected.
  - **Key lock unchanged:** opening the Song popover frees the key, closing it locks a chosen key, as the old Key popover did; the chip shows a lock. The design's explicit Lock switch was not added.
  - **Export items are a labelled group in the Project menu,** not an Export ▸ submenu (one move for lesson clicks and the keyboard).
  - **Forward** (next marker or end) kept beside Back.
  - **The Typing chip shows only its icon while off** when the bar is narrower than about 1490 px (fold step 1).
  - **Collaborator faces in the Share pill use presence colours,** which the plan leaves to the Stage B colour review.

## 14 — B3: 2.6 track list v2, 2.7 Create canvas (2026-10-16)

- **Branch:** `aaron`, started at `5b2c0103` (B2) plus `aa689d62` (the owner's prompt note). Another session's untracked `src/daw/collab/server/.partykit/`, `src/scripts/enrichment/research/` and its `.gitignore` line left alone.
- **Commits:**
  - `737e3288` editor core and registry: `src/daw/editor/{zoom,viewport,snap,follow}`, the Follow pref, the chord lane's offer and Not now (draft **schema 5**, compat 3; v5 all-fields and `cloud-2.7` fixtures), V/B/C tools, the 'tracks' key scope, fingerprint and kitchen sink;
  - `b6d2d963` track list (`src/daw/shell/tracklist/`): rows, ⋯ menu, Master row, keys, grip reorder, the Add-track sheet, empty-project tiles, one `importMidiToTracks`, Indie's step through the ⋯ menu, the old headers and pop-out deleted;
  - `af1618b8` canvas: one scroller (TrackArea), the Timeline on the row layout, Create's toolbar, chord-lane header and banner, scrollbar in the footer, Follow, Draw, ruler/palette;
  - `2731c65e` harness: R30, R28's popovers (track menu, Grid, chord-lane key), the perf fader probe and view region, the Indie driver and known list;
  - `4cd659de` **the top bar trimmed and quieted** (owner request mid-run, below);
  - this entry.
- **Pushed:** yes, to `aaron` (fast-forward; `origin/aaron` had not moved).
- **What changed:**
  - **One scroller** for rows and lanes, placed from one height array (`shell/tracklist/rowLayout.ts`, 64 px rows; ready for inline automation). The Timeline takes the scroller as `scrollRef` (no parentElement chains). Above the lanes: toolbar 32, ruler 32 (loop strip 14 + bar numbers 18), chord lane 24. The m:ss row under the lanes is gone (the readout's time mode). Footer 40 px: Master row (volume, meter, automation, Effects → Mix) and the scrollbar.
  - **Track row** 64 px: colour bar (= reorder grip), name (= selector; double-click/F2/N renames), presence dots, ⋯; M, S, Arm (record tone), Fader over a Meter (MeterBus). Remote-held tracks: outlined in the holder's colour, only M/S live, Listen toggle instead of Arm/fader. ⋯: Rename, Colour ▸, Role ▸, Monitor input, Test sound, Show automation (`automation-toggle`), Release (session only), Delete track (one undo step, Undo on the toast).
  - **Keys (A11Y#3)**, region scope 'tracks' (on a row's name only): ↑ ↓ Home End (and ⌘↑ ⌘↓), ⌥↑ ⌥↓ (and ⌘⇧↑ ⌘⇧↓ for ChromeOS) move, Enter opens the dock with focus in it, F2/N rename, M/S mute/solo (ahead of the global M).
  - **Add-track sheet** (DawDialog lg, wrapping grid): Keys, Synth, Organ, Instruments, Drums, Sampler, Voice, Guitar, Bass, Import MIDI file… (opens the picker; the Project menu's import is the same function). After an add the dock opens on the Instrument tab, except during a lesson.
  - **Empty project:** Start with a beat (Drums, pads), Play an instrument (Keys, computer keyboard on), Start from a genre (Drums, Grooves), Add a track (the sheet).
  - **Toolbar:** + Add track; Pointer/Draw/Cut; Snap; Grid menu (metre-aware choices and names, Triplets, Snap); zoom −/%/+/Fit; Follow; + Marker (at the playhead on the grid, named in a prompt); chord-lane labels; Colour: Track | Harmony (`clipColorMode`, one undo step). It folds (labels → icons, zoom level, Harmony toggle) instead of clipping. Room left for + Section.
  - **Draw tool** now draws: a click in an empty MIDI lane makes a one-bar clip from the grid line before it, selects its track and opens the dock's note editor (drum grid for drums).
  - **Chord lane header:** CHORDS · key chip (opens the Song popover; dashed with no key) · + (Prism suggestions after the last chord, Premium-locked). **Banner** in the lane: "This song has notes but no chord symbols. Analyze… · Not now"; Analyze opens the existing analysis dialog; Not now is kept in the draft.
  - **Follow:** past 85% of the width (or off screen) the view turns a page; paused by wheel, pan, scrollbar, ruler zoom, clip drag and toolbar/key zoom until Play or Stop; one store write per page.
  - **Zoom** is anchored (the old sum scaled the scroll too) and Fit uses the measured canvas width (`publishTimelineWidth`).
  - **Ruler/canvas colours:** labels 11 px in ruler/dim text, never overprinting (markers first); chord names 12 px; playhead white (`--daw-playhead`, the piano roll's too), record red while recording; loop, marquee, triplet lines from the palette.
- **Owner requests during the run (2026-10-16):**
  - **"The top rail looks too busy" → trim and quiet both** (`4cd659de`): Back, Forward and Stop left the bar (Esc stops; new global Home/End = previous/next marker or the ends, `commands/transportSkip.ts`; the ruler seeks); Help, Audio & MIDI settings and the computer keyboard's switch live in one '⋯' (the typing chip shows only while on); Share is an icon; the save status lost its pill and the readout its box; Back to Studio, Undo, Redo and '⋯' are dimmer (`ui/styles` QUIET); hairlines divide the transport. The bar no longer folds at 1280/1366/1440 (fold kept for narrower windows: Song chip, name, count-in, tabs). The save chip keeps its wording ("Saved on this device" says the cloud copy lacks the work; the save checks and harness rely on it).
  - **Soundtrap review** (side rail + bottom rail), screenshots in `~/Desktop/References/soundtrap-2026-10-16/` (35 + README). Owner decided: **the transport moves to a bottom rail**; a side rail drives the Inspector. Next work, not in this entry.
  - **Combine Score and Lead sheet into one page** (one Score tab with a Full score | Lead sheet switch; notes, rests, rhythmic, articulations and accidentals into Palettes; the toolbar row above the staff removed). Queued after the rails.
- **Verification:**
  - `npm run lint` passes (prettier, eslint 0 warnings, `tsc -b`).
  - `npx vitest run`: 15,893 pass; 13 fail in 17 files, none in this milestone's code: the inherited `designGuard` PianoRoll budget (B2's list), 8 suites that fail only on this checkout's stale gitignored `src/curriculum/data/songs/_generated_index.ts` (pass on a `git archive`), and 8 content/scripts files (atlas calibration, graph integrity budget, guitar theory notes, landing song chart, apiContract manifest ×2, writeVocabulary, repoStore ×2, vocabularySource) that fail identically on a `git archive` of `aa689d62` (before B3). New tests: editor (zoom anchor, Fit, grids per metre, Follow page turns/pause), row layout and reorder math, TrackList (ARIA, keys, Alt-move, F2/N rename, grip drop, delete + Undo), Add-track sheet and tiles, toolbar/chord lane/banner/Suggest, Timeline lanes on 64 px rows, Draw tool, labels never overprint; v5 draft + cloud-2.7 fixtures and a v4→v5 migration test.
  - **`studio:check`** (fast, own server on 5263): round-trips 79/79 ok, 0 lost fields, 0 page errors; **R30 all 11 flags** (rows aligned to ±0 px at top/middle/bottom at all three sizes; Chromebook 4 whole rows with the dock open, 7 closed; laptop 5/9; 1280×720 4/8; Follow made 2 page turns in 9 s and held after a sideways scroll; banner stayed dismissed after reload); R28 8/8 at both sizes after it moved off the old colour popover; R26 and R29 all flags on the trimmed bar. Lessons at **all three sizes, both personas**: Chromebook 71/78, laptop 75/78, 1280×720 73/78, every failure on the known list, 12/12 complete, 4/4 Premium gated. **Bundle FAIL, inherited** (store, registry and save status on every page, as B1/B2); DawApp 102.0 kB gzip (+3.1 kB), budget 150.
  - Browser (Chrome, own server): empty project tiles, Add-track sheet, track ⋯ menu and Colour swatches, chord-lane key chip and Song popover, Draw tool clip → dock piano roll, Indie's open-automation step through the ⋯ menu completing, the trimmed top bar; no console errors but the known third-party StrictMode warning. During the run the owner's server on 5179 briefly showed "The Studio couldn't load" while files were being swapped; a reload fixed it.
- **Open issues:**
  1. **Duplicate track** (design's ⋯ item) not built: copying Oracle patches, audio buffers and note ids needs its own care.
  2. **Instrument-status ring** on the row waits for 1.13's instrument lifecycle.
  3. The **Fader cap** (12 × 24 white) is heavy in a 64 px row; a slimmer row variant of the primitive is a 3.x polish.
  4. **Lessons that boot empty** (Indie) still need a track the steps never add (known failure); the tiles now give the student a way in.
  5. The coach card can cover the bottom of an open ⋯ menu (Delete) on Indie's step; docking is 1.2b's.
  6. **Indie draw-volume is now known at 1280×720 too** (was Chromebook only): the toolbar and footer moved the automation lane up, and the 270 px coach card fits neither above nor below it, so it clamps over the lane's right end. Docking is 1.2b's.
  7. Piano roll keeps V/D/E for its tools while the timeline uses V/B/C.
  8. R26's typing-chip flag now measures the chip only while typing is on (it is gone when off).
- **Owner sign-offs:**
  - **Draft schema 5** for one view field (the per-project Not now); the cloud document's schema number follows (5), its content unchanged.
  - **Follow lives in Create's toolbar**, not the top bar's centre: only the timeline follows, and the top bar's fold stays as measured in B2.
  - **Tile wording** from the plan's Stage D note (Start with a beat, Play an instrument, Start from a genre, Add a track), not the archived design's four; "Play an instrument" turns musical typing on.
  - **Suggest is an icon (+)** in the chord-lane header (name in the tooltip): "+ Suggest" doesn't fit 200 px beside CHORDS and the key.
  - **Ruler order kept:** ruler on top, chord lane under it (next to the music); loop strip stays 14 px (the piano roll shares it).
  - **+ Marker asks for a name** in a prompt (Enter keeps "Marker N"); inline rename on the canvas was not built.
  - **Tools V/B/C** (plan default), digits kept.
  - **The dock opens on the new track's Instrument tab** after an add, except during a lesson.
  - **Top bar trim:** Stop is gone from the bar (Esc), Back/Forward became Home/End, and the keyboard's switch moved into '⋯'.

## Owner request — B4a: the side rail and the bottom rail (2026-10-16)

After a Soundtrap review (screenshots and notes in `~/Desktop/References/soundtrap-2026-10-16/`), the owner moved the transport to a bottom rail and gave the Inspector a side rail of icons. Not one of the numbered prompts: it lands between B3 and prompt 15 (B4).

- **Branch:** `aaron`, on `53a18377` (B3's entry). Another session's untracked `src/daw/collab/server/.partykit/`, `src/scripts/enrichment/research/` and its `.gitignore` line left alone.
- **Commits:**
  - `70c00d70` **the rails**: the layout, the store and registry, the Inspector's panels, the bottom rail, the top bar without the transport and the song;
  - `bcde0043` **the Mix view fits under the bottom rail**;
  - `a5fe1b14` **harness**: R29's rails and side panels, R28's song popovers, R30's row budget, the Library's rail in R4/R12, the kitchen sink, the lessons' known list;
  - this entry.
- **Pushed:** yes, to `aaron` (fast-forward), from a temporary worktree of HEAD: the pre-push lint sees another session's untracked files in this checkout.
- **What changed:**
  - **Shell grid** (StudioShell): `top top top` / `main inspector rail` / `dock inspector rail` / `bottom bottom bottom`. The Inspector runs from the top bar to the bottom rail, so the dock stops at it (as Soundtrap's library does). The practice screen hides the bars, both rails and the Inspector (still mounted).
  - **Side rail** (`shell/inspector/SideRail.tsx`): a 48 px column of six icons, the owner's choice: Insight, Library, Effects, Lessons, People, Chat. The open one is a white tile; a second click closes the Inspector. I opens and closes it on the panel it last showed. Chat shows an unread count. It replaces the top bar's Inspector toggle and the session's People and Chat columns.
  - **Inspector panel** (`shell/inspector/InspectorPanel.tsx`, 300 px by default, 240–420; widths saved under 240 fall back to the default): a header (name and ×) over one body.
    - _Insight_ is the old panel's Insight tab; a piano-roll Analyze still brings it forward.
    - _Library_ is the templates, with a search. It opens them through openSession as before, and is off in a shared session.
    - _Effects_ adds an audio effect to the selected track and opens the dock's Effects tab on it (five per rack). Its rows carry test ids, not the dock's `fx-add-*` anchors, so a lesson's spotlight never lands here.
    - _Lessons_ is the Production catalog. It opens a lesson through openSession (`kind: 'tutorial'`), so a free student gets the upgrade dialog; it marks the running and finished lessons and links to the Studio's Production tab.
    - _People_ shows the connection, the room code (copy) and who is here; outside a session, "Start a session" opens the room and its invite.
    - _Chat_ is the room's chat; showing it marks messages read.
    - Store: `inspectorPanel` (a per-user **view pref**, in the registry and prefsStore with its validator), `toggleInspectorPanel`, `showInspectorPanel`. `userListOpen`, `chatPanelOpen` and their toggles are gone (session state, never saved). **No draft schema change.**
  - **Bottom rail** (`shell/bottombar/`, 44 px, full width):
    - _Left: Master_ — volume, level, its automation (which switches to Create, where the lane is) and Effects → Mix. It moved out of the track list, whose footer is now only the 16 px scrollbar.
    - _Centre: the transport_, moved from the top bar and centred in the window: Play, Record, the readout, Loop, Click and its count-in.
    - _Right: the song as three controls_ — Key (the circle of fifths in a popover; the key lock as before), Tempo (an inline field with Tap; `transport-bpm` is on it) and the time signature (a popover of the common metres and a custom one). Below 1100 px of rail the key drops its mode word.
    - The chord lane's key chip opens the same Key popover (the circle only). The Song chip and its combined popover are gone.
  - **Top bar:** Back, Project, the name, the save chip, Undo/Redo | the view tabs, centred | Share, the typing chip, '⋯', the avatar. Its fold has two steps left (name, tabs); it folds at none of the three sizes.
  - **Mix view:** the mixer keeps its full height and the mastering section scrolls in what is left. On a Chromebook the two no longer fit under the rail. The faders, sends, return and master strip now show at every size, and the lessons' three known Mix failures pass.
  - **Lessons:** Hip Hop's tempo step targets `transport-bpm` alone ("Set the **Tempo** at the bottom to **95 BPM or less**").
- **Verification:**
  - `npm run lint` passes (prettier, eslint 0 warnings, `tsc -b`).
  - `npx vitest run`: 15,896 pass. 10 fail in 14 files, none in this work's code:
    - the inherited `designGuard` PianoRoll budget;
    - the suites that fail only on this checkout's stale `_generated_index.ts`, and the content/scripts files, the same as B3's list;
    - `EraRail.test.tsx` (Atlas), which is flaky under the full suite's load: it passes on its own 3/3 and on a clean `git archive` of HEAD.
    - The first run caught two problems, both fixed: `DawApp.bootLinks.test` now mocks the bottom rail (its master meter polled the mocked engine: 11 uncaught errors), and the deleted panels' design budgets are gone.
  - **`studio:check`** (fast, on 5263): round-trips 79/79 ok, 0 lost fields, 0 page errors.
    - The first run caught two problems, both fixed:
      - R4's `libraryTemplate` prefs check saw the scenario's own rail click; the kitchen sink now leaves the Library panel showing.
      - The Mix squeeze below.
    - **R29: all 9 flags at all three sizes:**
      - Top bar 44 px, fold 0.
      - Bottom rail 44 px, its zones clear, the transport centred to the pixel (683/720/640).
      - Side rail 48 × 567 on a Chromebook.
      - Timeline 1,118 px on a Chromebook, under the new ≥ 1,100.
      - Dock at 36% of the new body (205 px).
      - Each of the six icons shows its panel, a second click closes it, I reopens it, and no panel has text under the floor or a target under 24 × 24.
      - No commits from either bar during playback.
    - R28 (Key and Metre popovers, the chord lane's key popover) and R30 pass.
    - Lessons pass at all three sizes, both personas: Chromebook 74/78 (was 71), laptop 76/78 (was 75), 1280×720 74/78 (was 73). The only failures are Indie's known ones. All eleven R&B steps pass on a Chromebook, so the three fx-mixer-04 entries left the known list.
    - Bundle FAIL, inherited (store, registry and save status on every page, as B1–B3); DawApp 103.4 kB gzip (+1.4 kB), budget 150.
  - **Browser (Chrome, own server):**
    - Each panel opened from the rail.
    - Effects added Reverb to Drums and opened the dock's FX tab.
    - Key picked G with the lock shown; Metre and Tempo (92) set.
    - I toggled the Inspector.
    - The Mix view kept both rails.
    - No console errors but the known third-party StrictMode warning.
- **Owner sign-offs:**
  - **Row budget:** a Chromebook with the dock closed shows 6 whole rows, not 7. The bottom rail takes 44 px; dropping Master from the track footer gave 24 back. With the dock open it still shows 4.
  - **Timeline width on a Chromebook:** ≥ 1,100 px, not the plan's 1,120. The side rail takes 48 px, and the Inspector, closed, no longer does.
  - **Effects panel vs the dock:** the rail's Effects panel adds an effect; the dock still holds the chain and its controls. The Soundtrap-style chain of cards and the armed "Add effect" slot are the dock rebuild's (owner decision, below).
- **The plan changed meanwhile** (another session's entry above, uncommitted when this landed):
  - Prompt 15 (B4: 2.8 rails + Inspector, 2.9 dock v2) takes these rails as its starting point. They are committed and pushed here, so it starts from `a5fe1b14`.
  - Its owner answers are not built yet; they are 15's: Go to start, Rewind, Fast-forward and a metronome menu in the bottom rail; Master opening in the dock; an Export pill; ⌘K.
  - In this session the owner asked for the **Score + Lead sheet merge next**, then the dock.
- **Owner requests during the run (2026-10-16):**
  - A second Soundtrap pass on the **instrument drawer** (Instrument, Chords/Patterns, Piano Roll, Effects) and how Effects works with the side rail: 14 more screenshots (36–49) and measurements in the same folder's README. The owner decided:
    - Soundtrap's four tabs: Instrument · Chords (Prism) or Patterns (drum grid + Grooves) · Piano Roll · Effects.
    - Parts moves to the Library panel.
    - Voice and guitar tracks get no tabs: an input row, then the chain.
    - The Effects tab becomes a row of effect cards whose "Add effect" slot arms the side rail's Effects panel; each pick appends and re-arms, × cancels.
    - Order: **the Score + Lead sheet merge first, then the dock.**
- **Open issues:**
  1. The Inspector's Effects list is flat (no categories, search or descriptions yet); the dock rebuild brings Soundtrap's library.
  2. People and Chat show to everyone, with empty states outside a session; a classroom may want them hidden.
  3. The Master group in the bottom rail is MasterRow as it was; Soundtrap's "Master ▾" drawer (gain, mastering styles) is not built.
  4. Lessons don't open from the panel while a session is shared (as templates).

## Owner request — one Score page (2026-10-16)

The owner asked to combine the Score and Lead sheet tabs and to put the notes, rests, rhythmic, articulations and accidentals in the Palettes section. Their answers: one tab with two layouts, and the toolbar row above the staff removed. Done after the rails, as asked.

- **Commits:** `c1a229e3` (the page, the palettes, tests) and this entry. **Pushed:** yes, to `aaron`.
- **What changed:**
  - **Tabs:** the top bar's tabs are Create · Mix · Score. The Score tab is on in either view and opens the layout last shown. The view ids stay `score` and `leadsheet`, so drafts, keymaps (the Score and Lead sheet scopes) and the harness are unchanged.
  - **Switch:** a **Full score | Lead sheet** switch (`components/Score/ScoreLayoutSwitch.tsx`, the kit's Segmented) leads each layout's header. Its Lead sheet segment carries `view-switch-leadsheet`. The Lead sheet toolbar wraps on a narrow window (it needs about 1,175 px).
  - **Palettes** (`components/Score/notePalettes.tsx`):
    - Notes (with the dot), Rests and Rhythmic, each with a Write switch for the live layer (⌥N/⌥R/⌥H and the number keys as before);
    - Articulations, with Tie and Slur;
    - Accidentals;
    - the chord symbol joins Text, above Barlines and Layout.
    - A cell click makes its palette live and applies in the same tick (the old row's fix, kept). Active cells show what the selection has. The chord chart keeps only the mark palettes.
  - The note editor row (`NoteEditorBar.tsx`) is deleted. Its Undo and Redo are the top bar's.
- **Verification:**
  - Lint clean (prettier, eslint 0 warnings, `tsc -b`).
  - `npx vitest run src/daw`: 4,006 pass. The failures are the inherited PianoRoll design budget and three session suites that pass on their own (the song-link flake in big runs, noted at B2).
  - New tests: the palettes (the old row's six cases, ported) and the tab and switch (`scoreLayout.test.tsx`).
  - Round-trips: R26, R28 and R29 pass every flag; R29 reaches the Lead sheet through the page's switch.
  - Browser (Chrome, own server):
    - A selected note took Half, Accent and Sharp from the palettes, with the cells lit.
    - The layout switch and the Score tab worked both ways; the melody lead sheet shows the note palettes; the toolbar wraps at 1,042 px.
- **Open:** the palettes panel is still the legacy look (data-ds legacy); its v2 restyle is Stage C's (3.x). The page header's other controls (parts count, Print, MusicXML) are unchanged.

## B4 — 2.8 rails and Inspector, 2.9 editor dock v2 (2026-10-16)

Prompt 15. The rails themselves (B4a) were already on `aaron`; this run finishes 2.8 and builds 2.9, both in one chat.

- **Branch:** `aaron`, from `473089a0`. Other sessions' work is left alone: the uncommitted prompt-pack edits under `docs/prompts/studio-overhaul/` (decision 16's plan change, the Ableton review), `.gitignore`, and the untracked `src/daw/collab/server/.partykit/` and `src/scripts/enrichment/research/`.
- **Commits:**
  - `7cd85eee` **transport and Click menu** (2.8);
  - `3e889b35` **the effects library and the dock's chain as one state** (2.8);
  - `64f5c8b3` **the dock v2** (2.9);
  - `dff262c1` **harness**: R29's dock checks, the click's prefs in the fingerprint and the kitchen sink, the engine tests' mocks;
  - this entry.
- **Pushed:** yes, to `aaron` (fast-forward), from a temporary worktree of HEAD: the pre-push lint sees another session's untracked files in this checkout.
- **What changed (2.8):**
  - **Bottom rail:**
    - Go to start (⇧Home), and Rewind and Fast-forward (`,` and `.`, as in Logic), which step a bar and repeat while held. Rewind goes back a whole bar when the playhead is within half a beat of a bar line, so a press while playing never lands just behind the playhead.
    - The Click caret opens a menu: the click's sound (Click, Tick, Hi-hat; a choice plays one click), its volume (−30 to 0 dB) and the count-in. Sound and volume are per-user prefs (`metronomeSound`, `metronomeVolume`).
    - The click and the count-in now go straight to the output (`audio/clickVoice.ts`), around the master fader and the mastering chain, so mastering no longer colours them and the master meter no longer shows them; an export never had them.
    - The countInFolded leftover and two stale header comments are gone.
  - **Effects library and chain as one state:**
    - The dock's Effects tab lost its own add list. After the last effect sits an **Add effect** card: a click opens the side rail's Effects library and arms it ("Pick from the library"). Each pick fills the slot and arms the next; the armed card's × stops and puts the Inspector back as it was (`fxLibraryReturn`). The rail's Effects icon is the same state: armed means the Effects panel is showing.
    - A pick switches the dock to Effects and shows the new effect's controls (`dockEffect`); an effect already in the chain shows its controls instead.
    - The library groups the ten effects in five categories, each with a one-line purpose ("Reverb: puts the sound in a room") and each effect with a line on what it does, in neutral colours (`data/effectCategories.ts`).
    - One cap, `MAX_RACK_EFFECTS` (5), enforced by the store for tracks, the master and the returns; a track's own add never checked it (fx-mixer-19).
    - The `fx-add-*` anchors moved with the list into the library (stamped with the rack it adds to). The five lesson steps that click one get a new step precondition, `effectsLibrary`, and say Effects rather than FX.
- **What changed (2.9):** the dock moved to `src/daw/shell/dock/` (`git mv` of ChannelStrip).
  - **Tabs by track type, Effects last:** Instrument · Prism · Notes · Effects (melodic), Instrument · Grooves · Notes · Effects (drums), no tab bar on audio (the chain) or live input (its pedals or voice chain, then the effects after them, behind a two-way switch). Labels changed (Controls → Instrument, Piano Roll → Notes, FX → Effects); the ids and the `chanstrip-tab-*` anchors did not.
  - **Drums:** Notes is the drum grid; the Instrument tab is new, the kit and a pad per drum (play it, with its volume and pan; `DrumPadsView`). Hip Hop's four drum-grid steps now open Notes.
  - **Parts** left the dock for a Templates | Parts switch in the Library panel, as they were, until 2.14.
  - **Selection drives the dock:** a click on a clip selects its track and, on release, opens the clip's editor (Notes, the drum grid or the chain; `dockSelection.ts`); a double-click does the same instead of the modal. The dock follows the selected track, keeping the tab that applies (Prism and Grooves take each other's place). Notes always edits the track the dock shows (`editorTrackId` removed). During a lesson the dock keeps the step's tab.
  - **Maximize** grows the dock over the canvas (kept mounted, inert) and Escape restores it. It replaced PianoRollModal (its Analyze in Insight moved to the dock's header) and the three PopOutOverlay openers (pianoroll-11, dock-instruments-15, -21). Maximized, the Oracle synth shows its full panel and effect graphs show large. An effect's graph is a labelled Graph toggle under its knobs, in the Mix view too (fx-mixer-11).
  - **Keys:** Escape with focus in the dock shuts it, and the timeline's clip keys stay out of the dock (a `dock` region scope; the modal and pop-out scopes are gone, `dockMax` is new). Collaborators see "editing" while the dock is on Notes.
  - **Master in the dock's slot:** the bottom rail's Master button (it replaced "Master effects: open the Mix view") shows the gain, the master chain with its own Add effect slot (the library then fills the master chain, without the Sidechain) and the output's peak (`DockMaster`, `dock-master` anchor). The Mix view stays; `mastering-section` and `master-strip` stay its anchors.
  - **Height:** still a share of the body per tab, now with Master's own (0.36); a stored height for the old Parts tab is still a valid pref.
  - **Found and fixed:** the bottom rail's Master fader and meter stood 48 px in the 44 px rail (since B4a), so the shell scrolled 4.5 px whenever something was scrolled into view.
- **Verification:**
  - **Lint:** prettier and eslint clean on every file this work touched; `tsc -b` clean. The whole-tree `npm run lint` stops only on another session's untracked `src/scripts/enrichment/research/` (12 prettier warnings, 1 eslint error).
  - **`npx vitest run`:** 15,927 pass, 9 fail in 13 files, none in this work's code: the inherited `designGuard` PianoRoll budget and the content/scripts suites of B4a's list. New tests: `Dock.v2.test` (14), `effectsLibrary.test` (10), the transport's skip buttons, hold-to-repeat and Click menu, the prefs' validators.
  - **`studio:check`** (fast, on 5263): round-trips laptop 79 ok (25 full-tier only), Chromebook 101 ok, 0 lost fields, 0 page errors. Lessons at all three sizes, both personas: Chromebook 74/78, laptop 76/78, 1280×720 74/78, only Indie's known failures; 4/4 Premium lessons gated. Bundle: DawApp 103.3 kB gzip (B4a 103.4), budget 150; the every-page FAIL is the inherited one.
  - **R29:** all 13 flags at all three sizes, the four new ones included (dockTabs, dockMaster, dockMaximize, effectsArming). Maximize: 204 → 567 px on a Chromebook (the whole body) and back. R30's row budget (≥ 4 rows with the dock open at 1366×655) passes.
  - **Golden (audio):** the metronome trace passes 15/15 checks at 44.1 and 48 kHz (clicks on the beat, 4/4 count-in clicks); the renders pass 10/10.
  - **The click's level:** before, −10 dB into the master fader (0.8, −1.9 dB) and the mastering chain's crush stage (+2.4 dB at low level when off; audio-core-12, still open), about −9.6 dB at the output; now −10 dB, within half a dB.
  - **Browser (Chrome, 5263, a 1042 × 1035 window; the exact sizes are R29's):**
    - Drums: the Instrument tab's pads played (the meter moved); Notes is the drum grid, and two painted hits made a clip.
    - Synth: the dock kept Notes and showed its piano roll. Before the fix it showed the drum grid of the drum clip still selected: found here.
    - Effects: Add effect armed slot 1 and the library opened beside the dock, pushing it; Reverb then Delay filled slots 1 and 2 and armed 3; Graph showed Delay's graph; Maximize filled the body and Escape restored it; the armed slot's × shut the library.
    - Master: gain at −1.9 dB, the chain and the peak; Add effect said "Adding to Master" without the Sidechain, and a Compressor went to the master chain only. A click on the drum clip then left Master for the drum grid.
    - Vocal: no tabs, a Voice | Effects switch over the vocal chain.
    - Click menu: Tick and a 1-bar count-in set, and Escape closed only the menu. Its volume readout ran out of the popover: fixed.
    - Transport: Fast-forward twice to bar 3, Rewind to bar 2; with the click and the count-in, `.` while playing jumped a bar and Go to start went to bar 1.
    - Library → Parts: a part (Am9 – D13, 34 notes) went onto the Synth at bar 1, and a reload brought the dock back on the Synth's Notes with it.
    - Console: only the known third-party StrictMode warning.
- **Owner sign-offs:**
  1. **Tab names:** the plan's (Instrument · Prism or Grooves · Notes · Effects; the owner's answer recorded at 15:15), not the B4a note's Soundtrap names (Chords, Patterns, Piano Roll). The ids are the same, so a rename is one table in `shell/dock/dockTabs.ts`.
  2. **Drums:** Notes is the drum grid and Instrument the new kit-and-pads view; Hip Hop's drum steps moved to Notes.
  3. **Live-input tracks:** no tab bar, but a two-way switch (Pedals or Voice | Effects), because the engine has two chains in series; one chain is engine work.
  4. **Keys:** Go to start ⇧Home; Rewind and Fast-forward `,` and `.` (the plan's proposal). They also work while the computer keyboard plays notes.
  5. **The click:** three sounds (Click, Tick, Hi-hat), −30 to 0 dB, −10 dB by default, routed around mastering.
  6. **Escape in the dock** shuts the dock rather than stopping playback, while focus is in it.
  7. **A clip click** opens its editor on release, not on press, and not during a lesson.
  8. **The Effects tab** keeps our chain row of 68 px blocks with the controls below, not Soundtrap's 174 × 251 cards with controls inside: they don't fit the Chromebook's 204 px dock.
- **Open issues:**
  1. The dock's tab bodies are still the legacy look (data-ds legacy): Stage C's.
  2. The Mix view's mastering and return racks keep their own FxBrowser lists until 2.10's RackDock.
  3. The Library's Parts section is the old PartsBrowser (legacy look, tight at 300 px) until 2.14.
  4. The Export pill and ⌘K are 15d's (2.15), not this prompt's, although the B4a entry listed them under 15.
- **Next:** 15a (B5: 2.12 clips).

## Owner request — the drums' Instrument tab as a drum kit (2026-10-16)

After B4, the owner sent a reference (`~/Desktop/References/drum instrument.png`, Soundtrap's drum Instrument tab): "This image shows what the drum instrument should look like."

- **Commits:** `68784563` (the kit, the drum keys, tests, R29) and this entry. **Pushed:** yes, to `aaron`.
- **What changed:**
  - **The kit** (`shell/dock/DrumPadsView.tsx`, layout in `drumKitLayout.ts`): a top-down kit of round pads. The kick is in the middle; the snare and hi-hat sit to the left, two rack toms above, the floor tom to the right, and the crash and ride out wide. The sidestick and the open and pedal hats are badges on the rims of the drums they're played on.
  - **Pads:** each shows the key that plays it. A click plays a pad and picks it. Pads light while they sound, whether from a click, the computer keyboard or a MIDI keyboard.
  - **Our look, not Soundtrap's purple:** neutral rings, white key badges, a white ring on the picked pad.
  - **Above the kit** (beside it when the dock is under 240 px, as on a Chromebook, so the kit keeps the height): the kit's menu with ‹ ›, the kit's volume and pan (the track's), the picked pad's volume and pan, and a Keys switch. The drum-kit-selector anchor stays on the kit menu.
  - **The computer keyboard plays a kit at the kit's own octave** (`DRUM_TYPING_OCTAVE` = 2, whatever octave is set), so the letters on the pads are true: A kick, S snare, D sidestick, F floor tom, T Y U the hats, H and K the rack toms, O crash, P ride. This is a GM drum keyboard's layout. Before, A played C4, which no pad has. The typing chip says "Typing · Drums" then.
- **Verification:**
  - tsc and eslint clean on the changed files.
  - Vitest: the dock and command suites 158 pass (new: `drumKit.test`, the drum octave in `keyboardCommands.test`). The design guard fails only on the inherited PianoRoll budget.
  - R29: all 13 flags at all three sizes, with the kit now probed for the floors.
  - The Hip Hop and House lessons on a Chromebook, both personas: 24/24 steps.
  - Browser (Chrome, 5263):
    - A click on the snare played it and moved the pad knobs to it.
    - With Keys on, S played MIDI 38 and lit the snare.
    - A short dock (204 px) moved the controls beside the kit; a tall one put them above.
- **Owner sign-offs:**
  1. The kit's keys follow the GM drum keyboard (above) rather than Soundtrap's letters (Soundtrap uses digits too, which our typing scope doesn't bind).
  2. Soundtrap's Save Preset and Auto-quantize are not copied: no drum presets or input quantize exist to back them.
- **Found (pre-existing, open):** inside the editor, a `border-daw-*` colour class loses to the editor's border reset (`daw.css`, `.daw-root *`) and to the dashboard's (`dashboard.css`, `.dashboard-root *`). Same specificity, loaded later. So the design system's outlines (Select, secondary Button and IconButton, Chip, the search fields) show as hairlines in the editor. The kit and the Add effect card use the important form for now. A proper fix touches the shared `dashboard.css` reset, so it waits for the owner.

## B5 — 2.12 clips: one clip menu, the Edit pill, clip chrome (2026-10-17)

Prompt 15a. Decision 16, ST1 and ST2; 3.1's shared context menu and 3.3's clip names and menus pulled forward.

- **Branch:** `aaron`, from `2f76504f`. Other sessions' work is left alone: the uncommitted prompt-pack edits under `docs/prompts/studio-overhaul/` (this file's other new entries included), `.gitignore`, and the untracked `src/daw/collab/server/.partykit/` and `src/scripts/enrichment/research/`. The research files were formatted (prettier, eslint --fix) with the owner's OK, so that the pre-push lint passes; nothing else in them changed.
- **Commits:**
  - `136f2a5d` **document fields:** `muted` on both clip types and `name` on audio clips, through drafts, the cloud document and collab;
  - `bc9811e2` **scheduler:** a muted clip plays nothing, live or in an export;
  - `729762e1` **the clip menu, the Edit pill and the keys** (timeline-17, ia-flows-26);
  - `8b84002b` **clip chrome:** header with name and key, trim zones, fade handles, empty-canvas clicks (timeline-17);
  - `9d389fb3` **harness:** R31-clips;
  - `887be29c` **review fixes, the menu:** the Score's marks follow Transpose and Quantize; a collaborator's track refuses every action out loud; the menu's keys and ticks;
  - `a872673c` **review fixes, muted clips:** the sustain pedal, skipped audio starts, MIDI export;
  - `ca703a2b` **harness:** the Chromebook round trips run again (kitchen sink, R4's Inspector), R12's Save as… and practice screen, perf's timeline-scroll, stricter R31;
  - this entry.
  - Each commit typechecks and passes its suites alone (checked on `git archive` exports).
- **Pushed:** yes, to `aaron` (fast-forward, `2f76504f..` this entry), from this checkout with the pre-push hook (owner rule: no clone, no worktree).
- **What changed:**
  - **One menu module, in its final home** (`src/daw/shell/canvas/clipMenu/`, for 3.1):
    - `clipMenuModel` (items by clip type and context);
    - `clipActions` (what each item does, shared with the timeline's keys);
    - `CanvasMenu` (one renderer on the 2.2 Menu primitive);
    - `ClipEditPill`;
    - `canvasMenuStore` (which menu is open; a small store beside the editor's, since an open menu is nothing a project holds).
  - **Three ways in, one implementation:**
    - a right-click, which selects the clip but not its track, so the dock stays put, as in Soundtrap;
    - the Edit pill, a 44×24 button at the selected clip's bottom left;
    - a key, `clip.menu`.
  - The menu hangs beside what opened it, so it slides up to fit: 373 px, inside the window at 1366×655.
  - **The clip menu** is the same for every clip type. What can't act now stays in its place, off, with the reason as its hint.
    - Cut · Copy · Paste · Delete · Duplicate │ Rename… · Split at playhead · Mute clip · Add comment (off until 4.3) │ Transpose ▸ · Quantize ▸ (MIDI) · Fade in / Fade out (audio) │ Prism ▸ (Premium).
    - **Transpose:** steps of a half step and an octave. The menu stays open and names the move so far ("Up a minor 3rd (+3 semitones)"). Drums and audio show it off with the reason, and a move off the keyboard is refused.
    - **Quantize:** the timeline's grid first, then 1/4–1/32 and the 1/8 and 1/16 triplets. It snaps on the song's grid from the bar lines (wiring `quantizeEvents`), moves starts only, and never moves a note before its clip's start.
    - **The Score's marks follow both:** articulations, slurs, pinned spellings and slash notes move with their notes in the same undo step. They are keyed by where each note sits, so they would point at nothing after a move and the next save would drop them. `followNoteEdit` moved to `model/noteMarks.ts` for it.
    - **Prism:** Suggest chords here (from the bar under the pointer) and Open Prism. A free student sees it locked, leading to the plans, as before.
    - **A collaborator's track:** every item but Copy is off, with "Sam is editing this track" as the hint, and a key or a stale menu that still lands says so in a toast and changes nothing.
  - **The other canvas menus come from the same renderer.** They replace the hand-built menu, which covered audio clips only (a MIDI clip got a lone "Prism — Suggest Chords").
    - an empty lane: Paste here (the nearest grid line), Create clip (from the grid line before the click), Add comment, Prism;
    - a marker: Rename, Delete;
    - the ruler: Add marker here.
  - **Clip chrome:**
    - **Header:** 16 px in the track's colour, with the clip's name or its track's.
    - **Key:** a pitched clip shows its key in bold (`harmony/clipKey.ts`):
      - the song's key when ≥ 90 % of the notes' weight sits in its scale;
      - else the best major or minor key, by UNISON's Krumhansl–Schmuckler step, now exported as `rankMajorMinorKeys`, when it correlates ≥ 0.5;
      - else none. Drums show none.
      - This delivers 4.6's "pitched clips show their key".
    - **Muted:** the clip is dimmed, with a dashed edge and "Muted" in its header.
    - **Trim zones and fade handles:** trim zones are 10 px (were 6) and show as grips on the clip in hand or under the pointer; a clip narrower than three zones keeps a body to grab. An audio clip shows a fade handle in each top corner, at its fade's end. A handle drag snaps to the grid, stays clear of the other fade, and is one undo step. A trim now keeps the fades inside the clip.
    - **Redraws:** the redraw gate sees names, mutes, a track's name, role and instrument, and the detected key.
  - **Pointer on empty canvas:** a click seeks there on the grid and deselects. A drag draws the marquee, which selects notes for Insight; it used to pan. The middle button pans.
  - **The scheduler skips muted clips.** Starts are gated when they come, so a mute or an unmute while playing is heard at once, as a track's is:
    - MIDI: a muted part starts nothing and sends no controllers. One just muted lets go of its sounding notes, and of its sustain pedal if it is down, where the transport is scheduling, so nothing it had booked rings on. A part now ends only notes it started.
    - Audio: a muted clip's start is skipped and its sound stops. Unmuted before that start was due (the transport books starts a look-ahead early), it starts on the beat; unmuted later, it starts under the transport's position.
    - **Both exports leave muted clips out:** the bounce and File ▸ Export MIDI hold what plays. The chord lane's analysis and the bounce's length still count them, as they count muted tracks.
  - **New document fields:** `muted` (MIDI and audio clips) and `name` (audio clips). They are cloud 'document' fields in the registry.
    - Draft schema 6, compat 3: new v6-all-fields fixture; v5 kept for the migration.
    - Cloud document: a MIDI clip's mute rides in its clip part. A named or muted audio clip gets a part keyed by clip id, with the row it was written for (asset:start:length), so an older app's moved row doesn't take it. New cloud-2.12 fixtures; the contract doc says 6.
    - Collab: the Y.Doc holds both on each clip, and the diff sends them. `COLLAB_DOC_SCHEMA_VERSION` is 2.
    - The dashboard's schema is 6. The kitchen sink sets all three fields. Prism counts a muted take as touched, as a renamed one, so its next Create keeps the take instead of replacing it.
- **Key clashes, settled in the registry:**

  | Key                                 | Now                                                          | Before      |
  | ----------------------------------- | ------------------------------------------------------------ | ----------- |
  | ⌘E                                  | Split the selected clip at the playhead (Soundtrap, Ableton) | Export MIDI |
  | ⌘E elsewhere (Score, dock, no clip) | nothing: kept from Chrome's address bar                      | Export MIDI |
  | ⇧⌘E                                 | Export MIDI                                                  | —           |
  | ⇧M                                  | Mute or unmute the selected clip                             | —           |
  | M                                   | the click, unchanged                                         | the click   |
  | ⌘X                                  | Cut the selected clip                                        | —           |
  | N, F2                               | Rename the selected clip (as the track list's rename)        | —           |
  | ⇧↑ / ⇧↓, ⇧⌘↑ / ⇧⌘↓                  | the selected clip's notes a half step / an octave            | —           |
  | Alt+Return, Shift+F10, the menu key | the selected clip's menu, focus on its first item            | —           |

  Soundtrap's ⌘M wasn't taken: on a Mac it minimizes the window. Alt+Return and N are the Chromebook-safe ones (no F keys, no menu key). A clip key pressed on a track row's button is the row's, not the clip's.

- **Review:** an adversarial review of the five feature commits (one workflow: finders per dimension, each finding verified) confirmed 20 findings, 1 high. All are fixed in `887be29c` and `a872673c`, each with a test:
  - **high:** Transpose and Quantize orphaned the clip's Score marks, which the next save dropped;
  - Prism's next Create replaced a take the student had muted;
  - holding Alt+Return cut the clip;
  - a mute just before a note could leave it stuck, and a muted clip's controllers (the pedal, Oracle macros) still played;
  - Export MIDI wrote muted clips;
  - a locked track's keys gave no feedback (⌘X copied and kept the clip; paste and duplicate selected a clip that never landed);
  - the lane's Create clip landed a grid step late, and a clip's Suggest chords ignored where it was clicked;
  - audio clips 10 px wide or narrower couldn't be moved;
  - the menu key also opened the browser's menu, a track row's keys acted on the clip, and ⌘E with no clip reached the address bar;
  - an unmute near a clip's start left it silent for the pass, and a restart played late by the output latency;
  - the marquee didn't pause follow, hover grips stayed under the ruler, and Rename showed only F2;
  - three mute tests that couldn't fail, and R31 flags weaker than they claimed.
  - Found while testing in the browser, also fixed: the menu opened again when the timeline came back.
- **Inherited harness failures, fixed** (`ca703a2b`):
  - **Every Chromebook round trip that applies the kitchen sink errored** ("leaves view.libraryOpen at the default") since 2.4's Inspector default (`0a75fa31`): a fresh project on a 1366 px window starts with the Inspector closed, and so did the sink. Reproduced on the B4 build `2f76504f`. The sink now sets it the other way from the window's default.
  - Once they ran, **R4 called `view.libraryOpen` carried over** on a Chromebook: the sink's Library click had chosen the Inspector open in Create, a pref that rightly follows the student into the next project, while R4 expected a cold boot's closed Inspector. R4 now expects it where the carried prefs put it (unless a lesson's step sets it) and judges the prefs against the session the link replaced; the sink puts its Create choice back at the window's default, so a project's own value carried over still shows on every other link.
  - **R12 sameIdReopen** (full tier) timed out since 2.3 and 2.5: the item is "Save as…" (`4b0d7365`) and asks in the editor's own dialog (`f2e3559f`).
  - **R12 practiceMode and practiceGenre** (full tier) timed out since 2.4: the practice screen hides the top bar, and `openProjects` tested that the File menu existed rather than that it showed.
  - **Perf's timeline-scroll** found no Timeline since 2.6 (`b6d2d963`): the track area's scroller scrolls up and down only, and the old lookup wanted `.overflow-auto`. It runs again.
- **Verification:**
  - **Lint:** prettier and eslint clean on every file this work touched; `tsc -p tsconfig.app.json` clean.
  - **Vitest:**
    - The suites this work touches pass: 125 files and 1,121 tests (Score, Timeline, hooks, store, audio, shell, commands, model, harmony).
    - `887be29c` on its own (a `git archive` export): tsc clean, 21 files and 196 tests pass.
    - New tests: `clipMenuModel`, `clipActions` (the marks following, the locked track), `clipMenu` (the menu key, a held Return, the track list), `clipChrome`, `clipKey`, `intervalName`, `clipMuteScheduling` (the pedal, release timing, skipped starts), `exportProjectMidi`, the bounce's muted audio, `clipMuteSync`, the schema-6 codec and cloud fixtures, and ⌘E in `keyboardCommands`.
  - **Full tier**, on a `git archive` export of the final app tree, with the 1.3 build `e10ac4db` on 5264 as the previous build:
    - **unit:** 3,195 pass. The one failure is the inherited PianoRoll budget.
    - **round trips** (the final harness, in 6 parallel shards):
      - 105 scenarios on each profile, all ok: 0 lost fields, 0 unowned losses, 0 page errors, every goal flag true.
      - R14:real and R15 timed out booting the 1.3 build beside six other browsers, and passed when run alone on both profiles.
      - R28–R31 have no known-loss baselines, as since B2.
    - **lessons:** pass. 148/156 steps; the 8 failing are Indie's known open-automation and draw-volume steps, at both sizes and for both personas. 24/24 complete, and 8/8 Premium lessons gated for the free student.
    - **perf, playback (Chromebook):** 0 store writes/s and 0.15 commits/s. 14 long tasks (790 ms) in 20 s: the known Oracle per-note cost, Stage C's.
    - **perf, fader drag:** 1 write and 1 undo step per gesture.
    - **perf, timeline-scroll** (after its fix): scroll draws p95 2.0 ms on a Chromebook and 0.7 ms on a laptop (1.8 measured 3.0 and 0.9), so the clip headers cost nothing measurable. Zoom draws p95 11.7 and 3.7 ms, frame p95 16.7 ms, no long tasks.
    - **perf, idle:** 240 rAF/s, AppContext's known Globe warm-up.
    - **golden:** 10/10 renders the same. **golden-trace:** 15/15 checks at 44.1 and 48 kHz. The 36 "live track sync" warnings were there before.
    - **bundle:** DawApp 109.5 kB gzip (B4: 103.3; budget 150); the editor's boot closure is 332.5 kB in 111 chunks. The every-page FAIL is the inherited one.
    - **R31**, with its stricter checks: all 6 flags at 1366×655, 1440×787 and 1280×720.
  - **Mixed-version collab** (two builds and a local PartyKit):
    - new ↔ new syncs mute, unmute and rename;
    - an old tab against the new server is told to update;
    - a new tab against an old server is told the server is being updated, and keeps its work;
    - old ↔ old connects.
  - **Browser (Chrome, own servers):**
    - right-click, the pill and Alt+Return open the menu;
    - the transpose label names each step;
    - mute and unmute while playing are heard (meters);
    - rename, ⌘E split, fades and their handles, and the trim clamp work, and all of it survives a reload;
    - a click on empty canvas seeks and a drag draws the marquee;
    - the lane, ruler and marker menus work.
    - On the final build:
      - Transpose ▸ Up an octave moved a staccato and a slur with their notes in the Score, and one ⌘Z brought both back;
      - Suggest chords here, right-clicked at bar 3 of a clip that starts at bar 2, opened at bar 3;
      - Create clip from a lane right-click at about tick 8520 started at 8160, the grid line before it;
      - the console showed only the known third-party StrictMode warning.
- **Owner sign-offs:**
  1. **Keys:** the table above, especially ⌘E → split with Export MIDI on ⇧⌘E, and ⇧M rather than ⌘M.
  2. **Empty canvas:** a drag draws the marquee (it used to pan); the middle button, the scrollbar and a sideways scroll pan.
  3. **The clip's key:** the song's key when the clip fits it, so a riff on A–C–E in C major reads "C", not "Am"; otherwise major or minor only. Keys are spelled as the key chip spells them (D♭m, not C♯m).
  4. **Transpose:** stay-open steps with the move named, not Soundtrap's slider with Apply.
  5. **Quantize:** starts only, on the song's grid, never before the clip's start.
  6. **A right-click** selects the clip but not its track or the dock.
  7. **A clip's mute is part of the song:** shared in collab and saved. A track's M stays each person's own.
  8. **Muted clips** are left out of both exports, MIDI included; the chord lane's analysis and the bounce's length still count them.
  9. **Fade handles snap** to the grid. A trim shortens fades that no longer fit.
  10. **The Edit pill** is a secondary pill on the popover surface, not a white primary.
- **Open issues:**
  1. **Deploy order:** ship the web app, then `npm run collab:deploy`. Doc schema 2: a tab from before this milestone is told to update; one after it, against an old server, is told the server is being updated.
  2. **`.env.local` sets `VITE_PARTYKIT_HOST` to an empty string.** `CollabProvider` falls back to `localhost:1999` with `??`, which an empty string doesn't trigger, so local collab can't connect on a dev server that reads it. The mixed-version check ran with the variable set on the command line. The fix (`||`, or unsetting the line) is the owner's.
  3. **Keyboard-only clip navigation** (Tab into the canvas, arrows between clips) stays with 3.3, so timeline-17 is partial; ia-flows-26 is partial too (the duplicated key setting is 2.5's). The audit ledger is left for the Stage B exit, as in B1–B4.
  4. **One swallowed click:** a click made a few milliseconds after closing the Invite dialog with Escape was swallowed once while that dialog animated out. A click at a normal pace worked. It is pre-existing, for the Stage B exit's "no click swallowed" guard to check.
  5. **Still to come:** Reverse (it needs a reversed buffer) and the loop strip (it needs a repeat model, 3.3); a key for audio clips; Add comment (4.3).
- **Next:** 15b (B6: 2.13 lanes and sections).

## B6 — 2.13 lanes above the ruler and song sections (2026-10-17)

Prompt 15b. Decision 16 (ST4); 29-D §4.4 and SD7 moved into Stage B.

- **Branch:** `aaron`, from `f242d3d9` (B5's entry). Other sessions' work is left alone: the uncommitted prompt-pack edits under `docs/prompts/studio-overhaul/` (this file's other new entries included), `.gitignore`, and the untracked `src/daw/collab/server/.partykit/` and `src/scripts/enrichment/research/`.
- **Commits:**
  - `4c550c08` one section model, the document-field routine, song boots (schema 7, collab 3);
  - `37123e9f` Create's toolbar row folds away (header, ruler end, footer, Grid menu);
  - `3c85deae` the sections lane, its menu and keys, Duplicate and Insert (`time/arrangementEdits.ts`);
  - `689c4dce` markers (F8): one hit test, click goes, drag by name, rename and add in the dialog, Alt+M;
  - `a3306086` studio:check: R30 updated, R32 new, designProbe's subtree mode;
  - review fixes: `3b33fce7` Lead Sheet and Score, `27597c1f` saving (fingerprint after the schema change), `88123b8e` shared sessions, `86abfd8f` sections in the Lead Sheet and drafts, `4bfab7df` Duplicate and Insert, `43b28052` the lane, `49f1cb0e` markers, `5cfcb1ce` Create's header, `c26a5d59` studio:check;
  - this entry.
  - Each commit typechecks alone (checked on `git archive` exports).
- **Pushed:** to `origin/aaron` with this entry (`f242d3d9..` this commit), from this checkout.
- **What changed:**
  - **One section model** (`src/daw/model/sections.ts`, `store/sectionsSlice.ts`): `sections: {id, type, label, startTick, endTick}[]`, in song ticks, in order and never overlapping.
    - **Vocabulary:** UNISON's `SectionType` plus tag, hook, breakdown, build-up and drop (a shared UNISON type; its converters now read numbered names, "Verse 2" is a verse). Each kind has a one-line purpose.
    - **New sections** are 8 bars, after the last one, on a bar line, as neutral blocks.
    - **The Lead Sheet and the Score** read the sections as marks (`useLeadSheetSections`); their + Section, − Section, rename, paste and rehearsal-mark toggle write the sections. The chart runs as far as the sections do. Bar edits (+ Measure, − Measure) move sections with their bars.
    - **Song boots** lay out the chart's form: each section starts where the chart's run starts (hey_ya's metre changes included), typed from its name.
  - **The document-field routine:**
    - Draft schema 7, compat 3: `data.sections`, plus the marks they imply in the marks' old place (`notation.leadSheetSections`), so a build from before 2.13 still shows them after a rollback. A draft or cloud copy without sections reads them back from those marks, with ids from the bar. New `v7-all-fields` and `cloud-2.13` fixtures; v6 and cloud-2.12 kept and still open whole.
    - Cloud document schema 7 (the contract doc says so) and the dashboard's.
    - Collab: an array of Y.Maps of their own, diffed by id, read in order by every peer; the lead sheet's old `sections` key is neither written nor read. `COLLAB_DOC_SCHEMA_VERSION` is 3. Undo: the array is in collab undo's scope ('Edit sections').
    - The registry: `sections` (doc, cloud 'document', shared, undone) and `SECTION_FIELDS`; the save status fingerprints them; Save's toast calls them song sections.
  - **Create's toolbar row folded away** (decision 16):
    - **+ Add track** (same `add-track-button` anchor) at the top left of the header, in the sections lane's row; **Pointer, Draw, Cut** beside the ruler.
    - **Snap and Grid** over the ruler's right end; the Grid menu also holds the chord lane's labels and what colours the clips (Track | Harmony).
    - **Zoom −, the level, +, Fit and Follow** at the footer's right end, beside the scrollbar; the footer is 24 px.
    - **Lane header:** sections 24 + ruler 32 + chord lane 24 = 80 px (was 88). The lanes keep their height (4 whole rows with the dock open on a Chromebook).
  - **The sections lane** (`shell/canvas/sections/`):
    - - Section after the last section (the lane's left end with none), kept in view; it lists the 14 kinds, Custom name… and About song sections, with the kind under the pointer explained on the list's last line.
    - A click goes to a section's start; dragging an edge resizes it on bar lines, an edge two sections share moving both, 1 bar at least, one undo step.
    - One menu (the canvas's one menu, a right-click or Alt+Return): what the kind is for, Rename…, Change type ▸, Duplicate with its clips, Loop this section, Insert before ▸, Insert after ▸, Delete section (keeps the clips), About song sections.
    - Keys with focus on a section (one Tab stop): ←/→, Home/End, Enter goes there, ⇧→/⇧← a bar longer or shorter, N or F2 renames, ⌘D duplicates, Delete or Backspace deletes, Alt+Return or ⇧F10 opens the menu.
    - Duplicate and Insert move the whole song after the section (`time/arrangementEdits.ts`): clips straddling the point are cut there (Score marks follow), chords too; markers, sections, automation, the loop and the chart's bar marks move. Duplicate copies the section's notes and controllers (new note ids), windows of audio (sharing the take), chords, automation and the Score marks of copied notes. One undo step each; refused while recording or while a collaborator holds a track.
    - Fit and the scrollbar count the sections in the song's length.
    - The comment lane's slot (24 px, above the sections) shows while a Comments panel is open; 4.3 adds the panel and fills it.
  - **Markers** (plan finding F8): one hit test over the flag and name as drawn (`Timeline/markerHit.ts`) for the press, the cursor, the double-click and the right-click; a click on a marker goes to it; a drag takes it where it was grabbed (no jump); a double-click renames it in the app's dialog; a double-click elsewhere on the ruler, Add marker here and Alt+M (registry `timeline.addMarker`, for 2.15's palette) ask for the name first and add it as one undo step; Cancel adds none.
- **Review:** six adversarial reviewers (persistence, collab, arrangement edits, lane UI and a11y, Lead Sheet parity, markers and harness) plus the UI test writer; every finding was reproduced with a throwaway test first, and every fix landed with a test that fails without it. The ones that mattered:
  - **Shared sessions:** Duplicate and Insert wrote with the store's raw setState and never reached the room (the partner kept the old song, and the next remote edit undid it locally); they now go through a store action, one room undo step. Peers could drift apart after concurrent edits because sections normalized on read were never written back; the diff now compares with the doc, a repeated id is read once, and crossed edges keep the section.
  - **Saving:** renaming the doc key changed every document's fingerprint, so after the deploy every saved project would have said "Saved in this browser" once and cached drafts would have read as work; a draft from another schema now has its stored fingerprints read in this build's terms.
  - **The lane:** focusing a block scrolled the lane itself (blocks off their bars until a reload); focus fell to the page after a menu Delete, and the next key moved the selected clip; Escape during a drag also stopped playback; menus could open off-screen.
  - **Music:** Insert stretched automation ramps before the point, a held pedal rang through inserted bars, sized clips lost their size, Lead Sheet rows swelled to 12 bars, hidden chord symbols came back.
  - **Lead Sheet:** removing a mark left a gap the sheet can't show (and shrank Proud Mary's chart), marks ended at the chord chart instead of the last clip, a mark on the closing barline added a bar, Send to set list dropped the bars past the last chord.
  - **Rollback:** the marks mirror now carries each section's id, kind and ends, so 2.13 → 2.12 → 2.13 keeps gaps, kinds and lengths (2.12 keeps such fields as they are; checked on a 2.12 archive).
  - **Harness:** R30's floor probes couldn't fail inside the legacy main region; now subtree mode (no failures found).
- **Verification:**
  - **vitest:** 16,388 pass, 10 fail, all inherited (the six song-data suites on the stale local `_generated_index.ts`, lineage calibration, the landing's songDemoChart, designGuard's PianoRoll smallText 8 > 6, apiContract manifest ×2, writeVocabulary, repoStore.noop ×2, vocabularySource); the Atlas EraRail suite and the song-link session tests failed only under the tier's load and pass alone.
  - **Lint:** `npm run lint` clean (prettier, eslint, `tsc -b`); every commit typechecks alone on a `git archive` export.
  - **studio:check full tier** (`par-check.sh`, HEAD archive on 5271, `--prev-base` the 1.3 build on 5264): round trips 0 fields lost; R1, R6 and R12:fileNew (laptop: "timed out waiting for the synth panel bridge") and R12:draft (Chromebook: an audio take's digest) failed only beside five other browsers and pass alone; R14/R15 old builds ok; perf and the golden trace (15/15) ok; golden renders ok; lessons 74/78 on both profiles (the 4 known); bundle: boot chunk 116.6 kB gzip (budget 150), the every-page FAIL inherited; R28–R32 "no baseline, 0 new". R30's 13 flags and R32's 15 pass at 1366×655, 1440×787 and 1280×720.
  - **Collab, mixed versions** (wrangler on 1999, `VITE_PARTYKIT_HOST=localhost:1999`): a 2.12 client (collab 2) joining a 2.13 server gets "Update Music Atlas to join this session"; a 2.13 client on a 2.12 server gets "The session server is being updated". Two 2.13 windows: sections added, resized, renamed, deleted and undone reach the partner; Duplicate with its clips and its Undo reach the partner (the review's main finding, checked on the HEAD build).
  - **Chrome** (HEAD build and the fixes' tree): the header, ruler end and footer; + Section's list and hint; add, click-seek, shared-edge drag and undo, menu, Loop, Duplicate, Insert after, keys, Change type; adding a second section keeps the blocks on their bars (lane scroll 0) and focus on the new block; Delete from the menu gives focus to the section before; the Lead Sheet shows the same sections; `?song=stay` lays out 18 sections; markers (add with a name, click to go, drag by name, rename, Alt+M, Cancel). Console: only the known StrictMode warning.
- **Owner sign-offs:**
  1. **+ Section** sits just after the last section (the lane's left end when there are none, as plan.md's 2.13 note says) and stays in view; the prompt's "left end" read as its short form.
  2. **Vocabulary and order:** Intro, Verse, Pre-chorus, Chorus, Bridge, Outro, then Solo, Interlude, Breakdown, Build-up, Drop, Hook, Tag, Coda, then Custom name…; no automatic numbering for new sections ("Verse", not "Verse 2"); song boots keep their charts' numbered names; an instrumental verse stays a verse.
  3. **The lane's Delete leaves the bars unnamed** (a gap you can see in the lane); the Lead Sheet's − Section (a mark is a point) hands the bars to the section before, as before 2.13, and removes only the section its mark shows.
  4. **Insert before/after adds 8 empty bars** there and moves the rest of the song later; **Duplicate** inserts the section's length after it and copies what plays in it. Both refuse while recording or while a collaborator holds a track. The loop moves with the music, and an Undo of the edit leaves it where it moved (the loop region is each student's own and outside undo).
  5. **Edges:** a shared edge moves both sections; a free edge stops at its neighbour; 1 bar at least; always on bar lines, whatever the grid.
  6. **The Lead Sheet keeps its free-text + Section;** the kind follows the name ("Pre-Chorus" is a pre-chorus, "A" is custom); renaming keeps the kind unless the new name names one, in the lane and on the sheet alike.
  7. **Change type** renames a section still named after its kind ("Verse" → "Chorus"), and keeps a name the student gave it.
  8. **Header placements:** + Add track at the top left (where the toolbar had it), the tools beside the ruler, Snap and Grid over the ruler's right end, zoom and Follow at the footer's right end.
  9. **Markers:** Alt+M adds one at the playhead; every way of adding one asks for its name first (B3's "+ Marker asks for a name"), and Cancel now adds none.
  10. **The Lead Sheet's chart runs as far as the sections do,** so every section the lane has shows on the sheet.
  11. **The comment lane's slot** is code only, wired to a Comments panel 4.3 adds.
- **Open issues:**
  - **Undo leaves the loop moved** after Duplicate or Insert (the loop is per-student, outside undo); and in a room the partner's loop, the Lead Sheet's bar-indexed settings (rests, fermatas, row sizes, Score breaks and spellings) don't travel yet, an older gap + Measure shares (collab finding 5).
  - **designProbe's default mode is blind inside the legacy main region** (data-ds="legacy"): R30 and R32 now use subtree mode; R28, R29 and R31 still use the default and may hide floors. For the Stage B exit (16).
  - **The HMR dev hazard:** editing store modules while a dev page is open re-runs the store and empties the open project (seen twice on dev servers). Dev-only; test on archives or with HMR off.
  - Moving a section with its clips waits for 3.1; no playhead line in the sections lane; "Suggest sections" not built; the comment lane's slot is code only (4.3).
  - Fit is limited by the zoom floor on long songs; the scrollbar's hit area is still 12 px in the 24 px footer; Snap and Grid over the ruler's last ~100 px hide the playhead's top there; + Section clamped to the right end can cover the last section's end edge.
  - Pre-existing: the scissors leave a Score mark orphaned on a cut note in some cases, and drop a sized clip's size (the arrangement path keeps it); UNISON's 6/8 ticksPerMeasure and deriveFormLabel; a right-click on the chord lane opens the Ruler menu.
  - Hey Ya!'s Lead Sheet marks now sit on the 4/4 bar holding each section's first chord (bars 5, 11, 16…), not 6, 12, 18: the true bars.
  - `swallowNativeMenu` is copied into the lane; exporting it from clipCommands would remove the copy.
- **Next:** 15c (B7: 2.14 browser and add-track picker).

## B7 — 2.14 the browser and the two-step add-track picker (2026-10-17)

Prompt 15c. Decision 16 (ST5, ST12); 3.8's browser shell with F10 and F11 pulled forward.

- **Branch:** `aaron`, from `e3f050b1` (B6's entry). Other sessions' work is left alone: the uncommitted prompt-pack edits under `docs/prompts/studio-overhaul/` (this file's other new entries included), `.gitignore`, and the untracked `src/daw/collab/server/.partykit/` and `src/scripts/enrichment/research/`.
- **Commits:**
  - `653f4530` a track made for a sound starts on it (`addTrack`'s `init`);
  - `3350c641` F10: the three dead MIDI-effect placeholders go;
  - `00d4fd48` ♡ favourites as a per-user pref (`libraryFavourites`), the dock's Grooves heart included;
  - `438d43eb` the two-step add-track picker;
  - `2fc8c8fa` the Library as a browser;
  - `de860205` F11: drops on the timeline;
  - `453774e4` refusals are heard (the editor's toasts were silent; see below);
  - `eef0c6ee`, `1669b5bb` review fixes;
  - `d3e67c0d` studio:check: R33;
  - this entry.
  - Each commit typechecks alone (checked on `git archive` exports).
- **Pushed:** `origin/aaron` `e3f050b1..` this entry (11 commits), pushed from this checkout with the hook.
- **What changed:**
  - **The Library is the browser** (`src/daw/shell/inspector/browser/`, its own chunk), after Soundtrap's Sound library in our look:
    - one search; ♡, Instrument, Genre and Type filters whose choices show how many items each leaves (each counted without itself); up to six tag chips from what is listed; Clear;
    - sections Parts · 75, Grooves · 29, Kits · 14, Presets · 114 (the Studio's 22 sounds, Oracle's 10 factory patches, the SERUM pack's 82 listed from its manifest, the student's own), Templates · 4;
    - rows ▶ · name over what it is · ♡ · +. A part's row says the key it lands in, the tempo it was played at, its bars (and 3/4) and its chords as Roman numerals ("C · 120 BPM · 5 bars · I–V–vi–IV"); a groove its tempo, bars and genre, from the designed groove that plays; a kit or a sound what it is; a template its tempo and tracks, and its name opens it as a new project (refused in a shared session, as before);
    - **Fits your song** on top while nothing narrows the list: what the song lacks in the order drums, bass, chords (up to 3, then 2), ranked by tempo, key fit, level and ♡, with a line such as "A minor · 120 BPM · no bass yet".
  - **+** makes a new track holding the item at bar 1, as one undo step: named after it, on its sound and role (a part's clip moved into the song's key, swing in its ticks; a groove's clip and kit; a kit or a sound as the instrument), selected, the dock on Notes (parts, grooves) or Instrument. The key and tempo rules:
    - **key:** a part moves by the move that puts the most of its key's scale on the song's (tonic first, then the smaller move), so a D dorian vamp stays D dorian in C major and parts written together move together; a song with no key and no notes takes the first part's key and says so; a song with notes but no key moves parts into the key read from them, without writing it;
    - **tempo:** a groove at another tempo asks in the panel (Change to N BPM · Keep · Cancel), the change and the add one step; parts follow the song's tempo.
  - **▶** previews one item at a time on an instrument of its own, notes booked on the audio clock as they come due, straight to the output (around master and mastering, like the click): a part in the key it would land in at its own tempo, a groove at its tempo on its kit, a kit a bar of beat, a sound a phrase in the song's key. ■, another ▶, Play, Record, an add, closing the panel and a new session stop it.
  - **F11, drops:** a row dragged onto a melodic lane (a groove onto a drum lane) lands on that track at the bar under the pointer, keeping the track's sound; elsewhere (the ruler, under the last track, an empty project's tiles) it makes a new track holding it at that bar. Same rules as +. A dragover the timeline can't take is refused; a dropped .mid goes through Import MIDI file… (one step). The never-written drag kinds (instrument, track template, drum sample, MIDI loop by URL) are gone.
  - **F10:** Arpeggiator, Chord and Scale left the effects lists.
  - **Favourites:** `libraryFavourites`, a per-user pref (sorted item ids, prefsStore validator, registry, fingerprint and kitchen sink). The dock's Grooves heart is the same pref.
  - **The add-track picker,** two steps:
    - Keys (Piano · Electric piano · Organ), Drums (Drum grid → Notes · Grooves → the Grooves tab), Bass (the playable bass guitar, new to the picker), Synth, Instruments, Sampler, Voice, Guitar & bass amp (Guitar · Bass); each with an About line; a kind with one engine adds at once;
    - under the tiles: Import MIDI file… and Browse the library (shows the Library, focus in its search);
    - every lesson anchor kept; new `add-track-cat-*`, `-electric-piano`, `-grooves`, `-bass-electric`, `-browser`. Hip Hop's and House's first steps say "pick Drums, then Drum grid", the spotlight following the category to the choice.
  - **Refusals are heard:** the editor's toasts went to an old toast store nothing draws, so the track limit, "Sam is editing this track", the clip and sections menus' refusals and "Track taken" were silent. They now go through `shell/notice.ts` on the app's Sonner toaster.
- **Review:** an adversarial review of the feature commits, split six ways (musical correctness, store writes, preview audio, UI and a11y, catalog and integration, tests and harness), each finding verified. Fixed in `eef0c6ee`, `1669b5bb` and `453774e4`, each with a test:
  - **high:** the move into the song's key read the notes, so parts of one key landed in different keys (now the keys); a preview booked each release with its start, so a synth chord played one note and an arpeggio preset nearly nothing (now booked as they come due, stop releases and fades);
  - a tempo question left open could add into a project opened later; a lane deleted while it waited; a SERUM patch added while the pack loaded played the default (the pack load is shared; a missing patch adds nothing and says so); a groove listed before its designed metadata took the catalog's tempo and kit; a key lock left on with no key blocked the first part's key; voice loads leaked or evicted the playing voice; a failed load left a spinner; notes past a part's last bar; swing on the played tick; Escape ran the editor's Stop under the panel (the panel now takes no Escape); focus lost after the question or a clear; the ♡ filter unnamed; an unavailable + looked available; no status for a search; every row re-rendered on any tempo or role change; the picker flashed step 1 as it closed; chips and template names under 24 px wide;
  - tests that couldn't fail, and R33 judges weaker than their text (now: a part that needs a move, the toast judged, stops timed under 400 ms, focus judged).
- **Verification:**
  - **lint:** whole tree clean (eslint and prettier). **typecheck:** clean at every commit (`git archive` exports).
  - **vitest:** 3180 passed, 10 failed, 1 expected fail, 28 skipped (3219); the 10 failing files are B6's inherited set, unchanged (designGuard PianoRoll smallText, song-data, song-link session, content/scripts, EraRail flaky).
  - **studio:check, full tier (par-check.sh, HMR off, 5281; the committed build `d3e67c0d` from a `git archive` on 5282):**
    - unit: as above;
    - round trips: chromebook 103/103 ok; laptop 100/103 with R1, R6 and R12:fileNew timing out on the synth panel bridge under load, each ok re-run alone (B6's known load flakes); R28–R33 ok at both sizes (no baseline, 0 new); old-tab round trips 8/8 ok;
    - lessons: 74/78 at chromebook and small, only the 4 known failures; 12/12 complete; 4/4 gated; the two drum lessons with the new picker step 24/24;
    - golden: same; golden-trace: all 15 checks pass;
    - bundle: DawApp 114.9 kB gzip (B6 116.6 kB; budget 150), the every-page FAIL inherited from the main merge;
    - perf: as B6 (idle 0 store writes/s; view switches, drags, scroll and score edits within B6's spread; autosave's `slotCommitsOk` "no" as in B6).
  - **R33** (13 flags × 1366×655, 1440×787, 1280×720, both profiles): all pass.
  - No Y.Doc or document-shape change, so no mixed-version collab check.
  - **Browser (Chrome, my HMR-off server on 5281):** the panel at 300 and 240 px; search, filters, chips; Fits your song empty, after a groove and in A minor; + on a groove (no question at 120), a C dorian bass (filled the key), a 60 BPM groove (the question; Change and one ⌘Z undid tempo and track); a bass part dragged below the drums landed on a new track at bar 3 and the 60 BPM groove dragged onto the drum lane asked, Keep added it at bar 2 with focus back on its +; ▶ on a part and on Oracle PAD played and ended, Play stopped one; the track limit's notice showed and + looked off; ♡ and the tracks survived a reload; a template opened with Restore; the picker's two steps and back; the console showed only the known StrictMode warning.
- **Owner sign-offs:**
  1. **Rows:** kits and sounds say what they are (they play in any key and tempo); templates show tempo and tracks and open (no ▶ or +); numerals are Roman whatever the chord-notation setting.
  2. **The key move:** by the keys, not the notes (a C dorian bass line in C major lands in D dorian; an A dorian boom-bap bass moves up a fourth to D dorian even though its notes already fit C major).
  3. **Keys and tempo:** the first part fills an empty key (and clears a stale lock); grooves ask about tempo (the button is "Keep N BPM", not "Add anyway"); parts never change the tempo; a 3/4 part or groove keeps its own length in a 4/4 song (its row says 3/4).
  4. **After +:** the dock opens on Notes for parts and grooves, Instrument for kits and sounds; a drop on a fitting lane keeps that track's sound.
  5. **Previews** go around the master and mastering, like the click; each plays at its own tempo (3.8 adds "at song tempo").
  6. **Favourites** are per student per computer and shared with the dock's Grooves heart (now white when on, not red).
  7. **Fits your song:** drums → bass → chords, 3 then 2; nothing for melody (no melody parts exist).
  8. **The 22 Studio sounds** are listed as presets (dock-instruments-16), beyond the plan's list; lesson grooves, bass lines and bands are not (3.8).
  9. **The picker:** the 8 kinds and their step 2s; the Bass tile is the playable bass and recording a bass moved under the amp; track names follow the choice ("Piano", not "Keys"); Drum grid and "Start with a beat" open Notes (the step sequencer they promise); Escape closes on either step; the lessons' new copy.
  10. **Escape** in the Library keeps the editor's meaning; ■ and Play stop a preview.
  11. **Notices:** the editor's refusals and the Library's notices on Sonner (they were silent).
  12. `addTrack`'s ignored colour argument became `init`.
- **Open issues:**
  1. **Data:** groove-latin-2's catalog tempo says 90; the designed groove that plays is 3/4 at 120 (the Library shows 120, the dock's Grooves list 90). Part names are lesson-ish ("Funk L1 · D46 D2: …", duplicates); "Abfunk9"/"Afunk9" show as ♭Ifunk9–Ifunk9; 32 parts end with a landing bar (5 bars for a 4-bar progression).
  2. A drop shows no hint of where it will land (a lane and bar ghost); drag stays the second way in.
  3. Keyboard: the list is one Tab stop per button (about 700); arrow-key navigation is 3.15's.
  4. First use loads heavy assets: the SERUM pack (1.7 MB, 82 files), the GM SoundFont (30 MB), the natural kit (19.5 MB): 1.12c.
  5. Oracle patches added by the browser live in the synth cache: not undone, not synced to collaborators (1.13b).
  6. A 3/4 item in a 4/4 song isn't fitted to the song's bars; "Fits your song" doesn't weigh metre.
  7. The old `@/hooks/use-toast` store is now unused in the editor; anything else that sends to it is still silent.
- **Next:** 15d (B8: 2.15 commands and output).
