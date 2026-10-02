import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The importer is a Node script: `node:fs`, the network, and a CLI that runs
 * the moment it is imported. The app may read the importer's committed
 * artifacts (`suggestions/*.json`), never its code.
 *
 * The eager-bundle test (features/admin/table/__tests__/eagerBoundary.test.ts)
 * refuses a few importer modules by name when the console's eager chrome
 * loads. This covers every module here, present and future, from anywhere in
 * the app: no file outside `src/scripts/` may import one, by alias or by
 * relative path. Tests are left out — they don't ship, and the eager-bundle
 * test names the importer on purpose.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const IMPORTER = join(SRC, 'scripts', 'enrichment');
const SCRIPTS = join(SRC, 'scripts');

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const isTest = (path: string) =>
  path.split(sep).includes('__tests__') || /\.test\.[jt]sx?$/.test(path);

function* appFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path === SCRIPTS || name === 'node_modules') continue;
    if (statSync(path).isDirectory()) yield* appFiles(path);
    else if (CODE.test(name) && !isTest(path)) yield path;
  }
}

/** Static `from '…'`, side-effect `import '…'` and dynamic `import('…')`. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;

/** Where a specifier points on disk, for the app's `@/` alias and relative paths. */
function target(file: string, specifier: string): string | null {
  const bare = specifier.split('?')[0];
  if (bare.startsWith('@/')) return join(SRC, bare.slice(2));
  if (bare.startsWith('.')) return resolve(dirname(file), bare);
  return null;
}

/** Code, as against the JSON artifacts the app is meant to read. */
const isImporterCode = (path: string) =>
  (path === IMPORTER || path.startsWith(IMPORTER + sep)) &&
  !path.endsWith('.json');

describe('the importer stays out of the app', () => {
  it('no app module imports importer code', () => {
    const offenders: string[] = [];
    for (const file of appFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes('enrichment')) continue;
      for (const [, specifier] of text.matchAll(SPECIFIER)) {
        const path = target(file, specifier);
        if (path && isImporterCode(path)) {
          offenders.push(`${relative(SRC, file)} → ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('would notice if one did', () => {
    const app = join(SRC, 'features', 'admin', 'x.ts');
    for (const specifier of [
      '@/scripts/enrichment/import/cacheStage',
      '@/scripts/enrichment/importSuggestions',
      '../../scripts/enrichment/import/paths',
    ]) {
      const path = target(app, specifier);
      expect(path && isImporterCode(path)).toBe(true);
    }
    // The committed artifacts are the app's to read.
    const artifact = target(
      app,
      '@/scripts/enrichment/suggestions/artist.json?raw',
    );
    expect(artifact && isImporterCode(artifact)).toBe(false);
    expect(
      [...`import('@/scripts/enrichment/import/args')`.matchAll(SPECIFIER)].map(
        (m) => m[1],
      ),
    ).toEqual(['@/scripts/enrichment/import/args']);
  });
});
