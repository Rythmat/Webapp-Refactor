# Studio editor perf baseline

2026-10-07T01:08:08.330Z · commit f96b3ecc (dirty) · http://localhost:5263 · Chrome 153.0.8010.12 · GPU metal

**The machine was busy during this run (see Machine load), so its
timings are inflated and are not a baseline.**

Written by scripts/studio-perf/perf.mjs; this run only. Times in ms;
load times are from navigation start. Profiles: chromebook 1366×655 4×
CPU throttle (10 Mbps / 40 ms on loads), laptop 1440×787 DPR 2, small
1280×720. A cell that reads "a (b–c)" is the median of the repeats and
their range. Region counts come from the DevProfiler wrappers in
DawApp; TransportBar also counts its own commits under the same id, and
Timeline and DawAppInner count only their own (no render time).

## Idle (stopped, 10 s)

| profile    | s   | frame p50 / p95 / max (ms) | long tasks (n / total) | LoAF (n / blocking) | app rAF/s | React commits/s | store writes/s | top store keys (/s) | region commits/s |
| ---------- | --- | -------------------------- | ---------------------- | ------------------- | --------- | --------------- | -------------- | ------------------- | ---------------- |
| chromebook | 10  | 16.7 / 16.7 / 16.8         | 0 / 0 ms               | 0 / 0 ms            | 599.92    | 0               | 0              | –                   | –                |
| laptop     | 10  | 16.7 / 16.7 / 16.8         | 0 / 0 ms               | 0 / 0 ms            | 599.92    | 0               | 0              | –                   | –                |

Stage A exit target (chromebook): no rAF loops while idle.

## Playback (20 s, demo-midnight-groove, 4-bar loop on)

| profile    | s     | frame p50 / p95 / max (ms) | long tasks (n / total) | LoAF (n / blocking) | app rAF/s | React commits/s | store writes/s | top store keys (/s) | region commits/s                                                                                                            | master peak | audible share | playhead (distinct / wraps) |
| ---------- | ----- | -------------------------- | ---------------------- | ------------------- | --------- | --------------- | -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | --------------------------- |
| chromebook | 20.01 | 16.7 / 16.8 / 116.7        | 14 / 1553 ms           | 13 / 844 ms         | 619.04    | 140.64          | 28.29          | position 28.29      | TimelineWithHeaders 140.64 (78.49 ms/s) · TransportBar 28.29 (5.17 ms/s) · ChannelStrip 28.29 (94.59 ms/s) · Timeline 28.29 | 0.5295      | 1             | 80 / 1                      |
| laptop     | 20    | 16.7 / 16.8 / 33.4         | 0 / 0 ms               | 3 / 0 ms            | 656.54    | 149.16          | 29.89          | position 29.89      | TimelineWithHeaders 149.16 (32.55 ms/s) · TransportBar 29.89 (3.43 ms/s) · ChannelStrip 29.89 (40.44 ms/s) · Timeline 29.89 | 0.7534      | 1             | 81 / 2                      |

Stage A exit targets (chromebook): 0 store writes/s; 0 commits/s in DawAppInner, top bar, Timeline, track headers and dock; ≤1 long task per 20 s; p95 frame ≤20 ms. The playhead column counts the distinct store positions in the 250 ms samples and the loop wraps among them.

## View switches (1st switch, then 3 later rounds)

| profile    | switch to | first frame, 1st switch (ms) | first frame, later (ms) | settled, 1st switch (ms) | settled, later (ms) | React commits, 1st switch | long tasks, 1st switch (n / total / max ms) | long-task ms, later | region commits, 1st switch (render ms)                                                                                               |
| ---------- | --------- | ---------------------------- | ----------------------- | ------------------------ | ------------------- | ------------------------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| chromebook | score     | 96.4                         | 154 (151–164.4)         | 423.6                    | 182.7 (181.9–184.7) | 6                         | 2 / 255 / 182                               | 98 (97–104)         | ScoreView 5 (54 ms) · TransportBar 2 (6 ms) · DawAppInner 1                                                                          |
| chromebook | leadsheet | 53.1                         | 40.7 (38.7–40.7)        | 71.3                     | 54.3 (53.8–54.9)    | 3                         | 0 / 0 / 0                                   | 0                   | LeadSheetView 2 (24 ms) · TransportBar 1 (0 ms) · DawAppInner 1                                                                      |
| chromebook | studio    | 69                           | 54 (54–56.6)            | 90.4                     | 73.4 (72.1–74.6)    | 7                         | 1 / 55 / 55                                 | 0                   | StudioView 8 (37 ms) · TransportBar 1 (0 ms) · LibraryPanel 1 · DawAppInner 1                                                        |
| chromebook | arrange   | 124.8                        | 112.8 (112.2–118.3)     | 150.7                    | 137.7 (136.3–219.8) | 9                         | 1 / 102 / 102                               | 91 (91–98)          | TimelineWithHeaders 9 (26 ms) · Timeline 6 · TransportBar 3 (7 ms) · ChannelStrip 2 (13 ms) · LibraryPanel 1 (10 ms) · DawAppInner 1 |
| laptop     | score     | 36.6                         | 60.1 (44.6–65.4)        | 64.5                     | 75.1 (52.8–105.2)   | 3                         | 0 / 0 / 0                                   | 0                   | TransportBar 3 (4 ms) · ScoreView 2 (13 ms) · DawAppInner 1                                                                          |
| laptop     | leadsheet | 25.9                         | 18.6 (16.4–19.2)        | 39.5                     | 41.1 (38.3–43.9)    | 3                         | 0 / 0 / 0                                   | 0                   | LeadSheetView 2 (14 ms) · TransportBar 1 (0 ms) · DawAppInner 1                                                                      |
| laptop     | studio    | 32.5                         | 23.9 (20.4–25.5)        | 43                       | 36.2 (36.1–42.5)    | 6                         | 0 / 0 / 0                                   | 0                   | StudioView 8 (18 ms) · TransportBar 1 (0 ms) · LibraryPanel 1 · DawAppInner 1                                                        |
| laptop     | arrange   | 46.6                         | 43.1 (40.9–51.2)        | 55.3                     | 70.1 (58.2–76.8)    | 8                         | 0 / 0 / 0                                   | 0                   | TimelineWithHeaders 8 (11 ms) · Timeline 4 · TransportBar 2 (3 ms) · ChannelStrip 2 (5 ms) · LibraryPanel 1 (4 ms) · DawAppInner 1   |

A 1st switch mounts the view for the first time in the session; "later" is the median and range of the later rounds. arrange is the view the editor opened on, so its 1st switch is a return.

### Practice track first render (3 cold opens of ?practiceMode=dorian&practiceRoot=d)

| profile    | opens measured | module mark (ms)       | mounted mark (ms)      | practice screen (ms)   | mounted → screen (ms) | long tasks to then (n) | long-task ms to then |
| ---------- | -------------- | ---------------------- | ---------------------- | ---------------------- | --------------------- | ---------------------- | -------------------- |
| chromebook | 3 of 3         | 1830.5 (1824.8–1834.5) | 2317.6 (2308.6–2358.7) | 2719.3 (2716.2–2728.8) | 410.7 (357.5–411.2)   | 6                      | 1010 (996–1019)      |
| laptop     | 3 of 3         | 835.4 (819.2–894)      | 895.9 (884.5–962)      | 1005.5 (988.4–1075.7)  | 109.6 (103.9–113.7)   | 2                      | 137 (133–144)        |

## Fader drag (first track volume, 3 gestures of 4 s)

| profile    | target | gestures | moves/s          | store writes/s      | React commits/s     | store writes / move | store writes / gesture | React commits / move | long-task ms / move | frame p95 (ms)   | long tasks, all gestures (n / ms) | store keys / move                 | region commits / move                                                                                                   |
| ---------- | ------ | -------- | ---------------- | ------------------- | ------------------- | ------------------- | ---------------------- | -------------------- | ------------------- | ---------------- | --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| chromebook | Keys   | 3        | 20.1 (19.9–20.2) | 39.2 (38.6–39.2)    | 58.8 (57.9–58.8)    | 1.98                | 160 (158–160)          | 2.96                 | 0 (0–1)             | 33.4             | 1 / 78                            | tracks 0.99 · liveAudioPeaks 0.99 | TimelineWithHeaders 2.73 · TransportBar 2.47 · Timeline 1.98 · LibraryPanel 0.99 · ChannelStrip 0.99 · DawAppInner 0.99 |
| laptop     | Keys   | 3        | 59.4 (59–59.4)   | 109.6 (108.3–110.1) | 156.7 (142.1–164.5) | 1.87 (1.86–1.88)    | 446 (442–448)          | 2.7 (2.43–2.82)      | 0 (0–0.2)           | 16.7 (16.7–16.8) | 1 / 52                            | tracks 0.94 · liveAudioPeaks 0.94 | TimelineWithHeaders 2.65 · TransportBar 2.35 · Timeline 1.87 · LibraryPanel 0.94 · ChannelStrip 0.94 · DawAppInner 0.94 |

Stage A target: one store write, one undo entry and one Yjs update per gesture. Compare per-move numbers across profiles: a slower page takes fewer moves, so its per-second rates drop.

## Note drag (docked Piano Roll, 3 gestures of 4 s)

| profile    | target  | gestures | moves/s          | store writes/s   | React commits/s     | store writes / move | store writes / gesture | React commits / move | long-task ms / move | frame p95 (ms)   | long tasks, all gestures (n / ms) | store keys / move           | region commits / move                                                                                         |
| ---------- | ------- | -------- | ---------------- | ---------------- | ------------------- | ------------------- | ---------------------- | -------------------- | ------------------- | ---------------- | --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| chromebook | Lead C5 | 3        | 11.5 (11.2–11.5) | 22.1 (21.6–22.1) | 61.4 (61.1–67.1)    | 2                   | 92 (90–92)             | 5.64 (5.54–6.09)     | 55.7 (54.7–57.8)    | 83.4             | 81 / 7678                         | tracks 1 · liveAudioPeaks 1 | TimelineWithHeaders 5.74 · TransportBar 2.5 · Timeline 2 · ChannelStrip 1.02 · LibraryPanel 1 · DawAppInner 1 |
| laptop     | Lead C5 | 3        | 50.1 (49.8–50.3) | 97.6 (97.6–98.5) | 221.9 (220.6–222.9) | 2                   | 402 (400–404)          | 4.52 (4.52–4.55)     | 0                   | 16.7 (16.7–16.8) | 0 / 0                             | tracks 1 · liveAudioPeaks 1 | TimelineWithHeaders 4.53 · TransportBar 2.5 · Timeline 2 · ChannelStrip 1 · LibraryPanel 1 · DawAppInner 1    |

The longest note of a melodic clip at bar 1 (the dock draws later clips in the wrong place today), dragged with the Select tool; every gesture starts from the clip as it was.

## Cold load and first sound

| profile    | load                 | DawApp request | module mark | mounted mark | Add Track shown | Play clicked | engine-ready mark | Play → first sound        | first sound | MB before Play      | MB before first sound | requests before first sound | MB by run end        |
| ---------- | -------------------- | -------------- | ----------- | ------------ | --------------- | ------------ | ----------------- | ------------------------- | ----------- | ------------------- | --------------------- | --------------------------- | -------------------- |
| chromebook | demo-sunset-keys     | 54230.1        | 66010.7     | 66260.5      | 66386.6         | 66687.4      | 66986.3           | 2976                      | 69663.4     | 77.99 / 0.13 / 0.86 | 77.99 / 2.93 / 1.44   | 2165 / 22 / 52              | 77.99 / 2.98 / 1.44  |
| chromebook | template project-pop | 51793.1        | 64709       | 65038.1      | 65247.4         | 65492.7      | 66311.8           | none in 19.5 s (expected) | –           | 76.18 / 0.13 / 0.86 | 77.99 / 20.25 / 0.86  | 2165 / 22 / 22              | 77.99 / 20.25 / 0.86 |
| laptop     | demo-sunset-keys     | 657.5          | 816         | 874.9        | 910.4           | 1029.8       | 1105.9            | 882                       | 1911.8      | 77.99 / 0.13 / 0.86 | 78.76 / 51.53 / 1.44  | 2166 / 24 / 51              | 78.76 / 51.53 / 1.44 |
| laptop     | template project-pop | 668.2          | 828.7       | 902.2        | 945.9           | 1015.5       | 1193.5            | none in 10.2 s (expected) | –           | 77.99 / 0.13 / 0.86 | 77.99 / 20.25 / 0.86  | 2165 / 22 / 21              | 77.99 / 20.25 / 0.86 |

Times are ms from navigation start; Play is clicked as soon as Add
Track shows. MB and request columns read dev-server code / app assets
(e.g. /daw-assets/ samples) / third-party hosts. The dev server sends
unbundled modules with inline source maps, far heavier than production
chunks (see bundle.mjs), so these loads are a regression baseline for
the dev path, not a production estimate. project-pop has empty tracks
and no metronome, so silence is expected there: its run ends once its
downloads finish, at least 10 s after Play.
Stage A targets: boot chunk ≤150 KB gzip; the editor paints without
waiting for songs content; Play is never silent (1.12b).

## Problems

- idle on chromebook: the machine was busy (1-minute load average 5.66, limit 4.7), so these timings are not a baseline
- playback on chromebook: the machine was busy (1-minute load average 5.66, limit 4.7), so these timings are not a baseline
- note-drag on chromebook: the machine was busy (1-minute load average 4.73, limit 4.7), so these timings are not a baseline
- load on chromebook: the machine was busy (1-minute load average 4.73, limit 4.7), so these timings are not a baseline
- playback on laptop: the machine was busy (1-minute load average 4.81, limit 4.7), so these timings are not a baseline
- views on laptop: the machine was busy (1-minute load average 4.81, limit 4.7), so these timings are not a baseline

## Page errors

None.

## Machine load

**Busy: the 1-minute load average reached 3.13–5.66 on 14 cores (busy above 4.7).** Timings are likely inflated; re-run on a quiet machine before comparing them with a baseline. The cores were 17–26% busy during the scenarios, this run's browser included. Page CPU check (a fixed JS loop timed in each scenario's page, ms): chromebook 99.9 (99.4–100.7) · laptop 25.1 (24.8–25.2). Under one profile it should not change between runs; when it is slower, so is everything else. This run writes a baseline, so a load average above 4.7 or a slowed-down page fails it.
