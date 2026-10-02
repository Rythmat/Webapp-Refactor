/**
 * The opening tree: every progression in the library, folded into one prefix
 * tree per starting chord.
 *
 * Two progressions that open the same way share a branch until they part.
 * "1 major7 - 4 major7 - 3 minor7" and "1 major7 - 4 major7 - 5 dominant7"
 * share the "1 major7" and "1 major7|4 major7" nodes, then split. A node's id
 * is its whole opening joined with "|", which is exactly the key Prism's
 * `PROGRESSION_GRAPH` uses, so one id names the same place in Prism, in
 * Tesseract (the console's progression map) and in any report.
 *
 * Everything here is pure: it reads the entries it is given and nothing else,
 * so it runs the same on the bundled library, on the console's working copy
 * (which holds unsaved edits) and in a build script. It imports nothing.
 *
 * Two outputs come from one build:
 * - `buildOpeningForest` returns the full model, with counts and tag unions
 *   on every node, for Tesseract.
 * - `buildOpeningTree` returns Prism's shape: each opening that can continue,
 *   mapped to its possible next chords.
 *
 * Children are ordered by how many progressions lie below them, most first,
 * and ties keep library order (the position of the first progression that
 * reaches them). Prism treats the order of next chords as a ranking: its
 * "Most Common" suggestion takes the first one. Writing the order down here
 * makes that ranking a property of the library rather than of whichever row
 * order a spreadsheet happened to have.
 */

/** The separator between chords in an opening's id, as in `PROGRESSION_GRAPH`. */
export const OPENING_SEPARATOR = '|';

/**
 * Chord spellings the source sheet got wrong, mapped to the spelling Prism's
 * chord list knows.
 *
 * The list is explicit on purpose. A general rule (say, "maj" means "major")
 * could quietly rewrite a chord nobody meant to touch, while this list says
 * exactly what changes. The sheet holds all four; the library still holds the
 * last three, in ids 82, 444, 461 and 462. Once the import fixes the stored
 * data this map finds nothing to do, and stays as a guard.
 */
export const CHORD_SPELLING_FIXES: Readonly<Record<string, string>> = {
  'b7dominant7#11': 'b7 dominant7#11',
  '1 maj/5': '1 major/5',
  '2 maj': '2 major',
  '2 minor 7': '2 minor7',
};

/**
 * One chord's spelling made canonical: outer space trimmed, inner runs of
 * space collapsed to one, then the known misspellings corrected.
 */
export function normalizeChordSpelling(chord: string): string {
  const spaced = chord.trim().replace(/\s+/g, ' ');
  return CHORD_SPELLING_FIXES[spaced] ?? spaced;
}

/** An opening's id: its chords joined with "|". */
export function openingKey(chords: readonly string[]): string {
  return chords.join(OPENING_SEPARATOR);
}

/** The chords of an opening, read back from its id. */
export function chordsOfOpening(key: string): string[] {
  return key === '' ? [] : key.split(OPENING_SEPARATOR);
}

/**
 * What the tree reads from a progression. The library's entries fit this
 * shape as they are, and so do the console's progression rows.
 */
export interface OpeningTreeEntry {
  id: number;
  chords: readonly string[];
  vibes?: readonly string[];
  styles?: readonly string[];
  songIds?: readonly string[];
}

/** One opening: a chord, reached by the chords before it. */
export interface OpeningNode {
  /** The whole opening joined with "|", for example "1 major7|2 minor7". */
  id: string;
  /** The last chord of the opening, the one this node stands for. */
  chord: string;
  /** How many chords the opening has: 1 for a starting chord. */
  depth: number;
  /** The opening one chord shorter, or null for a starting chord. */
  parentId: string | null;
  /** The starting chord's node, which names the tree this node is in. */
  rootId: string;
  /** The openings one chord longer, in the tree's order (see the file comment). */
  childIds: string[];
  /** Progressions that end exactly here, in library order. */
  endIds: number[];
  /** Progressions that end here or anywhere below: the count a folded node shows. */
  countBelow: number;
  /**
   * Every vibe used by a progression here or below, most used first. The
   * order makes the head of the list a fair "top vibes" summary.
   */
  vibes: string[];
  /** Every style used here or below, most used first. */
  styles: string[];
  /** Every linked song id here or below, in library order. */
  songIds: string[];
}

export interface OpeningForest {
  /** The starting chords' node ids, most progressions first. */
  rootIds: string[];
  /**
   * Every node, keyed by id. Iteration runs depth first in the tree's order:
   * each root, then its first child's whole branch, then the next child's.
   */
  nodes: Map<string, OpeningNode>;
  /** The node each placed progression ends on, by progression id. */
  endNodeOf: Map<number, string>;
  /**
   * Ids of entries left out because they cannot be placed: no chords, a blank
   * chord, or a chord containing the "|" separator. The library has none; a
   * row being edited in the console might.
   */
  skippedIds: number[];
}

/** Counts occurrences while remembering the order values were first seen. */
function tally(counts: Map<string, number>, values: readonly string[]) {
  for (const value of new Set(values)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
}

/** Most counted first; ties keep the order they were first seen in. */
function byCount(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .map(([value, count], seen) => ({ value, count, seen }))
    .sort((a, b) => b.count - a.count || a.seen - b.seen)
    .map((t) => t.value);
}

interface Draft {
  id: string;
  chord: string;
  depth: number;
  parentId: string | null;
  /** Index of the first entry that reached this node: its library order. */
  firstSeen: number;
  childIds: string[];
  endIds: number[];
  countBelow: number;
  vibeCounts: Map<string, number>;
  styleCounts: Map<string, number>;
  songIds: Set<string>;
}

/**
 * Builds the full opening model from progressions, fixing the known chord
 * misspellings on the way in. Entries are read in the order given, which is
 * the "library order" that breaks ties between equally busy branches.
 */
export function buildOpeningForest(
  entries: readonly OpeningTreeEntry[],
): OpeningForest {
  const drafts = new Map<string, Draft>();
  const draftRoots: string[] = [];
  const endNodeOf = new Map<number, string>();
  const skippedIds: number[] = [];

  entries.forEach((entry, index) => {
    const chords = entry.chords.map(normalizeChordSpelling);
    if (
      chords.length === 0 ||
      chords.some((c) => c === '' || c.includes(OPENING_SEPARATOR))
    ) {
      skippedIds.push(entry.id);
      return;
    }

    let parentId: string | null = null;
    let id = '';
    for (let depth = 1; depth <= chords.length; depth++) {
      const chord = chords[depth - 1];
      id = parentId === null ? chord : parentId + OPENING_SEPARATOR + chord;
      let node = drafts.get(id);
      if (!node) {
        node = {
          id,
          chord,
          depth,
          parentId,
          firstSeen: index,
          childIds: [],
          endIds: [],
          countBelow: 0,
          vibeCounts: new Map(),
          styleCounts: new Map(),
          songIds: new Set(),
        };
        drafts.set(id, node);
        if (parentId === null) draftRoots.push(id);
        else drafts.get(parentId)!.childIds.push(id);
      }
      node.countBelow += 1;
      tally(node.vibeCounts, entry.vibes ?? []);
      tally(node.styleCounts, entry.styles ?? []);
      for (const songId of entry.songIds ?? []) node.songIds.add(songId);
      parentId = id;
    }
    drafts.get(id)!.endIds.push(entry.id);
    endNodeOf.set(entry.id, id);
  });

  const ranked = (ids: readonly string[]) =>
    ids
      .map((id) => drafts.get(id)!)
      .sort((a, b) => b.countBelow - a.countBelow || a.firstSeen - b.firstSeen)
      .map((d) => d.id);

  const nodes = new Map<string, OpeningNode>();
  const rootIds = ranked(draftRoots);
  const place = (id: string, rootId: string) => {
    const d = drafts.get(id)!;
    const childIds = ranked(d.childIds);
    nodes.set(id, {
      id,
      chord: d.chord,
      depth: d.depth,
      parentId: d.parentId,
      rootId,
      childIds,
      endIds: d.endIds,
      countBelow: d.countBelow,
      vibes: byCount(d.vibeCounts),
      styles: byCount(d.styleCounts),
      songIds: [...d.songIds],
    });
    for (const childId of childIds) place(childId, rootId);
  };
  for (const rootId of rootIds) place(rootId, rootId);

  return { rootIds, nodes, endNodeOf, skippedIds };
}

/**
 * Prism's shape of a forest: each opening that can continue, mapped to its
 * next chords in the tree's order. Openings with nothing after them are left
 * out, as in `PROGRESSION_GRAPH`, and keys come in depth-first order, so the
 * starting chords (the keys without a "|") come out most progressions first.
 */
export function toProgressionGraph(
  forest: OpeningForest,
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const node of forest.nodes.values()) {
    if (node.childIds.length === 0) continue;
    graph[node.id] = node.childIds.map((id) => forest.nodes.get(id)!.chord);
  }
  return graph;
}

/**
 * Prism's progression graph built from progressions: each opening mapped to
 * the chords that can follow it, most travelled first.
 */
export function buildOpeningTree(
  entries: readonly OpeningTreeEntry[],
): Record<string, string[]> {
  return toProgressionGraph(buildOpeningForest(entries));
}
