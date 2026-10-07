/**
 * Guards the v2 autosave fixtures: real sessions the editor stored, which
 * the codec v3 migration (milestone 1.3) is tested on, so they must stay
 * exactly what the editor wrote. `scripts/studio-perf/roundtrip.mjs
 * --capture-fixtures` saves each one as the stored string pretty-printed and
 * records the string's UTF-8 size and SHA-256 in manifest.json. This checks
 * that every file still turns back into that exact string, and that the
 * manifest and the folder list the same files. A fixture edited by hand, or
 * reformatted in a way that changes a value, fails here.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/fixtures/v2/manifest.test.ts
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ManifestEntry {
  file: string;
  tracks: number;
  bytes: number;
  sha256: string;
}

interface Manifest {
  storageKey: string;
  sessionSchemaVersion: number;
  fixtures: ManifestEntry[];
}

interface StoredSession {
  version: number;
  timestamp: number;
  data: { tracks: unknown[] };
}

const DIR = resolve(process.cwd(), 'src/daw/persistence/__tests__/fixtures/v2');
const manifest = JSON.parse(
  readFileSync(join(DIR, 'manifest.json'), 'utf8'),
) as Manifest;

describe('v2 autosave fixtures', () => {
  it('lists every fixture in the folder, and only those', () => {
    const files = readdirSync(DIR)
      .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
      .sort();
    expect(manifest.fixtures.map((f) => f.file).sort()).toEqual(files);
  });

  for (const entry of manifest.fixtures) {
    it(`${entry.file} is the stored string, byte for byte`, () => {
      // The stored value was single-line JSON.stringify output, so parsing
      // the pretty-printed file and serialising it again must give it back.
      const stored = JSON.stringify(
        JSON.parse(readFileSync(join(DIR, entry.file), 'utf8')),
      );
      expect(Buffer.byteLength(stored, 'utf8')).toBe(entry.bytes);
      expect(createHash('sha256').update(stored).digest('hex')).toBe(
        entry.sha256,
      );
      const session = JSON.parse(stored) as StoredSession;
      expect(session.version).toBe(manifest.sessionSchemaVersion);
      expect(session.data.tracks).toHaveLength(entry.tracks);
    });
  }
});
