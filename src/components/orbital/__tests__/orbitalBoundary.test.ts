// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '../../..');
const ORBITAL = resolve(__dirname, '..');
const FORBIDDEN = [
  join(SRC, 'features/admin'),
  join(SRC, 'features/cortex'),
  join(SRC, 'content/graph/repoSnapshot'),
];

/** Static `from '…'`, side-effect `import '…'` and dynamic `import('…')`. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;

function* code(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__') yield* code(path);
    } else if (/\.tsx?$/.test(name)) yield path;
  }
}

const target = (file: string, specifier: string): string | null => {
  if (specifier.startsWith('@/')) return join(SRC, specifier.slice(2));
  if (specifier.startsWith('.')) return resolve(dirname(file), specifier);
  return null;
};

const offences = (file: string, text: string): string[] =>
  [...text.matchAll(SPECIFIER)]
    .map(([, specifier]) => target(file, specifier))
    .filter(
      (path): path is string =>
        path !== null && FORBIDDEN.some((bad) => path.startsWith(bad)),
    );

describe('the orbital stage takes everything as props', () => {
  it('imports neither the student nor the console', () => {
    const found = [...code(ORBITAL)].flatMap((file) =>
      offences(file, readFileSync(file, 'utf8')),
    );
    expect(found).toEqual([]);
  });

  it('would notice if it did', () => {
    const file = join(ORBITAL, 'OrbitalStage.tsx');
    expect(
      offences(file, `import { x } from '@/features/admin/content/graph';`),
    ).toHaveLength(1);
    expect(
      offences(file, `const y = import('@/features/cortex/buildWeb');`),
    ).toHaveLength(1);
    expect(offences(file, `import { z } from 'lucide-react';`)).toEqual([]);
  });

  it('finds the files it guards', () => {
    expect([...code(ORBITAL)].length).toBeGreaterThan(1);
  });
});
