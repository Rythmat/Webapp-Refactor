import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/components/utilities';
import {
  CHORD_NOTATION_OPTIONS,
  type ChordNotation,
} from '@/lib/chordNotation';
import { consoleTabClass, CONSOLE_LABEL } from '../../../ui/styles';
import {
  GraphLiveRegion,
  type GraphLiveRegionHandle,
} from '../map/GraphLiveRegion';
import type {
  GraphScene,
  SceneGraph,
  SceneLabelRules,
  SceneStats,
} from '../map/graphScene';
import type { Camera, Point } from '../map/model/camera';
import { NODE_FLAG_RING } from '../map/render/GraphRenderer';
import { GRAPH_THEME, readGraphBackground } from '../map/render/graphTheme';
import { createLabelLayer, type LabelLayer } from '../map/render/labelLayer';
import {
  createWebglRenderer,
  type WebglGraphRenderer,
  type WebglRendererOptions,
} from '../map/render/webglRenderer';
import {
  type InteractionHost,
  useGraphInteraction,
} from '../map/useGraphInteraction';
import { useGraphStage } from '../map/useGraphStage';
import { TesseractContextMenu } from './TesseractContextMenu';
import { findInTesseract, type FindHit } from './tesseractFind';
import {
  type ForestLayout,
  layoutForest,
  openAll,
  openBranch,
  openPathTo,
  openToDepth,
} from './tesseractLayout';
import { type OpenSpec, sameOpenSpec } from './tesseractLinks';
import {
  buildTesseractModel,
  parentOpening,
  pathTo,
  readProgressionRows,
  type TesseractModel,
} from './tesseractModel';
import {
  chordCss,
  chordNamer,
  DEFAULT_KEY,
  DEFAULT_NOTATION,
  keyColor,
  keyLabel,
  keyPc,
  TESSERACT_KEYS,
} from './tesseractNaming';
import { encodeOpen, resolveOpen } from './tesseractOpenState';
import {
  buildTesseractDrawing,
  markRootPath,
  nodeLabel,
  type TesseractDrawing,
  type TesseractSceneGraph,
} from './tesseractScene';
import {
  announceNode,
  filterOptions,
  isFiltering,
  matchingOpenings,
  maskFor,
  NO_FILTERS,
  pinnedCamera,
  stepIn,
  storyOf,
  type TesseractFilters,
  type TreeStep,
} from './tesseractView';

/**
 * Tesseract's map: every chord progression as a branch of one tree per
 * starting chord, drawn left to right on the same WebGL stage as Cortex
 * (`map/useGraphStage.ts`), with the positions from the tidy forest
 * (`tesseractLayout.ts`) instead of a force layout.
 *
 * Above the map:
 *
 * - the key picker, twelve chips in Prism's key colours round the circle
 *   of fifths; the picked key names and colours every chord;
 * - the notation switch: Jazz letter names by default, Hybrid degrees or
 *   Roman numerals;
 * - how much is open: to depth 1, 2 or 3, everything, or nothing;
 * - Find, by chords in any notation or a song's title;
 * - filters by vibe, style, complexity and whether songs are linked;
 * - Map or List.
 *
 * On the map:
 *
 * - a click on a node with next chords opens or folds it, and the forest
 *   is laid out again with that node held still on screen while the rest
 *   glide (no glide under reduced motion); Alt-click opens everything
 *   below it;
 * - a click on a node where a progression ends and nothing follows opens
 *   that progression's row (`onOpenRow`); Cmd-click opens the row of any
 *   node where one ends;
 * - the right-click menu (`TesseractContextMenu`) opens a row, shows a
 *   progression in Cortex (`onShowInCortex`), opens or folds a branch, and
 *   starts a new progression from an opening (`onNewFromHere`);
 * - hovering lights the way back to the starting chord and shows a card
 *   with the opening named in the key, its degrees and what lies below;
 * - a node where a progression ends is drawn as a ring with a dot inside;
 *   a folded node's label carries how many progressions it holds;
 * - the keys: the arrows walk the trees (Left to the parent, Right into
 *   the first next chord, opening it, Up and Down along the siblings),
 *   Enter opens the row or folds and unfolds, `/` goes to Find, Escape
 *   lets go; what the keys reach is announced in the live region.
 *
 * Where the browser cannot draw (no WebGL2) the List shows the same forest
 * as an indented list with the same controls.
 *
 * The component holds its own view state (key, notation, what is open,
 * the list, Find, filters), and follows what the page hands it: the page
 * keeps the key, the notation, the list and what is open in the URL
 * (`keyName`, `notation`, `list` and `openSpec`, each with its `on…Change`;
 * the map follows a new value, as Back brings, and reports the reader's
 * changes), and draws the row beside the map (`selectedProgressionId`,
 * `onOpenRow`).
 *
 * A progression the page asks to see (`revealProgressionId`, a dot clicked
 * in Cortex) has its way opened before the first layout, so the map opens
 * with its branch showing; once the forest is drawn and framed, the camera
 * flies to it.
 */

/** How long the dots glide when the forest is laid out again. */
export const TESSERACT_GLIDE_MS = 420;

/** How many Find results the list under the field shows. */
const FIND_LIMIT = 12;

export interface TesseractMapProps {
  /** The working copy's progression rows (`snapshot.progressions`). */
  rows: readonly unknown[] | undefined;
  /**
   * The model already built from `rows`, when the page has one (it reads
   * the duplicate pairs from it too); built here otherwise.
   */
  model?: TesseractModel;
  /** A linked song's title, for the hover card and Find. */
  songTitle?: (songId: string) => string | undefined;
  /**
   * A progression's row was asked for: the one clicked, and every
   * progression ending on the same node (a duplicate pair ends on one).
   */
  onOpenRow(progressionId: number, endingHere: readonly number[]): void;
  /** The progression whose row is open beside the map: its node is ringed. */
  selectedProgressionId?: number | null;
  /**
   * A progression to bring into view: its branch opens and the camera
   * flies to it. Read when it changes.
   */
  revealProgressionId?: number | null;
  /**
   * The key chords are named and coloured in (the URL's `?key=`); C by
   * default. The map follows it when it changes.
   */
  keyName?: string;
  onKeyChange?(key: string): void;
  /** The notation chords are named in; Jazz by default. Followed likewise. */
  notation?: ChordNotation;
  onNotationChange?(notation: ChordNotation): void;
  /** The list shows instead of the map (the URL's `?list=1`). */
  list?: boolean;
  onListChange?(list: boolean): void;
  /**
   * What is open (the URL's `depth`, `open` and `fold`), read at first and
   * followed when it changes to something the map did not report. Left
   * out, the map opens `defaultDepth` deep.
   */
  openSpec?: OpenSpec | null;
  /**
   * What is open changed (the reader opened or folded, or the rows did):
   * its shortest description, for the URL.
   */
  onOpenChange?(spec: OpenSpec): void;
  /** How many chords deep to open at first without `openSpec`; two by default. */
  defaultDepth?: number;
  /** Show in Cortex, from the right-click menu on a progression. */
  onShowInCortex?(progressionId: number): void;
  /** New progression from here, from the right-click menu: the opening's chords. */
  onNewFromHere?(chords: string[]): void;
  /** `prefers-reduced-motion: reduce`: no glides or flights. */
  reducedMotion?: boolean;
  /** The renderer and label factories; tests hand in fakes. */
  createRenderer?: (
    canvas: HTMLCanvasElement,
    options: WebglRendererOptions,
  ) => WebglGraphRenderer | null;
  createLabels?: (canvas: HTMLCanvasElement) => LabelLayer | null;
  className?: string;
}

const defaultLabels = (canvas: HTMLCanvasElement): LabelLayer | null =>
  createLabelLayer(canvas, {
    color: GRAPH_THEME.text,
    haloColor: readGraphBackground(canvas),
  });

/**
 * Labels to the right of their dots, all one size, which grows with the
 * zoom between 10 and 18 CSS pixels, fading in between zoom 0.35 and 0.55
 * (the text fade slider shifts both).
 */
export const TESSERACT_LABEL_RULES: SceneLabelRules = {
  placement: 'right',
  size: (zoom) => Math.max(10, Math.min(18, 13 * Math.sqrt(zoom))),
  alpha(zoom, _dpr, textFade) {
    const shift = 2 ** (-textFade / 2);
    const from = 0.35 * shift;
    const to = 0.55 * shift;
    return Math.max(0, Math.min(1, (zoom - from) / (to - from)));
  },
};

const markHover = (graph: SceneGraph, index: number, state: Uint8Array) =>
  markRootPath((graph as TesseractSceneGraph).parents, index, state);

/** Two sets with the same members. */
const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((v) => b.has(v));

const ARROWS: Readonly<Record<string, TreeStep>> = {
  ArrowLeft: 'parent',
  ArrowRight: 'child',
  ArrowUp: 'previous',
  ArrowDown: 'next',
};

/** What a browser script finds on `window.__tesseractDebug` (dev only). */
export interface TesseractDebug {
  /** How many openings are drawn. */
  readonly count: number;
  /** The forest showing has been drawn at its positions. */
  readonly drawn: boolean;
  /** An opening's dot on the screen, in client pixels, or null. */
  screenPositionOf(id: string): Point | null;
  /** The opening a progression ends on, or null. */
  endOf(progressionId: number): string | null;
  camera(): Camera;
  stats(): SceneStats;
}

declare global {
  interface Window {
    __tesseractDebug?: TesseractDebug;
  }
}

interface DebugSource {
  scene: GraphScene | null;
  layout: ForestLayout;
  model: TesseractModel;
  region: HTMLElement | null;
}

/**
 * The dev-only hook a browser script reads (`window.__tesseractDebug`), as
 * Cortex has its own. The literal `import.meta.env.DEV` folds to false in a
 * production build, which drops this function, and the hook's name with it.
 */
const installDebugHook = import.meta.env.DEV
  ? (read: () => DebugSource) => {
      const hook: TesseractDebug = {
        get count() {
          return read().layout.ids.length;
        },
        get drawn() {
          return read().scene?.hasPositions() ?? false;
        },
        screenPositionOf(id) {
          const { scene, layout, region } = read();
          const i = layout.indexOf.get(id);
          const at = i === undefined ? null : (scene?.screenOf(i) ?? null);
          if (!at || !region) return null;
          const rect = region.getBoundingClientRect();
          return { x: rect.left + at.x, y: rect.top + at.y };
        },
        endOf: (progressionId) =>
          read().model.forest.endNodeOf.get(progressionId) ?? null,
        camera: () => ({
          ...(read().scene?.camera() ?? { x: 0, y: 0, zoom: 1 }),
        }),
        stats: () =>
          read().scene?.stats() ?? {
            frames: 0,
            firstFrameAt: null,
            lastFrameMs: 0,
            labels: 0,
          },
      };
      window.__tesseractDebug = hook;
      return () => {
        if (window.__tesseractDebug === hook) delete window.__tesseractDebug;
      };
    }
  : null;

/** What to do with the camera once the next layout is drawn. */
type CameraAfter =
  | { kind: 'keep'; id: string }
  | { kind: 'reveal'; id: string };

export function TesseractMap(props: TesseractMapProps) {
  const {
    rows,
    songTitle,
    selectedProgressionId = null,
    revealProgressionId = null,
    keyName: keyProp = DEFAULT_KEY,
    notation: notationProp = DEFAULT_NOTATION,
    list: listProp = false,
    openSpec = null,
    reducedMotion = false,
    createRenderer = createWebglRenderer,
    createLabels = defaultLabels,
    className,
  } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const given = props.model;
  const model = useMemo(
    () => given ?? buildTesseractModel(readProgressionRows(rows)),
    [given, rows],
  );

  // The progression asked for as the map opens: the way to it is opened
  // before the first layout, and the camera flies to it once the forest is
  // drawn (`arrival`). `revealed` is the last progression brought into view.
  const revealed = useRef<number | null>(null);
  const arrival = useRef<string | null>(null);
  /** What opens first: the URL's, or `defaultDepth`, and the way to the arrival. */
  const firstOpen = useCallback((m: TesseractModel): Set<string> => {
    const {
      openSpec: spec = null,
      defaultDepth: depth = 2,
      revealProgressionId: reveal = null,
    } = propsRef.current;
    let next = spec ? resolveOpen(m, spec) : openToDepth(m, depth);
    const target = reveal === null ? undefined : m.forest.endNodeOf.get(reveal);
    if (target) {
      next = openPathTo(m, next, target);
      revealed.current = reveal;
      arrival.current = target;
    }
    return next;
  }, []);

  const [keyName, setKeyName] = useState(keyProp);
  const [notation, setNotation] = useState<ChordNotation>(notationProp);
  const [listShown, setListShown] = useState(listProp);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => firstOpen(model));
  const [currentId, setCurrentId] = useState<string | null>(
    () => arrival.current,
  );
  const [card, setCard] = useState<{ index: number; at: Point } | null>(null);
  const [findText, setFindText] = useState('');
  const [filters, setFilters] = useState<TesseractFilters>(NO_FILTERS);

  // The page's key, notation and list, followed when they change (Back to
  // an entry in another key); the reader's own picks come back the same.
  useEffect(() => setKeyName(keyProp), [keyProp]);
  useEffect(() => setNotation(notationProp), [notationProp]);
  useEffect(() => setListShown(listProp), [listProp]);

  const pc = keyPc(keyName);
  const name = useMemo(() => chordNamer(notation, pc), [notation, pc]);
  const layout = useMemo(() => layoutForest(model, open), [model, open]);
  const drawing = useMemo(
    () => buildTesseractDrawing(model, layout, pc, notation),
    [model, layout, pc, notation],
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const modelRef = useRef(model);
  modelRef.current = model;
  const openRef = useRef(open);
  openRef.current = open;
  const cameraAfter = useRef<CameraAfter | null>(null);
  const liveRef = useRef<GraphLiveRegionHandle | null>(null);
  const findRef = useRef<HTMLInputElement | null>(null);
  const helpId = useId();

  // Rows that arrive after the first render (the working copy loading)
  // open as the first render would have: the URL's view, and the way to a
  // progression asked for.
  const seeded = useRef(model.forest.nodes.size > 0);
  useEffect(() => {
    if (seeded.current || model.forest.nodes.size === 0) return;
    seeded.current = true;
    const next = firstOpen(model);
    openRef.current = next;
    setOpen(next);
    if (arrival.current) setCurrentId(arrival.current);
  }, [model, firstOpen]);

  const selectedNode =
    selectedProgressionId === null
      ? null
      : (model.forest.endNodeOf.get(selectedProgressionId) ?? null);

  const flags = useMemo(() => {
    const out = drawing.endFlags.slice();
    for (const id of [currentId, selectedNode]) {
      const i = id === null ? undefined : layout.indexOf.get(id);
      if (i !== undefined) out[i] |= NODE_FLAG_RING;
    }
    return out;
  }, [drawing, layout, currentId, selectedNode]);

  const hits = useMemo<FindHit[]>(
    () =>
      findText.trim()
        ? findInTesseract(model, findText, pc, songTitle, FIND_LIMIT)
        : [],
    [model, findText, pc, songTitle],
  );
  const spotlight = useMemo(() => {
    if (hits.length > 0) {
      const kept = new Set<string>();
      for (const hit of hits)
        for (const id of pathTo(model, hit.id)) kept.add(id);
      return maskFor(layout, kept);
    }
    return isFiltering(filters)
      ? maskFor(layout, matchingOpenings(model, filters))
      : null;
  }, [hits, filters, model, layout]);
  const options = useMemo(() => filterOptions(model), [model]);

  /** What the scene was last given, so a change sends only what changed. */
  const drawn = useRef<{
    layout: ForestLayout | null;
    drawing: TesseractDrawing | null;
    flags: Uint8Array | null;
  }>({ layout: null, drawing: null, flags: null });

  const { regionRef, glRef, textRef, sceneRef, paused, unavailable } =
    useGraphStage({
      createRenderer,
      createLabels,
      positions: () => layoutRef.current.xy,
      markHover,
      labelRules: TESSERACT_LABEL_RULES,
      keepInView: () => {
        const id = selectedNode;
        return id === null ? -1 : (layoutRef.current.indexOf.get(id) ?? -1);
      },
      onSceneGone: () => {
        drawn.current = { layout: null, drawing: null, flags: null };
      },
    });

  // A flight that waits for the forest to be drawn (and framed) first: the
  // scene takes new positions on its next frame, and only then can it fly.
  const pendingFlight = useRef(0);
  const flyOnceDrawn = useCallback(
    (id: string) => {
      cancelAnimationFrame(pendingFlight.current);
      let frames = 0;
      const step = () => {
        const scene = sceneRef.current;
        if (!scene) return;
        if (!scene.hasPositions()) {
          if (++frames < 120)
            pendingFlight.current = requestAnimationFrame(step);
          return;
        }
        const i = layoutRef.current.indexOf.get(id);
        // The arrival is done once its flight is under way, not before: a
        // scene made again (React's strict mode remounts it) flies anew.
        if (i !== undefined && scene.flyTo(i) && arrival.current === id)
          arrival.current = null;
      };
      pendingFlight.current = requestAnimationFrame(step);
    },
    [sceneRef],
  );
  useEffect(() => () => cancelAnimationFrame(pendingFlight.current), []);

  useEffect(
    () =>
      installDebugHook?.(() => ({
        scene: sceneRef.current,
        layout: layoutRef.current,
        model: modelRef.current,
        region: regionRef.current,
      })),
    [sceneRef, regionRef],
  );

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const last = drawn.current;
    if (last.layout !== layout) {
      const after = cameraAfter.current;
      cameraAfter.current = null;
      // Nodes that were drawn glide to their new places; a node newly shown
      // grows out of the nearest drawn node above it.
      const glides = !!last.layout && scene.hasPositions();
      if (glides) scene.glideNext(TESSERACT_GLIDE_MS, parentOpening);
      scene.setGraph(drawing.graph, drawing.radii, drawing.colors, flags);
      scene.positionsChanged();
      setCard(null);
      if (after?.kind === 'keep' && last.layout) {
        scene.setCamera(
          pinnedCamera(scene.camera(), last.layout, layout, after.id),
          false,
        );
      } else if (after?.kind === 'reveal') {
        const i = layout.indexOf.get(after.id);
        if (i !== undefined && glides) {
          // Set while the dots glide, the camera flies along with them.
          const dpr = scene.viewport().dpr || 1;
          scene.setAutoFit(false);
          scene.setCamera(
            {
              x: layout.xy[2 * i],
              y: layout.xy[2 * i + 1],
              zoom: Math.max(scene.camera().zoom, 1 / dpr),
            },
            false,
          );
        } else if (i !== undefined) {
          flyOnceDrawn(after.id);
        }
      }
      // The progression the map opened on: the forest is framed on its first
      // frame, then the camera flies from there to it.
      const landing = arrival.current;
      if (landing !== null && layout.indexOf.has(landing))
        flyOnceDrawn(landing);
    } else {
      if (last.drawing !== drawing) {
        // A new key or notation: the same nodes, new names and colours.
        scene.replaceGraph(drawing.graph);
        scene.setColors(drawing.colors);
      }
      if (last.flags !== flags) scene.setFlags(flags);
    }
    drawn.current = { layout, drawing, flags };
  }, [layout, drawing, flags, sceneRef, flyOnceDrawn]);

  useEffect(() => {
    sceneRef.current?.setSpotlight(spotlight);
  }, [spotlight, sceneRef, layout]);

  useEffect(() => {
    const indices = [currentId, selectedNode]
      .map((id) => (id === null ? -1 : (layout.indexOf.get(id) ?? -1)))
      .filter((i) => i >= 0);
    sceneRef.current?.setPinnedLabels(indices);
  }, [layout, currentId, selectedNode, sceneRef]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, sceneRef]);

  const announce = useCallback(
    (text: string) => liveRef.current?.announce(text),
    [],
  );

  /** Change what is open; `after` places the camera once it is drawn. */
  const changeOpen = useCallback(
    (next: ReadonlySet<string>, after: CameraAfter | null) => {
      const scene = sceneRef.current;
      if (sameSet(next, openRef.current)) return false;
      if (scene) scene.setAutoFit(after === null);
      cameraAfter.current = after;
      openRef.current = next;
      setOpen(next);
      return true;
    },
    [sceneRef],
  );

  /** Open or fold one node, holding it still. */
  const toggle = useCallback(
    (id: string, all = false) => {
      const m = modelRef.current;
      const node = m.forest.nodes.get(id);
      if (!node || node.childIds.length === 0) return;
      const was = openRef.current;
      const next = all
        ? openBranch(m, was, id)
        : was.has(id)
          ? new Set([...was].filter((at) => at !== id))
          : new Set([...was, id]);
      changeOpen(next, { kind: 'keep', id });
      const opened = next.has(id);
      announce(
        `${opened ? 'Opened' : 'Folded'} ${name(node.chord)}: ${node.childIds.length} next ${node.childIds.length === 1 ? 'chord' : 'chords'}, ${node.countBelow} ${node.countBelow === 1 ? 'progression' : 'progressions'}`,
      );
    },
    [changeOpen, name, announce],
  );

  /** Open the way to a node and fly to it. */
  const reveal = useCallback(
    (id: string) => {
      const m = modelRef.current;
      if (!m.forest.nodes.has(id)) return;
      const next = openPathTo(m, openRef.current, id);
      setCurrentId(id);
      if (!changeOpen(next, { kind: 'reveal', id })) {
        const i = layoutRef.current.indexOf.get(id);
        if (i !== undefined) sceneRef.current?.flyTo(i);
      }
    },
    [changeOpen, sceneRef],
  );

  const openRow = useCallback((id: string) => {
    const node = modelRef.current.forest.nodes.get(id);
    if (!node || node.endIds.length === 0) return false;
    propsRef.current.onOpenRow(node.endIds[0], node.endIds);
    return true;
  }, []);

  // A progression the page asks to see after the map opened (a row opened
  // from outside the map), once it is in the model: rows still loading are
  // waited for, and an edit to the rows afterwards does not move the camera
  // again. One asked for as the map opened was opened before the first
  // layout (`firstOpen`).
  useEffect(() => {
    if (revealProgressionId === null) {
      revealed.current = null;
      return;
    }
    if (revealed.current === revealProgressionId) return;
    const id = model.forest.endNodeOf.get(revealProgressionId);
    if (!id) return;
    revealed.current = revealProgressionId;
    reveal(id);
  }, [revealProgressionId, reveal, model]);

  // What is open, reported for the URL whenever it changes (the reader, or
  // rows that changed under it), in its shortest description; and the
  // page's description followed when it changes to one the map did not
  // report (Back to an entry with other branches open).
  const reported = useRef<OpenSpec | null>(null);
  useEffect(() => {
    if (model.forest.nodes.size === 0) return;
    const spec = encodeOpen(model, open);
    if (reported.current && sameOpenSpec(reported.current, spec)) return;
    reported.current = spec;
    propsRef.current.onOpenChange?.(spec);
  }, [model, open]);
  const givenSpec = useRef(openSpec);
  useEffect(() => {
    const was = givenSpec.current;
    givenSpec.current = openSpec;
    if (!openSpec || model.forest.nodes.size === 0) return;
    if (was && sameOpenSpec(was, openSpec)) return;
    if (reported.current && sameOpenSpec(reported.current, openSpec)) return;
    changeOpen(resolveOpen(model, openSpec), null);
  }, [openSpec, model, changeOpen]);

  const describe = (id: string) => {
    const m = modelRef.current;
    const story = storyOf(m, id, name);
    const node = m.forest.nodes.get(id);
    if (!story || !node) return '';
    const i = layoutRef.current.indexOf.get(id);
    const folded =
      node.childIds.length > 0 &&
      (i === undefined || layoutRef.current.open[i] === 0);
    return announceNode(story, folded, name(node.chord));
  };

  const makeCurrent = (id: string) => {
    setCurrentId(id);
    announce(describe(id));
    const i = layoutRef.current.indexOf.get(id);
    const scene = sceneRef.current;
    if (i === undefined || !scene) return;
    const at = scene.screenOf(i);
    const v = scene.viewport();
    if (
      at &&
      (at.x < 24 || at.y < 24 || at.x > v.width - 24 || at.y > v.height - 24)
    )
      scene.reveal(i);
  };

  const walk = (step: TreeStep) => {
    const m = modelRef.current;
    const from = currentId ?? layoutRef.current.ids[0] ?? null;
    if (from === null) return;
    if (currentId === null) {
      makeCurrent(from);
      return;
    }
    const move = stepIn(m, layoutRef.current, from, step);
    if (!move.to) return;
    if (move.open)
      changeOpen(openPathTo(m, openRef.current, move.to), {
        kind: 'keep',
        id: from,
      });
    makeCurrent(move.to);
  };

  const host: InteractionHost = {
    camera: () => sceneRef.current?.camera() ?? { x: 0, y: 0, zoom: 1 },
    viewport: () =>
      sceneRef.current?.viewport() ?? { width: 0, height: 0, dpr: 1 },
    hitTest: (x, y) => sceneRef.current?.hitTest(x, y) ?? -1,
    setCamera: (camera, byUser) => sceneRef.current?.setCamera(camera, byUser),
    zoom: (factor, at) => sceneRef.current?.zoomToward(factor, at),
    hover(i, at) {
      const scene = sceneRef.current;
      if (!scene) return;
      scene.hover(i);
      const region = regionRef.current;
      if (region) region.style.cursor = i >= 0 ? 'pointer' : '';
      setCard((shown) => {
        if (i < 0 || !at) return shown ? null : shown;
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
    // The positions are the tidy forest's: a dot cannot be dragged away.
    pin: () => {},
    unpin: () => {},
    open(i, keys) {
      const id = layoutRef.current.ids[i];
      if (id === undefined) return;
      const node = modelRef.current.forest.nodes.get(id);
      if (!node) return;
      setCurrentId(id);
      if ((keys?.metaKey || keys?.ctrlKey) && openRow(id)) return;
      if (node.childIds.length > 0) toggle(id, keys?.altKey ?? false);
      else openRow(id);
    },
    fling: (velocity) => sceneRef.current?.fling(velocity),
    stopMotion: () => sceneRef.current?.stopMotion(),
    fit: () => sceneRef.current?.fit(true),
    find: () => findRef.current?.focus(),
    current: () =>
      currentId === null
        ? -1
        : (layoutRef.current.indexOf.get(currentId) ?? -1),
    step: (direction) => walk(direction > 0 ? 'next' : 'previous'),
    openCurrent() {
      // Enter opens the row where a progression ends; elsewhere it folds
      // and unfolds.
      if (currentId !== null && !openRow(currentId)) toggle(currentId);
    },
    localCurrent: () => {},
    clear() {
      sceneRef.current?.hover(-1);
      setCard(null);
      setCurrentId(null);
    },
    reducedMotion: () => propsRef.current.reducedMotion ?? false,
    key(e) {
      const step = ARROWS[e.key];
      if (step) {
        walk(step);
        return true;
      }
      if (e.key === ' ' && currentId !== null) {
        toggle(currentId);
        return true;
      }
      return false;
    },
  };
  useGraphInteraction(regionRef, host);

  const pickKey = (key: string) => {
    setKeyName(key);
    propsRef.current.onKeyChange?.(key);
    announce(`Key of ${keyLabel(key)}`);
  };
  const pickNotation = (n: ChordNotation) => {
    setNotation(n);
    propsRef.current.onNotationChange?.(n);
  };
  const pickList = (list: boolean) => {
    setListShown(list);
    propsRef.current.onListChange?.(list);
  };
  const openDepth = (depth: number) =>
    changeOpen(
      depth === Infinity ? openAll(model) : openToDepth(model, depth),
      null,
    );

  const showList = listShown || unavailable;

  /** The opening under a point on the screen (client pixels), or null. */
  const hitTestClient = (clientX: number, clientY: number): string | null => {
    const region = regionRef.current;
    const scene = sceneRef.current;
    if (!region || !scene) return null;
    const rect = region.getBoundingClientRect();
    const i = scene.hitTest(clientX - rect.left, clientY - rect.top);
    return i >= 0 ? (layoutRef.current.ids[i] ?? null) : null;
  };
  const cardId = card ? layout.ids[card.index] : undefined;
  const bounds = sceneRef.current?.viewport() ?? { width: 0, height: 0 };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-[hsl(var(--ui-background))] text-white',
        className,
      )}
      data-tesseract=""
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/[0.08] px-4 py-3">
        <div
          role="group"
          aria-label="Key"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className={cn(CONSOLE_LABEL, 'mr-1')}>Key</span>
          {TESSERACT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === keyName}
              aria-label={`Key of ${keyLabel(key)}`}
              onClick={() => pickKey(key)}
              style={{ backgroundColor: keyColor(key) }}
              className={cn(
                'h-7 min-w-8 rounded-full px-2 text-xs font-semibold text-black/80 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                key === keyName
                  ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[hsl(var(--ui-background))]'
                  : 'opacity-70 hover:opacity-100',
              )}
            >
              {keyLabel(key)}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Chord names"
          className="flex items-center gap-1.5"
        >
          {CHORD_NOTATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={option.value === notation}
              onClick={() => pickNotation(option.value)}
              className={consoleTabClass(option.value === notation, 'sm')}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="How much is open"
          className="flex flex-wrap items-center gap-1.5"
        >
          {[1, 2, 3].map((depth) => (
            <button
              key={depth}
              type="button"
              onClick={() => openDepth(depth)}
              className={consoleTabClass(false, 'sm')}
            >
              Open to depth {depth}
            </button>
          ))}
          <button
            type="button"
            onClick={() => openDepth(Infinity)}
            className={consoleTabClass(false, 'sm')}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => changeOpen(new Set(), null)}
            className={consoleTabClass(false, 'sm')}
          >
            Collapse all
          </button>
        </div>
        <div
          role="group"
          aria-label="View"
          className="ml-auto flex items-center gap-1.5"
        >
          {(['map', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={showList === (v === 'list')}
              disabled={unavailable && v === 'map'}
              onClick={() => pickList(v === 'list')}
              className={consoleTabClass(showList === (v === 'list'), 'sm')}
            >
              {v === 'map' ? 'Map' : 'List'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-white/[0.08] px-4 py-2.5">
        <div className="relative w-72 max-w-full">
          <label className="sr-only" htmlFor={`${helpId}-find`}>
            Find chords or a song
          </label>
          <input
            id={`${helpId}-find`}
            ref={findRef}
            type="search"
            value={findText}
            placeholder="Find: ii7 V7, Dm7 G7, or a song"
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) {
                e.preventDefault();
                reveal(hits[0].id);
              } else if (e.key === 'Escape') {
                setFindText('');
                regionRef.current?.focus({ preventScroll: true });
              }
            }}
            className="h-8 w-full rounded-full border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          />
          {findText.trim() ? (
            <ul
              aria-label="Find results"
              className="absolute left-0 top-9 z-20 max-h-80 w-[26rem] max-w-[90vw] overflow-auto rounded-xl border border-white/[0.1] bg-popover p-1 text-sm shadow-lg"
            >
              {hits.length === 0 ? (
                <li className="px-3 py-2 text-white/50">Nothing matches.</li>
              ) : (
                hits.map((hit) => (
                  <li key={`${hit.kind}:${hit.id}:${hit.progressionId ?? ''}`}>
                    <button
                      type="button"
                      onClick={() => reveal(hit.id)}
                      className="flex w-full items-baseline gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
                    >
                      <span className="text-white">
                        {storyOf(model, hit.id, name)?.named}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-white/45">
                        {hit.kind === 'song'
                          ? hit.song
                          : hit.kind === 'opening'
                            ? 'opening'
                            : 'inside'}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <FilterSelect
          label="Vibe"
          value={filters.vibes[0] ?? ''}
          options={options.vibes}
          onChange={(v) => setFilters((f) => ({ ...f, vibes: v ? [v] : [] }))}
        />
        <FilterSelect
          label="Style"
          value={filters.styles[0] ?? ''}
          options={options.styles}
          onChange={(v) => setFilters((f) => ({ ...f, styles: v ? [v] : [] }))}
        />
        <FilterSelect
          label="Complexity"
          value={filters.complexity ?? ''}
          options={options.complexities}
          onChange={(v) => setFilters((f) => ({ ...f, complexity: v || null }))}
        />
        <label className="flex h-8 items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={filters.hasSongs}
            onChange={(e) =>
              setFilters((f) => ({ ...f, hasSongs: e.target.checked }))
            }
          />
          Has songs
        </label>
      </div>

      <div className="relative min-h-0 flex-1">
        <p id={helpId} className="sr-only">
          Click a chord to open or fold what follows it; Alt-click opens
          everything below. Arrow keys walk the trees: Left to the chord before,
          Right to the next, Up and Down along the choices. Enter opens a
          progression&apos;s row, Space folds and unfolds, slash goes to Find,
          Escape lets go. The menu (right-click, or Shift F10 on the current
          chord) shows a progression in Cortex or starts a new one from here.
        </p>
        <TesseractContextMenu
          hitTest={hitTestClient}
          model={model}
          currentId={currentId}
          isOpen={(id) => open.has(id)}
          nameOf={(id) => storyOf(model, id, name)?.named ?? id}
          onToggle={toggle}
          onOpenRow={(id, endingHere) =>
            propsRef.current.onOpenRow(id, endingHere)
          }
          onShowInCortex={props.onShowInCortex}
          onNewFromHere={props.onNewFromHere}
          onFit={() => sceneRef.current?.fit(true)}
          disabled={showList}
        >
          <div
            ref={regionRef}
            role="application"
            aria-roledescription="map"
            aria-label={`Tesseract: ${layout.ids.length} chords shown in ${model.rootIds.length} trees, key of ${keyLabel(keyName)}`}
            aria-describedby={helpId}
            tabIndex={0}
            hidden={showList}
            data-tesseract-canvas=""
            className="absolute inset-0 touch-none select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
          >
            <canvas
              ref={glRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 block size-full"
            />
            <canvas
              ref={textRef}
              aria-hidden
              className={cn(
                'pointer-events-none absolute left-0 top-0',
                paused && 'invisible',
              )}
            />
            {card && cardId ? (
              <HoverCard
                model={model}
                id={cardId}
                at={card.at}
                bounds={bounds}
                name={name}
                pc={pc}
                songTitle={songTitle}
              />
            ) : null}
            {paused ? (
              <p
                role="status"
                className="absolute left-1/2 top-3 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-2xl border border-border bg-popover px-3 py-1 text-center text-xs text-foreground"
              >
                Map paused: the browser took away its drawing surface. It
                usually comes back by itself in a moment; the List shows the
                same trees meanwhile.
              </p>
            ) : null}
          </div>
        </TesseractContextMenu>
        {showList ? (
          <TesseractList
            model={model}
            layout={layout}
            name={name}
            pc={pc}
            unavailable={unavailable}
            onToggle={(id) => toggle(id)}
            onOpenRow={openRow}
          />
        ) : null}
      </div>
      <GraphLiveRegion ref={liveRef} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; count: number }[];
  onChange(value: string): void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 text-sm text-white/70">
      <span className={CONSOLE_LABEL}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-full border border-white/[0.1] bg-white/[0.03] px-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

/** The card beside a hovered node. */
function HoverCard({
  model,
  id,
  at,
  bounds,
  name,
  pc,
  songTitle,
}: {
  model: TesseractModel;
  id: string;
  at: Point;
  bounds: { width: number; height: number };
  name: (chord: string) => string;
  pc: number;
  songTitle?: (songId: string) => string | undefined;
}) {
  const story = storyOf(model, id, name);
  if (!story) return null;
  const node = model.forest.nodes.get(id)!;
  const width = 300;
  const left = Math.max(8, Math.min(at.x + 16, bounds.width - width - 8));
  const top = Math.max(8, Math.min(at.y + 16, bounds.height - 220));
  const songs = story.songIds
    .map((s) => songTitle?.(s) ?? null)
    .filter((t): t is string => !!t);
  const lines: ReactNode[] = [];
  if (story.ends.length > 0) {
    for (const end of story.ends) {
      lines.push(
        <p key={`end-${end.id}`} className="text-white/60">
          Progression {end.id}
          {end.complexity ? ` · ${end.complexity}` : ''}
          {end.vibes.length ? ` · ${end.vibes.join(', ')}` : ''}
          {end.styles.length ? ` · ${end.styles.join(', ')}` : ''}
        </p>,
      );
    }
  }
  if (story.children > 0) {
    lines.push(
      <p key="below" className="text-white/60">
        {story.countBelow.toLocaleString('en-US')}{' '}
        {story.countBelow === 1
          ? 'progression continues'
          : 'progressions continue'}
        {story.vibes.length ? ` · ${story.vibes.slice(0, 3).join(', ')}` : ''}
        {story.styles.length ? ` · ${story.styles.slice(0, 3).join(', ')}` : ''}
      </p>,
    );
  }
  return (
    <div
      role="tooltip"
      style={{ left, top, width }}
      className="pointer-events-none absolute z-10 rounded-xl border border-white/[0.1] bg-popover p-3 text-sm shadow-lg"
    >
      <p className="flex items-center gap-2 text-white">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: chordCss(node.chord, pc) }}
        />
        <span>{story.named}</span>
      </p>
      <p className="mt-1 text-xs text-white/45">{story.degrees}</p>
      <div className="mt-2 space-y-1 text-xs">{lines}</div>
      {songs.length > 0 ? (
        <p className="mt-2 text-xs text-white/60">
          Songs: {songs.slice(0, 4).join(', ')}
          {songs.length > 4 ? ` and ${songs.length - 4} more` : ''}
        </p>
      ) : null}
    </div>
  );
}

/** The List: the forest as shown, as an indented list with the same controls. */
function TesseractList({
  model,
  layout,
  name,
  pc,
  unavailable,
  onToggle,
  onOpenRow,
}: {
  model: TesseractModel;
  layout: ForestLayout;
  name: (chord: string) => string;
  pc: number;
  unavailable: boolean;
  onToggle(id: string): void;
  onOpenRow(id: string): boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-auto px-4 py-3">
      {unavailable ? (
        <p className="mb-3 text-sm text-white/55">
          This browser cannot draw the map: WebGL2 is turned off or not working.
          The list holds the same trees.
        </p>
      ) : null}
      <ul aria-label="Tesseract as a list" className="space-y-0.5 text-sm">
        {layout.ids.map((id, i) => {
          const node = model.forest.nodes.get(id)!;
          const folded = node.childIds.length > 0 && layout.open[i] === 0;
          return (
            <li
              key={id}
              data-opening={id}
              style={{ paddingLeft: (node.depth - 1) * 20 }}
              className="flex items-center gap-2"
            >
              {node.childIds.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={!folded}
                  aria-label={`${folded ? 'Open' : 'Fold'} ${name(node.chord)}`}
                  onClick={() => onToggle(id)}
                  className="w-5 text-white/50 hover:text-white"
                >
                  {folded ? '+' : '−'}
                </button>
              ) : (
                <span className="w-5" aria-hidden />
              )}
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  node.endIds.length > 0 &&
                    'ring-2 ring-offset-1 ring-offset-[hsl(var(--ui-background))]',
                )}
                style={{ backgroundColor: chordCss(node.chord, pc) }}
              />
              <span className="text-white/85">
                {nodeLabel(name(node.chord), folded, node.countBelow)}
              </span>
              {node.endIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenRow(id)}
                  className="text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
                >
                  Open row {node.endIds.join(', ')}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
