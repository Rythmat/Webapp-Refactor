import {
  buildOpeningForest,
  chordsOfOpening,
  type OpeningForest,
  type OpeningNode,
  openingKey,
} from '@/curriculum/engine/openingTree';

/**
 * Tesseract's data: every progression folded into one opening tree per
 * starting chord (`curriculum/engine/openingTree.ts`, the same fold Prism's
 * next-chord graph comes from), read from the working copy's progression
 * rows, so an edit or a proposal shows on the map as soon as the console
 * has it.
 *
 * The graph's progression nodes carry no chords, so the map reads the rows
 * themselves (`useWorkingGraph().snapshot.progressions`): the repo's library
 * in repo mode, the content API's bodies laid over it otherwise. A row is
 * read defensively, since a body being edited may be half filled in; one
 * with no usable id or chords is left out, and the forest says which.
 *
 * The trees are stacked in the board's order, the major key's own chords
 * first (each degree's seventh chord, then its triad), then the borrowed
 * and chromatic starts (`DIATONIC_FIRST`). A starting chord the list does
 * not name (one added in the console) comes after them all, busiest first.
 *
 * The module is pure: no React, no DOM.
 */

/** A progression as Tesseract reads it. */
export interface TesseractEntry {
  id: number;
  /** The chords as stored (the forest corrects known misspellings itself). */
  chords: string[];
  /** The stored display form: "1 major7 - 4 major7 - …". */
  progression: string;
  /** The library's rating: triad, 7th or extended. */
  complexity: string;
  vibes: string[];
  styles: string[];
  /** Linked songs, as song ids. */
  songIds: string[];
  /** The sheet's song and artist text, kept as the trail the links came from. */
  song: string;
  artist: string;
}

export interface TesseractModel {
  forest: OpeningForest;
  /** The starting chords' node ids in the order the map stacks them. */
  rootIds: string[];
  /** Every progression read, by id. */
  entries: ReadonlyMap<number, TesseractEntry>;
  /** Every node id, depth first in each tree's order, trees in `rootIds` order. */
  order: string[];
}

/**
 * The order the trees are stacked in: the board's, the major key's own
 * chords first (degree by degree, the seventh chord before the triad), then
 * the starts that borrow or lean outside the key.
 */
export const DIATONIC_FIRST: readonly string[] = [
  '1 major7',
  '1 major',
  '2 minor7',
  '2 minor',
  '3 minor7',
  '3 minor',
  '4 major7',
  '4 major',
  '5 dominant7',
  '5 major',
  '6 minor7',
  '6 minor',
  '1 dominant7',
  '3 dominant7',
  '3 dominant7#5',
  '3 major/#5',
  '#5 diminished7',
  'b7 major',
];

const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const texts = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];

/** A row's id as a number, or null when it has none that reads as one. */
const idOf = (value: unknown): number | null => {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  return Number.isInteger(n) ? n : null;
};

/**
 * The progression rows of a snapshot, as entries in id order (the library's
 * own order). A row without an integer id or a list of chords is skipped;
 * a later row with an id already read replaces it, as the working copy's
 * merge does.
 */
export function readProgressionRows(
  rows: readonly unknown[] | undefined,
): TesseractEntry[] {
  const byId = new Map<number, TesseractEntry>();
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') continue;
    const body = row as Record<string, unknown>;
    const id = idOf(body.id);
    if (id === null || !Array.isArray(body.chords)) continue;
    byId.set(id, {
      id,
      chords: body.chords.map((c) => text(c)),
      progression: text(body.progression),
      complexity: text(body.complexity),
      vibes: texts(body.vibes),
      styles: texts(body.styles),
      songIds: texts(body.songIds),
      song: text(body.song),
      artist: text(body.artist),
    });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** Where a starting chord goes in the stack: its place in the list, or after it. */
const stackRank = (id: string): number => {
  const at = DIATONIC_FIRST.indexOf(id);
  return at < 0 ? DIATONIC_FIRST.length : at;
};

/** The forest of openings for these entries, its trees in stacking order. */
export function buildTesseractModel(
  entries: readonly TesseractEntry[],
): TesseractModel {
  const forest = buildOpeningForest(entries);
  // The forest's own order (busiest first) breaks ties after the list.
  const busiest = new Map(forest.rootIds.map((id, i) => [id, i]));
  const rootIds = [...forest.rootIds].sort(
    (a, b) => stackRank(a) - stackRank(b) || busiest.get(a)! - busiest.get(b)!,
  );
  const order: string[] = [];
  const walk = (id: string) => {
    order.push(id);
    for (const child of forest.nodes.get(id)!.childIds) walk(child);
  };
  for (const id of rootIds) walk(id);
  return {
    forest,
    rootIds,
    entries: new Map(entries.map((e) => [e.id, e])),
    order,
  };
}

/** A node of the model, or undefined. */
export const nodeOf = (
  model: TesseractModel,
  id: string,
): OpeningNode | undefined => model.forest.nodes.get(id);

/** The opening one chord shorter, or null for a starting chord. */
export function parentOpening(id: string): string | null {
  const chords = chordsOfOpening(id);
  return chords.length > 1 ? openingKey(chords.slice(0, -1)) : null;
}

/** The node ids from the tree's root down to `id`, both included. */
export function pathTo(model: TesseractModel, id: string): string[] {
  const path: string[] = [];
  let at: string | null = id;
  while (at !== null) {
    const node = model.forest.nodes.get(at);
    if (!node) break;
    path.unshift(at);
    at = node.parentId;
  }
  return path;
}

/** Every node below `id`, depth first, not `id` itself. */
export function descendantsOf(model: TesseractModel, id: string): string[] {
  const out: string[] = [];
  const walk = (at: string) => {
    for (const child of model.forest.nodes.get(at)?.childIds ?? []) {
      out.push(child);
      walk(child);
    }
  };
  walk(id);
  return out;
}

/** The progressions ending at or below `id`, in library order. */
export function progressionsBelow(model: TesseractModel, id: string): number[] {
  const ids: number[] = [];
  for (const at of [id, ...descendantsOf(model, id)]) {
    ids.push(...(model.forest.nodes.get(at)?.endIds ?? []));
  }
  return ids.sort((a, b) => a - b);
}
