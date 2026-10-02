import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The app's look, held in place (decided 29 Sep 2026): Glacial Indifference
 * everywhere, and no brand yellow. Every exception here was signed off one by
 * one in the restyle inventory; anything new has to be argued for the same
 * way — by adding it to an allowlist below, with the reason.
 *
 * What stays yellow is colour that MEANS something: A's key colour (#FFCB30,
 * a hair from the old brand yellow), warnings, award gold, chart series. Those
 * are not brand-family values, so they are not what this file looks for.
 * What stays serif is SMuFL music notation: Bravura glyphs, and the serif they
 * fall back to for the moment before the font arrives.
 */

const ROOT = 'src';
/** The console forces Glacial on everything it renders (console.css). */
const SKIP_DIRS = new Set(['node_modules', '__snapshots__']);
const SKIP_PREFIXES = ['src/features/admin/'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return SKIP_DIRS.has(name) ? [] : sourceFiles(path);
    }
    if (!/\.(tsx?|css)$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return [];
    return [path];
  });
}

const isComment = (line: string) => /^\s*(\/\/|\/\*|\*)/.test(line);

/** Blank out block comments, keeping their newlines so line numbers hold. */
const stripBlockComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );

type Hit = { file: string; line: number; text: string };

function scan(test: (line: string) => boolean): Hit[] {
  return sourceFiles(ROOT).flatMap((file) =>
    stripBlockComments(readFileSync(file, 'utf8'))
      .split('\n')
      .flatMap((text, i) =>
        !isComment(text) && test(text)
          ? [{ file, line: i + 1, text: text.trim().slice(0, 120) }]
          : [],
      ),
  );
}

/** A signed-off exception: this many occurrences may remain in this file. */
type Allowed = { file: string; count: number; why: string };

function unexplained(hits: Hit[], allowed: Allowed[]): string[] {
  const byFile = new Map<string, Hit[]>();
  for (const hit of hits) {
    byFile.set(hit.file, [...(byFile.get(hit.file) ?? []), hit]);
  }
  return [...byFile].flatMap(([file, list]) => {
    const budget = allowed.find((a) => a.file === file)?.count ?? 0;
    return list.length > budget
      ? list.map((h) => `${h.file}:${h.line}  ${h.text}`)
      : [];
  });
}

describe('no brand yellow', () => {
  // The retired brand family. #FFCB30 is deliberately absent: it is A's key
  // colour and appears wherever the 12-key rainbow does.
  const BRAND = /#(FFCC33|FFB219|F2920C|FFE873|FFF9B2)\b/i;

  it('leaves no brand-family value in the app', () => {
    expect(
      unexplained(
        scan((l) => BRAND.test(l)),
        [],
      ),
    ).toEqual([]);
  });
});

describe('Glacial Indifference everywhere', () => {
  it('uses no serif class', () => {
    expect(
      unexplained(
        scan((l) => /\bfont-serif\b/.test(l)),
        [],
      ),
    ).toEqual([]);
  });

  it('uses no mono class except the one kept on purpose', () => {
    const allowed: Allowed[] = [
      {
        file: 'src/features/teacher/components/InviteStudentDialog.tsx',
        count: 1,
        why: 'The classroom join code students copy character by character; kept monospace by the owner.',
      },
    ];
    expect(
      unexplained(
        scan((l) => /\bfont-mono\b/.test(l)),
        allowed,
      ),
    ).toEqual([]);
  });

  it('declares no serif or monospace family outside music notation', () => {
    // A font declaration: CSS or JSX font-family, or a canvas `ctx.font`.
    const declares = /font-?family|fontFamily|\.font\s*=/i;
    // A serif or mono family — not 'sans-serif', which only contains 'serif'.
    const family =
      /(?<![-\w])(serif|monospace|ui-monospace|Menlo|Monaco|Consolas|Courier|SFMono-Regular|Georgia|Fraunces|Times New Roman)\b/;
    const hits = scan(
      (l) =>
        declares.test(l) &&
        family.test(l) &&
        // SMuFL notation: the glyph font and its load-time fallback.
        !/Bravura|Petaluma/.test(l) &&
        // A fallback chain that leads with Glacial is Glacial.
        !/Glacial Indifference['"]?\s*,/.test(l),
    );
    const allowed: Allowed[] = [
      {
        file: 'src/components/songLibrary/ChordChart.tsx',
        count: 11,
        why: 'The song chord chart keeps its serif notation — chord symbols, section labels, time signatures, the segno and the chord popup (owner, 29 Sep 2026, after seeing it in Glacial).',
      },
    ];
    expect(unexplained(hits, allowed)).toEqual([]);
  });
});
