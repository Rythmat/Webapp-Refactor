# 2.13 — Stage B: lanes above the ruler and song sections

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: B5 (2.12, prompt 15a) is on `aaron`. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)** (especially **decision 16**), **Integration rules**, the Stage B target layout and pixel budget, your milestone's row and note (2.13), the Stage B exit criteria, and **Verification**.
- `docs/prompts/studio-overhaul/29-D-teaching-features.md`: **4.4 Song sections** and **SD7**. 4.4 moved into this milestone (decision 16); its note is the spec for the section model, the document-field routine and the song boots.
- `docs/prompts/studio-overhaul/reference/soundtrap-editor-anatomy.md`: the measured Soundtrap reference behind decision 16. For this milestone read §3 (the lanes above the tracks), §12 and §13 (ST4). Screenshots: `~/Desktop/References/soundtrap-2026-10-16/` 21 and `anatomy/` a12–a15, a29. **Copy behaviour and placement, not Soundtrap's look:** our tokens, Glacial Indifference, the neutral accent and the 1366×655 budget win every conflict.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (2.7 and 3.3 entries), `findings.json`, `phase-map.json`.
- Already on `origin/aaron`: Stage A (1.0–1.17a), B1–B5 (2.1–2.9, 2.12). 1.2b (Production Lessons v2) waits until after the Stage B exit (decision 14).
- Status log of prompt runs: `docs/prompts/studio-overhaul/STATUS.md`.

## Binding rules

- One interface (no Simple/Advanced). Neutral look: white-pill primary (#fff bg, #101012 text, rounded-full), white/10 for active, **no teal, no brand yellow**, Glacial Indifference font, 12 px label floor (11 px only uppercase micro labels), 24×24 min targets. Colour only for musical meaning.
- Targets: school Chromebooks at **1366×655** and laptops at **1440×787**, mouse and keyboard.
- Never lose work. Every `data-tutorial-id` stays stable (alias map if a label changes); the 8 Production lessons must keep passing.
- New UI is built once in its final home (`src/daw/ui/**` primitives, `src/daw/shell/**` shell). Every new store key is classified in the 1.3 registry (`src/daw/persistence/projectDocument/fields.ts`; the coverage test enforces it). Persisted-format changes bump `SESSION_SCHEMA_VERSION` with a migration and fixtures; Y.Doc shape changes bump `COLLAB_DOC_SCHEMA_VERSION`.
- Match the surrounding code (naming, comment density, plain-sentence comments). No new npm dependencies without asking.

## Tools and verification

- Dev server: `VITE_DEV_AUTH_BYPASS=1 npx vite` (premium dev user; `VITE_DEV_AUTH_BYPASS_PLAN=free` for the free persona). The owner's own server runs on port **5179** — don't kill it; the harness starts its own on 5263 unless you pass `--reuse=http://localhost:<port>`.
- Harness `scripts/studio-perf/`: `npm run studio:check` (fast tier: reload round-trips, lessons, anchors, ratchet tests), `npm run studio:check:full` (adds perf, goldens, bundle). Flags must be `--flag=value`. Add `--fake-audio` if headless Chrome's audio clock doesn't move on this machine.
- **Always use the browser to test your work** (owner rule, 2026-10-16). Open the editor in Chrome with the Claude in Chrome tools, on the bypass dev server (port 5263, never the owner's 5179), and go through every flow the milestone changed as a student would: click, type, drag, play, reload, and take screenshots, and read the console for errors. Headless harness runs and unit tests come on top of this, never instead of it. Keep the exact-size checks (1366×655, 1440×787, 1280×720) in headless runs too, since the Chrome window may not shrink to them.
- A milestone is **verified** when: `npx yarn lint` passes (prettier, eslint --max-warnings 0, tsc -b); `npx vitest run` passes except the known pre-existing `src/curriculum/pages/__tests__/GenreLessonContainerV2.pianoDom.test.tsx` "Funk L1" snapshot; `studio:check` passes (and `studio:check:full` for perf/audio milestones); the reload ratchet (`scripts/studio-perf/knownLosses.json`) shows no new losses (update it with `--update-known` only when it improved); both lesson personas pass; and the changed flows were tested by hand in the browser, with what was tried recorded in `STATUS.md`.
- **This milestone adds a document field**, so it runs the full tier. It also runs the mixed-version collab check: the previous build on a second port plus `partykit dev` (recipe in plan.md **Verification** and the reload harness's `--prev-base`).

## Committing and pushing

- Commit in coherent commits (one per concern), messages in plain sentences saying what students notice, citing audit finding ids.
- **Never push to `main`, never open a pull request.** When the milestone is verified, push it to `aaron` (fast-forward; the pre-push hook lints the whole tree). If something can't be verified, commit locally, don't push, and say why.
- Finish by appending a short entry to `docs/prompts/studio-overhaul/STATUS.md`: milestone, commits, pushed or not, verification numbers, open issues, and decisions the owner must sign off. Then give the owner a short review summary.

---

## Goal (plan §2.13; decision 16, ST4; 29-D §4.4)

**Create's 32 px toolbar row folds away** (decision 16). Its controls move:

| Control                                    | New place                                |
| ------------------------------------------ | ---------------------------------------- |
| + Add track, V/B/C tools                   | the left header cell over the track list |
| Snap, Grid                                 | the ruler's right end                    |
| Zoom −/+, Fit, Follow                      | beside the horizontal scrollbar          |
| + Marker                                   | the ruler's menu and the palette         |
| Chord-lane labels, Colour Track \| Harmony | the Grid menu                            |

`add-track-button` and every other anchor keep their ids.

**The freed row becomes the sections lane (24 px):**

- **+ Section** sits at the lane's left end.
- **One section model** for the Timeline and the Lead Sheet (29-D §4.4, SD7 as recommended):
  - UNISON's vocabulary plus extras, and a custom name;
  - neutral blocks, 8 bars by default;
  - the full document-field routine: schema bumps, fixtures, the cloud document and the Y.Doc.
  - Song boots lay out their form.
- **In the lane:** a click seeks; dragging an edge resizes on bar lines.
- **Menu:** Rename · Change type · Duplicate with clips · Loop · Insert before/after · Delete (keeps the clips).

**The lane stack keeps a slot above the sections for 4.3's comment lane,** shown only while Comments is open. Nothing else of comments is built here.

**Lane header height:** sections 24 + ruler 32 + chord lane 24 = 80 px, down from 88.
