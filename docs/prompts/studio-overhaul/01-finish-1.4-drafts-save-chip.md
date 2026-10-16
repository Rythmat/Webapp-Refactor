# 1.4 — Finish milestone 1.4: drafts, openSession, save chip, Projects dialog

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: 1.0–1.3 are on `origin/aaron`; 1.4 was fully built (13 tracks) and partly integrated, then pushed UNVERIFIED as snapshot `6fccb1e7` on `aaron` before a usage limit stopped it. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)**, **Integration rules**, your milestone's row and note, the stage's exit criteria, and **Verification**.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (find your milestone id), `findings.json` (finding ids cited below), `phase-map.json`.
- Already on `origin/aaron`: milestones 1.0 (perf harness), 1.1 (stop losing work), 1.2 (lag/timing/honesty/Premium), 1.3 (project registry + codec v3), plus 2.2's `src/daw/ui` primitives, part of 1.17a (dead controls) and part of 1.8 (peak pyramid, piano-roll viewport canvases, opt-in incremental Score). 1.2b (Production Lessons v2) is deferred until after Stage B.
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

## Committing and pushing

- Commit in coherent commits (one per concern), messages in plain sentences saying what students notice, citing audit finding ids.
- **Never push to `main`, never open a pull request.** When the milestone is verified, push it to `aaron` (fast-forward; the pre-push hook lints the whole tree). If something can't be verified, commit locally, don't push, and say why.
- Finish by appending a short entry to `docs/prompts/studio-overhaul/STATUS.md`: milestone, commits, pushed or not, verification numbers, open issues, and decisions the owner must sign off. Then give the owner a short review summary.

---

## Goal

Finish integrating and verifying 1.4, then push it verified to `aaron`.

## What 1.4 is (plan §1.4, owner decision 6)

IndexedDB drafts namespaced by user (holding pending media bytes); one `navigator.locks` lock per tab; a new user-namespaced sync mirror with a one-time legacy-key migration; version-driven autosave; one `openSession(intent)` state machine for every boot path (plus the Song page and File ▸ New/Open; New has no confirm); an Opening overlay and error panel; `saveProject()` (serialized) and a save chip (Saved / Saving… / Unsaved / Saved on this device / Couldn't save – Retry / Audio not saved yet); Undo/Redo buttons; a Projects dialog for drafts and cloud projects; Practice gets a slim header with the chip.

## Read

- `docs/prompts/studio-overhaul/reference/1.4-spec.json` (the build spec: contracts, 13 tracks, owner defaults) and `1.4-critique.json` (28 issues; the 7 high ones were fixed in the build — verify).
- `docs/prompts/studio-overhaul/reference/1.4-integration-findings.md`: the triage of every track's integrator notes. Groups S (store/components) and H (harness) were applied; **group P (persistence) was not**, and neither the finisher nor any browser verifier ran.

## Do

1. Apply the remaining group-P items from the findings, starting with the HIGH one: an audio take whose stop resolves after the editor unmounts is never written to the draft (`src/daw/persistence/drafts/autosave.ts` stop()/memoryAhead(); failing test `src/daw/hooks/__tests__/useMidiRecording.test.tsx` "holds an audio take that lands after the editor closed"). Then the medium ones (quota-full reload must not open the older IndexedDB body while the mirror is ahead and must show an error; legacy 1.3 backups must not count as "couldn't be opened"; the take-upload toast must not show raw API errors; the R12 `LOSS_OWNERS` entry in roundtrip.mjs) and the cheap low ones. Re-check every item against the code first.
2. Lint + full vitest; fix everything except the Funk L1 snapshot.
3. Browser verification: the reload suite on both profiles including the new 1.4 scenarios (crash restore, two tabs + lock, an old tab writing the legacy key, revert, quota full, offline save, Projects dialog reopen, each boot path through openSession, the Song page entry) — expected: `tracks[].audioClips[].bufferLoaded` now fixed; remaining losses only owned by 1.5 and 1.15; both lesson personas; rollback to the 1.3 build (`e10ac4db`) and back must never destroy work; two tabs: the second forks a copy with a toast; save chip and Projects dialog screenshots at both sizes.
4. Fix, re-verify, commit, push to `aaron`, STATUS entry.

## Owner sign-offs to list in your summary

The 1.4 owner defaults in the spec (chip in the app TopRail for Stage A; second tab forks a copy; legacy keys imported, never deleted, until Stage A exit + 30 days; takes in never-saved projects stay on device until first Save, except in collab rooms; media budget 256 MiB/user; sign-out policy), plus 1.3's pending ones in STATUS.md.
