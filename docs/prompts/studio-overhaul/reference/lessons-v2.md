# Milestone 1.2b: Production Lessons v2

Owner decision 13, 2026-10-07. **Deferred by owner decision 14 (2026-10-07): this milestone runs right after the Stage B exit**, so the lesson UI and the lessons are built once on the final shell. See [`plan.md`](plan.md).

**Amendment A (2026-10-16, proposed as plan decision 17):** [§8](#8-amendment-a-ableton-review-2026-10-16) adds what the review of Ableton's lesson sites found. See [`ableton-lessons-review.md`](ableton-lessons-review.md). It covers:

- listening step kinds;
- a glossary;
- model answers;
- a closing Practice stage;
- lessons that start from prepared material;
- courses with Resume;
- a free "Building blocks" opener.

Prompt 17 builds it with §1–§7.

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

## 8. Amendment A: Ableton review (2026-10-16)

Proposed as plan decision 17. It comes from [`ableton-lessons-review.md`](ableton-lessons-review.md), proposals AB1–AB8, and prompt 17 builds it together with §1–§7.

Two later prompts carry the rest:

- `17a`: the Beats course (AB9).
- `25a`: the Sound-design course (AB10–AB12).

Prompt 17 ships no link to a lesson those prompts build. Each later prompt adds its own cross-links.

**Re-plan first.** Stage B has moved further since §3 and §5 were written:

- Tempo is in the bottom rail (`transport-bpm`, `src/daw/shell/song/SongParts.tsx:173`), not the Song chip.
- The side rail's Lessons panel (`src/daw/shell/inspector/panels/LessonsBody.tsx`) also lists lessons. It uses the launcher's course sections (A7).
- Prompts 15a–15d change:
  - clips (one clip menu and the Edit pill);
  - the lanes and sections above the ruler;
  - the browser and the add-track picker;
  - the command palette and Export.
- Re-check every target in §3 and §5 against them.

### A1 Copy rules and step kinds

**Length limits:**

- **Title:** 2–4 words.
- **Instruction:** one action, 20 words or fewer.
- **`why`:** 25 words or fewer.
- **`listen`:** always a question, such as "Can you hear the bass duck under the kick?".

**New field on `TutorialStep`:** `kind?: 'do' | 'listen' | 'compare' | 'tap' | 'quiz'`, default `'do'`. The card shows it as an icon beside the eyebrow:

- headphones for `listen` and `compare`;
- a hand for `do` and `tap`;
- a question mark for `quiz`.

**Worked rewrites of today's steps:**

| Step                 | Title            | Instruction                                  | Why                                                                                    | Listen                                       |
| -------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| Hip Hop `slow-bpm`   | Slow it down     | Set the **Tempo** to **90 BPM**.             | Hip hop usually sits between about 80 and 100 BPM, which leaves room between the hits. | Does the beat feel heavier at 90?            |
| House `raise-amount` | Make it pump     | Raise the Sidechain **Amount** past **40%**. | Each kick pushes the bass down, then lets it swell back: the [[sidechain]] pump.       | Can you hear the bass breathe with the kick? |
| R&B `use-send`       | Share the reverb | Raise **Send A** on this track past **25%**. | One reverb on a [[return]] puts every track in the same room.                          | Does the track sit further back in the room? |

### A2 Glossary

- **File:** `src/daw/components/Tutorial/glossary.ts`. Each entry is `term → { definition, learnLink? }`, with definitions of 25 words or fewer.
- **Markup:**
  - `[[term]]` or `[[term|shown text]]` works in `instruction`, `why`, `listen` and quiz text.
  - `CoachCard`'s `Rich` (L89–105) renders it as a button with a dotted underline.
  - The button opens a popover built from the 2.2 `src/daw/ui` primitives.
- **Integrity test** (in `tutorialDetection.test.ts`): every `[[term]]` resolves to an entry.
- **Seed terms (~40):**
  - rhythm: beat, tempo, BPM, bar, downbeat, backbeat, four on the floor, subdivision, swing, velocity, groove;
  - drums and samples: kit, 808, one-shot, sample, chop, root note;
  - effects and mixing: delay, reverb, send, return, sidechain, compressor, OTT, saturation, mastering, bounce, automation, pan, solo, mute;
  - synth: preset, envelope, ADSR, LFO, filter, cutoff, resonance, waveform;
  - harmony: Dorian, seventh chord, progression.

### A3 Step kinds

**`listen`**

- `ask` (the question) plus an optional `answer`, which **Show the answer** reveals.
- It can check `isPlaying`. Otherwise it's free-form.

**`compare`**

- **Shape:** `compare: { a: string; b: string; preview(which: 'a' | 'b'): void }`, plus the question and an optional `answer`.
- **How B plays:** the card shows an A | B switch, and B plays through the no-write preview path:
  - `previewTrack(trackId, patch)` and `endTrackPreview()` (`src/daw/engine/trackReconciler.ts:100–110`);
  - `previewMasteringEffects` and `previewReturnEffects` (`src/daw/engine/preview.ts`).
- **Nothing writes the store,** so nothing autosaves, syncs to collaborators or becomes an undo step.
- **Settings only:** an effect on or off, Send A at 0 or 30%, an OTT depth, a volume.
- **Rules:**
  - Use volume for "without". A previewed mute isn't heard, because `preview()` keeps the track's previous audibility (L434).
  - Any write to `tracks` re-reconciles (L465–466), so the switch falls back to A whenever the store changes.
  - Leaving the step calls `endTrackPreview()`.
- **Content comparisons** (straight vs swung drums, chord A vs chord B) are not `compare` steps. The starting project (A6) carries both versions on two tracks, and `do` steps solo each one.

**`tap`**

- **The pad:** a tap pad in the card driven by `createTapTempo` (`src/daw/shell/song/tapTempo.ts`). Click it, or press Enter while it has focus.
- **After four taps, it reads:**
  - within ±4% of the project BPM: "Just right";
  - within ±4% of half or double the BPM: "Just right: you're feeling it in halftime" (or double time);
  - otherwise "Too slow" or "Too fast", with the measured BPM.
- **Check:** three "Just right" readings in a row.

**`quiz`**

- **Shape:** `quiz: { options: string[]; correct: number; why: string }`, with 2–4 options.
- **After one pick:** the card marks the student's choice and the correct one, shows `why`, and enables Next.
- It never blocks and is never scored.

**Decision 3:** verdicts are text plus an icon, in neutral colours. Emerald stays v2's "done" colour only.

### A4 Model answers

- **Field:** practice and creative steps can carry `model?: { label: string; apply(): void }`. The card then shows **Show the answer**.
- **Undo:** `apply` runs inside `withTransaction(label, …)` (`src/daw/store/history.ts:298`), so the model is one labelled undo step, for example "Show answer: backbeat".
- **Back to mine:** the button then reads **Back to mine**, which undoes that step.
- **Detection:** a step whose check the model satisfies completes quietly, with no confetti.

### A5 The Practice stage (closes every lesson)

1. **Target:** one specific task, with a check and a model (A4).
2. **Make it yours:** free-form. The model, if shown, is one example ("no wrong answers").
3. **Keep it:** the complete card offers Save, Export audio and Keep producing.

### A6 Starting state

- **Catalog field:** `startFrom?: { template: string } | { demo: string }`.
- **The seed:** the `tutorial` seed (`src/daw/session/intents.ts:474–483`) runs the existing seeds before `startTutorial`:
  - the template seed (`loadProjectTemplate` + `seedTemplateSynthPatches`, L451–463);
  - or the demo seed (`await prepareDemo`, then `applyDemo`, L466).
  - The baseline stays `source: 'tutorial'`.
- **Rule change:** this amends the working rule "no `DawApp.tsx` changes; 1.1 and 1.4 own the boot". `DawApp.tsx` stays untouched; the change is inside the tutorial seed.
- **Boot-link checks to update:**
  - `scripts/studio-perf/roundtrip.mjs` (~L350);
  - `src/daw/__tests__/DawApp.bootLinks.test.tsx`.
- **Lesson-only demos:** a demo used only by lessons gets `lessonOnly: true`, and `StudioDemos.tsx` (L45) filters it out of the dashboard.

### A7 Courses, Resume and chaining

- **Catalog fields:** `course: 'start' | 'beats' | 'sound' | 'recipes' | 'genre'` and `order`. Prompt 17 uses `start` and `genre`; 17a and 25a add the rest.
- **Launcher (§6):**
  - sections in course order, each headed with "n of N done";
  - "Start here" holds the opener (A8), and the genre pack follows.
- **Resume:**
  - **Storage:** `useTutorialProgressStore` gains `inProgress[id] = { draftId, updatedAt }`.
    - It's written when a lesson starts and cleared on completion or Quit.
    - The step index already lives in the draft META (`src/daw/persistence/drafts/draftContext.ts:42–46`), so it isn't stored twice.
  - **Tile:** a tile with an entry shows **Resume**, which opens `/studio/editor?draft=<draftId>`. If that draft has been pruned, Resume falls back to Start.
  - **Persist changes:**
    - bump the persist `version` and add a `migrate`;
    - add `inProgress` to `partialize` (L116);
    - reset it in the user switch (~L265).
    - Otherwise one student's lessons show as in progress for the next student on a shared Chromebook.
- **Complete card (§4):**
  - a one-line skill recap, for example "You can now program a backbeat";
  - **Next lesson**, within the course.
- **Side rail:** the Lessons panel uses the same sections.

### A8 "Building blocks" opener (free, `course: 'start'`)

- **Starting project:** the existing **Midnight Groove** demo (`startFrom: { demo: 'demo-midnight-groove' }`), unedited, because it's the perf baseline. It has four layers:
  - Keys;
  - Bass;
  - an Oracle lead hook;
  - the drums that `applyDemo` adds from `groove-hiphop-1`.
- **Steps:**
  1. `listen`: play it. How many layers can you hear?
  2. `do`: solo the drums (`track-solo`).
  3. `do`: bring in the bass.
  4. `compare`: the lead hook at full volume vs pulled back (a volume preview).
  5. `quiz`: which layer carries the melody?
  6. `do`: make your own mix by muting a layer. Show me demonstrates it, and the glossary covers "solo", "mute" and "layer".
- **Complete card:** Next lesson → Make your first track. 17a re-points it to the first Beats lesson.
- **"Start here":** the opener becomes the "Start here" tile, so a free student's first tile is no longer locked.

### A9 Genre-lesson changes

Every genre lesson gains:

- at least one `compare` or `tap` step;
- a listening question per stage;
- a reveal or a `quiz` in the recap;
- the Practice stage (A5).

Each lesson is capped at 16 steps. Fold orientation steps to stay under it.

| Lesson                | Adds                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Make your first track | Practice after `play`: change one chord (target, with a model), then `listen`: which chord changed the mood? |
| Jazz                  | `listen` with a reveal on `dorian`: which note makes Dorian brighter than natural minor? (the major 6th)     |
| Hip Hop               | `tap` the tempo after `bpm-90`; Practice: snares on 2 and 4, with a model                                    |
| Pop                   | `compare` the delay, on vs off, after `delay-tweak`                                                          |
| EDM                   | `compare` OTT depth, 30% vs 70%, after `depth`                                                               |
| House                 | `compare` the pump, Sidechain on vs off, after `amount`; Practice: offbeat open hats, with a model           |
| R&B                   | `compare` Send A, 0 vs 30%, after `send-a`; a `quiz` on the master fader before `bounce`                     |
| Indie                 | `listen` on `hear-swell`: where does the swell peak?; Practice: a pan move                                   |

### A10 Persistence

- **Code, not saved data:** catalog fields, `glossary.ts` and demos are code, so they need no registry entry and no schema bump.
- **New `tutorialSlice` keys:** the compare side, the quiz pick and "model applied".
  - Classify them in group `'tutorial'` (`src/daw/persistence/projectDocument/fields.ts:369–376`), with a reason in `fieldReasons.ts`.
  - The coverage test enforces this.
- **`DraftContext` fields:** any new ones are read tolerantly (`draftContext.ts`), so `SESSION_SCHEMA_VERSION` doesn't change.

### A11 Tests and walkthrough

- **`tutorialDetection.test.ts`:**
  - **compare:** leaving the step restores A.
  - **tap:** the verdicts, including halftime.
  - **quiz:** it never blocks.
  - **model:** it's one undo step, and Back to mine undoes it.
  - **glossary:** integrity.
  - **`startFrom`:** it names a real template or demo.
  - **catalog:** every entry has a `course` and an `order`.
- **`lessonDrivers.mjs`, drivers for:**
  - `listen`: play;
  - `compare`: B, then A;
  - `tap`: four synthetic taps at the project tempo;
  - `quiz`: pick the correct option;
  - model answers: Show the answer, then Back to mine.
- **`lessons.mjs`:**
  - walks every catalog lesson, not just the 8;
  - walks the opener in both personas, since it's free.

**Commit order additions:**

- model and runtime (A1, A3, A4, A10) go with §2;
- the glossary (A2) gets its own commit;
- the starting state (A6) gets its own commit;
- the launcher and progress (A7) go with §6;
- the opener (A8) comes before the genre rewrites;
- drivers come last.
