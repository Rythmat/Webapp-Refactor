import {
  AudioLines,
  BookOpen,
  Boxes,
  CalendarDays,
  Disc3,
  Gamepad2,
  GraduationCap,
  Guitar,
  Hand,
  KeyRound,
  Layers,
  MapPin,
  Mic,
  Music2,
  Radio,
  ScrollText,
  Shapes,
  SlidersHorizontal,
  Tags,
  User,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type {
  OrbitalLink,
  OrbitalNode,
} from '@/components/orbital/OrbitalStage';
import {
  assignSlots,
  slotAngle,
  type OrbitRing,
} from '@/components/orbital/orbitSlots';
import { neighboursOf, type CortexWeb, type WebNode } from './buildWeb';
import { NODE_COLOR } from './nodeMeta';

/**
 * The student's web as the Orbit shows it. The inner ring is what connects the
 * most, the outer what they did most recently. Selecting something brings what
 * it connects to onto the rings, and its card lists all of it either way.
 */

const KIND_ICON: Readonly<Record<WebNode['kind'], LucideIcon>> = {
  song: Music2,
  theory: BookOpen,
  lesson: GraduationCap,
  audio: AudioLines,
  anatomy: Layers,
  technique: Hand,
  literacy: ScrollText,
  game: Gamepad2,
  project: SlidersHorizontal,
  tutorial: GraduationCap,
  artist: Mic,
  place: MapPin,
  event: CalendarDays,
  person: User,
  release: Disc3,
  studio: Radio,
  mode: Waves,
  key: KeyRound,
  genre: Tags,
  instrument: Guitar,
  group: Boxes,
};

export interface CortexOrbit {
  nodes: OrbitalNode[];
  links: OrbitalLink[];
  /** On the web, but not on the rings. */
  overflow: number;
}

const byId = (a: WebNode, b: WebNode) => (a.id < b.id ? -1 : 1);

const emphasisOf = (node: WebNode): OrbitalNode['emphasis'] => {
  if (node.hollow) return 'hollow';
  if (node.role === 'concept') return 'solid';
  return node.done ? 'solid' : 'dim';
};

/** One ring only: mostly what they did, with what connects it mixed in. */
const mixed = (concepts: readonly string[], activities: readonly string[]) => {
  const out: string[] = [];
  const total = concepts.length + activities.length;
  for (let i = 0, c = 0, a = 0; i < total; i++) {
    const wantConcept = i % 3 === 0;
    if ((wantConcept && c < concepts.length) || a >= activities.length) {
      out.push(concepts[c++]);
    } else {
      out.push(activities[a++]);
    }
  }
  return out;
};

export const cortexOrbit = (
  web: CortexWeb,
  selectedId: string | null,
  capacity: Readonly<Record<OrbitRing, number>>,
): CortexOrbit => {
  const neighbours = neighboursOf(web);
  const degree = (node: WebNode) => neighbours.get(node.id)?.length ?? 0;
  const nodeById = new Map(web.nodes.map((n) => [n.id, n]));

  // Solid concepts by how much they connect; a concept with one member is only
  // a promise, so it waits. Ties go by id, so one web is always one picture.
  const concepts = web.nodes
    .filter((n) => n.role === 'concept')
    .sort(
      (a, b) =>
        Number(a.hollow) - Number(b.hollow) ||
        degree(b) - degree(a) ||
        byId(a, b),
    )
    .map((n) => n.id);
  const activities = web.nodes
    .filter((n) => n.role === 'activity')
    .sort((a, b) => b.lastAt - a.lastAt || byId(a, b))
    .map((n) => n.id);
  const rank = new Map(
    [...concepts, ...activities].map((id, index) => [id, index]),
  );

  // What's selected first, then what it connects to, best first: if there are
  // more than a ring holds, the best of them are the ones shown.
  const wanted = selectedId
    ? [
        selectedId,
        ...[...(neighbours.get(selectedId) ?? [])].sort(
          (a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0),
        ),
      ].filter((id) => nodeById.has(id))
    : [];
  const hasInner = capacity.inner > 0;
  const belongsInner = (id: string) =>
    hasInner && nodeById.get(id)?.role === 'concept';

  const inner = assignSlots(
    concepts,
    wanted.filter(belongsInner),
    capacity.inner,
  );

  // Round the outer ring in the order of what each connects to on the inner, so
  // their lines stay short and don't cross the middle. Worked out from the rings
  // as they are with nothing selected, so a selection rearranges nothing.
  const restingInner = concepts.slice(0, capacity.inner);
  const innerAngle = new Map(
    restingInner.map((id, slot) => [
      id,
      slotAngle(slot, restingInner.length, 'inner'),
    ]),
  );
  const towards = (id: string): number | null => {
    const angles = (neighbours.get(id) ?? [])
      .map((other) => innerAngle.get(other))
      .filter((angle): angle is number => angle !== undefined);
    if (angles.length === 0) return null;
    const x = angles.reduce((sum, angle) => sum + Math.cos(angle), 0);
    const y = angles.reduce((sum, angle) => sum + Math.sin(angle), 0);
    // From the top of the ring, as the slots are counted.
    const turn = Math.atan2(y, x) + Math.PI / 2;
    return turn < 0 ? turn + Math.PI * 2 : turn;
  };
  const arrangeOuter = (ids: readonly string[]) =>
    [...ids].sort((a, b) => {
      const ta = towards(a);
      const tb = towards(b);
      if (ta === null || tb === null) {
        return Number(ta === null) - Number(tb === null) || (a < b ? -1 : 1);
      }
      return ta - tb || (a < b ? -1 : 1);
    });

  const onInner = new Set(inner);
  const outerRanked = hasInner
    ? [...activities, ...concepts.filter((id) => !onInner.has(id))]
    : mixed(concepts, activities);
  const outer = assignSlots(
    outerRanked,
    wanted.filter((id) => !belongsInner(id)),
    capacity.outer,
    arrangeOuter,
  );

  const toNode = (id: string, ring: OrbitRing, slot: number): OrbitalNode => {
    const node = nodeById.get(id)!;
    return {
      id,
      label: node.label,
      description: node.detail ? `${node.label}, ${node.detail}` : node.label,
      color: NODE_COLOR[node.kind],
      icon: KIND_ICON[node.kind] ?? Shapes,
      emphasis: emphasisOf(node),
      ring,
      slot,
    };
  };
  const nodes = [
    ...inner.map((id, slot) => toNode(id, 'inner', slot)),
    ...outer.map((id, slot) => toNode(id, 'outer', slot)),
  ];
  const shown = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    links: web.links
      .filter((l) => shown.has(l.source) && shown.has(l.target))
      .map(({ id, source, target, hollow }) => ({
        id,
        source,
        target,
        hollow,
      })),
    overflow: web.nodes.length - nodes.length,
  };
};
