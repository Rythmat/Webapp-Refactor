import type { Camera } from '../map/model/camera';
import type { ForestLayout } from './tesseractLayout';
import {
  pathTo,
  type TesseractEntry,
  type TesseractModel,
} from './tesseractModel';

/**
 * What Tesseract's page works out between the model and the canvas: the
 * filters, keeping a clicked node still while the forest is laid out again,
 * walking the trees with the arrow keys, and what a hovered or announced
 * node says about itself.
 *
 * The module is pure: no React, no DOM.
 */

/* ── Filters ────────────────────────────────────────────────────────── */

/** What the reader is narrowing the map to. Empty means everything. */
export interface TesseractFilters {
  /** A progression matches when it has any of these vibes. */
  vibes: readonly string[];
  /** A progression matches when it has any of these styles. */
  styles: readonly string[];
  /** A progression matches when it has this complexity. */
  complexity: string | null;
  /** Only progressions linked to at least one song. */
  hasSongs: boolean;
}

export const NO_FILTERS: TesseractFilters = {
  vibes: [],
  styles: [],
  complexity: null,
  hasSongs: false,
};

/** Whether any filter is set. */
export const isFiltering = (f: TesseractFilters): boolean =>
  f.vibes.length > 0 ||
  f.styles.length > 0 ||
  f.complexity !== null ||
  f.hasSongs;

/** Whether one progression passes every filter that is set. */
export function entryMatches(
  entry: TesseractEntry,
  f: TesseractFilters,
): boolean {
  if (f.vibes.length > 0 && !f.vibes.some((v) => entry.vibes.includes(v)))
    return false;
  if (f.styles.length > 0 && !f.styles.some((s) => entry.styles.includes(s)))
    return false;
  if (f.complexity !== null && entry.complexity !== f.complexity) return false;
  return !f.hasSongs || entry.songIds.length > 0;
}

/**
 * The openings the filters keep: those where a matching progression ends,
 * and every opening on the way down to one. A folded node is kept when a
 * match lies anywhere below it, so a lit fold says "open me".
 */
export function matchingOpenings(
  model: TesseractModel,
  f: TesseractFilters,
): Set<string> {
  const kept = new Set<string>();
  for (const entry of model.entries.values()) {
    if (!entryMatches(entry, f)) continue;
    const end = model.forest.endNodeOf.get(entry.id);
    if (!end) continue;
    for (const id of pathTo(model, end)) kept.add(id);
  }
  return kept;
}

/**
 * The spotlight for the drawn nodes: 1 for a node to keep at full
 * strength, 0 for one to dim. Null when nothing is being picked out.
 */
export function maskFor(
  layout: ForestLayout,
  kept: ReadonlySet<string> | null,
): Uint8Array | null {
  if (!kept) return null;
  const mask = new Uint8Array(layout.ids.length);
  layout.ids.forEach((id, i) => {
    if (kept.has(id)) mask[i] = 1;
  });
  return mask;
}

/** One choice a filter offers, with how many progressions carry it. */
export interface FilterOption {
  value: string;
  count: number;
}

/** The vibes, styles and complexities the progressions use, most used first. */
export function filterOptions(model: TesseractModel): {
  vibes: FilterOption[];
  styles: FilterOption[];
  complexities: FilterOption[];
} {
  const tally = (pick: (e: TesseractEntry) => readonly string[]) => {
    const counts = new Map<string, number>();
    for (const entry of model.entries.values())
      for (const value of new Set(pick(entry)))
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };
  return {
    vibes: tally((e) => e.vibes),
    styles: tally((e) => e.styles),
    complexities: tally((e) => [e.complexity]),
  };
}

/* ── Keeping a node still ───────────────────────────────────────────── */

/**
 * The camera that keeps node `id` where it was on screen after the forest
 * is laid out again: moved by exactly as far as the node moved. The
 * camera itself when the node is not in both layouts.
 */
export function pinnedCamera(
  camera: Camera,
  before: ForestLayout,
  after: ForestLayout,
  id: string,
): Camera {
  const a = before.indexOf.get(id);
  const b = after.indexOf.get(id);
  if (a === undefined || b === undefined) return camera;
  return {
    x: camera.x + (after.xy[2 * b] - before.xy[2 * a]),
    y: camera.y + (after.xy[2 * b + 1] - before.xy[2 * a + 1]),
    zoom: camera.zoom,
  };
}

/* ── The arrow keys ─────────────────────────────────────────────────── */

export type TreeStep = 'parent' | 'child' | 'previous' | 'next';

/**
 * Where an arrow key goes from node `id`: Left to the parent, Right to the
 * first child (opening a folded node first), Up and Down to the sibling
 * above and below. From a starting chord, Up and Down go to the tree
 * stacked before and after it. `open` names a node to unfold before moving.
 */
export function stepIn(
  model: TesseractModel,
  layout: ForestLayout,
  id: string,
  step: TreeStep,
): { to: string | null; open?: string } {
  const node = model.forest.nodes.get(id);
  if (!node) return { to: null };
  if (step === 'parent') return { to: node.parentId };
  if (step === 'child') {
    const first = node.childIds[0] ?? null;
    if (!first) return { to: null };
    const i = layout.indexOf.get(id);
    const shown = i !== undefined && layout.open[i] === 1;
    return shown ? { to: first } : { to: first, open: id };
  }
  const siblings =
    node.parentId === null
      ? model.rootIds
      : (model.forest.nodes.get(node.parentId)?.childIds ?? []);
  const at = siblings.indexOf(id);
  const next = siblings[at + (step === 'next' ? 1 : -1)];
  return { to: next ?? null };
}

/* ── What a node says ───────────────────────────────────────────────── */

/** What the hover card and the live region tell about one node. */
export interface NodeStory {
  id: string;
  /** The opening named chord by chord in the key: "D−7 → G7 → CΔ7". */
  named: string;
  /** The opening in degrees, as stored: "2 minor7 - 5 dominant7 - 1 major7". */
  degrees: string;
  /** How many chords deep: 1 for a starting chord. */
  depth: number;
  /** Progressions ending exactly here, in library order. */
  ends: TesseractEntry[];
  /** Progressions ending here or below. */
  countBelow: number;
  /** How many next chords there are. */
  children: number;
  /** The vibes and styles below, most used first. */
  vibes: string[];
  styles: string[];
  /** Linked song ids below, in library order. */
  songIds: string[];
}

export function storyOf(
  model: TesseractModel,
  id: string,
  name: (chord: string) => string,
): NodeStory | null {
  const node = model.forest.nodes.get(id);
  if (!node) return null;
  const chords = pathTo(model, id).map(
    (at) => model.forest.nodes.get(at)!.chord,
  );
  return {
    id,
    named: chords.map(name).join(' → '),
    degrees: chords.join(' - '),
    depth: node.depth,
    ends: node.endIds
      .map((n) => model.entries.get(n))
      .filter((e): e is TesseractEntry => !!e),
    countBelow: node.countBelow,
    children: node.childIds.length,
    vibes: node.vibes,
    styles: node.styles,
    songIds: node.songIds,
  };
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * A node read out for the live region: "G7, after D−7, 30 progressions
 * below, folded" or "CΔ7, after D−7, G7, ends progression 12".
 */
export function announceNode(
  story: NodeStory,
  folded: boolean,
  name: string,
): string {
  const parts: string[] = [name];
  const before = story.named.split(' → ').slice(0, -1);
  parts.push(
    before.length > 0 ? `after ${before.join(', ')}` : 'starting chord',
  );
  if (story.ends.length > 0)
    parts.push(
      `ends ${story.ends.length === 1 ? 'progression' : 'progressions'} ${story.ends.map((e) => e.id).join(' and ')}`,
    );
  if (story.children > 0) {
    parts.push(`${plural(story.countBelow, 'progression')} below`);
    parts.push(folded ? 'folded' : 'open');
  }
  return parts.join(', ');
}
