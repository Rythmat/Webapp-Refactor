import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AtlasRoutes } from '@/constants/routes';

/**
 * The globe deep link must target `/atlas/globe`, never `/atlas`.
 *
 * `/atlas` is the Globe Dashboard. It renders happily and ignores `?event=`,
 * so a link pointed there does not fail — it just lands on the dashboard and
 * the song is never selected. `useSongActions.openInGlobe` did exactly that:
 * the route moved, `songDeepLinks.songGlobeRoute` was extracted and updated,
 * and the original kept the old path. Nothing caught it because nothing broke.
 *
 * This scans the source rather than calling the hook, because the failure is a
 * hardcoded string and that is what needs to be impossible to reintroduce.
 */

const SRC = path.resolve('src');

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      yield* walk(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

describe('globe deep links', () => {
  it('resolves the globe to /atlas/globe', () => {
    expect(AtlasRoutes.globe()).toBe('/atlas/globe');
    expect(AtlasRoutes.root()).toBe('/atlas');
  });

  it('never points an ?event= link at the dashboard', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.endsWith('globeDeepLink.test.ts')) continue;
      const src = fs.readFileSync(file, 'utf8');
      // `/atlas?…` is the dashboard with params it will silently drop.
      // `/atlas/globe?…` is the one that works.
      for (const m of src.matchAll(/['"`]\/atlas\?[^'"`]*/g)) {
        offenders.push(`${path.relative(SRC, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
