# Studio editor baseline, 2026-10-06 (before any Stage A fix)

Recorded with `npm run studio:baseline` on the overhaul branch at commit `f96b3ecc`, which is
`main` plus the Production tab and the perf harness. No product behaviour had been changed yet.
`summary.md` gathers every suite's report; each folder holds that suite's full JSON. Milestone 1.0
of the plan (`docs/studio-audit-2026-10/plan.md`) is measured against these numbers.

## Caveats

- **Timings were taken on a busy machine.** The owner's own apps kept the 1-minute load average at
  4–5.7 on 14 cores, above the perf suite's limit of 4.7. So `perf` exits 1, and six of its twelve
  scenario runs are labelled "not a baseline".
  - **What's affected:** time-based numbers only, such as long-task ms and frame p95.
  - **What isn't:** counts (store writes, React commits, rAF calls, writes per gesture).
  - **Fix:** re-record perf on a quiet machine and on the real Chromebook.
- **Cold-load timings are dev-server numbers.** Vite serves about 78 MB of unbundled modules.
  Production size comes from `bundle/`; production load time will be measured against a built
  preview in milestone 1.12a.
- **Golden traces are relative.** Headless Chrome's audio clock differs from a real device's.

## Headline numbers

| What                                                | Chromebook profile (1366×655, 4× CPU) | Laptop (1440×787) | Stage A target                                   |
| --------------------------------------------------- | ------------------------------------- | ----------------- | ------------------------------------------------ |
| App `requestAnimationFrame` calls/s while idle      | 600                                   | 600               | no loops while idle                              |
| Store writes/s during playback (all `position`)     | 28                                    | 30                | 0                                                |
| React commits/s during playback                     | 141                                   | 149               | 0 in the shell, top bar, Timeline, headers, dock |
| Long tasks in 20 s of playback                      | 14 (1,553 ms)                         | 0                 | ≤ 1                                              |
| Store writes per fader gesture (4 s)                | 160                                   | 446               | 1                                                |
| Long-task ms per note-drag move (docked piano roll) | 56                                    | 0                 | —                                                |
| DawApp chunk (production build)                     | 1,126 KB raw / 285 KB gzip            |                   | ≤ 150 KB gzip boot chunk                         |

## What the other suites recorded

- **Reload round-trips** (`roundtrip/`), out of the kitchen-sink fixture's fields:
  - refresh while playing loses 65;
  - SPA return loses 20;
  - cloud save then reopen loses 73;
  - closing the tab loses 64;
  - every boot link leaks 39–45 non-default fields from the previous project.
  - **Bad links:** a bad lesson link keeps the session (the Production-tab fix), but bad demo,
    template and song links still wipe it. Milestone 1.1 validates every link before clearing.
  - `scripts/studio-perf/knownLosses.json` ratchets all of this: a new loss fails the run, and a
    fixed loss is reported.
- **Golden renders and traces** (`golden/`, `golden-trace/`):
  - audio clips start about 97 ms ahead of the beat grid;
  - after pause/resume the metronome is about 200 ms off and misses beats on loop laps;
  - the count-in downbeat is 37 ms late;
  - the Oracle synth's offline render does not repeat (synth-engine-01);
  - GM/SoundFont tracks render silent offline.
- **Lessons** (`lessons/`): all 8 lessons were walked as premium and free students at 1366×655.
  Two premium steps fail because their spotlight target is scrolled out of view in the FX list
  (`fx-add-saturator` in EDM, `fx-add-ducker` in House). Free students stop at the Prism lock in
  the 4 Prism lessons, which milestone 1.2 turns into an upfront Premium badge. Known failures are
  listed in `scripts/studio-perf/lessonDrivers.mjs`. Screenshots stay out of git; rerun the suite
  to regenerate them.
- **Unit ratchets:** 234 tests pass and 65 are marked expected-to-fail, each naming its audit
  finding. They flip as Stage A fixes land.
