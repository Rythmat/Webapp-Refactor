import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/components/utilities';
import type { GraphScene } from './graphScene';
import type { LayoutClientOptions } from './layout/layoutClient';
import { REST_DEVICE_PX } from './layout/layoutProtocol';
import type { PositionCache } from './layout/positionCache';
import {
  boundsOf,
  type Camera,
  clampZoom,
  fitToBounds,
  type Point,
} from './model/camera';
import type { GraphDisplaySettings, MappedForces } from './model/graphSettings';
import {
  NODE_FOCUS,
  neighboursOf,
  type RenderGraph,
} from './model/renderGraph';
import { deviceScale, nodeRadii } from './model/sizing';
import { NODE_FLAG_RING } from './render/GraphRenderer';
import { GRAPH_THEME, readGraphBackground } from './render/graphTheme';
import { createLabelLayer, type LabelLayer } from './render/labelLayer';
import {
  createWebglRenderer,
  type WebglGraphRenderer,
  type WebglRendererOptions,
} from './render/webglRenderer';
import {
  useGraphInteraction,
  type InteractionHost,
  type PressKeys,
} from './useGraphInteraction';
import { useGraphStage } from './useGraphStage';
import {
  GLOBAL_SCOPE,
  isTimelapseScope,
  type LayoutHandle,
  useLayout,
} from './useLayout';

/**
 * Cortex's graph: the focusable region that holds the WebGL canvas and the
 * labels over it, and everything that keeps them moving.
 *
 * It owns, for as long as the page is open:
 *
 * - the WebGL2 renderer (`render/webglRenderer.ts`), made once, so opening
 *   and closing a row beside the graph, or switching between the global and
 *   a local graph, never rebuilds it;
 * - the label layer (`render/labelLayer.ts`) on a 2D canvas laid over it;
 * - the layout (`useLayout`): the force layout in its worker, warm-started
 *   from the positions it last settled at;
 * - the scene (`graphScene.ts`): the camera, the hover fade, hit testing and
 *   the loop that draws only when something changed;
 * - the pointer and keys (`useGraphInteraction`).
 *
 * The page hands it what to draw (the `RenderGraph`, its colours and the
 * display settings) and hears back what the reader did: a dot clicked
 * (`onOpen`), the keyboard's current item moved (`onCurrentChange`), the
 * local graph asked for, Find asked for, the layout settled.
 *
 * The region is the graph for assistive technology: `role="application"`,
 * named "Cortex: N items, M links" by the page, described by the key help.
 * The canvases inside are hidden from it; the List view is the readable
 * form of the same graph.
 *
 * It forwards its ref to the region and passes on any other props it is
 * given, so the right-click menu (Radix's trigger, `asChild`) can sit right
 * on it. The page's own handle (fit, zoom, fly to an item, hit test) comes
 * through `controlRef`.
 *
 * In the global graph the camera is kept in the browser every two seconds
 * (`ma-console-graph-camera-v1`), so reopening Cortex shows what was shown.
 * It is used only when the layout starts warm, from the positions that
 * camera was looking at; otherwise the graph fits itself as it settles,
 * until the reader moves it.
 *
 * When things go wrong or the reader asks for stillness:
 *
 * - Reduced motion (`reducedMotion`, the page's
 *   `prefers-reduced-motion: reduce`): the layout runs to rest out of sight
 *   and is drawn once, at the end, with "Arranging… N%" showing meanwhile;
 *   the hover lights up at once, and the camera jumps instead of gliding or
 *   coasting (the scene sees to that).
 * - A row opening beside the graph narrows the stage; when that hides the
 *   open row's dot, the camera pans just far enough to bring it back.
 * - The browser takes the WebGL context away: "Graph paused" shows and the
 *   names are hidden with the dots. The renderer rebuilds itself from its own
 *   copies when the context comes back, and the canvas draws a frame at once.
 * - No WebGL2 at all (the renderer cannot be made): the canvas says so and
 *   tells the page (`onUnavailable`), which shows the List view instead.
 * - The layout worker fails: the layout client carries on with the same
 *   engine on the page, from where the worker had got to, without a new run.
 */

/** Where the global graph's camera is kept. */
export const GRAPH_CAMERA_KEY = 'ma-console-graph-camera-v1';

/** How often the global graph's camera is kept, at most. */
const CAMERA_SAVE_MS = 2000;

/** How long the dots take to glide home when a timelapse ends. */
const TIMELAPSE_RESTORE_MS = 900;

/** Stepping through a node's neighbours with `[` and `]`. */
export interface NeighbourStep {
  /** Where the new current item sits among them, from 1. */
  index: number;
  of: number;
  /** The name of the item whose neighbours they are. */
  from: string;
}

/** The page's handle on the graph. */
export interface GraphCanvasApi {
  /** Frame the whole graph. */
  fit(): void;
  /** Back to Obsidian's scale 1 (labels solid), keeping the centre. */
  resetZoom(): void;
  /** Zoom about the middle by `factor`, easing there as the wheel does. */
  zoomBy(factor: number): void;
  /** Fly to an item; false when it is not drawn (filtered out, not in this local graph). */
  flyTo(id: string): boolean;
  /** Put the keyboard on the graph. */
  focus(): void;
  /** The item under a point on the screen (client pixels), or null. */
  hitTest(clientX: number, clientY: number): string | null;
  /** Where an item's dot is on the screen (client pixels), or null. */
  screenPositionOf(id: string): Point | null;
}

export interface GraphCanvasProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What to draw. */
  graph: RenderGraph;
  /** Four bytes per node: the colour groups' colours, the focus's own. */
  colors: Uint8Array;
  display: GraphDisplaySettings;
  /** The forces' strengths (`mappedForces`). */
  forces: MappedForces;
  /** `GLOBAL_SCOPE`, `localScope(focus)` or `timelapseScope(run)`: which layout run this is. */
  scope: string;
  /** The position cache's key for the global graph; null for a local graph. */
  signature: string | null;
  /** The global graph's key, which a local graph starts from. */
  globalSignature: string;
  /** The local graph's focus (canonical id), or null. */
  focusId: string | null;
  /** The keyboard's current item, and the item open beside the graph. */
  currentId: string | null;
  selectedId: string | null;
  /** Light these nodes (a colour group pointed at), or none. */
  spotlight?: Uint8Array | null;
  /** The region's name: "Cortex: N items, M links". */
  label: string;
  /** The id of the key help, which describes the region. */
  keyHelpId?: string;
  reducedMotion?: boolean;
  /**
   * A dot was clicked (with the keys held as it was let go), or Enter
   * pressed on the current item (no keys).
   */
  onOpen(id: string, keys?: PressKeys): void;
  /** `L` on the current item. */
  onLocalGraph(id: string): void;
  /** The keyboard's current item moved (null: let go). */
  onCurrentChange(id: string | null, step?: NeighbourStep): void;
  /** `/` was pressed: go to Find. */
  onFind(): void;
  /** The layout came to rest after a start or a change of structure. */
  onSettled?(): void;
  /** This browser cannot draw the graph (no WebGL2). */
  onUnavailable?(): void;
  /** The context was lost (true) or is back (false). */
  onPausedChange?(paused: boolean): void;
  /** The preview card for a dot, shown while Cmd or Ctrl is held over it. */
  renderPreview?(
    id: string,
    at: Point,
    bounds: { width: number; height: number },
  ): ReactNode;
  controlRef?: Ref<GraphCanvasApi>;
  /** For tests: the renderer (jsdom has no WebGL). */
  createRenderer?: (
    canvas: HTMLCanvasElement,
    options: WebglRendererOptions,
  ) => WebglGraphRenderer | null;
  /** For tests: the label layer (jsdom has no 2D canvas). */
  createLabels?: (canvas: HTMLCanvasElement) => LabelLayer | null;
  /** For tests: the layout client's options (an inline engine). */
  layoutClientOptions?: LayoutClientOptions;
  /** For tests: the position cache, or null for none. */
  positionCache?: PositionCache | null;
}

/**
 * Whether two drawn graphs have the same shape: the same nodes in the same
 * order, the same lines with the same flags, and the same focus. Only the
 * names and colours of such a graph can differ.
 */
export function sameShape(a: RenderGraph | null, b: RenderGraph): boolean {
  if (!a) return false;
  if (a.fingerprint !== b.fingerprint || a.focus !== b.focus) return false;
  const flagsA = a.linkFlags;
  const flagsB = b.linkFlags;
  if (flagsA.length !== flagsB.length) return false;
  for (let i = 0; i < flagsA.length; i++)
    if (flagsA[i] !== flagsB[i]) return false;
  return true;
}

/** The props that are the canvas's own; everything else goes on the region. */
const OWN_PROPS = {
  graph: true,
  colors: true,
  display: true,
  forces: true,
  scope: true,
  signature: true,
  globalSignature: true,
  focusId: true,
  currentId: true,
  selectedId: true,
  spotlight: true,
  label: true,
  keyHelpId: true,
  reducedMotion: true,
  onOpen: true,
  onLocalGraph: true,
  onCurrentChange: true,
  onFind: true,
  onSettled: true,
  onUnavailable: true,
  onPausedChange: true,
  renderPreview: true,
  controlRef: true,
  createRenderer: true,
  createLabels: true,
  layoutClientOptions: true,
  positionCache: true,
  className: true,
} satisfies Record<
  | Exclude<keyof GraphCanvasProps, keyof HTMLAttributes<HTMLDivElement>>
  | 'className',
  true
>;

/** The props meant for the region element, the canvas's own taken out. */
function regionProps(props: GraphCanvasProps): HTMLAttributes<HTMLDivElement> {
  const out: Record<string, unknown> = { ...props };
  for (const key of Object.keys(OWN_PROPS)) delete out[key];
  return out as HTMLAttributes<HTMLDivElement>;
}

/** A camera kept by an earlier visit, or null. */
function readSavedCamera(storage: Storage | null): Camera | null {
  try {
    const raw = storage?.getItem(GRAPH_CAMERA_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Camera> | null;
    const { x, y, zoom } = value ?? {};
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof zoom !== 'number' ||
      ![x, y, zoom].every(Number.isFinite) ||
      zoom <= 0
    ) {
      return null;
    }
    return { x, y, zoom };
  } catch {
    return null;
  }
}

const browserStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/**
 * The labels in the theme's text colour, with a halo in the page's own
 * background behind the names that sit on the white highlight lines.
 */
const defaultLabels = (canvas: HTMLCanvasElement): LabelLayer | null =>
  createLabelLayer(canvas, {
    color: GRAPH_THEME.text,
    haloColor: readGraphBackground(canvas),
  });

/**
 * The dev-only hook a browser script reads (`window.__atlasGraphDebug`).
 * The literal `import.meta.env.DEV` folds to false in a production build,
 * which drops this function, and with it the hook's name, from the bundle.
 */
const installDebugHook = import.meta.env.DEV
  ? (read: () => DebugSource) => {
      const hook: AtlasGraphDebug = {
        screenPositionOf(id) {
          return read().api.screenPositionOf(id);
        },
        get counts() {
          const { graph } = read();
          return { items: graph.count, links: graph.linkCount };
        },
        get settled() {
          return read().layout.isSettled();
        },
        camera: () => ({ ...read().scene.camera() }),
        fit: () => read().scene.fit(false),
        hover(id) {
          const { graph, scene } = read();
          scene.hover(
            id === null ? -1 : (graph.indexOf.get(id as never) ?? -1),
          );
        },
        hub() {
          const { graph } = read();
          let best = 0;
          for (let i = 1; i < graph.count; i++)
            if (graph.weights[i] > graph.weights[best]) best = i;
          return graph.count
            ? {
                id: graph.ids[best],
                label: graph.nodes[best].label,
                links: graph.weights[best],
              }
            : null;
        },
        stats() {
          const { scene, layout } = read();
          return {
            scene: scene.stats(),
            layout: layout.stats(),
            runsIn: layout.runsIn(),
            labelsShown: scene.stats().labels,
          };
        },
      };
      window.__atlasGraphDebug = hook;
      return () => {
        if (window.__atlasGraphDebug === hook) delete window.__atlasGraphDebug;
      };
    }
  : null;

interface DebugSource {
  graph: RenderGraph;
  scene: GraphScene;
  layout: LayoutHandle;
  api: GraphCanvasApi;
}

/** What a browser script finds on `window.__atlasGraphDebug` (dev only). */
export interface AtlasGraphDebug {
  /** An item's dot on the screen, in client pixels, or null. */
  screenPositionOf(id: string): Point | null;
  readonly counts: { items: number; links: number };
  readonly settled: boolean;
  camera(): Camera;
  fit(): void;
  hover(id: string | null): void;
  /** The most linked item drawn. */
  hub(): { id: string; label: string; links: number } | null;
  stats(): unknown;
}

declare global {
  interface Window {
    __atlasGraphDebug?: AtlasGraphDebug;
  }
}

export const GraphCanvas = forwardRef<HTMLDivElement, GraphCanvasProps>(
  function GraphCanvas(props, forwardedRef) {
    const {
      graph,
      colors,
      display,
      forces,
      scope,
      signature,
      globalSignature,
      focusId,
      currentId,
      selectedId,
      spotlight = null,
      label,
      keyHelpId,
      reducedMotion = false,
      renderPreview,
      controlRef,
      createRenderer = createWebglRenderer,
      createLabels = defaultLabels,
      layoutClientOptions,
      positionCache,
      className,
    } = props;
    // Anything else is for the region itself (the context menu's trigger
    // hands it its handlers this way).
    const rest = regionProps(props);
    const propsRef = useRef(props);
    propsRef.current = props;

    /**
     * How far a layout worked out out of sight has come (reduced motion), and
     * whether a picture is already drawn under the status; null when none is.
     */
    const [arranging, setArranging] = useState<{
      percent: number;
      over: boolean;
    } | null>(null);
    const arrangingRef = useRef(arranging);
    arrangingRef.current = arranging;
    const [preview, setPreview] = useState<{ index: number; at: Point } | null>(
      null,
    );
    /** The camera kept from an earlier visit, read when the global graph starts. */
    const savedCamera = useRef<Camera | null>(null);
    /** The camera as it last showed laid-out positions, and how often it moved. */
    const shownCamera = useRef<Camera | null>(null);
    const cameraVersion = useRef(0);
    /** Where `[` and `]` are stepping: whose neighbours, and which one. */
    const stepping = useRef<{
      from: number;
      list: number[];
      index: number;
    } | null>(null);
    /** The layout has started a run this settle belongs to. */
    const announceSettle = useRef(false);
    /** What the scene was last given, so a change sends only what changed. */
    const drawn = useRef<{
      graph: RenderGraph | null;
      colors: Uint8Array | null;
      flags: Uint8Array | null;
    }>({ graph: null, colors: null, flags: null });

    const setRegion = useCallback(
      (element: HTMLDivElement | null) => {
        regionRef.current = element;
        if (typeof forwardedRef === 'function') forwardedRef(element);
        else if (forwardedRef) forwardedRef.current = element;
      },
      [forwardedRef],
    );

    const layout = useLayout({
      graph,
      scope,
      signature,
      globalSignature,
      focusId,
      forces,
      // Reduced motion lays the graph out out of sight and draws it once.
      mode: reducedMotion ? 'converge' : 'animate',
      clientOptions: layoutClientOptions,
      cache: positionCache,
      restBelowFor(xy) {
        // Half a device pixel at the zoom the warm start will be shown at.
        const scene = sceneRef.current;
        const viewport = scene?.viewport() ?? { width: 0, height: 0, dpr: 1 };
        const kept =
          propsRef.current.scope === GLOBAL_SCOPE ? savedCamera.current : null;
        let zoom = kept?.zoom;
        if (zoom === undefined) {
          const bounds = boundsOf(xy, propsRef.current.graph.count);
          const box =
            viewport.width > 0
              ? viewport
              : { width: 1200, height: 800, dpr: viewport.dpr };
          zoom = bounds ? fitToBounds(bounds, box).zoom : 1;
        }
        return REST_DEVICE_PX / deviceScale(zoom, viewport.dpr);
      },
    });

    // The renderer, the labels and the scene live as long as the region
    // (`useGraphStage`, shared with Tesseract's canvas); the factories are
    // read at mount.
    const { regionRef, glRef, textRef, sceneRef, paused, unavailable } =
      useGraphStage({
        createRenderer,
        createLabels,
        positions: () => layout.positions(),
        onCamera: (camera) => {
          if (!sceneRef.current?.hasPositions()) return;
          shownCamera.current = camera;
          cameraVersion.current += 1;
        },
        onPausedChange: (on) => propsRef.current.onPausedChange?.(on),
        onUnavailable: () => propsRef.current.onUnavailable?.(),
        // The open row's dot, if a resize is what takes it off the stage
        // (the drawer opening over it), is brought back into view.
        keepInView: () => {
          const { graph: g, selectedId: open } = propsRef.current;
          return open === null ? -1 : (g.indexOf.get(open as never) ?? -1);
        },
        // A scene made again (React's strict mode does) starts from nothing.
        onSceneGone: () => {
          drawn.current = { graph: null, colors: null, flags: null };
        },
      });

    // The layout's news: positions to draw, a run started, how far a run out
    // of sight has come, a run at rest.
    useEffect(
      () =>
        layout.subscribe((event) => {
          const scene = sceneRef.current;
          if (!scene) return;
          if (event.type === 'progress') {
            // Whole percents only, and never 100 before the positions are in.
            const percent = Math.min(99, Math.floor(event.fraction * 100));
            const over = scene.hasPositions();
            const shown = arrangingRef.current;
            if (shown?.percent !== percent || shown.over !== over)
              setArranging({ percent, over });
            return;
          }
          if (arrangingRef.current) setArranging(null);
          if (event.type === 'positions') {
            scene.positionsChanged();
          } else if (event.type === 'start') {
            announceSettle.current = true;
            stepping.current = null;
            const global = propsRef.current.scope === GLOBAL_SCOPE;
            const kept = global ? savedCamera.current : null;
            if (event.warm && kept) {
              scene.setAutoFit(false);
              scene.setCamera(kept, false);
            } else {
              scene.setAutoFit(true);
            }
          } else if (event.type === 'settled') {
            if (announceSettle.current) {
              announceSettle.current = false;
              propsRef.current.onSettled?.();
            }
          }
        }),
      [layout],
    );

    // The global graph's camera is read when it starts and kept as it moves.
    useEffect(() => {
      if (scope !== GLOBAL_SCOPE) return;
      savedCamera.current = readSavedCamera(browserStorage());
      let kept = cameraVersion.current;
      // It reads the camera kept from the scene's hook rather than the scene,
      // which may already be gone when the page closes.
      const keep = () => {
        const camera = shownCamera.current;
        if (!camera || kept === cameraVersion.current) return;
        kept = cameraVersion.current;
        savedCamera.current = camera;
        try {
          browserStorage()?.setItem(GRAPH_CAMERA_KEY, JSON.stringify(camera));
        } catch {
          // Storage refused: the next visit fits the graph instead.
        }
      };
      const timer = window.setInterval(keep, CAMERA_SAVE_MS);
      return () => {
        window.clearInterval(timer);
        keep();
      };
    }, [scope]);

    // Leaving a timelapse hands the settled layout back: the dots glide
    // home from where the timelapse left them instead of jumping, and the
    // kept camera flies back with them (`TimelapseCanvas`). It must come
    // before the graph is swapped below, while the old dots are still known.
    const lastScope = useRef(scope);
    useEffect(() => {
      const was = lastScope.current;
      lastScope.current = scope;
      if (was !== scope && isTimelapseScope(was) && !isTimelapseScope(scope))
        sceneRef.current?.glideNext(TIMELAPSE_RESTORE_MS);
    }, [scope]);

    // What to draw. A new graph goes over whole; new colours alone are cheap.
    const radii = useMemo(() => nodeRadii(graph), [graph]);
    const index = useCallback(
      (id: string | null) =>
        id === null ? -1 : (graph.indexOf.get(id as never) ?? -1),
      [graph],
    );
    const flags = useMemo(() => {
      const out = new Uint8Array(graph.count);
      for (let i = 0; i < graph.count; i++) {
        out[i] = graph.flags[i] & NODE_FOCUS ? NODE_FLAG_RING : 0;
      }
      for (const i of [index(currentId), index(selectedId)]) {
        if (i >= 0) out[i] = NODE_FLAG_RING;
      }
      return out;
    }, [graph, index, currentId, selectedId]);

    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      const last = drawn.current;
      if (last.graph !== graph && !sameShape(last.graph, graph)) {
        scene.setGraph(graph, radii, colors, flags);
        setPreview(null);
      } else {
        // The same nodes and lines in a new graph object (the working copy
        // replacing the repo's, a save that changed only fields): the
        // names may differ, nothing else does, and a hover stays lit.
        if (last.graph !== graph) scene.replaceGraph(graph);
        if (last.colors !== colors) scene.setColors(colors);
        if (last.flags !== flags) scene.setFlags(flags);
      }
      drawn.current = { graph, colors, flags };
    }, [graph, radii, colors, flags]);

    useEffect(() => {
      sceneRef.current?.setPinnedLabels(
        [index(currentId), index(selectedId), graph.focus].filter(
          (i) => i >= 0,
        ),
      );
    }, [graph, index, currentId, selectedId]);

    useEffect(() => {
      sceneRef.current?.setStyle({
        nodeSize: display.nodeSize,
        lineSize: display.lineSize,
        arrows: display.arrows,
        confidence: display.confidence,
        textFade: display.textFade,
      });
    }, [
      display.nodeSize,
      display.lineSize,
      display.arrows,
      display.confidence,
      display.textFade,
    ]);

    useEffect(() => {
      sceneRef.current?.setSpotlight(spotlight);
    }, [spotlight]);

    useEffect(() => {
      sceneRef.current?.setReducedMotion(reducedMotion);
    }, [reducedMotion]);

    const api = useMemo<GraphCanvasApi>(
      () => ({
        fit: () => sceneRef.current?.fit(true),
        resetZoom() {
          const scene = sceneRef.current;
          if (!scene) return;
          const dpr = scene.viewport().dpr ?? 1;
          scene.setCamera(
            { ...scene.camera(), zoom: clampZoom(1 / dpr, dpr) },
            true,
          );
        },
        zoomBy(factor) {
          sceneRef.current?.zoomToward(factor, null);
        },
        flyTo(id) {
          const scene = sceneRef.current;
          const i = propsRef.current.graph.indexOf.get(id as never);
          return scene && i !== undefined ? scene.flyTo(i) : false;
        },
        focus: () => regionRef.current?.focus({ preventScroll: true }),
        hitTest(clientX, clientY) {
          const scene = sceneRef.current;
          const region = regionRef.current;
          if (!scene || !region) return null;
          const rect = region.getBoundingClientRect();
          const i = scene.hitTest(clientX - rect.left, clientY - rect.top);
          return i >= 0 ? propsRef.current.graph.ids[i] : null;
        },
        screenPositionOf(id) {
          const scene = sceneRef.current;
          const region = regionRef.current;
          const i = propsRef.current.graph.indexOf.get(id as never);
          if (!scene || !region || i === undefined) return null;
          const at = scene.screenOf(i);
          if (!at) return null;
          const rect = region.getBoundingClientRect();
          return { x: rect.left + at.x, y: rect.top + at.y };
        },
      }),
      [],
    );
    useImperativeHandle(controlRef, () => api, [api]);

    useEffect(() => {
      if (!installDebugHook) return;
      return installDebugHook(() => ({
        graph: propsRef.current.graph,
        scene: sceneRef.current as GraphScene,
        layout,
        api,
      }));
    }, [layout, api]);

    // The keyboard's current item, as a node number in this graph.
    const currentIndex = () => {
      const id = propsRef.current.currentId;
      return id === null
        ? -1
        : (propsRef.current.graph.indexOf.get(id as never) ?? -1);
    };

    /** Make a node current, and bring it into view when it is off screen. */
    const makeCurrent = (i: number, step?: NeighbourStep) => {
      const { graph: g, onCurrentChange } = propsRef.current;
      const scene = sceneRef.current;
      onCurrentChange(g.ids[i], step);
      const at = scene?.screenOf(i);
      const view = scene?.viewport();
      if (
        scene &&
        view &&
        at &&
        (at.x < 24 ||
          at.y < 24 ||
          at.x > view.width - 24 ||
          at.y > view.height - 24)
      ) {
        const camera = scene.camera();
        const xy = layout.positions();
        if (xy)
          scene.setCamera({ ...camera, x: xy[2 * i], y: xy[2 * i + 1] }, true);
      }
    };

    const host: InteractionHost = {
      camera: () => sceneRef.current?.camera() ?? { x: 0, y: 0, zoom: 1 },
      viewport: () =>
        sceneRef.current?.viewport() ?? { width: 0, height: 0, dpr: 1 },
      hitTest: (x, y) => sceneRef.current?.hitTest(x, y) ?? -1,
      setCamera: (camera, byUser) =>
        sceneRef.current?.setCamera(camera, byUser),
      zoom: (factor, at) => sceneRef.current?.zoomToward(factor, at),
      hover(i, at, wantsPreview) {
        const scene = sceneRef.current;
        if (!scene) return;
        scene.hover(i);
        const region = regionRef.current;
        if (region) region.style.cursor = i >= 0 ? 'pointer' : '';
        setPreview((shown) => {
          if (i < 0 || !wantsPreview || !at) return shown ? null : shown;
          if (
            shown &&
            shown.index === i &&
            shown.at.x === at.x &&
            shown.at.y === at.y
          )
            return shown;
          return { index: i, at };
        });
      },
      pin(i, x, y) {
        // A drag takes the camera over: the graph stops fitting itself.
        sceneRef.current?.setAutoFit(false);
        layout.pin(i, x, y);
      },
      unpin: (i) => layout.unpin(i),
      open(i, keys) {
        const { graph: g, onOpen } = propsRef.current;
        if (i >= 0 && i < g.count) onOpen(g.ids[i], keys);
      },
      fling: (velocity) => sceneRef.current?.fling(velocity),
      stopMotion: () => sceneRef.current?.stopMotion(),
      fit: () => sceneRef.current?.fit(true),
      find: () => propsRef.current.onFind(),
      current: currentIndex,
      step(direction) {
        const g = propsRef.current.graph;
        if (g.count === 0) return;
        const cur = currentIndex();
        if (cur < 0) {
          // Nothing current yet: start at the focus, or the biggest hub.
          let start = g.focus;
          if (start < 0) {
            start = 0;
            for (let i = 1; i < g.count; i++)
              if (g.weights[i] > g.weights[start]) start = i;
          }
          stepping.current = null;
          makeCurrent(start);
          return;
        }
        let at = stepping.current;
        if (!at || at.list[at.index] !== cur) {
          const list = [...neighboursOf(g, cur)].sort(
            (a, b) =>
              g.weights[b] - g.weights[a] ||
              g.nodes[a].label.localeCompare(g.nodes[b].label),
          );
          if (list.length === 0) {
            makeCurrent(cur);
            return;
          }
          at = {
            from: cur,
            list,
            index: direction > 0 ? 0 : list.length - 1,
          };
        } else {
          at = {
            ...at,
            index: (at.index + direction + at.list.length) % at.list.length,
          };
        }
        stepping.current = at;
        makeCurrent(at.list[at.index], {
          index: at.index + 1,
          of: at.list.length,
          from: g.nodes[at.from].label,
        });
      },
      openCurrent() {
        const i = currentIndex();
        const { graph: g, onOpen } = propsRef.current;
        if (i >= 0) onOpen(g.ids[i]);
      },
      localCurrent() {
        const i = currentIndex();
        const { graph: g, onLocalGraph } = propsRef.current;
        if (i >= 0) onLocalGraph(g.ids[i]);
      },
      clear() {
        stepping.current = null;
        sceneRef.current?.hover(-1);
        setPreview(null);
        if (propsRef.current.currentId !== null)
          propsRef.current.onCurrentChange(null);
      },
      reducedMotion: () => propsRef.current.reducedMotion ?? false,
    };
    useGraphInteraction(regionRef, host);

    const bounds = sceneRef.current?.viewport() ?? { width: 0, height: 0 };
    const previewId =
      preview && preview.index < graph.count ? graph.ids[preview.index] : null;

    return (
      <div
        ref={setRegion}
        role="application"
        aria-roledescription="graph"
        aria-label={label}
        aria-describedby={keyHelpId}
        tabIndex={0}
        data-graph-canvas=""
        className={cn(
          'absolute inset-0 touch-none select-none overflow-hidden outline-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25',
          className,
        )}
        {...rest}
      >
        <canvas
          ref={glRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 block size-full"
        />
        <canvas
          ref={textRef}
          aria-hidden
          // Names with no dots under them would read as a broken graph.
          className={cn(
            'pointer-events-none absolute left-0 top-0',
            paused && 'invisible',
          )}
        />
        {previewId && preview && renderPreview
          ? renderPreview(previewId, preview.at, bounds)
          : null}
        {arranging && !paused ? (
          <div
            role="progressbar"
            aria-label="Arranging the graph"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={arranging.percent}
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full border border-border bg-popover px-3 py-1 text-xs tabular-nums text-foreground',
              // Over a drawn graph it keeps to the bottom edge; on an empty
              // stage it is the only thing there, so it sits in the middle.
              arranging.over ? 'bottom-3' : 'top-1/2 -translate-y-1/2',
            )}
          >
            Arranging… {arranging.percent}%
          </div>
        ) : null}
        {paused ? (
          <p
            role="status"
            className="absolute left-1/2 top-3 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-2xl border border-border bg-popover px-3 py-1 text-center text-xs text-foreground"
          >
            Graph paused: the browser took away its drawing surface. It usually
            comes back by itself in a moment; the List view shows the same
            connections meanwhile.
          </p>
        ) : null}
        {unavailable ? (
          <p className="absolute inset-x-6 top-6 text-sm text-muted-foreground">
            This browser cannot draw the graph: WebGL2 is turned off or not
            working. The List view shows the same items and connections.
          </p>
        ) : null}
      </div>
    );
  },
);
