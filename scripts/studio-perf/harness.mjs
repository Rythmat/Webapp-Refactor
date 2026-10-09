/* eslint-env node */
/**
 * Shared harness for the Studio editor checks in scripts/studio-perf: a dev
 * server with the dev auth bypass (premium user, stores exposed on window),
 * headless Chrome through playwright-core, the device profiles every check
 * runs on, and the in-page probes (probes.mjs).
 *
 * Every check script accepts:
 *
 *   --reuse=http://localhost:5263   use a dev server that is already running
 *                                   (started with VITE_DEV_AUTH_BYPASS=1)
 *   --port=5263                     port for the server the harness starts
 *   --profile=chromebook|laptop|small|all   (default: chromebook)
 *   --out=dir                       where reports go
 *   --gpu=metal|swiftshader         (default: metal on a Mac)
 *   --headed                        a visible browser instead of headless
 *   --fake-audio                    Chrome's fake audio output, for a machine
 *                                   whose audio output never renders
 *
 * A value always follows '=': `--out dir` is refused (parseArgs).
 *
 * A server the harness starts gets its own dep cache (VITE_CACHE_DIR), so it
 * never re-optimizes under the owner's server on 5179, and, when this
 * checkout is a git worktree without env files, the main checkout's env files
 * (VITE_ENV_DIR). Port 5179 is refused.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer, waitClosed } from '../lib/devServer.mjs';
import { installProbes } from './probes.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The screens the editor is built for (owner decision 1). Window sizes are
 * the usable Chrome window, not the screen.
 */
export const PROFILES = {
  /** A school Chromebook: 1366×768 screen, focus mode, a slow CPU. */
  chromebook: {
    viewport: { width: 1366, height: 655 },
    deviceScaleFactor: 1,
    cpuThrottle: 4,
    network: { downloadKbps: 10_000, uploadKbps: 5_000, latencyMs: 40 },
  },
  /** A laptop: 1440×900 screen, retina. */
  laptop: {
    viewport: { width: 1440, height: 787 },
    deviceScaleFactor: 2,
    cpuThrottle: 1,
    network: null,
  },
  /** The smallest window the layout must still work in. */
  small: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    cpuThrottle: 1,
    network: null,
  },
};

/**
 * The flags of the scripts here that take a value. check.mjs's --baseline is
 * a switch and lessons.mjs's takes a path, so lessons.mjs checks its own.
 */
const VALUE_FLAGS = new Set(
  [
    'out reuse port profile gpu', // harness.mjs, every check
    'only', // check.mjs
    'scenario api-mode calibrate known fixtures-dir prev-base tier', // roundtrip.mjs
    'fixture rates goldens block fixtures-dir', // golden.mjs
    'persona lesson idle-seconds step-timeout', // lessons.mjs
    'scenario repeat audio-timeout max-load', // perf.mjs
  ].flatMap((flags) => flags.split(' ')),
);

/**
 * The command line as { flag: value }, with 'true' for a bare `--flag`. A
 * value always follows '=': a word on its own (`--out dir`) and a value flag
 * left without one (`--out`, `--out=`) throw. Read as 'true' or '', they
 * would send a check's reports to ./true or the current directory, or make
 * `--only roundtrip` run no suite and pass.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  return Object.fromEntries(
    argv.map((arg, i) => {
      if (!arg.startsWith('--')) {
        const flag = argv[i - 1];
        throw new Error(
          flag?.startsWith('--') && !flag.includes('=')
            ? `"${arg}" is not a flag (a value follows "=": ${flag}=${arg})`
            : `"${arg}" is not a flag (write --flag or --flag=value)`,
        );
      }
      const [key, ...rest] = arg.slice(2).split('=');
      const value = rest.join('=');
      if (VALUE_FLAGS.has(key) && !value) {
        const next = argv[i + 1];
        const example = next && !next.startsWith('--') ? next : '…';
        throw new Error(`--${key} takes a value (write --${key}=${example})`);
      }
      return [key, rest.length ? value : 'true'];
    }),
  );
}

/** The profiles a run asked for (`--profile=all` runs every profile). */
export function profilesFrom(args, fallback = 'chromebook') {
  const asked = args.profile ?? fallback;
  const names = asked === 'all' ? Object.keys(PROFILES) : asked.split(',');
  for (const name of names) {
    if (!PROFILES[name]) throw new Error(`unknown profile "${name}"`);
  }
  return names;
}

/** The env files' directory when this checkout has none (a git worktree). */
function envDirForWorktree() {
  const hasEnv = (dir) =>
    existsSync(join(dir, '.env')) || existsSync(join(dir, '.env.local'));
  if (hasEnv(ROOT)) return null;
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    const main = resolve(ROOT, common, '..');
    return hasEnv(main) ? main : null;
  } catch {
    return null;
  }
}

/**
 * The env for a dev server the checks start: the dev auth bypass, a dep
 * cache of its own, and a worktree's env files from the main checkout.
 */
export function studioServerEnv() {
  const env = {
    VITE_DEV_AUTH_BYPASS: '1',
    VITE_CACHE_DIR: join(ROOT, 'node_modules/.vite-studio-perf'),
  };
  const envDir = envDirForWorktree();
  if (envDir) env.VITE_ENV_DIR = envDir;
  return env;
}

/**
 * Chrome flags. Audio may start without a click so checks are deterministic
 * (the editor still inits its engine on its first gesture). `--gpu=metal`
 * (the default on a Mac, as in scripts/graphSmoke.mjs) draws with the real
 * GPU, which gives frame times close to a person's; `--gpu=swiftshader`
 * draws on the CPU, a regression baseline only.
 */
export function launchArgs(gpu) {
  const common = [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ];
  return gpu === 'metal'
    ? [...common, '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu']
    : [
        ...common,
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
      ];
}

/**
 * Runs `fn({ base, browser, args, outDir })` against a bypass dev server and
 * headless Chrome, and always cleans both up.
 */
export async function withStudio(check, fn, argv) {
  const args = parseArgs(argv);
  const outDir = resolve(
    args.out ?? join(ROOT, 'docs/studio-perf/runs', check),
  );
  mkdirSync(outDir, { recursive: true });
  const port = Number(args.port ?? 5263);
  let server = null;
  let base = args.reuse;
  if (!base) {
    server = await startServer({
      root: ROOT,
      port,
      env: studioServerEnv(),
      logFile: join(outDir, 'vite.log'),
    });
    base = `http://localhost:${port}`;
  }
  const gpu =
    args.gpu ?? (process.platform === 'darwin' ? 'metal' : 'swiftshader');
  const headed = args.headed === 'true';
  const browser = await chromium.launch({
    headless: !headed,
    args: [
      ...(headed ? [] : ['--headless=new']),
      ...launchArgs(gpu),
      // Never the default: perf and golden traces time the real device.
      ...(args['fake-audio'] === 'true' ? ['--disable-audio-output'] : []),
    ],
  });
  try {
    return await fn({ base, browser, args, outDir });
  } finally {
    await browser.close();
    if (server) {
      server.stop();
      await waitClosed(port);
    }
  }
}

/**
 * A page in a fresh context for `profileName`, with its CPU throttle and the
 * probes installed. `network: true` also applies the profile's network
 * (for load runs).
 */
export async function newPage(
  browser,
  profileName,
  { network = false, probes = true } = {},
) {
  const profile = PROFILES[profileName];
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
  });
  if (probes) await context.addInitScript(installProbes);
  await guardPartyKit(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 500)));
  const cdp = await context.newCDPSession(page);
  if (profile.cpuThrottle > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: profile.cpuThrottle,
    });
  }
  if (network && profile.network) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.network.latencyMs,
      downloadThroughput: (profile.network.downloadKbps * 1000) / 8,
      uploadThroughput: (profile.network.uploadKbps * 1000) / 8,
    });
  }
  return { context, page, cdp, errors };
}

/**
 * Closes every PartyKit WebSocket a page of `context` opens. The dev
 * server's VITE_PARTYKIT_HOST (the main checkout's env) is not a loopback
 * host, so without this a collab boot in a check would dial a deployed
 * PartyKit with the bypass token. A collab open then fails the way a dead
 * room does.
 */
export async function guardPartyKit(context) {
  await context.routeWebSocket(/\/parties\//, (ws) => ws.close());
}

/**
 * Whether the editor's open has settled (milestone 1.4). Runs in the page.
 * An open has finished since the page loaded (or since markOpenBoundary,
 * for an in-page navigation): the session store's lastOutcome is set and is
 * not the one recorded at the boundary, so a poll that lands between the
 * editor's mount and useSessionBoot's start (phase still 'idle') or reads
 * the previous open's 'ready' does not pass. The open ended 'ready', or
 * 'failed' (a failure after the switch: the error panel is up and the kept
 * work, or a new empty draft, is open). The editor root is not aria-busy and
 * no Opening overlay is up.
 */
export function editorOpenSettled() {
  const session = window.__MA_SESSION__?.getState();
  if (!session || !window.__MA_STORE__) return false;
  const outcome = session.lastOutcome;
  const fresh = outcome != null && outcome !== window.__RT_PREV_OUTCOME__;
  return (
    fresh &&
    (session.phase === 'ready' || session.phase === 'failed') &&
    !document.querySelector('.daw-root[aria-busy="true"]') &&
    !document.querySelector('[data-testid="opening-overlay"]')
  );
}

/**
 * In the page: records the session's current outcome as the boundary an
 * in-page navigation's open must move past (editorOpenSettled). A full page
 * load needs none (its store starts with no outcome). Call it in the same
 * task as the navigation, before it; with no editor loaded yet (no
 * window.__MA_SESSION__) the boundary set before stays.
 */
export function markOpenBoundary() {
  const session = window.__MA_SESSION__;
  if (session) window.__RT_PREV_OUTCOME__ = session.getState().lastOutcome;
}

/**
 * Opens the editor at `/studio/editor<query>` and waits until the store is
 * exposed, an open has finished on this page (editorOpenSettled: the
 * Opening overlay is gone, so it covers no anchor) and the track area is on
 * screen. A failure of asUser's served module is thrown here, by name.
 */
export async function openEditor(page, base, query = '', timeout = 180_000) {
  await page.goto(`${base}/studio/editor${query}`, {
    waitUntil: 'domcontentloaded',
    timeout,
  });
  const deadline = Date.now() + timeout;
  for (;;) {
    throwAsUserError(page.context());
    // The store and the session are exposed together (DawApp), so a
    // settled open means the store is out too. A navigation in progress
    // destroys the context the evaluate runs in: poll again.
    const ready = await page.evaluate(editorOpenSettled).catch(() => false);
    if (ready) break;
    if (Date.now() > deadline) {
      throw new Error(
        `openEditor: the editor's open did not settle within ${timeout} ms`,
      );
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  await page.waitForSelector('[data-tutorial-id="add-track-button"]', {
    timeout: Math.max(1000, deadline - Date.now()),
  });
}

/**
 * Crashes `page`'s renderer as a real crash does (CDP Page.crash): no
 * pagehide, no visibilitychange, nothing flushed; committed IndexedDB and
 * localStorage data survive and its locks are freed. Page.crash never
 * answers, so it is sent without waiting; the page's 'crash' event is. A
 * crashed Page cannot be reloaded: open another tab of the same context.
 */
export async function crash(page, timeout = 15_000) {
  const cdp = await page.context().newCDPSession(page);
  const crashed = page.waitForEvent('crash', { timeout });
  cdp.send('Page.crash').catch(() => {});
  await crashed;
}

/** The CDP session a quota override is set through, kept per page. */
async function quotaSession(page) {
  page.__rtQuotaCdp ??= await page.context().newCDPSession(page);
  return page.__rtQuotaCdp;
}

/**
 * Caps the storage quota of `page`'s origin (CDP
 * Storage.overrideQuotaForOrigin): `quotaBytes` outright, or the origin's
 * current usage plus `headroomBytes`. Writes past it abort with
 * QuotaExceededError (an IndexedDB transaction's abort), while
 * navigator.storage.estimate() keeps reporting the real quota. Resolves to
 * { usage, quota } as set.
 *
 * What Chrome 153 does with it (probed, build/harness/quota-debug*.mjs):
 * the cap holds only while the CDP session that set it lives (this keeps
 * one per page: closing the page lifts it), and IndexedDB keeps the quota
 * it found when the origin first used IndexedDB in the context, so a cap
 * set after the editor has opened its drafts does not reach them. To cap
 * the editor's drafts, cap the origin before the editor loads
 * (presetQuota). resetQuota lifts a cap at any time.
 */
export async function setQuota(page, { quotaBytes, headroomBytes = 0 } = {}) {
  const origin = new URL(page.url()).origin;
  const usage = await page.evaluate(async () => {
    const { usage } = await navigator.storage.estimate();
    return usage ?? 0;
  });
  const quota = quotaBytes ?? usage + headroomBytes;
  const cdp = await quotaSession(page);
  await cdp.send('Storage.overrideQuotaForOrigin', {
    origin,
    quotaSize: quota,
  });
  return { usage, quota };
}

/** Lifts setQuota's (or presetQuota's) cap on `page`'s origin. */
export async function resetQuota(page) {
  const origin = new URL(page.url()).origin;
  const cdp = await quotaSession(page);
  await cdp.send('Storage.overrideQuotaForOrigin', { origin });
}

/**
 * Caps `base`'s origin in `context` before any page of it uses IndexedDB
 * (see setQuota): a holder page of the origin, which boots no app, sets the
 * cap and stays open to keep it. Resolves to { usage, quota, reset() }:
 * reset() lifts the cap and closes the holder. Open the editor after this.
 */
export async function presetQuota(context, base, quotaBytes) {
  const holder = await context.newPage();
  await holder.goto(`${base}/@vite/client`, { waitUntil: 'domcontentloaded' });
  const set = await setQuota(holder, { quotaBytes });
  return {
    ...set,
    holder,
    reset: async () => {
      await resetQuota(holder).catch(() => {});
      await holder.close().catch(() => {});
    },
  };
}

/** The key prefix fillLocalStorage writes under (clearLocalStorageFill). */
const FILL_PREFIX = 'rt:fill:';

/**
 * Fills `page`'s localStorage with filler under 'rt:fill:<n>', in chunks of
 * 256K characters, until `chars` more are stored or it is full (Chrome holds
 * about 5M characters per origin). Resolves to { stored, full }.
 */
export async function fillLocalStorage(page, chars = Infinity) {
  return page.evaluate(
    ({ prefix, want }) => {
      const chunk = 'x'.repeat(256 * 1024);
      let stored = 0;
      let n = 0;
      while (localStorage.getItem(`${prefix}${n}`) !== null) n += 1;
      for (; stored < want; n++) {
        const piece =
          want - stored < chunk.length ? chunk.slice(0, want - stored) : chunk;
        try {
          localStorage.setItem(`${prefix}${n}`, piece);
          stored += piece.length;
        } catch {
          if (piece.length > 1024) {
            // Try a smaller piece before calling it full.
            const half = piece.slice(0, Math.floor(piece.length / 2));
            try {
              localStorage.setItem(`${prefix}${n}`, half);
              stored += half.length;
              continue;
            } catch {
              // Full.
            }
          }
          return { stored, full: true };
        }
      }
      return { stored, full: false };
    },
    { prefix: FILL_PREFIX, want: Number.isFinite(chars) ? chars : 1e9 },
  );
}

/** Removes what fillLocalStorage wrote. */
export async function clearLocalStorageFill(page) {
  await page.evaluate((prefix) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    }
  }, FILL_PREFIX);
}

/** The dev auth bypass's module, its user's id and token (src/auth/devBypass.ts). */
const BYPASS_MODULE = '/src/auth/devBypass.ts';
export const DEV_BYPASS_USER_ID = 'dev-bypass-user';
export const DEV_BYPASS_TOKEN = 'dev-bypass-token';
const BYPASS_USER_ID = /(\bid:\s*)(['"])dev-bypass-user\2/;
const BYPASS_TOKEN = /(\btoken:\s*)(['"])dev-bypass-token\2/;

/**
 * The bearer token asUser serves `userId` (the bypass's own for its user).
 * mockStudioApi.mjs reads the owner of a request back from it.
 */
export const devTokenFor = (userId) =>
  !userId || userId === DEV_BYPASS_USER_ID
    ? DEV_BYPASS_TOKEN
    : `${DEV_BYPASS_TOKEN}:${userId}`;

/**
 * Signs every page of `context` in as `userId` instead of the bypass's
 * 'dev-bypass-user' (another student on the same device: the same
 * localStorage, IndexedDB and locks). The bypass module is served to the
 * context with its user id and its token rewritten (the token to
 * devTokenFor(userId), so the mock Studio API tells the two students'
 * projects apart), the way lessons.mjs serves it another plan; no product
 * code changes and no other context sees it. Call it again to switch user
 * (pages loaded after that get the new one); asUser(context, null) goes
 * back to the bypass's own user. Conditional request headers are dropped so
 * the browser never revalidates into another user's copy.
 *
 * When the module no longer has the user id or the token to rewrite, the
 * request is aborted (the editor never loads) and the reason is kept on the
 * context: openEditor (and asUserError) report it by name instead of a
 * generic load timeout.
 */
export async function asUser(context, userId) {
  const previous = context.__rtAsUser;
  if (previous) await context.unroute(previous.match, previous.handler);
  context.__rtAsUser = null;
  context.__rtAsUserError = null;
  if (!userId || userId === DEV_BYPASS_USER_ID) return;
  const match = (url) => url.pathname === BYPASS_MODULE;
  const handler = async (route) => {
    try {
      const headers = { ...route.request().headers() };
      delete headers['if-none-match'];
      delete headers['if-modified-since'];
      const response = await route.fetch({ headers });
      const source = await response.text();
      const withUser = source.replace(
        BYPASS_USER_ID,
        (_, lead, quote) => `${lead}${quote}${userId}${quote}`,
      );
      const body = withUser.replace(
        BYPASS_TOKEN,
        (_, lead, quote) => `${lead}${quote}${devTokenFor(userId)}${quote}`,
      );
      if (withUser === source || body === withUser) {
        throw new Error(
          `asUser: ${BYPASS_MODULE} no longer names its user 'dev-bypass-user' and its token 'dev-bypass-token'; has it changed?`,
        );
      }
      const out = { ...response.headers() };
      delete out['content-length'];
      delete out.etag;
      out['cache-control'] = 'no-store';
      await route.fulfill({ status: response.status(), headers: out, body });
    } catch (error) {
      context.__rtAsUserError ??= String(error?.message ?? error);
      await route.abort('failed').catch(() => {});
    }
  };
  await context.route(match, handler);
  context.__rtAsUser = { match, handler };
}

/** Why asUser could not serve its user to `context`, or null. */
export const asUserError = (context) => context.__rtAsUserError ?? null;

/** Throws asUser's failure on `context`, if it had one. */
export function throwAsUserError(context) {
  const error = asUserError(context);
  if (error) throw new Error(error);
}

/**
 * Starts the audio engine the way a person would (the editor inits it on its
 * first click or key press) and waits until it reports initialized. Shift
 * has no shortcut, so the key press changes nothing else.
 */
export async function startAudio(page, timeout = 60_000) {
  await page.keyboard.press('Shift');
  await page.waitForFunction(
    () => window.__MA_AUDIO_ENGINE__?.getIsInitialized?.() === true,
    null,
    { timeout },
  );
}

/** What a run with a stopped audio clock is told to do. */
export const AUDIO_CLOCK_STOPPED =
  "the audio clock does not advance on this machine (headless Chrome's " +
  'audio output never renders here), so nothing can play: rerun with ' +
  '--fake-audio';

/** 'fake' with --fake-audio (Chrome's fake output), else 'device'. */
export function audioMode(args) {
  return args['fake-audio'] === 'true' ? 'fake' : 'device';
}

/**
 * Whether an AudioContext's clock runs: its currentTime over `ms` of wall
 * time. The editor's own context once startAudio ran; otherwise (a blank
 * page, say) a fresh context the check closes again. On some machines
 * headless Chrome's real output never pulls audio, so the clock stays put
 * (0.006 s of 1.5 s) and nothing plays; --fake-audio runs it. Never throws:
 * `runs` is false when the context could not be read.
 */
export async function audioClock(page, ms = 500) {
  return page.evaluate(async (ms) => {
    const own = window.__MA_AUDIO_ENGINE__?.getContext?.();
    let ctx = own;
    try {
      if (!ctx) {
        ctx = new AudioContext();
        await ctx.resume();
      }
      const t0 = ctx.currentTime;
      const w0 = performance.now();
      await new Promise((resolve) => setTimeout(resolve, ms));
      const advancedSec = ctx.currentTime - t0;
      const wallSec = (performance.now() - w0) / 1000;
      return {
        context: own ? 'editor' : 'fresh',
        state: ctx.state,
        advancedSec: Math.round(advancedSec * 1000) / 1000,
        wallSec: Math.round(wallSec * 1000) / 1000,
        // A running clock keeps pace with the wall; a stopped one is ~0.
        runs: advancedSec >= wallSec / 4,
      };
    } catch (error) {
      return {
        context: own ? 'editor' : 'fresh',
        runs: false,
        error: String(error),
      };
    } finally {
      if (!own) ctx?.close?.().catch(() => {});
    }
  }, ms);
}

/**
 * Fails the run, before any scenario, when the machine's audio clock does
 * not run (audioClock on a blank page): every check that plays would
 * otherwise report the editor as silent or broken.
 */
export async function requireAudioClock(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const clock = await audioClock(page);
    if (!clock.runs) {
      throw new Error(
        `${AUDIO_CLOCK_STOPPED} (a blank page's AudioContext advanced ${clock.advancedSec ?? '?'} s in ${clock.wallSec ?? '?'} s${clock.error ? `; ${clock.error}` : ''})`,
      );
    }
    return clock;
  } finally {
    await context.close();
  }
}

/** Writes `data` as JSON to `outDir/name.json` and returns the path. */
export function writeJson(outDir, name, data) {
  const file = join(outDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
  return file;
}
