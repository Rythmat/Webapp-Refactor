import type { ActivityKind } from './ids';
import {
  CONCEPT_SPECIFICITY,
  type ConceptKind,
  type ConceptRef,
} from './songConcepts';

/**
 * The web itself, from what the student has done. Lines run from an activity
 * to a concept, and a concept only appears once two activities share it, so a
 * concept on the map IS a connection. An artist the student also visited on
 * the Globe is one node, both activity and concept. Pure.
 */

export interface WebActivity {
  id: string;
  kind: ActivityKind;
  label: string;
  /** A second line: the artist, the instrument. */
  detail?: string;
  /** Where Open goes. */
  route?: string;
  /** Finished or saved: drawn bright. */
  done: boolean;
  /** When, in ms; 0 when the record doesn't say. */
  lastAt: number;
  doneAt: number;
  concepts: readonly ConceptRef[];
}

export interface WebNode {
  id: string;
  role: 'activity' | 'concept';
  /** What colours it. */
  kind: ActivityKind | ConceptKind;
  label: string;
  detail?: string;
  route?: string;
  /** An activity finished or saved. */
  done: boolean;
  /** A concept with only one activity so far: a promise, not a connection. */
  hollow: boolean;
  lastAt: number;
  doneAt: number;
}

export interface WebLink {
  id: string;
  source: string;
  target: string;
  /** Leads to a hollow concept: not yet a connection. */
  hollow: boolean;
}

export interface CortexWeb {
  nodes: readonly WebNode[];
  links: readonly WebLink[];
  activityCount: number;
  /** Lines that join an activity to something another activity shares. */
  connectionCount: number;
}

/** Below this many activities, each gets a hollow concept, so none floats alone. */
export const SEED_BELOW = 8;

/** Which of an activity's concepts is likeliest to meet another: first found. */
const SEED_ORDER: readonly ConceptKind[] = [
  'genre',
  'mode',
  'instrument',
  'group',
  'artist',
  'key',
  'person',
  'studio',
  'release',
];

const specificity = (kind: ConceptKind) => CONCEPT_SPECIFICITY.indexOf(kind);

const linkId = (a: string, b: string) => `${a}|${b}`;

export const buildWeb = (activities: readonly WebActivity[]): CortexWeb => {
  const byId = new Map(activities.map((a) => [a.id, a]));

  // Every concept, with the activities that have it. An activity is never a
  // member of itself: a Globe visit to an artist isn't connected to itself.
  const concepts = new Map<string, { ref: ConceptRef; members: Set<string> }>();
  for (const activity of activities) {
    for (const ref of activity.concepts) {
      if (ref.id === activity.id) continue;
      const entry = concepts.get(ref.id);
      if (entry) {
        entry.members.add(activity.id);
        // A billed artist outranks the same person's producer credit.
        if (specificity(ref.kind) < specificity(entry.ref.kind))
          entry.ref = ref;
      } else {
        concepts.set(ref.id, { ref, members: new Set([activity.id]) });
      }
    }
  }

  const standing = [...concepts.values()].filter(({ ref, members }) => {
    // An activity that's also the concept counts as one of the two.
    const enough = members.size + (byId.has(ref.id) ? 1 : 0) >= 2;
    if (!enough) return false;
    if (!ref.needsTheory) return true;
    return [...members].some((id) => byId.get(id)?.kind === 'theory');
  });

  // Same members: only the most specific shows. Otherwise two songs off one
  // record sprout the record, the artist, the producer and the studio at once.
  const bySet = new Map<string, (typeof standing)[number]>();
  for (const entry of standing) {
    if (byId.has(entry.ref.id)) {
      // An activity node stays whatever else shares its members.
      bySet.set(`node:${entry.ref.id}`, entry);
      continue;
    }
    const key = [...entry.members].sort().join('|');
    const was = bySet.get(key);
    if (!was || specificity(entry.ref.kind) < specificity(was.ref.kind))
      bySet.set(key, entry);
  }
  const shown = [...bySet.values()];

  const nodes: WebNode[] = activities.map((a) => ({
    id: a.id,
    role: 'activity',
    kind: a.kind,
    label: a.label,
    detail: a.detail,
    route: a.route,
    done: a.done,
    hollow: false,
    lastAt: a.lastAt,
    doneAt: a.doneAt,
  }));
  const links: WebLink[] = [];
  const linked = new Set<string>();

  for (const { ref, members } of shown) {
    if (!byId.has(ref.id)) {
      nodes.push({
        id: ref.id,
        role: 'concept',
        kind: ref.kind,
        label: ref.label,
        route: ref.route,
        done: false,
        hollow: false,
        lastAt: 0,
        doneAt: 0,
      });
    } else {
      linked.add(ref.id);
    }
    for (const member of members) {
      links.push({
        id: linkId(member, ref.id),
        source: member,
        target: ref.id,
        hollow: false,
      });
      linked.add(member);
    }
  }
  const connectionCount = links.length;

  // The first few: a hollow concept beside each one not yet connected, so a
  // new map reads as something starting rather than dots adrift.
  if (activities.length < SEED_BELOW) {
    const seeded = new Set(nodes.map((n) => n.id));
    for (const activity of activities) {
      if (linked.has(activity.id)) continue;
      const usable = activity.concepts.filter((c) => c.id !== activity.id);
      const seed = SEED_ORDER.map((kind) =>
        usable.find((c) => c.kind === kind),
      ).find((c) => c !== undefined);
      if (!seed || seeded.has(seed.id)) continue;
      seeded.add(seed.id);
      nodes.push({
        id: seed.id,
        role: 'concept',
        kind: seed.kind,
        label: seed.label,
        route: seed.route,
        done: false,
        hollow: true,
        lastAt: 0,
        doneAt: 0,
      });
      links.push({
        id: linkId(activity.id, seed.id),
        source: activity.id,
        target: seed.id,
        hollow: true,
      });
    }
  }

  return {
    nodes,
    links,
    activityCount: activities.length,
    connectionCount,
  };
};

/** Each node's neighbours, for highlighting and the details card. */
export const neighboursOf = (
  web: CortexWeb,
): ReadonlyMap<string, readonly string[]> => {
  const out = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = out.get(a);
    if (list) list.push(b);
    else out.set(a, [b]);
  };
  for (const link of web.links) {
    add(link.source, link.target);
    add(link.target, link.source);
  }
  return out;
};
