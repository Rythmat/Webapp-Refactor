/**
 * The Mind Map's labels: names drawn under the dots on a 2D canvas laid over
 * the WebGL one (design §5, §6, §7).
 *
 * Text is the one thing WebGL draws badly and the browser draws well, so the
 * dots and lines go through the GPU and the names go through an ordinary
 * canvas in the console's own font, Glacial Indifference. That needs no font
 * atlas, and a label looks exactly like the same words anywhere else in the
 * console.
 *
 * The layer knows nothing about the graph. Each frame the caller hands it
 * plain arrays, indexed by node number: where each dot is on screen, how big
 * it is, what size its name is set in and how strongly it shows. The caller
 * also says which nodes come first when there is not room for them all, so
 * the hovered, current, selected and focused nodes can claim their places
 * before the heavy hubs. The layer then:
 *
 * - waits for Glacial Indifference to load before drawing anything, so a
 *   label never flashes up in a fallback font first;
 * - skips names whose alpha is zero, which is every name when zoomed far
 *   out. Given one alpha for every name (a number, as the zoom's fade is),
 *   a zoomed-out frame does not even walk the list, so it costs nothing;
 * - skips names whose dot is off screen;
 * - draws at most 800 names, taking them in the caller's order;
 * - wraps a long name onto several lines at 300 px (or at 300 px scaled
 *   with the type, when the caller passes the zoom's share). The breaks
 *   are worked out once per name in the label's own type, its size with
 *   the zoom's share taken out, because type and wrap width that grow
 *   together break in the same places. A zoom then measures no text at
 *   all; only a new name, or a new size of dot, does. The sizes remembered
 *   are capped, the least recently used forgotten first;
 * - always draws the hovered node's name, at full strength and shifted 15
 *   device pixels further down (Obsidian's drop, so 7.5 CSS pixels on a
 *   Retina screen), on top of the rest;
 * - draws a dark halo behind the names the caller marks (the hovered dot's,
 *   its neighbours' and the ringed ones, which sit on the white highlight
 *   lines): the text is first stroked about 3.5 device pixels wide all
 *   round in the page's background colour, then filled, so a name stays
 *   readable over a bundle of white lines. With no halo colour (no page to
 *   read it from) the names are drawn plain;
 * - draws sharp text on Retina screens by scaling the canvas to the device
 *   pixel ratio (capped at 2, like the WebGL canvas).
 *
 * It is a plain module with no React, so the canvas component owns it like
 * the renderer and redraws it whenever it redraws the dots.
 */

/** The font asked for before the first label (design §7). */
export const LABEL_FONT_PROBE = '14px "Glacial Indifference"';

/**
 * The canvas font for a label of `px` CSS pixels: Glacial first, then the
 * system sans for the moment a glyph is missing from it.
 */
export const labelFont = (px: number): string =>
  `${px}px "Glacial Indifference", system-ui, sans-serif`;

/** The most labels one frame draws (design §6). */
export const MAX_LABELS = 800;

/** A label longer than this, in CSS pixels, wraps onto further lines. */
export const LABEL_WRAP_WIDTH = 300;

/**
 * How much further down the hovered node's label sits, in device pixels as
 * Obsidian measures it: the layer divides it by the pixel ratio it was
 * sized at, so on a Retina screen the drop is 7.5 CSS pixels.
 */
export const HOVER_LABEL_SHIFT = 15;

/** Obsidian's label colour on its dark theme (`graphTheme` passes its own). */
export const DEFAULT_LABEL_COLOR = '#dadada';

/**
 * The gap between the bottom of a dot and the top of its label, when the
 * caller does not say where the label goes (Obsidian's 5 px).
 */
export const LABEL_GAP = 5;

/** Line height, as a multiple of the font size. */
const LINE_HEIGHT = 1.2;

/** A label fainter than this is not drawn at all. */
const MIN_ALPHA = 0.01;

/** The canvas never draws at more than twice the CSS resolution. */
const MAX_DPR = 2;

/**
 * How far a label's halo reaches beyond its letters, in device pixels. The
 * stroke is twice this wide, since half of it lies under the letters.
 */
export const HALO_DEVICE_PX = 3.5;

/** A halo never reaches further than this share of the type size. */
const HALO_MAX_SHARE = 0.25;

/**
 * Wrapped labels kept per font size before that size's memory is cleared.
 * A whole-Atlas graph has about 8,000 names, and only those on screen at
 * that size are ever wrapped.
 */
const WRAP_CACHE_LIMIT = 4000;

/**
 * Font sizes whose wraps are remembered. Dots come in a handful of sizes,
 * so a graph's labels use a dozen or so; this leaves room for the Node size
 * slider and the hovered label without letting the memory grow for ever.
 */
const WRAP_SIZE_LIMIT = 32;

/**
 * Text sizes are rounded to the nearest half pixel, so names of nearly the
 * same size share a font string, and a label's own type (its size with the
 * zoom taken out) lands on the same remembered wraps at every zoom.
 */
const sizeBucket = (px: number): number => Math.max(1, Math.round(px * 2) / 2);

/**
 * The parts of a 2D context the layer uses. A real
 * `CanvasRenderingContext2D` is one; tests pass a recording fake.
 */
export type LabelContext = Pick<
  CanvasRenderingContext2D,
  | 'setTransform'
  | 'clearRect'
  | 'fillText'
  | 'strokeText'
  | 'measureText'
  | 'font'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'lineJoin'
  | 'globalAlpha'
  | 'textAlign'
  | 'textBaseline'
>;

/** The parts of a canvas the layer uses: an `HTMLCanvasElement` is one. */
export interface LabelCanvas {
  width: number;
  height: number;
  style: { width: string; height: string };
  getContext(contextId: '2d'): LabelContext | null;
}

/** The font loader: `document.fonts` in a browser. */
export interface LabelFonts {
  load(font: string): Promise<unknown>;
}

/** A value per node, or one value for every node. */
export type PerNode = ArrayLike<number> | number;

const valueAt = (v: PerNode, i: number): number =>
  typeof v === 'number' ? v : (v[i] ?? 0);

/**
 * One frame's labels. Every array is indexed by node number, as in the
 * renderer's contract (`GraphRenderer.ts`).
 */
export interface LabelFrame {
  /**
   * The nodes whose names may be drawn, most important first. When more
   * than 800 are on screen, the first 800 here win. A node left out is not
   * drawn, so the caller can pass only the candidates it cares about.
   */
  order: ArrayLike<number>;
  /** Each node's name. An empty name is skipped. */
  text: ArrayLike<string>;
  /**
   * Each dot's centre on screen, in CSS pixels from the canvas's top left:
   * node i at `xy[2i], xy[2i+1]`. A position that is not a finite number
   * (a node the layout has not placed yet) is skipped.
   */
  xy: ArrayLike<number>;
  /** Each dot's radius on screen, in CSS pixels. */
  radius: PerNode;
  /**
   * How far below its dot's centre each label's top sits on screen, in CSS
   * pixels, leaving out the hovered label's extra drop (the layer adds
   * that). When absent, the dot's radius plus a 5 px gap.
   */
  offset?: PerNode;
  /** Each name's font size, in CSS pixels. */
  size: PerNode;
  /**
   * How strongly each name shows, from 0 (not drawn) to 1. Pass a number
   * when every name shares the zoom's fade: at 0 the frame then skips
   * straight to the hovered name. (A name that must show whatever the zoom,
   * such as a local graph's focus, can stay in an array, with only the
   * names still showing in `order`.)
   */
  alpha: PerNode;
  /**
   * Which names get a dark halo behind them: above 0 for a halo, 0 for
   * none. Left out, none do. The layer's halo colour must be set too.
   */
  halo?: PerNode;
  /**
   * The hovered node's number, or -1. Its name always shows, 15 device
   * pixels lower than the rest.
   */
  hovered: number;
  /**
   * What the wrap width is multiplied by this frame. 1 wraps at 300 screen
   * pixels; the zoom's square root wraps at 300 pixels at zoom 1 and scales
   * with the type, as Obsidian does, so a name breaks in the same places at
   * every zoom. Pass the same factor the sizes were scaled by (√zoom with
   * the sizing model's `labelScreenSize`): the layer divides it back out of
   * each size to find the label's own type, so the wraps found at one zoom
   * serve every other and zooming measures nothing.
   */
  wrapScale?: number;
  /**
   * The wrap factor for the hovered name, when its size was scaled
   * differently from the rest. Zoomed out, Obsidian keeps the hovered name
   * at its scale-1 size, and it wraps at 300 pixels of that size rather
   * than of the shrunken type, so "Los Angeles" stays on one line. Left
   * out, the hovered name wraps like the others.
   */
  hoveredWrapScale?: number;
  /**
   * Where names sit: `below` their dots, centred (Obsidian's way, and the
   * default), or to the `right` of them, starting `offset` pixels from the
   * dot's centre and centred on it from top to bottom, with no hover drop.
   * Tesseract's trees grow left to right, so its names go to the right.
   */
  placement?: 'below' | 'right';
}

export interface LabelLayer {
  /**
   * Resolves once the label font has loaded (or failed to, in which case
   * the fallback font is used). Nothing is drawn before then.
   */
  readonly ready: Promise<void>;
  /** Whether the font has arrived and labels can be drawn. */
  isReady(): boolean;
  /** Match the canvas to its box: its CSS size and the screen's pixel ratio. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** Change the text colour, for a theme change. */
  setColor(color: string): void;
  /** Change the halo colour (the page's background); null draws no halo. */
  setHaloColor(color: string | null): void;
  /** Clear the canvas and draw this frame's labels. Returns how many it drew. */
  draw(frame: LabelFrame): number;
  /** Clear the canvas, drawing nothing. */
  clear(): void;
  /** Forget everything; the layer draws nothing after this. */
  destroy(): void;
}

export interface LabelLayerOptions {
  /** Text colour; Obsidian's `#dadada` when absent. */
  color?: string;
  /**
   * The halo's colour behind marked names: the page's background. Absent
   * or null, no halo is drawn.
   */
  haloColor?: string | null;
  /**
   * Where the font is loaded from: `document.fonts` when absent. Null means
   * there is nothing to wait for (a test, or a browser without the API).
   */
  fonts?: LabelFonts | null;
  /** Called once the font has arrived, so the caller can draw a frame. */
  onReady?(): void;
  /** The most labels per frame; 800 when absent. */
  maxLabels?: number;
  /** The wrap width in CSS pixels; 300 when absent. */
  wrapWidth?: number;
}

/** Where a label's top sits below its dot's centre, before any hover drop. */
const offsetOf = (frame: LabelFrame, i: number): number =>
  frame.offset === undefined
    ? valueAt(frame.radius, i) + LABEL_GAP
    : valueAt(frame.offset, i);

const defaultFonts = (): LabelFonts | null =>
  typeof document !== 'undefined' && document.fonts ? document.fonts : null;

/**
 * Break a name into lines no wider than `width`, at spaces. A single word
 * wider than that keeps a line to itself rather than being cut.
 */
export function wrapLabel(
  text: string,
  width: number,
  measure: (s: string) => number,
): string[] {
  if (measure(text) <= width) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

export function createLabelLayer(
  canvas: LabelCanvas,
  options: LabelLayerOptions = {},
): LabelLayer {
  const ctx = canvas.getContext('2d');
  const maxLabels = options.maxLabels ?? MAX_LABELS;
  const wrapWidth = options.wrapWidth ?? LABEL_WRAP_WIDTH;
  let color = options.color ?? DEFAULT_LABEL_COLOR;
  let haloColor = options.haloColor ?? null;
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  let destroyed = false;
  /** The font string last set on the context, so it is set only on change. */
  let currentFont = '';
  /**
   * Wrapped lines per font size (the label's own type, the zoom taken out),
   * then per name, with when each size was last used, so the least recently
   * used size is the one forgotten.
   */
  const wraps = new Map<
    number,
    { lines: Map<string, string[]>; used: number }
  >();
  let clock = 0;

  const fonts = options.fonts === undefined ? defaultFonts() : options.fonts;
  let ready = !fonts;
  const readyPromise: Promise<void> = fonts
    ? fonts
        .load(LABEL_FONT_PROBE)
        // A font that fails to load still lets labels draw, in the fallback.
        .then(
          () => undefined,
          () => undefined,
        )
        .then(() => {
          if (destroyed) return;
          ready = true;
          options.onReady?.();
        })
    : Promise.resolve();

  const setFont = (px: number) => {
    const font = labelFont(px);
    if (ctx && font !== currentFont) {
      ctx.font = font;
      currentFont = font;
    }
  };

  /** The frame's wrap factor, 1 when it gives none or a useless one. */
  const scaleOf = (frame: LabelFrame): number => {
    const scale = frame.wrapScale ?? 1;
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  };

  /** The wrap factor for one name: the hovered one may have its own. */
  const scaleFor = (frame: LabelFrame, i: number): number => {
    const own = frame.hoveredWrapScale;
    return i === frame.hovered &&
      own !== undefined &&
      Number.isFinite(own) &&
      own > 0
      ? own
      : scaleOf(frame);
  };

  /**
   * A name's lines at a size on screen. Type of `size` wrapped at the base
   * width times `scale` breaks where type of `size / scale` wraps at the
   * base width, so the breaks are found in that, the label's own type, and
   * kept for every zoom. Measuring sets the context's font to that type;
   * the caller sets the drawing font afterwards.
   */
  const linesOf = (text: string, size: number, scale: number): string[] => {
    const base = sizeBucket(size / scale);
    let bucket = wraps.get(base);
    if (!bucket) {
      if (wraps.size >= WRAP_SIZE_LIMIT) {
        let oldest: number | undefined;
        let oldestUse = Infinity;
        for (const [key, { used }] of wraps) {
          if (used < oldestUse) {
            oldest = key;
            oldestUse = used;
          }
        }
        if (oldest !== undefined) wraps.delete(oldest);
      }
      bucket = { lines: new Map(), used: 0 };
      wraps.set(base, bucket);
    }
    bucket.used = ++clock;
    const cached = bucket.lines.get(text);
    if (cached) return cached;
    if (bucket.lines.size >= WRAP_CACHE_LIMIT) bucket.lines.clear();
    let lines = [text];
    if (ctx) {
      setFont(base);
      lines = wrapLabel(text, wrapWidth, (s) => ctx.measureText(s).width);
    }
    bucket.lines.set(text, lines);
    return lines;
  };

  const clearCanvas = () => {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  /** This frame's wrap width on screen, in CSS pixels. */
  const wrapOf = (frame: LabelFrame): number =>
    Math.max(1, wrapWidth * scaleOf(frame));

  /**
   * Whether a label could show on screen: its dot is placed, and the box its
   * name could fill (as wide as the wrap, three lines deep) meets the canvas.
   */
  const onScreen = (frame: LabelFrame, i: number): boolean => {
    const x = frame.xy[2 * i];
    const y = frame.xy[2 * i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const depth = valueAt(frame.size, i) * LINE_HEIGHT * 3;
    if (frame.placement === 'right') {
      const left = x + offsetOf(frame, i);
      return (
        left <= cssWidth &&
        left + wrapOf(frame) >= 0 &&
        y - depth / 2 <= cssHeight &&
        y + depth / 2 >= 0
      );
    }
    const half = wrapOf(frame) / 2;
    const top = y + offsetOf(frame, i);
    return (
      x + half >= 0 &&
      x - half <= cssWidth &&
      top <= cssHeight &&
      top + depth >= 0
    );
  };

  const drawOne = (
    frame: LabelFrame,
    i: number,
    alpha: number,
    shift: number,
  ) => {
    if (!ctx) return;
    const size = valueAt(frame.size, i);
    const lines = linesOf(frame.text[i], size, scaleFor(frame, i));
    const px = sizeBucket(size);
    setFont(px);
    const right = frame.placement === 'right';
    const x = frame.xy[2 * i] + (right ? offsetOf(frame, i) : 0);
    // To the right, the lines' block is centred on the dot (each line's
    // middle is its baseline there); below, it hangs from the offset.
    const top = right
      ? frame.xy[2 * i + 1] - ((lines.length - 1) * px * LINE_HEIGHT) / 2
      : frame.xy[2 * i + 1] + offsetOf(frame, i);
    ctx.globalAlpha = alpha;
    if (haloColor && frame.halo !== undefined && valueAt(frame.halo, i) > 0) {
      // In CSS pixels (the context is scaled by the pixel ratio).
      const reach = Math.min(HALO_DEVICE_PX / dpr, px * HALO_MAX_SHARE);
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 2 * reach;
      ctx.lineJoin = 'round';
      for (let l = 0; l < lines.length; l++) {
        ctx.strokeText(lines[l], x, top + shift + l * px * LINE_HEIGHT);
      }
    }
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], x, top + shift + l * px * LINE_HEIGHT);
    }
  };

  return {
    ready: readyPromise,
    isReady: () => ready && !destroyed,

    resize(width, height, ratio) {
      cssWidth = Math.max(0, width);
      cssHeight = Math.max(0, height);
      dpr = Math.min(Math.max(ratio || 1, 0.5), MAX_DPR);
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      // Resizing a canvas resets its context, font included.
      currentFont = '';
    },

    setColor(next) {
      color = next;
    },

    setHaloColor(next) {
      haloColor = next;
    },

    draw(frame) {
      clearCanvas();
      if (!ctx || !ready || destroyed) return 0;
      const count = frame.text.length;
      const hovered =
        frame.hovered >= 0 && frame.hovered < count && frame.text[frame.hovered]
          ? frame.hovered
          : -1;

      // Choose in the caller's order, up to the cap. One alpha too faint
      // for every name (zoomed out) leaves nothing to choose from.
      const picked: number[] = [];
      const allFaded =
        typeof frame.alpha === 'number' && frame.alpha <= MIN_ALPHA;
      for (let k = 0; !allFaded && k < frame.order.length; k++) {
        if (picked.length >= maxLabels) break;
        const i = frame.order[k];
        if (i === hovered || i < 0 || i >= count) continue;
        if (!frame.text[i]) continue;
        if (valueAt(frame.alpha, i) <= MIN_ALPHA) continue;
        if (!onScreen(frame, i)) continue;
        picked.push(i);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const right = frame.placement === 'right';
      ctx.textAlign = right ? 'left' : 'center';
      ctx.textBaseline = right ? 'middle' : 'top';
      ctx.fillStyle = color;
      // The most important last, so where two names overlap it is on top.
      for (let k = picked.length - 1; k >= 0; k--) {
        const i = picked[k];
        drawOne(frame, i, Math.min(1, valueAt(frame.alpha, i)), 0);
      }
      let drawn = picked.length;
      if (hovered >= 0 && onScreen(frame, hovered)) {
        drawOne(frame, hovered, 1, right ? 0 : HOVER_LABEL_SHIFT / dpr);
        drawn += 1;
      }
      ctx.globalAlpha = 1;
      return drawn;
    },

    clear: clearCanvas,

    destroy() {
      destroyed = true;
      wraps.clear();
      clearCanvas();
    },
  };
}
