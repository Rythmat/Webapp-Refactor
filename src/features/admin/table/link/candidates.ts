import type { Graph } from '@/content/graph/deriveGraph';
import type { EntityId, EntityKind } from '@/content/graph/types';
import type { EntityEntry } from '../../content/entities/rankEntities';
import { labelOf } from '../model/aggregate';

/**
 * The items a Link… can write, as picker entries: every node of the owner's
 * kind the graph has (ConfirmConnectionDialog's owner picker; next, the
 * Table's in-cell pickers).
 *
 * Built once per graph and kind, since each open would otherwise walk the
 * graph's ~4,800 nodes again for the few hundred of its kind. A rebuilt
 * graph is a new object, so an entry list is never stale; the old graph's go
 * with it.
 * Pure, and free of the dialog and the picker registries, so the grid's
 * editors can load it without either.
 */

const cache = new WeakMap<Graph, Map<EntityKind, readonly EntityEntry[]>>();

/** The owner's candidates: the graph's nodes of its kind, as picker entries. */
export function candidatesOf(
  graph: Graph,
  kind: EntityKind,
): readonly EntityEntry[] {
  let byKind = cache.get(graph);
  if (!byKind) {
    byKind = new Map();
    cache.set(graph, byKind);
  }
  let entries = byKind.get(kind);
  if (!entries) {
    entries = collect(graph, kind);
    byKind.set(kind, entries);
  }
  return entries;
}

function collect(graph: Graph, kind: EntityKind): EntityEntry[] {
  const out: EntityEntry[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind !== kind || node.status === 'missing') continue;
    const slug = node.id.slice(kind.length + 1);
    // A song's own event is the song: nothing about it is edited.
    if (kind === 'event' && !slug.startsWith('evt-')) continue;
    out.push({
      id: node.id,
      kind,
      slug,
      name: node.label,
      source: node.status === 'code' ? 'repo' : node.status,
      hint: hintOf(graph, node.id, kind),
    });
  }
  return out;
}

/** A second line for a candidate: a song's or a record's act, an event's year. */
export function hintOf(
  graph: Graph,
  node: EntityId,
  kind: EntityKind,
): string | undefined {
  const wanted =
    kind === 'song' || kind === 'release'
      ? 'performed_by'
      : kind === 'event'
        ? 'from_year'
        : null;
  if (!wanted) return undefined;
  const edge = graph.adjacency
    .get(node)
    ?.find((e) => e.kind === wanted && e.from === node);
  return edge ? labelOf(graph, edge.to) : undefined;
}
