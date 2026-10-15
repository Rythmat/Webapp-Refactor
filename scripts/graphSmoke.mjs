#!/usr/bin/env node
/* eslint-env node */
/**
 * A browser smoke test and performance run for Cortex, the console's graph
 * (Amendment 7). It starts its own dev servers, opens Cortex in headless
 * Chrome through playwright-core, checks what a person would see, measures
 * how smoothly it runs, writes a JSON report and stops the servers again.
 *
 *   node scripts/graphSmoke.mjs [--report=path] [--shots=dir]
 *                               [--gpu=metal|swiftshader] [--only=mock|repo]
 *                               [--mock-port=5253] [--repo-port=5254]
 *                               [--headed]
 *
 * (`npm run smoke:graph -- --report=…` runs the same.)
 *
 * Two runs, each on a dev server of its own:
 *
 * - the offline mock (`VITE_CONTENT_MOCK=1`), signed in as an admin through
 *   the dev bypass;
 * - repo mode (`VITE_CONTENT_REPO=1`), which reads the repo's own data
 *   files. The script only reads there: it never saves, and it compares
 *   `git status` for `src/content` before and after the run to prove that
 *   nothing was written. `REPO_CONTENT_ROOT` may point the server at a copy.
 *
 * Port 5179 is the owner's own dev server and is refused.
 *
 * What it checks, in each run (a failed check makes the exit code 1):
 *
 * - the graph region's name counts more than 5,000 items;
 * - the canvas is not blank: a screenshot of the stage has ink (pixels
 *   unlike the background) in several colours;
 * - no labels are drawn with the whole graph fitted in view;
 * - pointing at the busiest item (found through the page's dev hook, which
 *   only a dev server has) lights it: the pointer cursor, its label, and
 *   the rest of the graph fading;
 * - three wheel notches over Toto zoom in by exactly 1.5³ about the
 *   pointer: he moves away from it only by his sub-pixel offset from it
 *   times the zoom;
 * - a click on Toto opens /console/cortex/artists/toto with his row in the
 *   drawer beside the graph;
 * - `?focus=artist:toto&depth=2` draws the local graph round him;
 * - turning Tags on in the settings panel raises the item count.
 *
 * What it measures: frames a second while the layout settles and during a
 * scripted pan (from `requestAnimationFrame`), the time to the first frame
 * and to rest, cold and warm (reopened, from the position cache), and the
 * main thread's long tasks.
 *
 * GPU: `--gpu=metal` (the default on a Mac) uses the real GPU through ANGLE
 * Metal at a pixel ratio of 2, which gives numbers close to a person's.
 * `--gpu=swiftshader` (the default elsewhere) draws on the CPU, at a pixel
 * ratio of 1 in a smaller window; its frame rates are a regression baseline
 * only. `--headed` opens a visible window instead, for the headed run on
 * the owner's Mac that the plan's real targets are measured with.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { OWNER_PORT, startServer, waitClosed } from './lib/devServer.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
  }),
);
const GPU =
  args.gpu ?? (process.platform === 'darwin' ? 'metal' : 'swiftshader');
const REPORT = resolve(
  args.report ?? join(tmpdir(), 'graph-smoke-report.json'),
);
const SHOTS = args.shots ? resolve(args.shots) : null;
const MOCK_PORT = Number(args['mock-port'] ?? 5253);
const REPO_PORT = Number(args['repo-port'] ?? 5254);
const ONLY = args.only ?? 'all';

for (const port of [MOCK_PORT, REPO_PORT]) {
  if (port === OWNER_PORT) {
    console.error(
      `graph-smoke: port ${OWNER_PORT} is the owner's dev server; pick another.`,
    );
    process.exit(2);
  }
}

/** The window and pixel ratio for each kind of GPU. */
const SCREEN =
  GPU === 'metal'
    ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
const HEADED = args.headed === 'true';
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

/** The page's background, `--ui-background` (#101012). */
const BACKGROUND = [16, 16, 18];
/** One mouse-wheel click, in pixels, as the graph reads it. */
const NOTCH_PX = 120;
const EXPECTED_ZOOM = 1.5 ** 3;

/** `git status` for the content data, to show a repo-mode run wrote nothing. */
const contentStatus = () => {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', 'src/content'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  } catch {
    return null;
  }
};

/* ── Measuring ───────────────────────────────────────────────────────── */

const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return +sorted[
    Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  ].toFixed(2);
};

/** Frames a second, and how even they were, over `[from, to]`. */
const frameRate = (stamps, from, to) => {
  const frames = stamps.filter((t) => t >= from && t <= to);
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const span = frames.length > 1 ? frames.at(-1) - frames[0] : 0;
  return {
    frames: frames.length,
    fps: span ? +(((frames.length - 1) / span) * 1000).toFixed(1) : null,
    gapMedianMs: quantile(gaps, 0.5),
    gapP95Ms: quantile(gaps, 0.95),
    gapMaxMs: gaps.length ? +Math.max(...gaps).toFixed(1) : null,
    gapsOver20Ms: gaps.filter((g) => g > 20).length,
  };
};

/**
 * Ink in a screenshot: the share of pixels unlike the background, and how
 * many coarse colour buckets they fall in (a blank or one-colour canvas has
 * none or one).
 */
async function inkOf(png) {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  let ink = 0;
  let sum = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += r + g + b;
    const off = Math.max(
      Math.abs(r - BACKGROUND[0]),
      Math.abs(g - BACKGROUND[1]),
      Math.abs(b - BACKGROUND[2]),
    );
    if (off <= 24) continue;
    ink++;
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  // A colour counts once it covers a noticeable share of the ink.
  const colours = [...buckets.values()].filter(
    (n) => n >= Math.max(20, ink * 0.002),
  ).length;
  return {
    inkPercent: +((ink / pixels) * 100).toFixed(3),
    colours,
    meanBrightness: +(sum / (pixels * 3)).toFixed(2),
  };
}

/** The share of pixels (in percent) that differ clearly between two screenshots. */
async function changedPercent(pngA, pngB) {
  const [a, b] = await Promise.all(
    [pngA, pngB].map((png) => sharp(png).removeAlpha().raw().toBuffer()),
  );
  if (a.length !== b.length) return 100;
  let changed = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (
      Math.abs(a[i] - b[i]) > 24 ||
      Math.abs(a[i + 1] - b[i + 1]) > 24 ||
      Math.abs(a[i + 2] - b[i + 2]) > 24
    ) {
      changed++;
    }
  }
  return +((changed / (a.length / 3)) * 100).toFixed(3);
}

/* ── One run ─────────────────────────────────────────────────────────── */

async function runOne(name, base, browser) {
  const result = { name, base, checks: {}, measures: {}, notes: [] };
  const check = (key, pass, detail) => {
    result.checks[key] = { pass: !!pass, ...detail };
  };
  const context = await browser.newContext(SCREEN);
  await context.addInitScript(() => {
    window.__smoke = { longTasks: [], frames: [] };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__smoke.longTasks.push({
            at: Math.round(e.startTime),
            ms: Math.round(e.duration),
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // No long-task timing in this browser.
    }
    const tick = (t) => {
      window.__smoke.frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) =>
    errors.push(`pageerror: ${String(e).slice(0, 300)}`),
  );
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const regionLabel = () =>
    page.getAttribute('[role="application"]', 'aria-label');
  const itemsIn = (label) =>
    Number(/: ([\d,]+) items/.exec(label ?? '')?.[1]?.replace(/,/g, '') ?? NaN);
  const stageBox = () =>
    page.evaluate(() => {
      const r = document
        .querySelector('[role="application"]')
        .getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

  /** Open a Cortex URL and wait for the layout to rest. */
  const open = async (path) => {
    const started = Date.now();
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__atlasGraphDebug, null, {
      timeout: 120_000,
    });
    await page.waitForFunction(
      () => window.__atlasGraphDebug?.settled === true,
      null,
      { timeout: 120_000 },
    );
    const stats = await hook(() => window.__atlasGraphDebug.stats());
    return { wallMs: Date.now() - started, stats };
  };
  const shot = async (file, clip) => {
    const png = await page.screenshot(clip ? { clip } : {});
    if (SHOTS) writeFileSync(join(SHOTS, `${name}-${file}.png`), png);
    return png;
  };
  /**
   * When the first frame came, after the layout started and after the drawn
   * graph it shows was built (the last build before it; the working copy's
   * arrival can rebuild it again later), and the long tasks that held the
   * main thread between the layout's start and that frame.
   */
  const settleTimes = (stats, builds, longTasks) => {
    const shown = builds.filter((b) => b.at <= stats.scene.firstFrameAt).at(-1);
    const from = Math.min(stats.layout.startedAt, shown?.at ?? Infinity);
    return {
      layoutStartedAt: Math.round(stats.layout.startedAt),
      firstFrameAt: Math.round(stats.scene.firstFrameAt),
      longTasksBeforeFirstFrame: longTasks.filter(
        (t) => t.at + t.ms >= from && t.at <= stats.scene.firstFrameAt,
      ),
      firstFrameAfterLayoutStartMs: Math.round(
        stats.scene.firstFrameAt - stats.layout.startedAt,
      ),
      firstFrameAfterGraphBuiltMs: shown
        ? Math.round(stats.scene.firstFrameAt - shown.at)
        : null,
      graphBuildsAfterFirstFrame: builds.filter(
        (b) => b.at > stats.scene.firstFrameAt,
      ).length,
      settleMs: Math.round(stats.layout.settledAt - stats.layout.startedAt),
      ticks: stats.layout.ticks,
      warm: stats.layout.warm,
      runsIn: stats.runsIn,
    };
  };
  const graphBuilds = () =>
    page.evaluate(() =>
      performance.getEntriesByName('cortex:render-graph').map((e) => ({
        at: e.startTime,
        ms: +e.duration.toFixed(1),
      })),
    );

  await page.mouse.move(2, 2);

  // 1. The whole Atlas, cold.
  const cold = await open('/console/cortex');
  const coldBuilds = await graphBuilds();
  const coldTasks = await page.evaluate(() => window.__smoke.longTasks.slice());
  const label = await regionLabel();
  const items = itemsIn(label);
  check('regionCountsOver5000', items > 5000, { label, items });
  const frames = await page.evaluate(() => window.__smoke.frames.slice());
  result.measures.cold = {
    ...settleTimes(cold.stats, coldBuilds, coldTasks),
    wallToRestMs: cold.wallMs,
    drawnGraphBuildsMs: coldBuilds.map((b) => b.ms),
    whileSettling: frameRate(
      frames,
      cold.stats.layout.startedAt,
      cold.stats.layout.settledAt,
    ),
    gpu: await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
    }),
  };
  const longCold = await page.evaluate(() => window.__smoke.longTasks.slice());
  result.measures.cold.longTasks = longCold;
  result.measures.cold.longTasksAfterFirstFrame = longCold.filter(
    (t) => t.at >= cold.stats.scene.firstFrameAt,
  );

  // 2. Fitted: ink in several colours, and no labels.
  await hook(() => window.__atlasGraphDebug.fit());
  await page.waitForTimeout(500);
  const box = await stageBox();
  const fitPng = await shot('fit', box);
  const fitted = await inkOf(fitPng);
  const labelCanvas = await page.evaluate(() => {
    // The label layer is the region's one 2D canvas (the graph's is WebGL).
    for (const canvas of document.querySelectorAll(
      '[role="application"] canvas',
    )) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
      return { width: canvas.width, height: canvas.height, painted };
    }
    return null;
  });
  const labelsAtFit = (await hook(() => window.__atlasGraphDebug.stats()))
    .labelsShown;
  check(
    'canvasNotBlank',
    fitted.inkPercent > 0.2 && fitted.colours >= 4,
    fitted,
  );
  check(
    'noLabelsAtFit',
    labelsAtFit === 0 && labelCanvas !== null && labelCanvas.painted === 0,
    {
      labelsShown: labelsAtFit,
      labelCanvas,
      zoom: (await hook(() => window.__atlasGraphDebug.camera())).zoom,
    },
  );

  // 3. Point at the busiest item: it lights, the rest fades.
  const hub = await hook(() => window.__atlasGraphDebug.hub());
  const hubAt = await hook(
    (id) => window.__atlasGraphDebug.screenPositionOf(id),
    hub.id,
  );
  await page.mouse.move(hubAt.x, hubAt.y);
  await page.waitForTimeout(400);
  const hoverPng = await shot('hover', box);
  const hovered = await inkOf(hoverPng);
  const hoverChanged = await changedPercent(fitPng, hoverPng);
  const hoverState = await page.evaluate(() => ({
    cursor: document.querySelector('[role="application"]').style.cursor,
    labels: window.__atlasGraphDebug.stats().labelsShown,
  }));
  // Lit: the pointer cursor, the hovered item's label, and a picture that
  // changed (the rest faded to 20%, its links lit).
  check(
    'hoverLightsTheHub',
    hoverState.cursor === 'pointer' &&
      hoverState.labels >= 1 &&
      hoverChanged > 0.1,
    {
      hub,
      ...hoverState,
      changedPercent: hoverChanged,
      inkBefore: fitted.inkPercent,
      inkHovered: hovered.inkPercent,
    },
  );
  await page.mouse.move(box.x + 4, box.y + box.height - 4);
  await page.waitForTimeout(300);

  // 4. A scripted pan on empty stage, one move a frame.
  const panFrom = { x: box.x + 24, y: box.y + box.height - 24 };
  const panStart = await page.evaluate(() => performance.now());
  await page.mouse.move(panFrom.x, panFrom.y);
  await page.mouse.down();
  for (let i = 0; i < 120; i++) {
    const dx = 6 * Math.sin((i / 120) * Math.PI * 2);
    await page.mouse.move(panFrom.x + 120 + dx * 10, panFrom.y - 60 + dx * 4);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r())),
    );
  }
  await page.mouse.up();
  const panEnd = await page.evaluate(() => performance.now());
  const panFrames = await page.evaluate(() => window.__smoke.frames.slice());
  const panTasks = (
    await page.evaluate(() => window.__smoke.longTasks.slice())
  ).filter((t) => t.at >= panStart && t.at <= panEnd);
  result.measures.pan = {
    ...frameRate(panFrames, panStart, panEnd),
    longTasks: panTasks,
  };
  await page.waitForTimeout(800);

  // 5. Three wheel notches over Toto: ×1.5³, about the pointer. A mouse
  // event's position is whole pixels, so the pointer sits up to half a
  // pixel off his centre; zooming about the pointer moves him away from it
  // by exactly that offset times the zoom, and no further.
  await hook(() => window.__atlasGraphDebug.fit());
  await page.waitForTimeout(300);
  const totoAt = await hook(() =>
    window.__atlasGraphDebug.screenPositionOf('artist:toto'),
  );
  const cursor = { x: Math.round(totoAt.x), y: Math.round(totoAt.y) };
  const zoomBefore = (await hook(() => window.__atlasGraphDebug.camera())).zoom;
  await page.evaluate(
    ({ at, notch }) => {
      const region = document.querySelector('[role="application"]');
      for (let i = 0; i < 3; i++) {
        region.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -notch,
            deltaMode: 0,
            clientX: at.x,
            clientY: at.y,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    },
    { at: cursor, notch: NOTCH_PX },
  );
  // The wheel eases toward the zoom it asks for, as Obsidian's does
  // (graphScene's `zoomToward`), and lands on it exactly once within 1%:
  // about half a second for three notches. Read the zoom once it has
  // landed, when two frames apart show the same zoom, not at a set time.
  // (`page.evaluate` waits for the promise; `waitForFunction` would take
  // the promise itself as a yes.)
  const landed = () =>
    page.evaluate(
      () =>
        new Promise((done) => {
          const was = window.__atlasGraphDebug.camera().zoom;
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              done(window.__atlasGraphDebug.camera().zoom === was),
            ),
          );
        }),
    );
  for (const giveUp = Date.now() + 10_000; !(await landed()); ) {
    if (Date.now() > giveUp) break;
  }
  const zoomAfter = (await hook(() => window.__atlasGraphDebug.camera())).zoom;
  const totoAfter = await hook(() =>
    window.__atlasGraphDebug.screenPositionOf('artist:toto'),
  );
  const ratio = zoomAfter / zoomBefore;
  // Where he should be: his offset from the pointer, scaled by the zoom.
  const expectedAt = {
    x: cursor.x + (totoAt.x - cursor.x) * ratio,
    y: cursor.y + (totoAt.y - cursor.y) * ratio,
  };
  const drift = Math.hypot(
    totoAfter.x - expectedAt.x,
    totoAfter.y - expectedAt.y,
  );
  check(
    'threeWheelNotchesZoom1point5Cubed',
    Math.abs(ratio - EXPECTED_ZOOM) < 1e-6 * EXPECTED_ZOOM && drift < 0.05,
    {
      zoomBefore,
      zoomAfter,
      ratio: +ratio.toFixed(6),
      expected: EXPECTED_ZOOM,
      pointerOffsetBeforePx: +Math.hypot(
        totoAt.x - cursor.x,
        totoAt.y - cursor.y,
      ).toFixed(3),
      totoOffAboutThePointerPx: +drift.toFixed(4),
    },
  );
  // For the record: what a real wheel click from the browser zooms by.
  await page.evaluate(() => {
    window.__smoke.wheel = [];
    window.addEventListener(
      'wheel',
      (e) => window.__smoke.wheel.push([e.deltaY, e.deltaMode]),
      { capture: true, once: true },
    );
  });
  await page.mouse.move(totoAfter.x, totoAfter.y);
  const zoomBeforeReal = (await hook(() => window.__atlasGraphDebug.camera()))
    .zoom;
  await page.mouse.wheel(0, -NOTCH_PX);
  await page.waitForTimeout(250);
  const zoomAfterReal = (await hook(() => window.__atlasGraphDebug.camera()))
    .zoom;
  result.measures.browserWheelNotch = {
    delivered: await page.evaluate(() => window.__smoke.wheel),
    ratio: +(zoomAfterReal / zoomBeforeReal).toFixed(4),
    note: 'Playwright sends one 120 px notch as deltaY / devicePixelRatio, so at a pixel ratio of 2 it zooms by √1.5.',
  };

  // 6. A click on Toto opens his row beside the graph.
  const totoClick = await hook(() =>
    window.__atlasGraphDebug.screenPositionOf('artist:toto'),
  );
  await page.mouse.move(totoClick.x, totoClick.y);
  await page.waitForTimeout(100);
  await page.mouse.click(totoClick.x, totoClick.y);
  let drawer = false;
  try {
    await page.waitForURL(/\/console\/cortex\/artists\/toto(\?|$)/, {
      timeout: 15_000,
    });
    await page
      .getByRole('complementary', { name: /Toto/ })
      .first()
      .waitFor({ timeout: 30_000 });
    drawer = true;
  } catch {
    // Reported below.
  }
  const afterClick = page.url().replace(base, '');
  const startsAfterClick = (await hook(() => window.__atlasGraphDebug.stats()))
    .layout.starts;
  check(
    'clickOpensTotoBesideTheGraph',
    drawer && /^\/console\/cortex\/artists\/toto/.test(afterClick),
    {
      url: afterClick,
      drawer,
      layoutRunsSoFar: startsAfterClick,
    },
  );
  if (drawer) await shot('drawer');

  // 7. Reopen: warm, from the position cache, with the whole graph in view
  // (the camera is kept every 2 s, and a warm start rests once nothing
  // moves half a device pixel, which depends on the zoom).
  await hook(() => window.__atlasGraphDebug.fit());
  await page.waitForTimeout(2300);
  const warm = await open('/console/cortex');
  const warmBuilds = await graphBuilds();
  const warmTasks = await page.evaluate(() => window.__smoke.longTasks.slice());
  result.measures.warm = {
    ...settleTimes(warm.stats, warmBuilds, warmTasks),
    wallToRestMs: warm.wallMs,
    longTasks: warmTasks,
    longTasksAfterFirstFrame: warmTasks.filter(
      (t) => t.at >= warm.stats.scene.firstFrameAt,
    ),
  };

  // 8. The local graph round Toto, two steps.
  const local = await open('/console/cortex?focus=artist:toto&depth=2');
  const localLabel = await regionLabel();
  const localItems = itemsIn(localLabel);
  check(
    'localGraphAroundToto',
    /^Cortex around Toto: /.test(localLabel ?? '') &&
      localItems > 1 &&
      localItems < items,
    {
      label: localLabel,
      settleMs: Math.round(
        local.stats.layout.settledAt - local.stats.layout.startedAt,
      ),
    },
  );
  await shot('local');

  // 9. Tags on raises the count.
  await open('/console/cortex');
  const notesLabel = await regionLabel();
  await page.getByRole('button', { name: 'Open graph settings' }).click();
  const filters = page.getByRole('button', { name: 'Filters', exact: true });
  if ((await filters.getAttribute('aria-expanded')) !== 'true')
    await filters.click();
  await page.getByRole('switch', { name: 'Tags', exact: true }).click();
  await page.waitForFunction(
    (before) =>
      document
        .querySelector('[role="application"]')
        ?.getAttribute('aria-label') !== before,
    notesLabel,
    { timeout: 30_000 },
  );
  const tagsLabel = await regionLabel();
  check('tagsOnRaisesTheCount', itemsIn(tagsLabel) > itemsIn(notesLabel), {
    before: notesLabel,
    after: tagsLabel,
  });
  await page.waitForFunction(
    () => window.__atlasGraphDebug?.settled === true,
    null,
    { timeout: 120_000 },
  );
  const tagsStats = await hook(() => window.__atlasGraphDebug.stats());
  result.measures.tagsOn = {
    settleMs: Math.round(
      tagsStats.layout.settledAt - tagsStats.layout.startedAt,
    ),
    ticks: tagsStats.layout.ticks,
    changes: tagsStats.layout.changes,
  };

  result.errors = errors
    .filter((e) => !/401|Failed to load resource|UNSAFE_component/.test(e))
    .slice(0, 20);
  result.ignoredConsoleErrors = errors.length - result.errors.length;
  check('noPageErrors', !errors.some((e) => e.startsWith('pageerror')), {
    pageErrors: errors.filter((e) => e.startsWith('pageerror')).slice(0, 5),
  });
  await context.close();
  return result;
}

/* ── Main ────────────────────────────────────────────────────────────── */

const RUNS = [
  {
    name: 'mock',
    port: MOCK_PORT,
    env: {
      VITE_CONTENT_MOCK: '1',
      VITE_DEV_AUTH_BYPASS: '1',
      VITE_DEV_AUTH_BYPASS_ROLE: 'admin',
    },
  },
  {
    name: 'repo',
    port: REPO_PORT,
    env: {
      VITE_CONTENT_REPO: '1',
      VITE_CONTENT_MOCK: '',
      VITE_DEV_AUTH_BYPASS: '1',
      VITE_DEV_AUTH_BYPASS_ROLE: 'admin',
    },
  },
].filter((run) => ONLY === 'all' || ONLY === run.name);

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const report = {
  at: new Date().toISOString(),
  gpu: GPU,
  headed: HEADED,
  screen: SCREEN,
  runs: [],
};
const browser = await chromium.launch(LAUNCH);
let failed = false;
try {
  for (const run of RUNS) {
    const before = run.name === 'repo' ? contentStatus() : null;
    const server = await startServer({
      root: ROOT,
      port: run.port,
      env: run.env,
      logFile: SHOTS ? join(SHOTS, `vite-${run.port}.log`) : null,
    });
    let result;
    try {
      result = await runOne(run.name, `http://localhost:${run.port}`, browser);
    } catch (error) {
      result = {
        name: run.name,
        error: String(error?.stack ?? error).slice(0, 2000),
        checks: {},
      };
    } finally {
      server.stop();
      result.portClosed = await waitClosed(run.port);
    }
    if (run.name === 'repo') {
      const after = contentStatus();
      result.checks.repoUntouched = {
        pass: before !== null && before === after,
        note: 'git status of src/content, before and after the run',
      };
    }
    report.runs.push(result);
    const bad = Object.entries(result.checks).filter(([, c]) => !c.pass);
    if (result.error || bad.length) failed = true;
    console.log(
      `graph-smoke ${run.name}: ${result.error ? `ERROR ${result.error.split('\n')[0]}` : bad.length ? `FAILED ${bad.map(([k]) => k).join(', ')}` : 'all checks passed'}`,
    );
  }
} finally {
  await browser.close();
}

mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 1));
console.log(`graph-smoke report: ${REPORT}`);
process.exit(failed ? 1 : 0);
