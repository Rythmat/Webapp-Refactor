# Studio editor overhaul: one prompt per Claude Code chat

Each numbered file is a standalone prompt, except 29, which is the Stage D plan that prompts 30–37 build from. Paste one into a fresh Claude Code chat opened in `/Users/marfizo/Documents/Full App Code/Webapp-Refactor`. Every prompt repeats the shared rules (branch `aaron`, never `main`, no PRs, push only when verified), points at the plan, checks its own precondition, and ends by appending to `STATUS.md`.

**Run one at a time.** They all work in this single checkout, so two chats at once would edit the same files.

## Order

| #   | Prompt                                                        | Needs first                                                          |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 01  | Finish 1.4: drafts, openSession, save chip, Projects dialog   | nothing (1.4 is built; snapshot `6fccb1e7` on `aaron` is unverified) |
| 02  | 1.5 Cloud document field (+ API contract for Ryan)            | 01                                                                   |
| 03  | 1.6 Command registry and scoped keymaps                       | 01                                                                   |
| 04  | 1.7 Frame-rate state out of React                             | 01                                                                   |
| 05  | 1.8 Render cost, remainder                                    | 04                                                                   |
| 06  | 1.9 Edit transactions and undo                                | 01 (after 04 is better)                                              |
| 07  | 1.10 Time model and audio asset model                         | 01                                                                   |
| 08  | 1.12a Unblock and split the route                             | 01                                                                   |
| 09  | 1.15 Lesson and practice persistence                          | 01                                                                   |
| 10  | 1.16a Harmony core                                            | 01                                                                   |
| 11  | 1.17a Honesty remainder + **Stage A exit report**             | 02–10                                                                |
| 12  | B1: 2.1 tokens/guardrails + 2.3 overlays                      | 11                                                                   |
| 13  | B2: 2.4 shell frame + 2.5 top bar + focus mode                | 12                                                                   |
| 14  | B3: 2.6 track list + 2.7 Create canvas                        | 13                                                                   |
| 15  | B4: 2.8 Inspector + 2.9 editor dock                           | 14                                                                   |
| 16  | B5: 2.10 Mix view + 2.11 help + **Stage B exit**              | 15                                                                   |
| 17  | 1.2b Production Lessons v2                                    | 16                                                                   |
| 18  | C1: 1.11 PlaybackScheduler                                    | 16                                                                   |
| 19  | C2: 1.12b/c instrument lifecycle + asset diet                 | 18                                                                   |
| 20  | C3: 1.13a/b live input + synth patch schema                   | 18                                                                   |
| 21  | C4: 1.14 collab session                                       | 18                                                                   |
| 22  | C5: 1.16b analysis worker + 1.17b engine exit                 | 18–21                                                                |
| 23  | P1: 3.0 ledger, 3.1 editor core, 3.3 Timeline, 3.4 Notes      | 16                                                                   |
| 24  | P2: 3.2 harmony UX, 3.7 Prism/Grooves, 3.8 Insight/Browser    | 10, 23                                                               |
| 25  | P3: 3.5 instrument views, 3.6 effects rack, 3.11 Oracle synth | 18, 20                                                               |
| 26  | P4: 3.9 Score, 3.10 Lead Sheet                                | 23                                                                   |
| 27  | P5: 3.12 Practice, 3.13 Session tab, 3.14 export/settings     | 21                                                                   |
| 28  | P6: 3.15 accessibility + 3.16 program close-out               | everything                                                           |

Within Stage A, 02–10 can go in any order after 01 (except 05 after 04). Each prompt is roughly one long session; the big ones (01, 04, 12–16, 17, 18, 23) may need a second "continue" chat — paste the same prompt again and it picks up from `STATUS.md` and the branch.

### Stage D: teaching features (added 2026-10-14; prompts not written yet)

Stage D is decision 15 in the plan. Its plan is `29-D-teaching-features.md`, which covers the Soundtrap and Soundation review, decisions SD1–SD11 and milestones 4.0–4.7. Every Stage D prompt reads it first. The owner signs off SD1–SD11 before prompts 31–37 run. Prompt 30 is docs and a mock only, so it can run any time.

| #   | File                                   | Needs first                                     |
| --- | -------------------------------------- | ----------------------------------------------- |
| 29  | Stage D plan (not a prompt)            | —                                               |
| 30  | D0: 4.0 teaching API contract and mock | nothing (best before 12, for the API lead time) |
| 31  | D1: 4.1 read-only review               | 30, 13                                          |
| 32  | D2: 4.2 Studio assignments             | 30, 31, 12, Teacher Office P6                   |
| 33  | D3: 4.3 timeline comments              | 30, 31, 15                                      |
| 34  | D4: 4.4 song sections                  | 23 (built inside it or right after)             |
| 35  | D5: 4.5 chord keys                     | 10, 16                                          |
| 36  | D6: 4.6 change key, move clips         | 10, 13                                          |
| 37  | D7: 4.7 genre starters                 | 17, 14                                          |

## Reference

- `reference/plan.md` — the approved plan (decisions, integration rules, every milestone, exit criteria, verification). The live copy is `~/.claude/plans/encapsulated-noodling-blum.md`.
- `reference/lessons-v2.md` — the Production Lessons v2 design (prompt 17).
- `reference/1.4-spec.json`, `reference/1.4-critique.json`, `reference/1.4-integration-findings.md` — for prompt 01.
- The full audit: `git show studio/audit-archive:docs/studio-audit-2026-10/<file>` (`design.json`, `findings.json`, `phase-map.json`, `register.md`, `synthesis.md`, `research.md`).
