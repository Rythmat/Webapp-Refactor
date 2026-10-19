# L2 — Production Lessons: the Sound-design course and recipes

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: 3.11 (prompt 25: the Oracle synth Play page and Maximize editor), 1.11 (prompt 18: the PlaybackScheduler and its graph builder) and 1.2b (prompt 17) are verified on `aaron` and recorded in STATUS.md. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)**, **Integration rules**, your milestone's row and note, the stage's exit criteria, and **Verification**.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (find your milestone id), `findings.json` (finding ids cited below), `phase-map.json`.
- Already on `origin/aaron`: Stage A, Stage B, 1.2b (Production Lessons v2 with Amendment A: step kinds, glossary, model answers, `startFrom`, courses and Resume), 1.11 (PlaybackScheduler), 1.13 (synth patch schema) and P3 (3.5 instrument views, 3.6 effects rack, 3.11 Oracle synth Play page). 17a (the Beats course) may or may not have run; this prompt doesn't depend on it.
- `docs/prompts/studio-overhaul/reference/ableton-lessons-review.md`: the review of Ableton's lesson sites behind decision 17. Read §6–§7 (Learning Synths' chapter map and how it teaches, including the recipe format) and AB10–AB13 in §9.
- `docs/prompts/studio-overhaul/reference/lessons-v2.md` §8 (Amendment A): the step kinds, `startFrom`, courses and copy rules this milestone builds on.
- Status log of prompt runs: `docs/prompts/studio-overhaul/STATUS.md`.

## Binding rules

- One interface (no Simple/Advanced). Neutral look: white-pill primary (#fff bg, #101012 text, rounded-full), white/10 for active, **no teal, no brand yellow**, Glacial Indifference font, 12 px label floor (11 px only uppercase micro labels), 24×24 min targets. Colour only for musical meaning.
- Targets: school Chromebooks at **1366×655** and laptops at **1440×787**, mouse and keyboard.
- Never lose work. Every `data-tutorial-id` stays stable (alias map if a label changes); every Production lesson in the catalog must keep passing (decision 17: from this prompt on, "the 8 lessons" means every catalog lesson).
- New UI is built once in its final home (`src/daw/ui/**` primitives, `src/daw/shell/**` shell). Every new store key is classified in the 1.3 registry (`src/daw/persistence/projectDocument/fields.ts`; the coverage test enforces it). Persisted-format changes bump `SESSION_SCHEMA_VERSION` with a migration and fixtures; Y.Doc shape changes bump `COLLAB_DOC_SCHEMA_VERSION`.
- Match the surrounding code (naming, comment density, plain-sentence comments). No new npm dependencies without asking.

## Tools and verification

- Dev server: `VITE_DEV_AUTH_BYPASS=1 npx vite` (premium dev user; `VITE_DEV_AUTH_BYPASS_PLAN=free` for the free persona). The owner's own server runs on port **5179** — don't kill it; the harness starts its own on 5263 unless you pass `--reuse=http://localhost:<port>`.
- Harness `scripts/studio-perf/`: `npm run studio:check` (fast tier: reload round-trips, lessons, anchors, ratchet tests), `npm run studio:check:full` (adds perf, goldens, bundle). Flags must be `--flag=value`. Add `--fake-audio` if headless Chrome's audio clock doesn't move on this machine.
- **Always use the browser to test your work** (owner rule, 2026-10-16). Open the editor in Chrome with the Claude in Chrome tools, on the bypass dev server (port 5263, never the owner's 5179), and go through every flow the milestone changed as a student would: click, type, drag, play, reload, and take screenshots, and read the console for errors. Headless harness runs and unit tests come on top of this, never instead of it. Keep the exact-size checks (1366×655, 1440×787, 1280×720) in headless runs too, since the Chrome window may not shrink to them.
- A milestone is **verified** when: `npx yarn lint` passes (prettier, eslint --max-warnings 0, tsc -b); `npx vitest run` passes except the known pre-existing `src/curriculum/pages/__tests__/GenreLessonContainerV2.pianoDom.test.tsx` "Funk L1" snapshot; `studio:check` passes (and `studio:check:full` for perf/audio milestones); the reload ratchet (`scripts/studio-perf/knownLosses.json`) shows no new losses (update it with `--update-known` only when it improved); both lesson personas pass; and the changed flows were tested by hand in the browser, with what was tried recorded in `STATUS.md`.

## Committing and pushing

- Commit in coherent commits (one per concern), messages in plain sentences saying what students notice, citing audit finding ids.
- **Never push to `main`, never open a pull request.** When the milestone is verified, push it to `aaron` (fast-forward; the pre-push hook lints the whole tree). If something can't be verified, commit locally, don't push, and say why.
- Finish by appending a short entry to `docs/prompts/studio-overhaul/STATUS.md`: milestone, commits, pushed or not, verification numbers, open issues, and decisions the owner must sign off. Then give the owner a short review summary.

---

## Goal (decision 17, AB10–AB13)

Add two sets of free lessons on the Oracle synth, modelled on Learning Synths (review §6–§7) and built with Amendment A's step kinds:

- the **Sound design** course: five lessons, catalog `course: 'sound'`;
- four **recipe** lessons: catalog `course: 'recipes'`.

No Prism, so no Premium badge.

**Spotlight, never hide** (decision 2):

- Lessons point at sections of 3.11's Play page, or of the Maximize editor.
- Nothing is hidden for a lesson.
- Steps that check the synth require its panel to be open (`requires`), because synth checks only see the mounted panel.

**First, check what 3.11 shipped.**

- **Synth anchors:** register any missing ones on the Play page, through the 1.7 anchor registry:
  - `synth-env-amp`
  - `synth-osc-1` and `synth-osc-2`
  - `synth-filter`
  - `synth-lfo-1`
  - `synth-mod-matrix`
- **AB13 (teaching visuals)** should be in 3.11. Build whatever is missing here, in the shared synth UI:
  - a steady, triggered oscilloscope (`src/daw/oracle-synth/components/visualizers/WaveformVisualizer.tsx`);
  - a stage dot on the envelope drawing while a note plays (`EnvelopeVisualizer.tsx`). It's driven by a ref and rAF, with no store key.
  - LFO shape buttons. Helpers are in `audio/LFOWaveformBuilder.ts`, written through `setLFONodes`.

**Lessons** (paths under `src/daw/oracle-synth/`; checks are `synthCheck`s on `useSynthStore`)

Every lesson starts from a lesson-only demo, `demo-synth-lab` (`lessonOnly: true`). It holds one Oracle track on INITIALIZE with a two-bar melodic clip on loop, so the student only listens and turns controls.

1. **S1 Shape a note:** the amp envelope (env 1).
   - Start from the PAD, PLUCK and PIANO buttons (`components/modules/EnvelopeModule.tsx:24-32`).
   - Then attack; decay with sustain at 0; and release (`setEnvParam`).
   - A `listen` step after each.
2. **S2 Bright and dark:** filter 1 cutoff and resonance.
   - Start from the analogy "music through a wall".
   - `FilterResponseVisualizer` draws the curve.
   - Compare low-pass and high-pass.
3. **S3 Pick a waveform:**
   - OSC 1 wavetable: SINE, SAW, SQUARE;
   - octave;
   - OSC 2 on, with a small detune;
   - unison voices and detune.
4. **S4 Make it move:** an LFO 1 → FILTER 1 CUTOFF route.
   - `addModRoute()` takes no arguments. Set the source, target and amount with `updateModRoute` (`store/slices/modulationSlice.ts:6-8`).
   - Rate divisions (LFOs are tempo-synced only) and the shape buttons.
   - It ends in a wobble.
5. **S5 Plucks:** an ENV MOD → FILTER 1 CUTOFF route.
   - There's no dedicated filter envelope.
   - Env 2's decay then sets how plucky the sound is.

**Match it** (AB12, the last step of S1–S5):

- **Hear the target** plays a short phrase rendered once, offline, from the target patch.
  - It uses a new single-patch render built on 1.11's graph builder. Today's `renderProject` renders only the live project (`src/daw/audio/renderProject.ts:121-124`).
  - Render once per step and reuse the buffer.
  - Play it through the shared context, never a new `AudioContext` (`src/audio/core/AudioContextOwner.ts`).
- **The student's own sound** plays live. Nothing is copied into their patch.
- **The check** passes within a tolerance on one or two parameters:
  - attack and release: within ±25% on a log scale;
  - cutoff: within a third of an octave;
  - LFO division: exact.

**Recipes** (AB11, 4–6 steps each):

- **Presets:** WOBBLE, BASS, PLUCK and PAD, from `store/presets/factoryPresets.ts`.
- **Steps:**
  1. Load the preset (`loadPreset`, checked by `presetName`).
  2. Then one section at a time: spotlight it, give a `why` written from the preset's real values, and ask for one tweak (a changed value).
  3. End with "tweak everything".
- **Reset:** a **Reset to <preset>** button in the card reloads the preset.

**Cross-links (this prompt adds them).** They go on the complete card's "Try next" and in the lesson intro:

- EDM → the WOBBLE recipe;
- Hip Hop → BASS;
- Pop and House → PLUCK;
- Indie and R&B → PAD.

**Harness and tests:**

- **Drivers:** synth drivers in `lessonDrivers.mjs` that set patch values through `useSynthStore`, plus drivers for the Match it targets.
- **Walkthrough:** `lessons.mjs` walks all nine lessons in both personas at 1366×655 and 1440×787.
- **Unit tests:**
  - every `synthCheck`, true and false;
  - the tolerances;
  - the single-patch render: non-silent, the right length, no store writes;
  - Reset restores the preset.
- **Render cost:** measure it on the Chromebook profile.
