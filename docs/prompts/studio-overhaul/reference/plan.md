# Studio editor (/studio/editor): clean layout, low lag, reliable reload — program plan

## Context

**The ask.** A deep review of the Studio DAW editor. The goal is a clean layout and optimized
performance that keeps the Music Atlas look, with every component working, reloading correctly and
showing little lag. The review is informed by BandLab, Audiotool, Soundtrap, Soundation, openDAW,
Suno, Ableton and Logic.

**How the plan was built (read-only):** two workflows produced it.

- **Audit:** 24 auditors read all 436 files (~104k lines) of `src/daw` plus related code. Every
  finding went through an adversarial code check, and critical/high findings got a second "would a
  student notice?" check. Four competitor-research agents ran alongside.
- **Design:** one planning agent per phase and a critic.

**Results:**

- 622 verified findings: 25 critical, 140 high, 364 medium, 93 low.
- They trace back to 23 root causes.
- Every one of the 165 critical/high findings has an owning milestone below.

**The program:** three stages, core first, then layout. It totals roughly 93–109 developer-weeks
in traditional estimates. Each milestone ships alone as a merge-commit PR after local
verification; main deploys straight to prod with no CI. **Approving this plan starts Stage A.**
Stages B and C are re-checked against fresh measurements at each stage boundary.

## Decisions (binding)

**Owner decisions (2026-10-06):**

1. **Screens:** school Chromebooks (1366×768; about 1366×655 usable in focus mode) and laptops
   (1440×900, about 1440×787 usable). Mouse and keyboard only; no touch, no projector.
2. **One full interface:** no Simple/Advanced mode and no density toggle. Declutter by
   organization and collapsed "More" sections. One comfortable sizing: 12 px label floor (11 px
   only for uppercase micro/ruler labels), 28 px default controls, 24×24 minimum targets.
3. **Neutral accent:**
   - Teal leaves the chrome. The white pill is the primary action, and white/10 marks
     active/selected.
   - Colour only for meaning: playhead, record/destructive red, selection, key/chord colours, track
     colours, amber warnings, meter data.
   - Mute and solo use neutral pressed states.
4. **Order:** core first (data safety, reload, lag), then the layout redesign. The remaining
   engine rewrites run alongside the component polish.
5. **Cloud format:** add a versioned JSON `document` field to studio projects in
   **music-atlas-api** (a separate repo and service). The editor ships an interim fallback that
   rides on track settings until the field deploys.
6. **Saving:** explicit Save to the cloud, plus crash-safe IndexedDB drafts and an always-visible
   save chip. Entering a template, demo, lesson, new project or collab link auto-keeps unsaved work
   as a draft, shows a toast and blocks nothing. Drafts are reachable from a Projects dialog.
7. **Focus mode:** in the editor, hide the app TopRail and collapse the sidebar into
   "Back to Studio". Avatar, notifications and XP/level move to an avatar menu.
8. **Prism lessons:** the 4 Prism-dependent Production lessons get a Premium badge and an upgrade
   prompt. Prism is not unlocked during lessons.
9. **Stable ids:** internal view ids, dock tab ids and every `data-tutorial-id` stay stable
   (alias map when labels change). All 8 lessons keep passing.
10. **Vocal pitch editor:** deleted. It's unreachable today.
11. **Sound assets approved:** self-host all samples, slim the default drum kit (~19.5 MB → ~2 MB),
    and a lighter GM bank (curated subset or SF3; the demo bass moves to the self-hosted electric
    bass). **The placeholder reverb IRs stay.** Their licensing remains an owner item, so no build
    gate blocks on it.
12. **Test device:** a real Chromebook is coming. Until it arrives, use throttled measurements plus
    a teacher spot-check before each stage ships.
13. **Production Lessons v2 (2026-10-07):** the 8 production lessons are rewritten as full
    build-a-track arcs with a landing-tour coach card ("Show me"), intro and completion cards and a
    launcher preview, as milestone **1.2b**. The Oracle preset menu shows one FACTORY list (the
    Serum pack merges into it). Design: [`lessons-v2.md`](lessons-v2.md).
14. **1.2b after Stage B (2026-10-07):** 1.2b moves from right after 1.2 to right after the Stage B
    exit, so the lesson UI and the lessons are built once on the final shell: the 2.2 `src/daw/ui`
    primitives, the 1.7 anchor registry, the new top bar, track list, dock and Mix view, and the
    2.8 Inspector (1.2b absorbs 3.12's coach-card docking). Today's 8 lessons stay as they are
    until then, and every milestone keeps them passing with no failures beyond the known list.

**My defaults (vetoable at review):**

- Musical typing toggles with backquote (`` ` ``) and shows a visible chip.
- Tools are V/B/C.
- Clips are coloured by harmony at render time, without overwriting `track.color`. A
  "Colour clips by: Track | Harmony" toggle comes in Stage C.
- The active tab gets white/10 plus a 2 px underline (a non-colour cue, per A11Y#9).
- The meter is labelled "Peak"; real LUFS is deferred.
- When no key is set, the Song chip uses a neutral dashed outline, not a rainbow.
- Collaborator presence colours and key-colour confetti need your sign-off at the Stage B review.

## What the audit found

All 622 findings were verified against the code: 559 confirmed, 63 adjusted, 0 refuted. Four
critical findings were re-checked by hand:

- the cloud payload has no chord lane or mode (`SessionSerializer.ts:488-506, 611-613`);
- the autosave debounce restarts on every store write, so it never fires during playback
  (`useAutosave.ts`);
- the dock passes the clip's song position as both origins (`ChannelStrip.tsx:333-334`);
- the presence selector has no equality function (`CollabProvider.tsx:541-564`).

| Root cause                                                       | What students see                                                                                                                                                            | Stage                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| No single project document; 6 hand-kept field lists have drifted | Refresh or cloud reopen loses the chord lane, mode, metre, markers, mastering and Score/Lead Sheet marks, while Save says "Project saved". State leaks into the next project | A                            |
| Autosave and boot have no document version                       | Edits during playback are lost on refresh. Returning to the editor restores an older copy. Entry links wipe work. No saved indicator                                         | A                            |
| One unscoped global keydown handler                              | Deleting a Score note deletes a hidden clip. ⌥R records. Text fields and browser zoom are hijacked                                                                           | A                            |
| No shared time model                                             | Docked editors misplace clips after bar 1. 4/4 is assumed. Moving a clip drags the chord lane                                                                                | A                            |
| Audio buffers keyed by clip id; no asset model                   | Split or record-over discards recordings, and undo restores silence                                                                                                          | A (minimal) / C              |
| Audio scheduled at "now", not the event time                     | Audio plays ~100 ms ahead of MIDI. The click is off after a pause. Takes land off-beat                                                                                       | A (one-liners) / C           |
| Frame-rate state (playhead, meters) in the main store            | Big parts of the editor re-render 30–60×/s. Collab presence loops. Chromebooks stutter                                                                                       | A                            |
| Coarse subscriptions to the whole `tracks` array                 | Edits during playback aren't heard until restart. Every drag repaints everything                                                                                             | A                            |
| No edit transactions; ad hoc undo                                | Drags lag as projects grow. Undo hits unrelated edits                                                                                                                        | A                            |
| Views, not the engine, apply instrument and input state          | Guitar and vocal tone are missing after a reload, and live input disconnects                                                                                                 | A (quick) / C                |
| No instrument lifecycle; one gated 1.13 MB chunk                 | First Play is silent while ~50 MB loads. GM tracks bleed into each other                                                                                                     | A (split) / C                |
| Oracle patches in a global store plus a side cache               | Synth sounds lose reverb and tempo after a reload and in exports                                                                                                             | A (quick) / C                |
| Export doesn't share the playback model                          | Export fails at 48 kHz. MIDI export plays 3.75× slow                                                                                                                         | A (quick) / C                |
| Collab session modelled as socket status                         | "Leave without saving" deletes the student's existing project                                                                                                                | A (quick) / C                |
| Analysis on the main thread                                      | Freezes after a take; chords describe the wrong take                                                                                                                         | C                            |
| Temporary lesson and practice context                            | A refresh ends the lesson. A stale practice screen appears over other projects                                                                                               | A                            |
| Generators replace work instead of previewing                    | Prism Create and Clear silently delete clips and the chord lane                                                                                                              | A (no deletes) / C (preview) |
| Chords identified by labels; several key sources                 | Minor-key projects get major suggestions. Labels disagree between views                                                                                                      | A (core) / C (UX)            |
| Controls aren't projections of the engine                        | Bypass does nothing. "LUFS" is really peak. FX order on screen isn't the signal order                                                                                        | A (honesty) / C              |
| No design-system layer                                           | Transparent dialogs, 6–10 px text, no keyboard support                                                                                                                       | B                            |
| Layout regions tied to views and duplicated                      | ~3.7 track lanes on a Chromebook. Panel state lost on every view switch                                                                                                      | B                            |
| Each editor re-implements interaction basics                     | The same gesture behaves differently in each editor. No follow-playhead                                                                                                      | C                            |
| Dead code in the single chunk                                    | An invisible full-screen canvas animates every frame                                                                                                                         | A                            |

## Design direction, from the competitor research

1. **Never lose work, and always show save state.** Drafts, a save chip and auto-kept work (BandLab
   Revisions, Soundtrap Time Restore).
2. **Frame-rate data stays out of React and the store.** A `playheadClock` and a `MeterBus` write
   to refs and canvas (openDAW).
3. **One place per job.** One bottom editor dock with Maximize; no modal piano roll and no pop-outs
   (BandLab, Soundtrap, Ableton Detail View, Logic).
4. **Harmony is a first-class lane.** A sticky chord lane and a key chip. Prism, Grooves, Insight,
   Lead Sheet and the piano roll share it (Logic Chord Track, Ableton scale awareness).
5. **Preview, then commit.** Generators make auditionable takes that commit as one labelled undo
   step (Suno take lanes, Ableton MIDI Tools).
6. **Explain the musical why.** A context-help strip that links to lessons (Ableton Info View,
   Logic Quick Help).
7. **Neutral chrome, with colour only for music.**
8. **Keys belong to the focused area.**
9. **Load only what the view needs, and show readiness** (BandLab for Education 2.0's lighter
   studio).
10. **The layout remembers** (Logic screensets).
11. **Quiet collaboration presence** (openDAW, Audiotool).

Declined because of your decisions: Logic's Simple/Advanced mode and save-less continuous cloud
autosave.

## Integration rules (one owner per artifact)

The critic found the three phase designs built 20+ artifacts twice. These rules fix that:

- **One harness:** `scripts/studio-perf/` plus `scripts/lib/devServer.mjs`, on port 5263. Never
  use 5179.
  - Viewport matrix: 1366×655, 1440×787 and 1280×720.
  - Fast tier on every milestone; full tier on perf/audio milestones and stage exits.
  - One audit ledger in `docs/studio-audit-2026-10/` (`findings.json` + `phase-map.json`), updated
    as findings close.
- **New UI is built once, in its final home:** `src/daw/ui/**` for primitives and
  `src/daw/shell/**` for the topbar, tracklist, dock, inspector, mix, projects and help.
  - Stage A's minimal UI goes there and Stage B restyles it in place: save chip, Projects dialog,
    Opening overlay, Loading pill, typing chip, shortcut sheet, Premium badge.
  - Stage C targets Stage B's files, not today's.
- **Persisted formats are defined once, in codec v3 (1.3):**
  - stable note ids on `MidiNoteEvent`;
  - Score and Lead Sheet marks keyed by note id;
  - canonical `ChordRegion` identity `{rootPc, quality, degreeKey, bassPc}`;
  - `clipColorMode` as a project field;
  - view state split into per-user prefs (localStorage) and per-project view state (in the draft).
  - Later stages add no document fields without bumping `SESSION_SCHEMA_VERSION`, the cloud
    `documentSchema` and the collab `docSchemaVersion`, with fixtures for each.
  - Every new store key must be classified in the registry (the coverage test enforces it).
- **Device-local storage is namespaced by user id** (shared school Chromebooks): drafts, the sync
  mirror, layout prefs, tutorial progress and synth user presets.
- **Collab:** the version handshake and token refresh ship in 1.1, together with the server-side
  auth tightening, so the client change goes first. Every Y.Doc shape change bumps
  `docSchemaVersion`. A dev-only partykit auth path (never in the deployed config) enables local
  two-client tests.
- **Keyboard precedence:** dialog > musical typing > focused region > view > global.
  - View keymaps register as registry scopes, so the shortcut sheet can list them.
  - Chromebook-safe alternatives: Backspace = Delete, no F-key-only bindings.
  - Alt combos match on `e.code`.
- **Ownership of shared pieces:**

  | Piece                                                                    | Owner                      |
  | ------------------------------------------------------------------------ | -------------------------- |
  | Tutorial anchor registry                                                 | Stage A (1.7)              |
  | Premium gating                                                           | 1.2                        |
  | Harmony core                                                             | 1.16a (`src/daw/harmony/`) |
  | Per-effect engine modules                                                | 1.11                       |
  | Master honesty fixes                                                     | 1.2                        |
  | `Readout` / `formatDb`                                                   | 2.2                        |
  | Settings dialog                                                          | 2.3                        |
  | Grid / zoom / Follow logic                                               | 2.7 (`src/daw/editor/`)    |
  | Return racks                                                             | Mix view RackDock (2.10)   |
  | Dead-code deletions                                                      | 1.2                        |
  | Lesson overlay (coach card, Show me, intro/completion, launcher preview) | 1.2b                       |

  1.2b builds the lesson overlay after Stage B (decision 14), directly on the 1.7 anchor
  registry, the 2.2 `src/daw/ui` primitives and the 2.8 Inspector, absorbing 3.12's docking.
  Until then, 1.7 moves today's Spotlight/CoachCard measurement onto the registry, look unchanged.

## Step 0: before any code

1. **Land today's Production-tab change.** It's uncommitted on `aaron`, mixed with unrelated WIP:
   Google sign-in, the Modal Sphere fix, landing edits.
   - Ship it as its own PR from a clean worktree off main, since 1.1 and 1.4 rewrite the same
     `DawApp` boot code.
   - Leave the other WIP untouched for its owners.
   - All overhaul work happens in a clean worktree.
2. **Archive the audit and design outputs** to `docs/studio-audit-2026-10/`:
   - Sources: the workflow journals (`…/subagents/workflows/wf_59c5c65b-3cc/journal.jsonl` and
     `…/wf_36afa406-c41/journal.jsonl`) and `/private/tmp/…/tasks/{w902nuv9m,wjnr3cf8w}.output`.
     The tmp copies are temporary.
   - Contents: the register, full findings, synthesis, research, per-milestone designs and this
     plan's decisions.
3. **Capture real v2 autosaves as fixtures:** your browser's, plus the end state of every
   demo, template and lesson.

## Stage A: core safety, reload and lag (no visible redesign), ~26–29 developer-weeks

The ids match the archived designs. Sizes are honest, and the critic's corrections are folded in.

| #     | Milestone                                           | What ships (key points)                                                                                                                                                                                                                                                                                                                                                                      | Size         |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1.0   | **Baseline and harness**                            | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 1–1.5 wk     |
| 1.1   | **Quick wins I: stop losing work**                  | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 1.5 wk       |
| 1.2   | **Quick wins II: lag, timing, honesty, Premium**    | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 2 wk         |
| 1.3   | **Project document registry + codec v3**            | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 2 wk         |
| 1.4   | **Drafts, openSession, save chip, Projects dialog** | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 3 wk         |
| 1.5   | **Cloud document field**                            | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 1.5 wk + API |
| 1.6   | **Command registry and scoped keymaps**             | One dispatcher with the precedence above. `requestRecord`/`saveProject`/`exportProjectMidi` shared by buttons and keys. View-owned keymaps registered as scopes. `useMusicalTyping` (one note map, backquote toggle, chip). Single-key-shortcut switch (WCAG 2.1.4). Minimal '?' sheet and a one-time "shortcuts changed" notice. Browser zoom never hijacked                                | 1.5–2 wk     |
| 1.7   | **Frame-rate state out of React**                   | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 3 wk         |
| 1.8   | **Canvas and notation render cost**                 | Waveform peak pyramid cached per asset (timeline-07, audio-core-09). Timeline redraw discipline (layered canvases, dirty flags). Piano-roll canvases sized to the viewport. Incremental Score engraving as an opt-in `StaffView` prop, so Learn is unchanged (Learn suites run). No animated widths next to canvases                                                                         | 2 wk         |
| 1.9   | **Edit transactions and undo**                      | `useContinuousControl(preview, commit)` on every knob, fader and drag: preview through `setTargetAtTime`, one store write, one undo entry and one Yjs update on release. Patch-based, labelled undo over the registry's undo fields, with origin tags. Collab undo scope from the same registry                                                                                              | 2 wk         |
| 1.10  | **Time model and audio asset model**                | See note below the table                                                                                                                                                                                                                                                                                                                                                                     | 2.5 wk       |
| 1.12a | **Unblock and split the route**                     | `preloadDaw()` plus `/studio` idle and hover prefetch. Drop the ContentGate (song, practiceGenre and MSP boots tested with slow and failed content). `DawSkeleton`. Lazy views, dock tabs, instrument views and modals. ErrorBoundary that flushes the draft. `vite:preloadError` save-and-reload. Immutable cache headers. Boot chunk ≤150 KB gzip (from ~286 KB), checked against a budget | 1.5–2 wk     |
| 1.15  | **Lesson and practice persistence**                 | `{tutorialId, stepIndex, practiceSession, studentTrackId, view}` travels with the draft. Refresh resumes at the same step; other boots clear it. Completion is scoped to the lesson. Practice inputs fixed                                                                                                                                                                                   | 1 wk         |
| 1.16a | **Harmony core**                                    | `src/daw/harmony/`: canonical chord identity, `keyFrame`, an `effectiveKey` selector (the student's key is authoritative; detection only fills it when unset), validated chord entry with inline feedback. Generator range-safety completed for paste/clear/suggestion commit and the set-list update guard                                                                                  | 1–1.5 wk     |
| 1.17a | **Honesty pass and Stage A exit report**            | Hide or fix controls that do nothing (Gain Match, FX TARGET, the filter's ON and PAN, de-esser FREQUENCY, the dead Grooves controls, and so on). Write `docs/studio-perf/stage-a-exit.md` comparing baseline and final numbers                                                                                                                                                               | 1 wk         |

**1.0 Baseline and harness**

- `scripts/studio-perf/`:
  - perf: idle, playback, view switches, fader and note drags, collab presence, cold load;
  - bundle report;
  - reload round-trips against a mock Studio API (legacy and document modes);
  - golden offline renders at 44.1 and 48 kHz, plus live timing traces (including adapter
    `noteOn`/`noteOff`);
  - an 8-lesson walkthrough at 1366×655 as premium and free personas;
  - anchor inventory.
- Dev-only probes: `DevProfiler`, store-write counter and performance marks.
- `it.fails` ratchet tests for today's losses.
- npm scripts `studio:check` (fast), `studio:check:full` and `studio:baseline`.
- Commit `docs/studio-perf/baselines/…`.

**1.1 Quick wins I: stop losing work**

- Autosave driven only by persisted fields, with a 5 s maxWait and a flush on pagehide/hidden.
- Never restore over a live in-memory session.
- Validate every boot intent before clearing anything; this fixes today's `?tutorial=` branch.
- Outgoing work goes to **timestamped kept slots** with a "Your work was kept" toast.
- Resets clear lesson/practice context, the key lock, markers, metre, mastering and marks.
- Chord ids from `crypto.randomUUID()`; `trackRole` and `audioInputChannel` persisted.
- Interim keyboard guard: no shortcuts in text fields or dialogs, clip keys only in Create.
- One `requestRecord()` with the overwrite confirm.
- Clip-relative origins in the docked note editors.
- **Non-destructive split and record-over:** halves share `assetId` and buffer, with adjusted
  `offsetSeconds`.
- **Prism Create and Clear stop deleting** clips or chord regions outside the written range.
- Collab:
  - delete only a session-minted draft;
  - tear down dead rooms;
  - **version handshake plus token-refresh params**, deployed client-first, then server 4401.

**1.2 Quick wins II: lag, timing, honesty, Premium**

- Lag:
  - presence publishes with shallow equality (ends the loop);
  - playhead pushed into child components of Timeline and TransportBar;
  - `initUndoTracking` idempotent;
  - delete MeshGradientBg.
- Timing one-liners: drum `noteOn` time, loop-lap offset/gain, metronome grid, `isReady` init.
- SoundFont per-channel routing.
- Oracle reload and export get reverb and the project tempo.
- Export works at any sample rate and always restores Tone.
- Master Bypass wired, Gain Match hidden, "LUFS" relabelled "Peak".
- Mode-aware Prism suggestions.
- Small fixes: score-09, leadsheet-06, synth-ui-03.
- Interim token fix for portaled dialogs (`body.daw-active`, removed in 2.1).
- White-pill primaries.
- **Delete dead modules:** StatusBar, minimal-dock, MixerPanel, orchestrator, NamModelBrowser,
  TrackList, the standalone synth shell, and the vocal **PitchEditor** stack (decision 10).
- **Premium badge and upgrade prompt** via a `tutorialCatalog.ts` split.
- The CoachCard's Next got the white pill in 1.2; 1.2b (after Stage B) rebuilds the card and
  extends the catalog split.

**1.3 Project document registry + codec v3**

- `PROJECT_FIELDS` / `TRACK_FIELDS` registry with `{local, cloud, collab, undo, perUser,
resetOnNew}`, plus a coverage test.
- Codec v3 with a v1→v2→v3 migration chain; unreadable drafts are quarantined, never dropped.
- One `initialProjectState()` for every reset and load.
- Stable track ids across cloud loads.
- `documentVersion` and baseline in a small `saveStatusStore`.
- Formats per the integration rules.
- No system writes into the document (composer name).

**1.4 Drafts, openSession, save chip, Projects dialog**

- IndexedDB draft store, namespaced by user, holding pending media bytes.
- One `navigator.locks` lock per tab.
- A new, user-namespaced sync mirror key; the legacy key is migrated once.
- Version-driven autosave.
- One `openSession(intent)` state machine (validate, keep work, reset, load) for all 13 boot
  paths, plus Song-page entry and File ▸ Open/New. **New has no confirm.**
- Opening overlay and error panel.
- `saveProject()` plus a save chip sized to its longest label (~150 px): Saved / Saving… /
  Unsaved / Saved on this device / Couldn't save – Retry. "Audio not saved yet" when media can't
  be stored.
- Undo/Redo buttons.
- Projects dialog listing drafts and cloud projects.
- Practice gets a slim header with the chip.

*1.4 decisions as built (integration, 2026-10-08).* Owner sign-off pending on 1–7 (owner
walk-through):

1. The boot and switch prunes keep the user's newest draft even when it is cloud-equal (it is what
   a plain `/studio/editor` in a new tab resumes). This deviates from spec §5; sign-out and quota
   prunes still remove it.
2. E17 sign-out policy: before sign-out the open draft is flushed, the mirrors IndexedDB holds are
   removed, and the user's cloud-equal drafts are pruned. Unsaved drafts stay under the user's own
   key, hidden from other users (checked by R22:signOut).
3. A take the device draft can't hold (storage full, too big) mints the cloud project and uploads at
   once.
4. A PUT that returns 403 (a project this account can't write) saves as a new project in the
   current account.
5. E11: a passed-over draft whose cloud copy is newer keeps origin `session`, not `kept`. If the
   owner wants `kept`: patch origin `kept` with `keptAt` through the drafts port in
   `announceProjectDraftKept`, and tighten `cloudNewerPreferred` in roundtrip.mjs with
   `draftHoldsWork(..., { kept: true })`.
6. Delete in the Projects dialog removes only the student's own drafts on this device. 1.4 refuses
   Delete on "Found on this device" rows (they are claimed, not deleted), and the drafts port
   refuses to delete another user's draft or a `~device` draft.
7. The first student to boot 1.4 on a device that only ran pre-1.3 builds gets the device-wide
   1.3 autosave (L) imported as their draft.

Recorded without needing sign-off:

- The cloud save is fenced by the session generation only, not the room. Every room change that
  replaces the project goes through openSession (Join, Leave & new project). Creating a room, a
  kick and the host leaving keep the same project and link in the store, so a save asked before
  them still writes the project the student asked to save (contracts R10.2).
- When marking the outgoing draft kept fails after its flush, openSession goes on. The flushed
  draft stays as the kept work, under origin `session`.
- When storage is full at reload and the mirror can't be written over the stored record, the tab
  opens the mirror's newer copy. The chip shows the storage error until a write lands, never
  "Saved on this device" over the older record.
- 1.3 migration backups go to the quarantine without raising the "couldn't be opened" notice.

**1.5 Cloud document field**

- Contract doc for music-atlas-api: `document` JSONB, `documentSchema`, `revision`,
  `writtenAtRevision`.
  - Preserve unknown fields on PUT; 409 on an older schema or a revision conflict.
  - List-endpoint fields for the Projects dialog, size limits, and Save As/Duplicate semantics.
- Client codec.
- Interim `settings.projectDoc` with a reader that scans every track.
- Conflict UI.
- Mock API tests in both modes.

**1.7 Frame-rate state out of React**

- `playheadClock` external store fed by one rAF loop, with latency compensation; the store is
  written only on stop, seek and pause.
- Ref-driven playhead layers everywhere.
- `MeterBus`: one loop that runs only while playing, recording or monitoring, with a
  `subscribe(source, cb)` API for canvas meters.
- `EngineClock`, and analysers that publish only on change.
- `EngineHost` (the shell stops re-rendering on engine changes).
- Track reconciler that diffs per track.
- `useTrackIds()` / `useTrack(id)` subscriptions.
- **Tutorial anchor registry:** components register anchors, measured with ResizeObserver.
  - Static SVG-mask spotlight; reduced motion respected.
  - Alias map for renames; `fx-add-*` anchors registered per rack target.
  - Moves today's Spotlight/CoachCard measurement onto the registry with the look unchanged; the
    static SVG-mask dim replaces the CSS dim. 1.2b (after Stage B) registers its new anchors here.

**1.10 Time model and audio asset model**

- `timeModel` module: `ticksPerBar(ts)`, song↔clip ticks, metre-aware snap. No hard-coded 1920 or
  4/4.
- Editors bind to the selected clip, then the clip under the playhead, then the first clip.
- The chord lane follows only its source clip.
- Project-scoped asset store with reference counts held by the document and undo; eviction on
  project switch.
- One `moveClip` that respects collab locks.
- Per-clip load status (loading / failed / missing) with retry.
- Snap-toggle seek fix.

**Stage A exit criteria (checked by `studio:check:full` on both profiles):**

- **Data safety:**
  - Round-trips keep 100% of registry fields across refresh during playback, SPA return, tab
    close, and cloud save→open in both API modes.
  - New, template, demo, lesson, song, practice, jam and collab boots leak 0 fields.
  - Every replaced session is kept as a draft and reopens identically.
  - An invalid link changes nothing.
- **Steady playback** (chromebook profile: 4× CPU throttle, 1366×655, demo-midnight-groove):
  - 0 main-store writes/s;
  - 0 React commits/s in DawAppInner, top bar, Timeline, track headers and dock outside user
    input;
  - ≤1 long task per 20 s;
  - p95 frame ≤20 ms;
  - no rAF loops while idle.
- **Edits:**
  - A drag gesture makes 1 store write, 1 undo entry and 1 Yjs update.
  - Timeline draw p95 ≤4 ms while scrolling 6 × 3-minute audio clips.
  - A Score note edit paints in ≤50 ms.
- **Safety:**
  - No shortcut acts on an unseen view.
  - Generators and paste never delete outside their range.
  - Split and record-over keep their audio.
  - Leaving collab never deletes pre-existing work.
- **Load:** the boot chunk is ≤150 KB gzip, and the editor paints without waiting for songs
  content.
- **Lessons:** today's 8 lessons pass at 1366×655 as premium with no failures beyond the known
  list, which only shrinks. As a free student, the 4 Prism lessons show the upgrade card and the
  other 4 complete. (The v2 lessons come with 1.2b, after Stage B.)

## Stage B: Studio Shell v2 layout and design system, ~13–14 developer-weeks

**Target layout.** Five regions are rendered once, outside the view switch, so nothing remounts
when the view changes.

**Top bar (44 px), three zones:**

- **Left:** Back to Studio, the Project menu, project name, save chip, Undo and Redo.
- **Centre:** go-to-start, Stop, Play (a white pill), Record (red), the position readout, Loop,
  Click with count-in, Follow.
- **Right:** the Song chip ("C major · 4/4 · 92"; one popover for key, mode, metre and tempo), the
  view tablist (Create · Mix · Score · Lead sheet, plus Practice when relevant), Share, the
  Inspector toggle, '?', settings and the avatar menu.
- Overflow menu below ~1360 px.

**Track list (200 px, Create only):**

- 64 px rows with colour, name, M, S, Arm and volume; a '⋯' menu for the rest.
- '+ Add track' typed sheet pinned at the top, Master pinned at the bottom.
- Keyboard selection (A11Y#3).

**Canvas:**

- **Create:** a 32 px toolbar (V/B/C tools, Grid, zoom −/fit/+, + Marker), a sticky chord lane with
  a key chip, and lanes drawn on per-row height arrays. Empty projects show four tiles.
- **Mix:** strips fill the height, with a master column and a RackDock for track and return
  racks.
- **Score and Lead sheet:** full width.

**Inspector (300 px, or a 44 px rail):** Insight · Browser · Session. It replaces LibraryPanel and
the UserList and ChatPanel columns, and its state is remembered per view.

**Editor dock:**

- Constant tabs: Instrument · Effects · Notes · Prism · Grooves. Ids stay
  controls/fx/piano-roll/prism/grooves.
- A tab that doesn't apply is disabled with a reason, never hidden.
- 220 px by default; resizable from 120 px to 85% with snap points, height remembered per tab.
- **Maximize** replaces PianoRollModal and the PopOutOverlay copies.

**Pixel budget:**

|                | Chromebook 1366×655 (focus mode)                                                      | Laptop 1440×787                       |
| -------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Lane height    | 655 − 44 − 220 − 96 ≈ 295 px, ~4.6 rows (today ~3.7); ~483 px with the dock minimised | 787 − 44 − 260 − 96 ≈ 387 px, ~6 rows |
| Timeline width | 1366 − 200 − 44 ≈ 1,120 px                                                            | ≈ 940 px                              |
| Inspector      | Pin-able overlay drawer; the canvas doesn't reflow                                    | Pinned at 300 px                      |

| #    | Milestone               | Key points                                                                                                                                                                                                                                                                                                                                                                               | Size     |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2.1  | Tokens and guardrails   | See note below the table                                                                                                                                                                                                                                                                                                                                                                 | 1 wk     |
| 2.2  | `src/daw/ui` primitives | On the existing Radix kit (`src/components/ui`: dialog, popover, select, tabs, slider, tooltip, dropdown-menu, context-menu). Button, IconButton (label required), Toggle, Tabs, Segmented, Select, Menu, Popover, DawDialog/Sheet/Confirm/Prompt, Knob (`role=slider`, keyboard, fine drag), Fader, Meter (on MeterBus), Readout + `formatDb`, Chip, EmptyState, `onColor`. DEV gallery | 1.5 wk   |
| 2.3  | Overlays and settings   | Every overlay on DawDialog. Audio & MIDI settings dialog (the single Settings owner). Projects dialog restyled in place. Native `prompt`/`confirm` removed (including Timeline's bare `prompt()`)                                                                                                                                                                                        | 1–1.5 wk |
| 2.4  | Shell frame             | The five-region grid. Layout prefs per user (namespaced). Resizers. Motion rules. The top row stays `auto` until 2.5; budget assertions move to 2.5. New store keys classified in the registry                                                                                                                                                                                           | 1–1.5 wk |
| 2.5  | Top bar v2 + focus mode | The three zones above. Measured overflow. The save chip keeps its ~150 px width. **An interim tools strip until 2.7**, so snap, tools and zoom never disappear. Practice header gets the avatar menu                                                                                                                                                                                     | 1.5 wk   |
| 2.6  | Track list v2           | One vertical scroller with a per-row height array (ready for inline automation). Track menu and reorder. Keyboard selection. AddTrackSheet (reuses the NewTrackModal descriptions). Empty-project tiles                                                                                                                                                                                  | 1.5 wk   |
| 2.7  | Create canvas           | 32 px toolbar. `src/daw/editor/{snap,zoom,follow}` (owner). Chord-lane header with the analysis banner (replaces the blocking modal). Ruler and canvas colours from `getDawPalette()`. Follow pages ahead and pauses while scrolling                                                                                                                                                     | 1 wk     |
| 2.8  | Inspector               | Shell, rail and drawer. Insight and Browser tabs (click/Enter adds; drag optional). Session tab (people, chat, invite, leave). Stage C fills content in these files                                                                                                                                                                                                                      | 1 wk     |
| 2.9  | Editor dock v2          | Constant tabs, resizable per tab. Notes is the single note editor (piano roll for melodic tracks, drum grid for drums). Maximize replaces the modal and pop-outs                                                                                                                                                                                                                         | 1.5 wk   |
| 2.10 | Mix view                | Mixer-first strips (≥240 px). Master column (fader, chain, spectrum). RackDock with one FxRack                                                                                                                                                                                                                                                                                           | 1–1.5 wk |
| 2.11 | Help and exit           | '?' sheet restyled from the registry. Typing chip in the top bar. Stage B exit audit: screenshots at 1366×655, 1440×787 and 1280×720; lessons; device run; colour sign-offs                                                                                                                                                                                                              | 1 wk     |

**2.1 Tokens and guardrails**

- `tokens.ts` generates `tokens.css` on `:root`, aliased to the app's `--ui-*` tokens. This fixes
  portaled overlays; `body.daw-active` is removed.
- Codemod `--color-*` → `--daw-*`. Teal retired. `--daw-text-3` = #8e8ea3 (passes contrast).
- Delete `useTheme`/`THEMES` and the portal workarounds.
- `getDawPalette()` for canvases.
- ESLint for new code (no hex literals, nothing under 11 px, no literal z-index). The ratchet skips
  legacy subtrees marked `data-ds=legacy`.

**Stage B exit criteria:**

- Both target screens pass the screenshot and region-budget tests.
- No text below the floor and no target under 24×24 inside `data-ds=v2`.
- Every overlay renders opaque.
- Today's 8 lessons pass at all three viewports, with no failures beyond the known list.
- The Stage A perf numbers hold (no regression).

## After Stage B: Production Lessons v2 (1.2b), ~3–4 developer-weeks

Moved here by decision 14, so it is built once on the final shell. Before building, re-plan
[`lessons-v2.md`](lessons-v2.md) against the Stage B shell: anchor locations, control labels (for
example, tempo lives in the Song chip and the PIANO ROLL tab is "Notes"), and the Inspector dock.

**1.2b Production Lessons v2** (owner decisions 13 and 14; design in [`lessons-v2.md`](lessons-v2.md))

- **Preset menu:** one FACTORY list in the Oracle preset menu, with the Serum pack merged in.
- **Step model:** step title, why, listen and Show-me demo fields; intro, running and complete
  phases; no auto-advance when a step is already satisfied; Back reviews without bouncing
  forward; a Skip link after 20 s; Quit asks first.
- **Catalog:** 1.2's `tutorialCatalog.ts` gains genre, intro, recap and outline.
- **Anchors:** 13 new `data-tutorial-id`s (transport, track header, mixer fader, timeline, piano
  roll, drum velocity, synth filter, sampler, Prism mode and rhythm). Existing ids stay stable.
- **UI:** a tour-style CoachCard in the landing look (glass, numbered step pills, white-pill
  Next) with "Show me", which flies the landing `TourCursor` to the target. A neutral spotlight,
  plus intro and completion cards.
- **Lessons:** all 8 rewritten as build-a-track arcs, about 105 steps. The 4 Prism lessons stay
  Premium.
- **Launcher:** a "Start here" tile, genre-pack tiles, and a `LessonPreviewDialog`.
- **Walkthrough:** `lessonDrivers.mjs` rewritten for the new steps.
- **Built on Stage B:** buttons, chips and dialogs from the 2.2 primitives; the 13 new anchors
  registered on the 1.7 registry inside the 2.5–2.10 components; the coach card docks into the 2.8
  Inspector below 1440 px (from 3.12).

## Stage C: engine completion and component polish, ~50–60 developer-weeks

Two tracks, sequenced by dependency. Stage C files target Stage B's `src/daw/shell/**`.

**Engine track:**

- **1.11a–e:** one PlaybackScheduler, with the legacy scheduler behind a flag that is removed after
  a prod soak.
  - Time arguments on every adapter API.
  - Oracle scheduling on event time (voice allocator and steal fixes).
  - A context-agnostic graph builder; per-effect modules plus removal of the always-on crush;
    gate/ducker/wah in AudioWorklets.
  - Recording placement from capture timestamps.
  - Export progress/cancel and worker encoding; MIDI/MusicXML exporters read the document.
- **1.12b:** InstrumentHost lifecycle and status. A "Loading sounds 3/5" pill. Play waits up to
  ~3 s and is never silent. Retry recovers a failed load. Shared SampleCache.
- **1.12c:** the approved asset diet: slim kit, lighter GM bank, demo bass, self-hosted samples.
  Golden-render diffs plus a teacher release note.
- **1.13a:** LiveInputService (device lifecycle, status, permission explainer, monitoring off with a
  headphone prompt) and engine-side `applyTrackState`.
- **1.13b:** `PATCH_SCHEMA`, one `applyPatch`, and Oracle patches in the document, undo and collab.
- **1.14:** collab session state machine (`idle|connecting|live|reconnecting|ended`). Host grace on
  the server. Registry-driven sync. Remote edits touch only what changed. Locks only while someone
  is editing. Leaving restores the pre-session kept draft or opens the saved copy.
- **1.16b:** analysis in a Web Worker, triggered by `onTakeCommitted`, with Insight keyed on a
  harmony fingerprint.
- **1.17b:** `knip:daw` (its own config) and the engine-track exit report.

**Polish track:**

| #    | Area                             | Work                                                                                                                                                                          | Waits for |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 3.0  | Ledger                           | Re-map remaining findings to Stage B files                                                                                                                                    | —         |
| 3.1  | Shared editor core               | Note ids and selection by id, pointer gesture controller, shared context menus; consumes 2.7's snap/zoom/follow                                                               | —         |
| 3.2  | Harmony UX                       | Colours at render, the "Colour clips by" toggle, one notation-label module                                                                                                    | 1.16a     |
| 3.3  | Timeline/arrange                 | Split Timeline into model, renderer and interaction; clip names and menus; inline automation lanes                                                                            | —         |
| 3.4  | Notes editor                     | Piano roll and drum grid on the core; keyboard entry; quantize                                                                                                                | —         |
| 3.5  | Instrument views                 | VocalView and GuitarBassView split onto shared LiveInput modules; organ, sampler, SoundFont and drums on primitives; real presets or hidden                                   | 1.13a     |
| 3.6  | Effects rack and Mix internals   | ENGINE_ORDER-driven rack                                                                                                                                                      | 1.11      |
| 3.7  | Prism and Grooves                | **Preview then Keep** with ghost takes; the Prism steps of the v2 lessons re-worded once for the new zones; Prism in Key / Progression / Feel zones; Suggest Chords as a mode | —         |
| 3.8  | Insight and Browser content      | —                                                                                                                                                                             | —         |
| 3.9  | Score                            | Note-input mode, follow/pages, contextual toolbar, accessible SVG                                                                                                             | —         |
| 3.10 | Lead Sheet                       | Shares the document and command layer with Score                                                                                                                              | —         |
| 3.11 | Oracle Synth                     | Play page in the dock plus a responsive full editor via Maximize; no scaling below the floor                                                                                  | 1.13b     |
| 3.12 | Practice and Tutorials           | Practice view polish (the coach card's Inspector docking, step model, Skip and completion card moved to 1.2b, after Stage B)                                                  | —         |
| 3.13 | Session tab internals            | —                                                                                                                                                                             | 1.14      |
| 3.14 | Export, Settings, import residue | —                                                                                                                                                                             | —         |
| 3.15 | Accessibility close-out          | Against the 2026-09-20 audit                                                                                                                                                  | —         |
| 3.16 | Ledger close-out and guardrails  | Teacher release notes                                                                                                                                                         | —         |

**Deferred (not in this program):**

- real BS.1770 LUFS;
- a reorderable FX chain;
- a split-band de-esser;
- an account synth-preset library (needs an API);
- NAM 48 kHz resampling;
- audio-file import (storage decision);
- Versions/Revisions and timeline comments (need an API);
- rebuilding the vocal pitch editor or the band generators.

## Verification

**Every milestone (fast tier, run locally before its merge-commit PR):**

- `npm run lint` (prettier, eslint with zero warnings, `tsc -b`) and `npx vitest run`.
- `npm run studio:check`: reload round-trips, the 8 lessons at 1366×655 as premium and free
  personas, and anchor integrity.
- `npm run verify:prod` whenever dev probes or the bypass are touched.

**Perf and audio milestones, plus every stage exit (full tier):**

- `studio:perf` on both profiles against the Stage A targets.
- Golden renders at 44.1 and 48 kHz.
- Timing traces within ±2 ms on a 48 kHz live context.
- SoundFont checked live with per-track analysers, because GM renders are silent offline.
- Bundle budget.

**Compatibility:**

- v1/v2 → v3 migrations on the real captured fixtures.
- Old tab plus new tab, and a revert.
- Legacy-client cloud round-trips (new save → legacy open → new open).
- **Mixed-version collab:** a worktree of the previous main on a second port plus `partykit dev`.
  Run it for every Y.Doc shape change, and also client N against server N−1.
- Reconnect with an expired token.

**Other checks:**

- **Learn:** whenever `src/components/notation/StaffView.tsx` changes, run the learnTabView\*,
  MusicMapOverlay, LoopSelectionOverlay and MistakeMarkersOverlay suites.
- **Real device:** the Chromebook checklist (audio glitches, long animation frames, time to first
  sound) at first availability, after 1.7, 1.11 and 1.13, and at each stage exit.
- **Manual, at each stage exit:** you walk through the editor via
  `VITE_DEV_AUTH_BYPASS=1 npx vite`: open a demo, play, edit while playing, refresh, reopen from
  Projects, run a lesson, collaborate in two windows.

## Top risks and mitigations

- **Saved-project compatibility:**
  - Migrations ship with the guard in the same commit, with fixtures and quarantine.
  - The server preserves unknown document fields on PUT, and `writtenAtRevision` detects
    legacy writes.
- **Tutorial anchors:** registry plus alias map; lessons run in the fast tier on every milestone.
- **Scheduler rewrite (clicks, hung notes):** behind a flag, with golden renders, traces and device
  runs; flag removed after a soak.
- **Audio changes alter existing projects** (SoundFont routing, crush removal, assets): golden
  diffs are accepted explicitly, with a release note to teachers.
- **Collab rollout:** version handshake first; PartyKit deploys outside school hours.
- **Phase size:** milestones above ~2 weeks ship as flag-guarded sub-PRs.
- **Stage boundaries:** each re-plans against fresh measurements.

## Owner items to settle later (none block Stage A)

- music-atlas-api: implement the `document`/`revision` contract from 1.5 (list fields, size limits,
  copy semantics).
- Licence a reverb IR pack (the placeholder IRs stay until then).
- Colour sign-offs at the Stage B review: collaborator presence colours, key-colour confetti.
- Shared-device policy: what is cleared at sign-out (1.4 built E17, decision 2 in the 1.4 note).
- 1.4 owner walk-through: sign off decisions 1–7 under the 1.4 note.
- Studio dashboard "Project" tab: new blank project vs resume the last session.

## Where the detail lives

The audit and design outputs (per-step files, code to reuse and verification for every milestone)
sit in the workflow journals listed in Step 0, and are archived into `docs/studio-audit-2026-10/`
first. Each milestone starts by reconciling its archived design with this plan's decisions and
integration rules. Milestone 1.2b's design lives in [`lessons-v2.md`](lessons-v2.md); re-plan it
against the Stage B shell before building (decision 14).
