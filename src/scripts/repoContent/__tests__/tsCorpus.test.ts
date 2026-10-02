import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import {
  type DeclarationLocator,
  firstDifference,
  formatPath,
  type Json,
  propertyKey,
  readDeclaration,
  type ReadDeclaration,
} from '../literal';
import {
  TS_FILE_KINDS,
  writeTsDeclaration,
  writeTsElements,
  type TsFileKind,
} from '../tsWrite';

/**
 * The evaluator and the writer over every TypeScript data file repo mode
 * edits: the 640 song files, the 16 events files, the cities, the artist
 * registry and the chord progression library.
 *
 *  - Parity: each file evaluates to exactly what its module exports, as the
 *    mock seeds it (`plain()`, a JSON round trip). So the store's items
 *    are the app's data, not an approximation of it.
 *  - Idempotence: writing back the body a file evaluates to leaves the text
 *    byte-identical, both the quick way (nothing to splice) and forced
 *    through prettier and the round-trip check, which is what proves the
 *    files are prettier-clean and that a real edit touches only itself.
 *  - Reversibility: a real edit, then the original body written over it,
 *    gives the original text back, byte for byte.
 *
 * Everything is in memory; no file is written. The data files can change
 * under this test while other sessions work (a data-fix job may be editing
 * the registry or the events), so parity compares each file with its
 * module read at the same moment, and takes both again before a difference
 * counts.
 */

const SONGS_DIR = 'src/curriculum/data/songs';
const EVENTS_DIR = 'src/components/atlas/data/events';

const songFiles = readdirSync(SONGS_DIR)
  .filter(
    (f) =>
      f.endsWith('.ts') &&
      !f.startsWith('_') &&
      f !== 'bundled.ts' &&
      f !== 'index.ts',
  )
  .sort()
  .map((f) => `${SONGS_DIR}/${f}`);

interface ArrayFile {
  path: string;
  /** A record array's kind, whose elements have an identity field. */
  kind: TsFileKind & { identity: string };
  /** How the module exports the declaration. */
  exportName: (read: ReadDeclaration) => string;
}

const byName = (read: ReadDeclaration) => read.name;

const arrayFiles: ArrayFile[] = [
  ...readdirSync(EVENTS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort()
    .map((f) => ({
      path: `${EVENTS_DIR}/${f}`,
      kind: TS_FILE_KINDS.events,
      exportName: byName,
    })),
  {
    path: 'src/components/atlas/data/cities.ts',
    kind: TS_FILE_KINDS.cities,
    exportName: byName,
  },
  {
    path: 'src/components/atlas/data/artistRegistry.ts',
    kind: TS_FILE_KINDS.artistRegistry,
    exportName: byName,
  },
  {
    path: 'src/curriculum/data/chordProgressionLibrary.ts',
    kind: TS_FILE_KINDS.progressions,
    // Declared without `export`, and exported as the module's default.
    exportName: () => 'default',
  },
];

const plain = (value: unknown): Json => JSON.parse(JSON.stringify(value));

const read = (path: string, locator: DeclarationLocator) =>
  readDeclaration(readFileSync(path, 'utf8'), path, locator);

/** A song file's lines, without those of the given top-level properties. */
function linesWithout(text: string, path: string, keys: string[]): string[] {
  const r = readDeclaration(text, path, TS_FILE_KINDS.song.locator);
  const drop = new Set<number>();
  for (const property of (r.literal as ts.ObjectLiteralExpression).properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !keys.includes(propertyKey(property.name, r.sourceFile))
    ) {
      continue;
    }
    const lineOf = (pos: number) =>
      r.sourceFile.getLineAndCharacterOfPosition(pos).line;
    for (
      let line = lineOf(property.getStart(r.sourceFile));
      line <= lineOf(property.end);
      line++
    ) {
      drop.add(line);
    }
  }
  return text.split('\n').filter((_, i) => !drop.has(i));
}

const importFresh = (path: string): Promise<Record<string, unknown>> =>
  import(/* @vite-ignore */ resolve(path));

/**
 * The file's value and the module's export, taken again (a fresh module
 * graph, after a pause) while they disagree, up to four times: a session
 * saving the file between the read and the import is not a failure.
 */
async function agreeing(
  path: string,
  locator: DeclarationLocator,
  exportName: (read: ReadDeclaration) => string,
  first?: { read: ReadDeclaration; loaded: Json },
): Promise<{ path: string; differs: string | null }> {
  let current = first;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!current) {
      vi.resetModules();
      const r = read(path, locator);
      const module = await importFresh(path);
      current = { read: r, loaded: plain(module[exportName(r)]) };
    }
    const differs = firstDifference(current.read.value, current.loaded);
    if (differs === null) return { path, differs: null };
    if (attempt === 3) return { path, differs: formatPath(differs) };
    current = undefined;
    await new Promise((done) => setTimeout(done, 500));
  }
  return { path, differs: 'unreachable' };
}

describe('parity: each file evaluates to what its module exports', () => {
  it('every song file equals plain(BUNDLED_SONGS[id]), or its own module for the drafts', async () => {
    const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
    const bundled = new Set(Object.keys(BUNDLED_SONGS));
    const failures: { path: string; differs: string | null }[] = [];
    const drafts: string[] = [];
    for (const path of songFiles) {
      const r = read(path, TS_FILE_KINDS.song.locator);
      const id = (r.value as { id: string }).id;
      expect(`${SONGS_DIR}/${id}.ts`).toBe(path);
      if (!bundled.has(id)) drafts.push(id);
      const loaded = bundled.has(id)
        ? plain(BUNDLED_SONGS[id])
        : plain((await importFresh(path))[r.name]);
      const result = await agreeing(path, TS_FILE_KINDS.song.locator, byName, {
        read: r,
        loaded,
      });
      if (result.differs !== null) failures.push(result);
    }
    expect(failures).toEqual([]);
    expect(songFiles.length).toBeGreaterThanOrEqual(640);
    // Every bundled song has its file; the unbundled ones are the drafts.
    expect(songFiles.length - drafts.length).toBe(bundled.size);
  }, 120_000);

  it('remembers the songs that say `year: undefined`, which parity drops', () => {
    const holes = songFiles.filter((path) =>
      read(path, TS_FILE_KINDS.song.locator).undefinedProperties.some(
        (u) => u.path.length === 1 && u.path[0] === 'year',
      ),
    );
    const spelled = songFiles.filter((path) =>
      /^ {2}year: undefined,$/m.test(readFileSync(path, 'utf8')),
    );
    expect(holes).toEqual(spelled);
    expect(holes.length).toBeGreaterThan(0);
  });

  it.each(arrayFiles.map((f) => [f.path, f] as const))(
    '%s equals its module export',
    async (path, file) => {
      const result = await agreeing(path, file.kind.locator, file.exportName);
      expect(result.differs).toBeNull();
    },
    60_000,
  );

  it('the events files together hold every event of BUNDLED_MUSIC_HISTORY, once', async () => {
    vi.resetModules();
    const { BUNDLED_MUSIC_HISTORY } = await import(
      '@/components/atlas/data/events'
    );
    const ids = new Set(
      arrayFiles
        .filter((f) => f.kind === TS_FILE_KINDS.events)
        .flatMap((f) =>
          (read(f.path, f.kind.locator).value as { id: string }[]).map(
            (e) => e.id,
          ),
        ),
    );
    expect(ids.size).toBe(BUNDLED_MUSIC_HISTORY.length);
    expect(BUNDLED_MUSIC_HISTORY.every((e) => ids.has(e.id))).toBe(true);
  });
});

describe('idempotence: writing back the same body changes nothing', () => {
  it('every song file, skipped and forced through prettier', async () => {
    for (const path of songFiles) {
      const text = readFileSync(path, 'utf8');
      const r = readDeclaration(text, path, TS_FILE_KINDS.song.locator);
      const quick = await writeTsDeclaration({
        text,
        fileName: path,
        ...TS_FILE_KINDS.song,
        next: r.value,
      });
      expect({ path, changed: quick.changed, splices: quick.splices }).toEqual({
        path,
        changed: false,
        splices: 0,
      });
      expect(quick.text).toBe(text);
      const full = await writeTsDeclaration({
        text,
        fileName: path,
        ...TS_FILE_KINDS.song,
        next: r.value,
        force: true,
      });
      expect({ path, wasClean: full.wasClean }).toEqual({
        path,
        wasClean: true,
      });
      expect(full.text).toBe(text);
    }
  }, 180_000);

  it.each(arrayFiles.map((f) => [f.path, f] as const))(
    '%s, as a whole and record by record',
    async (path, file) => {
      const text = readFileSync(path, 'utf8');
      const r = readDeclaration(text, path, file.kind.locator);
      const records = r.value as Json[];
      expect(records.length).toBeGreaterThan(0);
      const quick = await writeTsDeclaration({
        text,
        fileName: path,
        ...file.kind,
        next: r.value,
      });
      expect(quick.text).toBe(text);
      expect(quick.splices).toBe(0);
      // One record written back the way the store's flush writes it.
      const one = await writeTsElements({
        text,
        fileName: path,
        ...file.kind,
        identity: file.kind.identity,
        upsert: [records[Math.floor(records.length / 2)]],
      });
      expect(one.text).toBe(text);
      const full = await writeTsDeclaration({
        text,
        fileName: path,
        ...file.kind,
        next: r.value,
        force: true,
      });
      expect(full.wasClean).toBe(true);
      expect(full.text).toBe(text);
    },
    60_000,
  );
});

describe('reversibility: an edit, then the original written over it', () => {
  it('every song: a new key and a grown array, then back', async () => {
    for (const path of songFiles) {
      const text = readFileSync(path, 'utf8');
      const original = readDeclaration(text, path, TS_FILE_KINDS.song.locator)
        .value as Record<string, Json>;
      const edit = await writeTsDeclaration({
        text,
        fileName: path,
        ...TS_FILE_KINDS.song,
        next: {
          ...original,
          subgenreIds: ['corpus-test'],
          techniques: [...(original.techniques as Json[]), 'corpus_test'],
        },
      });
      expect(edit.changed).toBe(true);
      // The edit touched the new key and the grown array, and no other line.
      expect({
        path,
        rest: linesWithout(edit.text, path, ['subgenreIds', 'techniques']),
      }).toEqual({ path, rest: linesWithout(text, path, ['techniques']) });
      const back = await writeTsDeclaration({
        text: edit.text,
        fileName: path,
        ...TS_FILE_KINDS.song,
        next: original,
      });
      expect({ path, same: back.text === text }).toEqual({ path, same: true });
    }
  }, 180_000);

  it.each(arrayFiles.map((f) => [f.path, f] as const))(
    '%s: a record edited and one appended, then back',
    async (path, file) => {
      const text = readFileSync(path, 'utf8');
      const records = readDeclaration(text, path, file.kind.locator)
        .value as Record<string, Json>[];
      const identity = file.kind.identity;
      const middle = records[Math.floor(records.length / 2)];
      const textKey = Object.keys(middle).find(
        (k) => k !== identity && typeof middle[k] === 'string',
      )!;
      const last = records[records.length - 1];
      const fresh = {
        ...last,
        [identity]:
          typeof last[identity] === 'number'
            ? Math.max(...records.map((r) => r[identity] as number)) + 1
            : 'corpus-test-record',
      };
      const edit = await writeTsElements({
        text,
        fileName: path,
        ...file.kind,
        identity,
        upsert: [
          { ...middle, [textKey]: `${middle[textKey] as string} (edited)` },
          fresh,
        ],
      });
      expect(edit.changed).toBe(true);
      const back = await writeTsDeclaration({
        text: edit.text,
        fileName: path,
        ...file.kind,
        next: records,
      });
      expect(back.text === text).toBe(true);
    },
    60_000,
  );
});
