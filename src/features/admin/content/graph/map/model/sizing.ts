/**
 * How big the Mind Map draws things, taken from Obsidian's graph view.
 *
 * Every number here was read from Obsidian 1.12's own code, so the Atlas
 * graph sizes its dots, labels and arrows the way the owner's vaults do.
 *
 * PIXELS AND SCALE
 *
 * Obsidian draws its graph on a canvas the size of the screen's own pixels
 * (device pixels: two for every CSS pixel on a Retina screen), and every
 * size rule below is in those pixels, worked out from its "scale": device
 * pixels per world unit. The Mind Map's camera zoom is CSS pixels per world
 * unit instead, because pointer events arrive in CSS pixels. The two meet
 * here: Obsidian's scale is the zoom times the canvas's pixel ratio
 * (`deviceScale`), and each rule is worked out at that scale. So on the
 * owner's Retina Mac a line is one device pixel wide, half a CSS pixel, just
 * as in Obsidian, and labels and arrows fade in at the same framing as
 * Obsidian's. On a screen with a ratio of 1 the two are the same.
 *
 * The functions take the zoom and the pixel ratio and give CSS pixels, which
 * is what the label layer and hit testing work in. The renderer works the
 * same rules out in device pixels in its shaders.
 *
 * THE RULES
 *
 * - A dot's radius grows with the square root of its weight (its number of
 *   neighbours): 3·√(weight + 1), held between 8 and 30. The "Node size"
 *   slider then multiplies the result, so it scales every dot, the capped
 *   ones included. On screen it is that many device pixels times the square
 *   root of the scale, so zooming in spreads the dots apart faster than it
 *   grows them, and zooming out keeps them visible.
 * - A label sits under its dot, in type of 14 + radius/4, wrapped at 300,
 *   scaled like the dot. Its opacity follows the scale:
 *   clamp(log2(scale) + 1 − text fade, 0, 1). With the text fade slider at
 *   0, labels are solid from scale 1 and gone by scale ½.
 * - The hovered dot's label always shows. It moves down 15 device pixels
 *   and, when zoomed out, keeps its scale-1 size so it can be read.
 * - Arrows fade in between scale 0.3 and 0.8. Each is a small dart eight
 *   device pixels long (times the square root of the line thickness).
 * - Lines are `lineSize` device pixels wide at every zoom.
 * - The white ring round a hovered or ringed dot is Obsidian's hairline,
 *   √scale device pixels (at least one), held here between one and two CSS
 *   pixels so it still shows on a Retina screen. A ringed dot's label
 *   starts below its ring.
 *
 * The local graph sizes its dots by place rather than by links: the focus at
 * the largest size and everything else at the smallest. (Obsidian itself
 * gives the focus a weight of 30 and lets the others shrink step by step
 * toward the edge; the plan asks for the simpler rule.)
 *
 * The module is pure: no React, no DOM.
 */

/** The highest pixel ratio the Mind Map draws at: more costs fill and shows nothing. */
export const MAX_PIXEL_RATIO = 2;

/**
 * The pixel ratio a canvas draws at, from the screen's: held between ½ and
 * 2, and 1 when the screen does not say. The renderer and every size rule
 * here must use the same one.
 */
export function pixelRatio(screenRatio: number): number {
  if (!(screenRatio > 0)) return 1;
  return Math.min(MAX_PIXEL_RATIO, Math.max(0.5, screenRatio));
}

/**
 * Obsidian's scale (device pixels per world unit) for a camera zoom (CSS
 * pixels per world unit) on a canvas of this pixel ratio.
 */
export const deviceScale = (zoom: number, dpr = 1): number =>
  zoom * pixelRatio(dpr);

/** The smallest dot, in device pixels at scale 1 and node size 1. */
export const NODE_RADIUS_MIN = 8;
/** The largest dot, in device pixels at scale 1 and node size 1. */
export const NODE_RADIUS_MAX = 30;

/** The local graph focus's weight: 3·√100 = 30, the largest dot. */
export const LOCAL_FOCUS_WEIGHT = 99;
/** Every other local graph node's weight: the smallest dot. */
export const LOCAL_NODE_WEIGHT = 0;

/** A label's type size at scale 1, before the dot's share is added. */
export const LABEL_BASE_PX = 14;
/** Where a label wraps, in device pixels at scale 1. */
export const LABEL_WRAP_PX = 300;
/** The gap between a dot and its label, in device pixels at scale 1. */
export const LABEL_GAP_PX = 5;
/** How far the hovered dot's label moves down, in device pixels. */
export const HOVER_LABEL_SHIFT_PX = 15;

/** Arrows start to show at this scale … */
export const ARROW_FADE_FROM = 0.3;
/** … and are solid from this one. */
export const ARROW_FADE_TO = 0.8;

/** An arrow's length at line thickness 1, in device pixels (Obsidian's dart). */
export const ARROW_LENGTH_PX = 8;

/**
 * Dotted and dashed lines need room to read as dots and dashes. Shorter
 * lines than this, in CSS pixels on screen, are drawn plain, so a zoomed-out
 * graph looks like Obsidian's one style of line. (This rule is the Atlas's
 * own: Obsidian has one style of line.)
 */
export const CONFIDENCE_MIN_SCREEN_PX = 16;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** A dot's radius at node size 1: 3·√(weight + 1), held between 8 and 30. */
export function baseNodeRadius(weight: number): number {
  const w = Number.isFinite(weight) && weight > 0 ? weight : 0;
  return clamp(3 * Math.sqrt(w + 1), NODE_RADIUS_MIN, NODE_RADIUS_MAX);
}

/**
 * A dot's radius with the "Node size" slider applied: device pixels at
 * scale 1 (Obsidian's `getSize`).
 */
export const nodeRadius = (weight: number, nodeSize = 1): number =>
  nodeSize * baseNodeRadius(weight);

/**
 * Every node's radius at node size 1 (device pixels at scale 1), as the
 * renderer's `radii` takes them. A local graph (one with a focus) uses the local rule:
 * the focus at the largest size, every other node at the smallest.
 */
export function nodeRadii(graph: {
  readonly count: number;
  readonly weights: ArrayLike<number>;
  /** The local graph's focus, or -1 for the global graph. */
  readonly focus: number;
}): Float32Array {
  const radii = new Float32Array(graph.count);
  const local = graph.focus >= 0;
  for (let i = 0; i < graph.count; i++) {
    const weight = local
      ? i === graph.focus
        ? LOCAL_FOCUS_WEIGHT
        : LOCAL_NODE_WEIGHT
      : graph.weights[i];
    radii[i] = baseNodeRadius(weight);
  }
  return radii;
}

/**
 * How much a dot is scaled in world units: 1/√scale (Obsidian's
 * `nodeScale`). A dot's radius in world units is its radius times this,
 * which is what hit testing compares positions against.
 */
export const nodeScale = (zoom: number, dpr = 1): number =>
  1 / Math.sqrt(deviceScale(zoom, dpr));

/** A dot's radius on screen, in CSS pixels: radius·√scale device pixels. */
export const screenRadius = (radius: number, zoom: number, dpr = 1): number =>
  (radius * Math.sqrt(deviceScale(zoom, dpr))) / pixelRatio(dpr);

/** A label's type size at scale 1 for a dot of this (world) radius. */
export const labelFontSize = (radius: number): number =>
  LABEL_BASE_PX + radius / 4;

/**
 * What every label size and the wrap width are multiplied by on screen, in
 * CSS pixels: √scale device pixels per unit of type. The label layer's
 * `wrapScale` is this.
 */
export const labelScale = (zoom: number, dpr = 1): number =>
  Math.sqrt(deviceScale(zoom, dpr)) / pixelRatio(dpr);

/**
 * A label's type size on screen, in CSS pixels. It scales with √scale like
 * its dot, except the hovered label, which never shrinks below its scale-1
 * size.
 */
export function labelScreenSize(
  radius: number,
  zoom: number,
  hovered = false,
  dpr = 1,
): number {
  const size = labelFontSize(radius);
  const scale = deviceScale(zoom, dpr);
  return hovered && scale < 1
    ? size / pixelRatio(dpr)
    : size * labelScale(zoom, dpr);
}

/**
 * How far below its dot's centre a label's top sits on screen, in CSS
 * pixels: the radius and the gap, scaled like the dot, and the hovered
 * label's extra drop of 15 device pixels.
 */
export const labelScreenOffset = (
  radius: number,
  zoom: number,
  hovered = false,
  dpr = 1,
): number =>
  (radius + LABEL_GAP_PX) * labelScale(zoom, dpr) +
  (hovered ? HOVER_LABEL_SHIFT_PX / pixelRatio(dpr) : 0);

/**
 * Label opacity: clamp(log2(scale) + 1 − textFade, 0, 1), where `textFade`
 * is the "Text fade threshold" slider (−3 to 3).
 */
export function labelAlpha(zoom: number, textFade = 0, dpr = 1): number {
  if (!(zoom > 0)) return 0;
  return clamp(Math.log2(deviceScale(zoom, dpr)) + 1 - textFade, 0, 1);
}

/** Arrow opacity: none at scale 0.3, rising evenly to full at 0.8. */
export const arrowAlpha = (zoom: number, dpr = 1): number =>
  clamp(
    (deviceScale(zoom, dpr) - ARROW_FADE_FROM) /
      (ARROW_FADE_TO - ARROW_FADE_FROM),
    0,
    1,
  );

/** An arrow's length in device pixels: 8·√(line thickness), at every zoom. */
export const arrowDeviceLength = (lineSize: number): number =>
  ARROW_LENGTH_PX * Math.sqrt(Math.max(0, lineSize));

/**
 * A line's width in world units, so that on screen it is always `lineSize`
 * device pixels wide.
 */
export const lineWorldWidth = (
  lineSize: number,
  zoom: number,
  dpr = 1,
): number => lineSize / deviceScale(zoom, dpr);

/**
 * The ring round a hovered or ringed dot, in device pixels: √scale (Obsidian
 * draws `max(1, √scale)`), held between one and two CSS pixels. The node
 * shader works out the same width.
 */
export function ringDeviceWidth(zoom: number, dpr = 1): number {
  const ratio = pixelRatio(dpr);
  const scale = deviceScale(zoom, dpr);
  return clamp(Math.sqrt(scale > 0 ? scale : 0), ratio, 2 * ratio);
}

/** Is a line long enough on screen (CSS pixels) to draw its dots or dashes? */
export const showsConfidence = (screenLength: number): boolean =>
  screenLength >= CONFIDENCE_MIN_SCREEN_PX;
