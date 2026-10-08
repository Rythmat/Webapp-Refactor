/* eslint-env node */
/**
 * Perf and load scenarios for the Studio editor (/studio/editor): the
 * milestone 1.0 baseline of what the editor costs today, before Stage A's
 * fixes. It records numbers and never fails on a slow one. A run exits 1
 * only when a scenario could not measure what it claims (listed under each
 * scenario below), or when a baseline run finds the machine busy.
 *
 *   node scripts/studio-perf/perf.mjs --reuse=http://localhost:5263
 *        [--scenario=idle,playback,views,fader-drag,note-drag,load]
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
 * Every scenario except load opens ?demo=demo-midnight-groove in a fresh
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
 *   reads the master peak and the store's playhead; after the window it
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
];

const DEMO = '?demo=demo-midnight-groove';
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
 * A fresh page on the demo, the engine started and the network quiet. Every
 * interactive scenario starts here, so none inherits another's state.
 */
async function openDemo(browser, base, profile) {
  const opened = await newPage(browser, profile);
  const requests = trackRequests(opened.page);
  const started = Date.now();
  await openEditor(opened.page, base, DEMO);
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
    setup: {
      query: DEMO,
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
 * Samples the master peak and the store's playhead every 250 ms until
 * stopPeakMeter. The playhead is counted as moves forward and wraps back
 * (the loop's end), and as distinct positions.
 */
function startPeakMeter(audiblePeak) {
  const store = window.__MA_STORE__;
  const startPosition = store.getState().position;
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
  };
  meter.timer = setInterval(() => {
    meter.samples += 1;
    const position = store.getState().position;
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
    endPosition: state.position,
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
      grid = [...root.querySelectorAll('canvas')].find((canvas) =>
        canvas.parentElement?.classList.contains('overflow-auto'),
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
  const watch = {
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
  };
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

const RUNNERS = {
  idle,
  playback,
  views,
  'fader-drag': faderDrag,
  'note-drag': noteDrag,
  load,
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
      'store positions in the 250 ms samples and the loop wraps among them.',
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
