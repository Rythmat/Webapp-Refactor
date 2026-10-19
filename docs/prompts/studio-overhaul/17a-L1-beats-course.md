# L1 — Production Lessons: the Beats course

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: 1.2b (prompt 17, Production Lessons v2 with Amendment A) is verified on `aaron` and recorded in STATUS.md. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first. Prompt 37 (genre starters) also edits the launcher: never run the two at once.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)**, **Integration rules**, your milestone's row and note, the stage's exit criteria, and **Verification**.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (find your milestone id), `findings.json` (finding ids cited below), `phase-map.json`.
- Already on `origin/aaron`: Stage A (1.0–1.17a), Stage B through its exit (2.1–2.15) and 1.2b: Production Lessons v2 with Amendment A (step kinds `listen` / `compare` / `tap` / `quiz`, the glossary, model answers, the Practice stage, `startFrom`, courses, Resume and the Building blocks opener).
- `docs/prompts/studio-overhaul/reference/ableton-lessons-review.md`: the review of Ableton's lesson sites behind decision 17. Read §2–§4 (the lesson page, the widgets, the Beats lessons page by page) and AB9 in §9.
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

## Goal (decision 17, AB9)

Add the **Beats** course: four free lessons on the drum machine. They're modelled on Ableton Learn's Beats course (review §4) and built with Amendment A's step kinds.

- Catalog: `course: 'beats'`, ordered after "Start here".
- No Prism, so no Premium badge.

**New parts:**

- **Lesson-only demos** (`lessonOnly: true`) in `src/daw/data/demoProjects.ts`:
  - Write their drums as inline MIDI clips, not a `drumGrooveId`. A failed groove fetch would open a drums-only demo empty.
  - `demo-first-beat`: 100 BPM, 2 bars of kick, snare and closed hats.
  - `demo-beats-blank`: one drum track with an empty one-bar clip, at 100 BPM.
  - `demo-hats-feel`: kick and snare plus two hat tracks, "Hats straight" and "Hats swung" (the off-beats delayed to a triplet feel).
- **The tempo-and-genre card**, a step option (`card: 'tempo-genre'`):
  - It shows genre tempo bands, with a marker at the project tempo read from the store.
  - Bands come from a curated table, `src/daw/components/Tutorial/genreTempos.ts`: hip hop, R&B, pop, rock, jazz, house, techno, dubstep and its halftime, drum and bass and its halftime, reggaeton. Cite one source in a comment.
  - Don't use `tempoRange` from `src/curriculum/data/genreProfiles/*`. Those strings are placeholders marked `// NOTE`, and there's no house, EDM or indie profile.
  - Colours stay neutral: the band holding the tempo gets an outline, not a colour (decision 3).
- **Drum-position checks:**
  - Helpers read the drum clip's events: kick 36, snare 38 or 40, closed hat 42, open hat 46.
  - They compare positions with the bar's beat grid from the time model (`src/daw/time/`). So "kick on every beat" and "snare on 2 and 4" are value checks.

**Lessons.** Rules for all four:

- 12 steps or fewer;
- a listening question in every stage;
- each ends with the Practice stage.

1. **B1 What is a beat?** (`startFrom: demo-first-beat`)
   - `listen`: play. Can you feel where to tap your foot?
   - `do`: set the tempo to 120 (`transport-bpm`), with the tempo card.
   - `do`: slow it to 85. `listen`: does it feel like a different style now?
   - `tap`: tap along at 85, then tap again in halftime.
   - `quiz`: which of these styles usually runs fastest?
   - Practice: set a house tempo. The check is "within the card's house band"; the model sets 124.
2. **B2 Kick and snare** (`startFrom: demo-beats-blank`)
   - Kick on all four beats ("four on the floor"), with a model; then `listen`.
   - Snare on 2 and 4 ("backbeat"), with a model.
   - Remove the downbeat kick. `listen`: hear the surprise.
   - Add kicks between the beats, on 16ths.
   - Practice:
     - alternating kick and snare ("no wrong answers"; the model is one example);
     - a pattern that avoids the beat;
     - mix it up.
3. **B3 Hats and subdivisions** (`startFrom: demo-hats-feel`)
   - 8th-note hats, then 16ths.
   - Velocity accents in the velocity lane (`drum-velocity-lane`).
   - An open hat on the off-beats.
   - Quiet ghost snares.
   - Straight vs swung:
     - solo "Hats straight", then "Hats swung". Content A/B is never a `compare`.
     - `quiz`: what does swing do to the off-beats?
   - Practice: make the hats groove.
4. **B4 Grooves and genres** (`startFrom: demo-beats-blank`)
   - In the dock's Grooves tab, load grooves from three genres the library has: Hip Hop, Rock, and Funk or Latin. `src/daw/data/groovesLibrary.ts` has none for Pop, Jazz, House or Afrobeat.
   - Set each one to its tempo with the tempo card.
   - Solo to compare. `quiz`: which groove is the most syncopated?
   - Practice: change two hits in one groove and make it yours.

**Cross-links (this prompt adds them):**

- Building blocks' **Next lesson** points to B1.
- The Hip Hop (`bpm-90`) and House (`bpm-124`) tempo steps show the tempo card.
- The Hip Hop and House intros link to B2.

**Harness and tests:**

- **Drivers:** store drivers in `scripts/studio-perf/lessonDrivers.mjs` for every new check: drum positions, velocities, groove loads and solo.
- **Walkthrough:** `lessons.mjs` walks the four lessons in both personas at 1366×655 and 1440×787.
- **Unit tests:**
  - every check, true and false;
  - the `genreTempos` bands parse;
  - each demo loads.
- **Screenshots at 1366×655:**
  - the tempo card;
  - a practice step with Show the answer;
  - B3's solo comparison.
