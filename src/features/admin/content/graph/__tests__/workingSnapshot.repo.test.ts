import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  type Graph,
  type GraphSnapshot,
} from '@/content/graph/deriveGraph';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  exportFingerprint,
  type ExportRow,
  fnv1a,
} from '@/hooks/data/admin/useContentExport';
import { loadRepoSnapshot } from '../repoSnapshot';
import { mergeSnapshot, WORKING_KINDS } from '../workingSnapshot';

/**
 * The working copy over the repo's own data: an API that holds exactly what
 * the repo does (the mock's seed, before anyone edits) must draw exactly the
 * repo's graph — same nodes, same edges with the same sources, the event
 * matches asked again and answered the same — only now each item says it is
 * the API's. The bodies come lean, as the Table's exports ask for them
 * (`omit=sections,audioSources`): nothing the graph reads is in what is
 * left out. And the whole round, fingerprint to graph, stays well inside the
 * rebuild budget (Table design §3.4: 500 ms before the build moves to a
 * worker).
 */

/** As the mock serves them: the record kinds and the cities. */
const MOCK_RULES = {
  isAuthoritative: (kind: ContentKind) =>
    kind === 'artist' || kind === 'globe_city',
};

/** What a lean export leaves out of a song. */
const LEAN_OMIT = ['sections', 'audioSources'];

/** The repo's lists, served back as the API's working rows. */
function repoAsExport(
  repo: GraphSnapshot,
): Map<ContentKind, readonly ExportRow[]> {
  const exported = new Map<ContentKind, readonly ExportRow[]>();
  for (const [kind, spec] of Object.entries(WORKING_KINDS)) {
    const list = (repo[spec.list] ?? []) as readonly Record<string, unknown>[];
    exported.set(
      kind as ContentKind,
      list.map((item) => {
        const body =
          kind === 'song'
            ? Object.fromEntries(
                Object.entries(item).filter(([k]) => !LEAN_OMIT.includes(k)),
              )
            : item;
        return {
          id: `db-${String(item[spec.field])}`,
          slug: String(item[spec.field]),
          status: 'published',
          editState: null,
          updatedAt: null,
          body,
        };
      }),
    );
  }
  return exported;
}

/**
 * Every edge as one line — its ends, kind, song, confidence and every field
 * that states it — sorted and hashed: two graphs with the same hash drew the
 * same connections from the same sources.
 */
function edgeKeys(graph: Graph): string[] {
  return graph.edges
    .map((e) =>
      [
        e.from,
        e.kind,
        e.to,
        e.on ?? '',
        e.inferred ? 'guess' : '',
        e.unverified ? 'unconfirmed' : '',
        e.via
          .map(
            (v) =>
              `${v.item}:${v.path}:${v.code ?? ''}:${v.statedBy?.id ?? ''}`,
          )
          .sort()
          .join(','),
      ].join('|'),
    )
    .sort();
}

const hashOf = (keys: readonly string[]) =>
  fnv1a(keys.join('\n')).toString(16).padStart(8, '0');

describe('the working snapshot over the repo', () => {
  it('draws the repo graph when the API holds the repo', async () => {
    const repo = await loadRepoSnapshot();
    const exported = repoAsExport(repo);
    const started = performance.now();
    for (const rows of exported.values()) exportFingerprint(rows);
    const { snapshot, items } = mergeSnapshot(repo, exported, MOCK_RULES);
    const working = buildGraph(snapshot);
    const elapsed = performance.now() - started;

    const expected = buildGraph(repo);
    expect(working.nodes.size).toBe(expected.nodes.size);
    expect([...working.nodes.keys()].sort()).toEqual(
      [...expected.nodes.keys()].sort(),
    );
    expect(working.edges).toHaveLength(expected.edges.length);
    const keys = edgeKeys(working);
    expect(hashOf(keys)).toBe(hashOf(edgeKeys(expected)));
    // The hash is over something: no two edges share a line.
    expect(new Set(keys).size).toBe(keys.length);

    // The matches were asked again of the working lists, and agree.
    expect(snapshot.eventMatches).not.toBe(repo.eventMatches);
    expect(snapshot.eventMatches).toEqual(repo.eventMatches);
    // What is not a list comes through as the repo has it.
    expect(snapshot.instrumentGenres).toBe(repo.instrumentGenres);
    expect(snapshot.asOfYear).toBe(repo.asOfYear);
    // The song pins are the API's items now, the same ones.
    expect(snapshot.artistLocations).toHaveLength(
      repo.artistLocations?.length ?? 0,
    );

    expect(working.nodes.get('song:africa')).toMatchObject({
      status: 'published',
      origin: 'api',
    });
    expect(expected.nodes.get('song:africa')?.origin).toBe('code');
    expect(items.get('song:africa')?.id).toBe('db-africa');
    // Generous for a loaded CI machine; about 60 ms on a laptop.
    expect(elapsed).toBeLessThan(500);
  }, 30_000);

  it('is the repo graph itself when the API exports nothing', async () => {
    const repo = await loadRepoSnapshot();
    const { snapshot, items } = mergeSnapshot(repo, new Map(), MOCK_RULES);
    // Nothing to ask again: the repo's matches stand, the lists are its own.
    expect(snapshot.eventMatches).toBe(repo.eventMatches);
    expect(snapshot.artistLocations).toBe(repo.artistLocations);
    expect(snapshot.events).toBe(repo.events);
    expect(items.size).toBe(0);
    const expected = buildGraph(repo);
    const working = buildGraph(snapshot);
    expect(working.nodes.size).toBe(expected.nodes.size);
    expect(working.edges).toHaveLength(expected.edges.length);
    expect(hashOf(edgeKeys(working))).toBe(hashOf(edgeKeys(expected)));
  }, 30_000);
});
