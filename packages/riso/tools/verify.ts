/**
 * Gate the film contract. Everything downstream assumes these hold.
 *
 *   tsx tools/verify.ts <film.html | http://host/> [--times 0.3,1.8,3.0] [--size 1080]
 *
 * Samples repeatability on consecutive and reordered seeks in both browsers.
 * Reports cross-engine hashes; antialiasing differences are not failures.
 * This does not prove continuity, absence of time-seeded crawl, or artistic quality.
 *
 * Transcribed from upstream tools/verify.mjs.
 */
import crypto from 'node:crypto';
import process from 'node:process';
import { args, str } from './lib/args.ts';
import { frameAt, launch, openFilm, type EngineName } from './lib/browser.ts';

const a = args(process.argv.slice(2));
const film = a._[0];
if (!film) {
  console.error(
    'usage: tsx tools/verify.ts <film.html | url> [--times ...] [--size 1080]',
  );
  process.exit(1);
}
const timesFlag = str(a, 'times');
const explicitTimes = timesFlag ? timesFlag.split(',').map(Number) : null;
const size = Number(str(a, 'size') ?? 1080);
const sum = (b: Buffer): string =>
  crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);

let failures = 0;
const fail = (m: string): void => {
  failures++;
  console.log(`  FAIL ${m}`);
};

const chromeHashes: Record<number, string> = {};
const engines: EngineName[] = ['chromium', 'firefox'];

for (const engine of engines) {
  const browser = await launch(engine);
  const { page, duration, errors } = await openFilm(browser, film, { size });
  if (!(duration > 0 && Number.isFinite(duration)))
    throw new Error('duration must be finite and positive');

  const shotTimes = await page.evaluate(() =>
    (window.__riso!.shots ?? [])
      .flatMap((s) => [s.start, s.readAt, s.end - 1 / 30])
      .filter((n): n is number => Number.isFinite(n)),
  );
  // Cover the actual duration: the old defaults silently stopped at 27 seconds.
  const times =
    explicitTimes ||
    [
      ...new Set(
        [
          ...[0, 0.07, 0.2, 0.4, 0.6, 0.8, 1].map((u) =>
            Math.min(duration - 1 / 30, u * duration),
          ),
          ...shotTimes,
        ].map((t) => Number(Math.max(0, t).toFixed(6))),
      ),
    ].sort((x, y) => x - y);
  if (times.some((t) => !Number.isFinite(t) || t < 0 || t > duration))
    throw new Error(`Inspection times must be within 0..${duration}`);
  console.log(`${engine}: duration ${duration}s`);
  if (errors.length) fail(`${errors.length} page error(s): ${errors[0]}`);

  const base: Record<number, string> = {};
  for (const t of times) {
    base[t] = sum(await frameAt(page, t));
    // Consecutive repeats catch short state cycles that a whole-list repeat can alias.
    if (sum(await frameAt(page, t)) !== base[t])
      fail(`t=${t} not repeatable on consecutive seeks`);
  }

  for (const t of times) {
    // repeat seek
    if (sum(await frameAt(page, t)) !== base[t]) fail(`t=${t} not repeatable`);
  }
  for (const t of times) {
    // cold jump after wandering
    await frameAt(page, (t + 9.3) % duration);
    await frameAt(page, (t + 17.1) % duration);
    if (sum(await frameAt(page, t)) !== base[t])
      fail(`t=${t} depends on seek history`);
  }
  if (engine === 'chromium') Object.assign(chromeHashes, base);
  else {
    const same = times.filter((t) => chromeHashes[t] === base[t]).length;
    console.log(
      `  cross-engine: ${same}/${times.length} frames pixel-identical to chromium`,
    );
  }
  console.log(
    `  ${times.map((t) => `${t}:${base[t].slice(0, 6)}`).join('  ')}`,
  );
  if (errors.length) fail(`page error during inspection: ${errors.at(-1)}`);
  await browser.close();
}
console.log(
  failures ? `\n${failures} failure(s)` : '\nseek is pure in t; contract holds',
);
process.exit(failures ? 1 : 0);
