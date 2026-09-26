/**
 * THE GATE. Render upstream and the port at the same moments and compare canvas sha256.
 *
 *   node tools/parity.ts --ported "http://127.0.0.1:5180/?film=x" --upstream-film studies/index.html --times 0,1,2
 *   node tools/parity.ts --paper --ported "http://127.0.0.1:5180/?film=paper-only"
 *
 * Both sides go through the identical Playwright path — same viewport, same
 * `deviceScaleFactor: size/css`, same screenshot call — so a hash difference is the engine and
 * nothing else.
 *
 * Firefox is authoritative. Upstream's own finding is that Firefox is byte-identical across runs
 * while Chromium diverges slightly, and cross-engine pixel differences are antialiasing rather
 * than failures (upstream's verify reports 0/12 identical between engines on its own films).
 *
 * Refuses to run if the reference clone has moved off the pinned commit: a parity suite that
 * silently tracks a moving upstream is worse than none.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';
import { args, str } from './lib/args.ts';
import {
  canvasShot,
  frameAt,
  launch,
  openFilm,
  type EngineName,
} from './lib/browser.ts';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const PINNED = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures', 'studies.baseline.json'), 'utf8'),
).upstream as string;

const a = args(process.argv.slice(2));
const upstreamDir =
  str(a, 'upstream') ??
  `${process.env.HOME}/Desktop/References/riso-windowseat`;
const ported = str(a, 'ported') ?? 'http://127.0.0.1:5180/';
const upstreamFilm = str(a, 'upstream-film') ?? 'studies/index.html';
const paperMode = a.paper === true;
const size = Number(str(a, 'size') ?? 1080);
const engines: EngineName[] = a.engine
  ? [str(a, 'engine') as EngineName]
  : ['firefox', 'chromium'];

const head = execFileSync('git', ['-C', upstreamDir, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
if (head !== PINNED) {
  console.error(
    `parity refuses to run: reference clone is at ${head.slice(0, 8)} but the fixtures were\n` +
      `captured at ${PINNED.slice(0, 8)}. Either check the clone back to the pinned commit, or\n` +
      `re-capture the fixtures and update PARITY.md deliberately.`,
  );
  process.exit(2);
}

const sum = (b: Buffer): string =>
  crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const outDir = path.join(here, '..', 'out', 'parity');

/** Draw the upstream page's own baked `paper` canvas into its canvas, without editing the clone. */
const drawUpstreamPaper = `() => {
  const c = document.querySelector('canvas');
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage((0, eval)('paper'), 0, 0);
}`;

let failures = 0;
const times = paperMode
  ? [0]
  : (str(a, 'times') ?? '0')
      .split(',')
      .map(Number)
      .filter((n) => !Number.isNaN(n));

for (const engine of engines) {
  const browser = await launch(engine);
  const up = await openFilm(browser, path.join(upstreamDir, upstreamFilm), {
    size,
  });
  const port = await openFilm(browser, ported, { size });

  console.log(`${engine}:`);
  for (const t of times) {
    let upShot: Buffer;
    if (paperMode) {
      await up.page.evaluate(`(${drawUpstreamPaper})()`);
      upShot = await canvasShot(up.page);
    } else {
      upShot = await frameAt(up.page, t);
    }
    const portShot = await frameAt(port.page, t);
    const [hu, hp] = [sum(upShot), sum(portShot)];
    const match = hu === hp;
    const authoritative = engine === 'firefox';
    if (!match && authoritative) failures++;
    const mark = match ? 'MATCH' : authoritative ? 'FAIL ' : 'diff ';
    console.log(
      `  ${mark} t=${String(t).padEnd(6)} upstream=${hu}  ported=${hp}`,
    );
    if (!match) {
      fs.mkdirSync(outDir, { recursive: true });
      const tag = `${paperMode ? 'paper' : `t${t}`}-${engine}`;
      fs.writeFileSync(path.join(outDir, `${tag}.upstream.png`), upShot);
      fs.writeFileSync(path.join(outDir, `${tag}.ported.png`), portShot);
      console.log(
        `        wrote ${path.relative(process.cwd(), outDir)}/${tag}.{upstream,ported}.png`,
      );
    }
  }
  await browser.close();
}

console.log(
  failures
    ? `\n${failures} parity failure(s) in firefox — the port diverges from upstream`
    : '\nported output is identical to upstream in firefox',
);
process.exit(failures ? 1 : 0);
