/**
 * Guards the autosave fixtures: real sessions the editor stored, which the
 * codec v3 migration (milestone 1.3) is tested on, so they must stay exactly
 * what the editor wrote. `scripts/studio-perf/roundtrip.mjs
 * --capture-fixtures` saves each one as the stored string pretty-printed and
 * records the string's UTF-8 size and SHA-256 in its folder's manifest.json.
 * Each folder is one dialect:
 * - v2/: written before milestone 1.1, as students' browsers hold today;
 * - v2-1.2/: written by milestones 1.1 and 1.2, which added each track's
 *   trackRole and audioInputChannel and random chord ids without a version
 *   bump (captured with --fixtures-dir).
 * - v3/: written by milestone 1.3's codec, "schema": 3 inside the v2
 *   envelope ("version": 2, decision D1).
 * This checks that every file still turns back into that exact string, and
 * that each manifest and its folder list the same files. A fixture edited by
 * hand, or reformatted in a way that changes a value, fails here.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/fixtures/manifest.test.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  schema?: number;
  timestamp: number;
  data: { tracks: unknown[] };
}

const ROOT = resolve(process.cwd(), 'src/daw/persistence/__tests__/fixtures');
const FOLDERS = readdirSync(ROOT, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(ROOT, entry.name, 'manifest.json')),
  )
  .map((entry) => entry.name)
  .sort();

describe('autosave fixtures', () => {
  it('holds both v2 dialects', () => {
    expect(FOLDERS).toEqual(expect.arrayContaining(['v2', 'v2-1.2']));
  });

  for (const folder of FOLDERS) {
    const dir = join(ROOT, folder);
    const manifest = JSON.parse(
      readFileSync(join(dir, 'manifest.json'), 'utf8'),
    ) as Manifest;

    describe(folder, () => {
      it('lists every fixture in the folder, and only those', () => {
        const files = readdirSync(dir)
          .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
          .sort();
        expect(manifest.fixtures.map((f) => f.file).sort()).toEqual(files);
      });

      for (const entry of manifest.fixtures) {
        it(`${entry.file} is the stored string, byte for byte`, () => {
          // The stored value was single-line JSON.stringify output, so
          // parsing the pretty-printed file and serialising it again must
          // give it back.
          const stored = JSON.stringify(
            JSON.parse(readFileSync(join(dir, entry.file), 'utf8')),
          );
          expect(Buffer.byteLength(stored, 'utf8')).toBe(entry.bytes);
          expect(createHash('sha256').update(stored).digest('hex')).toBe(
            entry.sha256,
          );
          const session = JSON.parse(stored) as StoredSession;
          expect(session.schema ?? session.version).toBe(
            manifest.sessionSchemaVersion,
          );
          if (manifest.sessionSchemaVersion < 3) {
            expect(session.schema).toBeUndefined();
          }
          expect(session.data.tracks).toHaveLength(entry.tracks);
        });
      }
    });
  }
});
