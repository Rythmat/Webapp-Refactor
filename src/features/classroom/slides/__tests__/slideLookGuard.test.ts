import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The slides in the app's look (owner, 2026-11-09): the Studio's neutral
 * surfaces, white for the lead, colour only where it means something (a
 * feeling, a status). This holds the pieces the restyle removed out of every
 * surface a lesson is shown on, so they cannot drift back one file at a time.
 */

const ROOTS = [
  'src/features/classroom/slides',
  'src/features/classroom/live',
  'src/features/classroom/presentation',
  'src/features/classroom/feelings',
];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)
      ? [path]
      : [];
  });

/** Code only: comments may still name what was removed and why. */
const code = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');

const hits = (pattern: RegExp) =>
  ROOTS.flatMap(files).filter((file) =>
    pattern.test(code(readFileSync(file, 'utf8'))),
  );

describe('the slides keep the app look', () => {
  it('uses no teal accent', () => {
    expect(hits(/7ecfcf|126,\s*207,\s*207/i)).toEqual([]);
  });

  it('puts no blur behind a slide surface', () => {
    expect(hits(/backdrop-blur/)).toEqual([]);
  });

  it('has no per-phase rainbow or glow', () => {
    expect(
      hits(/PHASE_ACCENT|slide-frame__glow|chip-dot|--pres-accent-/),
    ).toEqual([]);
  });

  it('keeps no cream legacy board', () => {
    expect(hits(/F7F1E3/i)).toEqual([]);
  });
});
