import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GlobeRoutes } from '@/constants/routes';

/**
 * The Globe lives at `/globe`, and nothing points at its old addresses.
 *
 * Until 2026-10-29 the Globe was `/atlas/globe`, under an `/atlas` dashboard
 * that rendered happily and ignored `?event=` — a link pointed there did not
 * fail, it just landed on the dashboard and the song was never selected
 * (`useSongActions.openInGlobe` did exactly that once). The owner then removed
 * the dashboard and every `/atlas` address, with no redirects, so a link to
 * one now lands on the app's not-found page.
 *
 * This scans the source rather than calling the routes, because the failure is
 * a hardcoded string and that is what needs to be impossible to reintroduce.
 */

const SRC = path.resolve('src');

/** Files allowed to name an old address. */
const EXEMPT = [
  // This file, which names them to look for them.
  'globeDeepLink.test.ts',
  // The server's API paths (/atlas/cities, /atlas/events …), not app routes.
  'musicAtlas.generated.ts',
  // Proves the old addresses map to no table.
  'tableIds.test.ts',
];

/** The old addresses: `/atlas/globe`, a bare `/atlas…` link, the mirror's. */
const OLD = [
  /\/atlas\/?globe/g,
  /['"`]\/atlas(?=['"`?#/])/g,
  /console\/content\/atlas\b/g,
];

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
  it('resolves the globe to /globe', () => {
    expect(GlobeRoutes.root()).toBe('/globe');
  });

  it('never points at an old Globe address', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (EXEMPT.some((name) => file.endsWith(name))) continue;
      const src = fs.readFileSync(file, 'utf8');
      for (const pattern of OLD) {
        for (const m of src.matchAll(pattern)) {
          offenders.push(`${path.relative(SRC, file)}: ${m[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
