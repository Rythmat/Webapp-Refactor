/**
 * The whole contract between the React side of the Mind Map and whatever
 * draws it (design §1). React owns the data, the camera and the interaction;
 * a renderer only turns typed arrays into pixels. Keeping the contract this
 * narrow is what lets the WebGL2 renderer be swapped for the sigma fallback,
 * or for a fake that records calls in jsdom tests, without touching anything
 * else.
 *
 * Units and conventions, shared by every implementation:
 *
 * - Nodes are numbered 0..count-1. Every array below is indexed by that
 *   number, so node i's position is `xy[2i], xy[2i+1]` and its colour is
 *   `colors[4i..4i+3]`.
 * - `links` holds one pair of node numbers per drawn line, `[a0, b0, a1, b1,
 *   …]`, already merged to one line per pair of nodes. `linkFlags` holds one
 *   byte per line (see `LINK_FLAG_*`).
 * - Positions are world units, where one unit is one CSS pixel at zoom 1.
 * - The camera's `x` and `y` are the world point shown at the centre of the
 *   canvas; `zoom` is CSS pixels per world unit.
 * - Sizes follow Obsidian, which works in device pixels (two per CSS pixel on
 *   a Retina screen). Its "scale" is device pixels per world unit: the zoom
 *   times the pixel ratio given to `resize`. `model/sizing.ts` sets out the
 *   rules; a renderer draws by them:
 *   - `radii` are each node's base radius in device pixels at scale 1. On
 *     screen a radius is multiplied by the style's node size and by the
 *     square root of the scale, so dots grow more slowly than the space
 *     between them when zooming in.
 *   - Lines keep the same width at every zoom: the style's line size, in
 *     device pixels, so one device pixel by default.
 *   - Arrows fade in between scale 0.3 and 0.8.
 * - `colors` are straight (not premultiplied) RGBA bytes.
 */
export interface GraphRenderer {
  setGraph(g: {
    count: number;
    links: Uint32Array;
    linkFlags: Uint8Array;
    radii: Float32Array;
    colors: Uint8Array /*RGBA*/;
    nodeFlags: Uint8Array;
  }): void;
  setPositions(xy: Float32Array): void; // goes into the RG32F texture
  setColors(rgba: Uint8Array): void; // after a group edit; the sim is not touched
  setHighlight(h: {
    hovered: number;
    state: Uint8Array /*0 normal,1 lit,2 hovered*/;
    fade: number;
  }): void;
  setCamera(c: { x: number; y: number; zoom: number }): void;
  setStyle(s: {
    nodeSize: number;
    lineSize: number;
    arrows: boolean;
    confidence: boolean;
  }): void;
  resize(cssW: number, cssH: number, dpr: number): void;
  render(): void; // only called when something is dirty
  destroy(): void;
}

/** The graph a renderer draws, as `setGraph` receives it. */
export type RendererGraph = Parameters<GraphRenderer['setGraph']>[0];
/** The hover state a renderer draws, as `setHighlight` receives it. */
export type RendererHighlight = Parameters<GraphRenderer['setHighlight']>[0];
/** The camera, as `setCamera` receives it. */
export type RendererCamera = Parameters<GraphRenderer['setCamera']>[0];
/** The display settings a renderer honours, as `setStyle` receives them. */
export type RendererStyle = Parameters<GraphRenderer['setStyle']>[0];

/* Per-line flags, one byte per line in `linkFlags`. */

/** Every connection the line stands for was guessed from a name: dotted. */
export const LINK_FLAG_GUESSED = 1;
/** Every connection the line stands for is unconfirmed: dashed. */
export const LINK_FLAG_UNCONFIRMED = 2;
/** Some connection runs from the pair's first node to its second. */
export const LINK_FLAG_FORWARD = 4;
/** Some connection runs from the pair's second node to its first. */
export const LINK_FLAG_BACKWARD = 8;

/* Per-node flags, one byte per node in `nodeFlags`. */

/** Draw a ring round the node: the local graph's focus, the keyboard's current node. */
export const NODE_FLAG_RING = 1;
/**
 * Fill the node as a ring with a dot inside it, both in its own colour:
 * Tesseract's "a progression ends here". Not the highlight ring, which is
 * white and sits outside the dot; the two can be worn together.
 */
export const NODE_FLAG_END = 2;

/* Per-node hover states, one byte per node in `setHighlight`'s `state`. */

/** Neither hovered nor next to the hovered node: fades while something is hovered. */
export const NODE_STATE_NORMAL = 0;
/** A neighbour of the hovered node: stays at full strength. */
export const NODE_STATE_LIT = 1;
/** The hovered node itself: keeps its own colour and gains a highlight ring. */
export const NODE_STATE_HOVERED = 2;
/**
 * On the hovered node's lit path (Tesseract: its way back to the tree's
 * root): stays at full strength like `NODE_STATE_LIT`, and a line whose
 * two ends are both on the path is lit in the highlight too.
 */
export const NODE_STATE_PATH = 3;

/** No node is hovered. */
export const NO_NODE = -1;

/** Obsidian's defaults for the display settings (plan, settings table). */
export const DEFAULT_RENDERER_STYLE: RendererStyle = {
  nodeSize: 1,
  lineSize: 1,
  arrows: false,
  confidence: true,
};
