# Stage A exit report (2026-10-15)

Stage A of the Studio editor overhaul set out to stop the editor losing work, make it reload
correctly and take the lag out of playback and editing, without a visible redesign
(`docs/prompts/studio-overhaul/reference/plan.md`, retired 2026-10-21 and kept in git at `487930ff`). This report compares the baseline recorded
before any fix (2026-10-06, commit `f96b3ecc`, `baselines/2026-10-06/`) with the final run at the
end of milestone 1.17a, for every Stage A exit criterion in the plan.

**Result:** 22 of the 25 criteria are met. Three are not:

- long tasks during playback on the Chromebook profile;
- rAF loops while the editor is idle;
- a real collab join, which isn't tested end to end.

The causes of the first two are known and owned elsewhere (see "Not met").

## How it was measured

- **Final run:** `studio:check:full` on both profiles, 2026-10-15, commit `92688392` on `aaron`.
  - The editor was served from a `git archive` copy of that commit, so other sessions' file
    edits couldn't reload the harness's pages mid-run.
  - The 1.3 build `e10ac4db` was served on :5264 for the old-tab and revert round-trips (R14,
    R15).
  - The bundle suite builds the repository itself, at `89cc43c1`, one commit later. That commit
    only changes a lesson-page import (see Load).
  - Reports: `docs/studio-perf/runs/check/` (not committed; rerun to regenerate).
- **Profiles:**
  - chromebook: 1366×655 with a 4× CPU throttle (focus-mode window, decision 1);
  - laptop: 1440×787 at DPR 2;
  - lessons also run at 1280×720.
- **Machine:** a shared 14-core Mac whose 1-minute load average stayed at 4.5–6.3 during the
  perf scenarios, above the harness's 4.7 limit for a baseline. The baseline was taken under the
  same conditions (3.1–5.7).
  - Counts (store writes, commits, undo steps, losses) don't depend on load.
  - Times do: read them as upper bounds.
  - No real Chromebook has been used yet (decision 12).

## Summary

| Area        | Criterion                                                                    | Baseline (2026-10-06)                             | Final (2026-10-15)                                           | Met |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ | --- |
| Data safety | Registry fields kept on a refresh while playing (R1)                         | 65 fields lost                                    | 0 lost on both profiles                                      | yes |
|             | … on an in-app return (R2)                                                   | 20 lost                                           | 0                                                            | yes |
|             | … on a tab close (R7, incl. slow and stalled IndexedDB)                      | 64 lost                                           | 0                                                            | yes |
|             | … on a cloud save and reopen, legacy API (R3)                                | 73 lost                                           | 0                                                            | yes |
|             | … on a cloud save and reopen, document field (R3)                            | mode didn't exist                                 | 0                                                            | yes |
|             | New, template, demo, lesson, song, practice and jam boots leak nothing (R4)  | 39–45 fields leaked per boot                      | 0 across 11 boot kinds                                       | yes |
|             | Collab boots leak nothing                                                    | not measured                                      | join failure keeps the work (R19); no live room tested       | no¹ |
|             | Every replaced session is kept as a draft and reopens identically (R12)      | entry links wiped work                            | all 11 entry kinds kept once and reopened identically        | yes |
|             | An invalid link changes nothing (R5)                                         | 19–73 fields lost                                 | 0 lost, draft untouched, 11 link kinds × in-app/cold         | yes |
| Playback    | Main-store writes/s while playing (chromebook)                               | 28.3                                              | 0                                                            | yes |
|             | React commits/s in the shell, top bar, Timeline, track headers and dock      | 141 (Timeline, TransportBar, ChannelStrip)        | 0 (page total 0.15/s, outside those regions)                 | yes |
|             | Long tasks per 20 s (≤ 1)                                                    | 14 (1,553 ms)                                     | 14 (1,038 ms)                                                | no  |
|             | Frame p95 (≤ 20 ms)                                                          | 16.8 ms                                           | 16.8 ms                                                      | yes |
|             | No rAF loops while idle                                                      | 600 app rAF calls/s                               | 240/s, none of them the editor's                             | no  |
| Edits       | A drag gesture makes 1 store write, 1 undo step and 1 Yjs update             | fader 160 writes, note drag 92 writes per gesture | 1 write, 1 undo step (both drags, both profiles)             | yes |
|             | Timeline draw p95 ≤ 4 ms while scrolling 6 × 3-min audio clips (chromebook)  | not measurable (no draw marks)                    | 2.9 ms (laptop 0.9)                                          | yes |
|             | A Score note edit paints in ≤ 50 ms (laptop)                                 | not measurable                                    | p95 48 ms                                                    | yes |
| Safety      | No shortcut acts on an unseen view                                           | Score Delete removed a hidden clip; ⌥R recorded   | R26 flags at goal; dispatcher tests                          | yes |
|             | Generators and paste never delete outside their range                        | Prism Create and Clear deleted clips and chords   | unit tests (1.1, 1.16a)                                      | yes |
|             | Split and record-over keep their audio                                       | the take was dropped                              | unit tests (1.1, 1.10) and R23                               | yes |
|             | Leaving collab never deletes pre-existing work                               | "Leave without saving" deleted the project        | unit tests (1.1)                                             | yes |
| Load        | Boot chunk ≤ 150 kB gzip                                                     | 284.9 kB                                          | 94.6 kB                                                      | yes |
|             | The editor paints without waiting for songs content                          | ContentGate held the editor                       | no gate (1.12a)                                              | yes |
| Lessons     | The 8 lessons pass at 1366×655 as premium, failures only from the known list | 80/116 steps, 36 failing (all known)²             | 141/156 steps, 15 failing (all known), 24/24 complete²       | yes |
|             | Free students: the 4 Prism lessons show the upgrade, the other 4 complete    | free students hit the Prism lock in the lesson    | 4/4 gated (tile and link) at each size, the other 4 complete | yes |

¹ A collab join needs a PartyKit server, which the harness doesn't run (it closes every PartyKit
socket). What is tested: work is kept as a draft before a join (`R19-boot-errors:collabStub`), a
failed join restores it, and a bad collab link changes nothing (`R5-bad-link:collab`). A two-window
check against `partykit dev` is the owner's manual stage-exit walk-through (plan, Verification).

² Both personas. The baseline walked 1366×655 only; the final run walks 1366×655 and 1280×720,
so it has more steps. Every failing step in both runs is on the known list, which has gone from 27
entries to 7.

## Not met

### Long tasks during playback (chromebook)

There are still 14 long tasks in 20 s of playback (1,038 ms in all; baseline 14 / 1,553 ms). The
frame p95 is 16.8 ms, so they show up as occasional hitches rather than steady jank. The worst
frame is 66.7 ms (baseline 116.7). The laptop profile has none.

Milestone 1.7 profiled them. They come from Tone's scheduler tick, while instruments create audio
nodes for each note:

- the Oracle synth's UnisonEngine rebuilds its oscillators for every note;
- the drum machine makes a source for every hit;
- each of those goes through standardized-audio-context, whose `detectCycles` walks the
  downstream graph on every connect.

The React and store side is done: 0 writes and 0 shell commits while playing. What remains is
voice pooling and native nodes, which belong to the engine milestones 1.11 and 1.13 (Stage C).

### rAF loops while idle

An idle editor shows 240 `requestAnimationFrame` calls a second (baseline 600). None of them are
the editor's: its own frame loop (`engine/engineClock.ts`) runs no task while stopped, and an idle
lesson shows 0 commits per second.

The 240 are the frame tickers of `react-globe.gl`. Every page warms the Globe up from
`src/contexts/AppContext/AppContext.tsx:35`. In 1.7 the owner handed this to the Globe session,
and it is still there. Gating that warm-up off the editor route would meet the criterion.

## Details

### Data safety (reload round-trips)

- **202 scenarios ran, 101 per profile, all ok.** Each starts from the kitchen-sink project, where
  every field of the persistence matrix has a non-default value. Across all of them:
  - 0 fields lost and 0 unowned losses;
  - 0 page errors;
  - 0 regressions against `scripts/studio-perf/knownLosses.json`.
- **The ratchet now holds zero.** It allows no lost field in any scenario on either profile, and
  every flag in it is at its goal. At baseline it recorded 1,255 lost fields (1,404 keys) in its
  27 scenarios per profile.
- **Beyond the plan's list,** the run covers:
  - a crash in the middle of a write (R11);
  - two tabs (R13);
  - an old tab and a revert to the 1.3 build (R14, R15, real builds);
  - storage quota (R16);
  - offline, failed and slow saves (R17);
  - the Projects dialog (R18);
  - failed boots (R19);
  - the Song page (R20) and File ▸ New (R21);
  - a shared device and sign-out (R22);
  - recorded and sampled media (R23);
  - the save chip, the Undo/Redo buttons and the shortcut keys (R25, R26);
  - lesson and practice resume (R27).

### Playback, idle and views

| Measure (chromebook / laptop)         | Baseline               | Final                             |
| ------------------------------------- | ---------------------- | --------------------------------- |
| Store writes/s while playing          | 28.3 / 29.9            | 0 / 0                             |
| React commits/s while playing         | 140.6 / 149.2          | 0.15 / 0.15                       |
| Long tasks in 20 s of playback        | 14 (1,553 ms) / 0      | 14 (1,038 ms) / 0                 |
| Frame p50 / p95 / max while playing   | 16.7 / 16.8 / 116.7    | 16.7 / 16.8 / 66.7                |
| App rAF calls/s, idle                 | 600 / 600              | 240 / 240                         |
| React commits/s, idle                 | 0 / 0                  | 0.3 / 0.3                         |
| Playhead positions sampled (distinct) | 80 / 81 (in the store) | 81 / 81 (from the playhead clock) |

The idle commits (about one every 3 s) are outside every profiled region, the top rail's chip
slot included, so they don't count against the criterion. Their source hasn't been traced.

### Edits

| Measure                                      | Baseline (chromebook / laptop) | Final (chromebook / laptop)   |
| -------------------------------------------- | ------------------------------ | ----------------------------- |
| Fader drag: store writes per gesture         | 160 / 446                      | 1 / 1                         |
| Fader drag: undo steps per gesture           | –                              | 1 / 1                         |
| Fader drag: moves/s, frame p95               | 20 at 33.4 ms / 59 at 16.7 ms  | 60 at 16.7 ms / 60 at 16.7 ms |
| Note drag: store writes per gesture          | 92 / 402                       | 1 / 1                         |
| Note drag: long-task ms per move, frame p95  | 55.7 at 83.4 ms / 0            | 23.4 at 66.7 ms / 0           |
| Timeline draw p95 while scrolling            | –                              | 2.9 ms / 0.9 ms               |
| Timeline draw p95 while zooming (not judged) | –                              | 13 ms / 3.4 ms                |
| Timeline draws during a fader drag           | –                              | 0 / 0                         |
| Score note edit, input → paint p95           | –                              | 216 ms (not judged) / 48 ms   |

- **Yjs updates:** one per gesture. This is checked in `collab/__tests__/collabUndo.test.ts`
  against a real Y.Doc, since the harness runs no PartyKit room.
- **The Score edit is only just inside its target.** It is 48 ms on the laptop. On the Chromebook
  it is 216 ms, most of it the edit's own key handler and its store writes (one per touched clip
  and per changed mark list, score-06, partly fixed).

### Safety

- **Shortcuts:**
  - R26 checks that Delete in the Score keeps the clip, that ⌥R in the Lead Sheet doesn't record
    and that musical typing never toggles the transport.
  - `commands/__tests__/keyboardCommands.test.tsx` covers the dispatcher: text fields, dialogs and
    menus, the views that own a key, and browser zoom (1.6).
- **Generators and paste:**
  - `store/__tests__/prismCreateClear.test.ts` (Prism Create and Clear, 1.1);
  - `prismSuggestionCommit.test.ts` (suggestion commit, 1.16a);
  - `components/LeadSheet/__tests__/leadSheetClipboard*.test.ts` (Lead Sheet paste and clear,
    1.16a).
- **Split and record-over:**
  - `audio/__tests__/audioClipCuts.test.ts`, `overwriteAudioRegion.test.ts` and
    `clipWindowScheduling.test.ts`: halves share the asset and the buffer, at adjusted offsets
    (1.1);
  - the 1.10 asset store keeps a recording until nothing plays it;
  - R23 restores media across reloads.
- **Collab:** `collab/__tests__/sessionDraft.test.tsx` checks that leaving deletes only a draft
  the session itself made (1.1).

### Load

| Measure (production build, gzip)                         | Baseline | Final                       |
| -------------------------------------------------------- | -------- | --------------------------- |
| DawApp chunk (boot chunk; budget 150 kB)                 | 284.9 kB | 94.6 kB                     |
| The editor's boot closure                                | –        | 362.0 kB (552 before 1.12a) |
| Studio dashboard on top of the entry                     | –        | 23.2 kB (124 before 1.12a)  |
| Editor core (store, codec, registry, Yjs) on other pages | yes      | none (budget passes)        |

- **The "editor core off other pages" budget** was failing on `aaron` since `b61bbd77`, another
  session's commit:
  - The genre practice track's groove switch imported the backing swap at the top of a file
    every lesson page loads.
  - The swap writes the editor store, so the store landed in the every-page entry.
  - `89cc43c1` loads the swap where the switch runs it, and the budget passes again.
- **No ContentGate:** since 1.12a, a song link waits under the Opening overlay. A library that
  fails to load shows Retry, not "not found" (`session/__tests__/contentBoots.test.ts`).
- **Cold load on the dev server** (not a production estimate): the laptop shows Add Track at
  947 ms (baseline 910) and plays the demo's first sound 906 ms after Play (baseline 882).

### Lessons

- **Premium** (chromebook and 1280×720):
  - 141 of 156 steps pass and 24 of 24 lessons complete.
  - The 15 failing steps are all on the known list, which has shrunk from 27 entries to 7. They
    are in Mix and Polish and Movement and Dynamics.
- **Free:**
  - Each of the 4 Prism lessons wears the Premium chip on its tile and opens the upgrade prompt.
  - A `?tutorial=` link to one, loaded over saved work, starts nothing and keeps the work.
  - The other 4 lessons complete.

### Beyond the criteria

- **Golden renders:** all 10 cases are identical to the committed goldens at 44.1 and 48 kHz.
  Every export equals its render.
  - The audit found export failing on 48 kHz devices (audio-core-01); 1.2 fixed it.
  - GM tracks still render silent offline (known; they are checked live).
- **Timing traces** (48 kHz and the device rate):

  | Measure                      | Baseline                                 | Final           |
  | ---------------------------- | ---------------------------------------- | --------------- |
  | Metronome after pause/resume | 200–207 ms off, up to 8 beats lost a lap | 0 ms, none lost |
  | MIDI notes vs the grid       | 0 ms                                     | 0 ms            |
  | Audio clip starts            | 79–100 ms early                          | 69–100 ms early |
  | Count-in downbeat            | 37–49 ms late                            | 38–45 ms late   |

  - Audio clips starting early (audio-core-02) and the late count-in downbeat belong to 1.11's
    single scheduler (Stage C).
  - The plan's Stage A list has no timing criterion; the ±2 ms target applies when 1.11 lands.

- **Unit tier:** the only failure is `songLibrary/__tests__/studentPath.characterization`, four
  song-page header snapshots. They fail the same way on `c37f49f8`, before 1.17a, and aren't
  Studio code.

## Audit ledger

The ledger now records each finding's status after Stage A, with the commits that closed it:
`docs/prompts/studio-overhaul/reference/phase-map.json`, retired 2026-10-21 and kept in git at `487930ff`. The original ledger is on
`studio/audit-archive` (PR #188), which isn't merged.

The statuses come from the finding ids that the Stage A commits and the status log cite. Findings
that no commit cites were spot-checked in the code.

| Severity  | Fixed   | Partly fixed | Open    |
| --------- | ------- | ------------ | ------- |
| Critical  | 22      | 0            | 3       |
| High      | 93      | 6            | 41      |
| Medium    | 109     | 32           | 223     |
| Low       | 31      | 12           | 50      |
| **Total** | **255** | **50**       | **317** |

- **Critical, still open:** all three belong to Stage C engine milestones. They are
  synth-engine-01 and -02 (1.11) and live-input-01 (1.13).
- **High, still open:** almost all belong to Stage B or C milestones that haven't run: 1.11,
  1.12b/c, 1.13, 1.14, 1.16b, 2.x and 3.x.
- **Stage A's own milestones:**
  - 1.5, 1.10 and 1.15 have nothing open.
  - 1.1 has 51 of 52 fixed.
  - The partly fixed ones name what remains in their notes.
