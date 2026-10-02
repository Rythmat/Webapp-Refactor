import {
  boundsOf,
  type Camera,
  clampZoom,
  FRAME_MS,
  fitToBounds,
  HOME_CAMERA,
  momentumStep,
  type PanVelocity,
  type Point,
  screenToWorld,
  type Viewport,
  worldToScreen,
  zoomAround,
  zoomAt,
} from './model/camera';
import { buildHitIndex, type HitIndex } from './model/hitTest';
import { neighboursOf } from './model/renderGraph';
import {
  deviceScale,
  LABEL_GAP_PX,
  labelAlpha,
  labelFontSize,
  labelScale,
  labelScreenSize,
  nodeScale,
  pixelRatio,
  ringDeviceWidth,
} from './model/sizing';
import {
  NO_NODE,
  NODE_FLAG_RING,
  NODE_STATE_HOVERED,
  NODE_STATE_LIT,
  type RendererStyle,
} from './render/GraphRenderer';
import { GRAPH_THEME } from './render/graphTheme';
import type { LabelLayer } from './render/labelLayer';
import type { WebglGraphRenderer } from './render/webglRenderer';

/**
 * Cortex's scene: everything the canvas draws and the loop that draws it,
 * with no React in it. `GraphCanvas` owns one and feeds it the graph, the
 * colours, the settings and the layout's positions; the pointer and keys
 * (`useGraphInteraction`) move its camera and its hover.
 *
 * The loop draws only when something changed. Each change marks what it
 * touched and asks for one animation frame; the frame then uploads the
 * newest positions once (however many the layout sent since the last
 * frame), steps any animation still running (a camera flight, a coasting
 * pan, the hover fade, a glide of the dots into a layout handed back by a
 * timelapse), lets the renderer draw if anything it holds
 * changed, redraws the labels if they could have moved, and asks for
 * another frame only while an animation is still going. An idle graph asks
 * for nothing at all.
 *
 * The camera works in CSS pixels (`model/camera.ts`); the renderer and the
 * labels work out Obsidian's device-pixel sizes from it and the pixel ratio
 * (`model/sizing.ts`). Hit testing uses the same rules, so a dot is caught
 * where it is drawn, plus a few pixels of slack round the smallest ones.
 *
 * The wheel, a trackpad pinch, the `=` and `−` keys and the zoom buttons
 * ease toward the zoom they ask for, as Obsidian's `updateZoom` does: each
 * asks for its factor times the zoom already being headed for, and every
 * frame closes 15% of the gap (per 60th of a second), about the cursor when
 * zooming in and the middle when zooming out, until it is within 1%, where
 * it lands exactly. Under reduced motion the zoom jumps there. A two-finger
 * touch pinch follows the fingers directly instead.
 *
 * When the stage narrows (a row opening in the drawer beside it) and that
 * pushes the open row's dot off the stage, the camera pans just far enough
 * to bring it back, gliding unless motion is reduced.
 *
 * Labels follow Obsidian: none when zoomed out, fading in as the zoom
 * passes the text fade threshold, at most 800 of them, the biggest dots
 * first. The hovered dot's label always shows; so do the keyboard's current
 * item, the open row's and the local graph's focus, which go ahead of the
 * rest. While a dot is hovered, the labels of everything not next to it
 * fade with the dots.
 *
 * Tesseract, the console's map of progression openings, draws on the same
 * scene with fixed positions, and asks for three things Cortex leaves at
 * their defaults: a hover that lights the path back to the tree's root
 * rather than the neighbours (`markHover`), labels set to the right of
 * their dots and sized with the zoom (`labelRules`), and a glide in which a
 * dot that was not drawn before starts from its nearest drawn ancestor
 * (`glideNext`'s `from`).
 */

/**
 * What the scene draws: the parts of a `RenderGraph` it reads. Cortex hands
 * it a whole `RenderGraph`; Tesseract builds one of its own, whose ids are
 * progression openings rather than Atlas ids.
 */
export interface SceneGraph {
  readonly count: number;
  /** Each node's id: what a glide matches dots by. */
  readonly ids: readonly string[];
  /** Each node's label. */
  readonly nodes: readonly { readonly label: string }[];
  /** Who gets a label first when there is not room for all: heaviest first. */
  readonly weights: ArrayLike<number>;
  readonly links: Uint32Array;
  readonly linkFlags: Uint8Array;
  readonly neighbourOffsets: Uint32Array;
  readonly neighbours: Uint32Array;
}

/**
 * How labels are placed and sized, for a scene that does not want
 * Obsidian's rules (labels under the dots, their type growing with the
 * square root of the zoom).
 */
export interface SceneLabelRules {
  /** `right`: each name starts just right of its dot, centred on it. */
  readonly placement: 'below' | 'right';
  /** Every label's type size on screen, in CSS pixels, at this zoom. */
  size(zoom: number, dpr: number): number;
  /** How strongly labels show at this zoom, 0 (none) to 1. */
  alpha(zoom: number, dpr: number, textFade: number): number;
}

/** How far round a dot the pointer still catches it, in CSS pixels. */
const HIT_SLACK_PX = 3;

/** How long a camera flight to a found item takes (none under reduced motion). */
const FLIGHT_MS = 450;

/**
 * How much of the gap to the asked-for zoom is left after one 60th of a
 * second: Obsidian's `mQ(scale, target, 0.85)` every frame.
 */
export const ZOOM_EASE_KEEP = 0.85;

/** A zoom this close to where it is heading (as a ratio) lands there. */
export const ZOOM_EASE_DONE = 0.01;

/** How long the pan that brings a hidden open row's dot back takes. */
const REVEAL_MS = 300;

/** How far inside the stage's edge a dot brought back into view lands, in CSS pixels. */
const REVEAL_MARGIN_PX = 48;

/**
 * The closest a flight to a found item zooms in by itself: Obsidian's scale
 * 1, where labels are solid. A view already closer stays as it is.
 */
const FIND_SCALE = 1;

/** The display settings the scene draws by. */
export interface SceneStyle extends RendererStyle {
  /** The "Text fade threshold" slider, −3 to 3. */
  textFade: number;
}

export interface SceneHooks {
  /** The latest positions from the layout, or null before the first. */
  positions(): Float32Array | null;
  /** The camera moved; `byUser` when a gesture or key moved it. */
  onCamera?(camera: Camera, byUser: boolean): void;
  /** A frame was drawn with positions on it. */
  onFrame?(): void;
}

/** One frame's timing and counts, for the dev hook. */
export interface SceneStats {
  frames: number;
  /** `performance.now()` of the first frame drawn with positions. */
  firstFrameAt: number | null;
  /** The renderer's CPU time for its last frame. */
  lastFrameMs: number;
  /** Labels drawn on the last label pass. */
  labels: number;
}

export interface GraphScene {
  /** A new graph to draw, with its base radii, colours and ring flags. */
  setGraph(
    graph: SceneGraph,
    radii: Float32Array,
    colors: Uint8Array,
    flags: Uint8Array,
  ): void;
  setColors(colors: Uint8Array): void;
  /**
   * A graph of the same shape as the one drawn (the same nodes, lines and
   * focus): only its names are taken, so positions, the hover and the
   * labels' order all carry on.
   */
  replaceGraph(graph: SceneGraph): void;
  /** Which dots have a ring (the local graph's focus, the current item, the open row). */
  setFlags(flags: Uint8Array): void;
  /** The nodes whose labels always show, most important first. */
  setPinnedLabels(indices: readonly number[]): void;
  setStyle(style: SceneStyle): void;
  setReducedMotion(on: boolean): void;
  resize(width: number, height: number, dpr: number): void;
  /** The layout has new positions; they are uploaded on the next frame. */
  positionsChanged(): void;
  /**
   * Glide into the next positions rather than jump. The dots as they are
   * drawn now are kept; when positions for the next graph arrive, each dot
   * travels from where it was drawn (matched by id) to its new place over
   * `ms`, and one not drawn before appears in place. A camera the page sets
   * meanwhile (not the user) flies there over the same time. This is how a
   * timelapse hands back the settled layout. Under reduced motion, or with
   * nothing drawn yet, the next positions simply show.
   *
   * `from`, when given, names where a dot not drawn before starts instead:
   * it is asked for an id's stand-in (Tesseract answers with the parent
   * opening), and asked again of that answer until one was drawn, so a
   * branch opening out grows from its node.
   */
  glideNext(ms: number, from?: (id: string) => string | null): void;

  camera(): Camera;
  viewport(): Viewport;
  /**
   * Move the camera. A move by the user stops the graph fitting itself. A
   * camera with a new zoom (or one the page sets) ends an eased zoom under
   * way; a pan by the user does not.
   */
  setCamera(camera: Camera, byUser: boolean): void;
  /**
   * Zoom by `factor` from where the zoom is heading, easing there: about
   * `cursor` when zooming in, about the middle when zooming out or with no
   * cursor. At once under reduced motion. It stops the graph fitting itself.
   */
  zoomToward(factor: number, cursor: Point | null): void;
  /** The zoom an eased zoom is heading for, or null when none is under way. */
  zoomTarget(): number | null;
  /**
   * Bring a node back onto the stage when it is off it, panning the least
   * that leaves it 48 px inside the edge, gliding unless motion is reduced.
   * False when it was already on the stage (or has no position).
   */
  reveal(index: number): boolean;
  /** Keep fitting the whole graph in view as it settles, until the user moves. */
  setAutoFit(on: boolean): void;
  /** Frame the whole graph, gliding there unless `animate` is false. */
  fit(animate?: boolean): void;
  /** Fly to a node, zooming in to read it if the view is further out. */
  flyTo(index: number): boolean;
  /** Coast at this velocity (a flung pan). */
  fling(velocity: PanVelocity): void;
  stopMotion(): void;

  /** The node under a point on the stage (CSS pixels), or -1. */
  hitTest(x: number, y: number): number;
  /** A node's centre on the stage (CSS pixels), or null when it has none yet. */
  screenOf(index: number): Point | null;
  /** Hover a node, lighting it and its neighbours, or -1 for none. */
  hover(index: number): void;
  hovered(): number;
  /** Light a set of nodes (a colour group pointed at in the legend), or none. */
  setSpotlight(mask: Uint8Array | null): void;

  /** Whether positions for the current graph have been drawn yet. */
  hasPositions(): boolean;
  stats(): SceneStats;
  destroy(): void;
}

export interface GraphSceneOptions {
  renderer: WebglGraphRenderer;
  labels: LabelLayer | null;
  hooks: SceneHooks;
  /** The animation frame source; the browser's by default. */
  requestFrame?: (callback: (time: number) => void) => number;
  cancelFrame?: (handle: number) => void;
  now?: () => number;
  /**
   * What hovering node `index` lights: fill `state` (already cleared) with
   * the renderer's `NODE_STATE_*` for every node that should stay at full
   * strength; the scene then marks `index` itself hovered. By default the
   * node's neighbours are lit, as in Obsidian.
   */
  markHover?(graph: SceneGraph, index: number, state: Uint8Array): void;
  /** How labels are placed and sized; Obsidian's rules when absent. */
  labelRules?: SceneLabelRules;
}

/** Obsidian's hover: every neighbour of the hovered node stays lit. */
const markNeighbours = (
  graph: SceneGraph,
  index: number,
  state: Uint8Array,
) => {
  for (const n of neighboursOf(graph, index)) state[n] = NODE_STATE_LIT;
};

/** The gap between a dot's edge and its label, in CSS pixels, for `SceneLabelRules`. */
const RULED_LABEL_GAP_PX = 4;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** Float arrays of at least `n`, reused while big enough. */
const grow = (array: Float32Array, n: number): Float32Array =>
  array.length >= n ? array : new Float32Array(Math.max(n, array.length * 2));

export function createGraphScene(options: GraphSceneOptions): GraphScene {
  const { renderer, labels, hooks } = options;
  const requestFrame =
    options.requestFrame ?? ((cb) => window.requestAnimationFrame(cb));
  const cancelFrame =
    options.cancelFrame ?? ((h) => window.cancelAnimationFrame(h));
  const now = options.now ?? (() => performance.now());

  const markHover = options.markHover ?? markNeighbours;
  const labelRules = options.labelRules ?? null;
  let graph: SceneGraph | null = null;
  let radii: Float32Array = new Float32Array(0);
  let text: string[] = [];
  /** Nodes by weight, heaviest first, then by id: who gets a label first. */
  let byWeight = new Int32Array(0);
  let style: SceneStyle = {
    nodeSize: 1,
    lineSize: 1,
    arrows: false,
    confidence: true,
    textFade: 0,
  };
  let reducedMotion = false;

  let camera: Camera = HOME_CAMERA;
  let viewport = { width: 0, height: 0, dpr: 1 };
  let autoFit = true;

  /** The positions last uploaded, the layout's own array. */
  let xy: Float32Array | null = null;
  let drawnPositions = false;
  let positionsDirty = false;
  let labelsDirty = false;

  let hit: HitIndex | null = null;
  let hitStale = true;

  // Hover: the node under the pointer now (for labels), and what the
  // renderer is fading (which outlives the pointer by the fade).
  let pointed = NO_NODE;
  let fadeNode = NO_NODE;
  let state = new Uint8Array(0);
  let fade = 0;
  let fadeFrom = 0;
  let fadeTarget = 0;
  let fadeStart = 0;
  let spotlight: Uint8Array | null = null;
  let pinnedLabels: readonly number[] = [];

  let flight: { from: Camera; to: Camera; start: number; ms: number } | null =
    null;
  let momentum: { velocity: PanVelocity; last: number } | null = null;
  /**
   * An eased zoom under way: the zoom it is heading for, the screen point
   * it zooms about (null for the middle) and when it last stepped.
   */
  let zoomEase: {
    target: number;
    anchor: Point | null;
    last: number | null;
  } | null = null;
  /** Which dots wear a ring (focus, current, open row), for the labels. */
  let ringFlags: Uint8Array = new Uint8Array(0);

  // A glide into new positions (`glideNext`): the dots as they were drawn
  // when it was asked for, then, once the new positions came, where each
  // starts by the new graph's numbering. While it runs `xy` is `blend`, the
  // dots between the two, and `target` is the layout's own latest array.
  let glideFrom: {
    ids: readonly string[];
    xy: Float32Array;
    ms: number;
    at: number;
    /** Where a dot not drawn before starts (`glideNext`'s `from`). */
    from: ((id: string) => string | null) | null;
  } | null = null;
  let glide: { from: Float32Array; start: number; ms: number } | null = null;
  let target: Float32Array | null = null;
  let blend: Float32Array = new Float32Array(0);

  let raf = 0;
  let destroyed = false;
  const stats: SceneStats = {
    frames: 0,
    firstFrameAt: null,
    lastFrameMs: 0,
    labels: 0,
  };

  // Scratch arrays for the labels, reused from frame to frame.
  let screenXy: Float32Array = new Float32Array(0);
  let screenR: Float32Array = new Float32Array(0);
  let offsets: Float32Array = new Float32Array(0);
  let sizes: Float32Array = new Float32Array(0);
  let alphas: Float32Array = new Float32Array(0);
  let halos: Float32Array = new Float32Array(0);
  let order = new Int32Array(0);

  const request = () => {
    if (!raf && !destroyed) raf = requestFrame(frame);
  };

  const applyCamera = (next: Camera, byUser: boolean) => {
    camera = { x: next.x, y: next.y, zoom: next.zoom };
    renderer.setCamera(camera);
    labelsDirty = true;
    if (byUser) autoFit = false;
    hooks.onCamera?.(camera, byUser);
    request();
  };

  const fitCamera = (): Camera | null => {
    // Mid-glide the graph is framed where it is going, not where it is.
    const shown = glide ? target : xy;
    if (!graph || !shown || viewport.width <= 0 || viewport.height <= 0)
      return null;
    const bounds = boundsOf(shown, graph.count);
    return bounds ? fitToBounds(bounds, viewport) : null;
  };

  /** Whether a glide is waiting for its positions or running. */
  const gliding = () => glideFrom !== null || glide !== null;

  /**
   * Move the camera for the page (not the user): at once, or, while a glide
   * is on, flying there over the glide's time, so the view and the dots
   * arrive together.
   */
  const placeCamera = (next: Camera) => {
    zoomEase = null;
    if (gliding() && !reducedMotion) {
      const ms = glide ? glide.ms : (glideFrom?.ms ?? 0);
      flight = { from: camera, to: next, start: now(), ms };
      request();
      return;
    }
    flight = null;
    applyCamera(next, false);
  };

  /**
   * Start the glide the new positions `latest` were waited for: each dot
   * starts where it was drawn, found by id, or where it is going when it
   * was not drawn before. Glides asked for more than two seconds before any
   * positions came are dropped (the run they were for never arrived).
   */
  const beginGlide = (latest: Float32Array) => {
    const asked = glideFrom;
    glideFrom = null;
    if (!asked || !graph || reducedMotion || now() - asked.at > 2000) return;
    const before = new Map<string, number>();
    asked.ids.forEach((id, i) => before.set(id, i));
    /** Where a dot was drawn: its own place, or its nearest drawn stand-in's. */
    const drawnAt = (id: string): number | undefined => {
      let at = before.get(id);
      let next: string | null = id;
      // Ids nest at most a few steps; the bound keeps a looping answer safe.
      for (let hop = 0; at === undefined && asked.from && hop < 64; hop++) {
        next = next === null ? null : asked.from(next);
        if (next === null) break;
        at = before.get(next);
      }
      return at;
    };
    const from = new Float32Array(latest.length);
    for (let k = 0; k < graph.count; k++) {
      const i = drawnAt(graph.ids[k]);
      const x = i === undefined ? NaN : asked.xy[2 * i];
      const y = i === undefined ? NaN : asked.xy[2 * i + 1];
      const known = Number.isFinite(x) && Number.isFinite(y);
      from[2 * k] = known ? x : latest[2 * k];
      from[2 * k + 1] = known ? y : latest[2 * k + 1];
    }
    glide = { from, start: now(), ms: asked.ms };
  };

  /** One frame of a running glide; true while it has further to go. */
  const stepGlide = (): boolean => {
    if (!glide || !target) {
      glide = null;
      return false;
    }
    const t = glide.ms > 0 ? Math.min(1, (now() - glide.start) / glide.ms) : 1;
    if (t >= 1) {
      glide = null;
      xy = target;
      renderer.setPositions(target);
    } else {
      const k = easeInOut(Math.max(0, t));
      const n = target.length;
      blend = grow(blend, n);
      const from = glide.from;
      for (let i = 0; i < n; i++) {
        const a = from[i];
        const b = target[i];
        blend[i] = Number.isFinite(a) ? a + (b - a) * k : b;
      }
      xy = blend.subarray(0, n);
      renderer.setPositions(xy);
    }
    hitStale = true;
    labelsDirty = true;
    return glide !== null;
  };

  /** The renderer's hover state for what is hovered or spotlit now. */
  const applyHighlight = () => {
    renderer.setHighlight({ hovered: fadeNode, state, fade });
  };

  /** Fade toward `target` over 150 ms, or at once under reduced motion. */
  const startFade = (target: number) => {
    if (reducedMotion) {
      fade = fadeFrom = fadeTarget = target;
      if (target === 0) {
        state.fill(0);
        fadeNode = NO_NODE;
      }
      return;
    }
    if (fadeTarget === target) return;
    fadeFrom = fade;
    fadeTarget = target;
    fadeStart = now();
  };

  /** Light the pointed node and its neighbours, the spotlight, or nothing. */
  const highlight = () => {
    if (!graph) return;
    if (pointed >= 0) {
      state.fill(0);
      markHover(graph, pointed, state);
      state[pointed] = NODE_STATE_HOVERED;
      fadeNode = pointed;
      startFade(1);
    } else if (spotlight) {
      for (let i = 0; i < graph.count; i++) {
        state[i] = spotlight[i] ? NODE_STATE_LIT : 0;
      }
      fadeNode = NO_NODE;
      startFade(1);
    } else {
      // The fade runs out on the last state; the frame clears it at 0.
      startFade(0);
    }
    applyHighlight();
    labelsDirty = true;
    request();
  };

  const drawLabels = () => {
    if (!labels || !graph || !xy) {
      labels?.clear();
      stats.labels = 0;
      return;
    }
    const count = graph.count;
    const { zoom } = camera;
    const dpr = viewport.dpr;
    const base = labelRules
      ? labelRules.alpha(zoom, dpr, style.textFade)
      : labelAlpha(zoom, style.textFade, dpr);
    const showsAll = base > 0.01;
    const pinned = pinnedLabels.filter((i) => i >= 0 && i < count);
    if (!showsAll && pinned.length === 0 && pointed < 0) {
      labels.clear();
      stats.labels = 0;
      return;
    }

    screenXy = grow(screenXy, count * 2);
    screenR = grow(screenR, count);
    offsets = grow(offsets, count);
    sizes = grow(sizes, count);
    alphas = grow(alphas, count);
    if (order.length < count + pinned.length) {
      order = new Int32Array(count + pinned.length);
    }

    const type = labelScale(zoom, dpr);
    // A dot's radius on screen in CSS pixels, per device pixel at scale 1.
    const dot = Math.sqrt(deviceScale(zoom, dpr)) / pixelRatio(dpr);
    // A ringed dot's name starts below its ring, not on it.
    const ring = ringDeviceWidth(zoom, dpr) / pixelRatio(dpr);
    const size = style.nodeSize;
    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;
    // Ruled labels share one size, and start a few pixels past the dot.
    const ruledSize = labelRules ? labelRules.size(zoom, dpr) : 0;
    const place = (i: number) => {
      const r = radii[i] * size;
      screenXy[2 * i] = (xy![2 * i] - camera.x) * zoom + halfW;
      screenXy[2 * i + 1] = (xy![2 * i + 1] - camera.y) * zoom + halfH;
      screenR[i] = r * dot;
      const ringed = i === pointed || (ringFlags[i] & NODE_FLAG_RING) !== 0;
      if (labelRules) {
        offsets[i] = r * dot + RULED_LABEL_GAP_PX + (ringed ? ring : 0);
        sizes[i] = ruledSize;
      } else {
        offsets[i] = (r + LABEL_GAP_PX) * type + (ringed ? ring : 0);
        sizes[i] = labelFontSize(r) * type;
      }
    };

    let n = 0;
    const seen = new Set<number>();
    for (const i of pinned) {
      if (seen.has(i)) continue;
      seen.add(i);
      order[n++] = i;
      place(i);
    }
    if (pointed >= 0) place(pointed);
    if (showsAll) {
      for (let k = 0; k < byWeight.length; k++) {
        const i = byWeight[k];
        place(i);
        if (!seen.has(i)) order[n++] = i;
      }
    }
    let hoveredWrapScale: number | undefined;
    if (!labelRules && pointed >= 0 && deviceScale(zoom, dpr) < 1) {
      // The hovered name keeps its scale-1 size when zoomed out, and wraps
      // at 300 pixels of that size.
      sizes[pointed] = labelScreenSize(radii[pointed] * size, zoom, true, dpr);
      hoveredWrapScale = 1 / pixelRatio(dpr);
    }

    // One alpha for every name, unless some must show whatever the zoom or
    // a hover is fading the names of everything not next to it.
    const fading = fade > 0 && (fadeNode >= 0 || spotlight !== null);
    let alpha: Float32Array | number = base;
    if (pinned.length > 0 || fading) {
      const dim = 1 - fade * (1 - GRAPH_THEME.dimAlpha);
      for (let k = 0; k < n; k++) {
        const i = order[k];
        alphas[i] = fading && state[i] === 0 ? base * dim : base;
      }
      for (const i of pinned) alphas[i] = 1;
      alpha = alphas;
    }

    // A dark halo behind the names that can sit on white lines: the hovered
    // dot's and its neighbours' (its lines are white) and the ringed ones.
    halos = grow(halos, count);
    const lit = fade > 0 && fadeNode >= 0;
    let haloed = false;
    for (let k = 0; k < n; k++) {
      const i = order[k];
      const on =
        (lit && state[i] !== 0) || (ringFlags[i] & NODE_FLAG_RING) !== 0;
      halos[i] = on ? 1 : 0;
      haloed ||= on;
    }
    if (pointed >= 0) {
      halos[pointed] = 1;
      haloed = true;
    }

    stats.labels = labels.draw({
      order: order.subarray(0, n),
      text,
      xy: screenXy,
      radius: screenR,
      offset: offsets,
      size: sizes,
      alpha,
      halo: haloed ? halos : 0,
      hovered: pointed,
      wrapScale: labelRules ? 1 : type,
      hoveredWrapScale,
      ...(labelRules ? { placement: labelRules.placement } : {}),
    });
  };

  function frame(time: number) {
    raf = 0;
    if (destroyed) return;
    let again = false;

    if (positionsDirty) {
      positionsDirty = false;
      const latest = hooks.positions();
      if (graph && latest && latest.length === graph.count * 2) {
        target = latest;
        if (glideFrom) beginGlide(latest);
        if (!glide) {
          xy = latest;
          renderer.setPositions(latest);
        }
        drawnPositions = true;
        hitStale = true;
        labelsDirty = true;
        if (autoFit) {
          const fitted = fitCamera();
          // A glide frames where it is going once, as it sets off.
          if (fitted && !glide) applyCamera(fitted, false);
          else if (fitted && !flight) placeCamera(fitted);
        }
      }
    }

    if (glide && stepGlide()) again = true;

    if (flight) {
      const t =
        flight.ms > 0 ? Math.min(1, (time - flight.start) / flight.ms) : 1;
      const k = easeInOut(Math.max(0, t));
      const { from, to } = flight;
      const zoom = Math.exp(
        Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * k,
      );
      applyCamera(
        {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          zoom,
        },
        false,
      );
      if (t >= 1) flight = null;
      else again = true;
    }

    if (zoomEase) {
      const ease = zoomEase;
      // 15% of the gap per 60th of a second, whatever the screen's rate.
      const dt =
        ease.last === null
          ? FRAME_MS
          : Math.min(64, Math.max(0, time - ease.last));
      ease.last = time;
      const z = camera.zoom;
      const gap = z > ease.target ? z / ease.target : ease.target / z;
      const keep = ZOOM_EASE_KEEP ** (dt / FRAME_MS);
      const eased = z * keep + ease.target * (1 - keep);
      const close =
        gap - 1 < ZOOM_EASE_DONE ||
        Math.abs(eased / ease.target - 1) < ZOOM_EASE_DONE;
      const next = close ? ease.target : eased;
      const at = ease.anchor ?? {
        x: viewport.width / 2,
        y: viewport.height / 2,
      };
      applyCamera(zoomAround(camera, viewport, next / z, at), true);
      if (close) zoomEase = null;
      else again = true;
    }

    if (momentum) {
      const dt = Math.min(64, Math.max(0, time - momentum.last));
      momentum.last = time;
      const step = momentumStep(camera, momentum.velocity, dt);
      applyCamera(step.camera, false);
      if (step.velocity) {
        momentum.velocity = step.velocity;
        again = true;
      } else momentum = null;
    }

    if (fade !== fadeTarget) {
      const t = reducedMotion
        ? 1
        : Math.min(1, (now() - fadeStart) / GRAPH_THEME.hoverFadeMs);
      fade = fadeFrom + (fadeTarget - fadeFrom) * t;
      if (t >= 1) fade = fadeTarget;
      if (fade !== fadeTarget) again = true;
      else if (fade === 0) {
        state.fill(0);
        fadeNode = NO_NODE;
      }
      applyHighlight();
      labelsDirty = true;
    }

    const visible = viewport.width > 0 && viewport.height > 0;
    if (drawnPositions && visible && renderer.isDirty) {
      renderer.render();
      stats.frames += 1;
      stats.lastFrameMs = renderer.stats.lastFrameMs;
      if (stats.firstFrameAt === null) stats.firstFrameAt = now();
      hooks.onFrame?.();
    }
    if (labelsDirty && visible) {
      labelsDirty = false;
      drawLabels();
    }
    if (again) request();
  }

  const scene: GraphScene = {
    setGraph(next, nextRadii, colors, flags) {
      graph = next;
      radii = nextRadii;
      text = next.nodes.map((node) => node.label);
      const weights = next.weights;
      const ranked = Array.from({ length: next.count }, (_, i) => i).sort(
        (a, b) => weights[b] - weights[a] || a - b,
      );
      byWeight = Int32Array.from(ranked);
      state = new Uint8Array(next.count);
      ringFlags = flags.slice();
      pointed = NO_NODE;
      fadeNode = NO_NODE;
      fade = 0;
      fadeFrom = 0;
      fadeTarget = 0;
      hit = null;
      hitStale = true;
      drawnPositions = false;
      xy = null;
      // A glide under way was in the old graph's numbering; one asked for
      // and still waiting goes on to this graph's positions.
      glide = null;
      target = null;
      renderer.setGraph({
        count: next.count,
        links: next.links,
        linkFlags: next.linkFlags,
        radii: nextRadii,
        colors,
        nodeFlags: flags,
      });
      // The positions the layout holds now are this graph's when its
      // structure did not change; the frame checks they fit before drawing.
      positionsDirty = true;
      labelsDirty = true;
      if (spotlight && spotlight.length !== next.count) spotlight = null;
      request();
    },

    setColors(colors) {
      renderer.setColors(colors);
      request();
    },

    replaceGraph(next) {
      if (!graph || next.count !== graph.count) return;
      graph = next;
      text = next.nodes.map((node) => node.label);
      labelsDirty = true;
      request();
    },

    setFlags(flags) {
      renderer.setNodeFlags(flags);
      ringFlags = flags.slice();
      labelsDirty = true;
      request();
    },

    setPinnedLabels(indices) {
      pinnedLabels = indices;
      labelsDirty = true;
      request();
    },

    setStyle(next) {
      const nodeSizeChanged = next.nodeSize !== style.nodeSize;
      style = { ...next };
      renderer.setStyle({
        nodeSize: next.nodeSize,
        lineSize: next.lineSize,
        arrows: next.arrows,
        confidence: next.confidence,
      });
      if (nodeSizeChanged) hitStale = true;
      labelsDirty = true;
      request();
    },

    setReducedMotion(on) {
      reducedMotion = on;
      if (on) {
        momentum = null;
        if (flight) flight = { ...flight, ms: 0 };
        if (zoomEase) {
          // An eased zoom under way lands where it was going.
          const { target, anchor } = zoomEase;
          zoomEase = null;
          applyCamera(
            zoomAt(camera, viewport, target / camera.zoom, anchor),
            true,
          );
        }
        // A glide under way ends where it was going.
        glideFrom = null;
        if (glide) {
          glide = { ...glide, ms: 0 };
          request();
        }
      }
    },

    resize(width, height, dpr) {
      viewport = {
        width: Math.max(0, width),
        height: Math.max(0, height),
        dpr: pixelRatio(dpr),
      };
      renderer.resize(viewport.width, viewport.height, viewport.dpr);
      labels?.resize(viewport.width, viewport.height, viewport.dpr);
      // The zoom limits depend on the pixel ratio.
      const zoom = clampZoom(camera.zoom, viewport.dpr);
      if (zoom !== camera.zoom) applyCamera({ ...camera, zoom }, false);
      if (autoFit) {
        const fitted = fitCamera();
        if (fitted) applyCamera(fitted, false);
      }
      labelsDirty = true;
      request();
    },

    positionsChanged() {
      positionsDirty = true;
      request();
    },

    glideNext(ms, from) {
      if (!graph || !xy || !drawnPositions || reducedMotion || !(ms > 0)) {
        glideFrom = null;
        return;
      }
      glideFrom = {
        ids: graph.ids,
        xy: Float32Array.from(xy.subarray(0, graph.count * 2)),
        ms,
        at: now(),
        from: from ?? null,
      };
      glide = null;
    },

    camera: () => camera,
    viewport: () => viewport,

    setCamera(next, byUser) {
      const clamped = { ...next, zoom: clampZoom(next.zoom, viewport.dpr) };
      // A pan by the user rides along with an eased zoom; anything that
      // sets the zoom itself, or a camera the page sets, ends it.
      if (!byUser || clamped.zoom !== camera.zoom) zoomEase = null;
      if (!byUser && gliding()) {
        placeCamera(clamped);
        return;
      }
      flight = null;
      applyCamera(clamped, byUser);
    },

    zoomToward(factor, cursor) {
      if (!(factor > 0) || !Number.isFinite(factor)) return;
      const from = zoomEase?.target ?? camera.zoom;
      const target = clampZoom(from * factor, viewport.dpr);
      flight = null;
      autoFit = false;
      if (reducedMotion) {
        zoomEase = null;
        applyCamera(
          zoomAt(camera, viewport, target / camera.zoom, cursor),
          true,
        );
        return;
      }
      if (target === camera.zoom) {
        zoomEase = null;
        return;
      }
      // Obsidian: in about the cursor, out about the middle.
      zoomEase = {
        target,
        anchor: target > camera.zoom && cursor ? { ...cursor } : null,
        last: zoomEase?.last ?? null,
      };
      request();
    },

    zoomTarget: () => zoomEase?.target ?? null,

    reveal(index) {
      if (!graph || !xy || index < 0 || index >= graph.count) return false;
      const x = xy[2 * index];
      const y = xy[2 * index + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      const { width, height } = viewport;
      if (width <= 0 || height <= 0) return false;
      const at = worldToScreen(camera, viewport, { x, y });
      const margin = Math.min(REVEAL_MARGIN_PX, width / 4, height / 4);
      const shift = (p: number, size: number) =>
        p < margin ? p - margin : p > size - margin ? p - (size - margin) : 0;
      const dx = shift(at.x, width);
      const dy = shift(at.y, height);
      if (dx === 0 && dy === 0) return false;
      autoFit = false;
      momentum = null;
      const to: Camera = {
        x: camera.x + dx / camera.zoom,
        y: camera.y + dy / camera.zoom,
        zoom: zoomEase?.target ?? camera.zoom,
      };
      zoomEase = null;
      if (reducedMotion) {
        flight = null;
        applyCamera(to, true);
        return true;
      }
      flight = { from: camera, to, start: now(), ms: REVEAL_MS };
      request();
      return true;
    },

    setAutoFit(on) {
      autoFit = on;
      if (on) {
        const fitted = fitCamera();
        if (fitted) applyCamera(fitted, false);
      }
    },

    fit(animate = true) {
      const fitted = fitCamera();
      autoFit = false;
      if (!fitted) return;
      momentum = null;
      zoomEase = null;
      if (!animate || reducedMotion) {
        flight = null;
        applyCamera(fitted, true);
        return;
      }
      flight = { from: camera, to: fitted, start: now(), ms: FLIGHT_MS };
      request();
    },

    flyTo(index) {
      if (!graph || !xy || index < 0 || index >= graph.count) return false;
      const x = xy[2 * index];
      const y = xy[2 * index + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      autoFit = false;
      momentum = null;
      zoomEase = null;
      const readable = FIND_SCALE / viewport.dpr;
      const to: Camera = {
        x,
        y,
        zoom: clampZoom(Math.max(camera.zoom, readable), viewport.dpr),
      };
      flight = {
        from: camera,
        to,
        start: now(),
        ms: reducedMotion ? 0 : FLIGHT_MS,
      };
      request();
      return true;
    },

    fling(velocity) {
      if (reducedMotion) return;
      flight = null;
      momentum = { velocity, last: now() };
      request();
    },

    stopMotion() {
      flight = null;
      momentum = null;
    },

    hitTest(x, y) {
      if (!graph || !xy || !drawnPositions) return NO_NODE;
      if (hitStale || !hit) {
        hit = buildHitIndex(xy, radii, graph.count);
        hitStale = false;
      }
      const world = screenToWorld(camera, viewport, { x, y });
      return hit.hit(
        world.x,
        world.y,
        style.nodeSize * nodeScale(camera.zoom, viewport.dpr),
        HIT_SLACK_PX / camera.zoom,
      );
    },

    screenOf(index) {
      if (!graph || !xy || index < 0 || index >= graph.count) return null;
      const x = xy[2 * index];
      const y = xy[2 * index + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return worldToScreen(camera, viewport, { x, y });
    },

    hover(index) {
      const next = graph && index >= 0 && index < graph.count ? index : NO_NODE;
      if (next === pointed) return;
      pointed = next;
      highlight();
    },

    hovered: () => pointed,

    setSpotlight(mask) {
      spotlight = mask && graph && mask.length === graph.count ? mask : null;
      highlight();
    },

    hasPositions: () => drawnPositions,
    stats: () => ({ ...stats }),

    destroy() {
      destroyed = true;
      if (raf) cancelFrame(raf);
      raf = 0;
    },
  };
  return scene;
}
