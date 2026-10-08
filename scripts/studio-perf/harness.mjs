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
    'scenario api-mode calibrate known fixtures-dir', // roundtrip.mjs
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
 * Opens the editor at `/studio/editor<query>` and waits until the store is
 * exposed and the track area is on screen.
 */
export async function openEditor(page, base, query = '', timeout = 180_000) {
  await page.goto(`${base}/studio/editor${query}`, {
    waitUntil: 'domcontentloaded',
    timeout,
  });
  await page.waitForFunction(() => Boolean(window.__MA_STORE__), null, {
    timeout,
  });
  await page.waitForSelector('[data-tutorial-id="add-track-button"]', {
    timeout,
  });
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
