/**
 * Read the determinism core's actual outputs out of the LIVE upstream page and freeze them as
 * fixtures. Run once, against the pinned clone.
 *
 *   node tools/capture-goldens.ts [--upstream <dir>]
 *
 * Why this exists: it converts the two most dangerous modules — the RNG and the halftone screen —
 * into plain JSON that vitest can check in Node with no browser and no canvas. Phases 1 and 2 are
 * then provable before a single pixel is drawn, and a Prettier reparenthesisation of the mulberry32
 * bit-twiddling becomes a red test rather than a silent visual regression.
 *
 * Read-only on the clone: it opens the page and evaluates, it never writes there.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';
import { args, str } from './lib/args.ts';
import { launch } from './lib/browser.ts';

const a = args(process.argv.slice(2));
const upstream =
  str(a, 'upstream') ??
  `${process.env.HOME}/Desktop/References/riso-windowseat`;
const here = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'src', 'core', '__tests__');

const sha = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();

/** Keys the studies actually draw with, plus synthetic ones covering the construction patterns. */
const KEYS = [
  'paper',
  'flame:bed',
  'flame:cut',
  'launch:bird',
  'launch:edge',
  'weight:bank',
  'weight:dust',
  'weight:stone',
  'thr:blue',
  'thr:yellow',
  'silhouette:blue',
  'silhouette:shape',
  'silhouette:blue:void',
  '',
  'a',
  'zzzzzzzzzzzzzzzz',
  'A key with spaces, punctuation & Ünïcødé ✎',
];

const SEEDS = [0, 1, 2, 0x6d2b79f5, 2166136261, 4294967295, 123456789];

const browser = await launch('firefox');
const page = await browser.newPage();
const href = url.pathToFileURL(
  path.resolve(upstream, 'studies/index.html'),
).href;
await page.goto(href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__riso?.ready === true, null, {
  timeout: 180000,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const golden = await page.evaluate(
  ({ keys, seeds }: { keys: string[]; seeds: number[] }) => {
    /* The page is a classic script, so its top-level `function` declarations (hash, mulberry32,
       wobbler) land on globalThis but its top-level `const`s (rngFor) do NOT — they live in the
       global lexical environment. eval() is the only way to reach both uniformly. */
    const pick = (name: string): any => (0, eval)(name);
    const g = {
      hash: pick('hash') as (s: string) => number,
      mulberry32: pick('mulberry32') as (a: number) => () => number,
      rngFor: pick('rngFor') as (k: string) => () => number,
      screenOf: pick('screenOf') as (n: string) => any,
      wobbler: pick('wobbler') as (
        k: string,
        h?: number,
      ) => (th: number) => number,
    };
    const draws = (r: () => number, n: number): number[] =>
      Array.from({ length: n }, () => r());
    return {
      hash: Object.fromEntries(keys.map((k) => [k, g.hash(k)])),
      mulberry32: Object.fromEntries(
        seeds.map((s) => [s, draws(g.mulberry32(s), 16)]),
      ),
      rngFor: Object.fromEntries(keys.map((k) => [k, draws(g.rngFor(k), 16)])),
      /* The halftone threshold tile per ink. Unlike the wobbler, this is built only from
         multiplication, division and Math.sqrt - and IEEE-754 requires sqrt to be correctly
         rounded - so these values should be bit-portable across engines and can be asserted
         exactly in Node. capture asserts that expectation rather than trusting it. */
      screens: Object.fromEntries(
        (
          [
            'blue',
            'pink',
            'yellow',
            'green',
            'orange',
            'violet',
            'indigo',
          ] as const
        ).map((n) => {
          const sc = pick('screenOf')(n);
          return [
            n,
            {
              S: sc.S,
              P: sc.P,
              ptsCount: sc.pts.length,
              wrappedCount: sc.wrapped.length,
              pts: sc.pts.map((q: number[]) => [q[0], q[1]]),
              th: Array.from(sc.th as Float32Array),
            },
          ];
        }),
      ),
      wobbler: Object.fromEntries(
        keys.slice(0, 8).map((k) => {
          const w = g.wobbler(k, 3);
          const w5 = g.wobbler(k, 5);
          const at = [0, 0.5, 1, 2, Math.PI, 6.283185307179586, -1.25];
          return [
            k,
            {
              h3: at.map((t: number) => w(t)),
              h5: at.map((t: number) => w5(t)),
            },
          ];
        }),
      ),
    };
  },
  { keys: KEYS, seeds: SEEDS },
);
/* eslint-enable @typescript-eslint/no-explicit-any */

await browser.close();

fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'core.golden.json');
fs.writeFileSync(
  file,
  `${JSON.stringify({ _upstream: sha, _source: 'studies/index.html', ...golden }, null, 2)}\n`,
);
console.log(
  `wrote ${path.relative(process.cwd(), file)} from upstream ${sha.slice(0, 8)}`,
);
console.log(
  `  ${Object.keys(golden.hash).length} hashes, ${Object.keys(golden.mulberry32).length} seeds, ` +
    `${Object.keys(golden.rngFor).length} key streams, ${Object.keys(golden.wobbler).length} wobblers`,
);
for (const [ink, sc] of Object.entries(golden.screens)) {
  console.log(
    `  screen ${ink.padEnd(7)} S=${String(sc.S).padStart(2)} P=${sc.P.toFixed(4)} ` +
      `dots=${String(sc.ptsCount).padStart(2)} tile=${sc.th.length}`,
  );
}
