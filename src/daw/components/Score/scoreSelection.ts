import type { NoteInfo } from '@/components/notation/StaffView';

// ── Selecting in the score ─────────────────────────────────────────────────
// A measure belongs to one instrument, so it is selected per part. Shift
// extends the selection as a rectangle — across parts, across time, or both —
// and ⌘/Ctrl picks out single items without filling anything in between.

export interface Cell {
  partIndex: number;
  measureIndex: number;
}

export const cellKey = ({ partIndex, measureIndex }: Cell): string =>
  `${partIndex}:${measureIndex}`;

export function parseCellKey(key: string): Cell {
  const [partIndex, measureIndex] = key.split(':').map(Number);
  return { partIndex, measureIndex };
}

const between = (a: number, b: number) => {
  const out: number[] = [];
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
  return out;
};

/** Every measure of every part in the rectangle between two cells. */
export function cellRange(anchor: Cell, target: Cell): string[] {
  const keys: string[] = [];
  for (const partIndex of between(anchor.partIndex, target.partIndex)) {
    for (const measureIndex of between(
      anchor.measureIndex,
      target.measureIndex,
    )) {
      keys.push(cellKey({ partIndex, measureIndex }));
    }
  }
  return keys;
}

/**
 * Every note in the rectangle between two notes: the parts they span, over
 * the time they span. Top note to bottom note of one chord catches the chord;
 * a note here to a note three bars later catches everything between.
 */
export function noteRange(
  notes: NoteInfo[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchor = notes.find((n) => n.id === anchorId);
  const target = notes.find((n) => n.id === targetId);
  if (!anchor || !target) return [targetId];
  const partFrom = Math.min(anchor.partIndex, target.partIndex);
  const partTo = Math.max(anchor.partIndex, target.partIndex);
  const tickFrom = Math.min(anchor.tick, target.tick);
  const tickTo = Math.max(anchor.tick, target.tick);
  return notes
    .filter(
      (n) =>
        n.partIndex >= partFrom &&
        n.partIndex <= partTo &&
        n.tick >= tickFrom &&
        n.tick <= tickTo,
    )
    .map((n) => n.id);
}

/** Notes drawn inside any of these measures. */
export function notesInCells(
  notes: NoteInfo[],
  cells: Iterable<string>,
): string[] {
  const wanted = new Set(cells);
  return notes.filter((n) => wanted.has(cellKey(n))).map((n) => n.id);
}

export type ClickKind = 'replace' | 'range' | 'toggle';

/** What a click means: ⌘/Ctrl picks one out, Shift extends, plain replaces. */
export function clickKind(event: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): ClickKind {
  if (event.metaKey || event.ctrlKey) return 'toggle';
  if (event.shiftKey) return 'range';
  return 'replace';
}

/** Apply a click to a selection of keys. */
export function applyClick(
  current: ReadonlySet<string>,
  kind: ClickKind,
  clicked: string,
  range: () => string[],
): Set<string> {
  if (kind === 'toggle') {
    const next = new Set(current);
    if (next.has(clicked)) next.delete(clicked);
    else next.add(clicked);
    return next;
  }
  if (kind === 'range') return new Set(range());
  return new Set([clicked]);
}
