/**
 * A direct port of upstream's `.claude/hooks/check-film-invariants.py`, as a test rather than a
 * git hook — this repo already runs vitest in CI and on pre-push, so it needs no extra wiring, and
 * it catches indirect evasions (`globalThis['Math']['random']`) that an ESLint rule cannot see.
 *
 * The rule it enforces: a frame is a pure function of `t`. Randomness comes from `rngFor(key)`;
 * clocks belong in tools/, not in the engine. A single `Math.random()` anywhere in here makes the
 * texture crawl — upstream calls that "the single most recognisable way this look goes wrong".
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { describe, expect, it } from 'vitest';

const pkgDir = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const srcDir = path.join(pkgDir, 'src');
/* Films registered in the harness are exactly the kind of file this rule exists to constrain, and
   they are a sibling of src/ — so scan them too, or the guard has a hole where it matters most. */
const harnessDir = path.join(pkgDir, 'harness');

/**
 * The player is the one legitimate clock owner. `film/mount.ts` reads `performance.now()` to drive
 * playback — it is the thing that CALLS seek(t), not a film, and upstream's own player does the
 * same. The rule being enforced is "a frame is a pure function of t", which constrains the engine
 * and the films, not the transport that supplies t.
 *
 * This is an allowlist of exactly one file on purpose. Adding to it should feel expensive.
 */
const CLOCK_OWNERS = new Set(['src/film/mount.ts']);

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return e.isFile() && p.endsWith('.ts') ? [p] : [];
  });

const rel = (f: string): string =>
  path.relative(pkgDir, f).split(path.sep).join('/');

/* Upstream strips comments before scanning, because the contract is quoted in each film header —
   and these modules quote it too. Block comments first, then line comments. */
const strip = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const FORBIDDEN: [string, RegExp][] = [
  ['Math.random', /Math\s*\.\s*random\s*\(|\[\s*['"]random['"]\s*\]/],
  ['Date.now', /Date\s*\.\s*now\s*\(/],
  ['performance.now', /performance\s*\.\s*now\s*\(/],
];

describe('seek(t) purity', () => {
  const files = [...walk(srcDir), ...walk(harnessDir)];

  it('scans both the engine and the harness films', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.map(rel)).toContain('harness/proof-paper.ts');
    expect(files.map(rel)).toContain('src/canvas/paper.ts');
  });

  it.each(FORBIDDEN)('no %s anywhere in the engine', (label, re) => {
    const offenders = files
      .filter((f) => !(label !== 'Math.random' && CLOCK_OWNERS.has(rel(f))))
      .filter((f) => re.test(strip(fs.readFileSync(f, 'utf8'))));
    expect(
      offenders.map(rel),
      `${label} breaks purity in t — seed from rngFor(key) instead`,
    ).toEqual([]);
  });

  /* Math.random is banned even in the player: nothing in this package may ever produce a value
     that cannot be reproduced from a seed. */
  it('bans Math.random with no exemptions at all', () => {
    const re = FORBIDDEN[0][1];
    expect(
      files.filter((f) => re.test(strip(fs.readFileSync(f, 'utf8')))).map(rel),
    ).toEqual([]);
  });

  it('keeps the clock-owner allowlist to the player only', () => {
    expect([...CLOCK_OWNERS]).toEqual(['src/film/mount.ts']);
  });
});
