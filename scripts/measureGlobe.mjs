#!/usr/bin/env node
/* eslint-env node */
/**
 * The Atlas Globe page's performance baseline (Globe UI plan, prompt 1).
 *
 *   node scripts/measureGlobe.mjs [--baseline] [--runs=3] [--port=5266]
 *                                 [--base=http://localhost:5266]
 *                                 [--skip-bundle] [--skip-browser]
 *                                 [--cpu=4] [--gpu=metal|swiftshader]
 *                                 [--headed] [--out=file.json]
 *
 * Two parts, each skippable:
 *
 * BROWSER (`--skip-browser` to leave out). Starts a dev server of its own on
 * `--port` (or reuses the one at `--base`, which must run with
 * VITE_DEV_AUTH_BYPASS=1), opens /globe signed in through the dev
 * bypass (src/auth/devBypass.ts) in headless Chrome via playwright-core, and
 * per run, in a fresh browser context:
 *
 * - first globe frame: from navigation start to the first animation frame
 *   after the map's `atlas:globe-ready` mark (MapLibre's first complete
 *   frame);
 * - map bytes: what the page downloads that is not code — the label fonts
 *   and the country and state outlines — until 2 s after that mark, by
 *   kind;
 * - frame rate with Spin on: frames from requestAnimationFrame over 10 s,
 *   after a 1 s ramp, with the gap between frames (median, p95, max);
 * - JS heap 30 s after navigation start (CDP JSHeapUsedSize, before and
 *   after a forced garbage collection);
 * - city click to card: the camera is pointed at New Orleans through the
 *   page's dev-only hook (window.__atlasGlobeDebug), the pointer rests on
 *   its hex, and the time runs from the click event to the first animation
 *   frame after the card's heading is in the page;
 * - long tasks (PerformanceObserver 'longtask', over 50 ms) while opening
 *   that card (2 s from the click), while dragging the card's resize handle
 *   for 2 s with the city's first event expanded (an expanded event is what
 *   makes the card report its width to the globe), and while typing
 *   "louis armstrong" into search (from the first key to 0.5 s after the
 *   last);
 * - YouTube requests over the whole run, in which no video is ever played:
 *   the player's (its API, embed page and scripts on youtube.com and
 *   googlevideo.com) and the thumbnails' (ytimg.com, img.youtube.com), with
 *   the thumbnails' bytes. Expanding the city's first event in the drag step
 *   is what shows a video.
 *
 * The card, drag and search steps run with the CPU slowed down `--cpu`
 * times (4 by default, the studio-perf Chromebook profile's rate;
 * `--cpu=1` turns it off): unthrottled, a fast laptop shows no long tasks
 * at all, and the baseline could not show later work improving anything.
 * The same three windows also count React commits and MapLibreGlobe renders
 * (through a minimal React DevTools hook the page sees as DevTools), which
 * is how "the globe re-renders while the card is dragged" is measured.
 *
 * One warm-up load comes first (Vite transforms the modules on first
 * request) and is not counted; each figure is the median of `--runs` runs.
 * A dev server runs React in development mode with unminified modules, so
 * these numbers are a regression baseline for this machine, not what
 * students see. Port 5179 is the owner's dev server and is refused.
 *
 * BUNDLE (`--skip-bundle` to leave out). A production build into a temp
 * directory (never the repo's dist/) with a manifest and the visualizer's
 * raw data, reporting the atlas route chunk and every chunk the page loads
 * (raw and gzip level 9): the entry's (index.html and its preloads), the
 * route's (atlas.tsx and its static imports), and the chunks it imports
 * dynamically, the map engine on first render and the rest on demand. It
 * names the chunks that hold the map's renderer packages.
 *
 * Output: docs/globe-ui/runs/latest.json (git-ignored) unless --out, and,
 * with --baseline, docs/globe-ui/baseline.json. A run prints its numbers
 * beside the committed baseline's. docs/globe-ui/BASELINE.md explains them.
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { cpus, tmpdir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';
import { format, resolveConfig } from 'prettier';
import { OWNER_PORT, startServer, waitClosed } from './lib/devServer.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs/globe-ui');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
  }),
);
const RUNS = Number(args.runs ?? 3);
const PORT = Number(args.port ?? 5266);
const GPU =
  args.gpu ?? (process.platform === 'darwin' ? 'metal' : 'swiftshader');
const HEADED = args.headed === 'true';
/** CPU slow-down for the interaction steps (card, drag, search); 1 = none. */
const CPU = Number(args.cpu ?? 4);
const OUT = resolve(args.out ?? join(DOCS, 'runs/latest.json'));

if (PORT === OWNER_PORT) {
  console.error(
    `measure-globe: port ${OWNER_PORT} is the owner's dev server; pick another.`,
  );
  process.exit(2);
}

/** The city the card is opened on, and the camera altitude it is seen from. */
const CITY = {
  id: 'new-orleans',
  name: 'New Orleans',
  lat: 29.9511,
  lng: -90.0715,
  altitude: 1.4,
};
const SEARCH_TEXT = 'louis armstrong';

/* ── Shared ──────────────────────────────────────────────────────────── */

const median = (values) => {
  const list = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return +value.toFixed(1);
};

const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return +sorted[
    Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  ].toFixed(1);
};

const git = (...gitArgs) => {
  try {
    return execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

/** Env files the dev server and the build read, if this checkout has any. */
const hasEnvFile = ['.env', '.env.local'].some((f) =>
  existsSync(join(ROOT, f)),
);
/**
 * Placeholders for a checkout without env files (a cloud container):
 * src/constants/env.ts throws on a missing key, and with the dev bypass on
 * nothing calls Auth0 or the API. Real values from env files win.
 */
const PLACEHOLDER_ENV = hasEnvFile
  ? {}
  : {
      VITE_AUTH0_DOMAIN: 'placeholder.auth0.local',
      VITE_AUTH0_CLIENT_ID: 'placeholder',
      VITE_AUTH0_AUDIENCE: 'https://placeholder.local',
      VITE_AUTH0_REDIRECT_URI: 'http://localhost/callback',
      VITE_MUSIC_ATLAS_API_URL: 'http://localhost:3000',
    };

/* ── Browser ─────────────────────────────────────────────────────────── */

const SCREEN =
  GPU === 'metal'
    ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const LAUNCH =
  GPU === 'metal'
    ? {
        headless: !HEADED,
        args: [
          ...(HEADED ? [] : ['--headless=new']),
          '--use-angle=metal',
          '--ignore-gpu-blocklist',
          '--enable-gpu',
        ],
      }
    : {
        headless: !HEADED,
        args: [
          '--enable-unsafe-swiftshader',
          '--use-angle=swiftshader',
          '--ignore-gpu-blocklist',
        ],
      };

/** Frames a second and the gaps between frames over `[from, to]`. */
const frameRate = (stamps, from, to) => {
  const frames = stamps.filter((t) => t >= from && t <= to);
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const span = frames.length > 1 ? frames.at(-1) - frames[0] : 0;
  return {
    fps: span ? +(((frames.length - 1) / span) * 1000).toFixed(1) : null,
    gapMedianMs: quantile(gaps, 0.5),
    gapP95Ms: quantile(gaps, 0.95),
    gapMaxMs: gaps.length ? +Math.max(...gaps).toFixed(1) : null,
  };
};

/** Long tasks that overlap `[from, to]`: how many, their total and longest. */
const longTasksIn = (tasks, from, to) => {
  const hit = tasks.filter((t) => t.at + t.ms >= from && t.at <= to);
  return {
    count: hit.length,
    totalMs: hit.reduce((sum, t) => sum + t.ms, 0),
    maxMs: hit.length ? Math.max(...hit.map((t) => t.ms)) : 0,
  };
};

async function openGlobe(browser, base) {
  const context = await browser.newContext(SCREEN);
  await context.addInitScript(() => {
    window.__measure = { longTasks: [], frames: [], commits: [], globe: [] };
    // A minimal React DevTools hook: React reports every commit to it. A
    // commit counts as a map render when the map's fiber is a new
    // object that did work (PerformedWork, flag 1) in that commit.
    let lastGlobeFiber = null;
    const findGlobe = (fiber) => {
      const stack = [fiber];
      while (stack.length) {
        const node = stack.pop();
        if (node.type?.name === 'MapLibreGlobe') return node;
        if (node.sibling) stack.push(node.sibling);
        if (node.child) stack.push(node.child);
      }
      return null;
    };
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer) {
        const id = this.renderers.size + 1;
        this.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot(_id, root) {
        const at = performance.now();
        window.__measure.commits.push(at);
        const globe = findGlobe(root.current);
        if (globe && globe !== lastGlobeFiber && globe.flags & 1) {
          window.__measure.globe.push(at);
        }
        lastGlobeFiber = globe;
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      checkDCE() {},
    };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__measure.longTasks.push({
            at: Math.round(e.startTime),
            ms: Math.round(e.duration),
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // No long-task timing in this browser.
    }
    const tick = (t) => {
      window.__measure.frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  // YouTube traffic over the whole run, in which nothing is ever played: the
  // player (its API, embed page and scripts) and the thumbnails.
  const youtube = { player: 0, thumbs: 0, thumbBytes: 0 };
  // The map's own downloads (not code), with when each finished.
  const mapBytes = [];
  page.on('requestfinished', async (request) => {
    const kind = mapKind(request.url());
    if (kind) {
      const at = Date.now();
      try {
        const { responseBodySize } = await request.sizes();
        mapBytes.push({ kind, at, bytes: responseBodySize });
      } catch {
        /* the page closed first */
      }
    }
  });
  page.on('requestfinished', async (request) => {
    const host = new URL(request.url()).hostname;
    if (/(^|\.)ytimg\.com$|^img\.youtube\.com$/.test(host)) {
      youtube.thumbs += 1;
      try {
        youtube.thumbBytes += (await request.sizes()).responseBodySize;
      } catch {
        /* the page closed first */
      }
    } else if (
      /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com)$/.test(host)
    ) {
      youtube.player += 1;
    }
  });
  await page.goto(`${base}/globe`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => performance.getEntriesByName('atlas:globe-ready').length > 0,
    null,
    { timeout: 120_000 },
  );
  return { context, page, errors, youtube, mapBytes };
}

/**
 * What a request is, if it is the map's data rather than code: the label
 * fonts, or the country and state outlines.
 */
function mapKind(url) {
  const { pathname } = new URL(url);
  if (/\/fonts\/.+\.(otf|ttf|woff2?)$/.test(pathname)) return 'fonts';
  if (/\/geo\/.*\.json$/.test(pathname) || /naturalearth|geojson/i.test(url)) {
    return 'outlines';
  }
  return null;
}

const tasksNow = (page) =>
  page.evaluate(() => window.__measure.longTasks.slice());
/** React commits and MapLibreGlobe renders within `[from, to]`. */
const rendersIn = (page, from, to) =>
  page.evaluate(
    ([a, b]) => ({
      commits: window.__measure.commits.filter((t) => t >= a && t <= b).length,
      globeRenders: window.__measure.globe.filter((t) => t >= a && t <= b)
        .length,
    }),
    [from, to],
  );
const now = (page) => page.evaluate(() => performance.now());

async function runOnce(browser, base, index) {
  const { context, page, errors, youtube, mapBytes } = await openGlobe(
    browser,
    base,
  );
  const notes = [];
  const result = { run: index };

  // 1. The first globe frame.
  await page.waitForTimeout(500);
  result.firstFrame = await page.evaluate(() => {
    const ready = performance.getEntriesByName('atlas:globe-ready')[0];
    const frame = window.__measure.frames.find((t) => t >= ready.startTime);
    return {
      globeReadyMs: Math.round(ready.startTime),
      firstFrameMs: frame ? Math.round(frame) : null,
    };
  });
  // The map's bytes until 2 s after the first frame, by kind.
  const readyWall = await page.evaluate(
    () =>
      performance.timeOrigin +
      performance.getEntriesByName('atlas:globe-ready')[0].startTime,
  );
  await page.waitForTimeout(2000);
  result.mapKB = { fonts: 0, outlines: 0 };
  for (const { kind, at, bytes } of mapBytes) {
    if (at <= readyWall + 2000) result.mapKB[kind] += bytes / 1e3;
  }
  for (const kind of Object.keys(result.mapKB)) {
    result.mapKB[kind] = +result.mapKB[kind].toFixed(1);
  }

  // 2. Spin on for 10 s, after a 1 s ramp.
  await page.getByRole('button', { name: 'Spin the globe' }).click();
  await page.waitForTimeout(1000);
  const spinFrom = await now(page);
  await page.waitForTimeout(10_000);
  const spinTo = await now(page);
  const frames = await page.evaluate(() => window.__measure.frames.slice());
  result.spin = frameRate(frames, spinFrom, spinTo);
  await page.getByRole('button', { name: 'Stop the globe spinning' }).click();

  // 3. The heap, 30 s after navigation start.
  const elapsed = await now(page);
  if (elapsed < 30_000) await page.waitForTimeout(30_000 - elapsed);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heapOf = async () =>
    (await cdp.send('Performance.getMetrics')).metrics.find(
      (m) => m.name === 'JSHeapUsedSize',
    ).value;
  const heapBytes = await heapOf();
  await cdp.send('HeapProfiler.collectGarbage');
  const heapAfterGcBytes = await heapOf();
  result.heap = {
    usedMB: +(heapBytes / 1e6).toFixed(1),
    usedAfterGcMB: +(heapAfterGcBytes / 1e6).toFixed(1),
  };

  // 4. Click New Orleans' name; time to its card. From here on the CPU runs
  // slowed down (--cpu), so the main-thread cost of each step shows.
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.evaluate(
    ({ lat, lng, altitude }) =>
      window.__atlasGlobeDebug.pointOfView({ lat, lng, altitude }, 0),
    CITY,
  );
  await page.waitForTimeout(1500);
  const spot = await page.evaluate(
    ({ lat, lng }) => window.__atlasGlobeDebug.screenOf(lat, lng),
    { lat: CITY.lat, lng: CITY.lng },
  );
  // The globe's canvas starts below the toolbar; screenOf is in its pixels.
  const canvasBox = await page.locator('canvas').first().boundingBox();
  const x = canvasBox.x + spot.x;
  const y = canvasBox.y + spot.y;
  await page.mouse.move(x, y);
  // Let the map register the pointer before the click.
  await page.waitForTimeout(400);
  await page.evaluate((name) => {
    window.__measure.card = new Promise((done) => {
      let clickAt = null;
      window.addEventListener('click', (e) => (clickAt = e.timeStamp), {
        capture: true,
        once: true,
      });
      const look = () => {
        const heading = [...document.querySelectorAll('h3')].find(
          (h) => h.textContent?.trim() === name,
        );
        if (heading && clickAt !== null) {
          requestAnimationFrame((t) => done({ clickAt, shownAt: t }));
        } else requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
      setTimeout(() => done(null), 8000);
    });
  }, CITY.name);
  await page.mouse.click(x, y);
  const card = await page.evaluate(() => window.__measure.card);
  if (card) {
    result.cityToCardMs = Math.round(card.shownAt - card.clickAt);
    await page.waitForTimeout(2000);
    result.longTasksOpeningCard = longTasksIn(
      await tasksNow(page),
      card.clickAt,
      card.clickAt + 2000,
    );
    result.rendersOpeningCard = await rendersIn(
      page,
      card.clickAt,
      card.clickAt + 2000,
    );
  } else {
    result.cityToCardMs = null;
    result.longTasksOpeningCard = null;
    notes.push(`the click on ${CITY.name}'s hex opened no card`);
  }

  // 5. Expand the city's first event, then drag the resize handle for 2 s.
  if (card) {
    // Click the row's date line, clear of the links and buttons in it.
    await page.locator('[data-event-id]').first().locator('svg').last().click();
    await page.waitForTimeout(1500);
    // The Inspector is the handle's parent (its left edge); hover reveals
    // the handle.
    const handle = page.locator('[data-atlas-inspector-resizer]').first();
    const box = await handle.boundingBox();
    if (box) {
      const hx = box.x + box.width / 2;
      const hy = box.y + box.height / 2;
      // The card's widest point during the drag, as the page saw it.
      const widthBefore = await handle.evaluate((el) => {
        const card = el.parentElement;
        const start = card.getBoundingClientRect().width;
        window.__measure.cardWidthMax = start;
        new ResizeObserver(([entry]) => {
          window.__measure.cardWidthMax = Math.max(
            window.__measure.cardWidthMax,
            entry.borderBoxSize?.[0]?.inlineSize ?? 0,
          );
        }).observe(card);
        return start;
      });
      await page.mouse.move(hx, hy);
      await page.mouse.down();
      const dragFrom = await now(page);
      const started = Date.now();
      let step = 0;
      while (Date.now() - started < 2000) {
        // Out 160 px and back again, once a second.
        const phase = ((Date.now() - started) % 1000) / 1000;
        const dx = 160 * (phase < 0.5 ? phase * 2 : 2 - phase * 2);
        // Leftward: the handle is on the Inspector's left edge, so left widens.
        await page.mouse.move(hx - dx, hy);
        step++;
      }
      await page.mouse.up();
      const dragTo = await now(page);
      const widthMax = await page.evaluate(() => window.__measure.cardWidthMax);
      await page.waitForTimeout(300);
      const dragFrames = await page.evaluate(() =>
        window.__measure.frames.slice(),
      );
      result.drag = {
        moves: step,
        widthBefore: Math.round(widthBefore),
        widthMax: Math.round(widthMax),
        renders: await rendersIn(page, dragFrom, dragTo),
        longTasks: longTasksIn(await tasksNow(page), dragFrom, dragTo),
        frames: frameRate(dragFrames, dragFrom, dragTo),
      };
    } else {
      result.drag = null;
      notes.push('no resize handle on the card');
    }
  }

  // 6. Type into search: the command palette since prompt 6, opened from
  // the top bar's search button. Timing starts once its field is up, so the
  // palette's first (lazy) load is not counted as typing.
  await page.mouse.move(2, 2);
  await page.getByRole('button', { name: /^Search the globe/ }).click();
  const input = page.getByRole('combobox', {
    name: 'Search the globe or run a command',
  });
  await input.waitFor();
  const typeFrom = await now(page);
  await input.pressSequentially(SEARCH_TEXT, { delay: 90 });
  await page.waitForTimeout(500);
  const typeTo = await now(page);
  result.search = {
    longTasks: longTasksIn(await tasksNow(page), typeFrom, typeTo),
    renders: await rendersIn(page, typeFrom, typeTo),
  };
  await page.keyboard.press('Escape');

  result.youtube = {
    playerRequests: youtube.player,
    thumbRequests: youtube.thumbs,
    thumbKB: +(youtube.thumbBytes / 1e3).toFixed(1),
  };
  result.pageErrors = errors;
  result.notes = notes;
  await context.close();
  return result;
}

/** The median of each figure across runs. */
function summarizeRuns(runs) {
  const pick = (fn) => median(runs.map((r) => fn(r) ?? NaN));
  return {
    firstGlobeFrameMs: pick((r) => r.firstFrame.firstFrameMs),
    globeReadyMs: pick((r) => r.firstFrame.globeReadyMs),
    spinFps: pick((r) => r.spin.fps),
    spinGapP95Ms: pick((r) => r.spin.gapP95Ms),
    spinGapMaxMs: pick((r) => r.spin.gapMaxMs),
    heapMB: pick((r) => r.heap.usedMB),
    heapAfterGcMB: pick((r) => r.heap.usedAfterGcMB),
    cityToCardMs: pick((r) => r.cityToCardMs),
    openCardLongTasks: pick((r) => r.longTasksOpeningCard?.count),
    openCardLongTaskMs: pick((r) => r.longTasksOpeningCard?.totalMs),
    openCardLongestTaskMs: pick((r) => r.longTasksOpeningCard?.maxMs),
    openCardCommits: pick((r) => r.rendersOpeningCard?.commits),
    openCardGlobeRenders: pick((r) => r.rendersOpeningCard?.globeRenders),
    dragLongTasks: pick((r) => r.drag?.longTasks.count),
    dragLongTaskMs: pick((r) => r.drag?.longTasks.totalMs),
    dragLongestTaskMs: pick((r) => r.drag?.longTasks.maxMs),
    dragFps: pick((r) => r.drag?.frames.fps),
    dragCommits: pick((r) => r.drag?.renders.commits),
    dragGlobeRenders: pick((r) => r.drag?.renders.globeRenders),
    searchLongTasks: pick((r) => r.search.longTasks.count),
    searchLongTaskMs: pick((r) => r.search.longTasks.totalMs),
    searchLongestTaskMs: pick((r) => r.search.longTasks.maxMs),
    searchCommits: pick((r) => r.search.renders.commits),
    searchGlobeRenders: pick((r) => r.search.renders.globeRenders),
    youtubePlayerRequests: pick((r) => r.youtube?.playerRequests),
    youtubeThumbRequests: pick((r) => r.youtube?.thumbRequests),
    youtubeThumbKB: pick((r) => r.youtube?.thumbKB),
    mapFontsKB: pick((r) => r.mapKB?.fonts),
    mapOutlinesKB: pick((r) => r.mapKB?.outlines),
  };
}

async function measureBrowser() {
  let server = null;
  let base = args.base;
  if (!base) {
    console.log(`measure-globe: starting a dev server on ${PORT}`);
    server = await startServer({
      root: ROOT,
      port: PORT,
      env: {
        ...PLACEHOLDER_ENV,
        VITE_DEV_AUTH_BYPASS: '1',
        // Its own dep cache, so it never re-optimizes under the owner's server.
        VITE_CACHE_DIR: join(ROOT, 'node_modules/.vite-measure-globe'),
      },
      logFile: join(tmpdir(), 'measure-globe-server.log'),
    });
    base = `http://localhost:${PORT}`;
  }
  const browser = await chromium.launch(LAUNCH);
  try {
    console.log('measure-globe: warm-up load (not counted)');
    const warm = await openGlobe(browser, base);
    await warm.page.waitForTimeout(3000);
    const gpu = await warm.page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
    });
    await warm.context.close();
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      console.log(`measure-globe: run ${i} of ${RUNS}`);
      runs.push(await runOnce(browser, base, i));
    }
    return {
      server: args.base ? `reused ${args.base}` : `vite dev on ${PORT}`,
      browser: `Chrome ${browser.version()}${HEADED ? ' (headed)' : ' (headless)'}`,
      gpu: { mode: GPU, renderer: gpu, ...SCREEN },
      cpuThrottle: CPU,
      median: summarizeRuns(runs),
      runs,
    };
  } finally {
    await browser.close();
    if (server) {
      server.stop();
      await waitClosed(PORT);
    }
  }
}

/* ── Bundle ──────────────────────────────────────────────────────────── */

function build(tmp) {
  const env = {
    ...process.env,
    ...PLACEHOLDER_ENV,
    ANALYZE: '1',
    ANALYZE_JSON: join(tmp, 'bundle-raw.json'),
    ANALYZE_OUT: join(tmp, 'bundle.html'),
    NO_COLOR: '1',
  };
  delete env.NODE_ENV;
  return new Promise((done, fail) => {
    const child = spawn(
      join(ROOT, 'node_modules/.bin/vite'),
      ['build', '--outDir', join(tmp, 'dist'), '--emptyOutDir', '--manifest'],
      { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const log = [];
    child.stdout.on('data', (d) => log.push(String(d)));
    child.stderr.on('data', (d) => log.push(String(d)));
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) done(log.join(''));
      else {
        const error = new Error(`vite build exited with code ${code}`);
        error.log = log.join('');
        fail(error);
      }
    });
  });
}

/** The manifest keys a key reaches through static imports, itself included. */
function staticClosure(manifest, key, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return seen;
  seen.add(key);
  for (const next of manifest[key].imports ?? []) {
    staticClosure(manifest, next, seen);
  }
  return seen;
}

/** Packages whose code marks the map's renderer, for "where is MapLibre". */
const RENDERER_PACKAGES = ['maplibre-gl'];

/** The modules that load with the first render: the map engine. */
const FIRST_RENDER = /components\/Globe\/MapLibreGlobe\.tsx/;

async function measureBundle() {
  const tmp = mkdtempSync(join(tmpdir(), 'measure-globe-'));
  const dist = join(tmp, 'dist');
  console.log(`measure-globe: production build into ${tmp} (about a minute)`);
  try {
    await build(tmp);
    const manifest = JSON.parse(
      readFileSync(join(dist, '.vite/manifest.json'), 'utf8'),
    );
    const raw = JSON.parse(readFileSync(join(tmp, 'bundle-raw.json'), 'utf8'));
    const sizeOf = (file) => {
      const code = readFileSync(join(dist, file));
      return {
        rawBytes: code.length,
        gzipBytes: gzipSync(code, { level: 9 }).length,
      };
    };

    // Which output chunks carry each renderer package.
    const homes = Object.fromEntries(RENDERER_PACKAGES.map((p) => [p, {}]));
    for (const meta of Object.values(raw.nodeMetas)) {
      const pkg = RENDERER_PACKAGES.find((p) =>
        meta.id.includes(`/node_modules/${p}/`),
      );
      if (!pkg) continue;
      for (const [chunk, uid] of Object.entries(meta.moduleParts ?? {})) {
        const part = raw.nodeParts[uid];
        homes[pkg][chunk] =
          (homes[pkg][chunk] ?? 0) + (part?.renderedLength ?? 0);
      }
    }

    const entryKeys = staticClosure(manifest, 'index.html');
    const routeKey = 'src/components/atlas/atlas.tsx';
    if (!manifest[routeKey]) throw new Error(`no ${routeKey} in the manifest`);
    const routeKeys = [...staticClosure(manifest, routeKey)].filter(
      (key) => !entryKeys.has(key),
    );
    const loaded = new Set([...entryKeys, ...routeKeys]);

    // Dynamic imports the route reaches, each with what it adds.
    const dynamicKeys = new Set();
    for (const key of routeKeys) {
      for (const next of manifest[key].dynamicImports ?? []) {
        if (!loaded.has(next)) dynamicKeys.add(next);
      }
    }
    // The engine loads on the first render, and whatever it loads in turn
    // with it: that is first render too.
    for (const key of [...dynamicKeys]) {
      if (!FIRST_RENDER.test(key)) continue;
      for (const next of manifest[key].dynamicImports ?? []) {
        if (FIRST_RENDER.test(next) && !loaded.has(next)) dynamicKeys.add(next);
      }
    }
    const dynamic = [...dynamicKeys].map((key) => {
      const adds = [...staticClosure(manifest, key)].filter(
        (k) => !loaded.has(k),
      );
      const when = FIRST_RENDER.test(key)
        ? 'first render (the map engine)'
        : key.includes('MindMap')
          ? 'only with ?mindmap=1'
          : 'on demand';
      return { key, when, adds };
    });

    const row = (key, group) => {
      const chunk = manifest[key];
      const holds = RENDERER_PACKAGES.filter(
        (pkg) => homes[pkg][chunk.file] > 0,
      );
      return {
        group,
        file: chunk.file,
        source: chunk.src ?? chunk.name ?? key,
        ...sizeOf(chunk.file),
        css: (chunk.css ?? []).map((file) => ({ file, ...sizeOf(file) })),
        holds,
      };
    };
    const firstRender = dynamic.filter((d) => d.when.startsWith('first'));
    const chunks = [
      ...[...entryKeys].map((key) => row(key, 'entry')),
      ...routeKeys.map((key) => row(key, 'route')),
      ...firstRender.flatMap((d) =>
        d.adds.map((key) => row(key, 'first render')),
      ),
    ];
    const onDemand = dynamic
      .filter((d) => !d.when.startsWith('first'))
      .map((d) => ({
        source: manifest[d.key].src ?? d.key,
        when: d.when,
        chunks: d.adds.map((key) => ({
          file: manifest[key].file,
          ...sizeOf(manifest[key].file),
        })),
      }));

    const total = (list) =>
      list.reduce(
        (sum, c) => ({
          rawBytes:
            sum.rawBytes +
            c.rawBytes +
            c.css.reduce((s, css) => s + css.rawBytes, 0),
          gzipBytes:
            sum.gzipBytes +
            c.gzipBytes +
            c.css.reduce((s, css) => s + css.gzipBytes, 0),
        }),
        { rawBytes: 0, gzipBytes: 0 },
      );
    const routeChunk = row(routeKey, 'route');
    const where = Object.fromEntries(
      RENDERER_PACKAGES.map((pkg) => [pkg, Object.keys(homes[pkg])]),
    );
    return {
      routeChunk: {
        file: routeChunk.file,
        rawBytes: routeChunk.rawBytes,
        gzipBytes: routeChunk.gzipBytes,
      },
      pageTotal: {
        ...total(chunks),
        chunks: chunks.length,
        note: 'entry + route + first-render chunks, JS and CSS',
      },
      routeOnlyTotal: total(chunks.filter((c) => c.group !== 'entry')),
      rendererChunks: where,
      chunks,
      onDemand,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/* ── Report ──────────────────────────────────────────────────────────── */

const kb = (bytes) =>
  typeof bytes === 'number' ? `${(bytes / 1000).toFixed(1)} kB` : '–';

function printComparison(report, baseline) {
  const rows = [];
  const add = (label, now, then) =>
    rows.push([label, String(now ?? '–'), String(then ?? '–')]);
  const m = report.browser?.median;
  const b = baseline?.browser?.median;
  if (m) {
    for (const key of Object.keys(m)) add(key, m[key], b?.[key]);
  }
  if (report.bundle) {
    add(
      'routeChunk raw',
      kb(report.bundle.routeChunk.rawBytes),
      kb(baseline?.bundle?.routeChunk.rawBytes),
    );
    add(
      'routeChunk gzip',
      kb(report.bundle.routeChunk.gzipBytes),
      kb(baseline?.bundle?.routeChunk.gzipBytes),
    );
    add(
      'page total gzip',
      kb(report.bundle.pageTotal.gzipBytes),
      kb(baseline?.bundle?.pageTotal.gzipBytes),
    );
  }
  const width = Math.max(...rows.map((r) => r[0].length));
  console.log(`\n${'measure'.padEnd(width)}  now          baseline`);
  for (const [label, now, then] of rows) {
    console.log(`${label.padEnd(width)}  ${now.padEnd(12)} ${then}`);
  }
}

async function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(
    file,
    await format(JSON.stringify(data), { ...options, filepath: file }),
  );
}

async function main() {
  const report = {
    date: new Date().toISOString(),
    commit: git('rev-parse', '--short', 'HEAD'),
    dirty: (git('status', '--porcelain') ?? '').length > 0,
    machine: {
      platform: `${process.platform} ${process.arch}`,
      cpu: cpus()[0]?.model ?? null,
      cores: cpus().length,
      memoryGB: Math.round(totalmem() / 2 ** 30),
      node: process.version,
    },
    runs: RUNS,
  };
  if (args['skip-browser'] !== 'true') report.browser = await measureBrowser();
  if (args['skip-bundle'] !== 'true') report.bundle = await measureBundle();

  await writeJson(OUT, report);
  console.log(`measure-globe: wrote ${OUT}`);
  const baselineFile = join(DOCS, 'baseline.json');
  if (args.baseline === 'true') {
    await writeJson(baselineFile, report);
    console.log(`measure-globe: wrote ${baselineFile}`);
  }
  const baseline = existsSync(baselineFile)
    ? JSON.parse(readFileSync(baselineFile, 'utf8'))
    : null;
  printComparison(report, baseline);
}

main().catch((error) => {
  console.error(`measure-globe: ${error.stack ?? error}`);
  if (error.log) console.error(error.log.slice(-3000));
  process.exit(1);
});
