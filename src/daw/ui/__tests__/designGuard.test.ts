import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ── The design ratchet for the legacy editor (plan 2.1) ─────────────────────
// New code in src/daw/ui and src/daw/shell is held to the tokens by ESLint
// (.eslintrc.cjs; guardrails.test.ts). The rest of src/daw predates them, so
// it gets a ratchet instead: each file may keep the colour literals, small
// text, literal z-indexes, tap-scale animations and native dialogs it has
// today, never more. designGuard.budgets.json holds the counts. A file that
// goes over fails, a new file starts at zero, and a budget higher than its
// file's count fails as stale, so every cleanup locks itself in.
//
// After a cleanup, lower the budgets with
//   DESIGN_BUDGETS=lower npx vitest run src/daw/ui/__tests__/designGuard.test.ts
// (DESIGN_BUDGETS=write sets them to today's counts, for a deliberate raise
// that review will see in the diff).
//
// Some things are gone for good, everywhere in src/daw: the teal accent, the
// legacy --color-* tokens, glass panels and body.daw-active.
//
// The same split holds in the rendered page: the harness's design probe
// (scripts/studio-perf/designProbe.mjs) checks the text floor and 24×24
// targets everywhere except under [data-ds="legacy"].

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../../../..');
const DAW = join(REPO, 'src/daw');
const BUDGETS = join(HERE, 'designGuard.budgets.json');

/** Covered by ESLint instead (tokens.ts is the one file that spells colours). */
const NEW_CODE = ['src/daw/ui/', 'src/daw/shell/'];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === '__gallery__'
        ? []
        : sources(path);
    }
    if (!/\.(tsx?|css)$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [path];
  });
}

/** Comments blanked out (newlines kept), so they never count. */
function code(source: string, css: boolean): string {
  const blanked = source.replace(/\/\*[\s\S]*?\*\//g, (c) =>
    c.replace(/[^\n]/g, ' '),
  );
  return css ? blanked : blanked.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

const count = (text: string, pattern: RegExp) =>
  text.match(new RegExp(pattern.source, pattern.flags + 'g'))?.length ?? 0;

/** What the ratchet counts, per file. */
const RATCHET = {
  /** A hex colour in a string, a style or a stylesheet. */
  hex: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/,
  /** An rgb()/hsl() colour with numbers in it. */
  rgb: /(?:rgba?|hsla?)\(\s*\d/,
  /** Text under 11 px: Tailwind sizes, style objects, CSS, canvas fonts. */
  smallText:
    /text-\[(?:length:)?(?:\d|10)(?:\.\d+)?px\]|fontSize:\s*['"]?(?:\d|10)(?:\.\d+)?(?:px)?['"]?(?=[,\s}])|font-size:\s*(?:\d|10)(?:\.\d+)?px|font\s*=\s*[`'"][^`'"]*?(?<![\d.])(?:\d|10)(?:\.\d+)?px/,
  /** A literal z-index: a Tailwind step, a style number or a CSS value. */
  zIndex:
    /(?<![\w-])-?z-(?:\d+|\[-?\d+\])(?![\w-])|zIndex:\s*-?\d|z-index:\s*-?\d/,
  /** framer-motion's tap scale, which shifts a control under the pointer. */
  whileTap: /\bwhileTap\b/,
  /** The browser's own dialogs, which the editor replaces (2.3). */
  nativeDialog:
    /(?:\bwindow\.)(?:confirm|prompt|alert)\(|(?<![\w.$])(?:confirm|prompt|alert)\(/,
} as const;

type Metric = keyof typeof RATCHET;
type Counts = Partial<Record<Metric, number>>;

/** Gone for good, in all of src/daw, new code included. */
const BANNED: Record<string, RegExp> = {
  'the teal accent': /7ecfcf|126,\s*207,\s*207/i,
  'a legacy --color-* token': /--color-[a-z]/,
  'a glass panel': /glass-panel|--glass-/,
  'body.daw-active': /daw-active/,
};

function measure(): Map<string, Counts> {
  const out = new Map<string, Counts>();
  for (const file of sources(DAW)) {
    const rel = relative(REPO, file).split('\\').join('/');
    if (NEW_CODE.some((dir) => rel.startsWith(dir))) continue;
    const text = code(readFileSync(file, 'utf8'), rel.endsWith('.css'));
    const counts: Counts = {};
    for (const [metric, pattern] of Object.entries(RATCHET) as Array<
      [Metric, RegExp]
    >) {
      const n = count(text, pattern);
      if (n > 0) counts[metric] = n;
    }
    if (Object.keys(counts).length > 0) out.set(rel, counts);
  }
  return out;
}

function sorted(map: Map<string, Counts>): Record<string, Counts> {
  return Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
}

const actual = measure();
const mode = process.env.DESIGN_BUDGETS;
let budgets: Record<string, Counts> = JSON.parse(
  readFileSync(BUDGETS, 'utf8'),
) as Record<string, Counts>;

if (mode === 'write' || mode === 'lower') {
  const next = new Map<string, Counts>();
  for (const [file, counts] of actual) {
    const kept: Counts = {};
    for (const [metric, n] of Object.entries(counts) as Array<
      [Metric, number]
    >) {
      const budget = budgets[file]?.[metric] ?? 0;
      // Lowering never raises: a count over budget stays a failure.
      const value = mode === 'write' ? n : Math.min(n, budget);
      if (value > 0) kept[metric] = value;
    }
    if (Object.keys(kept).length > 0) next.set(file, kept);
  }
  budgets = sorted(next);
  writeFileSync(BUDGETS, JSON.stringify(budgets, null, 2) + '\n');
}

describe('the legacy design ratchet', () => {
  it('lets no file go over its budget', () => {
    const over: string[] = [];
    for (const [file, counts] of actual) {
      for (const [metric, n] of Object.entries(counts) as Array<
        [Metric, number]
      >) {
        const budget = budgets[file]?.[metric] ?? 0;
        if (n > budget) over.push(`${file}: ${metric} ${n} (budget ${budget})`);
      }
    }
    expect(over).toEqual([]);
  });

  it('keeps no budget above what its file has (lower it when code improves)', () => {
    const stale: string[] = [];
    for (const [file, counts] of Object.entries(budgets)) {
      for (const [metric, budget] of Object.entries(counts) as Array<
        [Metric, number]
      >) {
        const n = actual.get(file)?.[metric] ?? 0;
        if (budget > n)
          stale.push(`${file}: ${metric} ${n} (budget ${budget})`);
      }
    }
    expect(stale).toEqual([]);
  });
});

describe('retired for good in src/daw', () => {
  const files = sources(DAW).map((file) => ({
    rel: relative(REPO, file).split('\\').join('/'),
    text: code(readFileSync(file, 'utf8'), file.endsWith('.css')),
  }));

  for (const [what, pattern] of Object.entries(BANNED)) {
    it(`has no ${what}`, () => {
      expect(
        files.filter((f) => pattern.test(f.text)).map((f) => f.rel),
      ).toEqual([]);
    });
  }
});
