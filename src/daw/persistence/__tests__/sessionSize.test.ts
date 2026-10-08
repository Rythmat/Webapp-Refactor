// @vitest-environment jsdom
/**
 * What codec v3 costs in localStorage. The autosave, kept work and 1.4's
 * mirror share about 5M characters with the rest of the app, and kept work
 * has a 1M budget across every student on a device, so v3's additions are
 * held to a budget: each note id costs at most 15 characters (12 for the id,
 * its quotes and a comma), and the new blocks (the mastering rack, notation,
 * view, Prism builder, metre) at most 4,000 characters per project.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/sessionSize.test.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeSession,
  encodeSession,
  type StoredSession,
} from '../projectDocument/codec';
import { migrateSession } from '../projectDocument/migrations';

const FIXTURES = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);

/** Characters per note an id adds: `"` 12 characters `"` and a comma. */
const ID_CHARS_PER_NOTE = 15;
/** What the rest of v3 may add to a project, whatever its size. */
const BLOCKS_BUDGET = 4_000;

/** The fixture's stored string, and the v3 draft this build writes for it. */
function sizes(file: string) {
  const raw = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')));
  const migrated = migrateSession(raw);
  if (!migrated.ok) throw new Error(`${file}: ${migrated.detail}`);
  const { project, synthPatches } = decodeSession(migrated.session);
  const patches = new Map(synthPatches);
  const v3: StoredSession = encodeSession(
    project,
    (id) => patches.get(id),
    migrated.session.timestamp,
  );
  const clips = v3.data.tracks.flatMap((t) => t.midiClips);
  const notes = clips.reduce((sum, c) => sum + c.events.notes.length, 0);
  const idChars = clips.reduce(
    (sum, c) => sum + `,"ids":${JSON.stringify(c.events.ids)}`.length,
    0,
  );
  const v3Chars = JSON.stringify(v3).length;
  return {
    notes,
    clips: clips.length,
    v2Chars: raw.length,
    v3Chars,
    idChars,
    blockChars: v3Chars - raw.length - idChars,
  };
}

const files = ['v2', 'v2-1.2'].flatMap((folder) =>
  readdirSync(join(FIXTURES, folder))
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .map((f) => join(FIXTURES, folder, f)),
);

describe('the size of a v3 draft', () => {
  for (const file of files) {
    it(`${file.slice(FIXTURES.length + 1)} stays within budget`, () => {
      const size = sizes(file);
      // Up to 10 more per clip for the `,"ids":[]` around its ids.
      expect(size.idChars).toBeLessThanOrEqual(
        size.notes * ID_CHARS_PER_NOTE + size.clips * 10,
      );
      expect(size.blockChars).toBeLessThanOrEqual(BLOCKS_BUDGET);
    });
  }

  it('the 570-note funk practice track: about half as large again', () => {
    const size = sizes(join(FIXTURES, 'v2/practice-funk-1-a.json'));
    expect(size.notes).toBe(570);
    const growth = size.v3Chars / size.v2Chars - 1;
    console.info(
      `[size] practice-funk-1-a: v2 ${size.v2Chars} → v3 ${size.v3Chars} characters (+${Math.round(growth * 100)}%): note ids ${size.idChars}, other v3 blocks ${size.blockChars}`,
    );
    expect(growth).toBeLessThan(0.6);
  });
});
