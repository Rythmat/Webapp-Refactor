/**
 * The Globe page's stacking order, named (Globe UI plan, prompt 5). Every
 * overlay takes its z-index from here, so a new piece slots in by meaning,
 * not by out-bidding the last one (the page used to climb from z-[1000] to
 * z-[1200]).
 *
 * `.atlas-root` is its own stacking context (`isolate`), so these numbers
 * only order the page's own pieces and never compete with the app around it.
 * A test bans arbitrary `z-[…]` values in the page's sources.
 */
export const ATLAS_LAYER = {
  /** The WebGL globe. */
  canvas: 0,
  /** Controls floating on the map: Spin, and later Layers and the legend. */
  mapControls: 10,
  /** The left panel, the mind map, and the phone's bottom sheet. */
  panels: 20,
  /** The timeline and the tour and pathway bars. */
  bars: 30,
  /**
   * Popovers, and the top bar, which holds the search dropdown: it opens over
   * the panels under it.
   */
  popovers: 40,
  /** Transient notices. */
  toasts: 50,
} as const;

export type AtlasLayer = keyof typeof ATLAS_LAYER;

/**
 * The same layers as Tailwind classes, spelled out in full so Tailwind finds
 * them. A test holds each to its number above.
 */
export const ATLAS_Z = {
  canvas: 'z-0',
  mapControls: 'z-10',
  panels: 'z-20',
  bars: 'z-30',
  popovers: 'z-40',
  toasts: 'z-50',
} as const satisfies Record<AtlasLayer, string>;
