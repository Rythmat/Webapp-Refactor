# 2.8 + 2.9 — Stage B: rails, Inspector and editor dock v2

You are continuing the **Music Atlas Studio editor overhaul** (the DAW under `src/daw`, served at `/studio/editor`). This prompt is self-contained; read it fully before acting.

## Where and how to work

- Repo: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` (Vite 8 + React 18 + TypeScript, zustand, Tone.js, Yjs/PartyKit, Radix, vitest, playwright-core). One checkout only: do **not** create git worktrees.
- Branch: `aaron`. First run `git status` and `git branch --show-current`. The checkout can hold other sessions' uncommitted work: never discard, stash-pop or overwrite changes you didn't make. If you are not on `aaron` and the tree is dirty, stop and ask the owner before switching.
- Precondition: B3 is on `aaron`. Check it (`git log --oneline origin/aaron`, `docs/prompts/studio-overhaul/STATUS.md`). If it isn't met, stop and say which prompt must run first.
- **This milestone has a head start.** On 2026-10-16 the bottom rail and the side rail were built in the checkout, uncommitted: `src/daw/shell/bottombar/`, `src/daw/shell/inspector/`, plus edits to `StudioShell.tsx`, `TopBar.tsx` and `TrackArea.tsx`. Finish that work; never redo or discard it. If `STATUS.md` has no entry for it and another session may still be running it, ask the owner before touching those files.
- **Run only one of these prompts at a time** — they share this checkout.

## The plan (read first)

- `docs/prompts/studio-overhaul/reference/plan.md` (copy of the approved plan): read **Decisions (binding)** (especially **decision 16**), **Integration rules**, the Stage B target layout, your milestones' rows and notes (2.8, 2.9), the Stage B exit criteria, and **Verification**.
- `docs/prompts/studio-overhaul/reference/soundtrap-editor-anatomy.md`: the measured Soundtrap reference behind decision 16. For this milestone read §6 (editor drawer), §7 (side rail and panels), §8 (bottom rail) and §11–13. Screenshots are in `~/Desktop/References/soundtrap-2026-10-16/` (01–49) and its `anatomy/` folder (a01–a33). **Copy behaviour and placement, not Soundtrap's look:** our tokens, Glacial Indifference, the neutral accent and the 1366×655 budget win every conflict.
- Archived per-milestone designs and the audit: `git show studio/audit-archive:docs/studio-audit-2026-10/design.json` (find your milestone id), `findings.json` (finding ids cited below), `phase-map.json`.
- Already on `origin/aaron`: Stage A (1.0–1.17a; exit report `docs/studio-perf/stage-a-exit.md`) and B1–B3 (2.1–2.7). 1.2b (Production Lessons v2) waits until after the Stage B exit (decision 14).
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

## Goal (plan §2.8, §2.9; decision 16)

This is the biggest Stage B prompt. If it runs long, commit 2.8 first, then continue 2.9 in a second chat with this same prompt.

**2.8 Rails and Inspector:**

- Finish the rails already in the checkout.
  - The 48 px side rail drives one Inspector panel at a time: Insight · Library · Effects · Lessons · People · Chat, with room for Comments (4.3).
  - Panels push the canvas and the dock; they never overlay.
- **Bottom rail (44 px):** add Go to start, Rewind and Fast-forward buttons to the transport. Put a menu on the Click caret: click sound, its volume, and the count-in.
- **Effects library and dock chain as one state (anatomy §6–7, shots 40–46):**
  - Add effect arms the next slot and opens the Effects panel.
  - Each pick fills the armed slot and re-arms the next one; × cancels.
  - Each category carries a one-line purpose, in neutral colours.

**2.9 Editor dock v2:**

- **Tabs per track type, Effects last:**

  | Track type                  | Tabs                                   |
  | --------------------------- | -------------------------------------- |
  | Drums                       | Instrument · Grooves · Notes · Effects |
  | Melodic                     | Instrument · Prism · Notes · Effects   |
  | Audio and live-input tracks | their chain only, with no tab bar      |

  - Ids stay unchanged (`controls`/`grooves`/`prism`/`piano-roll`/`fx`).
  - The Parts tab's content moves to the Library panel in 2.14. Keep Parts reachable until then.

- **Selection drives the dock:**
  - A click on a clip opens its editor in the dock: Notes for MIDI, the drum grid for drums, the chain for audio.
  - The dock follows the selected track, keeping the tab that applies.
  - Notes is the single note editor. Maximize replaces PianoRollModal and the PopOutOverlay copies.
- **Master opens in the dock's slot:** gain, the master chain and an output peak meter. The Mix view stays for full mixing.
- **Height:**
  - It stays a share of the body (120 px–85%, snap points, remembered per tab), never a fixed px height.
  - At 1366×655, at least 4 track rows stay visible with the dock open.
