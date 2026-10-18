# Stage B exit report (2026-10-18)

Stage B of the Studio editor overhaul rebuilt the editor's layout and design system: tokens and
overlays (B1), the shell and the top bar (B2), the track list and the Create canvas (B3), the
rails, the Inspector and the dock (B4a, B4), then decision 16's Soundtrap layout: clips (B5),
lanes and sections (B6), the browser (B7), commands and output (B8), and the Mix view and help
(B9, prompt 16). This report checks every Stage B exit criterion in the plan
(`docs/prompts/studio-overhaul/reference/plan.md`, "Stage B exit criteria"), and that the Stage A
numbers hold (`stage-a-exit.md`).

**Result:** every criterion the harness can measure is met, with two exceptions inherited from
earlier milestones: the "editor core off other pages" bundle budget (failing since B1's merge of
`main`) and a note drag's second store write (a UI key since B4). The rest needs the owner: a
real Chromebook, a teacher spot-check, the owner's walk-through with a live collab join, the
colour sign-offs and the deploys. They are listed as **pending**, not met.

## How it was measured

- **Final run:** the `studio:check` full tier, run in parallel (`par-check.sh`: the unit list,
  the round trips in 6 shards, the lessons per profile, goldens and bundle at once; then the
  old-build round trips, perf and the golden trace alone) on 2026-10-18.
  - The editor was a `git archive` of `aaron` at the B9 commits, served on its own port with HMR
    off, so other sessions' edits couldn't reload the harness's pages.
  - The 1.3 build `e10ac4db` on :5264 served the old-tab and revert round trips (R14, R15).
  - A scenario that failed beside five other browsers was re-run alone before it was judged.
- **Profiles:** chromebook 1366×655 with a 4× CPU throttle; laptop 1440×787 at DPR 2; small
  1280×720. Since B9 the full tier walks the lessons on all three.
- **Machine:** the shared 14-core Mac, busy (1-minute load 2.2–5.1). Counts don't depend on load;
  read times as upper bounds. No real Chromebook was used (decision 12).

## Summary

| Area             | Criterion                                                                   | Measured by                                                         | Result (2026-10-18)                                                        | Met         |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| Budgets          | Both target screens pass the screenshot and region-budget tests             | R36 `regionBudget`, `screens`; R29; R35                             | all regions on budget at 1366×655, 1440×787, 1280×720; 24 screenshots      | yes         |
| Design floor     | No text under the floor, no target under 24×24 inside `data-ds=v2`          | R36 `pageFloors`, `overlayFloors`; R28–R35 floor flags; designGuard | none at any size                                                           | yes         |
| Overlays         | Every overlay renders opaque                                                | R36 `overlaysOpaque` (32 overlays and the coach card), dialogs.test | alpha 1, no backdrop blur, at all three sizes                              | yes         |
| Lessons          | The lessons pass at all three viewports, failures only from the known list  | lessons.mjs, chromebook, small, laptop; both personas               | 74/78, 74/78, 76/78; only Indie's known steps; 12/12 complete; 4/4 gated   | yes         |
| Perf             | The Stage A numbers hold                                                    | perf.mjs both profiles against `stage-a-exit.md`                    | all hold but a note drag's second write (UI key, inherited from B4); below | yes, but 1  |
| Guard a          | The dock's height is a share of the body at every size                      | R36 `dockShare` (7 slots, before and after a resize), R29, R35      | round(body × share) ± 2 for every slot; the Mix rack too, within its cap   | yes         |
| Guard b          | At 1366×655, at least 4 track rows show with the dock open                  | R36 `fourRows`, R30 `rowBudget`                                     | 4 whole rows open (Instrument tab), 6 shut                                 | yes¹        |
| Guard c          | The lane header is no taller than 80 px                                     | R36 `laneHeader`, R30, R32                                          | 80 px at every size                                                        | yes         |
| Guard d          | No start tiles under existing tracks                                        | R36 `noTilesUnderTracks`                                            | none with tracks; 4 tiles with none, and back after deleting the last      | yes         |
| Guard e          | No click is swallowed after a menu or dialog closes with Escape             | R36 `noSwallowedClick` (every menu and dialog; Loop and a clip)     | the first click lands, 30 ms after Escape, at every size                   | yes²        |
| ST15             | No fixed drawer, no wide column, no colour-coded effect categories          | R36 `noFixedDrawer`, `noWideColumn`, `neutralFxCategories`          | held                                                                       | yes         |
| Data safety      | 0 fields lost across the round trips                                        | roundtrip.mjs both profiles; R14/R15 against the 1.3 build          | 0 lost; R28–R36 "no baseline, 0 new"                                       | yes         |
| Device           | The Chromebook checklist on a real device at the stage exit                 | owner                                                               | no device has been used in Stage A or B                                    | **pending** |
| Teacher          | A teacher spot-check before the stage ships (decision 12)                   | owner                                                               | not done                                                                   | **pending** |
| Walk-through     | The owner's manual pass, including a live two-window collab join            | owner                                                               | not done (local PartyKit checks only, B5, B6, B8)                          | **pending** |
| Colours          | Collaborator presence colours and key-colour confetti signed off            | owner                                                               | proposal below                                                             | **pending** |
| Deploys          | Web app, then `npm run collab:deploy`; the music-atlas-api `document` field | owner                                                               | none recorded                                                              | **pending** |
| Bundle (Stage A) | Editor core off other pages                                                 | bundle.mjs                                                          | fails since B1 (inherited from the `main` merge)                           | **no**      |

¹ The guard holds with the dock on its default share (0.36). With Notes or Prism open, at their
own default of 0.40 (B4, plan 2.9), 3 whole rows show at 1366×655. The plan's two numbers
disagree; see the owner questions.

² R36 found the opposite before B9's review fix: Audio & MIDI, the add-track picker, Projects,
Invite, Leave session, the chord analysis and the account menu swallowed a click within about
150 ms of Escape, because Radix keeps the page from taking clicks while a modal fades out
(B5's Invite note). Menus, popovers and dialogs now fade in only and close at once.

## Perf against Stage A

| Measure (chromebook / laptop)                    | Stage A final      | Stage B exit                               | Holds                |
| ------------------------------------------------ | ------------------ | ------------------------------------------ | -------------------- |
| Store writes/s while playing                     | 0 / 0              | 0 / 0                                      | yes                  |
| React commits/s while playing (page)             | 0.15 / 0.15        | 0.15 / 0.15                                | yes                  |
| Long tasks in 20 s of playback                   | 14 (1,038 ms) / 0  | 14 (917 ms) / 0                            | yes (still not met³) |
| Frame p50 / p95 / max while playing              | 16.7 / 16.8 / 66.7 | 16.7 / 16.8 / 66.7                         | yes                  |
| App rAF calls/s, idle                            | 240 / 240          | 240 / 240                                  | yes (still not met³) |
| React commits/s, idle                            | 0.3 / 0.3          | 0.3 / 0.3                                  | yes                  |
| Fader drag: store writes, undo steps per gesture | 1 / 1              | 1 / 1                                      | yes                  |
| Note drag: store writes, undo steps per gesture  | 1, 1               | 2, 1                                       | **no**⁴              |
| Timeline draw p95 while scrolling                | 2.9 / 0.9 ms       | 2.9 / 0.8 ms                               | yes                  |
| Score note edit, input → paint p95 (laptop)      | 48 ms              | 48 ms                                      | yes                  |
| Golden renders, 44.1 and 48 kHz                  | 10/10 identical    | 10/10 identical                            | yes                  |
| Timing trace                                     | all checks pass    | 15/15                                      | yes                  |
| Boot chunk (budget 150 kB gzip)                  | 94.6 kB            | 120.8 kB                                   | yes                  |
| Editor's boot closure                            | 362.0 kB           | 363.7 kB                                   | yes                  |
| Editor core on other pages                       | none               | store, registry, save status on every page | **no**⁵              |

³ Not met at Stage A either, and owned elsewhere: per-note audio nodes (1.11, 1.13) and the
Globe's warm-up on every page.

⁴ A note drag in the docked piano roll writes `dockNoteSelection` (a session UI key, never saved
or undone) besides the notes: one undo step, two store writes. It has been so since B4 (2.9's
Analyze notes); B7 and B8's runs show the same. A one-write fix belongs to the dock's piano roll
(Stage C, 3.4).

⁵ Since B1's merge of `main` (`99e77232` / `be0c35ab`): `store/index.ts`,
`persistence/projectDocument/fields.ts` and `persistence/saveStatusStore.ts` load on every page.
Stage A fixed the same kind of leak in `89cc43c1`. Every Stage B entry recorded it as
inherited; it is still to fix.

## Decision 16, across Stage B

Measured at 1366×655 / 1440×787 / 1280×720 (R29, R30, R35, R36):

- **Regions:** top bar 44, bottom rail 44, side rail 48, track list 200, lane header 80, footer
  24, Inspector 240–420 (300 by default, pinned from 1440).
- **Timeline width:** 1118 / 818 px with the Inspector shut / open at 1366; 1192 / 892 at 1440;
  1032 / 732 at 1280.
- **Dock and rack:** 204 / 252 / 228 px at their default share. The Mix view's rack never
  grows past the body less 300 px, so the strips keep a fader.
- **Mix:** 96 px strips fill the height (owner decision, 2026-10-18); 10 whole strips at 1366 with
  the Inspector shut, 8 at 1440 with it open; fader travel 310 / 446 / 375 px with the rack shut,
  139 / 223 / 180 with it open.

## Colours for the owner

Neither has been signed off (plan, "my defaults"; B1 deferred them to this review):

- **Collaborator presence** (`collab/types.ts` `PRESENCE_COLORS`): blue `#3b82f6`, red
  `#ef4444`, green `#22c55e`, amber `#f59e0b`, purple `#a855f7`, pink `#ec4899`, cyan `#06b6d4`,
  orange `#f97316`. Red is record and delete's colour, amber the warnings', and cyan is close to
  the retired teal. A collaborator's colour also changes on every rejoin (`clientID % 8`, F4).
  - **Proposal:** six hues that avoid red, amber and teal (blue, violet, pink, green, orange,
    slate), picked from the user id so a student keeps theirs.
- **Lesson confetti** (`components/Tutorial/Confetti.tsx`): cyan, violet, pink, `#facc15` (close
  to the brand yellow the owner removed from the UI), green, orange. These are not key colours.
  - **Proposal:** the finished song's key colours (the 1.16a palette), which ties the reward to
    the music; reduced motion already skips it.

## Owner questions from B9's review

1. **Rows with Notes or Prism open:** at their default 0.40 share, 3 whole track rows show at
   1366×655; the guard's 4 rows hold with Instrument or Effects (0.36). Either drop Notes and
   Prism to 0.36, or accept 3 rows for the two editors.
2. **The coach card over the rack's close button:** during the R&B lesson's mastering step on
   a Chromebook, the card (to the side of its target) covers the RackDock's close chevron and the
   Effects rows below Compressor. The control the step asks for stays clear. 1.2b redoes the coach
   card's docking (decision 14).

## Audit ledger

`docs/prompts/studio-overhaul/reference/phase-map.json` now records each finding's status after
Stage B, with the commits that closed it.

| Severity  | Fixed (Stage A) | Fixed (Stage B) | Partly fixed | Open    |
| --------- | --------------- | --------------- | ------------ | ------- |
| Critical  | 22              | 22              | 0            | 3       |
| High      | 93              | 95              | 6            | 39      |
| Medium    | 109             | 144             | 35           | 185     |
| Low       | 31              | 39              | 12           | 42      |
| **Total** | **255**         | **300**         | **53**       | **269** |

- The statuses come from the finding ids that the Stage B commits and the status log cite,
  checked in the code where a commit only touched part of one.
- B9 closed fx-mixer-04, ia-flows-12, fx-mixer-14, ia-flows-35, design-system-15 and fx-mixer-12
  (the Mix view), shell-33 and score-31 (help).
- design-system-12 (JS hover and width animations) stays open: the shell has none left, but the
  legacy regions do.

The three open criticals are Stage C engine work (synth-engine-01 and -02, 1.11; live-input-01,
1.13).
