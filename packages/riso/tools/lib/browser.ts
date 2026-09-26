/**
 * Playwright plumbing shared by every tool. Transcribed from upstream tools/lib/browser.mjs.
 *
 * Ported ahead of the engine on purpose: these are validated against the upstream films first, so
 * that from then on a parity failure can only be the engine, never the harness.
 */
import path from 'node:path';
import url from 'node:url';
import { chromium, firefox, type Browser, type Page } from 'playwright-core';
import type { Shot } from '../../src/film/contract.ts';

export const ENGINES = { chromium, firefox };
export type EngineName = keyof typeof ENGINES;

export const isEngine = (s: string): s is EngineName => s in ENGINES;

export async function launch(
  engine: EngineName = 'chromium',
): Promise<Browser> {
  const type = ENGINES[engine];
  if (!type)
    throw new Error(
      `unknown engine "${engine}" (use: ${Object.keys(ENGINES).join(', ')})`,
    );
  try {
    return await type.launch();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Executable doesn't exist/.test(msg)) {
      throw new Error(
        `${engine} is not installed for playwright-core; run \`npm run setup\` in packages/riso/tools/`,
      );
    }
    throw e;
  }
}

export interface OpenOptions {
  size?: number;
  css?: number;
  query?: string;
  timeout?: number;
}

export interface OpenedFilm {
  page: Page;
  duration: number;
  errors: string[];
}

/**
 * Open a film and wait for its bake to finish. Accepts a local path or an http(s) URL — the
 * harness is served, so parity can compare a file:// upstream against a localhost port.
 */
export async function openFilm(
  browser: Browser,
  target: string,
  { size = 1080, css = 720, query = '', timeout = 180000 }: OpenOptions = {},
): Promise<OpenedFilm> {
  // The film styles its canvas at `css` px but renders a larger backing store.
  // Screenshotting at CSS size would downscale it and destroy the halftone dots,
  // so scale the viewport up to capture the backing store 1:1.
  const page = await browser.newPage({
    viewport: { width: css, height: css },
    deviceScaleFactor: size / css,
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const base = /^https?:\/\//.test(target)
    ? target
    : url.pathToFileURL(path.resolve(target)).href;
  const href = base + (query ? (base.includes('?') ? '&' : '?') + query : '');
  await page.goto(href, { waitUntil: 'load' });
  await page
    .waitForFunction(() => window.__riso?.ready === true, null, { timeout })
    .catch(() => {
      const hint = errors.length
        ? `\n  page errors:\n   - ${errors.join('\n   - ')}`
        : '';
      throw new Error(
        `film never reported window.__riso.ready within ${timeout}ms${hint}`,
      );
    });

  const duration = await page.evaluate(() => window.__riso!.duration);
  return { page, duration, errors };
}

/**
 * Render one exact frame and return its PNG buffer.
 *
 * Screenshots the CANVAS ELEMENT, not the viewport. The contract is about what the film draws, and
 * a viewport shot also captures whatever page chrome surrounds it — which differs between the bare
 * upstream films and a harness with a scrubber and a background, and would make every parity
 * comparison fail for reasons that have nothing to do with the engine.
 */
export async function frameAt(page: Page, t: number): Promise<Buffer> {
  await page.evaluate((time) => window.__riso!.seek(time), t);
  return canvasShot(page);
}

/** Screenshot just the film canvas, at the page's deviceScaleFactor so the backing store is 1:1. */
export async function canvasShot(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot({ type: 'png' });
}

/** The film's own shot list, or [] when it declares none. */
export const shotsOf = (page: Page): Promise<Shot[]> =>
  page.evaluate(() => (window.__riso!.shots ?? []) as Shot[]);
