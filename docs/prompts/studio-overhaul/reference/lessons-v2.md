# Milestone 1.2b: Production Lessons v2

Owner decision 13, 2026-10-07. **Deferred by owner decision 14 (2026-10-07): this milestone runs right after the Stage B exit**, so the lesson UI and the lessons are built once on the final shell. See [`plan.md`](plan.md).

**Before building, re-plan this design against the Stage B shell.** The file and line references below are as of milestone 1.1. Stage B moves or renames many of the controls the lessons target: tempo moves into the Song chip, the PIANO ROLL tab becomes "Notes", the Library becomes the Inspector's Browser, and the track list, top bar, dock and Mix view are rebuilt. Build the card's buttons, chips and dialogs from the 2.2 `src/daw/ui` primitives, register the new anchors on the 1.7 anchor registry, and dock the coach card into the 2.8 Inspector below 1440 px (taken over from 3.12).

## Why

The owner reviewed the 8 Studio production lessons (`src/daw/components/Tutorial/tutorials.ts`, launched from `/studio/production`) and asked for three things:

1. **More detail.** Today there are 58 steps, each a one-line imperative of 12–20 words. There's no "why", no intro and no ending.
2. **A lesson UI that matches the rest of the app.** It should use the landing page's guided-tour components (`src/features/landing/tour/`).
3. **One preset list.** The Serum ("Xfer") presets in the Oracle synth preset menu should sit in the main FACTORY list, not their own section.

The 1366×655 walkthrough baseline (`docs/studio-perf/runs/lessons/summary.md`) also records breakage:

- Intro steps flash past.
- The coach card covers its own targets.
- `fx-add-saturator` and `fx-add-ducker` stay scrolled out of view.
- Indie can't start because no step adds a track.
- Free students land in locked Prism steps.

**Owner choices:**

- A full rewrite into build-a-track arcs of about 11–15 steps, modeled on the beatspark reference lessons.
- A tour card with "Show me".
- A launcher restyle with a lesson preview.
- Merge the presets in the synth preset menu.

## Working rules

- **Branch:** `studio/stage-a-1.2b`, cut from the Stage B exit in the overhaul worktree.
- **Harness:** port 5263, `npm run studio:check` (fast tier).
- **Commits:** local only until the owner reviews.
- **Boot:** no `DawApp.tsx` changes. 1.1 and 1.4 own the boot. Everything hooks in through `TutorialLayer`, the store and the launcher.
- **Consumes from 1.2:**
  - the `tutorialCatalog.ts` split;
  - Premium gating (`useIsPremium`, with `LockedFeatureOverlay` set to `inert`);
  - `VITE_DEV_AUTH_BYPASS_PLAN=free`.
- **Anchors:** every existing `data-tutorial-id` keeps its id (decision 9). `automation-toggle` only changes scope, to the selected track.

## 1. Preset menu: one FACTORY list (first commit)

- `oracle-synth/components/preset/PresetSelector.tsx` (L55-58, L162-188):
  - **One `FACTORY` section.** The 11 Oracle presets come first, starting with INITIALIZE. The 82 pack presets follow in manifest order; their `BA -`, `LD -` and `PD -` prefixes already group them.
  - **Remove the pack heading.** Drop the `{packDisplayName}` heading and its selector.
  - **Keep the `packPresets` subscription,** so a late pack load still refreshes the list.
- **Helper:** a pure `buildPresetSections(list)`, with a vitest.
- **Comment:** fix the comment in `store/presets/packLoader.ts`.
- **No data work needed.** The pack is git-tracked (149 files), and `loadPreset` already resolves pack names.

## 2. Model and runtime

**New fields on `TutorialStep`:**

- `title`: 2–4 words, used by the step pills and the outline.
- `why?`: the concept behind the step.
- `listen?`: what to listen for.
- `demo?`: `{target?, gesture?: 'click' | 'drag-up' | 'drag-right'}`.

`stage` becomes one word, such as "Drums" or "Harmony".

**New fields on `Tutorial` and the catalog:** `genre`, `intro {make, learn[]}`, `recap[]` and `outline[]`. A test asserts that:

- the outline equals the step titles;
- `requiresPremium` equals "some step targets `prism-*` or requires the Prism tab".

**Checks:**

- Keep the `(s, armed)` and `synthCheck` signatures.
- Reference compares become value compares.
- An optional `watch` selector lets detection skip unrelated store writes (practice-tutorial-15).

**Additions to `tutorialSlice`:**

- `tutorialPhase: 'intro' | 'running' | 'complete'`
- `tutorialStepEnteredBy`
- `tutorialStepArrivedSatisfied`
- a one-shot `skipIntroFor`
- actions `beginTutorial`, `finishTutorial` and `skipTutorialStep`

**Behaviour:**

- **Satisfied on arrival:** the step is marked done quietly, with no auto-advance. Next is enabled and the card says "Already set: click Next".
- **Back:** enters review mode, which never auto-advances.
- **Orientation steps** become free-form steps that advance on Next.
- **Skip:** a "Skip step" link appears after 20 s on validated steps.
- **Quit:** an inline confirm: "Your work stays in this project".
- **Theme vars:** delete the `themeVars` copy. The new UI uses literal neutral classes.
- **Scroll into view:** `scrollTargetIntoView` re-runs whenever the resolved element changes. This fixes the clipped saturator and ducker rows, and the mixer strips inside their `overflow-x-auto` row.
- **Recovery:** if no target resolves within 1.5 s and `requires.view` differs from the current view, spotlight `view-switch-<view>`.

## 3. New anchors

| Anchor id                 | Location                               |
| ------------------------- | -------------------------------------- |
| `transport-play`          | TransportBar ~L752                     |
| `transport-loop`          | TransportBar ~L669                     |
| `track-volume`            | TrackHeader ~L490, selected track only |
| `track-solo`              | TrackHeader ~L427, selected track only |
| `mixer-fader`             | StudioView ~L667, selected strip       |
| `timeline-canvas`         | Timeline ~L2716                        |
| `pianoroll-grid`          | PianoRoll ~L1813                       |
| `drum-velocity-lane`      | DrumMachineView ~L1837                 |
| `synth-filter`            | OracleSynthInline filter slot ~L118    |
| `sampler-envelope`        | SamplerChopsView ~L608                 |
| `sampler-filter-controls` | SamplerChopsView ~L564                 |
| `prism-mode`              | CircleOfFifths ~L276                   |
| `prism-rhythm-select`     | RhythmSelector ~L45                    |

`tutorialAnchors.test.ts` must pass.

## 4. In-editor UI

Tailwind only. Glacial weights 400 and 700, no teal, no brand yellow.

**Recipes:**

| Element     | Classes / source                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Glass shell | landing `TourCallout`: `rounded-xl border border-white/15 bg-[#18181b]/85 backdrop-blur-xl shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]` |
| Step badges | landing `ModuleDemo` `stepNumber` recipe                                                                                               |
| Eyebrow     | `CONSOLE_LABEL`                                                                                                                        |
| Primary     | white pill: `rounded-full bg-white text-[#101012] hover:bg-white/90`                                                                   |
| Secondary   | ghost: `rounded-full border border-white/10 text-white/80`                                                                             |
| Done        | `emerald-400`                                                                                                                          |

**CoachCard (rewrite):**

- **Header:** lesson title, "3 of 12", Quit.
- **Step pills:** a row of pills; done steps are clickable for review.
- **Body:**
  - eyebrow and title;
  - instruction, with `**bold**`;
  - why, in `text-white/60`;
  - listen, with a Headphones icon.
  - Below 720 px of viewport height, why and listen collapse behind a "Why?" toggle, so the card fits at 1366×655.
- **Status line.**
- **Buttons:** ghost Back, ghost **Show me**, and a white-pill Next or Finish.
- **Drag:** by the header handle only. The card stays inside the viewport and its offset resets each step.
- **Accessibility:** `role="dialog"` with `aria-modal={false}` and `aria-labelledby`, plus an `aria-live="polite"` region.
- **Placement:** `computeCardPos` plus a collision pass, so the card never covers the target.

**Spotlight:**

- A static dim and a neutral white ring.
- The pulse animates opacity only, and is off under `prefers-reduced-motion`.

**Confetti:** unmounts after its burst. Neutral and key colours only (no `#facc15`).

**Show me:**

- Imports `TourCursor` from `@/features/landing/tour/TourCursor`. Don't move that file: the main checkout has uncommitted landing work in it.
- In the fixed layer, the cursor flies from the button to the target and plays the click ripple. Drags get a second point.
- Purely visual.
- Under reduced motion, it pulses the ring once instead.

**`LessonIntroCard` (new):**

- Shows the genre, title, "What you'll make", "You'll learn", a numbered outline by stage, minutes and difficulty.
- Buttons: a white-pill **Start** and a ghost "Not now".
- **Free student on a Premium lesson:** shows "This lesson uses Prism, part of Premium", **See plans** (`ProfileRoutes.plan`) and "Back to lessons", and fires `trackPaywallViewed`.

**`LessonCompleteCard` (new, with confetti):**

- Shows the recap ("What you built") and skill chips.
- Buttons: **Next lesson** (opens `/studio/production?preview=<next>`), Back to lessons, and Keep producing.
- `markComplete` and `reportCompletion` fire when the card opens.

## 5. Lessons

**The beatspark pattern:**

- one action per step;
- a listen checkpoint every 4–6 steps;
- an experiment step at the end of a stage;
- a recap at the end.

Every step gets a `title`, `instruction` and `why`, and usually a `listen`.

**Notation:**

- Steps are written `id (anchor, check)`.
- "play" means `transport-play` with `isPlaying`.
- "Next" means a free-form step.
- ★ lessons use Prism and are Premium.

**★ Make your first track** (9 min)

- **Setup:**
  - `add-synth` (`isPrismTrackSelected`)
  - `meet-prism` (Next)
- **Key:** `pick-key` (G)
- **Chords:**
  - `home-chord` (starts on 1)
  - `four-chords`
- **Feel:**
  - `pick-genre` (changed)
  - `rhythm` (`prism-rhythm-select`)
  - `expression` (Next)
- **Create:**
  - `create`
  - `play`
  - `loop` (`transport-loop`)
- **Mix:**
  - `level` (`track-volume`)
  - `add-reverb`

**★ Jazz: Color your chords** (10 min)

- **Setup:**
  - `add-organ` (tonewheel)
  - `tempo` (110–140)
- **Style:** `genre-jazz`
- **Key and mode:**
  - `key-f`
  - `dorian` (`prism-mode`)
- **Chords:**
  - `first-seventh`
  - `four-chords` (two sevenths)
- **Rhythm:**
  - `comping` (Jazz pattern)
  - `swing` (> 25)
- **Create:**
  - `create`
  - `play`
  - `try-mixolydian` (Next)

**Hip Hop: Build the beat** (11 min)

- **Setup:**
  - `add-drums`
  - `meet-sequencer` (Next)
  - `kit-808`
  - `bpm-90` (matches the grooves, so there's no tempo prompt)
- **Drums:**
  - `kicks` (36, +2)
  - `snares` (38/40, +2)
  - `hats` (42, +4)
  - `play`
- **Groove:**
  - `hat-velocity` (`drum-velocity-lane`, ≥ 2 distinct velocities)
  - `pad-mix` (value compare)
- **Arrange:**
  - `duplicate` (`timeline-canvas`, Cmd/Ctrl+D)
  - `load-groove`
  - `final-listen`

**Pop: Flip a sample** (10 min)

- **Sound:**
  - `add-sampler`
  - `load-sample`
  - `trim` (`sampler-waveform`)
  - `soften` (`sampler-envelope`)
  - `filter` (`sampler-filter-controls`)
- **Melody:**
  - `draw-notes` (`pianoroll-grid`, +4)
  - `chop-chord` (3 notes share a `startTick`)
  - `play`
  - `loop`
- **Space:**
  - `add-delay`
  - `delay-tweak`
  - `add-reverb`

**★ EDM: Design the drop** (13 min)

- **Drums:**
  - `add-drums`
  - `bpm-140`
  - `four-floor`
- **Bass:**
  - `add-synth`
  - `load-wobble` (synthCheck)
  - `filter` (`synth-filter`, cutoff changed)
  - `play-wobble` (Next; fixes today's wrong target)
- **Harmony:**
  - `genre-edm`
  - `aeolian` (`prism-mode`)
  - `riff`
  - `create`
- **Grit:**
  - `saturator`
  - `ott`
  - `depth` (> 40%)
  - `drop` (play)

**House: Make it pump** (11 min)

- **Drums:**
  - `add-drums`
  - `kit-house`
  - `bpm-124`
  - `four-floor`
  - `offbeat-hats` (46)
  - `play`
- **Bass:**
  - `add-synth`
  - `bass-preset` (BASS, or a `BA -` preset from the merged list, such as `BA - DONK`)
  - `bassline` (`pianoroll-grid`)
- **Pump:**
  - `add-ducker`
  - `key-drums`
  - `amount` (> 40%)
  - `hear-pump`
  - `release` (Next)

**★ R&B: Mix & polish** (14 min)

- **Chords:**
  - `add-synth`
  - `keys-preset` (CHORDS or `KY -`; this avoids SoundFont, which bounces silent)
  - `genre-rnb`
  - `four-chords`
  - `create`
- **Space:**
  - `add-reverb`
  - `shape-reverb`
- **Mix:**
  - `goto-master`
  - `fader` (`mixer-fader`, replacing the 0 px `mixer-section`)
  - `send-a`
  - `return-a`
- **Master:**
  - `master-comp`
  - `master-level`
  - `bounce` (targets `export-audio-run`, then `file-export-audio`, then `file-menu`)

**Indie: Movement & dynamics** (11 min)

- **Build:**
  - `add-drums`
  - `indie-groove`
  - `add-synth`
  - `pad-preset` (PAD or `PD -`)
  - `draw-pad`
- **Automate:**
  - `open-lane` (selected-only toggle; fixes the lesson that can't start)
  - `volume-swell`
  - `hear-swell`
  - `pan-move`
  - `bloom` (`send.A`)
- **Dynamics:**
  - `solo` (`track-solo`)
  - `unsolo-listen`

**Avoid:**

- Prism has no octave, voicing or inversion controls.
- Picking a genre resets strum, so don't check strum after a genre step.
- Synth checks only see the mounted synth panel.
- Nothing goes in Score or Lead Sheet.

**Tests:** rewrite `tutorialDetection.test.ts` to cover:

- a pure true/false test for every check;
- a satisfied-on-arrival case;
- integrity: 8 lessons, unique ids, every step has a title and target, and the catalog stays in sync.

## 6. Launcher (`/studio/production`)

`StudioProduction.tsx` imports only the catalog.

- **Layout:** a "Start here" featured tile (Make your first track, `sm:col-span-2`, with an outline peek), then a "Genre pack" grid.
- **Tiles show:**
  - the eyebrow `Genre · Difficulty · N min`;
  - a Premium chip (from 1.2);
  - "N steps";
  - Completed, or Start/Replay.
- **`LessonPreviewDialog`** (shadcn `Dialog`, glass):
  - Shows the eyebrow, title, "What you'll make", "You'll learn", and a numbered outline using the landing badges.
  - **Start lesson** sets `skipIntroFor` and navigates to `/studio/editor?tutorial=<id>`.
  - For a free student on a Premium lesson, the buttons are **See plans** and Not now.
- **`?preview=<id>`** opens the dialog. The completion card's "Next lesson" uses it.

## 7. Verification (fast tier)

1. **Unit tests:** `npx vitest run src/daw/components/Tutorial src/daw/oracle-synth src/styles/__tests__/restyleGuard.test.ts`.
2. **Lint:** `npm run lint`.
3. **Walkthrough drivers:** rewrite `scripts/studio-perf/lessonDrivers.mjs` for every new step id.
   - Export or extend the factories.
   - Add organ to `ADD_TRACK_CARDS`.
   - Add store drivers for pad notes, velocity, duplicate, sampler params, synth filter, loop and solo.
   - Prune `KNOWN_FAILURES`.
4. **Studio check:** `npm run studio:check` at 1366×655, premium and free, meeting the Stage A lessons criterion in `plan.md`.
5. **Screenshots** at 1366×655 and 1440×787:
   - intro card;
   - coach card: waiting, done and already-set;
   - Show me in flight;
   - completion card;
   - launcher and preview dialog;
   - the synth preset menu as one FACTORY list.
6. **Fix rounds:** at most 2 per lesson. Anything left is reported with screenshots.
7. **Handover:** a review guide. When the PR exists, close the moved findings in `phase-map.json` with `"pr"`.

**Commit order:**

1. Preset menu.
2. Model and runtime.
3. Anchors.
4. Card UI.
5. Lessons, 2 per commit.
6. Launcher.
7. Drivers and verification.
