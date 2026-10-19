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

**Stage D** (added 2026-10-14, decision 15) adds teaching features from the Soundtrap and
Soundation review: about 11–14 more developer-weeks, plus API work. It runs beside Stage C.

**Decision 16** (2026-10-16) makes the rest of Stage B the Soundtrap layout, as the next phase:

- rails, a re-scoped Inspector and dock;
- clips, lanes and song sections;
- a browser;
- commands and Export.

It pulls work forward from Stages C and D, so the Stage B exit and 1.2b move behind it.

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
15. **Stage D, teaching features (2026-10-14, proposed):** the features from the Soundtrap and
    Soundation review join the program as Stage D, milestones 4.0–4.7:

    - a sharing and comments API contract, and read-only review;
    - Studio assignments, where each student gets their own copy;
    - timeline comments and song sections;
    - chord keys, key changes that move clips, and genre starters.

    It runs beside Stage C, and Stages A–C keep their order. Its own decisions, SD1–SD11, need
    sign-off before prompts 31–37 run. Design:
    [`29-D-teaching-features.md`](../29-D-teaching-features.md).

16. **Stage B finishes as the Soundtrap layout (2026-10-16).**

    - **Why:** after a measured review of Soundtrap's editor
      ([`soundtrap-editor-anatomy.md`](soundtrap-editor-anatomy.md)), the owner made its findings
      the next phase: "Update the prompts to have this research be the next phase of the studio
      overhaul plan." Mozart AI's studio was reviewed the same day
      ([`mozart-ai-studio-anatomy.md`](mozart-ai-studio-anatomy.md)); only its non-AI patterns are
      used.
    - **Already decided that day:** the transport moves to a bottom rail, and a side rail drives the
      Inspector.
    - **What ships where:**
      - Proposals ST1–ST12 and ST15 ship in Stage B, as milestones 2.8 and 2.9 (re-scoped) and
        2.12–2.15, ahead of 2.10, 2.11 and the Stage B exit.
      - ST13 (private solo/mute) goes to 1.14 and Freeze (part of ST10) to 1.12b.
      - ST14 (version history from the save chip) stays with Versions, which is deferred.

    **The owner's answers:**

    - **Dock tabs per track type, Effects last:**

      | Track                       | Tabs                                   |
      | --------------------------- | -------------------------------------- |
      | Drums                       | Instrument · Grooves · Notes · Effects |
      | Melodic                     | Instrument · Prism · Notes · Effects   |
      | Audio and live-input tracks | their chain only                       |

      - Ids stay `controls`/`grooves`/`prism`/`piano-roll`/`fx` (decision 9).
      - This replaces 2.9's "constant tabs, disabled with a reason".
      - The Parts tab moves into the browser (2.14).

    - **Create's 32 px toolbar row folds away**, and the sections lane takes its row:

      | Control                                    | New place                                |
      | ------------------------------------------ | ---------------------------------------- |
      | + Add track, V/B/C tools                   | the left header cell over the track list |
      | Snap, Grid                                 | the ruler's right end                    |
      | Zoom −/+, Fit, Follow                      | beside the horizontal scrollbar          |
      | + Marker                                   | the ruler's menu and the palette         |
      | Chord-lane labels, Colour Track \| Harmony | the Grid menu                            |

    - **Master opens in the dock's slot:** gain, the master chain, output peak. The Mix view stays.
    - **Extras:**
      - in the bottom rail: Go to start, Rewind and Fast-forward buttons, and a metronome menu (click sound, volume, count-in);
      - an Export pill at the top bar's right, opening one Audio | Notation dialog;
      - a ⌘K / Ctrl+K command palette from the 1.6 registry, with shortcuts shown.

    **Work pulled forward:**

    - 3.1's shared context menus and 3.3's clip names and menus → 2.12.
    - 4.4 song sections → 2.13. SD7 is taken as recommended.
    - 3.8's Browser shell and items, with F10 and F11 → 2.14.
    - 3.14's export dialog → 2.15.

    **Size:** Stage B grows by about 8 developer-weeks. About 4 of them come out of the milestones
    above, so the program grows by about 4.

17. **Production Lessons take Ableton's lesson patterns (2026-10-16, proposed).**

    - **Why:** the owner asked for a review of Ableton's lesson sites, the Beats course on Ableton
      Learn and Learning Synths, to improve the Production Lessons
      ([`ableton-lessons-review.md`](ableton-lessons-review.md)).
    - **The owner's direction that day:**
      - docs now, build after Stage B;
      - the genre lessons, plus a Beats course and a Sound-design course; no Mixing course;
      - everything inside the editor, with no separate lesson pages;
      - gating stays "detect the action, Skip after 20 s".
    - **What ships where:**
      - **AB1–AB8 join 1.2b** as Amendment A ([`lessons-v2.md`](lessons-v2.md) §8):
        - listening step kinds (`listen`, `compare`, `tap`, `quiz`);
        - a glossary;
        - model answers;
        - a closing Practice stage;
        - `startFrom` (a template or a demo);
        - courses with Resume and Next lesson;
        - a free "Building blocks" opener as "Start here".
        - 1.2b grows from ~3–4 to ~4.5–5.5 developer-weeks.
      - **AB9, the Beats course,** is new milestone **L1** (prompt 17a), right after 1.2b:
        ~1.5–2 developer-weeks.
      - **AB10–AB12** (the Sound-design course, four recipes and Match it) are new milestone
        **L2** (prompt 25a). It runs after 3.11, which builds the synth's Play page, and 1.11, whose
        graph builder the single-patch render needs: ~2–2.5 developer-weeks.
      - **AB13,** three teaching visuals in the shared synth UI, joins 3.11: ~0.5 developer-weeks.
    - **Lesson-pass rule:** from 1.2b on, every "the 8 lessons keep passing" in this plan (decision
      14, the Stage B exit criteria and Verification) means every lesson in the catalog.
    - **Not adopted:**
      - separate lesson pages with their own mini instruments;
      - a Continue that never waits;
      - producer stems;
      - translations;
      - a shared showcase.

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

  | Piece                                                                    | Owner                       |
  | ------------------------------------------------------------------------ | --------------------------- |
  | Tutorial anchor registry                                                 | Stage A (1.7)               |
  | Premium gating                                                           | 1.2                         |
  | Harmony core                                                             | 1.16a (`src/daw/harmony/`)  |
  | Per-effect engine modules                                                | 1.11                        |
  | Master honesty fixes                                                     | 1.2                         |
  | `Readout` / `formatDb`                                                   | 2.2                         |
  | Settings dialog                                                          | 2.3                         |
  | Grid / zoom / Follow logic                                               | 2.7 (`src/daw/editor/`)     |
  | Return racks                                                             | Mix view RackDock (2.10)    |
  | Dead-code deletions                                                      | 1.2                         |
  | Lesson overlay (coach card, Show me, intro/completion, launcher preview) | 1.2b                        |
  | Project sharing and read-only review                                     | 4.1 (API contract in 4.0)   |
  | Timeline comments                                                        | 4.3                         |
  | Song sections (Timeline and Lead Sheet)                                  | 2.13 (was 4.4; decision 16) |
  | Clip context menu and Edit pill (every clip type)                        | 2.12 (3.1 adopts it)        |
  | Browser (parts, grooves, drum kits, presets, templates)                  | 2.14 (3.8 deepens it)       |
  | Command palette and the '?' sheet (both read the 1.6 registry)           | 2.15 / 2.11                 |
  | Export dialog (Audio \| Notation)                                        | 2.15 (3.14 keeps residue)   |
  | Chord keys on musical typing                                             | 4.5                         |

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

_1.4 decisions as built (integration, 2026-10-08)._ Owner sign-off pending on 1–7 (owner
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

## Stage B: Studio Shell v2 layout and design system, ~21–22 developer-weeks

**Done:** B1–B3 (2.1–2.7) are on `aaron`.

**The rest (decision 16, 2026-10-16)** is the Soundtrap layout. [`soundtrap-editor-anatomy.md`](soundtrap-editor-anatomy.md) is the measured reference, with proposals ST1–ST15.

**Run order:**

1. 2.8 + 2.9 (prompt 15).
2. 2.12 (15a).
3. 2.13 (15b).
4. 2.14 (15c).
5. 2.15 (15d).
6. 2.10 + 2.11 and the Stage B exit (16).

**Target layout.** Seven regions are rendered once, outside the view switch, so nothing remounts when the view changes:

```
+------------------------------ top bar, 44 ------------------------------+
| track list 200 | lane header 80, lanes, footer 24 | Inspector | side    |
|                |                                  | 240-420   | rail 48 |
| editor dock: a share of the body, between the    | (one      |         |
| canvas and the bottom rail; stops at Inspector   |  panel)   |         |
+---------------------------- bottom rail, 44 ----------------------------+
```

**Top bar (44 px), three zones:**

- **Left:** Back to Studio, the Project menu, the project name, the save chip, Undo and Redo.
- **Centre:** the view tablist: Create · Mix · Score · Lead sheet, plus Practice when relevant.
- **Right:**
  - Share;
  - '⋯' (computer keyboard, shortcuts, lessons, Audio & MIDI settings);
  - **Export**, the bar's one white pill (2.15);
  - the avatar menu.
- A measured fold for narrow windows.

**Bottom rail (44 px, full width; 2.8):**

- **Left:** Master: a label and a fader over a meter. A click opens Master in the dock.
- **Centre:**
  - Play (white pill), Record, Go to start, Rewind, Fast-forward;
  - the position readout;
  - Loop;
  - Click, with a menu for the sound, its volume and the count-in.
- **Right:** Key (circle-of-fifths popover), Tempo (a field and Tap), Metre.

**Side rail (48 px, right; 2.8):**

- **Panels:** Insight · Library (the browser, 2.14) · Effects · Lessons · People · Chat. Comments joins with 4.3.
- **One panel at a time** opens in the Inspector: 240–420 px, 300 by default. It is pinned by default only at 1440 px and wider.
- **Panels push the canvas and the dock;** nothing overlays them.

**Track list (200 px, Create only):**

- 64 px rows: colour, name, M, S, Arm, a fader over a meter, and '⋯' (right-click opens it too).
- The selected row gets a left edge in its track colour, and its instrument icon opens the dock (2.15).

**Create canvas:**

- **No toolbar row** (decision 16). The **lane header** (80 px) is:
  - the sections lane (24);
  - the ruler (32: the loop strip and bar numbers, with Snap and Grid at its right end);
  - the chord lane (24).
- **The left cell of the header**, over the track list, holds + Add track and the V/B/C tools (2.13).
- **The footer** (24 px) holds the horizontal scrollbar, with zoom −/+, Fit and Follow beside it.
- **Clips** show their name and key, trim zones and fades. A selected clip shows an **Edit** pill that opens the one clip menu (2.12).
- **Empty projects** show four tiles. No start tiles show under existing tracks.

**Editor dock (2.9):** it sits between the canvas and the bottom rail and stops at the Inspector.

- **Tabs per track type, Effects last:**

  | Track                       | Tabs                                   |
  | --------------------------- | -------------------------------------- |
  | Drums                       | Instrument · Grooves · Notes · Effects |
  | Melodic                     | Instrument · Prism · Notes · Effects   |
  | Audio and live-input tracks | their chain, with no tab bar           |

  Ids stay `controls`/`grooves`/`prism`/`piano-roll`/`fx`.

- **A click on a clip** opens its editor here. The dock follows the selected track.
- **Master** opens in the same slot.
- **Height:** a share of the body (0.36; 0.40 for Prism and Notes), from 120 px to 85% with snap points, remembered per tab. **It is never a fixed px height.**
- **Maximize** replaces PianoRollModal and the PopOutOverlay copies.

**Mix:** strips fill the height, with a master column and a RackDock for track and return racks.

**Score and Lead sheet:** full width.

**Pixel budget** (computed from the sizes above):

|                          | Chromebook 1366×655 (focus mode)                             | Laptop 1440×787                         |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------- |
| Body (between the bars)  | 655 − 44 − 44 = 567 px                                       | 787 − 44 − 44 = 699 px                  |
| Lane header + footer     | 80 + 24 = 104 px (B3: 88 + 40)                               | 104 px                                  |
| Lanes with the dock open | 567 − 104 − 204 ≈ 259 px, 4 rows                             | 699 − 104 − 252 ≈ 343 px, ~5.4 rows     |
| Lanes with the dock shut | ≈ 431 px, ~6.7 rows (the tab bar stays)                      | ≈ 563 px, ~8.8 rows                     |
| Timeline width           | 1366 − 200 − 48 ≈ 1,118 px; ≈ 818 px with the Inspector open | 1440 − 200 − 48 − 300 ≈ 892 px (pinned) |

Folding the toolbar is what keeps 4 rows on a Chromebook with the dock open. Keeping it and adding the sections lane would leave about 3.5.

| #    | Milestone               | Key points                                                                                                                                                                                                                                                                                                                                                                               | Size     |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2.1  | Tokens and guardrails   | See note below the table                                                                                                                                                                                                                                                                                                                                                                 | 1 wk     |
| 2.2  | `src/daw/ui` primitives | On the existing Radix kit (`src/components/ui`: dialog, popover, select, tabs, slider, tooltip, dropdown-menu, context-menu). Button, IconButton (label required), Toggle, Tabs, Segmented, Select, Menu, Popover, DawDialog/Sheet/Confirm/Prompt, Knob (`role=slider`, keyboard, fine drag), Fader, Meter (on MeterBus), Readout + `formatDb`, Chip, EmptyState, `onColor`. DEV gallery | 1.5 wk   |
| 2.3  | Overlays and settings   | Every overlay on DawDialog. Audio & MIDI settings dialog (the single Settings owner). Projects dialog restyled in place. Native `prompt`/`confirm` removed (including Timeline's bare `prompt()`)                                                                                                                                                                                        | 1–1.5 wk |
| 2.4  | Shell frame             | The five-region grid. Layout prefs per user (namespaced). Resizers. Motion rules. The top row stays `auto` until 2.5; budget assertions move to 2.5. New store keys classified in the registry                                                                                                                                                                                           | 1–1.5 wk |
| 2.5  | Top bar v2 + focus mode | The three zones above. Measured overflow. The save chip keeps its ~150 px width. **An interim tools strip until 2.7**, so snap, tools and zoom never disappear. Practice header gets the avatar menu                                                                                                                                                                                     | 1.5 wk   |
| 2.6  | Track list v2           | One vertical scroller with a per-row height array (ready for inline automation). Track menu and reorder. Keyboard selection. AddTrackSheet (reuses the NewTrackModal descriptions). Empty-project tiles                                                                                                                                                                                  | 1.5 wk   |
| 2.7  | Create canvas           | 32 px toolbar. `src/daw/editor/{snap,zoom,follow}` (owner). Chord-lane header with the analysis banner (replaces the blocking modal). Ruler and canvas colours from `getDawPalette()`. Follow pages ahead and pauses while scrolling                                                                                                                                                     | 1 wk     |
| 2.8  | Rails and Inspector     | Side rail driving one Inspector panel; bottom rail with the transport (Go to start, Rewind, Fast-forward), a Click menu, Key/Tempo/Metre and Master; the effects library and the dock's chain as one armed-slot state; a one-line purpose per effect category. Started in the checkout on 2026-10-16                                                                                     | 1.5 wk   |
| 2.9  | Editor dock v2          | Tabs per track type, Effects last. A clip click opens its editor; the dock follows the selection. Notes is the single note editor (piano roll for melodic tracks, drum grid for drums). Maximize replaces the modal and pop-outs. Master opens in the dock's slot                                                                                                                        | 2 wk     |
| 2.12 | Clips                   | One clip menu, a shared module opened by right-click, the Edit pill or a command. Clip chrome: name and key header, trims, fades. New clip fields: `muted`, audio `name` (schema bump). A Pointer click on empty canvas seeks                                                                                                                                                            | 1.5 wk   |
| 2.13 | Lanes and sections      | Create's toolbar row folds away. The sections lane with + Section. One section model for the Timeline and the Lead Sheet (4.4, moved here). The comment lane's slot                                                                                                                                                                                                                      | 2–2.5 wk |
| 2.14 | Browser and add track   | The Library panel becomes a browser over parts, grooves, drum kits, presets and templates, showing key, tempo and length. "Fits your song". F10/F11. A two-step add-track picker with an About line per choice                                                                                                                                                                           | 2 wk     |
| 2.15 | Commands and output     | ⌘K palette with shortcuts. The Export pill and an Audio \| Notation dialog (stems where the render supports them). Track menu: Duplicate, Export track ▸, inline rename. Right-click a row to open it. The selected-row edge                                                                                                                                                             | 1.5 wk   |
| 2.10 | Mix view                | Mixer-first strips (≥240 px). Master column (fader, chain, spectrum), sharing 2.9's dock Master parts. RackDock with one FxRack                                                                                                                                                                                                                                                          | 1–1.5 wk |
| 2.11 | Help and exit           | '?' sheet restyled from the registry (shares its data with 2.15's palette). Typing chip in the top bar. A one-line explanation under every setting. The hover hint line. Stage B exit audit: screenshots at 1366×655, 1440×787 and 1280×720; lessons; device run; decision 16's guards; colour sign-offs                                                                                 | 1 wk     |

**2.1 Tokens and guardrails**

- `tokens.ts` generates `tokens.css` on `:root`, aliased to the app's `--ui-*` tokens. This fixes
  portaled overlays; `body.daw-active` is removed.
- Codemod `--color-*` → `--daw-*`. Teal retired. `--daw-text-3` = #8e8ea3 (passes contrast).
- Delete `useTheme`/`THEMES` and the portal workarounds.
- `getDawPalette()` for canvases.
- ESLint for new code (no hex literals, nothing under 11 px, no literal z-index). The ratchet skips
  legacy subtrees marked `data-ds=legacy`.

**2.8 Rails and Inspector** (decision 16; anatomy §6–8)

- **Start from the checkout's uncommitted rails work:**
  - `src/daw/shell/bottombar/`: `BottomRail`, `TransportControls`, `ClickToggle`, `MasterRow`, `PositionReadout`, `SongControls`;
  - `src/daw/shell/inspector/`: `SideRail`, `railPanels.ts`, `InspectorPanel`, `panels/` (`LibraryBody`, `FxBody`, …);
  - `shell/layout/layoutModel.ts`: bars 44/44, rail 48, Inspector 240–420 with 300 by default, pinned by default at 1440 px and wider.
  - **Loose ends in it:** `BottomRail` never passes `countInFolded` (`ClickToggle.tsx`), and the header comments in `TransportControls.tsx:13` and `TimelineScrollbar.tsx:11` describe the old placement.
- **Transport buttons:**
  - Go to start returns to bar 1.
  - Rewind and Fast-forward step one bar; holding repeats.
  - All three are registry commands next to Home/End (`commands/transportSkip.ts:16-47`: previous marker or 0, next marker or the song's end).
  - ←/→ already nudge clips in Create (`commands/keymaps.ts:355-368`). Proposal for the owner's review: `,` and `.` (Logic's) when musical typing is off.
- **Click menu:**
  - the click sound;
  - its volume;
  - the count-in (none · 1 bar · 2 bars, which already exists: `transportSlice.ts:196-197`).
  - Neither a volume nor a choice of sound exists yet. The click is a fixed −10 dB `MembraneSynth` (`audio/MetronomeEngine.ts:44-50`) that feeds the master gain (`hooks/usePlaybackEngine.ts:387-401`), so mastering colours it.
  - Add a click gain and two or three sounds, as per-user prefs (registry `pref`). Route the click around the mastering chain to the output; it is never exported.
- **Effects library and the chain as one state** (ST6; Soundtrap shots 40–46):
  - **Two lists today:** the dock's FX tab carries its own add-list (`components/Effects/EffectsPanel.tsx:182-275` → `FxBrowser`), beside the rail's Effects panel (`shell/inspector/panels/FxBody.tsx`).
  - **After 2.8:** the dock's Effects tab shows the chain (`FxChainRow`, `FxControlsPanel`) plus an **Add effect** card. The add-list lives only in the rail panel.
  - **Arming:** Add effect arms the next empty slot and opens the Effects panel. It is UI state, never saved.
  - **Picking:** a pick fills the armed slot and re-arms the next one.
  - **Cancelling:** × cancels, and closes the panel if the arming opened it.
  - **Changing track:** selecting another track carries the arming over.
  - **One cap:**
    - Today the 5-effect cap is a constant in four places (`FxBrowser.tsx:20`, `FxBody.tsx:19`, `masteringSlice.ts:86`, `returnsSlice.ts:56`).
    - The track's own `addActiveEffect` doesn't enforce it (`store/tracksSlice.ts:713-729`).
    - Use one exported constant, enforced in the store.
  - **Categories:** each gets a one-line purpose ("Reverb: puts the sound in a room"), in neutral colours.
- **Anchors:**
  - The `fx-add-*` ids move with the add-list rows into the rail panel (`FxBrowser.tsx:177-184`).
  - Lesson steps that click them get a step precondition that opens the Effects panel (1.15's `tutorialStepPrepared`).
  - `fx-slot-*` stays on the chain.
- **Checks:**
  - the rails at all three sizes in the shell harness scenario (R29);
  - arming, picking and cancelling by hand in the browser;
  - the metronome's level against today's −10 dB.

**2.9 Editor dock v2** (decision 16; ST3, ST8; anatomy §6)

- **Tabs per track type.**
  - Today's dock already hides tabs that don't apply (`components/ChannelStrip/ChannelStrip.tsx`: tabs :64-87, `tabApplies` :215-222, fallback to Controls :226-231; id type in `store/uiSlice.ts:139-145`).
  - 2.9 changes three things:
    - the order (Effects last);
    - the labels (Controls → Instrument, FX → Effects, Piano Roll → Notes), with ids unchanged (`chanstrip-tab-*`) and the alias map updated for lessons;
    - Parts leaves the dock.
- **Parts:** until 2.14 builds the browser, Parts opens as its own section in the Library panel (move `PartsBrowser` there as is).
- **Selection drives the dock.**
  - **Today:** a Pointer click on a clip selects only the clip (`components/Timeline/Timeline.tsx:1750`); only the Draw tool selects its track (:1871). So Instrument/Effects follow `selectedTrackId` while the roll follows `editorTrackId` (`model/editorClip.ts:46-77`), and the two can disagree.
  - **After 2.9:** a click on a clip selects the clip _and_ its track. `setSelectedTrackId` still refuses a collaborator-held track (`prismSlice.ts:1820-1836`).
  - It shows that clip's editor in the dock, opening the dock if it is shut:
    - Notes for MIDI clips;
    - Notes with the drum grid for drum clips (`components/Controls/DrumMachineView.tsx`);
    - the chain for audio clips.
  - The dock follows the selected track and keeps the tab that applies. Escape or the dock's close button shuts it (`channelStripTab` null, `uiSlice.ts:261-262`).
- **One note editor:**
  - Double-clicking a MIDI clip no longer opens PianoRollModal (`setEditingClip`, `Timeline.tsx:1959-1971`; `components/PianoRoll/PianoRollModal.tsx`, hosted at `StudioShell.tsx:181` → `lazyParts.tsx:317-322`). Notes in the dock is the one note editor.
  - **Maximize** grows the dock over the canvas and replaces the modal and all three PopOutOverlay openers (`ChannelStrip/PopOutOverlay.tsx`, opened from `TrackControlsPanel.tsx:74-76, 98-135`, `EffectsPanel.tsx:582-612`, `PrismPanel.tsx:38-42`). Escape restores it, which Soundtrap's maximise doesn't do.
- **Master in the dock's slot** (ST8):
  - **What it shows:** Gain, the master chain and an Output peak meter, with no tab bar.
  - **Where the parts come from:** reuse the Mix view's `MasteringSection` parts (`components/Studio/StudioView.tsx:276-428`: Bypass, FxBrowser for `master`, FxChainRow, PeakMeter, FxControlsPanel) and `masteringSlice.ts`.
  - **Other views:** the dock exists only in Create (`StudioShell.tsx:169-183`), so the Master button switches to Create first, as the master automation toggle already does.
  - **Anchors:** the lesson anchors `mastering-section` and `master-strip` stay in the Mix view, and the dock's Master body gets its own id.
  - 2.10's master column shares the same parts.
- **Height:** unchanged (`shell/layout/layoutModel.ts:23-48, 84-110`):
  - a share of the body per tab: 0.36 by default, 0.40 for Prism and Notes;
  - 120 px to 85%, with snaps at 25/40/60/85%.
- **Checks:**
  - **Budget:** a harness assertion that at least 4 rows show at 1366×655 with the dock open.
  - **Lessons:** the `chanstrip-tab-controls`, `-prism` and `-piano-roll` targets still resolve.

**2.12 Clips** (decision 16; ST1, ST2; anatomy §5; pulled forward from 3.1 and 3.3)

- **One clip menu module** in its final home (`src/daw/shell/canvas/clipMenu/`; 3.1 adopts it):
  - a model of items by clip type and context (selection, playhead inside the clip, Premium), rendered on the 2.2 Menu primitive;
  - **what it replaces:** `handleContextMenu` (`components/Timeline/Timeline.tsx:1978-2053`, menu at :3013-3135). Today only audio clips get a menu (Fade In/Out :2097-2128, Split :2130-2142, Duplicate :2144-2169, Delete :2171-2180). A right-click on a MIDI clip falls through to the empty lane's lone "Prism — Suggest Chords" (:2008-2024, :449-500).
- **Items:**
  - Cut · Copy · Paste · Delete · Duplicate (`clipCommands.ts:123-148`);
  - Rename · Split at playhead (`splitMidiClipAt.ts`, `splitAudioClipAt.ts`) · Mute clip · Add comment (disabled until 4.3);
  - Transpose ▸ for MIDI: semitones and octaves, with the interval named. Drums never move, as in `transposePart`, `src/curriculum/engine/parts/part.ts:273-289`. 4.6 adds Match song key;
  - Quantize ▸ for MIDI, wiring the unused `utils/quantize.ts:37` `quantizeEvents`;
  - Fade in / Fade out for audio;
  - Prism ▸ (Premium).
- **New document fields:**
  - `muted` on both clip types;
  - `name` on audio clips (MIDI clips already have an optional `name`; `store/tracksSlice.ts:118-144`).
  - The scheduler skips muted clips.
  - Run the full document-field routine: bump `SESSION_SCHEMA_VERSION` (5 today, `persistence/projectDocument/codec.ts:117`), the cloud `documentSchema` (which follows it) and `COLLAB_DOC_SCHEMA_VERSION` (1 today, `collab/types.ts:142`), with fixtures.
- **Not in 2.12** (no model or engine for them yet):
  - Reverse for audio, which needs a reversed buffer;
  - the loop strip, which needs a repeat model and goes to 3.3.
- **Ways to open it:**
  - right-click;
  - the **Edit pill**, a real button over the selected clip, placed with `components/Timeline/timelineGeometry.ts` and at least 24×24, which spares Chromebook students the two-finger tap;
  - a registry command with a Chromebook-safe key.
- **Keys:**
  - The proposal for the owner's review: ⌘E splits, as it does in Soundtrap and Ableton, and Export MIDI moves to ⌘⇧E (today ⌘E is Export MIDI, `commands/keymaps.ts:680-685`).
  - M stays the click (:653-658), so Mute clip gets no single-letter key.
  - Record the result in `STATUS.md`.
- **Clip chrome:**
  - **Header:** 16–18 px, carrying the name and, for pitched clips, the key, using the 1.16a harmony core. That delivers 4.6's "pitched clips show their key". Today no clip draws a header or a name (`Timeline.tsx:904-954, 1066-1250`). Add the name and key to the redraw gate's `DRAWN_FIELDS` (`timelineGeometry.ts:73-99`), which ignores names today. Text stays at the 12 px floor.
  - **Handles:** visible trim zones (edges are 6 px today, `RESIZE_EDGE_PX`, `Timeline.tsx:116`) and fade handles on audio clips.
- **Pointer clicks:** a click on empty canvas seeks, as the ruler does; dragging draws the marquee.
- **Code placement:** `Timeline.tsx` is the monolith 3.3 splits later. Keep the new code in the clip-menu module and small render helpers that 3.3 can lift out.
- **Checks:** the full tier and the mixed-version collab check, because of the new fields.

**2.13 Lanes and sections** (decision 16; ST4; 29-D §4.4 moved here)

- **The toolbar folds.** `shell/canvas/CreateToolbar.tsx` loses its row (controls at :105-159, `FOLD_STEPS` :89, the "+ Section" reservation :49-50). In `shell/tracklist/rowLayout.ts`, `CREATE_TOOLBAR_PX` (32) becomes the sections lane (24), and `TrackArea.tsx:15-80` restacks.
  - **The left header cell** over the track list holds + Add track (the `add-track-button` anchor keeps its id) and the V/B/C tools as 24 px icons.
  - **Snap and Grid** (`GridMenu.tsx`) move to the ruler's right end.
  - **The Grid menu** gains Chord labels and Colour clips: Track | Harmony.
  - **Zoom −/+, Fit and Follow** move into the footer beside the horizontal scrollbar (`TimelineScrollbar.tsx`). The footer grows from 16 to 24 px for 24×24 targets.
  - **+ Marker** moves to the ruler's right-click ("Add marker here", which exists), double-click (which exists, `Timeline.tsx:1949-1957`) and the palette.
  - **Markers** gain click-to-seek and an app-dialog rename, and F8's hit area is fixed (`Timeline.tsx:1707-1716`).
- **The section model is 29-D §4.4, with SD7 as recommended:**
  - `sections: {id, type, label, startTick, endTick}[]` as a document field, placed end to end with no overlaps;
  - the Lead Sheet's `leadSheetSections` (`{measureIdx, label}`, `store/uiSlice.ts:148-151, 597-613`; editors `LeadSheetToolbar.tsx:52`, `LeadSheetView.tsx:111`, `Score/useScoreEditing.tsx:180`) migrates into it;
  - **vocabulary:** UNISON's `SectionType` (`src/unison/types/schema.ts:237-247`: intro, verse, chorus, bridge, pre-chorus, outro, solo, interlude, coda, custom) plus tag, hook, breakdown, build-up and drop. That changes a shared UNISON type, so check the UNISON converters (`leadSheetConverters.ts:89-97, 175`);
  - neutral blocks, 8 bars by default.
  - Song boots (`src/features/songs/seedStudioFromSong.ts`) write it, so a song opens with its form.
- **The full document-field routine,** with markers as the worked example:
  - the registry field (`persistence/projectDocument/fields.ts:328`);
  - the codec and the cloud document (`codec.ts:231, 976`);
  - the Y.Doc array and converters (`collab/YjsDocManager.ts:60-61, 212-218, 386-393, 454-457`);
  - the diff (`collab/diffEngine.ts:103-106, 408-447`);
  - the observer (`collab/yjsToZustand.ts:371-381, 522-525`);
  - the undo scope (`collab/undoScope.ts:41, 96`);
  - bar edits shift sections the way they shift markers (`time/measureEdits.ts:49, 71, 346`);
  - bump `SESSION_SCHEMA_VERSION`, the cloud `documentSchema` and `COLLAB_DOC_SCHEMA_VERSION`, with fixtures and the mixed-version collab check.
- **The lane (24 px):**
  - **+ Section** sits after the last section, or at the lane's left end when there are none. It lists the vocabulary plus a custom name.
  - A click seeks; dragging an edge resizes on bar lines.
  - **Menu:** Rename · Change type · Duplicate with its clips (one undo step) · Loop this section · Insert before/after · Delete (keeps the clips).
  - Each type has a one-line purpose that links to Learn → Songs.
- **The comment lane's slot:** the lane stack keeps a 24 px slot above the sections, shown only while the Comments panel is open. 4.3 fills it.
- **Checks:**
  - the full tier;
  - R30 updated for the new header (left cell, ruler end, footer);
  - sections survive refresh, cloud save and open, and two-client collab;
  - the Lead Sheet shows the same sections.

**2.14 Browser and add-track picker** (decision 16; ST5, ST12; anatomy §4, §7; pulled forward from 3.8)

- **The Library rail panel becomes the browser.** Today it holds the 4 templates and a search (`shell/inspector/panels/LibraryBody.tsx:37-108`). It will list what Music Atlas already has:
  - **Parts:** 75 live parts from `src/curriculum/data/parts/*.json` via `listLiveParts()`, moved from the dock's `components/Controls/PartsBrowser.tsx`. Its insert already moves a part into the project key and the feel (`prepared()`, :79-86) and makes a named clip at the playhead's bar (:176-199).
  - **Grooves:** 29 genre grooves (`data/groovesLibrary.ts`), inserted the way `GroovesBrowser.tsx:200-225` does, with its tempo-mismatch prompt.
  - **Drum kits:** natural, 808, house and the custom kits (`instruments/drumKits.ts:41-149`). There are no single one-shot items, so the browser lists kits.
  - **Instrument presets:** Oracle's 11 factory presets (`factoryPresets.ts:1571-1584`), the runtime Serum pack (`packLoader.ts`, 82) and the student's own (`store/slices/presetSlice.ts`). `ATLAS_PATCHES` reads a folder that doesn't exist (`atlasPatches.ts:9-16`), so it is empty.
  - **Templates:** `data/projectTemplates.ts`. They open as a new project, and are refused inside a shared session, as now.
- **Layout:**
  - one search;
  - filters with counts: Instrument, Genre and Type (Parts · Grooves · Kits · Presets · Templates);
  - tag chips.
- **Rows:**
  - ▶ preview;
  - name · key · tempo · length, plus chord function for parts (e.g. "I–V–vi–IV");
  - ♡, a per-user favourite;
  - **+**, which makes a new track at bar 1 holding the item (within the 10-track limit, `store/tracksSlice.ts:35-37`).
- **"Fits your song"** sits on top: items in the song's key and tempo range, for roles the timeline doesn't have yet (no bass → bass parts first). It replaces Soundtrap's "Top picks", which shows locked items.
- **Payloads and placeholders:**
  - **F11:** nothing writes `DRAG_MIME` today, so the Timeline's library-drop branch (`Timeline.tsx:2728-2829`) can't be reached. Write the payloads, so drops honour key and tempo. Drag is optional; + is the main path.
  - **F10:** retire the disabled MIDI-effect placeholders (`data/libraryItems.ts:177-205`) unless 1.17b has already.
- **The add-track sheet becomes a two-step picker** (`shell/tracklist/AddTrackSheet.tsx:87-126`, `addTrack.ts:33-45`):
  - categories first;
  - a second step only where a category has more than one engine (Drums → Drum grid | Grooves);
  - an About line under each choice. Grow it from `trackTemplates.ts:30-96`'s one-line descriptions, in the spirit of Mozart AI's Instrument Picker;
  - a chip row under the tiles: Import MIDI file… · Open the browser.

**2.15 Commands and output** (decision 16; ST9–ST11; anatomy §2, §4; pulled forward from 3.14)

- **Command palette** (`shell/help/`, beside `ShortcutSheet.tsx`):
  - **Data:** it reads the 1.6 registry (`commands/registry.ts`, `CommandDef` :44-60: id, scope, label, keys, keysLabel).
  - **Behaviour:** it searches, groups by scope, **shows each shortcut**, and runs the command under the keyboard-precedence rules.
  - **⌘K / Ctrl+K:**
    - It is free globally and not in the reserved list (`commands/__tests__/registry.test.ts:56-71`).
    - The Lead sheet view binds ⌘K (`commands/keymaps.ts:576-581`), and the clash test wouldn't catch a global one. Move the Lead sheet's binding or give the palette a second key there, and add a test.
  - **Scope order:** `ShortcutSheet`'s `SCOPE_ORDER` (:26-37) omits `tracks` and `noteEditor`. Fix it for both lists.
- **Export:**
  - **The Export pill** is the top bar's one white pill, at its right. It opens the existing dialog (`ExportAudioDialog.tsx`), grown to an **Audio | Notation** switch:
    - **Audio:** WAV 16/24-bit or Opus (`audio/exportAudio.ts:22-23`), ranges project/loop/bars (`renderProject.ts:115-151`), mastering on or off.
    - **Stems (new):** one render per track with the rest muted.
    - **Notation:** MIDI (`commands/projectCommands.ts:19-50`; give the file the project's name, not `prism-session.mid`), the lead sheet as MusicXML (`midi/MusicXmlExport.ts`; chords only today) and the full score as MusicXML (`ScoreMusicXmlExport.ts`).
  - **Honesty:** the offline render's known gaps (`renderProject.ts:23-41`: no ducker or gate, SoundFont silent, guitar/bass/vocal effects dry) stay visible in the dialog until 1.11 closes them.
  - **Entry points:** Project ▾'s export items (`ProjectMenu.tsx:326-340`) open the same dialog.
- **Track menu** (`shell/tracklist/TrackMenu.tsx:96-192`):
  - an inline rename field at the top (the Mozart AI pattern);
  - **Duplicate track** (B3 open issue 1). No helper exists:
    - `addTrack` (it returns '' at the 10/6 limits);
    - clips through `addMidiClip` or `updateTrack`, which give notes fresh ids;
    - the Oracle patch through `getTrackSynthState` / `setTrackSynthState` (`oracle-synth/synthTrackState.ts:230-251`);
    - audio shared through `AudioBufferStore.shareClipAudio` (:75), as `clipCommands.ts:137-146` does;
    - chord regions' `sourceClipId` won't follow the copy, and that's fine.
    - It is one undo step.
  - **Export track ▸** (WAV, WAV dry, MIDI, MusicXML), opening the dialog with the track preselected;
  - right-click on a row opens the menu.
- **Track row:**
  - the selected row gets a left edge in its track colour;
  - the row's instrument icon opens the dock.
- **Freeze** waits for 1.12b.
- **Checks:** the full tier (golden renders at 44.1 and 48 kHz, the bundle budget) and the browser.

**2.10 Mix view and 2.11 Help:** as the table says. Two notes:

- 2.10's master column shares 2.9's dock Master parts.
- 2.11's '?' sheet and 2.15's palette read the same registry data.

**Room for Stage D** (2026-10-14; updated by decision 16). Stage D builds these later into Stage B's files; details are in
[`29-D-teaching-features.md`](../29-D-teaching-features.md).

- **2.3:** the Projects dialog leaves room for an Assignments group (4.2).
- **2.5:** the Share menu leaves room for "Assign to a class…" (4.2). The top bar leaves room for
  the assignment strip and the read-only review banner (4.1).
- **2.6:** the empty-project tiles use goal wording: Start with a beat, Play an instrument, Start
  from a genre, Add a track. An assignment copy shows its brief instead.
  - AddTrackMenu's "Import" makes a MIDI track without opening a file. Relabel it or open Import
    MIDI.
- **2.7:** ~~the toolbar leaves room for "+ Section" next to "+ Marker" (4.4).~~ Superseded: 2.13
  folds the toolbar and puts "+ Section" in the sections lane.
- **2.8:** the side rail leaves room for a Comments panel (4.3).
- **2.13:** the lane stack leaves a comment lane's slot above the sections (4.3), shown while
  Comments is open.

**Stage B exit criteria:**

- **Budgets:** both target screens pass the screenshot and region-budget tests.
- **Design floor:** no text below the floor and no target under 24×24 inside `data-ds=v2`.
- **Overlays:** every overlay renders opaque.
- **Lessons:** today's 8 lessons pass at all three viewports, with no failures beyond the known list.
- **Perf:** the Stage A numbers hold (no regression).
- **Decision 16's guards** (from the Soundtrap review's "not worth copying"):
  - the dock's height is a share of the body at every size;
  - at 1366×655, at least 4 track rows show with the dock open;
  - the lane header is no taller than 80 px;
  - no start tiles show under existing tracks;
  - no click is swallowed after a menu or dialog closes with Escape.

## After Stage B: Production Lessons v2 (1.2b), ~3–4 developer-weeks (~6–7.5 with decision 17's Amendment A and L1)

Moved here by decision 14, so it is built once on the final shell. Before building, re-plan
[`lessons-v2.md`](lessons-v2.md) against the Stage B shell: anchor locations, control labels (for
example, tempo lives in the bottom rail, the PIANO ROLL tab is "Notes", FX is "Effects" and comes
last, Create has no toolbar row, and Parts lives in the browser; decision 16), and the Inspector dock.

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
- **Amendment A** (decision 17, proposed; [`lessons-v2.md`](lessons-v2.md) §8), which adds about
  1.5 developer-weeks:
  - listening step kinds (`listen`, `compare`, `tap`, `quiz`). `compare` plays B through the
    no-write preview path.
  - a glossary;
  - model answers, as one labelled undo step;
  - a closing Practice stage;
  - `startFrom`, composed inside the tutorial seed;
  - courses, Resume through the lesson's draft, and Next lesson;
  - a free "Building blocks" opener (Midnight Groove) as "Start here".
  - 1.2b ships no link to L1 or L2 lessons.

**L1 The Beats course** (decision 17, proposed; prompt 17a; ~1.5–2 developer-weeks; after 1.2b)

- Four free lessons on the drum machine, from Ableton Learn's Beats course:
  1. What is a beat (tempo, a tempo-and-genre card, tap-along);
  2. Kick and snare;
  3. Hats and subdivisions;
  4. Grooves and genres.
- New lesson-only demos, with inline drum clips.
- A curated `genreTempos.ts`. The curriculum's `tempoRange` strings are placeholders.
- Drum-position checks.
- Cross-links into Building blocks, Hip Hop and House.

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

**Decision 16 notes for the polish track (2026-10-16):**

- **3.1:** adopts 2.12's clip menu module; it doesn't build its own context menus.
- **3.3:** clip names and menus, the clip chrome and the sections lane already exist (2.12, 2.13). 3.3 keeps the model/renderer/interaction split and inline automation.
- **3.8:** the browser exists (2.14). 3.8 adds the key filter, preview at song tempo and Insight content.
- **3.14:** the export dialog exists (2.15). 3.14 keeps settings, import residue and any export gaps 1.11 closes.

**Decision 17 notes for the polish track (2026-10-16, proposed):**

- **3.11:** also ships AB13, three teaching visuals in the shared synth UI:
  - a steady, triggered oscilloscope;
  - an envelope stage dot driven by a ref and rAF, with no store key;
  - LFO shape buttons that write the existing nodes through `setLFONodes`.
- **3.11** also registers the synth section anchors on the Play page: `synth-env-amp`,
  `synth-osc-1`, `synth-osc-2`, `synth-filter`, `synth-lfo-1` and `synth-mod-matrix`.
- **L2 The Sound-design course** (prompt 25a; ~2–2.5 developer-weeks; after 3.11 and 1.11):
  - five free lessons in Learning Synths' order: Shape a note, Bright and dark, Pick a waveform,
    Make it move, Plucks;
  - four recipe lessons: WOBBLE, BASS, PLUCK and PAD;
  - a "Match it" step whose target comes from a single-patch offline render on 1.11's graph
    builder.
  - It spotlights; it never hides.

**Stage D notes for the polish track:**

- **3.3:** ~~builds the Sections lane with 4.4.~~ Built in 2.13 (decision 16).
- **3.6:** adds a "Duck to kick" setting and a tempo-synced pump to the Sidechain.
- **3.8:** Browser items show key, tempo and genre, with a key filter and preview at song tempo.
  Each effect category gets a one-line purpose.
- **3.13:** no video calls (SD6).

**Deferred (not in this program):**

- real BS.1770 LUFS;
- a reorderable FX chain;
- a split-band de-esser;
- an account synth-preset library (needs an API);
- NAM 48 kHz resampling;
- audio-file import (storage decision);
- a personal clip library, like Soundtrap's "Add to loop library" (needs an API);
- version history opened from the save chip (Soundtrap's "restore past versions", ST14): with Versions, and free, never paywalled;
- Versions/Revisions (need an API); timeline comments moved to Stage D (4.3, with the API
  contract in 4.0);
- rebuilding the vocal pitch editor or the band generators.

## Stage D: teaching features (added 2026-10-14), ~11–14 developer-weeks

Stage D comes from decision 15 and runs beside Stage C. Each milestone starts once what it waits
for has shipped. 4.0 is docs and a mock only, so it can run any time.

[`29-D-teaching-features.md`](../29-D-teaching-features.md) holds the rest: the evidence from the
Soundtrap and Soundation review, owner decisions SD1–SD11, the per-milestone notes and the exit
criteria. Prompts 30–37 build it, one milestone each.

| #   | Milestone                      | What ships (key points)                                                                                                                                                                  | Waits for                        | Size           |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------- |
| 4.0 | Teaching API contract and mock | `docs/studio-sharing-contract.md`: access roles, assignment copies, submissions, comments. CONTRACT-DELTAS rows, flags, mock modes, a dev user override for teacher and student personas | —                                | 1 wk + API     |
| 4.1 | Read-only review               | `?project=…&review=1` and `?submission=…` boots that write no draft and no save and join no room. Edits off; a top-bar banner                                                            | 4.0, 2.5                         | 1–1.5 wk       |
| 4.2 | Studio assignments             | Assign to a class, giving each student their own copy. Turn in. The progress page lists the work. Rides `kind:'atlas'` with module `studio`                                              | 4.0, 4.1, 2.3, Teacher Office P6 | 2–3 wk + API   |
| 4.3 | Timeline comments              | Pins in the comment lane above the sections (2.13 leaves its slot), threads, Resolve, a Comments panel on the side rail. A server resource, not in the Y.Doc                             | 4.0, 4.1, 2.8, 2.13              | 2 wk + API     |
| 4.4 | Song sections                  | **Moved into Stage B as 2.13 (decision 16).** One section model for the Timeline and the Lead Sheet. A Sections lane. Songs open with their form                                         | —                                | (in 2.13)      |
| 4.5 | Chord keys                     | Musical typing plays the key's chords, labelled with numerals. Free for every student                                                                                                    | 1.16a, 2.11                      | 1.5 wk         |
| 4.6 | Change key, move clips         | A key change offers to move MIDI clips and names each interval. Match song key on clips (Transpose and the clip-header key ship in 2.12)                                                 | 1.16a, 2.5, 2.12                 | 1–1.5 wk       |
| 4.7 | Genre starters                 | Learn → Style starters labelled key · genre · tempo, in 1.2b's launcher                                                                                                                  | 1.2b, 2.6                        | 1 wk + content |

## Findings added on 2026-10-14

The Stage D review checked the code around its features and found these, each verified by hand.
Each owning milestone picks its findings up. The archive ledger (`phase-map.json`) isn't updated,
as before.

| #   | Finding                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                      | Owner                                                                                                    |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| F1  | A collab "viewer" can still edit                          | The server marks a viewer's connection `readOnly` (`collab/server/party.ts:185`), but y-partykit only honours a room-wide `readOnly` (`node_modules/y-partykit/dist/index.js:797`). A viewer's updates still sync. Nothing asks for the viewer role yet                                                                                                       | 1.14, before Stage D puts teachers in student rooms                                                      |
| F2  | Rejoining a room may duplicate tracks (unverified)        | An owner who rejoins hydrates the doc, then merges the stored snapshot (`party.ts:211`) and the `collab-<roomId>` IndexedDB copy (`CollabProvider.tsx:472`). `tracksFromDoc` doesn't dedupe by id (`yjsToZustand.ts:183-192`). Likely trigger: a re-clicked pair link with `&host=1`                                                                          | 1.14: write the two-client test first                                                                    |
| F3  | Collab room storage is never cleaned up                   | Server snapshots never expire (`party.ts:211`), and nothing deletes the `collab-<roomId>` IndexedDB databases (no `deleteDatabase` in `src`). They pile up on shared Chromebooks                                                                                                                                                                              | 1.14                                                                                                     |
| F4  | A collaborator's colour changes on every rejoin           | The colour is `awareness.clientID % 8` (`CollabProvider.tsx:569`)                                                                                                                                                                                                                                                                                             | 3.13, with the Stage B colour sign-off                                                                   |
| F5  | Debug logging left in kick                                | `console.log('[kick] …')` at `CollabProvider.tsx:780, 789`                                                                                                                                                                                                                                                                                                    | 1.14                                                                                                     |
| F6  | The synth's "follow project key" follows the detected key | `hooks/useStoreBridge.ts:103-115` mirrors `detectedKeyRootPc`/`detectedMode`, not the student's key. `applyKeyToSession` (`unisonSlice.ts:269-281`) has no caller                                                                                                                                                                                             | 1.16a (`effectiveKey`)                                                                                   |
| F7  | Audio clips don't follow tempo changes                    | Buffers play at their own rate while the clip's length is its ticks at the current BPM (`audio/AudioClipScheduler.ts:80-85`, no `playbackRate`). A dropped sample's length is fixed at the BPM of the drop (`Timeline.tsx:2759-2761`). After a tempo change, audio drifts off the grid and is cut short or trails silence. Soundtrap's loops follow the tempo | 1.11: at least warn and offer to keep the tempo. Stretching is the same engine call as SD8's pitch shift |
| F8  | Pressing a marker's name seeks instead of dragging        | The cursor shows "grab" from −5 to +70 px (`Timeline.tsx:2363-2371`), but only ±10 px starts a drag (`Timeline.tsx:1762-1775`)                                                                                                                                                                                                                                | 2.13 (was 3.3; decision 16)                                                                              |
| F9  | `DialogHost` isn't mounted                                | Only the UI gallery mounts it (`ui/__gallery__/DawUiGallery.tsx:242`), so `promptDialog` cancels. Marker and Lead Sheet renames fall back to `window.prompt`                                                                                                                                                                                                  | 2.3                                                                                                      |
| F10 | Dead MIDI-effect placeholders                             | Arpeggiator, Chord and Scale are `disabled: true` (`data/libraryItems.ts:177-203`) and every mount hides them with `hideMidi`                                                                                                                                                                                                                                 | 2.14 if 1.17b hasn't (4.5 replaces Chord)                                                                |
| F11 | Library drag payloads are half-built                      | `drum-sample` and `midi-loop` payloads are never created, and the `midi-loop` drop ignores key and BPM (`data/libraryItems.ts:12-31`, `Timeline.tsx:2740-2811`)                                                                                                                                                                                               | 2.14 (was 3.8; decision 16; 4.6 reads the key)                                                           |
| F12 | The cloud contract names the wrong schema                 | `docs/studio-cloud-document-contract.md:35, 52` says `documentSchema` is 3; the code writes 4 (`codec.ts:112`, `cloudDocument.ts:58`)                                                                                                                                                                                                                         | Doc fix now: it's what music-atlas-api is built against                                                  |

**Ideas from the hands-on review, for existing milestones:**

- **1.12b:** a quiet "audio is struggling" indicator. Soundation shows CPU and memory in its status
  bar; on a Chromebook it would explain glitches.
- **2.11:** a hover hint line that says what the control under the pointer does, as Soundation's
  status bar does, and a "Report a problem" item in Help.
- **3.8:** library suggestions that fit the song. Soundtrap's "Top picks for this project" change
  with the key and what's already on the timeline.

## Verification

**Every milestone (fast tier, run locally before its merge-commit PR):**

- **Always use the browser to test your work** (owner rule, 2026-10-16): go through every
  changed flow by hand in Chrome (the Claude in Chrome tools) on the bypass dev server, with
  screenshots and the console read for errors. The harness and the unit tests come on top of
  this, never instead of it.
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
- Stage D: sign off SD1–SD11 in [`29-D-teaching-features.md`](../29-D-teaching-features.md).
- music-atlas-api: the 4.0 contract (project access roles, assignment copies, submissions,
  comments).

## Where the detail lives

The audit and design outputs (per-step files, code to reuse and verification for every milestone)
sit in the workflow journals listed in Step 0, and are archived into `docs/studio-audit-2026-10/`
first. Each milestone starts by reconciling its archived design with this plan's decisions and
integration rules. Milestone 1.2b's design lives in [`lessons-v2.md`](lessons-v2.md); re-plan it
against the Stage B shell before building (decision 14). Stage D's design lives in
[`29-D-teaching-features.md`](../29-D-teaching-features.md). Decision 16's evidence lives in
[`soundtrap-editor-anatomy.md`](soundtrap-editor-anatomy.md) (measured layout, ST1–ST15) and
[`mozart-ai-studio-anatomy.md`](mozart-ai-studio-anatomy.md), with screenshots in
`~/Desktop/References/soundtrap-2026-10-16/` and `~/Desktop/References/mozart-ai-2026-10-16/`.
Decision 17's evidence lives in [`ableton-lessons-review.md`](ableton-lessons-review.md) (Ableton
Learn and Learning Synths, AB1–AB13). Its design is [`lessons-v2.md`](lessons-v2.md) §8 for 1.2b,
plus prompts `17a` (L1) and `25a` (L2).
