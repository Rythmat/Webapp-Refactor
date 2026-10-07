import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodTypeAny } from 'zod';
import { PROGRESSION_ID_HIGH_WATER } from '@/curriculum/data/progressionIdMark';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { readGitStatus, runGit } from '@/scripts/repoContent/gitStatus';
import { CATALOGUE_MENTION } from '@/scripts/repoContent/importRules';
import {
  loadRepoStore,
  repoContentRoot,
} from '@/scripts/repoContent/repoStore';
import { REPO_KINDS } from '@/scripts/repoContent/sources';
import CONTRACT_MANIFEST from './manifest.json';
import { chordProgressionBodySchema } from './progressionBodySchema';
import { recordBodySchemas } from './recordBodySchemas';
import SLUG_PATTERNS from './slugPatterns.generated.json';
import { songBodySchema } from './songBodySchema.v2';
import { vocabularyRecordSchemas } from './vocabularyRecordSchemas';

/**
 * The seed the content API imports once, at cutover: every item the repo
 * holds, by kind, checked against the contract it will meet
 * (docs/console-backend-integration.md, Phase 2).
 *
 *   npx tsx src/scripts/apiContract/exportSeed.ts --out seed-export
 *
 * Run from the repo root, on a commit (it reports any uncommitted data file,
 * and refuses unless `--allow-uncommitted`). It reads the repo the way repo
 * mode and the offline mock do (`loadRepoStore`: the globe's roster and
 * cities with the console's own records composed in, the song files, the
 * events, the progression library, the vocabulary files), so the API starts
 * from exactly what the console has shown. Nothing is composed here.
 *
 * It writes, into the `--out` folder (`seed-export/` is gitignored):
 *  - `<kind>.ndjson`: one item per line, `{ kind, slug, status, body }`,
 *    plus `derivedFrom` on a song's own globe event, ordered by slug;
 *  - `seed-manifest.json`: per kind its file, count, sha256 and identity
 *    field; the publish order; the contract's `artifactsVersion`; the
 *    progression id high-water mark; the commit it was read from.
 *
 * Before writing anything it checks every body against its contract schema,
 * its identity against its slug and pattern, and that no body names an
 * outside catalogue or carries one of its ids (owner, 30 Sep 2026). Any
 * problem refuses the whole export: a partial seed would make the API
 * authoritative over less than the app has.
 *
 * Lessons (`activity_flow`, `fundamentals_flow`) are not in it: the API
 * already holds them and repo mode never served them.
 */

/** The order the API releases kinds in after the import (design: Publish all). */
export const SEED_PUBLISH_ORDER: readonly MockKind[] = [
  'genre',
  'subgenre',
  'instrument',
  'globe_city',
  'label',
  'studio',
  'artist',
  'release',
  'song',
  'globe_event',
  'chord_progression',
  'artist_location',
];

/** Each kind's body schema; `artist_location` keeps today's rule. */
const SCHEMAS: Partial<Record<MockKind, ZodTypeAny>> = {
  song: songBodySchema,
  globe_event: recordBodySchemas.globe_event,
  globe_city: recordBodySchemas.globe_city,
  artist: recordBodySchemas.artist,
  release: recordBodySchemas.release,
  studio: recordBodySchemas.studio,
  label: recordBodySchemas.label,
  chord_progression: chordProgressionBodySchema,
  genre: vocabularyRecordSchemas.genre,
  subgenre: vocabularyRecordSchemas.subgenre,
  instrument: vocabularyRecordSchemas.instrument,
};

type SlugPatternRow = { identity: 'id' | 'slug'; pattern: string | null };
const PATTERNS = SLUG_PATTERNS as Record<string, SlugPatternRow>;

export interface SeedItem {
  kind: MockKind;
  slug: string;
  status?: string;
  body: Record<string, unknown>;
  derivedFrom?: { kind: MockKind; slug: string };
}

export interface SeedProblem {
  kind: MockKind;
  slug: string;
  problem: string;
}

export interface SeedKindEntry {
  file: string;
  count: number;
  sha256: string;
  identity: 'id' | 'slug';
}

export interface SeedExport {
  /** `<kind>.ndjson` → its text. */
  files: Record<string, string>;
  kinds: Partial<Record<MockKind, SeedKindEntry>>;
  problems: SeedProblem[];
}

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/** What is wrong with one item against the contract, if anything. */
export function seedProblems(item: SeedItem): string[] {
  const problems: string[] = [];
  const row = PATTERNS[item.kind];
  const identity = row?.identity ?? 'id';
  if (String(item.body[identity] ?? '') !== item.slug)
    problems.push(
      `its ${identity} ${JSON.stringify(item.body[identity])} is not its slug`,
    );
  if (row?.pattern && !new RegExp(row.pattern).test(item.slug))
    problems.push(`its slug does not match ${row.pattern}`);
  const schema = SCHEMAS[item.kind];
  if (schema) {
    const parsed = schema.safeParse(item.body);
    if (!parsed.success)
      for (const issue of parsed.error.issues.slice(0, 3))
        problems.push(`${issue.path.join('.') || '(body)'}: ${issue.message}`);
  }
  const mentions = JSON.stringify(item.body).match(CATALOGUE_MENTION);
  if (mentions)
    problems.push(
      `names an outside catalogue or carries one of its ids (${mentions.length})`,
    );
  return problems;
}

/** The seed's files and per-kind entries, from the store's items. */
export function buildSeedExport(items: readonly SeedItem[]): SeedExport {
  const byKind = new Map<MockKind, SeedItem[]>();
  for (const item of items) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }
  const files: Record<string, string> = {};
  const kinds: Partial<Record<MockKind, SeedKindEntry>> = {};
  const problems: SeedProblem[] = [];
  for (const kind of SEED_PUBLISH_ORDER) {
    const list = (byKind.get(kind) ?? []).sort((a, b) =>
      a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
    );
    if (!list.length) continue;
    for (const item of list)
      for (const problem of seedProblems(item))
        problems.push({ kind, slug: item.slug, problem });
    const text = list
      .map(
        (item) =>
          `${JSON.stringify({
            kind,
            slug: item.slug,
            status: item.status ?? 'published',
            body: item.body,
            ...(item.derivedFrom ? { derivedFrom: item.derivedFrom } : {}),
          })}\n`,
      )
      .join('');
    const file = `${kind}.ndjson`;
    files[file] = text;
    kinds[kind] = {
      file,
      count: list.length,
      sha256: sha256(text),
      identity: PATTERNS[kind]?.identity ?? 'id',
    };
  }
  for (const kind of byKind.keys())
    if (!SEED_PUBLISH_ORDER.includes(kind))
      problems.push({
        kind,
        slug: '*',
        problem: 'a kind the seed has no place in its publish order for',
      });
  return { files, kinds, problems };
}

const USAGE =
  'npx tsx src/scripts/apiContract/exportSeed.ts --out seed-export [--allow-uncommitted]';

async function main(argv: readonly string[]): Promise<void> {
  const at = argv.indexOf('--out');
  const out = at >= 0 ? argv[at + 1] : undefined;
  if (!out) throw new Error(`Where to? ${USAGE}`);
  const allowUncommitted = argv.includes('--allow-uncommitted');
  const root = repoContentRoot();
  const dir = isAbsolute(out) ? out : resolve(process.cwd(), out);

  const store = await loadRepoStore({ root });
  const items = store.items().filter((item) => REPO_KINDS.includes(item.kind));
  const read = [...new Set(items.flatMap((item) => item.files))].sort();
  const git = await readGitStatus(root, read);
  const head = git.git
    ? (await runGit(['rev-parse', 'HEAD'], root)).trim()
    : null;
  const uncommitted = git.files.map((file) => file.path);
  if (uncommitted.length && !allowUncommitted)
    throw new Error(
      `These data files are not committed as they are, so the seed would not match any commit:\n  ${uncommitted.join('\n  ')}\nCommit them, or pass --allow-uncommitted.`,
    );

  const seed = buildSeedExport(items);
  if (seed.problems.length) {
    const shown = seed.problems
      .slice(0, 40)
      .map((p) => `  ${p.kind} '${p.slug}': ${p.problem}`);
    throw new Error(
      `${seed.problems.length} item(s) do not meet the contract; nothing was written:\n${shown.join('\n')}`,
    );
  }

  await mkdir(dir, { recursive: true });
  for (const [file, text] of Object.entries(seed.files))
    await writeFile(join(dir, file), text);
  const manifest = {
    seedVersion: 1,
    generatedAt: new Date().toISOString(),
    artifactsVersion: CONTRACT_MANIFEST.artifactsVersion,
    gitHead: head,
    uncommittedFiles: uncommitted,
    progressionIdHighWater: PROGRESSION_ID_HIGH_WATER,
    publishOrder: SEED_PUBLISH_ORDER.filter((kind) => seed.kinds[kind]),
    kinds: seed.kinds,
  };
  await writeFile(
    join(dir, 'seed-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  for (const [kind, entry] of Object.entries(seed.kinds))
    console.log(`${kind.padEnd(18)} ${String(entry.count).padStart(6)}`);
  console.log(`Wrote ${Object.keys(seed.files).length + 1} files to ${dir}`);
  for (const warning of store.warnings) console.warn(`warning: ${warning}`);
}

const isMain =
  !!process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain)
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
