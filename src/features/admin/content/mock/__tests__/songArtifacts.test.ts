import { beforeAll, describe, expect, it } from 'vitest';
import type { Suggestion } from '@/content/suggestions/types';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockSuggestionSources,
  type MockViewer,
} from '../contentMockServer';
import {
  decisionsFileText,
  parseDecisionsFile,
  type DecisionResult,
  type DecisionsFile,
} from '../decisions';
import { loadSeed, loadSuggestionSeed } from '../seed';
import { seedBeforeImport } from './seedBeforeImport';

/**
 * The importer's song half as the mock serves it (F2): its committed rows,
 * the records they make, and a review of every sure row, one at a time —
 * then a Reset and a replay of the decisions file, which must make the same
 * records again, in the same order, and leave the store saying the same.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const RECORD_KINDS = ['globe_city', 'label', 'studio', 'artist', 'release'];

let seed: MockSeed;
let artifacts: MockSuggestionSources;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which wrote most
  // of the rows these tests accept (seedBeforeImport.ts), and so without
  // the decisions.json the import committed: before it there was none.
  const [loaded, served] = await Promise.all([
    loadSeed('all'),
    loadSuggestionSeed('all', undefined, {}),
  ]);
  seed = seedBeforeImport(loaded);
  artifacts = { ...served };
  delete artifacts.committed;
}, 60_000);

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

let clock = 0;
const makeServer = (extra: MockSuggestionSources = {}) =>
  createContentMockServer({
    seed,
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    suggestions: { ...artifacts, ...extra },
  });

const accept = (
  server: ContentMockServer,
  rows: readonly Suggestion[],
  method: 'single' | 'bulk' = 'single',
) => {
  const results: DecisionResult[] = [];
  for (let at = 0; at < rows.length; at += 5000)
    results.push(
      ...ok<{ results: DecisionResult[] }>(
        server.handle({
          method: 'POST',
          path: '/suggestions/decisions',
          body: {
            decisions: rows
              .slice(at, at + 5000)
              .map((s) => ({ suggestionId: s.id, op: 'accept', method })),
          },
          viewer: ADMIN,
        }),
      ).results,
    );
  return results;
};

/** Every item of a kind, by slug: its body, as `/export` serves it. */
const bodies = (server: ContentMockServer, kind: string) => {
  const out: Record<string, unknown> = {};
  let cursor: string | undefined;
  do {
    const page = ok<{
      items: { slug: string; body: unknown }[];
      nextCursor: string | null;
    }>(
      server.handle({
        method: 'GET',
        path: '/export',
        query: { kind, limit: '500', ...(cursor ? { cursor } : {}) },
        viewer: ADMIN,
      }),
    );
    for (const item of page.items) out[item.slug] = item.body;
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return out;
};

const songRows = () =>
  (artifacts.imported ?? []).filter((s) => s.target.kind !== 'artist');

describe("the importer's song half in the mock", () => {
  it('is served whole, and none of it in bulk while the manifest says it is not calibrated', () => {
    const rows = songRows();
    expect(rows.length).toBeGreaterThan(0);
    const runs = new Set(rows.map((s) => s.batch));
    for (const batch of runs)
      expect(
        artifacts.batches?.find((entry) => entry.batch === batch),
      ).toBeDefined();
    const server = makeServer();
    const sure = rows.filter((s) => s.tier === 'sure').slice(0, 50);
    const uncalibrated = sure.filter(
      (s) =>
        !artifacts.batches?.find((entry) => entry.batch === s.batch)
          ?.calibrated,
    );
    const results = accept(server, uncalibrated, 'bulk');
    expect(results.every((r) => r.outcome === 'refused')).toBe(true);
    expect(
      new Set(results.map((r) => r.outcome === 'refused' && r.error)),
    ).toEqual(
      new Set([
        "Not accepted in bulk: the importer's sure tier is not calibrated yet.",
      ]),
    );
  });

  it('takes the sure rows one at a time, records first, and a replay after a Reset makes the same store', () => {
    const sure = songRows().filter((s) => s.tier === 'sure');
    const server = makeServer();
    // A Label row's release is made by an Album row: those go first.
    const results = [
      ...accept(
        server,
        sure.filter((s) => s.path !== 'labelId'),
      ),
      ...accept(
        server,
        sure.filter((s) => s.path === 'labelId'),
      ),
    ];
    const written = results.filter((r) => r.outcome !== 'refused');
    expect(written.length / sure.length).toBeGreaterThan(0.99);
    // What is refused is a person's to look at, never an error of the mock:
    // a credit two rows describe differently, or a record whose slug the
    // contract refuses.
    const codes = new Set(
      results.flatMap((r) => (r.outcome === 'refused' ? [r.code] : [])),
    );
    for (const code of codes)
      expect([
        'SUGGESTION_CONFLICT',
        'REQUIRED_RECORD_INVALID',
        'NOT_FOUND',
      ]).toContain(code);

    const before = Object.fromEntries(
      [...RECORD_KINDS, 'song'].map((kind) => [kind, bodies(server, kind)]),
    );
    const file = ok<DecisionsFile>(
      server.handle({
        method: 'GET',
        path: '/suggestions/decisions',
        viewer: ADMIN,
      }),
    );
    expect(file.decisions).toHaveLength(written.length);

    const reset = makeServer({
      committed: parseDecisionsFile(decisionsFileText(file)),
    });
    const report = reset.replayCommittedDecisions()!;
    expect(report.conflicts).toEqual([]);
    expect(report.applied + report.already).toBe(report.considered);
    expect(report.created).toBeGreaterThan(1000);
    for (const kind of [...RECORD_KINDS, 'song'])
      expect(bodies(reset, kind), kind).toEqual(before[kind]);
  }, 120_000);
});
