# Atlas Globe baseline

The Globe page (`/atlas/globe`) as it stood before the Globe UI modernization
work, measured on 12 Oct 2026 by `scripts/measureGlobe.mjs`. Every later
prompt in the plan compares against these numbers. The raw data, every run
and every chunk, is in [baseline.json](baseline.json).

## Setup

|         |                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------- |
| Date    | 12 Oct 2026                                                                                     |
| Commit  | `e4a4d7b8` on `aaron`, plus the measuring hook this baseline added                              |
| Machine | Apple M3 Max Mac, 14 cores, 36 GB, macOS (darwin arm64)                                         |
| Browser | Chrome 153 (headless, `--headless=new`) through playwright-core 1.63                            |
| GPU     | ANGLE Metal on the M3 Max, 1440×900 window, device pixel ratio 2 (the globe caps itself at 1.5) |
| Server  | Vite 8 dev server on port 5266 with `VITE_DEV_AUTH_BYPASS=1`                                    |
| Runs    | one uncounted warm-up load, then 3 runs; each figure is the median                              |
| CPU     | full speed for first frame, spin and heap; slowed **4×** for the card, drag and search steps    |

**Read these numbers as a regression baseline for this machine, not as what
students see.** A dev server runs React in development mode with unminified
modules, and an M3 Max is far faster than a school Chromebook.

The 4× slowdown is there because at full speed this Mac logs no long tasks
at all, so the baseline could not show a later change improving anything.
It is the same rate as the studio-perf Chromebook profile.

## Browser measures

| Measure                                       | Baseline                                                                                 | How it is measured                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| First globe frame                             | **1,140 ms**                                                                             | navigation start → first animation frame after BaseGlobe's `atlas:globe-ready` mark (react-globe.gl initialised); globe ready at 1,019 ms |
| Frame rate, Spin on                           | **60 fps** (gap p95 16.8 ms, max 16.8 ms)                                                | `requestAnimationFrame` over 10 s after a 1 s ramp, full CPU speed                                                                        |
| JS heap at 30 s                               | **92.4 MB** after GC (138.8 MB before)                                                   | CDP `JSHeapUsedSize`; the before-GC figure varies a lot between runs (118 to 384 MB)                                                      |
| City click → card visible (4× CPU)            | **483 ms**                                                                               | click event on New Orleans' hex → first frame after the card's heading is in the page; about 110 ms at full speed in a trial run          |
| Opening the card (4× CPU)                     | **21 long tasks, 1,957 ms** in all, longest 132 ms; 5 React commits, **3 globe renders** | the 2 s after the click (includes the camera flight)                                                                                      |
| Dragging the card's resize handle (4× CPU)    | **11 long tasks, 632 ms**, longest 81 ms; **12.4 fps**; 20 commits, **16 globe renders** | 2 s of dragging 160 px out and back, with the city's first event expanded; the card goes from 480 to about 630 px wide                    |
| Typing "louis armstrong" into search (4× CPU) | **8 long tasks, 439 ms**, longest 61 ms; 19 commits, 0 globe renders                     | first key → 0.5 s after the last, 90 ms between keys                                                                                      |

How these are counted:

- **Long tasks** come from `PerformanceObserver('longtask')`, which reports
  main-thread tasks over 50 ms.
- **Commits and globe renders** come from a minimal React DevTools hook that
  the script installs. React reports every commit to it, and a commit counts
  as a globe render when BaseGlobe's fiber is new and did work in it.

During the drag, the playwright mouse manages only about 10 moves in the
2 s on a slowed page, because each move waits for the page to take the
event. The drag still re-renders the globe 16 times, because DetailsCard
dispatches its width on each resize and BaseGlobe tweens its offset through
React state. The plan's first target, 0 globe renders while dragging, is
measured against `dragGlobeRenders`.

## Bundle

From a production build (`vite build --manifest`, with the visualizer's
module data). Sizes are minified bytes, and gzip is level 9. `kB` means
1,000 bytes.

| What                                                                      | Chunks | Raw        | Gzip       |
| ------------------------------------------------------------------------- | ------ | ---------- | ---------- |
| Atlas route chunk (`assets/atlas-*.js`)                                   | 1      | 70.8 kB    | 22.9 kB    |
| Route, static (atlas chunk + its static imports not already in the entry) | 31     | 1,086.1 kB | 299.1 kB   |
| First render (react-globe.gl, imported dynamically by BaseGlobe)          | 4      | 1,225.0 kB | 359.4 kB   |
| Entry (index.html's module script and its 188 modulepreloads), JS         | 189    | 3,058.1 kB | 885.6 kB   |
| Everything the page loads, JS and CSS                                     | 224    | 5,612.9 kB | 1,587.2 kB |
| On demand: the mind map (`?mindmap=1`)                                    | 5      | 22.3 kB    | 8.9 kB     |

The largest chunks the Globe adds on top of the entry:

| Chunk                   | Loaded                 | Raw        | Gzip     | Holds                                                                 |
| ----------------------- | ---------------------- | ---------- | -------- | --------------------------------------------------------------------- |
| `react-globe.gl-*.js`   | first render (dynamic) | 1,204.4 kB | 350.9 kB | react-globe.gl, globe.gl, three-globe, **three.webgpu.js**, h3-js, d3 |
| `three.module-*.js`     | route (static)         | 574.9 kB   | 144.3 kB | **three.js** (three.module.js + three.core.js)                        |
| `eventConnections-*.js` | route (static)         | 127.7 kB   | 25.3 kB  | data/eventConnections.ts                                              |
| `hooks-*.js`            | route (static)         | 113.8 kB   | 40.0 kB  | atlas hooks + data/stateBoundaries.ts (181 kB before minifying)       |
| `cities-*.js`           | route (static)         | 99.0 kB    | 28.1 kB  | data/cities.ts                                                        |
| `atlas-*.js`            | route (static)         | 70.8 kB    | 22.9 kB  | the page's components                                                 |
| `artistRegistry-*.js`   | route (static)         | 37.5 kB    | 12.0 kB  | data/artistRegistry.ts                                                |

The country and state outlines come from jsDelivr at run time (about 839 kB
and 2.3 MB of GeoJSON, cached in Cache Storage). They are not in these
figures.

### What the bundle shows

- **three.js ships twice.** The route imports `three` statically (BaseGlobe,
  `globeVisuals.ts` and `useGlobeLighting.ts` use `MeshLambertMaterial` and
  friends), which pulls the WebGL build (575 kB) into the route. react-globe.gl's
  chunk then carries `three.webgpu.js` as well, which three-globe imports
  (1,077 kB before minifying). Getting this to one copy is the biggest single
  byte saving on the page. It belongs with prompt 7, or prompt 8 if the engine
  changes.
- **h3-js** (340 kB before minifying) comes with three-globe's hex-bin layer.
  The city columns use it.
- **The data the plan expected in "the route chunk" is in shared chunks.**
  It sits in `eventConnections`, `cities`, `hooks` (state boundaries) and
  `artistRegistry`, not in `atlas-*.js`, which is only 71 kB of components.
  Prompt 7's target ("route chunk at least 30% below baseline") should be
  read against the **static route total** (1,086 kB), not the atlas chunk.
- **three.js and react-globe.gl are not in any entry chunk or modulepreload.**
  verifyProdBundle now enforces this.
- The entry preloads 188 chunks (886 kB gzip of JS) before any route runs,
  including GenreLessonContainerV2 and the guitar data. That is app-wide and
  outside this plan, but it is most of what a cold load of the Globe pays.

## Budgets

`scripts/verifyProdBundle.mjs` now checks three things:

- **Lazy-only.** three.js (marker `THREE.WebGLRenderer`) and react-globe.gl
  (marker `scene-container`) must not appear in an entry chunk or a chunk
  `index.html` preloads, and each marker must still exist somewhere in the
  build. Cortex's renderer already had this rule.
- **Size.** `assets/atlas-*.js` may be at most 5% over **70,808** bytes. The
  static route total may be at most 5% over **1,086,089** bytes. Both numbers
  are in `GLOBE_BUDGET` in the script. When a change shrinks the page on
  purpose, lower them to the new sizes. When a change grows it on purpose,
  raise them in the same commit and record why here.
- **No measuring hook in production.** `__atlasGlobeDebug`, the dev-only hook
  the measuring script uses, must fold out of production builds.

## What this baseline added to the page

These additions don't change what the page looks like or does:

- `performance.mark('atlas:globe-ready')` in BaseGlobe's `onGlobeReady`. It
  ships, costs nothing and works in production builds too.
- `window.__atlasGlobeDebug` with `screenOf(lat, lng, altitude)` and
  `pointOfView(pov, ms)`, which the script uses to aim the camera and click
  a real city hex. It is installed behind a literal `import.meta.env.DEV`
  guard, so it folds out of production builds, and verifyProdBundle checks
  that it does.

## Re-running

```sh
# Full run: 3 browser runs + a production build (about 5 minutes).
node scripts/measureGlobe.mjs

# Only one part.
node scripts/measureGlobe.mjs --skip-bundle
node scripts/measureGlobe.mjs --skip-browser

# Against a dev server you already run (it must have VITE_DEV_AUTH_BYPASS=1).
node scripts/measureGlobe.mjs --base=http://localhost:5270

# Replace this baseline (commit baseline.json, then update the tables above
# and GLOBE_BUDGET in verifyProdBundle.mjs).
node scripts/measureGlobe.mjs --baseline
```

Other flags:

- `--runs=N` sets how many runs to take.
- `--cpu=1` turns the slowdown off.
- `--gpu=swiftshader` renders on the CPU for machines without a usable GPU.
  Its frame rates only compare with other SwiftShader runs.
- `--headed` opens a visible window.
- `--port` and `--out` set the dev server port and the output file.

A run writes `docs/globe-ui/runs/latest.json`, which git ignores, and prints
each median beside this baseline's. Port 5179, the owner's dev server, is
refused. Compare on the same machine with nothing heavy running; the
before-GC heap and the long-task totals move by 10 to 20% between runs.
