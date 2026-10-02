import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import {
  createGraphScene,
  type GraphScene,
  type GraphSceneOptions,
} from './graphScene';
import type { Camera } from './model/camera';
import type { LabelLayer } from './render/labelLayer';
import type {
  WebglGraphRenderer,
  WebglRendererOptions,
} from './render/webglRenderer';

/**
 * The stage a WebGL graph is drawn on, shared by Cortex's canvas
 * (`GraphCanvas`, positions from the force layout) and Tesseract's
 * (`tesseract/TesseractCanvas`, positions from a tidy tree).
 *
 * It makes, once for the region's life:
 *
 * - the WebGL2 renderer on the region's first canvas, so nothing a page
 *   does later (a row opening beside it, a new graph to draw) rebuilds it;
 * - the label layer on the second canvas, laid over it;
 * - the scene (`graphScene.ts`) that draws them both, reading positions
 *   from whoever owns them (`positions`);
 *
 * and it keeps the scene the size of the region as the region resizes. When
 * a resize pushes the node the page names (`keepInView`, the open row's
 * dot) off the stage, the camera pans just far enough to bring it back.
 *
 * What goes wrong is reported, not thrown: a browser with no WebGL2 (or a
 * GPU that refuses the renderer) makes `unavailable` true and calls
 * `onUnavailable`, so the page can show its list instead; a context the
 * browser takes away makes `paused` true until it comes back, when the
 * scene draws a frame at once.
 *
 * The page renders the region and the two canvases itself, with the refs
 * this hands back, and builds its own pointer and keys on `regionRef`
 * (`useGraphInteraction`). Everything passed in is read when it is needed,
 * so a page may hand in new callbacks on every render; the factories and
 * the scene's rules are read once, when the stage is made.
 */

export interface GraphStageOptions {
  /** Make the renderer, or null where it cannot be made (no WebGL2). */
  createRenderer(
    canvas: HTMLCanvasElement,
    options: WebglRendererOptions,
  ): WebglGraphRenderer | null;
  /** Make the label layer, or null for none (jsdom has no 2D canvas). */
  createLabels(canvas: HTMLCanvasElement): LabelLayer | null;
  /** The latest positions to draw, or null before there are any. */
  positions(): Float32Array | null;
  /** The camera moved; `byUser` when a gesture or key moved it. */
  onCamera?(camera: Camera, byUser: boolean): void;
  /** The context was lost (true) or is back (false). */
  onPausedChange?(paused: boolean): void;
  /** This browser cannot draw the graph. */
  onUnavailable?(): void;
  /**
   * The node a resize should keep on the stage (the open row's), or -1 for
   * none. Asked on every resize.
   */
  keepInView?(): number;
  /** The scene was taken down (the region left, or strict mode remounted it). */
  onSceneGone?(): void;
  /** What a hover lights (`graphScene.ts`); the neighbours by default. */
  markHover?: GraphSceneOptions['markHover'];
  /** How labels are placed and sized; Obsidian's rules by default. */
  labelRules?: GraphSceneOptions['labelRules'];
}

export interface GraphStage {
  /** The focusable region the canvases sit in. */
  regionRef: MutableRefObject<HTMLDivElement | null>;
  /** The WebGL canvas. */
  glRef: MutableRefObject<HTMLCanvasElement | null>;
  /** The labels' canvas. */
  textRef: MutableRefObject<HTMLCanvasElement | null>;
  /** The scene, once made; null before, after, and without WebGL2. */
  sceneRef: MutableRefObject<GraphScene | null>;
  /** The browser took the context away; drawing waits for it. */
  paused: boolean;
  /** No renderer could be made here. */
  unavailable: boolean;
}

export function useGraphStage(options: GraphStageOptions): GraphStage {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const regionRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GraphScene | null>(null);
  const [paused, setPaused] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // The renderer, the labels and the scene live as long as the region.
  useEffect(() => {
    const region = regionRef.current;
    const canvas = glRef.current;
    const textCanvas = textRef.current;
    if (!region || !canvas) return;
    const made = optionsRef.current;
    const renderer = made.createRenderer(canvas, {
      onContextLost: () => {
        setPaused(true);
        optionsRef.current.onPausedChange?.(true);
      },
      onContextRestored: () => {
        setPaused(false);
        optionsRef.current.onPausedChange?.(false);
        sceneRef.current?.positionsChanged();
      },
    });
    if (!renderer) {
      setUnavailable(true);
      optionsRef.current.onUnavailable?.();
      return;
    }
    const labels = textCanvas ? made.createLabels(textCanvas) : null;
    const scene = createGraphScene({
      renderer,
      labels,
      hooks: {
        positions: () => optionsRef.current.positions(),
        onCamera: (camera, byUser) =>
          optionsRef.current.onCamera?.(camera, byUser),
      },
      ...(made.markHover ? { markHover: made.markHover } : {}),
      ...(made.labelRules ? { labelRules: made.labelRules } : {}),
    });
    sceneRef.current = scene;
    // Labels wait for Glacial Indifference; draw them once it is here.
    void labels?.ready.then(() => scene.positionsChanged());

    const measure = () => {
      const rect = region.getBoundingClientRect();
      // The kept node, if this resize is what takes it off the stage (the
      // drawer opening over it), is brought back into view.
      const i = optionsRef.current.keepInView?.() ?? -1;
      const before = i >= 0 ? scene.screenOf(i) : null;
      const was = scene.viewport();
      const shown =
        !!before &&
        before.x >= 0 &&
        before.y >= 0 &&
        before.x <= was.width &&
        before.y <= was.height;
      scene.resize(rect.width, rect.height, window.devicePixelRatio || 1);
      const after = shown ? scene.screenOf(i) : null;
      const now = scene.viewport();
      if (
        after &&
        (after.x < 0 ||
          after.y < 0 ||
          after.x > now.width ||
          after.y > now.height)
      )
        scene.reveal(i);
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(region);
    return () => {
      observer?.disconnect();
      scene.destroy();
      labels?.destroy();
      renderer.destroy();
      sceneRef.current = null;
      // A scene made again (React's strict mode does) starts from nothing.
      optionsRef.current.onSceneGone?.();
    };
  }, []);

  return { regionRef, glRef, textRef, sceneRef, paused, unavailable };
}
