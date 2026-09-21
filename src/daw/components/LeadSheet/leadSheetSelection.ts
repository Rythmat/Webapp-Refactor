import { applyClick, clickKind, type ClickKind } from '../Score/scoreSelection';

// ── Selecting on the lead sheet ────────────────────────────────────────────
// The sheet holds four kinds of thing you can point at: whole measures, the
// beats inside them, the chord symbols above them, the melody notes on the
// staff, and the roadmap marks hanging off a barline. Each is selected the
// same way — plain click replaces, Shift fills in everything between, ⌘/Ctrl
// picks one out — so the modifier logic is shared with the Score
// (`scoreSelection`) and only the ordering differs per kind.
//
// A selection may hold one kind at a time. Clicking a chord after selecting
// measures starts a fresh selection, because "everything between" has no
// meaning across kinds.

export { applyClick, clickKind };
export type { ClickKind };

export type ItemKind = 'measure' | 'beat' | 'chord' | 'note' | 'barline';

export type LeadSheetItem =
  | { kind: 'measure'; measureIndex: number }
  | { kind: 'beat'; measureIndex: number; beat: number }
  | { kind: 'chord'; regionId: string }
  | { kind: 'note'; noteId: string }
  | { kind: 'barline'; measureIndex: number };

/** `kind:…` — stable, comparable, and safe to keep in a Set. */
export function itemKey(item: LeadSheetItem): string {
  switch (item.kind) {
    case 'measure':
      return `measure:${item.measureIndex}`;
    case 'beat':
      return `beat:${item.measureIndex}:${item.beat}`;
    case 'chord':
      return `chord:${item.regionId}`;
    case 'note':
      return `note:${item.noteId}`;
    case 'barline':
      return `barline:${item.measureIndex}`;
  }
}

export function parseItemKey(key: string): LeadSheetItem | null {
  const firstColon = key.indexOf(':');
  if (firstColon < 0) return null;
  const kind = key.slice(0, firstColon) as ItemKind;
  const rest = key.slice(firstColon + 1);
  switch (kind) {
    case 'measure':
      return { kind, measureIndex: Number(rest) };
    case 'barline':
      return { kind, measureIndex: Number(rest) };
    case 'beat': {
      const [measureIndex, beat] = rest.split(':').map(Number);
      return { kind, measureIndex, beat };
    }
    case 'chord':
      return { kind, regionId: rest };
    case 'note':
      return { kind, noteId: rest };
    default:
      return null;
  }
}

export const kindOf = (key: string): ItemKind | null =>
  (parseItemKey(key)?.kind ?? null) as ItemKind | null;

/** The one kind a selection holds, or null when it is empty or mixed. */
export function selectionKind(keys: Iterable<string>): ItemKind | null {
  let found: ItemKind | null = null;
  for (const key of keys) {
    const kind = kindOf(key);
    if (!kind) continue;
    if (found && found !== kind) return null;
    found = kind;
  }
  return found;
}

export const itemsOfKind = <K extends ItemKind>(
  keys: Iterable<string>,
  kind: K,
): Extract<LeadSheetItem, { kind: K }>[] =>
  [...keys]
    .map(parseItemKey)
    .filter(
      (item): item is Extract<LeadSheetItem, { kind: K }> =>
        item?.kind === kind,
    );

const span = (a: number, b: number) => {
  const out: number[] = [];
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
  return out;
};

/** What a range needs to know to order chords and notes in time. */
export interface RangeContext {
  beatsPerMeasure: number;
  /** Chord regions in the order they sound. */
  chordOrder: string[];
  /** Melody note ids in the order they sound. */
  noteOrder: string[];
}

/** A beat's position on one continuous line, so ranges can cross barlines. */
const beatOrdinal = (measureIndex: number, beat: number, perMeasure: number) =>
  measureIndex * perMeasure + beat;

/**
 * Every item between two of the same kind, inclusive. Shift-clicking a beat
 * three bars later fills in every beat in between, crossing barlines; the
 * same for measures, chords in time order, notes in time order, barlines.
 * Two different kinds have nothing between them, so the target stands alone.
 */
export function itemRange(
  anchor: LeadSheetItem,
  target: LeadSheetItem,
  context: RangeContext,
): string[] {
  if (anchor.kind !== target.kind) return [itemKey(target)];

  switch (target.kind) {
    case 'measure':
      return span(
        (anchor as typeof target).measureIndex,
        target.measureIndex,
      ).map((measureIndex) => itemKey({ kind: 'measure', measureIndex }));

    case 'barline':
      return span(
        (anchor as typeof target).measureIndex,
        target.measureIndex,
      ).map((measureIndex) => itemKey({ kind: 'barline', measureIndex }));

    case 'beat': {
      const from = anchor as typeof target;
      const perMeasure = Math.max(1, context.beatsPerMeasure);
      return span(
        beatOrdinal(from.measureIndex, from.beat, perMeasure),
        beatOrdinal(target.measureIndex, target.beat, perMeasure),
      ).map((ordinal) =>
        itemKey({
          kind: 'beat',
          measureIndex: Math.floor(ordinal / perMeasure),
          beat: ordinal % perMeasure,
        }),
      );
    }

    case 'chord': {
      const from = (anchor as typeof target).regionId;
      const a = context.chordOrder.indexOf(from);
      const b = context.chordOrder.indexOf(target.regionId);
      if (a < 0 || b < 0) return [itemKey(target)];
      return span(a, b).map((i) =>
        itemKey({ kind: 'chord', regionId: context.chordOrder[i] }),
      );
    }

    case 'note': {
      const from = (anchor as typeof target).noteId;
      const a = context.noteOrder.indexOf(from);
      const b = context.noteOrder.indexOf(target.noteId);
      if (a < 0 || b < 0) return [itemKey(target)];
      return span(a, b).map((i) =>
        itemKey({ kind: 'note', noteId: context.noteOrder[i] }),
      );
    }
  }
}

/**
 * Apply a click, keeping a selection to one kind. Extending or picking out
 * across kinds starts over rather than mixing measures with chord symbols.
 */
export function applyItemClick(
  current: ReadonlySet<string>,
  kind: ClickKind,
  clicked: LeadSheetItem,
  anchor: LeadSheetItem | null,
  context: RangeContext,
): Set<string> {
  const key = itemKey(clicked);
  const currentKind = selectionKind(current);
  if (currentKind && currentKind !== clicked.kind) return new Set([key]);
  return applyClick(current, kind, key, () =>
    anchor ? itemRange(anchor, clicked, context) : [key],
  );
}

/** Beats covered by a measure, for turning a measure click into its beats. */
export function beatsOfMeasure(
  measureIndex: number,
  beatsPerMeasure: number,
): string[] {
  return Array.from({ length: Math.max(1, beatsPerMeasure) }, (_, beat) =>
    itemKey({ kind: 'beat', measureIndex, beat }),
  );
}

/** Measures touched by a selection, whatever kind it holds. */
export function measuresInSelection(
  keys: Iterable<string>,
  measureOfChord: (regionId: string) => number | undefined,
  measureOfNote: (noteId: string) => number | undefined,
): number[] {
  const found = new Set<number>();
  for (const key of keys) {
    const item = parseItemKey(key);
    if (!item) continue;
    switch (item.kind) {
      case 'measure':
      case 'beat':
      case 'barline':
        found.add(item.measureIndex);
        break;
      case 'chord': {
        const at = measureOfChord(item.regionId);
        if (at !== undefined) found.add(at);
        break;
      }
      case 'note': {
        const at = measureOfNote(item.noteId);
        if (at !== undefined) found.add(at);
        break;
      }
    }
  }
  return [...found].sort((a, b) => a - b);
}
