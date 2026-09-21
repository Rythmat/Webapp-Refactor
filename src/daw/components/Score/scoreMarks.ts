import type { ArticulationKind } from './noteEditor';

// ── Selecting markings ─────────────────────────────────────────────────────
// Articulations, slurs and ties can be picked up like notes: click one, shift
// for a run, ⌘ for a few. A run only ever gathers markings of the kind you
// started with — reaching from a staccato to another staccato must not sweep
// up the slurs and accents lying between them.

export type MarkKind =
  | { type: 'articulation'; kind: ArticulationKind }
  | { type: 'slur' }
  | { type: 'tie' };

export interface ScoreMark {
  /** Identifies the marking; also what a selection stores. */
  key: string;
  kind: MarkKind;
  /** Where it sits, for ordering a run and drawing it. */
  partIndex: number;
  tick: number;
  /** The notes it belongs to, for editing and copying. */
  noteIds: string[];
  /** The tick a tie splits at, when this is a tie. */
  splitTick?: number;
}

export const articulationMarkKey = (
  noteId: string,
  kind: ArticulationKind,
): string => `art|${noteId}|${kind}`;

export const slurMarkKey = (fromId: string, toId: string): string =>
  `slur|${fromId}|${toId}`;

export const tieMarkKey = (noteId: string, splitTick: number): string =>
  `tie|${noteId}|${splitTick}`;

/** Two markings are the same kind when a run may gather both. */
export function sameKind(a: MarkKind, b: MarkKind): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'articulation' && b.type === 'articulation') {
    return a.kind === b.kind;
  }
  return true;
}

export function markKindOf(
  marks: readonly ScoreMark[],
  key: string,
): MarkKind | null {
  return marks.find((mark) => mark.key === key)?.kind ?? null;
}

/**
 * Every marking of the anchor's own kind inside the rectangle the two ends
 * span — the parts they cover, over the time they cover.
 */
export function markRange(
  marks: readonly ScoreMark[],
  anchorKey: string,
  targetKey: string,
): string[] {
  const anchor = marks.find((m) => m.key === anchorKey);
  const target = marks.find((m) => m.key === targetKey);
  if (!anchor || !target) return [targetKey];
  // The kind is fixed by whichever end was picked first.
  if (!sameKind(anchor.kind, target.kind)) return [targetKey];
  const partFrom = Math.min(anchor.partIndex, target.partIndex);
  const partTo = Math.max(anchor.partIndex, target.partIndex);
  const tickFrom = Math.min(anchor.tick, target.tick);
  const tickTo = Math.max(anchor.tick, target.tick);
  return marks
    .filter(
      (mark) =>
        sameKind(mark.kind, anchor.kind) &&
        mark.partIndex >= partFrom &&
        mark.partIndex <= partTo &&
        mark.tick >= tickFrom &&
        mark.tick <= tickTo,
    )
    .map((mark) => mark.key);
}

/**
 * Adding to a selection keeps it to one kind: picking a different one starts
 * a new selection rather than mixing the two.
 */
export function addToSelection(
  marks: readonly ScoreMark[],
  current: ReadonlySet<string>,
  key: string,
): Set<string> {
  const kind = markKindOf(marks, key);
  const heldKind = [...current]
    .map((held) => markKindOf(marks, held))
    .find((held): held is MarkKind => held !== null);
  if (!kind || (heldKind && !sameKind(kind, heldKind))) {
    return new Set([key]);
  }
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
