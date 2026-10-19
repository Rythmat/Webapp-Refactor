# 2.10 + 2.11 — Stage B: Mix view, help, Stage B exit

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: B4–B8 (2.8, 2.9 and 2.12–2.15; prompts 15 and 15a–15d) are on `aaron`. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)** (especially **decision 16**), **Integration rules**, the Stage B target layout and pixel budget, your milestones' rows and notes (2.10, 2.11), the Stage B exit criteria, and **Verification**.
- `docs/prompts/studio-overhaul/reference/soundtrap-editor-anatomy.md` §11 ("Not worth copying") and §13 (ST15): the guards the exit audit checks.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (find your milestone id), `findings.json` (finding ids cited below), `phase-map.json`.
- Already on `origin/aaron`: Stage A (1.0–1.17a), B1–B8 (2.1–2.9, 2.12–2.15). 1.2b (Production Lessons v2) runs right after this prompt (decision 14).
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
- The Stage B exit runs the **full tier** at all three sizes.

## Committing and pushing

- Commit in coherent commits (one per concern), messages in plain sentences saying what students notice, citing audit finding ids.
- **Never push to `main`, never open a pull request.** When the milestone is verified, push it to `aaron` (fast-forward; the pre-push hook lints the whole tree). If something can't be verified, commit locally, don't push, and say why.
- Finish by appending a short entry to `docs/prompts/studio-overhaul/STATUS.md`: milestone, commits, pushed or not, verification numbers, open issues, and decisions the owner must sign off. Then give the owner a short review summary.

---

## Goal (plan §2.10, §2.11, Stage B exit criteria)

**2.10 Mix view:**

- Mixer-first strips, at least 240 px wide.
- A master column: fader, chain and spectrum. It reuses the parts of 2.9's dock Master, so both stay one implementation.
- A RackDock with one FxRack for track and return racks.

**2.11 Help:**

- The '?' sheet restyled from the 1.6 registry; it shares its data with 2.15's palette.
- The typing chip in the top bar.
- A one-line explanation under every setting row (the Mozart AI pattern).
- The hover hint line from the 2026-10-14 ideas.

**Stage B exit audit, at 1366×655, 1440×787 and 1280×720:**

- **Screenshots and region-budget tests.**
- **The design floor:** no text below the floor and no target under 24×24 inside `data-ds=v2`.
- **Every overlay opaque.**
- **Lessons:** all 8 pass at all three viewports.
- **Perf:** the Stage A numbers hold.
- **Decision 16's guards:**
  - the dock's height is a share of the body at every size;
  - at 1366×655, at least 4 track rows show with the dock open;
  - the lane header is no taller than 80 px;
  - no start tiles show under existing tracks;
  - no click is swallowed after a menu or dialog closes with Escape.
- **Colour sign-offs** from the owner: collaborator presence colours and key-colour confetti.
