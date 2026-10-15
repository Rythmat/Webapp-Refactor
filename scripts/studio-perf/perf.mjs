/* eslint-env node */
/**
 * Perf and load scenarios for the Studio editor (/studio/editor): the
 * milestone 1.0 baseline of what the editor costs today, before Stage A's
 * fixes. It records numbers and never fails on a slow one. A run exits 1
 * only when a scenario could not measure what it claims (listed under each
 * scenario below), or when a baseline run finds the machine busy.
 *
 *   node scripts/studio-perf/perf.mjs --reuse=http://localhost:5263
 *        [--scenario=idle,playback,views,fader-drag,note-drag,load,autosave,
 *          timeline-scroll,score-edit]
 *        [--profile=chromebook|laptop|small|all] [--out=dir] [--repeat=3]
 *        [--audio-timeout=60000] [--loop=false] [--max-load=n] [--quick]
 *
 * (`npm run studio:perf -- --reuse=…` runs the same.) By default every
 * scenario runs on the chromebook profile (1366×655, 4× CPU throttle);
 * --profile also takes a comma list (check.mjs passes chromebook,laptop).
 * The harness flags (--port, --gpu, --headed) work too. `--quick` shortens
 * every window and measures each repeated thing once, for a smoke run, so
 * its numbers are not baseline numbers. Before any scenario the run checks
 * that an AudioContext's clock advances on a blank page: on some machines
 * headless Chrome's real output never renders, so nothing plays and every
 * timing that waits on audio is skewed, and the run fails at once, naming
 * --fake-audio (Chrome's fake output). Each run's meta and the summary
 * header say which output it used (audio: device or fake); a fake-audio run
 * is not a baseline, and a baseline run refuses the flag. Each scenario
 * also checks the editor's own clock after the engine starts.
 *
 * Every scenario except load opens ?demo=demo-midnight-groove (the 1.8
 * scenarios ?template=project-pop, whose tracks they replace) in a fresh
 * browser context, starts the audio engine with a key press (as a person's
 * first gesture would) and waits until no request has been in flight for
 * 1.5 s, so instrument loading is not counted as editor work; a page still
 * loading after 30 s fails the scenario. It then times a fixed JS loop in
 * the page (the "page CPU check"), which under one profile should take the
 * same time on every run: when it does not, the machine slowed the page
 * down. Before every measured window the page must also have gone a while
 * without a long task (1 s after setup and between gestures, 1.5 s between
 * view switches; at most 10–15 s), so one window's leftover work, such as
 * the undo snapshot 300 ms after an edit, does not land in the next. The
 * in-page probes (probes.mjs) record frame times, long tasks, long animation
 * frames (LoAF), the app's requestAnimationFrame calls, React commits, store
 * writes by key and DawApp's per-region commit counts.
 *
 * - idle: 10 s with the transport stopped. Fails if it was playing.
 * - playback: play() through the store, 1 s lead-in, 20 s recorded. The demo
 *   is 4 bars and the transport does not stop at its end, so the 4-bar loop
 *   is on (--loop=false turns it off) to keep music playing. Every 250 ms it
 *   reads the master peak and the live playhead (window.__MA_PLAYHEAD__,
 *   the store's position on a build without it); after the window it
 *   pauses and reads the playhead again, since once 1.7 moves the playhead
 *   out of the store, the store learns the position only on pause, stop and
 *   seek. Fails when the transport stopped, the master analysers could not
 *   be read, the output was silent, or the playhead never moved.
 * - views: setCurrentView to score, leadsheet, studio (the Mix view,
 *   labelled "Master") and back to arrange, 1 + --repeat rounds. Per switch:
 *   the first frame painted after it (a message posted from the next rAF),
 *   the frame after the first idle period (requestIdleCallback), React
 *   commits, long tasks and LoAF. A view's first switch mounts it for the
 *   first time, so it is reported apart from the later ones (median and
 *   range). Then --repeat fresh opens of ?practiceMode=dorian&practiceRoot=d,
 *   timed from navigation start to the first frame that shows the practice
 *   screen. Fails when a view's DevProfiler region never committed or the
 *   practice screen never showed.
 * - fader-drag: --repeat gestures of 4 s on the first track header's volume
 *   slider, each from the same volume. Fails unless every gesture changed the
 *   volume of the track that header names, as seen by a store subscription
 *   during the gesture.
 * - note-drag: --repeat gestures of 4 s on one note of a melodic clip in the
 *   docked Piano Roll (Select tool), each from the clip as it was. The grab
 *   point is read once the roll's scroll position has held for 3 frames, and
 *   nothing may cover it. Fails unless every gesture moved that note at some
 *   point (the circling pointer often ends where it began, so the note's
 *   final place proves nothing). Skipped, with the reason, when no note can
 *   be grabbed for the first gesture: the dock's DOM is due to change in 2.9.
 * - load: cold loads (a fresh context, the profile's network) of
 *   ?demo=demo-sunset-keys and ?template=project-pop. From navigation start:
 *   the DawApp module request, the ma:daw:* marks (module, mounted,
 *   engine-ready) and the Add Track button on screen. Then a click on Play
 *   as soon as that button shows, the time to the first non-zero master
 *   analyser reading, and the bytes received (CDP Network events; worker
 *   requests are not seen), split into the dev server's modules, the app's
 *   own assets (samples under /daw-assets/) and each third-party host. The
 *   dev server sends unbundled modules with inline source maps, so these
 *   loads time the dev path; bundle.mjs measures the production chunks. The
 *   demo must make sound within --audio-timeout. The template's tracks are
 *   empty and its metronome is off, so it should stay silent: its run waits
 *   10 s after Play and then only until its downloads finish. Fails when a
 *   load failed, the DawApp request or the module/mounted marks are missing,
 *   or the demo stayed silent.
 * - autosave (milestone 1.4, R24): the draft autosave while the demo plays
 *   (4-bar loop) and the first track's fader is dragged for the playback
 *   window (20 s), then 10 s idle. From the editor's DEV marks
 *   ma:draft:write:start/end: how many draft writes ran (target
 *   ≤ ceil(window / maxWait) + 1, the debounce's 1 s and maxWait's 5 s),
 *   each write's main-thread time (budget 5 ms at p95, judged only when
 *   the editor marks it: the snapshot's ma:draft:snapshot:start/end plus
 *   ma:draft:write:start to ma:draft:write:issued, the synchronous part of
 *   the IndexedDB write; without those marks it is reported unmeasured),
 *   each write's commit span (start to commit, mostly waiting on the disk;
 *   reported, never judged), long tasks overlapping a write (target 0),
 *   mirror writes while the tab is visible (target 0: the mirror is for
 *   hidden, pagehide and freeze only), the TopRail slot's React commits
 *   (its DevProfiler region EditorTopRailSlot, when DawApp has one)
 *   against its chip and Undo/Redo flips (target: no more commits than
 *   flips + 1), with its DOM-changing frames as a secondary check. Idle: 0
 *   writes once the last change is committed, and the dragged fader's
 *   final volume is the one the draft body holds (finalValueCommitted).
 *   Fails when the window saw no draft write at all, the transport stopped,
 *   or the fader never changed the volume.
 * - timeline-scroll (milestone 1.8): Timeline draw cost over long audio.
 *   It opens ?template=project-pop instead and replaces its tracks with 6
 *   audio tracks, each one 3-minute stereo clip at 48 kHz from bar 1,
 *   backed by an AudioBuffer made in the page and set in the app's
 *   AudioBufferStore (imported by its dev-server URL; each clip has an
 *   asset id, so the draft autosave does not store the audio). It waits
 *   until one draw shows all 6 waveforms (the peaks worker summarises each
 *   take), then records --quick 1.5 s / 4 s each of horizontal wheel
 *   scrolling and Ctrl+wheel zoom over the canvas (60 events a second),
 *   and a first-track fader drag (the drag window) back at the opening
 *   view. Per window: the Timeline's DEV ma:timeline:draw measures (count,
 *   p50 / p95 / max; "unmeasured" on a build without them), frame times,
 *   long tasks and React commits. Stage A targets: draw p95 ≤4 ms while
 *   scrolling; 0 Timeline draws during the fader drag. Fails when the
 *   Timeline did not draw every waveform (or drew "Loading…": it does not
 *   see the buffers), the wheel never scrolled or zoomed it, or the drag
 *   never changed the volume.
 * - score-edit (milestone 1.8): a Score note edit's input to paint. Also on
 *   ?template=project-pop: 6 Oracle-synth MIDI tracks of 32 bars of 4/4,
 *   every bar filled with mixed rhythms (735 notes), then
 *   setCurrentView('score') and a wait until the engraving's DOM has held
 *   still for 1 s. A click on the first uncovered notehead selects it;
 *   then 10 (--quick 3) edits, ArrowUp and ArrowDown in turn (score.up /
 *   score.down), each after a calm spell. Per edit: Event Timing's keydown
 *   entry (duration = input to next paint, input delay, processing), a
 *   rAF fallback (keydown timeStamp to the second rAF after the Score's
 *   SVG changed), long tasks and React commits. Target (laptop): paint
 *   ≤50 ms at p95. Fails when an edit did not move the note (the store's
 *   pitches), the page never saw the key, or the Score never changed.
 *
 * Drags are reported per move and per gesture as well as per second: every
 * pointer move waits for the page to take it, so a slow page gets fewer
 * moves and lower rates while each move costs it as much. A gesture's window
 * runs from the press to one frame after the release. Probes add a little
 * of their own: the view-switch timing makes two rAF calls per switch and a
 * drag one more (counted as app rAF calls), and playback's 250 ms meter
 * reads the analysers into buffers it allocates once.
 *
 * Output (docs/studio-perf/runs/perf/ unless --out): <scenario>-<profile>.json
 * for every run, and summary.md with one table per scenario of this run,
 * formatted by Prettier so a baseline committed by check.mjs passes
 * `prettier . --check`. Checks share the machine and the dev server with
 * whatever else runs, so every run records the 1-minute load average and
 * how busy the cores were, and the summary flags a load average above a
 * third of the cores, and any scenario whose page CPU check took over 1.5×
 * the run's fastest at the same CPU throttle: such timings are not a
 * baseline. A run whose --out is under docs/studio-perf/baselines/ (npm run
 * studio:baseline) fails on either; --max-load=n arms the same failures,
 * with that load limit, for any run.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import {
  AUDIO_CLOCK_STOPPED,
  PROFILES,
  ROOT,
  audioClock,
  audioMode,
  newPage,
  openEditor,
  profilesFrom,
  requireAudioClock,
  startAudio,
  withStudio,
  writeJson,
} from './harness.mjs';
import { startRecording, stopRecording } from './probes.mjs';

export const SCENARIOS = [
  'idle',
  'playback',
  'views',
  'fader-drag',
  'note-drag',
  'load',
  'autosave',
  'timeline-scroll',
  'score-edit',
];

const DEMO = '?demo=demo-midnight-groove';
/** timeline-scroll and score-edit replace this template's empty tracks. */
const TEMPLATE = '?template=project-pop';

/** timeline-scroll's audio: six 3-minute stereo stems at 48 kHz. */
const STEMS = { count: 6, seconds: 180, sampleRate: 48_000 };

/** score-edit's score: six parts of 32 bars of 4/4. */
const SCORE = { parts: 6, bars: 32 };

/**
 * The app's AudioBufferStore as the dev server serves it: the module
 * instance the editor imports, so a buffer set through it is the editor's.
 */
const BUFFER_STORE_MODULE = '/src/daw/audio/AudioBufferStore.ts';

/** The DEV measure the Timeline emits per canvas draw (milestone 1.8). */
const TIMELINE_DRAW = 'ma:timeline:draw';

/** Stage A: a Timeline draw at p95 while scrolling the stems. */
const DRAW_P95_TARGET_MS = 4;

/** A Score note edit's input to paint (laptop). */
const SCORE_PAINT_TARGET_MS = 50;
const PRACTICE = '?practiceMode=dorian&practiceRoot=d';

/**
 * The cold loads. A demo has to make sound after Play; the template's tracks
 * are empty and its metronome is off, so silence is right for it.
 */
const LOAD_TARGETS = [
  {
    target: 'demo-sunset-keys',
    query: '?demo=demo-sunset-keys',
    expectSound: true,
  },
  {
    target: 'template project-pop',
    query: '?template=project-pop',
    expectSound: false,
  },
];

/** The view switches, in order, and the DevProfiler region each one shows. */
const VIEW_SWITCHES = [
  { view: 'score', region: 'ScoreView' },
  { view: 'leadsheet', region: 'LeadSheetView' },
  { view: 'studio', region: 'StudioView' },
  { view: 'arrange', region: 'TimelineWithHeaders' },
];

/** A master peak at or above −60 dBFS counts as audible. */
const AUDIBLE_PEAK = 0.001;

/** Page loads through the dev server can be slow under the network throttle. */
const LOAD_TIMEOUT = 300_000;

/** Where check.mjs --baseline writes: a run there needs a quiet machine. */
const BASELINES = join(ROOT, 'docs/studio-perf/baselines');

/**
 * How much slower than the fastest at the same CPU throttle in the same run
 * a page CPU check may be before that scenario counts as slowed down. The
 * checks vary by a few percent on a quiet machine; on a saturated one they
 * took up to 8× as long.
 */
const SLOW_PAGE_RATIO = 1.5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round = (value, digits = 1) =>
  typeof value === 'number' ? Number(value.toFixed(digits)) : null;
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** How long each window lasts; `--quick` shortens them for a smoke run. */
function windowsFrom(args) {
  const quick = args.quick === 'true';
  const repeat = Number(args.repeat ?? (quick ? 1 : 3));
  if (!Number.isInteger(repeat) || repeat < 1) {
    throw new Error(
      `--repeat takes a whole number from 1, not "${args.repeat}"`,
    );
  }
  return {
    quick,
    repeat,
    idleMs: quick ? 3000 : 10_000,
    playbackLeadMs: 1000,
    playbackMs: quick ? 5000 : 20_000,
    dragMs: quick ? 1000 : 4000,
    gestureGapMs: quick ? 400 : 1000,
    viewGapMs: quick ? 500 : 1500,
    audioTimeoutMs: Number(args['audio-timeout'] ?? (quick ? 20_000 : 60_000)),
    silenceMs: quick ? 5000 : 10_000,
    scrollMs: quick ? 1500 : 4000,
    edits: quick ? 3 : 10,
  };
}

function scenariosFrom(args) {
  const asked = args.scenario ?? 'all';
  const names = asked === 'all' ? SCENARIOS : asked.split(',');
  for (const name of names) {
    if (!SCENARIOS.includes(name))
      throw new Error(`unknown scenario "${name}"`);
  }
  return names;
}

function gitState() {
  try {
    const git = (...gitArgs) =>
      execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim();
    return {
      commit: git('rev-parse', '--short', 'HEAD'),
      dirty: git('status', '--porcelain').length > 0,
    };
  } catch {
    return { commit: null, dirty: null };
  }
}

/* ── Machine load ──────────────────────────────────────────────────────── */

/**
 * When the machine counts as busy, and the limit a run fails above: a third
 * of the cores, for a baseline (an --out under docs/studio-perf/baselines/),
 * or --max-load. A load average of half the cores already doubled the
 * chromebook profile's drag and view-switch times.
 */
function loadLimits(args, outDir) {
  const cores = cpus().length;
  const busyAbove = round(cores / 3, 1);
  const fromBaselines = relative(BASELINES, outDir);
  const baseline =
    fromBaselines !== '' &&
    !fromBaselines.startsWith('..') &&
    !isAbsolute(fromBaselines);
  let maxLoad = baseline ? busyAbove : null;
  if (args['max-load'] !== undefined) {
    maxLoad = Number(args['max-load']);
    if (!(maxLoad > 0)) {
      throw new Error(
        `--max-load takes a positive number, not "${args['max-load']}"`,
      );
    }
  }
  return { cores, busyAbove, baseline, maxLoad };
}

/** The 1-minute load average and the cores' time counters, right now. */
function machineNow() {
  let idle = 0;
  let total = 0;
  for (const { times } of cpus()) {
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { load: loadavg()[0], idle, total };
}

/** How busy the machine was between two machineNow() samples. */
function machineBetween(start, end) {
  const total = end.total - start.total;
  return {
    cores: cpus().length,
    load1mStart: round(start.load, 2),
    load1mEnd: round(end.load, 2),
    // The share of all cores' time spent busy, this run's browser included.
    cpuBusy: total > 0 ? round(1 - (end.idle - start.idle) / total, 2) : null,
  };
}

/* ── Statistics ────────────────────────────────────────────────────────── */

/** Median, range and count of the numbers in `values` (others skipped). */
function spread(values) {
  const list = values.filter(isNumber).sort((a, b) => a - b);
  if (!list.length) return null;
  const middle = Math.floor(list.length / 2);
  const median =
    list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  return { median, min: list[0], max: list.at(-1), n: list.length };
}

/* ── Page helpers ──────────────────────────────────────────────────────── */

/** Counts the page's requests in flight, for waitForQuiet. */
function trackRequests(page) {
  const state = { inFlight: 0, lastChange: Date.now() };
  const change = (delta) => () => {
    state.inFlight += delta;
    state.lastChange = Date.now();
  };
  page.on('request', change(1));
  page.on('requestfinished', change(-1));
  page.on('requestfailed', change(-1));
  return state;
}

/**
 * Waits until no request has been in flight for `quietMs`: instruments fetch
 * and decode their samples after the engine starts, and that work would
 * otherwise land in the measured window. `isOver()` ends the wait early.
 */
async function waitForQuiet(
  requests,
  { quietMs = 1500, timeout = 30_000, isOver = () => false } = {},
) {
  const started = Date.now();
  while (Date.now() - started < timeout && !isOver()) {
    if (requests.inFlight <= 0 && Date.now() - requests.lastChange >= quietMs) {
      return { quiet: true, ms: Date.now() - started };
    }
    await sleep(100);
  }
  return {
    quiet: false,
    ms: Date.now() - started,
    inFlight: requests.inFlight,
  };
}

/**
 * Defines window.__maMasterPeak(): the master output's peak right now. Its
 * buffers are allocated once, so a meter sampling it inside a measured
 * window adds no garbage to it.
 */
function installPeakReader(page) {
  return page.evaluate(() => {
    let buffers = [];
    window.__maMasterPeak = () => {
      const engine = window.__MA_AUDIO_ENGINE__;
      if (!engine?.getIsInitialized?.()) return null;
      const analysers = engine.getMasterAnalysers();
      if (
        buffers.length !== analysers.length ||
        analysers.some((analyser, i) => buffers[i].length !== analyser.fftSize)
      ) {
        buffers = analysers.map(
          (analyser) => new Float32Array(analyser.fftSize),
        );
      }
      let peak = 0;
      analysers.forEach((analyser, i) => {
        const data = buffers[i];
        analyser.getFloatTimeDomainData(data);
        for (let j = 0; j < data.length; j += 1) {
          const level = Math.abs(data[j]);
          if (level > peak) peak = level;
        }
      });
      return peak;
    };
  });
}

/**
 * Times a fixed integer loop in the page: the median of three runs after a
 * warm-up, in ms. Under one profile (and its CPU throttle) it should take
 * the same time on every run; when it takes longer, the machine was slowing
 * the page down, and every timing of that run with it.
 */
function benchPage() {
  const run = () => {
    const started = performance.now();
    let x = 1;
    for (let i = 0; i < 4_000_000; i += 1) x = (Math.imul(x, 31) + i) | 0;
    return { ms: performance.now() - started, x };
  };
  run();
  const runs = [run(), run(), run()];
  const times = runs.map((r) => r.ms).sort((a, b) => a - b);
  // Returning the loop's result keeps it from being optimized away.
  return { ms: Number(times[1].toFixed(1)), result: runs[0].x };
}

/**
 * Resolves once the page has gone `calmMs` without a long task, or after
 * `timeout`: work left over from loading (sample decoding, deferred
 * analysis) and from the page CPU check would otherwise spill into the
 * first measured window.
 */
function waitForCalm({ calmMs, timeout }) {
  return new Promise((resolve) => {
    const started = performance.now();
    let lastBusy = started;
    let observer = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lastBusy = Math.max(lastBusy, entry.startTime + entry.duration);
        }
      });
      observer.observe({ type: 'longtask' });
    } catch {
      // No long task timing in this browser: this just waits calmMs.
    }
    const check = () => {
      const now = performance.now();
      const calm = now - lastBusy >= calmMs;
      if (calm || now - started >= timeout) {
        observer?.disconnect();
        resolve({ calm, ms: Math.round(now - started) });
      } else setTimeout(check, 100);
    };
    setTimeout(check, 100);
  });
}

/**
 * A fresh page on the demo (or `query`), the engine started and the network
 * quiet. Every interactive scenario starts here, so none inherits another's
 * state. The page's request tracker comes back too, for a scenario that
 * loads more (new tracks' instruments) and waits for quiet again.
 */
async function openDemo(browser, base, profile, query = DEMO) {
  const opened = await newPage(browser, profile);
  const requests = trackRequests(opened.page);
  const started = Date.now();
  await openEditor(opened.page, base, query);
  const openMs = Date.now() - started;
  await startAudio(opened.page);
  const audioMs = Date.now() - started - openMs;
  // A stopped clock silences playback and slows every scheduled update, so
  // a scenario on one measures something else (runProblems fails it).
  const audioClockNow = await audioClock(opened.page);
  const settle = await waitForQuiet(requests);
  await installPeakReader(opened.page);
  const bench = await opened.page.evaluate(benchPage);
  const calm = await opened.page.evaluate(waitForCalm, {
    calmMs: 1000,
    timeout: 15_000,
  });
  return {
    ...opened,
    requests,
    setup: {
      query,
      openMs,
      audioMs,
      audioClock: audioClockNow,
      settle,
      pageCheckMs: bench.ms,
      calm,
    },
  };
}

/**
 * A page for a cold load: no probes (they add a rAF loop and a React hook
 * the load does not need) and a resource timing buffer big enough for the
 * dev server's ~2,200 module requests, so the DawApp entry is not dropped
 * once the default 250 fill up.
 */
async function newColdPage(browser, profile, network) {
  const opened = await newPage(browser, profile, { network, probes: false });
  await opened.context.addInitScript(() => {
    try {
      performance.setResourceTimingBufferSize(100_000);
    } catch {
      // Older browsers keep the default buffer.
    }
  });
  return opened;
}

/**
 * Lets the page finish the frame in flight and deliver queued
 * PerformanceObserver entries before a short recording stops, so a long
 * task at the very end of a drag is not lost.
 */
function drainFrame(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve, 50)),
      ),
  );
}

/** Two frames, so a store write made between gestures has painted. */
function nextFrames(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

/**
 * Waits until the page has gone `calmMs` without a long task (at most
 * `timeout`), so a window does not start inside the work the last one left
 * behind, such as the undo snapshot taken 300 ms after an edit.
 */
function calmDown(page, calmMs, timeout = 10_000) {
  return page.evaluate(waitForCalm, { calmMs, timeout });
}

/**
 * Moves the mouse along `path(ms)` for `ms`, at most one move per 16 ms
 * (about a mouse's rate once Chrome aligns input to frames). Each move waits
 * for the page to take it, so a busy page gets fewer, as it would from a
 * person.
 */
async function sweep(page, ms, path) {
  const started = Date.now();
  let moves = 0;
  for (let t = 0; t < ms; t = Date.now() - started) {
    const { x, y } = path(t);
    await page.mouse.move(x, y);
    moves += 1;
    const wait = moves * 16 - (Date.now() - started);
    if (wait > 0) await sleep(wait);
  }
  const seconds = (Date.now() - started) / 1000;
  return { moves, movesPerSecond: round(moves / seconds) };
}

/** Problems with a recording that saw nothing at all. */
function probeProblems(probes) {
  return probes.frames < 2 ? ['the probes recorded no frames'] : [];
}

/* ── In-page functions (serialized into the page: self-contained) ────── */

/**
 * Samples the master peak and the playhead every 250 ms until stopPeakMeter.
 * The playhead is the live one (__MA_PLAYHEAD__, 1.7: the store's position
 * is parked while playing), or the store's on an older build (--prev-base).
 * It is counted as moves forward and wraps back (the loop's end), and as
 * distinct positions.
 */
function startPeakMeter(audiblePeak) {
  const store = window.__MA_STORE__;
  const playhead = () =>
    Math.round(window.__MA_PLAYHEAD__?.tick?.() ?? store.getState().position);
  const startPosition = playhead();
  const meter = {
    maxPeak: 0,
    samples: 0,
    readings: 0,
    audibleSamples: 0,
    startPosition,
    lastPosition: startPosition,
    positions: new Set([startPosition]),
    forwardSteps: 0,
    wraps: 0,
    playhead,
  };
  meter.timer = setInterval(() => {
    meter.samples += 1;
    const position = playhead();
    if (position > meter.lastPosition) meter.forwardSteps += 1;
    else if (position < meter.lastPosition) meter.wraps += 1;
    meter.lastPosition = position;
    meter.positions.add(position);
    const peak = window.__maMasterPeak();
    if (peak === null) return;
    meter.readings += 1;
    meter.maxPeak = Math.max(meter.maxPeak, peak);
    if (peak >= audiblePeak) meter.audibleSamples += 1;
  }, 250);
  window.__maPeakMeter = meter;
}

function stopPeakMeter() {
  const meter = window.__maPeakMeter;
  clearInterval(meter.timer);
  const state = window.__MA_STORE__.getState();
  return {
    maxPeak: meter.maxPeak,
    samples: meter.samples,
    readings: meter.readings,
    audibleSamples: meter.audibleSamples,
    isPlaying: state.isPlaying,
    startPosition: meter.startPosition,
    endPosition: meter.playhead(),
    distinctPositions: meter.positions.size,
    forwardSteps: meter.forwardSteps,
    wraps: meter.wraps,
  };
}

/**
 * Switches the view through the store and times it. "First frame" is the
 * rAF after the switch plus a message posted from it, which runs once that
 * frame has been painted; "settled" is the frame after the first idle period
 * (requestIdleCallback). Its own observers' takeRecords() keep a long task
 * that ends the window from being lost.
 */
async function measureViewSwitch(view) {
  const entries = { longtask: [], 'long-animation-frame': [] };
  const observers = [];
  for (const type of Object.keys(entries)) {
    try {
      const observer = new PerformanceObserver((list) =>
        entries[type].push(...list.getEntries()),
      );
      observer.observe({ type });
      observers.push([observer, type]);
    } catch {
      // Not supported by this browser.
    }
  }
  // The probes' React hook: wrap it to time this switch's commits.
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const onCommit = hook?.onCommitFiberRoot;
  const commits = [];
  if (onCommit) {
    hook.onCommitFiberRoot = function (...rest) {
      commits.push(performance.now());
      return onCommit.apply(this, rest);
    };
  }
  const t0 = performance.now();
  window.__MA_STORE__.getState().setCurrentView(view);
  const setMs = performance.now() - t0;
  await new Promise((resolve) =>
    requestAnimationFrame(() => {
      const channel = new MessageChannel();
      channel.port1.onmessage = resolve;
      channel.port2.postMessage(null);
    }),
  );
  const firstFrameMs = performance.now() - t0;
  const idleTimedOut = await new Promise((resolve) =>
    requestIdleCallback((deadline) => resolve(deadline.didTimeout), {
      timeout: 10_000,
    }),
  );
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const settledMs = performance.now() - t0;
  if (onCommit) hook.onCommitFiberRoot = onCommit;
  for (const [observer, type] of observers) {
    entries[type].push(...observer.takeRecords());
    observer.disconnect();
  }
  const inWindow = (entry) => entry.startTime + entry.duration >= t0;
  const longTasks = entries.longtask.filter(inWindow);
  const frames = entries['long-animation-frame'].filter(inWindow);
  const total = (list, key) =>
    Math.round(list.reduce((sum, entry) => sum + (entry[key] ?? 0), 0));
  const longest = (list) =>
    Math.round(list.reduce((most, entry) => Math.max(most, entry.duration), 0));
  const ms = (value) => Number(value.toFixed(1));
  return {
    setMs: ms(setMs),
    firstFrameMs: ms(firstFrameMs),
    settledMs: ms(settledMs),
    idleTimedOut,
    commits: commits.length,
    firstCommitMs: commits.length ? ms(commits[0] - t0) : null,
    lastCommitMs: commits.length ? ms(commits.at(-1) - t0) : null,
    longTasks: {
      count: longTasks.length,
      totalMs: total(longTasks, 'duration'),
      maxMs: longest(longTasks),
    },
    longAnimationFrames: {
      count: frames.length,
      blockingMs: total(frames, 'blockingDuration'),
      maxMs: longest(frames),
    },
  };
}

/**
 * The load timeline up to `until` (ms since navigation start): the ma:daw:*
 * marks, the DawApp module's resource entry, and the long tasks and LoAF
 * the browser buffered since navigation.
 */
function readLoadTimeline(until) {
  const ms = (value) => Number(value.toFixed(1));
  const marks = {};
  for (const mark of performance.getEntriesByType('mark')) {
    if (!mark.name.startsWith('ma:daw:')) continue;
    const name = mark.name.slice('ma:daw:'.length);
    marks[name] ??= { firstMs: ms(mark.startTime), count: 0 };
    marks[name].count += 1;
  }
  const resources = performance.getEntriesByType('resource');
  const daw = resources
    .filter((entry) => entry.name.includes('DawApp'))
    .sort((a, b) => a.startTime - b.startTime)[0];
  const buffered = (type) => {
    try {
      const observer = new PerformanceObserver(() => {});
      observer.observe({ type, buffered: true });
      const records = observer.takeRecords();
      observer.disconnect();
      return records.filter((entry) => entry.startTime <= until);
    } catch {
      return null;
    }
  };
  const summary = (list, blocking) =>
    list && {
      count: list.length,
      totalMs: Math.round(
        list.reduce(
          (sum, entry) =>
            sum + (blocking ? (entry.blockingDuration ?? 0) : entry.duration),
          0,
        ),
      ),
      maxMs: Math.round(
        list.reduce((most, entry) => Math.max(most, entry.duration), 0),
      ),
    };
  return {
    marks,
    dawApp: daw
      ? {
          url: new URL(daw.name).pathname,
          startMs: ms(daw.startTime),
          requestStartMs: ms(daw.requestStart),
          responseEndMs: ms(daw.responseEnd),
          transferSize: daw.transferSize,
          encodedBodySize: daw.encodedBodySize,
        }
      : null,
    resourceEntries: resources.length,
    longTasks: summary(buffered('longtask'), false),
    // totalMs here is LoAF blocking time, as in the probes.
    longAnimationFrames: summary(buffered('long-animation-frame'), true),
  };
}

/**
 * Watches for the first sound after Play: polls the master analysers every
 * 5 ms (an fftSize-256 buffer is ~6 ms at 44.1 kHz) and notes the click.
 */
function watchFirstAudio(audiblePeak) {
  const state = {
    clickAt: null,
    nonZeroAt: null,
    peakAtNonZero: null,
    audibleAt: null,
  };
  window.__maFirstAudio = state;
  window.addEventListener(
    'click',
    () => {
      state.clickAt ??= performance.now();
    },
    { capture: true },
  );
  const timer = setInterval(() => {
    const peak = window.__maMasterPeak();
    if (!peak) return;
    const now = performance.now();
    if (state.nonZeroAt === null) {
      state.nonZeroAt = now;
      state.peakAtNonZero = peak;
    }
    if (peak >= audiblePeak) {
      state.audibleAt = now;
      clearInterval(timer);
    }
  }, 5);
}

/**
 * The first track header's volume slider (Radix): where to press, and the
 * track whose volume it sets, matched by the name in that header.
 */
function findVolumeSlider() {
  // MasterTrackHeader's slider is labelled "Master Volume", so this is the
  // first track header's.
  const thumb = document.querySelector('[role="slider"][aria-label="Volume"]');
  if (!thumb) return null;
  const box = thumb.getBoundingClientRect();
  // Radix renders Root > (Track, a wrapper > the thumb): the root is the
  // first ancestor much wider than the thumb.
  let root = thumb.parentElement;
  while (root && root.getBoundingClientRect().width < box.width * 3) {
    root = root.parentElement;
  }
  if (!root) return null;
  const rootBox = root.getBoundingClientRect();
  // TrackHeader shows its track's name in a text input above the slider.
  let header = root.parentElement;
  while (header && !header.querySelector('input:not([type])')) {
    header = header.parentElement;
  }
  const name = header?.querySelector('input:not([type])')?.value;
  const tracks = window.__MA_STORE__.getState().tracks;
  const named = tracks.filter((track) => track.name === name);
  const track = named.length === 1 ? named[0] : tracks[0];
  return {
    thumbX: box.left + box.width / 2,
    y: box.top + box.height / 2,
    left: rootBox.left,
    width: rootBox.width,
    trackId: track?.id ?? null,
    track: track?.name ?? null,
    volume: track?.volume ?? null,
    matchedBy: named.length === 1 ? 'the header name' : 'the first track',
  };
}

/**
 * A note to drag: the longest note of a clip that starts at bar 1 on a
 * melodic MIDI track (the 'melody' role first). The docked roll passes the
 * clip's song position as both of its origins today (ChannelStrip), so only
 * a clip at tick 0 is drawn where its notes really are. A note overlapped by
 * another of the same pitch is passed over: the roll could grab the other.
 * The clip's events are kept in the page, so every gesture starts from them.
 */
function pickNote() {
  const notMelodic = [
    'drum-machine',
    'none',
    'guitar-fx',
    'bass-fx',
    'vocal-fx',
  ];
  const tracks = window.__MA_STORE__
    .getState()
    .tracks.filter(
      (track) =>
        track.type === 'midi' && !notMelodic.includes(track.instrument),
    )
    .sort(
      (a, b) =>
        Number(b.trackRole === 'melody') - Number(a.trackRole === 'melody'),
    );
  const overlaps = (a, b) =>
    a.note === b.note &&
    a.startTick < b.startTick + b.durationTicks &&
    b.startTick < a.startTick + a.durationTicks;
  for (const track of tracks) {
    for (const clip of track.midiClips) {
      if (clip.startTick !== 0) continue;
      // The roll shows C1 (24) to C7 (96).
      const candidates = clip.events
        .map((event, index) => ({ event, index }))
        .filter(
          ({ event, index }) =>
            event.note >= 24 &&
            event.note <= 96 &&
            !clip.events.some(
              (other, j) => j !== index && overlaps(event, other),
            ),
        );
      if (!candidates.length) continue;
      const { event, index } = candidates.reduce((a, b) =>
        b.event.durationTicks > a.event.durationTicks ? b : a,
      );
      window.__maOriginalEvents = structuredClone(clip.events);
      return {
        trackId: track.id,
        track: track.name,
        instrument: track.instrument,
        clipId: clip.id,
        clipStartTick: clip.startTick,
        eventIndex: index,
        note: {
          note: event.note,
          startTick: event.startTick,
          durationTicks: event.durationTicks,
        },
      };
    }
  }
  return null;
}

/**
 * Defines the page helpers the note drag shares: window.__maPianoGrid()
 * finds the docked roll's grid canvas from its Select tool, and
 * window.__maNoteBox(pick) places the picked note on that canvas with
 * PianoRoll's layout: 73 rows (C7 on top) over the canvas height, and 40 px
 * per beat × the horizontal zoom. The canvas is the clip's span wide unless
 * that is narrower than the view; only then does the zoom come from the
 * "H:x%" label, which is rounded.
 */
function installPianoHelpers() {
  window.__maPianoGrid = () => {
    const selectTool = document.querySelector('button[title="Select (V)"]');
    if (!selectTool) return { reason: 'no Select tool in the Piano Roll' };
    let root = selectTool.parentElement;
    let grid = null;
    while (root && !grid) {
      // The hit surface, not the paint canvas drawn behind it since
      // milestone 1.8 (aria-hidden, no pointer events).
      grid = [...root.querySelectorAll('canvas')].find(
        (canvas) =>
          canvas.parentElement?.classList.contains('overflow-auto') &&
          canvas.getAttribute('aria-hidden') !== 'true',
      );
      if (!grid) root = root.parentElement;
    }
    if (!grid) return { reason: 'no Piano Roll grid canvas' };
    return { root, grid, scroller: grid.parentElement };
  };
  window.__maNoteBox = ({ trackId, clipId, eventIndex }) => {
    const parts = window.__maPianoGrid();
    if (parts.reason) return parts;
    const { root, grid, scroller } = parts;
    const state = window.__MA_STORE__.getState();
    const clip = state.tracks
      .find((track) => track.id === trackId)
      ?.midiClips.find((candidate) => candidate.id === clipId);
    const note = clip?.events[eventIndex];
    if (!note) return { reason: 'the picked note is gone' };
    const label = [...root.querySelectorAll('span')]
      .map((span) => span.textContent.trim())
      .find((text) => /^H:\d+% V:\d+%$/.test(text));
    const [, h, v] = (label ?? 'H:100% V:100%').match(/^H:(\d+)% V:(\d+)%$/);
    const ticksPerBeat = 480;
    // PianoRoll's extent: at least 16 bars, plus 4 beats past the last note.
    const minTicks = ticksPerBeat * state.timeSignatureNumerator * 16;
    const maxTick = clip.events.reduce(
      (most, event) => Math.max(most, event.startTick + event.durationTicks),
      clip.startTick + minTicks,
    );
    const totalTicks = maxTick - clip.startTick + ticksPerBeat * 4;
    const width = parseFloat(grid.style.width);
    const height = parseFloat(grid.style.height);
    const pixelsPerTick =
      width > scroller.clientWidth + 1
        ? width / totalTicks
        : (40 * (Number(h) / 100)) / ticksPerBeat;
    const rowH = height > 0 ? height / 73 : 12 * (Number(v) / 100);
    return {
      grid,
      scroller,
      x: (note.startTick - clip.startTick) * pixelsPerTick,
      y: (96 - note.note) * rowH,
      width: Math.max(3, note.durationTicks * pixelsPerTick),
      rowH,
      pixelsPerTick,
      zoom: label ?? null,
    };
  };
}

/** Scrolls the picked note to the middle of the visible grid. */
function scrollToNote(pick) {
  const box = window.__maNoteBox(pick);
  if (box.reason) return { reason: box.reason };
  const { scroller } = box;
  scroller.scrollTop = Math.max(
    0,
    box.y + box.rowH / 2 - scroller.clientHeight / 2,
  );
  scroller.scrollLeft = Math.max(0, box.x - 40);
  return { scrollTop: scroller.scrollTop, scrollLeft: scroller.scrollLeft };
}

/**
 * Resolves once the roll's grid has held still for `frames` frames: its
 * scroll position, canvas size and place on screen. The roll scrolls to its
 * notes a frame after it mounts and the dock may still be opening, so a
 * grab point read earlier could be stale by the time it is pressed.
 */
function waitForStableGrid(frames) {
  return new Promise((resolve) => {
    const started = performance.now();
    let last = null;
    let same = 0;
    const check = () => {
      const parts = window.__maPianoGrid();
      let now = null;
      if (!parts.reason) {
        const box = parts.scroller.getBoundingClientRect();
        now = [
          parts.scroller.scrollTop,
          parts.scroller.scrollLeft,
          parts.grid.style.width,
          parts.grid.style.height,
          box.top,
          box.left,
          box.height,
        ].join();
      }
      same = now !== null && now === last ? same + 1 : 0;
      last = now;
      const ms = Math.round(performance.now() - started);
      if (same >= frames) resolve({ stable: true, ms });
      else if (ms > 10_000) {
        resolve({ stable: false, ms, reason: parts.reason ?? null });
      } else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

/**
 * Where to press on the picked note, in page coordinates: inside its left
 * part, clear of the last 6 px that resize it. It must be inside the visible
 * grid and nothing may cover it.
 */
function locateNote(pick) {
  const box = window.__maNoteBox(pick);
  if (box.reason) return { reason: box.reason };
  const { grid, scroller } = box;
  const canvasBox = grid.getBoundingClientRect();
  const viewBox = scroller.getBoundingClientRect();
  const grab = {
    x: canvasBox.left + box.x + Math.min(12, Math.max(1, (box.width - 6) / 2)),
    y: canvasBox.top + box.y + box.rowH / 2,
  };
  const view = {
    left: viewBox.left,
    top: viewBox.top,
    right: viewBox.left + scroller.clientWidth,
    bottom: viewBox.top + scroller.clientHeight,
  };
  const spot = {
    grab,
    view,
    rowH: box.rowH,
    pixelsPerTick: box.pixelsPerTick,
    zoom: box.zoom,
    scroll: { top: scroller.scrollTop, left: scroller.scrollLeft },
  };
  const inside =
    grab.x > view.left &&
    grab.x < view.right &&
    grab.y > view.top &&
    grab.y < view.bottom;
  if (!inside)
    return { reason: 'the note is outside the visible grid', ...spot };
  const hit = document.elementFromPoint(grab.x, grab.y);
  if (hit !== grid) {
    const name = hit
      ? `${hit.tagName.toLowerCase()}${typeof hit.className === 'string' && hit.className.trim() ? `.${hit.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`
      : 'nothing';
    return { reason: `the grab point is covered by ${name}`, ...spot };
  }
  return spot;
}

/**
 * Counts one gesture's store writes until finishGesture: every write, the
 * keys each one changed (all of them, unlike the probes' top 12), and what
 * happened to the gesture's target. For `volume`, the writes that changed
 * that track's volume, and any other track whose volume changed; for `note`,
 * the writes that replaced the clip's events and the positions the grabbed
 * note took.
 */
function watchGesture(target) {
  const store = window.__MA_STORE__;
  const read = (state) => {
    const track = state.tracks.find((t) => t.id === target.trackId);
    if (target.kind === 'volume') return track ? track.volume : null;
    const clip = track?.midiClips.find((c) => c.id === target.clipId);
    const event = clip?.events[target.eventIndex];
    return event ? `${event.startTick}:${event.note}` : null;
  };
  const clipOf = (state) =>
    state.tracks
      .find((t) => t.id === target.trackId)
      ?.midiClips.find((c) => c.id === target.clipId);
  const initial = read(store.getState());
  // The undo history's steps (milestone 1.9): an edit still settling from
  // before the gesture is made a step first, so it isn't counted as the
  // gesture's.
  const history = window.__MA_HISTORY__;
  history?.flush();
  const watch = {
    historyStart: history ? history.pushed() : null,
    writes: 0,
    keys: {},
    targetWrites: 0,
    clipWrites: 0,
    values: new Set([initial]),
    last: initial,
    otherTracks: new Set(),
  };
  watch.unsubscribe = store.subscribe((state, prev) => {
    watch.writes += 1;
    for (const key of Object.keys(state)) {
      if (typeof state[key] === 'function' || state[key] === prev[key]) {
        continue;
      }
      watch.keys[key] = (watch.keys[key] ?? 0) + 1;
    }
    if (state.tracks === prev.tracks) return;
    const now = read(state);
    if (now !== watch.last) {
      watch.targetWrites += 1;
      watch.values.add(now);
      watch.last = now;
    }
    if (target.kind === 'note') {
      if (clipOf(state)?.events !== clipOf(prev)?.events) watch.clipWrites += 1;
      return;
    }
    for (const track of state.tracks) {
      if (track.id === target.trackId) continue;
      const before = prev.tracks.find((t) => t.id === track.id);
      if (before && before.volume !== track.volume) {
        watch.otherTracks.add(track.name);
      }
    }
  });
  watch.initial = initial;
  window.__maGesture = watch;
}

function finishGesture() {
  const watch = window.__maGesture;
  watch.unsubscribe();
  return {
    writes: watch.writes,
    keys: watch.keys,
    target: {
      initial: watch.initial,
      final: watch.last,
      writes: watch.targetWrites,
      distinctValues: watch.values.size,
      // A target that disappeared (null) did not change the way a drag does.
      changed: [...watch.values].some(
        (value) => value !== null && value !== watch.initial,
      ),
    },
    clipWrites: watch.clipWrites,
    otherTracksChanged: [...watch.otherTracks],
    undoSteps:
      watch.historyStart === null
        ? null
        : window.__MA_HISTORY__.pushed() - watch.historyStart,
  };
}

/**
 * Milestone 1.9's exit check for one gesture: it wrote its target once and
 * made one undo step. `what` names the target ('volume', 'clip').
 */
function gestureTargets(gesture, i, what, targetWrites) {
  const problems = [];
  if (targetWrites !== 1) {
    problems.push(
      `gesture ${i} wrote the ${what} ${targetWrites} times (target: once, on release)`,
    );
  }
  const steps = gesture.watch.undoSteps;
  if (steps !== null && steps !== 1) {
    problems.push(`gesture ${i} made ${steps} undo steps (target: 1)`);
  }
  return problems;
}

/* ── Network accounting for cold loads ─────────────────────────────────── */

/**
 * What a request to the dev server is: `code` for the unbundled modules it
 * serves (with inline source maps, so far heavier than a production chunk),
 * `assets` for the app's own files such as samples under /daw-assets/.
 */
const SELF_CODE = /^\/(src|node_modules|@)/;

/**
 * Collects CDP Network events and answers "how many bytes had each host sent
 * by wall-clock time T". CDP stamps events on a monotonic clock in seconds;
 * requestWillBeSent also carries the wall time, which maps one onto the
 * other.
 */
function trackNetwork(cdp, base) {
  const selfHost = new URL(base).host;
  const requests = new Map();
  let offsetMs = null;
  cdp.on('Network.requestWillBeSent', (event) => {
    if (offsetMs === null && event.wallTime) {
      offsetMs = event.wallTime * 1000 - event.timestamp * 1000;
    }
    const { url } = event.request;
    if (requests.has(event.requestId) || !/^https?:/.test(url)) return;
    const { host, pathname } = new URL(url);
    let group = 'thirdParty';
    if (host === selfHost) {
      group = SELF_CODE.test(pathname) ? 'selfCode' : 'selfAssets';
    }
    requests.set(event.requestId, {
      url,
      host,
      path: pathname,
      group,
      start: event.timestamp,
      chunks: [],
      end: null,
      bytes: null,
    });
  });
  cdp.on('Network.dataReceived', (event) => {
    requests
      .get(event.requestId)
      ?.chunks.push([
        event.timestamp,
        event.encodedDataLength || event.dataLength,
      ]);
  });
  const finish = (event, bytes) => {
    const request = requests.get(event.requestId);
    if (!request) return;
    request.end = event.timestamp;
    request.bytes = bytes;
  };
  cdp.on('Network.loadingFinished', (event) =>
    finish(event, event.encodedDataLength),
  );
  cdp.on('Network.loadingFailed', (event) => finish(event, null));

  /**
   * Bytes received by `wallMs` (ms since the epoch): totals per group
   * (selfCode, selfAssets, thirdParty), per host with its three largest
   * downloads, and the biggest requests still in flight.
   */
  const bytesUntil = (wallMs) => {
    const limit = (wallMs - (offsetMs ?? 0)) / 1000;
    const totals = {};
    const hosts = new Map();
    const inFlight = [];
    for (const request of requests.values()) {
      if (request.start > limit) continue;
      const done = request.end !== null && request.end <= limit;
      const received = request.chunks
        .filter(([at]) => at <= limit)
        .reduce((sum, [, bytes]) => sum + bytes, 0);
      const bytes = done && request.bytes !== null ? request.bytes : received;
      const row = { path: request.path.slice(-90), bytes };
      if (!done) inFlight.push({ host: request.host, ...row });
      const group = (totals[request.group] ??= { bytes: 0, requests: 0 });
      group.bytes += bytes;
      group.requests += 1;
      const host = hosts.get(request.host) ?? {
        host: request.host,
        bytes: 0,
        requests: 0,
        largest: [],
      };
      host.bytes += bytes;
      host.requests += 1;
      host.largest = [...host.largest, row]
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 3);
      hosts.set(request.host, host);
    }
    const none = { bytes: 0, requests: 0 };
    return {
      selfCode: totals.selfCode ?? none,
      selfAssets: totals.selfAssets ?? none,
      thirdParty: totals.thirdParty ?? none,
      hosts: [...hosts.values()].sort((a, b) => b.bytes - a.bytes),
      inFlight: inFlight.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
    };
  };
  return { bytesUntil };
}

/* ── Gestures ──────────────────────────────────────────────────────────── */

/**
 * One gesture's numbers, as counts, per move and per second. Counts come
 * from the probes' rates × the window, except store writes and keys, which
 * the gesture's own watcher counted exactly.
 */
function gestureResult(input, watch, probes) {
  const count = (perSecond) => Math.round(perSecond * probes.seconds);
  const moves = Math.max(1, input.moves);
  const reactCommits = count(probes.reactCommitsPerSecond);
  return {
    moves: input.moves,
    movesPerSecond: input.movesPerSecond,
    seconds: probes.seconds,
    storeWrites: watch.writes,
    reactCommits,
    longTasks: probes.longTasks,
    longAnimationFrames: probes.longAnimationFrames,
    frameP95: probes.frameMs.p95,
    perMove: {
      storeWrites: round(watch.writes / moves, 2),
      reactCommits: round(reactCommits / moves, 2),
      longTaskMs: round(probes.longTasks.totalMs / moves, 1),
    },
    regionCommits: Object.fromEntries(
      Object.entries(probes.regions).map(([id, region]) => [
        id,
        count(region.commitsPerSecond),
      ]),
    ),
    watch,
    probes,
  };
}

/**
 * The gestures together: the median and range of each per-gesture number,
 * long tasks summed, and store keys and region commits per move over all
 * gestures.
 */
function dragStats(gestures) {
  const moves = gestures.reduce((sum, g) => sum + g.moves, 0) || 1;
  const of = (get) => spread(gestures.map(get));
  const sum = (get) => gestures.reduce((total, g) => total + get(g), 0);
  const perMove = (get) => {
    const counts = {};
    for (const gesture of gestures) {
      for (const [key, n] of Object.entries(get(gesture))) {
        counts[key] = (counts[key] ?? 0) + n;
      }
    }
    return Object.fromEntries(
      Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key, n]) => [key, round(n / moves, 2)]),
    );
  };
  return {
    gestures: gestures.length,
    movesPerSecond: of((g) => g.movesPerSecond),
    writesPerSecond: of((g) => g.storeWrites / g.seconds),
    commitsPerSecond: of((g) => g.probes.reactCommitsPerSecond),
    writesPerMove: of((g) => g.perMove.storeWrites),
    writesPerGesture: of((g) => g.storeWrites),
    undoStepsPerGesture: of((g) => g.watch.undoSteps ?? 0),
    commitsPerMove: of((g) => g.perMove.reactCommits),
    longTaskMsPerMove: of((g) => g.perMove.longTaskMs),
    frameP95: of((g) => g.frameP95),
    longTasks: {
      count: sum((g) => g.longTasks.count),
      totalMs: sum((g) => g.longTasks.totalMs),
    },
    keysPerMove: perMove((g) => g.watch.keys),
    regionCommitsPerMove: perMove((g) => g.regionCommits),
  };
}

/**
 * Records one gesture: the press, `path` swept for the drag window, the
 * release and one more frame, with the probes and a watcher on `target`.
 */
async function recordGesture(page, windows, start, path, target) {
  await page.mouse.move(start.x, start.y);
  await startRecording(page);
  await page.evaluate(watchGesture, target);
  await page.mouse.down();
  const input = await sweep(page, windows.dragMs, path);
  await page.mouse.up();
  await drainFrame(page);
  const watch = await page.evaluate(finishGesture);
  const probes = await stopRecording(page);
  return gestureResult(input, watch, probes);
}

/* ── Scenarios ─────────────────────────────────────────────────────────── */

async function idle({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile);
  try {
    await startRecording(session.page);
    await sleep(windows.idleMs);
    const probes = await stopRecording(session.page);
    const playing = await session.page.evaluate(
      () => window.__MA_STORE__.getState().isPlaying,
    );
    return {
      setup: session.setup,
      probes,
      problems: [
        ...probeProblems(probes),
        ...(playing ? ['the transport was playing'] : []),
      ],
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

async function playback({ browser, base, profile, windows, args }) {
  const loop = args.loop !== 'false';
  const session = await openDemo(browser, base, profile);
  const { page } = session;
  try {
    await page.evaluate((loopOn) => {
      const store = window.__MA_STORE__.getState();
      if (loopOn) store.setLoopEnabled(true);
      store.play();
    }, loop);
    await sleep(windows.playbackLeadMs);
    await startRecording(page);
    await page.evaluate(startPeakMeter, AUDIBLE_PEAK);
    await sleep(windows.playbackMs);
    const audio = await page.evaluate(stopPeakMeter);
    const probes = await stopRecording(page);
    // Outside the window: pause, which is when a store without the live
    // playhead (1.7) learns where playback got to, then stop.
    await page.evaluate(() => window.__MA_STORE__.getState().pause());
    await nextFrames(page);
    const pausedAt = await page.evaluate(
      () => window.__MA_STORE__.getState().position,
    );
    await page.evaluate(() => window.__MA_STORE__.getState().stop());
    const moved =
      audio.distinctPositions > 1 || pausedAt !== audio.startPosition;
    const problems = probeProblems(probes);
    // With the clock stopped (runProblems says so) silence is no finding.
    const clockRuns = session.setup.audioClock.runs;
    if (!audio.isPlaying) problems.push('the transport stopped early');
    if (!audio.readings) {
      problems.push('the master analysers could not be read');
    } else if (!(audio.maxPeak > 0) && clockRuns) {
      problems.push('the master output was silent');
    }
    if (!moved && clockRuns) problems.push('the playhead never moved');
    return {
      setup: session.setup,
      loop,
      probes,
      audio: {
        maxPeak: round(audio.maxPeak, 4),
        // Of the readings taken: a null reading means no engine, not silence.
        audibleShare: audio.readings
          ? round(audio.audibleSamples / audio.readings, 2)
          : null,
        readings: audio.readings,
        samples: audio.samples,
      },
      playhead: {
        atStart: audio.startPosition,
        atEnd: audio.endPosition,
        pausedAt,
        samples: audio.samples,
        distinct: audio.distinctPositions,
        forwardSteps: audio.forwardSteps,
        wraps: audio.wraps,
        moved,
      },
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

/** Navigation start to the first frame of ?practiceMode=dorian&practiceRoot=d. */
async function practiceFirstRender(browser, base, profile) {
  const { context, page, errors } = await newColdPage(browser, profile, false);
  try {
    await page.goto(`${base}/studio/editor${PRACTICE}`, {
      waitUntil: 'domcontentloaded',
      timeout: LOAD_TIMEOUT,
    });
    // Practice boots async (it fetches the drum groove), then switches view.
    const shown = await page.waitForFunction(
      () => {
        const store = window.__MA_STORE__?.getState();
        const stats = window.__MA_RENDER_STATS__?.PracticeTrackView;
        return store?.currentView === 'practice' &&
          store.practiceSession &&
          stats?.commits > 0
          ? performance.now()
          : 0;
      },
      null,
      { polling: 'raf', timeout: LOAD_TIMEOUT },
    );
    const firstRenderMs = await shown.jsonValue();
    const timeline = await page.evaluate(readLoadTimeline, firstRenderMs);
    const mounted = timeline.marks.mounted?.firstMs ?? null;
    return {
      firstRenderMs: round(firstRenderMs),
      mountedToFirstRenderMs:
        mounted === null ? null : round(firstRenderMs - mounted),
      ...timeline,
      problems: [],
      pageErrors: errors,
    };
  } catch (error) {
    return {
      problems: [`the practice screen never showed: ${error.message}`],
      pageErrors: errors,
    };
  } finally {
    await context.close();
  }
}

/** `count` cold opens of the practice track, each in a fresh context. */
async function practiceOpens(browser, base, profile, count) {
  const runs = [];
  for (let i = 0; i < count; i += 1) {
    runs.push(await practiceFirstRender(browser, base, profile));
  }
  const measured = runs.filter((run) => !run.problems.length);
  const of = (get) => spread(measured.map(get));
  return {
    query: PRACTICE,
    opens: count,
    stats: {
      moduleMs: of((run) => run.marks.module?.firstMs),
      mountedMs: of((run) => run.marks.mounted?.firstMs),
      firstRenderMs: of((run) => run.firstRenderMs),
      mountedToFirstRenderMs: of((run) => run.mountedToFirstRenderMs),
      longTasks: of((run) => run.longTasks?.count),
      longTaskMs: of((run) => run.longTasks?.totalMs),
    },
    runs,
    problems: runs.flatMap((run, i) =>
      run.problems.map((problem) => `practice open ${i + 1}: ${problem}`),
    ),
  };
}

/**
 * Per view: its first switch (the view's first mount in the session) and
 * the median and range of the later ones.
 */
function viewStats(switches) {
  return VIEW_SWITCHES.map(({ view }) => {
    const [first, ...later] = switches.filter((s) => s.view === view);
    const of = (get) => spread(later.map(get));
    return {
      view,
      first: first && {
        firstFrameMs: first.firstFrameMs,
        settledMs: first.settledMs,
        commits: first.commits,
        longTasks: first.longTasks,
      },
      later: later.length
        ? {
            switches: later.length,
            firstFrameMs: of((s) => s.firstFrameMs),
            settledMs: of((s) => s.settledMs),
            commits: of((s) => s.commits),
            longTaskMs: of((s) => s.longTasks.totalMs),
          }
        : null,
    };
  });
}

async function views({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile);
  const switches = [];
  const problems = [];
  const rounds = windows.repeat + 1;
  try {
    for (let lap = 1; lap <= rounds; lap += 1) {
      for (const { view, region } of VIEW_SWITCHES) {
        await startRecording(session.page);
        const timing = await session.page.evaluate(measureViewSwitch, view);
        const probes = await stopRecording(session.page);
        if (!(probes.regions[region]?.commitsPerSecond > 0)) {
          problems.push(`${view} (round ${lap}): ${region} never committed`);
        }
        // The next switch waits for this one's deferred work to finish.
        const calm = await calmDown(session.page, windows.viewGapMs);
        switches.push({ round: lap, view, region, ...timing, probes, calm });
      }
    }
  } finally {
    await session.context.close();
  }
  const practice = await practiceOpens(browser, base, profile, windows.repeat);
  problems.push(...practice.problems);
  return {
    setup: session.setup,
    rounds,
    byView: viewStats(switches),
    switches,
    practice,
    problems,
    pageErrors: session.errors,
  };
}

async function faderDrag({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile);
  const { page } = session;
  try {
    const gestures = [];
    const problems = [];
    let control = null;
    for (let i = 1; i <= windows.repeat; i += 1) {
      if (control) {
        // Every gesture starts from the same volume, set outside the window.
        await page.evaluate(
          ({ trackId, volume }) =>
            window.__MA_STORE__.getState().updateTrack(trackId, { volume }),
          control,
        );
        await nextFrames(page);
        await calmDown(page, windows.gestureGapMs);
      }
      const slider = await page.evaluate(findVolumeSlider);
      if (!slider?.trackId) throw new Error('no track volume slider on screen');
      control ??= {
        slider: 'first track header volume (Radix slider)',
        widthPx: round(slider.width),
        trackId: slider.trackId,
        track: slider.track,
        volume: slider.volume,
        matchedBy: slider.matchedBy,
      };
      // Sweep across the middle 60% of the slider, two sweeps a second.
      const centre = slider.left + slider.width / 2;
      const reach = slider.width * 0.3;
      const gesture = await recordGesture(
        page,
        windows,
        { x: slider.thumbX, y: slider.y },
        (t) => ({
          x: centre + reach * Math.sin((2 * Math.PI * t) / 500),
          y: slider.y,
        }),
        { kind: 'volume', trackId: control.trackId },
      );
      gestures.push(gesture);
      problems.push(...probeProblems(gesture.probes));
      if (!gesture.watch.target.changed) {
        problems.push(`gesture ${i} never changed ${control.track}'s volume`);
      }
      problems.push(
        ...gestureTargets(gesture, i, 'volume', gesture.watch.target.writes),
      );
    }
    return {
      setup: session.setup,
      control,
      stats: dragStats(gestures),
      gestures,
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

/**
 * Opens the picked clip in the docked Piano Roll with the Select tool, or
 * says why it could not.
 */
async function openNoteInDock(page, pick) {
  // Select the track (the dock shows Piano Roll only for a melodic track)
  // and the clip, as a click on it in the timeline would.
  await page.evaluate(({ trackId, clipId }) => {
    const store = window.__MA_STORE__.getState();
    store.setSelectedTrackId(trackId);
    store.setSelectedClip(clipId, trackId);
  }, pick);
  const tab = page.locator('[data-tutorial-id="chanstrip-tab-piano-roll"]');
  try {
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return 'the dock never offered the Piano Roll tab';
  }
  await tab.click();
  const selectTool = page.locator('button[title="Select (V)"]').first();
  try {
    await selectTool.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    return 'the Piano Roll never showed its Select tool';
  }
  // Draw (the default tool) only selects a note on press; Select drags it.
  await selectTool.click();
  await page.evaluate(installPianoHelpers);
  return null;
}

/**
 * Scrolls the picked note into view once the roll holds still, and returns
 * where to press it (or a reason), read after the scroll has settled too.
 */
async function aimAtNote(page, pick) {
  const before = await page.evaluate(waitForStableGrid, 3);
  if (!before.stable) {
    return {
      reason: `the Piano Roll grid never held still (${before.reason ?? 'it kept moving'})`,
    };
  }
  const scrolled = await page.evaluate(scrollToNote, pick);
  if (scrolled.reason) return scrolled;
  const after = await page.evaluate(waitForStableGrid, 3);
  if (!after.stable) {
    return {
      reason: `the Piano Roll grid never held still (${after.reason ?? 'it kept moving'})`,
    };
  }
  return page.evaluate(locateNote, pick);
}

async function noteDrag({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile);
  const { page } = session;
  const skip = (reason, extra = {}) => ({
    setup: session.setup,
    skipped: true,
    reason,
    ...extra,
    problems: [],
    pageErrors: session.errors,
  });
  try {
    const pick = await page.evaluate(pickNote);
    if (!pick) return skip('no melodic clip at bar 1 with a note in range');
    const closed = await openNoteInDock(page, pick);
    if (closed) return skip(closed, { pick });
    const gestures = [];
    const problems = [];
    let spot = null;
    for (let i = 1; i <= windows.repeat; i += 1) {
      if (i > 1) {
        // Every gesture starts from the clip as it was, outside the window.
        await page.evaluate(
          ({ trackId, clipId }) =>
            window.__MA_STORE__
              .getState()
              .updateMidiClipEvents(
                trackId,
                clipId,
                structuredClone(window.__maOriginalEvents),
              ),
          pick,
        );
      }
      // Opening the dock (first) or restoring the clip leaves work behind.
      await calmDown(page, windows.gestureGapMs);
      const aim = await aimAtNote(page, pick);
      if (aim.reason) {
        // The first gesture decides whether the roll can be driven at all;
        // a later miss is a failure of a drag that worked before.
        if (i === 1) return skip(aim.reason, { pick, spot: aim });
        problems.push(`gesture ${i}: ${aim.reason}`);
        break;
      }
      // Circle round the note within the visible grid: up to 1.5 rows and
      // 30 px each way, so every move lands on the canvas.
      const { grab, view, rowH } = aim;
      const reachX = Math.min(
        30,
        grab.x - view.left - 4,
        view.right - grab.x - 4,
      );
      const reachY = Math.max(
        0,
        Math.min(1.5 * rowH, grab.y - view.top - 3, view.bottom - grab.y - 3),
      );
      spot ??= { ...aim, reachX: round(reachX), reachY: round(reachY) };
      const gesture = await recordGesture(
        page,
        windows,
        grab,
        (t) => ({
          x: grab.x + reachX * Math.sin((2 * Math.PI * t) / 800),
          y: grab.y + reachY * Math.sin((2 * Math.PI * t) / 600),
        }),
        {
          kind: 'note',
          trackId: pick.trackId,
          clipId: pick.clipId,
          eventIndex: pick.eventIndex,
        },
      );
      gestures.push(gesture);
      problems.push(...probeProblems(gesture.probes));
      if (!gesture.watch.target.changed) {
        problems.push(`gesture ${i} never moved the grabbed note`);
      }
      problems.push(
        ...gestureTargets(gesture, i, 'clip', gesture.watch.clipWrites),
      );
    }
    return {
      setup: session.setup,
      pick,
      spot,
      stats: gestures.length ? dragStats(gestures) : null,
      gestures,
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

/**
 * Waits for the first sound after Play. A target that should make sound
 * waits up to --audio-timeout. One that should stay silent waits
 * `silenceMs`, then only until no request has been in flight for 3 s (the
 * downloads Play started), so its byte counts are complete without sitting
 * out the whole timeout. Says what ended the wait.
 */
async function waitForSound(page, requests, expectSound, windows) {
  const started = Date.now();
  const race = { over: false };
  const sound = page
    .waitForFunction(() => window.__maFirstAudio.nonZeroAt !== null, null, {
      polling: 50,
      timeout: windows.audioTimeoutMs,
    })
    .then(
      () => 'sound',
      () => 'timeout',
    );
  if (expectSound) return sound;
  const quiet = (async () => {
    const until = started + Math.min(windows.silenceMs, windows.audioTimeoutMs);
    while (!race.over && Date.now() < until) await sleep(100);
    const settled = await waitForQuiet(requests, {
      quietMs: 3000,
      timeout: Math.max(0, windows.audioTimeoutMs - (Date.now() - started)),
      isOver: () => race.over,
    });
    return settled.quiet ? 'network quiet' : 'timeout';
  })();
  const ended = await Promise.race([sound, quiet]);
  race.over = true;
  return ended;
}

async function coldLoad(browser, base, profile, load, windows) {
  const { target, query, expectSound } = load;
  const { context, page, cdp, errors } = await newColdPage(
    browser,
    profile,
    true,
  );
  // newPage enables Network only to throttle; the bytes need it everywhere.
  await cdp.send('Network.enable');
  const network = trackNetwork(cdp, base);
  const requests = trackRequests(page);
  try {
    await page.goto(`${base}/studio/editor${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: LOAD_TIMEOUT,
    });
    // The editor is usable once the track list's Add Track button shows
    // (the old 'track-headers' anchor no longer renders).
    const shown = await page.waitForFunction(
      () => {
        const box = document
          .querySelector('[data-tutorial-id="add-track-button"]')
          ?.getBoundingClientRect();
        return box?.width > 0 && window.__MA_STORE__ ? performance.now() : 0;
      },
      null,
      { polling: 'raf', timeout: LOAD_TIMEOUT },
    );
    const addTrackVisibleMs = await shown.jsonValue();
    await installPeakReader(page);
    await page.evaluate(watchFirstAudio, AUDIBLE_PEAK);
    // A student presses Play as soon as the editor shows.
    await page.click('button[title="Play"]');
    const endedBy = await waitForSound(page, requests, expectSound, windows);
    const heard = endedBy === 'sound';
    if (heard) {
      // A few more seconds for the first reading above −60 dBFS.
      await page
        .waitForFunction(() => window.__maFirstAudio.audibleAt !== null, null, {
          polling: 50,
          timeout: 5000,
        })
        .catch(() => {});
    }
    const audio = await page.evaluate(() => ({
      ...window.__maFirstAudio,
      now: performance.now(),
      timeOrigin: performance.timeOrigin,
    }));
    const firstAudioAt = audio.nonZeroAt ?? audio.now;
    const timeline = await page.evaluate(readLoadTimeline, firstAudioAt);
    const wall = (at) => audio.timeOrigin + at;
    const fromClick = (at) =>
      at === null || audio.clickAt === null ? null : round(at - audio.clickAt);
    const silentForMs = heard ? null : fromClick(audio.now);
    // Silence on a stopped clock is the machine, not the load.
    const clock = heard ? null : await audioClock(page);
    const problems = [];
    if (!timeline.dawApp) {
      problems.push('no request for the DawApp module was recorded');
    }
    for (const mark of ['module', 'mounted']) {
      if (!timeline.marks[mark]) problems.push(`no ma:daw:${mark} mark`);
    }
    if (expectSound && !heard) {
      problems.push(
        clock?.runs === false
          ? `Play stayed silent for ${round(silentForMs / 1000)} s: ${AUDIO_CLOCK_STOPPED} (the page's AudioContext advanced ${clock.advancedSec ?? '?'} s in ${clock.wallSec ?? '?'} s)`
          : `Play stayed silent for ${round(silentForMs / 1000)} s`,
      );
    }
    return {
      target,
      query,
      expectSound,
      addTrackVisibleMs: round(addTrackVisibleMs),
      ...timeline,
      play: {
        clickMs: round(audio.clickAt),
        heard,
        endedBy,
        firstNonZeroMs: round(audio.nonZeroAt),
        playToFirstNonZeroMs: fromClick(audio.nonZeroAt),
        // Three significant digits: the first reading is often far below 1e-5.
        peakAtFirstNonZero:
          audio.peakAtNonZero === null
            ? null
            : Number(audio.peakAtNonZero.toPrecision(3)),
        firstAudibleMs: round(audio.audibleAt),
        playToFirstAudibleMs: fromClick(audio.audibleAt),
        silentForMs,
        audioClock: clock,
      },
      bytes: {
        beforePlay: network.bytesUntil(wall(audio.clickAt ?? firstAudioAt)),
        beforeFirstAudio: network.bytesUntil(wall(firstAudioAt)),
        total: network.bytesUntil(wall(audio.now)),
      },
      problems,
      pageErrors: errors,
    };
  } catch (error) {
    return {
      target,
      query,
      expectSound,
      problems: [`the cold load failed: ${error.message}`],
      pageErrors: errors,
    };
  } finally {
    await context.close();
  }
}

async function load({ browser, base, profile, windows }) {
  const runs = [];
  for (const target of LOAD_TARGETS) {
    runs.push(await coldLoad(browser, base, profile, target, windows));
  }
  return {
    network: PROFILES[profile].network ?? 'not throttled',
    runs,
    problems: runs.flatMap((run) =>
      run.problems.map((problem) => `${run.target}: ${problem}`),
    ),
  };
}

/* ── R24: the draft autosave while playing (milestone 1.4) ─────────────── */

/**
 * In-page: watches the draft autosave until stopDraftMonitor. Draft writes
 * come from the editor's DEV marks (ma:draft:write:start/end, autosave.ts),
 * long tasks from the longtask timeline, mirror writes from
 * Storage.prototype.setItem on 'musicAtlas:daw:mirror:*' keys, and the
 * TopRail slot (chip · Undo · Redo) from a MutationObserver: the frames in
 * which its DOM changed, and the chip's data-state and the buttons'
 * disabled flips.
 */
function startDraftMonitor() {
  const m = {
    t0: performance.now(),
    writes: [],
    open: null,
    longTasks: [],
    mirrorWrites: 0,
    chipFlips: 0,
    undoFlips: 0,
    slotFrames: 0,
    snapshotOpen: null,
    snapshotMs: null,
    issued: null,
  };
  window.__maDraftMonitor = m;
  m.marks = new PerformanceObserver((list) => {
    // Marks arrive in time order; the snapshot taken before a write is the
    // last one that ended since the previous write.
    for (const entry of [...list.getEntries()].sort(
      (a, b) => a.startTime - b.startTime,
    )) {
      if (entry.name === 'ma:draft:snapshot:start') {
        m.snapshotOpen = entry.startTime;
      } else if (
        entry.name === 'ma:draft:snapshot:end' &&
        m.snapshotOpen !== null
      ) {
        m.snapshotMs = entry.startTime - m.snapshotOpen;
        m.snapshotOpen = null;
      } else if (entry.name === 'ma:draft:write:start') {
        m.open = entry.startTime;
        m.issued = null;
      } else if (entry.name === 'ma:draft:write:issued' && m.open !== null) {
        m.issued = entry.startTime;
      } else if (entry.name === 'ma:draft:write:end' && m.open !== null) {
        m.writes.push({
          start: m.open,
          end: entry.startTime,
          mainThread:
            m.issued === null ? null : m.issued - m.open + (m.snapshotMs ?? 0),
        });
        m.open = null;
        m.issued = null;
        m.snapshotMs = null;
      }
    }
  });
  m.marks.observe({ type: 'mark' });
  try {
    m.tasks = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        m.longTasks.push({
          start: entry.startTime,
          end: entry.startTime + entry.duration,
        });
      }
    });
    m.tasks.observe({ type: 'longtask' });
  } catch {
    m.tasks = null;
  }
  const setItem = Storage.prototype.setItem;
  m.restore = () => {
    Storage.prototype.setItem = setItem;
  };
  Storage.prototype.setItem = function (key, value) {
    if (String(key).startsWith('musicAtlas:daw:mirror:')) m.mirrorWrites += 1;
    return setItem.call(this, key, value);
  };
  const slot = document.querySelector('[data-slot="toprail-leading"]');
  m.slotFound = Boolean(slot);
  let frameCounted = false;
  m.observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type !== 'attributes' || !(r.target instanceof Element)) continue;
      if (
        r.attributeName === 'data-state' &&
        r.target.matches('[data-testid="save-chip"]')
      ) {
        m.chipFlips += 1;
      }
      if (
        r.attributeName === 'disabled' &&
        r.target.closest(
          '[data-testid="undo-button"], [data-testid="redo-button"]',
        )
      ) {
        m.undoFlips += 1;
      }
    }
    if (!frameCounted) {
      frameCounted = true;
      m.slotFrames += 1;
      requestAnimationFrame(() => {
        frameCounted = false;
      });
    }
  });
  if (slot) {
    m.observer.observe(slot, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }
}

/** In-page: stops startDraftMonitor and returns what it saw. */
function stopDraftMonitor() {
  const m = window.__maDraftMonitor;
  m.marks.disconnect();
  m.tasks?.disconnect();
  m.observer.disconnect();
  m.restore();
  const pctOf = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p) =>
      sorted.length
        ? Number(
            sorted[
              Math.min(sorted.length - 1, Math.floor(p * sorted.length))
            ].toFixed(1),
          )
        : null;
    return {
      n: sorted.length,
      p50: at(0.5),
      p95: at(0.95),
      max: sorted.length ? Number(sorted.at(-1).toFixed(1)) : null,
    };
  };
  const main = m.writes
    .map((w) => w.mainThread)
    .filter((v) => typeof v === 'number');
  const overlapping = m.longTasks.filter((t) =>
    m.writes.some((w) => t.start < w.end && w.start < t.end),
  );
  return {
    seconds: Number(((performance.now() - m.t0) / 1000).toFixed(2)),
    writes: m.writes.length,
    // Start to commit: mostly the disk; reported, never judged.
    commitMs: pctOf(m.writes.map((w) => w.end - w.start)),
    // Snapshot plus the write's synchronous part, when the editor marks
    // them (n 0: unmeasured).
    mainThreadMs: pctOf(main),
    longTasks: m.longTasks.length,
    longTasksOverlappingWrites: overlapping.length,
    mirrorWrites: m.mirrorWrites,
    slotFound: m.slotFound,
    slotFrames: m.slotFrames,
    chipFlips: m.chipFlips,
    undoFlips: m.undoFlips,
  };
}

/** In-page: whether the draft has every change committed (none writing). */
function draftCaughtUp() {
  const st = window.__MA_DRAFTS__?.status();
  return Boolean(
    st?.draftId &&
      !st.paused &&
      !st.writing &&
      st.pendingSeq === st.committedSeq,
  );
}

async function autosave({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile);
  const { page } = session;
  try {
    const problems = [];
    const ready = await page
      .waitForFunction(draftCaughtUp, null, { timeout: 30_000, polling: 100 })
      .then(
        () => true,
        () => false,
      );
    if (!ready) {
      throw new Error(
        'the editor exposes no settled draft autosave (window.__MA_DRAFTS__, milestone 1.4)',
      );
    }
    const constants = await page.evaluate(
      () => window.__MA_DRAFTS__.constants ?? null,
    );
    const maxWaitMs = constants?.MAX_WAIT_MS ?? 5000;
    const slider = await page.evaluate(findVolumeSlider);
    if (!slider?.trackId) throw new Error('no track volume slider on screen');
    await page.evaluate(() => {
      const store = window.__MA_STORE__.getState();
      store.setLoopEnabled(true);
      store.play();
    });
    await sleep(windows.playbackLeadMs);
    // Playing, while the student keeps mixing for the whole window: short
    // fader moves one after another. Since milestone 1.9 a drag writes the
    // store once, on release, so it takes a run of gestures (each a store
    // write) to keep the autosave busy the way one long drag used to.
    await startRecording(page);
    await page.evaluate(startDraftMonitor);
    await page.evaluate(watchGesture, {
      kind: 'volume',
      trackId: slider.trackId,
    });
    const centre = slider.left + slider.width / 2;
    const reach = slider.width * 0.3;
    const at = (t) => ({
      x: centre + reach * Math.sin((2 * Math.PI * t) / 2300),
      y: slider.y,
    });
    const started = Date.now();
    const input = { gestures: 0, moves: 0, movesPerSecond: 0 };
    for (let t = 0; t < windows.playbackMs; t = Date.now() - started) {
      const from = at(t);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      const moved = await sweep(page, 150, (dt) => at(t + dt));
      await page.mouse.up();
      input.gestures += 1;
      input.moves += moved.moves;
      await sleep(100);
    }
    input.movesPerSecond = round(input.moves / ((Date.now() - started) / 1000));
    await drainFrame(page);
    const gesture = await page.evaluate(finishGesture);
    const playing = await page.evaluate(
      () => window.__MA_STORE__.getState().isPlaying,
    );
    const active = await page.evaluate(stopDraftMonitor);
    const probes = await stopRecording(page);
    await page.evaluate(() => window.__MA_STORE__.getState().stop());
    // Idle: once the last change is committed, nothing is written.
    await page
      .waitForFunction(draftCaughtUp, null, {
        timeout: maxWaitMs + 10_000,
        polling: 100,
      })
      .catch(() => {});
    await sleep(500);
    await page.evaluate(startDraftMonitor);
    await sleep(windows.idleMs);
    const idleWindow = await page.evaluate(stopDraftMonitor);
    // What the drag left is what the draft holds.
    const finalValue = await page.evaluate(async (trackId) => {
      const drafts = window.__MA_DRAFTS__;
      const body = await drafts.readBody(drafts.status().draftId);
      let stored = null;
      try {
        stored =
          JSON.parse(body?.text ?? 'null')?.data?.tracks?.find(
            (t) => t.id === trackId,
          )?.volume ?? null;
      } catch {
        stored = null;
      }
      return {
        store:
          window.__MA_STORE__.getState().tracks.find((t) => t.id === trackId)
            ?.volume ?? null,
        draft: stored,
      };
    }, slider.trackId);
    // The TopRail slot's React commits, when DawApp profiles it.
    const slotRegion = probes.regions?.EditorTopRailSlot ?? null;
    const slotCommits = slotRegion
      ? Math.round(slotRegion.commitsPerSecond * probes.seconds)
      : null;
    const maxWrites = Math.ceil(windows.playbackMs / maxWaitMs) + 1;
    if (active.writes === 0) problems.push('no draft write ran while playing');
    if (!playing) problems.push('the transport stopped during the window');
    if (!gesture.target.changed) {
      problems.push(`the drag never changed ${slider.track}'s volume`);
    }
    if (!active.slotFound) problems.push('no TopRail slot on screen');
    problems.push(...probeProblems(probes));
    return {
      setup: session.setup,
      control: { track: slider.track, trackId: slider.trackId },
      input,
      active,
      idle: idleWindow,
      finalValue,
      slotCommits,
      probes,
      targets: {
        writesAtMost: maxWrites,
        writesOk: active.writes <= maxWrites,
        mainThreadP95BudgetMs: 5,
        // null: the editor does not mark it yet (unmeasured, not missed).
        mainThreadOk:
          active.mainThreadMs.n > 0 ? active.mainThreadMs.p95 <= 5 : null,
        noLongTaskOnWrite: active.longTasksOverlappingWrites === 0,
        noMirrorWhileVisible: active.mirrorWrites === 0,
        slotCommitsOk:
          slotCommits === null
            ? null
            : slotCommits <= active.chipFlips + active.undoFlips + 1,
        slotFramesOk: active.slotFrames <= active.chipFlips + active.undoFlips,
        idleNoWrites: idleWindow.writes === 0,
        finalValueCommitted:
          finalValue.store !== null && finalValue.draft === finalValue.store,
      },
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

/* ── Timeline scroll and zoom over long audio (milestone 1.8) ──────────── */

/**
 * Percentiles of `values` (others skipped) the probes' way: the value at
 * floor(p × n) of the sorted list. `n` 0 means nothing was measured.
 */
function percentiles(values, digits = 2) {
  const sorted = values.filter(isNumber).sort((a, b) => a - b);
  const at = (p) =>
    sorted.length
      ? round(
          sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))],
          digits,
        )
      : null;
  return {
    n: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    max: sorted.length ? round(sorted.at(-1), digits) : null,
  };
}

/**
 * In-page: defines window.__maTimelineCanvas(), the arrange view's canvas
 * (the one in the track area's scroller), and starts counting the
 * Timeline's draw measures for the rest of the page's life, so a run can
 * tell an editor that does not mark its draws (unmeasured) from a window in
 * which nothing drew (0).
 */
function installTimelineHelpers(drawName) {
  window.__maTimelineCanvas = () =>
    [...document.querySelectorAll('canvas')].find(
      (canvas) =>
        canvas.parentElement?.classList.contains('overflow-x-hidden') &&
        canvas.closest('.overflow-auto'),
    ) ?? null;
  const seen = { count: 0 };
  window.__maTimelineDraws = seen;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === drawName) seen.count += 1;
      }
    }).observe({ type: 'measure' });
  } catch {
    // No user timing observer: every draw reads as unmeasured.
  }
}

/**
 * In-page: replaces the project's tracks with `count` audio tracks, each
 * holding one clip of `seconds` of stereo audio at `sampleRate` from bar 1.
 * Each clip's AudioBuffer is made here: a tone of two partials and a little
 * noise, tiled under a gain that changes every beat, so the waveform has
 * shape at every zoom. The buffers go into the app's AudioBufferStore by the
 * dev server's module URL (the module instance the app imports), before
 * their clips, so nothing goes looking for them. Each clip has an assetId,
 * as a cloud project's clips have once opened: without one, the draft
 * autosave would encode and store ~200 MB of audio (pendingMedia.ts) during
 * the measured windows. window.__maStems keeps the buffers, so the run can
 * check the store hands back the same objects.
 */
async function injectStems({ count, seconds, sampleRate, bufferStore }) {
  const audio = await import(bufferStore);
  const store = window.__MA_STORE__;
  const actions = store.getState();
  for (const track of actions.tracks) actions.removeTrack(track.id);
  actions.setTimelineZoom(1);
  actions.setTimelineScrollLeft(0);
  const { bpm } = store.getState();
  const length = seconds * sampleRate;
  const beat = Math.round((sampleRate * 60) / bpm);
  const durationTicks = Math.round((seconds / 60) * bpm * 480);
  const started = performance.now();
  const stems = [];
  for (let i = 0; i < count; i += 1) {
    let seed = 1 + i * 7919;
    const random = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      return (seed >>> 8) / 16_777_216;
    };
    const freq = 55 * (i + 1);
    const cycle = new Float32Array(sampleRate);
    for (let j = 0; j < sampleRate; j += 1) {
      const phase = (2 * Math.PI * freq * j) / sampleRate;
      cycle[j] =
        0.6 * Math.sin(phase) +
        0.25 * Math.sin(2.01 * phase) +
        0.15 * (2 * random() - 1);
    }
    const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let start = 0; start < length; start += beat) {
      const gain = 0.2 + 0.8 * random();
      const end = Math.min(length, start + beat);
      for (let j = start; j < end; j += 1) {
        const value =
          cycle[j % sampleRate] * gain * (1 - (0.7 * (j - start)) / beat);
        left[j] = value;
        right[j] = 0.9 * value;
      }
    }
    const trackId = actions.addTrack('audio', 'none', `Stem ${i + 1}`);
    if (!trackId) {
      return { reason: `the project refused audio track ${i + 1}` };
    }
    const clipId = `perf-stem-${i + 1}`;
    audio.setAudioBuffer(clipId, buffer);
    store.getState().addAudioClip(trackId, {
      id: clipId,
      startTick: 0,
      duration: durationTicks,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: `perf-stem-asset-${i + 1}`,
    });
    stems.push({ trackId, clipId, buffer });
  }
  window.__maStems = stems;
  const { tracks } = store.getState();
  return {
    count: stems.length,
    seconds,
    sampleRate,
    channels: 2,
    bpm,
    durationTicks,
    buildMs: Math.round(performance.now() - started),
    tracks: tracks.length,
    audioClips: tracks.reduce((sum, track) => sum + track.audioClips.length, 0),
    sameBuffers: stems.every(
      (stem) => audio.getAudioBuffer(stem.clipId) === stem.buffer,
    ),
  };
}

/**
 * In-page: what one Timeline draw shows of the stems. It wraps the 2D
 * context's beginPath, quadraticCurveTo, fill and fillText for the
 * Timeline's canvas only, nudges the scroll by 1 px so the Timeline draws,
 * waits three frames and unwraps. A waveform is a filled path of curves
 * (drawSmoothWaveform); a clip whose buffer the Timeline cannot see draws
 * "Loading…" (it has an assetId), and one whose peaks are still in the
 * worker draws a flat line, neither of which is a waveform.
 */
async function timelineWaveforms() {
  const canvas = window.__maTimelineCanvas();
  if (!canvas) return { reason: 'no Timeline canvas' };
  const proto = CanvasRenderingContext2D.prototype;
  const original = {
    beginPath: proto.beginPath,
    quadraticCurveTo: proto.quadraticCurveTo,
    fill: proto.fill,
    fillText: proto.fillText,
  };
  const seen = { curves: 0, waveforms: 0, loading: 0 };
  proto.beginPath = function (...rest) {
    if (this.canvas === canvas) seen.curves = 0;
    return original.beginPath.apply(this, rest);
  };
  proto.quadraticCurveTo = function (...rest) {
    if (this.canvas === canvas) seen.curves += 1;
    return original.quadraticCurveTo.apply(this, rest);
  };
  proto.fill = function (...rest) {
    if (this.canvas === canvas && seen.curves >= 2) seen.waveforms += 1;
    return original.fill.apply(this, rest);
  };
  proto.fillText = function (text, ...rest) {
    if (this.canvas === canvas && String(text).startsWith('Loading')) {
      seen.loading += 1;
    }
    return original.fillText.call(this, text, ...rest);
  };
  const store = window.__MA_STORE__.getState();
  const before = store.timelineScrollLeft;
  try {
    store.setTimelineScrollLeft(before + 1);
    for (let i = 0; i < 3; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  } finally {
    Object.assign(proto, original);
    window.__MA_STORE__.getState().setTimelineScrollLeft(before);
  }
  return { waveforms: seen.waveforms, loading: seen.loading };
}

/**
 * Waits until one Timeline draw shows a waveform for every stem: the peaks
 * worker summarises each long take, a channel at a time, after its first
 * draw. Gives up after 60 s and says what the last draw showed.
 */
async function waitForWaveforms(page, count, timeout = 60_000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeout) {
    last = await page.evaluate(timelineWaveforms);
    if (last.reason) return { drawn: false, ...last };
    if (last.waveforms >= count && last.loading === 0) break;
    await sleep(500);
  }
  return {
    drawn: last.waveforms >= count && last.loading === 0,
    waveforms: last.waveforms,
    loading: last.loading,
    ms: Date.now() - started,
  };
}

/** In-page: where to point the wheel, the middle of the visible track area. */
function timelinePoint() {
  const canvas = window.__maTimelineCanvas();
  const scroller = canvas?.closest('.overflow-auto');
  if (!scroller) return { reason: 'no Timeline canvas' };
  const box = scroller.getBoundingClientRect();
  const point = {
    x: Math.round(box.left + box.width / 2),
    y: Math.round(box.top + Math.min(box.height / 2, 200)),
  };
  if (document.elementFromPoint(point.x, point.y) !== canvas) {
    return {
      reason: 'the middle of the track area is not the Timeline',
      ...point,
    };
  }
  return point;
}

/**
 * In-page: starts collecting the Timeline's draw measures (their durations)
 * until stopDrawMonitor.
 */
function startDrawMonitor(drawName) {
  const monitor = { draws: [] };
  monitor.observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === drawName) monitor.draws.push(entry.duration);
    }
  });
  monitor.observer.observe({ type: 'measure' });
  window.__maDrawMonitor = monitor;
}

function stopDrawMonitor(drawName) {
  const monitor = window.__maDrawMonitor;
  for (const entry of monitor.observer.takeRecords()) {
    if (entry.name === drawName) monitor.draws.push(entry.duration);
  }
  monitor.observer.disconnect();
  return monitor.draws;
}

/** In-page: watches the Timeline's scroll and zoom until finishTimelineView. */
function watchTimelineView() {
  const store = window.__MA_STORE__;
  const now = store.getState();
  const track = (value) => ({
    from: value,
    to: value,
    min: value,
    max: value,
    writes: 0,
  });
  const watch = {
    scroll: track(now.timelineScrollLeft),
    zoom: track(now.timelineZoom),
  };
  const update = (entry, value) => {
    entry.writes += 1;
    entry.to = value;
    entry.min = Math.min(entry.min, value);
    entry.max = Math.max(entry.max, value);
  };
  watch.unsubscribe = store.subscribe((state, prev) => {
    if (state.timelineScrollLeft !== prev.timelineScrollLeft) {
      update(watch.scroll, state.timelineScrollLeft);
    }
    if (state.timelineZoom !== prev.timelineZoom) {
      update(watch.zoom, state.timelineZoom);
    }
  });
  watch.wheels = 0;
  watch.onWheel = () => {
    watch.wheels += 1;
  };
  window.addEventListener('wheel', watch.onWheel, {
    capture: true,
    passive: true,
  });
  window.__maViewWatch = watch;
}

function finishTimelineView() {
  const watch = window.__maViewWatch;
  watch.unsubscribe();
  window.removeEventListener('wheel', watch.onWheel, { capture: true });
  const rounded = (entry, digits) =>
    Object.fromEntries(
      Object.entries(entry).map(([key, value]) => [
        key,
        key === 'writes' ? value : Number(value.toFixed(digits)),
      ]),
    );
  return {
    scroll: rounded(watch.scroll, 0),
    zoom: rounded(watch.zoom, 3),
    wheels: watch.wheels,
  };
}

/** CDP's modifier bit for Ctrl (Input.dispatchMouseEvent). */
const CTRL_MODIFIER = 2;

/**
 * Sends wheel events at `point` for `ms`, one per 16 ms (a trackpad's
 * rate); `step(ms)` gives each one's deltas. Unlike sweep's moves they do
 * not wait for the page: Chrome acknowledges a wheel event only frames
 * later (~50 ms here, which would cap the rate at 20 a second), so they go
 * out at the device's pace and Chrome coalesces what a busy page has not
 * taken yet, as it does a real trackpad's. The page counts what it got.
 */
async function wheelFor(cdp, point, ms, step, modifiers = 0) {
  const started = Date.now();
  const sent = [];
  for (let t = 0; t < ms; t = Date.now() - started) {
    const { dx, dy } = step(t);
    sent.push(
      cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: point.x,
        y: point.y,
        deltaX: dx,
        deltaY: dy,
        modifiers,
      }),
    );
    const wait = sent.length * 16 - (Date.now() - started);
    if (wait > 0) await sleep(wait);
  }
  const seconds = (Date.now() - started) / 1000;
  const acks = await Promise.allSettled(sent);
  return {
    events: sent.length,
    eventsPerSecond: round(sent.length / seconds),
    failed: acks.filter((ack) => ack.status === 'rejected').length,
  };
}

/**
 * One wheel window over the Timeline: the probes, the draw measures, the
 * view's scroll and zoom and the wheel events the page received.
 */
async function recordWheel(session, windows, point, step, modifiers = 0) {
  const { page, cdp } = session;
  await page.mouse.move(point.x, point.y);
  await calmDown(page, windows.gestureGapMs);
  await startRecording(page);
  await page.evaluate(startDrawMonitor, TIMELINE_DRAW);
  await page.evaluate(watchTimelineView);
  const input = await wheelFor(cdp, point, windows.scrollMs, step, modifiers);
  await drainFrame(page);
  const view = await page.evaluate(finishTimelineView);
  const draws = await page.evaluate(stopDrawMonitor, TIMELINE_DRAW);
  const probes = await stopRecording(page);
  return { input: { ...input, received: view.wheels }, view, draws, probes };
}

async function timelineScroll({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile, TEMPLATE);
  const { page } = session;
  try {
    const problems = [];
    await page.evaluate(installTimelineHelpers, TIMELINE_DRAW);
    const stems = await page.evaluate(injectStems, {
      ...STEMS,
      bufferStore: BUFFER_STORE_MODULE,
    });
    if (stems.reason) throw new Error(stems.reason);
    if (!stems.sameBuffers) {
      problems.push(
        'the AudioBufferStore did not hand back the stems’ buffers',
      );
    }
    const ready = await waitForWaveforms(page, STEMS.count);
    if (ready.reason) throw new Error(ready.reason);
    if (ready.loading > 0) {
      problems.push(
        `the Timeline drew "Loading…" on ${ready.loading} clips: it does not see the buffers set through /src/daw/audio/AudioBufferStore.ts`,
      );
    } else if (!ready.drawn) {
      problems.push(
        `after ${round(ready.ms / 1000)} s the Timeline drew ${ready.waveforms} of ${STEMS.count} waveforms`,
      );
    }
    // The stems' summaries and the waveform checks leave work behind.
    const settled = await calmDown(page, 1500, 15_000);
    const point = await page.evaluate(timelinePoint);
    if (point.reason) throw new Error(point.reason);
    // Scroll: right for a second, left for a second, and so on (a trackpad's
    // horizontal swipe; the Timeline scrolls by deltaX).
    const scroll = await recordWheel(session, windows, point, (t) => ({
      dx: Math.floor(t / 1000) % 2 ? -40 : 40,
      dy: 0,
    }));
    // Zoom: Ctrl+wheel, in for half a second, out for half a second (each
    // event zooms 3% at the cursor).
    const zoom = await recordWheel(
      session,
      windows,
      point,
      (t) => ({ dx: 0, dy: Math.floor(t / 500) % 2 ? 100 : -100 }),
      CTRL_MODIFIER,
    );
    // The fader drag starts from the view the editor opened on.
    await page.evaluate(() => {
      const store = window.__MA_STORE__.getState();
      store.setTimelineZoom(1);
      store.setTimelineScrollLeft(0);
    });
    await nextFrames(page);
    await calmDown(page, windows.gestureGapMs);
    const slider = await page.evaluate(findVolumeSlider);
    if (!slider?.trackId) throw new Error('no track volume slider on screen');
    const centre = slider.left + slider.width / 2;
    const reach = slider.width * 0.3;
    await page.evaluate(startDrawMonitor, TIMELINE_DRAW);
    const gesture = await recordGesture(
      page,
      windows,
      { x: slider.thumbX, y: slider.y },
      (t) => ({
        x: centre + reach * Math.sin((2 * Math.PI * t) / 500),
        y: slider.y,
      }),
      { kind: 'volume', trackId: slider.trackId },
    );
    const faderDraws = await page.evaluate(stopDrawMonitor, TIMELINE_DRAW);
    const instrumented = await page.evaluate(
      () => window.__maTimelineDraws.count > 0,
    );
    problems.push(
      ...probeProblems(scroll.probes),
      ...probeProblems(zoom.probes),
      ...probeProblems(gesture.probes),
    );
    if (scroll.view.scroll.writes === 0) {
      problems.push('the wheel never scrolled the Timeline');
    }
    if (zoom.view.zoom.writes === 0) {
      problems.push('Ctrl+wheel never zoomed the Timeline');
    }
    if (!gesture.watch.target.changed) {
      problems.push(`the fader drag never changed ${slider.track}'s volume`);
    }
    // null: the editor does not mark its draws (unmeasured, not missed).
    const drawStats = (list) => (instrumented ? percentiles(list) : null);
    const scrollDraws = drawStats(scroll.draws);
    return {
      setup: { ...session.setup, settled },
      stems,
      ready,
      instrumented,
      point,
      scroll: {
        input: scroll.input,
        view: scroll.view.scroll,
        draws: scrollDraws,
        probes: scroll.probes,
      },
      zoom: {
        input: zoom.input,
        view: zoom.view.zoom,
        scrollView: zoom.view.scroll,
        draws: drawStats(zoom.draws),
        probes: zoom.probes,
      },
      draws: drawStats([...scroll.draws, ...zoom.draws]),
      fader: {
        control: { track: slider.track, trackId: slider.trackId },
        draws: instrumented ? faderDraws.length : null,
        drawMs: drawStats(faderDraws),
        gesture,
      },
      targets: {
        drawP95BudgetMs: DRAW_P95_TARGET_MS,
        scrollDrawP95Ok:
          scrollDraws?.n > 0 ? scrollDraws.p95 <= DRAW_P95_TARGET_MS : null,
        faderNoRedraw: instrumented ? faderDraws.length === 0 : null,
      },
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

/* ── Score note edits (milestone 1.8) ──────────────────────────────────── */

/**
 * In-page: replaces the project's tracks with `parts` MIDI tracks of `bars`
 * bars of 4/4, every bar filled. Each bar takes one of seven rhythms
 * (quarters; eighths, a quarter and a half; a whole note; a dotted quarter;
 * sixteenths; two halves; a mix), each part starting at another one, and
 * the pitches walk the C major scale in the part's range, so the engraver
 * meets beams, dots, flags, ledger lines and both clefs. The Piano part adds
 * a third above every half or whole note. Every part plays the Oracle synth,
 * which loads no samples.
 */
function injectScore({ parts, bars }) {
  const store = window.__MA_STORE__;
  const actions = store.getState();
  for (const track of actions.tracks) actions.removeTrack(track.id);
  actions.setTimeSignature(4, 4);
  const barTicks = 1920;
  const rhythms = [
    [480, 480, 480, 480],
    [240, 240, 480, 960],
    [1920],
    [720, 240, 480, 480],
    [120, 120, 240, 480, 960],
    [960, 960],
    [480, 240, 240, 240, 240, 480],
  ];
  const scale = [0, 2, 4, 5, 7, 9, 11];
  const voices = [
    { name: 'Flute', low: 72 },
    { name: 'Violin', low: 67 },
    { name: 'Piano', low: 60, thirds: true },
    { name: 'Horn', low: 53 },
    { name: 'Cello', low: 43 },
    { name: 'Bass', low: 33 },
  ];
  const pitch = (low, step) =>
    low + 12 * Math.floor(step / 7) + scale[step % 7];
  let notes = 0;
  const made = [];
  for (let p = 0; p < parts; p += 1) {
    const voice = voices[p % voices.length];
    const trackId = actions.addTrack('midi', 'oracle-synth', voice.name);
    if (!trackId) return { reason: `the project refused MIDI track ${p + 1}` };
    let seed = 17 + p * 104_729;
    const random = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      return (seed >>> 8) / 16_777_216;
    };
    let step = 3 + Math.floor(random() * 5);
    const events = [];
    for (let bar = 0; bar < bars; bar += 1) {
      let tick = bar * barTicks;
      for (const duration of rhythms[(bar + 2 * p) % rhythms.length]) {
        step = Math.max(0, Math.min(12, step + Math.floor(random() * 5) - 2));
        const base = {
          velocity: 90,
          startTick: tick,
          durationTicks: duration,
          channel: 0,
        };
        events.push({ ...base, note: pitch(voice.low, step) });
        if (voice.thirds && duration >= 960) {
          events.push({ ...base, note: pitch(voice.low, step + 2) });
        }
        tick += duration;
      }
    }
    notes += events.length;
    actions.addMidiClip(trackId, {
      id: `perf-score-${p + 1}`,
      name: voice.name,
      startTick: 0,
      durationTicks: bars * barTicks,
      events,
    });
    made.push({ trackId, name: voice.name, notes: events.length });
  }
  return {
    parts: made.length,
    bars,
    notes,
    tracks: store.getState().tracks.length,
    made,
  };
}

/** In-page: the sum of every MIDI note's pitch, to see a transposition. */
function scorePitchSum() {
  let sum = 0;
  for (const track of window.__MA_STORE__.getState().tracks) {
    for (const clip of track.midiClips) {
      for (const event of clip.events) sum += event.note;
    }
  }
  return sum;
}

/**
 * In-page: resolves once the Score shows noteheads and its DOM has not
 * changed for `quietMs` (at most `timeout`), timed from the call (the view
 * switch is made just before it).
 */
function waitForEngraving({ quietMs, timeout }) {
  return new Promise((resolve) => {
    const started = performance.now();
    let lastChange = started;
    const observer = new MutationObserver(() => {
      lastChange = performance.now();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const check = () => {
      const now = performance.now();
      const stavenotes = document.querySelectorAll('.vf-stavenote').length;
      const quiet = stavenotes > 0 && now - lastChange >= quietMs;
      if (quiet || now - started >= timeout) {
        observer.disconnect();
        resolve({
          engraved: quiet,
          stavenotes,
          noteheads: document.querySelectorAll('.vf-notehead').length,
          svgs: new Set(
            [...document.querySelectorAll('.vf-stavenote')].map((note) =>
              note.closest('svg'),
            ),
          ).size,
          // From the switch to the last change before the quiet spell.
          lastChangeMs: Math.round(lastChange - started),
          ms: Math.round(now - started),
        });
      } else setTimeout(check, 100);
    };
    setTimeout(check, 100);
  });
}

/**
 * In-page: a notehead to click, the first one on screen that nothing
 * covers, in page coordinates.
 */
function pickScoreNote() {
  const notes = [...document.querySelectorAll('.vf-stavenote')];
  for (const [index, note] of notes.entries()) {
    const head = note.querySelector('.vf-notehead');
    if (!head) continue;
    const box = head.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
      continue;
    }
    const hit = document.elementFromPoint(x, y);
    if (hit && note.contains(hit)) {
      return { x: Math.round(x), y: Math.round(y), index, of: notes.length };
    }
  }
  return { reason: 'no notehead of the Score is on screen and uncovered' };
}

/**
 * In-page: arms one edit's timing before the key is pressed. It notes the
 * keydown's timeStamp (input time), the first change to the Score's SVG
 * after it (a MutationObserver: the edit re-engraves in a layout effect)
 * and the second animation frame after that change, and keeps the Event
 * Timing entries (durationThreshold 16, buffered) and long tasks. The
 * observer's callback runs before this keydown listener does (the editor's
 * dispatcher handles the key first), so any change after arming counts.
 */
function armScoreEdit() {
  const arm = {
    timeStamp: null,
    mutatedAt: null,
    paintedAt: null,
    entries: [],
    longTasks: [],
  };
  arm.events = new PerformanceObserver((list) =>
    arm.entries.push(...list.getEntries()),
  );
  arm.events.observe({ type: 'event', durationThreshold: 16, buffered: true });
  try {
    arm.tasks = new PerformanceObserver((list) =>
      arm.longTasks.push(...list.getEntries()),
    );
    arm.tasks.observe({ type: 'longtask' });
  } catch {
    arm.tasks = null;
  }
  arm.onKey = (event) => {
    arm.timeStamp ??= event.timeStamp;
  };
  window.addEventListener('keydown', arm.onKey, { capture: true });
  const inScore = (record) =>
    record.target instanceof SVGElement ||
    [...record.addedNodes, ...record.removedNodes].some(
      (node) => node instanceof SVGElement || node.querySelector?.('svg'),
    );
  arm.mutations = new MutationObserver((records) => {
    if (arm.mutatedAt !== null || !records.some(inScore)) return;
    arm.mutatedAt = performance.now();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        arm.paintedAt = performance.now();
      }),
    );
  });
  arm.mutations.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  window.__maEdit = arm;
}

/**
 * In-page: waits for the armed edit's second frame (at most `timeout`),
 * then 150 ms more for its Event Timing entry, and returns its timings from
 * the keydown's timeStamp: Event Timing's duration (input to the next
 * paint, rounded to 8 ms; no entry means under its 16 ms threshold), the
 * input delay (processingStart − startTime), the processing
 * (processingEnd − processingStart) and the rest to the paint; and, as a
 * fallback that needs no Event Timing, the Score's first change and the
 * second rAF after it (the frame after the one that painted it, so up to a
 * frame late).
 */
async function awaitScoreEdit(timeout) {
  const arm = window.__maEdit;
  const started = performance.now();
  while (arm.paintedAt === null && performance.now() - started < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  arm.entries.push(...arm.events.takeRecords());
  arm.events.disconnect();
  if (arm.tasks) {
    arm.longTasks.push(...arm.tasks.takeRecords());
    arm.tasks.disconnect();
  }
  arm.mutations.disconnect();
  window.removeEventListener('keydown', arm.onKey, { capture: true });
  const t0 = arm.timeStamp;
  const ms = (value) => (value === null ? null : Number(value.toFixed(1)));
  const since = (at) => (at === null || t0 === null ? null : ms(at - t0));
  const keydown =
    t0 === null
      ? null
      : arm.entries.find(
          (entry) =>
            entry.name === 'keydown' && Math.abs(entry.startTime - t0) < 1,
        );
  const interaction = keydown?.interactionId
    ? arm.entries.filter(
        (entry) => entry.interactionId === keydown.interactionId,
      )
    : [];
  return {
    sawKey: t0 !== null,
    eventTiming: keydown
      ? {
          durationMs: keydown.duration,
          inputDelayMs: ms(keydown.processingStart - keydown.startTime),
          processingMs: ms(keydown.processingEnd - keydown.processingStart),
          presentationMs: ms(
            keydown.startTime + keydown.duration - keydown.processingEnd,
          ),
          interactionMs: interaction.length
            ? Math.max(...interaction.map((entry) => entry.duration))
            : keydown.duration,
        }
      : null,
    mutatedMs: since(arm.mutatedAt),
    rafMs: since(arm.paintedAt),
    longTasks: {
      count: arm.longTasks.length,
      totalMs: Math.round(
        arm.longTasks.reduce((sum, entry) => sum + entry.duration, 0),
      ),
    },
  };
}

async function scoreEdit({ browser, base, profile, windows }) {
  const session = await openDemo(browser, base, profile, TEMPLATE);
  const { page } = session;
  try {
    const problems = [];
    const score = await page.evaluate(injectScore, SCORE);
    if (score.reason) throw new Error(score.reason);
    // The new tracks' synths load, then the view switches.
    const loaded = await waitForQuiet(session.requests);
    await calmDown(page, 1000, 15_000);
    await page.evaluate(() =>
      window.__MA_STORE__.getState().setCurrentView('score'),
    );
    const engraving = await page.evaluate(waitForEngraving, {
      quietMs: 1000,
      timeout: 60_000,
    });
    if (!engraving.engraved) {
      throw new Error(
        `the Score never settled (${engraving.stavenotes} notes engraved after ${round(engraving.ms / 1000)} s)`,
      );
    }
    const settled = await calmDown(page, 1500, 15_000);
    const pick = await page.evaluate(pickScoreNote);
    if (pick.reason) throw new Error(pick.reason);
    await page.mouse.click(pick.x, pick.y);
    await nextFrames(page);
    const edits = [];
    for (let i = 1; i <= windows.edits; i += 1) {
      // Up, down, up…: every edit moves the note a step, and it stays put.
      const key = i % 2 ? 'ArrowUp' : 'ArrowDown';
      await calmDown(page, windows.gestureGapMs);
      const before = await page.evaluate(scorePitchSum);
      await startRecording(page);
      await page.evaluate(armScoreEdit);
      await page.keyboard.press(key);
      const timing = await page.evaluate(awaitScoreEdit, 10_000);
      const probes = await stopRecording(page);
      const after = await page.evaluate(scorePitchSum);
      const changed = key === 'ArrowUp' ? after > before : after < before;
      edits.push({
        edit: i,
        key,
        changed,
        pitchSum: { before, after },
        ...timing,
        reactCommits: Math.round(probes.reactCommitsPerSecond * probes.seconds),
        scoreViewCommits: Math.round(
          (probes.regions.ScoreView?.commitsPerSecond ?? 0) * probes.seconds,
        ),
        probes,
      });
      problems.push(...probeProblems(probes).map((p) => `edit ${i}: ${p}`));
      if (!timing.sawKey) problems.push(`edit ${i}: the page never saw ${key}`);
      if (!changed) {
        problems.push(`edit ${i} (${key}) did not move the selected note`);
      } else if (timing.rafMs === null) {
        problems.push(`edit ${i}: the Score never changed on screen`);
      }
    }
    // An edit without an entry was under Event Timing's 16 ms threshold.
    const eventMs = edits.map((e) => e.eventTiming?.durationMs ?? null);
    const paintMs = percentiles(
      edits.filter((e) => e.sawKey).map((e) => e.eventTiming?.durationMs ?? 16),
      0,
    );
    return {
      setup: { ...session.setup, loaded, settled },
      score,
      engraving,
      pick,
      edits,
      stats: {
        edits: edits.length,
        changed: edits.filter((e) => e.changed).length,
        eventTimingEntries: eventMs.filter(isNumber).length,
        eventMs: percentiles(eventMs, 0),
        paintMs,
        inputDelayMs: percentiles(
          edits.map((e) => e.eventTiming?.inputDelayMs),
        ),
        processingMs: percentiles(
          edits.map((e) => e.eventTiming?.processingMs),
        ),
        mutatedMs: percentiles(
          edits.map((e) => e.mutatedMs),
          1,
        ),
        rafMs: percentiles(
          edits.map((e) => e.rafMs),
          1,
        ),
        longTaskMs: spread(edits.map((e) => e.longTasks.totalMs)),
        reactCommits: spread(edits.map((e) => e.reactCommits)),
        scoreViewCommits: spread(edits.map((e) => e.scoreViewCommits)),
      },
      // Event Timing's input to paint, an edit under its threshold as 16 ms.
      // The target is the laptop's: other profiles report, not judge.
      targets: {
        paintP95BudgetMs: SCORE_PAINT_TARGET_MS,
        judged: profile === 'laptop',
        paintOk: paintMs.n > 0 ? paintMs.p95 <= SCORE_PAINT_TARGET_MS : null,
        rafOk:
          edits.length && edits.every((e) => isNumber(e.rafMs))
            ? percentiles(edits.map((e) => e.rafMs)).p95 <=
              SCORE_PAINT_TARGET_MS
            : null,
      },
      problems,
      pageErrors: session.errors,
    };
  } finally {
    await session.context.close();
  }
}

const RUNNERS = {
  idle,
  playback,
  views,
  'fader-drag': faderDrag,
  'note-drag': noteDrag,
  load,
  autosave,
  'timeline-scroll': timelineScroll,
  'score-edit': scoreEdit,
};

/* ── Summary ───────────────────────────────────────────────────────────── */

const cell = (value) =>
  value === null || value === undefined || value === ''
    ? '–'
    : String(value).replace(/\|/g, '\\|');
const mb = (bytes) =>
  typeof bytes === 'number' ? (bytes / 1e6).toFixed(2) : null;
const NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');
const noteName = (note) =>
  `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

/** "median (min–max)", or one number when the repeats agree or n is 1. */
function spreadCell(stats, digits = 1) {
  if (!stats) return null;
  const fixed = (value) => Number(value.toFixed(digits));
  const median = fixed(stats.median);
  return stats.n > 1 && stats.min !== stats.max
    ? `${median} (${fixed(stats.min)}–${fixed(stats.max)})`
    : `${median}`;
}

/**
 * Regions that committed, busiest first, as rates ("Timeline 30 ·
 * ChannelStrip 2.1 (4 ms/s)") or, given the window's length, as counts
 * ("ScoreView 6 (61 ms)"), which read better for a sub-second view switch.
 * Self-commit counters (Timeline, DawAppInner) have no render time.
 */
function regionList(regions = {}, seconds = null) {
  return Object.entries(regions)
    .filter(([, region]) => region.commitsPerSecond > 0)
    .sort((a, b) => b[1].commitsPerSecond - a[1].commitsPerSecond)
    .map(([id, region]) => {
      const commits = seconds
        ? Math.round(region.commitsPerSecond * seconds)
        : region.commitsPerSecond;
      if (!(region.msPerSecond > 0)) return `${id} ${commits}`;
      const time = seconds
        ? `${Math.round(region.msPerSecond * seconds)} ms`
        : `${region.msPerSecond} ms/s`;
      return `${id} ${commits} (${time})`;
    })
    .join(' · ');
}

const keyList = (keys = []) =>
  keys
    .slice(0, 4)
    .map((row) => `${row.key} ${row.perSecond}`)
    .join(' · ');

/** "tracks 1 · liveAudioPeaks 1" from { key: perMove }. */
const perMoveList = (counts = {}) =>
  Object.entries(counts)
    .slice(0, 6)
    .map(([key, n]) => `${key} ${n}`)
    .join(' · ');

const frameCell = ({ frameMs }) =>
  `${cell(frameMs.p50)} / ${cell(frameMs.p95)} / ${cell(round(frameMs.max))}`;
const longTaskCell = ({ longTasks }) =>
  `${longTasks.count} / ${longTasks.totalMs} ms`;
const loafCell = ({ longAnimationFrames }) =>
  `${longAnimationFrames.count} / ${longAnimationFrames.blockingMs} ms`;

/** Why a run has no numbers, or null when it has them. */
function unusable(run) {
  if (run.error) return `error: ${run.error.split('\n')[0]}`;
  if (run.skipped) return `skipped: ${run.reason}`;
  return null;
}

function probeTable(runs, extraHeaders = [], extra = () => []) {
  const headers = [
    'profile',
    's',
    'frame p50 / p95 / max (ms)',
    'long tasks (n / total)',
    'LoAF (n / blocking)',
    'app rAF/s',
    'React commits/s',
    'store writes/s',
    'top store keys (/s)',
    'region commits/s',
    ...extraHeaders,
  ];
  const rows = runs.map((run) => {
    const why = unusable(run);
    if (why) return [run.profile, why];
    const p = run.probes;
    return [
      run.profile,
      p.seconds,
      frameCell(p),
      longTaskCell(p),
      loafCell(p),
      p.appRafCallsPerSecond,
      p.reactCommitsPerSecond,
      p.storeWritesPerSecond,
      keyList(p.storeKeys),
      regionList(p.regions),
      ...extra(run),
    ];
  });
  return table(headers, rows);
}

function autosaveTable(runs) {
  const yes = (ok) => (ok ? 'yes' : '**no**');
  const headers = [
    'profile',
    'writes (target)',
    'main thread per write p50 / p95 / max (ms, n)',
    'commit p50 / p95 / max (ms)',
    'long tasks (on a write)',
    'mirror writes',
    'slot commits / frames / chip + undo flips',
    'idle writes',
    'frame p95 (ms)',
    'TransportBar commits/s',
    'targets met',
  ];
  const rows = runs.map((run) => {
    const why = unusable(run);
    if (why) return [run.profile, why];
    const { active, idle: quiet, targets: t, probes } = run;
    const main = active.mainThreadMs;
    const commit = active.commitMs;
    const ms = (v) => (v === null ? '–' : v);
    // The yes/no targets (the others are their limits).
    const missed = Object.entries(t)
      .filter(([, value]) => value === false)
      .map(([key]) => key);
    return [
      run.profile,
      `${active.writes} (≤${t.writesAtMost})`,
      main.n > 0
        ? `${ms(main.p50)} / ${ms(main.p95)} / ${ms(main.max)} (n ${main.n})`
        : 'unmeasured (no snapshot/issued marks)',
      `${ms(commit.p50)} / ${ms(commit.p95)} / ${ms(commit.max)}`,
      `${active.longTasks} (${active.longTasksOverlappingWrites})`,
      active.mirrorWrites,
      `${run.slotCommits ?? '–'} / ${active.slotFrames} / ${active.chipFlips} + ${active.undoFlips}`,
      quiet.writes,
      probes.frameMs.p95,
      probes.regions?.TransportBar?.commitsPerSecond ?? 0,
      missed.length ? `${yes(false)}: ${missed.join(', ')}` : yes(true),
    ];
  });
  return table(headers, rows);
}

/** "n · p50 / p95 / max" of a percentiles() result; "unmeasured" for null. */
function drawCell(stats) {
  if (!stats) return 'unmeasured';
  if (!stats.n) return '0';
  return `${stats.n} · ${stats.p50} / ${stats.p95} / ${stats.max}`;
}

/** The yes/no targets of a run: "yes", or "**no**: the missed ones". */
function targetsCell(targets) {
  const missed = Object.entries(targets)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  const unmeasured = Object.entries(targets)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  if (missed.length) return `**no**: ${missed.join(', ')}`;
  return unmeasured.length ? `unmeasured: ${unmeasured.join(', ')}` : 'yes';
}

function timelineScrollTable(runs) {
  const headers = [
    'profile',
    'draws, scroll (n · p50 / p95 / max ms)',
    'draws, zoom (n · p50 / p95 / max ms)',
    'draws, both (n · p50 / p95 / max ms)',
    'wheel events sent / received (scroll; zoom)',
    'scroll px (min–max) · zoom (min–max)',
    'frame p95 (ms, scroll / zoom)',
    'long tasks (n / ms, scroll; zoom)',
    'React commits/s (scroll / zoom)',
    'Timeline commits/s (scroll / zoom)',
    'fader drag: Timeline draws (target 0)',
    'targets met',
  ];
  const rows = runs.map((run) => {
    const why = unusable(run);
    if (why) return [run.profile, why];
    const { scroll, zoom, fader } = run;
    const both = (get) => `${get(scroll)} / ${get(zoom)}`;
    return [
      run.profile,
      drawCell(scroll.draws),
      drawCell(zoom.draws),
      drawCell(run.draws),
      `${scroll.input.events} / ${scroll.input.received}; ${zoom.input.events} / ${zoom.input.received}`,
      `${scroll.view.min}–${scroll.view.max} · ${zoom.view.min}–${zoom.view.max}`,
      both((w) => w.probes.frameMs.p95),
      `${longTaskCell(scroll.probes)}; ${longTaskCell(zoom.probes)}`,
      both((w) => w.probes.reactCommitsPerSecond),
      both((w) => w.probes.regions.Timeline?.commitsPerSecond ?? 0),
      fader.draws === null
        ? 'unmeasured'
        : `${fader.draws} in ${fader.gesture.moves} moves`,
      targetsCell(run.targets),
    ];
  });
  return table(headers, rows);
}

function scoreEditTable(runs) {
  const headers = [
    'profile',
    'score',
    'engraved after switch (ms)',
    'edits changed',
    'Event Timing input → paint p50 / p95 / max (ms, entries)',
    'input delay / processing p95 (ms)',
    'rAF fallback p50 / p95 / max (ms)',
    'long-task ms / edit',
    'React commits / edit',
    'ScoreView commits / edit',
    `paint ≤${SCORE_PAINT_TARGET_MS} ms at p95 (laptop target)`,
  ];
  const rows = runs.map((run) => {
    const why = unusable(run);
    if (why) return [run.profile, why];
    const s = run.stats;
    const triple = (p) => `${cell(p.p50)} / ${cell(p.p95)} / ${cell(p.max)}`;
    const t = run.targets;
    const verdict = (ok) => (ok === null ? '–' : ok ? 'yes' : '**no**');
    return [
      run.profile,
      `${run.score.parts} parts × ${run.score.bars} bars, ${run.score.notes} notes`,
      run.engraving.lastChangeMs,
      `${s.changed} of ${s.edits}`,
      `${triple(s.paintMs)} (${s.eventTimingEntries} of ${s.edits})`,
      `${cell(s.inputDelayMs.p95)} / ${cell(s.processingMs.p95)}`,
      triple(s.rafMs),
      spreadCell(s.longTaskMs, 0),
      spreadCell(s.reactCommits, 0),
      spreadCell(s.scoreViewCommits, 0),
      t.judged
        ? `${verdict(t.paintOk)} (rAF ${verdict(t.rafOk)})`
        : 'not judged (laptop only)',
    ];
  });
  return table(headers, rows);
}

function viewsTable(runs) {
  const rows = [];
  for (const run of runs) {
    const why = unusable(run);
    if (why) {
      rows.push([run.profile, why]);
      continue;
    }
    for (const { view, first, later } of run.byView) {
      const firstSwitch = run.switches.find(
        (s) => s.view === view && s.round === 1,
      );
      rows.push([
        run.profile,
        view,
        first?.firstFrameMs,
        spreadCell(later?.firstFrameMs),
        first?.settledMs,
        spreadCell(later?.settledMs),
        first?.commits,
        first &&
          `${first.longTasks.count} / ${first.longTasks.totalMs} / ${first.longTasks.maxMs}`,
        spreadCell(later?.longTaskMs, 0),
        firstSwitch &&
          regionList(firstSwitch.probes.regions, firstSwitch.probes.seconds),
      ]);
    }
  }
  return table(
    [
      'profile',
      'switch to',
      'first frame, 1st switch (ms)',
      'first frame, later (ms)',
      'settled, 1st switch (ms)',
      'settled, later (ms)',
      'React commits, 1st switch',
      'long tasks, 1st switch (n / total / max ms)',
      'long-task ms, later',
      'region commits, 1st switch (render ms)',
    ],
    rows,
  );
}

function practiceTable(runs) {
  const rows = runs
    .filter((run) => run.practice)
    .map(({ profile, practice }) => {
      const s = practice.stats;
      if (!s.firstRenderMs) return [profile, practice.problems.join('; ')];
      return [
        profile,
        `${s.firstRenderMs.n} of ${practice.opens}`,
        spreadCell(s.moduleMs),
        spreadCell(s.mountedMs),
        spreadCell(s.firstRenderMs),
        spreadCell(s.mountedToFirstRenderMs),
        spreadCell(s.longTasks, 0),
        spreadCell(s.longTaskMs, 0),
      ];
    });
  return table(
    [
      'profile',
      'opens measured',
      'module mark (ms)',
      'mounted mark (ms)',
      'practice screen (ms)',
      'mounted → screen (ms)',
      'long tasks to then (n)',
      'long-task ms to then',
    ],
    rows,
  );
}

/** One row per profile for a drag; `target(run)` names what was dragged. */
function dragTable(runs, target) {
  const headers = [
    'profile',
    'target',
    'gestures',
    'moves/s',
    'store writes/s',
    'React commits/s',
    'store writes / move',
    'store writes / gesture',
    'undo steps / gesture',
    'React commits / move',
    'long-task ms / move',
    'frame p95 (ms)',
    'long tasks, all gestures (n / ms)',
    'store keys / move',
    'region commits / move',
  ];
  const rows = runs.map((run) => {
    const why = unusable(run);
    if (why) return [run.profile, why];
    const s = run.stats;
    if (!s) return [run.profile, target(run), 0];
    return [
      run.profile,
      target(run),
      s.gestures,
      spreadCell(s.movesPerSecond),
      spreadCell(s.writesPerSecond),
      spreadCell(s.commitsPerSecond),
      spreadCell(s.writesPerMove, 2),
      spreadCell(s.writesPerGesture, 0),
      s.undoStepsPerGesture ? spreadCell(s.undoStepsPerGesture, 0) : '–',
      spreadCell(s.commitsPerMove, 2),
      spreadCell(s.longTaskMsPerMove),
      spreadCell(s.frameP95),
      `${s.longTasks.count} / ${s.longTasks.totalMs}`,
      perMoveList(s.keysPerMove),
      perMoveList(s.regionCommitsPerMove),
    ];
  });
  return table(headers, rows);
}

/** What Play did, for the load table. */
function soundCell(r) {
  if (r.play.heard) {
    return r.expectSound
      ? r.play.playToFirstNonZeroMs
      : `${r.play.playToFirstNonZeroMs} (not expected)`;
  }
  const silent = `none in ${round(r.play.silentForMs / 1000)} s`;
  return r.expectSound ? `**${silent}**` : `${silent} (expected)`;
}

function loadTable(runs) {
  const rows = [];
  for (const run of runs) {
    const why = unusable(run);
    if (why) {
      rows.push([run.profile, why]);
      continue;
    }
    for (const r of run.runs) {
      if (!r.play) {
        rows.push([run.profile, r.target, r.problems.join('; ')]);
        continue;
      }
      const groups = (bytes, key) =>
        ['selfCode', 'selfAssets', 'thirdParty']
          .map((group) =>
            key === 'bytes' ? mb(bytes[group].bytes) : bytes[group].requests,
          )
          .join(' / ');
      const { beforePlay, beforeFirstAudio, total } = r.bytes;
      rows.push([
        run.profile,
        r.target,
        r.dawApp?.startMs,
        r.marks.module?.firstMs,
        r.marks.mounted?.firstMs,
        r.addTrackVisibleMs,
        r.play.clickMs,
        r.marks['engine-ready']?.firstMs,
        soundCell(r),
        r.play.firstNonZeroMs,
        groups(beforePlay, 'bytes'),
        groups(beforeFirstAudio, 'bytes'),
        groups(beforeFirstAudio, 'requests'),
        groups(total, 'bytes'),
      ]);
    }
  }
  return table(
    [
      'profile',
      'load',
      'DawApp request',
      'module mark',
      'mounted mark',
      'Add Track shown',
      'Play clicked',
      'engine-ready mark',
      'Play → first sound',
      'first sound',
      'MB before Play',
      'MB before first sound',
      'requests before first sound',
      'MB by run end',
    ],
    rows,
  );
}

/** Every uncaught page error of a run, its practice opens and cold loads. */
function pageErrorsOf(run) {
  return [
    ...(run.pageErrors ?? []),
    ...(run.practice?.runs ?? []).flatMap((r) => r.pageErrors ?? []),
    ...(run.runs ?? []).flatMap((r) => r.pageErrors ?? []),
  ];
}

function pageErrorNote(results) {
  const lines = results.flatMap((run) => {
    const errors = pageErrorsOf(run);
    if (!errors.length) return [];
    const first = errors[0].split('\n')[0].slice(0, 200).replace(/`/g, "'");
    return [
      `- ${run.scenario} on ${run.profile}: ${errors.length} (first: \`${first}\`)`,
    ];
  });
  return lines.length ? lines.join('\n') : 'None.';
}

/**
 * The machine's load around each run, and the page CPU check per profile.
 * Checks share the machine (and the dev server) with whatever else runs,
 * and a busy machine inflates every timing here, so a baseline says how
 * quiet it was.
 */
function machineNote(results, limits) {
  const loads = results
    .flatMap((run) => [run.machine?.load1mStart, run.machine?.load1mEnd])
    .filter(isNumber);
  if (!loads.length) return 'Not recorded.';
  const highest = Math.max(...loads);
  const range = `${Math.min(...loads)}–${highest} on ${limits.cores} cores`;
  const lines = [
    highest > limits.busyAbove
      ? `**Busy: the 1-minute load average reached ${range} (busy above ` +
        `${limits.busyAbove}).** Timings are likely inflated; re-run on a ` +
        'quiet machine before comparing them with a baseline.'
      : `1-minute load average ${range} (busy above ${limits.busyAbove}).`,
  ];
  const busy = spread(results.map((run) => run.machine?.cpuBusy));
  if (busy) {
    const [low, high] = [busy.min, busy.max].map((v) => Math.round(v * 100));
    lines.push(
      `The cores were ${low === high ? low : `${low}–${high}`}% busy during ` +
        "the scenarios, this run's browser included.",
    );
  }
  const checks = [...new Set(results.map((run) => run.profile))]
    .map((profile) => {
      const stats = spread(
        results
          .filter((run) => run.profile === profile)
          .flatMap((run) => [run.setup?.pageCheckMs]),
      );
      return stats && `${profile} ${spreadCell(stats)}`;
    })
    .filter(Boolean);
  if (checks.length) {
    lines.push(
      `Page CPU check (a fixed JS loop timed in each scenario's page, ms): ` +
        `${checks.join(' · ')}. Under one profile it should not change ` +
        'between runs; when it is slower, so is everything else.',
    );
  }
  const slow = results.filter((run) => run.slowPage);
  if (slow.length) {
    const list = slow
      .map(
        ({ scenario, profile, slowPage }) =>
          `${scenario} on ${profile} (${slowPage.pageCheckMs} against ` +
          `${slowPage.fastestMs})`,
      )
      .join(', ');
    lines.push(
      `**Slowed down: the page CPU check took over ${SLOW_PAGE_RATIO}× the ` +
        `fastest at the same CPU throttle in ${list}.** Those scenarios' ` +
        'timings are not comparable.',
    );
  }
  if (limits.maxLoad !== null) {
    lines.push(
      `${limits.baseline ? 'This run writes a baseline, so a' : 'With --max-load, a'} ` +
        `load average above ${limits.maxLoad} or a slowed-down page fails it.`,
    );
  }
  return lines.join(' ');
}

/** Whether the load average or a page CPU check says the machine was busy. */
function wasBusy(results, limits) {
  const loads = results.flatMap((run) => [
    run.machine?.load1mStart,
    run.machine?.load1mEnd,
  ]);
  return (
    loads.some((load) => isNumber(load) && load > limits.busyAbove) ||
    results.some((run) => run.slowPage)
  );
}

function summarize(results, meta, limits) {
  const of = (scenario) => results.filter((run) => run.scenario === scenario);
  const { windows } = meta;
  const seconds = (ms) => `${ms / 1000} s`;
  const repeats = (n, what) => `${n} ${what}${n === 1 ? '' : 's'}`;
  const sections = [
    '# Studio editor perf baseline',
    '',
    `${meta.date} · commit ${meta.commit}${meta.dirty ? ' (dirty)' : ''} · ${meta.base} · Chrome ${meta.chrome} · GPU ${meta.gpu} · audio ${meta.audio}${meta.audio === 'fake' ? ' · **--fake-audio (not a baseline)**' : ''}${windows.quick ? ' · **--quick (not a baseline)**' : ''}`,
    '',
    ...(wasBusy(results, limits)
      ? [
          '**The machine was busy during this run (see Machine load), so its',
          'timings are inflated and are not a baseline.**',
          '',
        ]
      : []),
    'Written by scripts/studio-perf/perf.mjs; this run only. Times in ms;',
    'load times are from navigation start. Profiles: chromebook 1366×655 4×',
    'CPU throttle (10 Mbps / 40 ms on loads), laptop 1440×787 DPR 2, small',
    '1280×720. A cell that reads "a (b–c)" is the median of the repeats and',
    'their range. Region counts come from the DevProfiler wrappers in',
    'DawApp; TransportBar also counts its own commits under the same id, and',
    'Timeline and DawAppInner count only their own (no render time).',
  ];
  const add = (scenario, title, body, note) => {
    if (!of(scenario).length) return;
    sections.push('', `## ${title}`, '', body);
    if (note) sections.push('', note);
  };
  add(
    'idle',
    `Idle (stopped, ${seconds(windows.idleMs)})`,
    probeTable(of('idle')),
    'Stage A exit target (chromebook): no rAF loops while idle.',
  );
  add(
    'playback',
    `Playback (${seconds(windows.playbackMs)}, demo-midnight-groove, ${meta.loop ? '4-bar loop on' : 'no loop'})`,
    probeTable(
      of('playback'),
      ['master peak', 'audible share', 'playhead (distinct / wraps)'],
      (run) => [
        run.audio.maxPeak,
        run.audio.audibleShare,
        `${run.playhead.distinct} / ${run.playhead.wraps}`,
      ],
    ),
    'Stage A exit targets (chromebook): 0 store writes/s; 0 commits/s in ' +
      'DawAppInner, top bar, Timeline, track headers and dock; ≤1 long task ' +
      'per 20 s; p95 frame ≤20 ms. The playhead column counts the distinct ' +
      'playhead positions in the 250 ms samples and the loop wraps among them.',
  );
  if (of('views').length) {
    add(
      'views',
      `View switches (1st switch, then ${repeats(windows.repeat, 'later round')})`,
      viewsTable(of('views')),
      'A 1st switch mounts the view for the first time in the session; ' +
        '"later" is the median and range of the later rounds. arrange is ' +
        'the view the editor opened on, so its 1st switch is a return.',
    );
    sections.push(
      '',
      `### Practice track first render (${repeats(windows.repeat, 'cold open')} of ?practiceMode=dorian&practiceRoot=d)`,
      '',
      practiceTable(of('views')),
    );
  }
  const gestures = `${repeats(windows.repeat, 'gesture')} of ${seconds(windows.dragMs)}`;
  add(
    'fader-drag',
    `Fader drag (first track volume, ${gestures})`,
    dragTable(of('fader-drag'), (run) => run.control?.track),
    'Stage A target: one store write, one undo entry and one Yjs update ' +
      'per gesture. Compare per-move numbers across profiles: a slower page ' +
      'takes fewer moves, so its per-second rates drop.',
  );
  add(
    'note-drag',
    `Note drag (docked Piano Roll, ${gestures})`,
    dragTable(
      of('note-drag'),
      (run) => run.pick && `${run.pick.track} ${noteName(run.pick.note.note)}`,
    ),
    'The longest note of a melodic clip at bar 1 (the dock draws later ' +
      'clips in the wrong place today), dragged with the Select tool; every ' +
      'gesture starts from the clip as it was.',
  );
  add(
    'load',
    'Cold load and first sound',
    loadTable(of('load')),
    [
      'Times are ms from navigation start; Play is clicked as soon as Add',
      'Track shows. MB and request columns read dev-server code / app assets',
      '(e.g. /daw-assets/ samples) / third-party hosts. The dev server sends',
      'unbundled modules with inline source maps, far heavier than production',
      'chunks (see bundle.mjs), so these loads are a regression baseline for',
      'the dev path, not a production estimate. project-pop has empty tracks',
      'and no metronome, so silence is expected there: its run ends once its',
      `downloads finish, at least ${seconds(windows.silenceMs)} after Play.`,
      'Stage A targets: boot chunk ≤150 KB gzip; the editor paints without',
      'waiting for songs content; Play is never silent (1.12b).',
    ].join('\n'),
  );
  add(
    'autosave',
    `Draft autosave while playing and dragging a fader (${seconds(windows.playbackMs)}), then idle (${seconds(windows.idleMs)})`,
    autosaveTable(of('autosave')),
    [
      'R24 (milestone 1.4). Writes come from the DEV marks',
      'ma:draft:write:start/end. Main thread per write = the snapshot',
      '(ma:draft:snapshot:start/end) + write start to ma:draft:write:issued',
      '(budget 5 ms at p95; "unmeasured" until the editor sets those marks).',
      'Commit = write start to its commit, mostly disk wait (reported only).',
      'Targets: writes ≤ ceil(window / maxWait) + 1; no long task overlapping',
      'a write; no mirror write while visible; TopRail-slot React commits',
      '(DevProfiler EditorTopRailSlot) ≤ chip + Undo/Redo flips + 1, and no',
      'more DOM-changing frames than flips; 0 writes idle; the fader’s final',
      'volume is in the draft body. A missed target is listed here, not as a',
      'problem; an unmeasured one (null) is neither.',
    ].join('\n'),
  );
  add(
    'timeline-scroll',
    `Timeline scroll and zoom (${STEMS.count} × ${STEMS.seconds / 60}-minute stereo stems, ${seconds(windows.scrollMs)} each), then a fader drag (${seconds(windows.dragMs)})`,
    timelineScrollTable(of('timeline-scroll')),
    [
      `Draws are the Timeline's DEV measures ${TIMELINE_DRAW}, one per`,
      'canvas draw ("unmeasured" on a build without them). Scroll is a',
      'horizontal trackpad swipe (deltaX 40, direction flipped every',
      'second) and zoom Ctrl+wheel (in, then out, every half second),',
      'both at 60 events a second over the canvas; Chrome coalesces what',
      'a busy page has not taken. The stems are 48 kHz AudioBuffers made',
      'in the page with cloud-style asset ids, so the draft autosave',
      'leaves them alone. Stage A targets: a draw at p95',
      `≤${DRAW_P95_TARGET_MS} ms while scrolling (judged on the scroll`,
      'window), and a fader drag causes 0 Timeline draws.',
    ].join('\n'),
  );
  add(
    'score-edit',
    `Score note edits (${SCORE.parts} parts × ${SCORE.bars} bars of 4/4, ${repeats(windows.edits, 'edit')})`,
    scoreEditTable(of('score-edit')),
    [
      'A notehead clicked in the Score view, then ArrowUp and ArrowDown in',
      'turn (a step up or down), each after the page has calmed down, and',
      "each checked against the store's pitches. Input → paint is Event",
      "Timing's keydown duration (rounded to 8 ms; an edit with no entry",
      'was under its 16 ms threshold and counts as 16). The rAF fallback',
      "runs from the keydown's timeStamp to the second animation frame",
      "after the Score's SVG changed (up to a frame late). Target: a note",
      `edit paints in ≤${SCORE_PAINT_TARGET_MS} ms on the laptop profile; the chromebook is reported.`,
    ].join('\n'),
  );
  const problems = results.flatMap((run) =>
    [
      ...(run.error ? [run.error.split('\n')[0]] : []),
      ...(run.problems ?? []),
    ].map((problem) => `- ${run.scenario} on ${run.profile}: ${problem}`),
  );
  sections.push(
    '',
    '## Problems',
    '',
    problems.length ? problems.join('\n') : 'None.',
    '',
    '## Page errors',
    '',
    pageErrorNote(results),
    '',
    '## Machine load',
    '',
    machineNote(results, limits),
  );
  return `${sections.join('\n')}\n`;
}

/**
 * Writes markdown as the repo's Prettier formats it: a baseline that
 * check.mjs commits under docs/studio-perf/baselines must pass
 * `prettier . --check` (npm run lint), which aligns table columns.
 */
async function writeMarkdown(file, markdown) {
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(markdown, { ...options, filepath: file }));
}

/* ── Main ──────────────────────────────────────────────────────────────── */

/** Problems every scenario shares: loading in the window, a busy machine. */
function runProblems(run, limits) {
  const problems = [];
  const clock = run.setup?.audioClock;
  if (clock && !clock.runs) {
    problems.push(
      `the editor's audio clock did not advance after the engine started (${clock.advancedSec ?? '?'} s in ${clock.wallSec ?? '?'} s): ${AUDIO_CLOCK_STOPPED}`,
    );
  }
  if (run.setup?.settle && !run.setup.settle.quiet) {
    problems.push(
      'requests were still in flight 30 s after the engine started, so ' +
        'loading may overlap the measured windows',
    );
  }
  const peak = Math.max(run.machine.load1mStart, run.machine.load1mEnd);
  if (limits.maxLoad !== null && peak > limits.maxLoad) {
    problems.push(
      `the machine was busy (1-minute load average ${peak}, limit ` +
        `${limits.maxLoad}), so these timings are not a baseline`,
    );
  }
  return problems;
}

/**
 * Marks the runs whose page CPU check took over 1.5× the fastest check at
 * the same CPU throttle in this run: something slowed that page down,
 * whatever the load average (a lagging 1-minute mean) said. The check only
 * measures CPU speed, so laptop and small (both unthrottled) share one
 * reference, which still holds when every scenario of one profile was slow.
 * The mark goes into the run's JSON; in a baseline run (or with --max-load)
 * it is also a problem.
 */
function markSlowPages(results, limits, outDir) {
  const throttle = (run) => PROFILES[run.profile]?.cpuThrottle ?? 1;
  const fastest = {};
  for (const run of results) {
    const ms = run.setup?.pageCheckMs;
    if (isNumber(ms)) {
      fastest[throttle(run)] = Math.min(fastest[throttle(run)] ?? ms, ms);
    }
  }
  for (const run of results) {
    const ms = run.setup?.pageCheckMs;
    const reference = fastest[throttle(run)];
    if (!isNumber(ms) || ms <= SLOW_PAGE_RATIO * reference) continue;
    run.slowPage = { pageCheckMs: ms, fastestMs: reference };
    if (limits.maxLoad !== null) {
      run.problems.push(
        `the page ran slow (CPU check ${ms} ms, fastest at its CPU ` +
          `throttle ${reference} ms), so these timings are not a baseline`,
      );
    }
    writeJson(outDir, `${run.scenario}-${run.profile}`, run);
  }
}

export async function runPerf(argv = process.argv.slice(2)) {
  return withStudio(
    'perf',
    async ({ base, browser, args, outDir }) => {
      const scenarios = scenariosFrom(args);
      const profiles = profilesFrom(args);
      const windows = windowsFrom(args);
      const limits = loadLimits(args, outDir);
      const audio = audioMode(args);
      if (limits.baseline && audio === 'fake') {
        throw new Error(
          'a baseline times the real audio device: --fake-audio is refused for an --out under docs/studio-perf/baselines/',
        );
      }
      // Every scenario plays, so a machine whose clock is stopped fails here
      // rather than as a silent editor (and skewed timings) per scenario.
      const audioClockCheck = await requireAudioClock(browser);
      const meta = {
        date: new Date().toISOString(),
        base,
        ...gitState(),
        chrome: browser.version(),
        gpu:
          args.gpu ?? (process.platform === 'darwin' ? 'metal' : 'swiftshader'),
        // 'fake' (--fake-audio) output timings are not a device's.
        audio,
        audioClock: audioClockCheck,
        windows,
        loop: args.loop !== 'false',
        loadLimits: limits,
      };
      const results = [];
      for (const profile of profiles) {
        for (const scenario of scenarios) {
          console.log(`perf: ${scenario} on ${profile}`);
          const started = Date.now();
          const machineStart = machineNow();
          let data;
          try {
            data = await RUNNERS[scenario]({
              browser,
              base,
              profile,
              windows,
              args,
            });
          } catch (error) {
            data = { error: String(error?.stack ?? error).slice(0, 2000) };
          }
          const run = {
            scenario,
            profile,
            meta: { ...meta, profileSettings: PROFILES[profile] },
            runSeconds: round((Date.now() - started) / 1000),
            machine: machineBetween(machineStart, machineNow()),
            ...data,
          };
          run.problems = [...(run.problems ?? []), ...runProblems(run, limits)];
          writeJson(outDir, `${scenario}-${profile}`, run);
          results.push(run);
          const trouble = unusable(run) ?? run.problems.join('; ');
          console.log(`  ${trouble || 'ok'} (${run.runSeconds} s)`);
        }
      }
      markSlowPages(results, limits, outDir);
      const summary = join(outDir, 'summary.md');
      await writeMarkdown(summary, summarize(results, meta, limits));
      console.log(`perf: wrote ${summary}`);
      if (results.some((run) => run.error || run.problems.length)) {
        process.exitCode = 1;
      }
      return results;
    },
    argv,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await runPerf();
}
