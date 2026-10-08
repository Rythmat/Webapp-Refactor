import {
  CORTEX_COLORS,
  cortexColor,
  cortexColorIndex,
  type CortexColorName,
} from './cortexPalette';
import type { GraphFacets } from './facets';
import {
  compileQueryText,
  type NodePredicate,
  type QueryProblem,
} from './graphQuery';

/**
 * The graph's colour groups, as Obsidian has them: an ordered list of
 * queries, each with a colour. A node takes the colour of the first group
 * whose query it matches, and the neutral grey default when it matches none.
 *
 * The presets colour by kind, in the owner's palette B (`cortexPalette.ts`,
 * chosen on 1 October 2026): the three hues the rest of the app never uses
 * are vivid and carry Songs, Artists and Chord Progressions; every other
 * group is a near-neutral tint. No preset is one of Prism's key colours.
 * In order, since the first match wins:
 *
 * | Group              | Query                                     | Colour  |
 * |--------------------|-------------------------------------------|---------|
 * | Songs              | kind:song                                 | #2cecf5 |
 * | Curriculum         | is:curriculum (teach days, pathways)      | #65836f |
 * | Events             | kind:event                                | #9e886e |
 * | Year               | kind:year OR kind:decade OR kind:era      | #9dabc8 |
 * | Location           | kind:place (cities and regions)           | #b194a9 |
 * | Genre              | kind:genre OR kind:subgenre OR kind:scene | #d2b9a0 |
 * | Instruments        | kind:instrument, patch, kit               | #7698a8 |
 * | Artists            | kind:artist                               | #adbd14 |
 * | Key                | kind:key, mode, vibe, feel                | #a5ae9e |
 * | Records            | kind:release                              | #787694 |
 * | Studios & Labels   | kind:studio OR kind:label                 | #cab5d1 |
 * | Chord Progressions | kind:progression, part, groove            | #fc91ee |
 *
 * The palette's thirteenth colour, a deep raspberry, is kept for Openings
 * and is the first a new group is offered.
 *
 * Every kind of node falls in exactly one of them, so the order only
 * matters once the owner edits a query. A globe region is a place, so it
 * is in Location. Whether tag kinds (genres, times, keys, instruments,
 * regions) are drawn at all is still up to the Filters' Tags switches.
 *
 * No dot is ever white or near white: white is the graph's highlight
 * (`render/graphTheme.ts`). A node no group claims is a mid neutral grey,
 * which has no hue to be mistaken for a group's.
 *
 * Colour alone cannot tell twelve hues apart for every viewer, so the kind
 * is always said in words as well (the hover label, the preview card, the
 * Groups list with its names and counts, the List view).
 *
 * Missing nodes (Obsidian's "unresolved") are never recoloured: they stay a
 * dim grey whatever the groups say, so a group can never make a broken link
 * look like a real item.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/** One colour group: a query and a colour written `#rrggbb`. */
export interface ColorGroup {
  readonly query: string;
  readonly color: string;
  /**
   * What the Groups list calls the group. The presets have one; a group
   * the owner adds has none, and is called by its place ("Group 13").
   */
  readonly name?: string;
}

const preset = (
  name: string,
  query: string,
  color: CortexColorName,
): ColorGroup => ({ name, query, color: cortexColor(color) });

/** The preset groups, in order. The first match wins. */
export const PRESET_GROUPS: readonly ColorGroup[] = [
  preset('Songs', 'kind:song', 'Songs'),
  preset('Curriculum', 'is:curriculum', 'Curriculum'),
  preset('Events', 'kind:event', 'Events'),
  preset('Year', 'kind:year OR kind:decade OR kind:era', 'Year'),
  preset('Location', 'kind:place', 'Location'),
  preset('Genre', 'kind:genre OR kind:subgenre OR kind:scene', 'Genre'),
  // The sounds parts and grooves are voiced on file with the instruments.
  preset(
    'Instruments',
    'kind:instrument OR kind:patch OR kind:kit',
    'Instruments',
  ),
  preset('Artists', 'kind:artist', 'Artists'),
  preset('Key', 'kind:key OR kind:mode OR kind:vibe OR kind:feel', 'Key'),
  preset('Records', 'kind:release', 'Records'),
  preset('Studios & Labels', 'kind:studio OR kind:label', 'Studios & Labels'),
  // Grooves and parts are written material like progressions; they share the
  // colour until Cortex's palette gives instrument content one of its own.
  preset(
    'Chord Progressions',
    'kind:progression OR kind:part OR kind:groove',
    'Chord Progressions',
  ),
];

/** A fresh, editable copy of the presets. */
export const presetGroups = (): ColorGroup[] =>
  PRESET_GROUPS.map((group) => ({ ...group }));

/**
 * What a node matching no group is drawn in: a mid neutral grey, never
 * white or near white, and with no hue of its own.
 */
export const DEFAULT_NODE_COLOR = '#8c8c8c';

/** What a missing node is drawn in: Obsidian's #666 at half strength. */
export const MISSING_NODE_COLOR = '#66666680';

/** Red, green, blue and alpha, each 0–255. */
export type Rgba = readonly [number, number, number, number];

/**
 * `#rgb`, `#rrggbb` or `#rrggbbaa` → its channels, or null for anything
 * else. Alpha is 255 when not written.
 */
export function parseHexColor(color: string): Rgba | null {
  const hex = color.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  let full: string;
  if (hex.length === 3) full = [...hex].map((c) => c + c).join('');
  else if (hex.length === 6 || hex.length === 8) full = hex;
  else return null;
  const channel = (i: number) => parseInt(full.slice(i * 2, i * 2 + 2), 16);
  return [
    channel(0),
    channel(1),
    channel(2),
    full.length === 8 ? channel(3) : 255,
  ];
}

/**
 * The colour for a group added to `groups`: the first of Cortex's colours
 * that no group uses yet, in the palette's order (the presets' order, then
 * the deep raspberry kept for Openings), or, when every one is taken, the
 * one used least (the earlier on a tie). With the twelve presets in place,
 * the first new group gets the deep raspberry, and the next ones go round
 * the palette from Songs cyan. None of them is white.
 */
export function newGroupColor(
  groups: readonly Pick<ColorGroup, 'color'>[],
): string {
  const uses = CORTEX_COLORS.map(() => 0);
  for (const group of groups) {
    const index = cortexColorIndex(group.color);
    if (index >= 0) uses[index]++;
  }
  let least = 0;
  for (let i = 1; i < uses.length; i++) if (uses[i] < uses[least]) least = i;
  return CORTEX_COLORS[least].hex;
}

/** How the groups coloured one graph's nodes. */
export interface NodeColoring {
  /** Four bytes per node, in the order of `ids`. */
  readonly rgba: Uint8Array;
  /** The index of the group that coloured each node, or -1. */
  readonly groupOf: Int16Array;
  /** How many nodes each group coloured: the legend's counts. */
  readonly counts: readonly number[];
  /** Each group's query error, or null; a group with one colours nothing. */
  readonly problems: readonly (QueryProblem | null)[];
  /** Nodes no group coloured, missing nodes aside. */
  readonly defaultCount: number;
  /** Missing nodes, which no group colours. */
  readonly missingCount: number;
}

export interface ColorNodesInput {
  /** The drawn nodes' ids, in drawing order. */
  readonly ids: ArrayLike<string>;
  readonly facets: GraphFacets;
  readonly groups: readonly ColorGroup[];
  /** Whether the node at an index has no visible links (for `is:orphan`). */
  readonly isOrphan?: (index: number) => boolean;
  /** Overrides `DEFAULT_NODE_COLOR`. */
  readonly defaultColor?: string;
  /** Overrides `MISSING_NODE_COLOR`. */
  readonly missingColor?: string;
}

const noOrphans = () => false;

/**
 * Colour every node: the first group whose query matches, else the default.
 * A group with a blank query, a query error or a colour that cannot be read
 * colours nothing, and the nodes fall through to the next group.
 */
export function colorNodes(input: ColorNodesInput): NodeColoring {
  const { ids, facets, groups, isOrphan = noOrphans } = input;
  const fallback =
    parseHexColor(input.defaultColor ?? DEFAULT_NODE_COLOR) ??
    (parseHexColor(DEFAULT_NODE_COLOR) as Rgba);
  const missing =
    parseHexColor(input.missingColor ?? MISSING_NODE_COLOR) ??
    (parseHexColor(MISSING_NODE_COLOR) as Rgba);

  const problems: (QueryProblem | null)[] = [];
  const live: { index: number; match: NodePredicate; rgba: Rgba }[] = [];
  groups.forEach((group, index) => {
    const compiled = compileQueryText(group.query);
    problems.push(compiled.error);
    const rgba = parseHexColor(group.color);
    if (compiled.match && rgba)
      live.push({ index, match: compiled.match, rgba });
  });

  const count = ids.length;
  const rgba = new Uint8Array(count * 4);
  const groupOf = new Int16Array(count).fill(-1);
  const counts = groups.map(() => 0);
  let defaultCount = 0;
  let missingCount = 0;
  for (let i = 0; i < count; i++) {
    const f = facets.get(ids[i]);
    let color = fallback;
    if (f?.status === 'missing') {
      color = missing;
      missingCount++;
    } else {
      const orphan = f ? isOrphan(i) : false;
      const hit = f ? live.find((g) => g.match(f, orphan)) : undefined;
      if (hit) {
        color = hit.rgba;
        groupOf[i] = hit.index;
        counts[hit.index]++;
      } else {
        defaultCount++;
      }
    }
    rgba.set(color, i * 4);
  }
  return { rgba, groupOf, counts, problems, defaultCount, missingCount };
}
