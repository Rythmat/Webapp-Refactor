import './river.css';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ATLAS_POPOVER } from '@/components/atlas/components/UI/primitives';
import { eventImage } from '@/components/atlas/data/eventImage';
import {
  getTimelineIndex,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { RIVER } from '@/components/atlas/theme/river';
import {
  DEFAULT_WINDOW,
  DOMAIN,
  ensureVisible,
  sameWindow,
  windowLabel,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { cn } from '@/lib/utils';
import { RiverBands } from './RiverBands';
import {
  ATLAS_FOCUS_ON_BAND,
  RiverMarkers,
  describeCluster,
  type PlacedMarker,
} from './RiverMarkers';
import { createRiverCamera } from './riverCamera';
import { centerAt, fitLaneHeight, halfAt, layoutRiver } from './riverLayout';
import {
  clusterLanes,
  levelOf,
  levelPxPerYear,
  type RiverCluster,
} from './riverLevels';
import {
  eventsByLane,
  lineageSpecs,
  markerKind,
  posterKeys,
} from './riverModel';
import { useRiverGestures } from './useRiverGestures';
import { writeYear } from './yearDigits';

type Cluster = RiverCluster<TimelineEvent>;

/** The river's size, as it lays out. */
function useSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize((was) =>
        was.width === el.clientWidth && was.height === el.clientHeight
          ? was
          : { width: el.clientWidth, height: el.clientHeight },
      );
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** The view and half its span again on either side: what is drawn. */
const overscan = (w: TimeWindow): TimeWindow => {
  const pad = (w.to - w.from) * RIVER.overscan;
  return { from: w.from - pad, to: w.to + pad };
};

/** A tiny store for what the pointer (or focus) rests on: the tooltip. */
interface Hover {
  cluster: Cluster;
  x: number;
  y: number;
  flip: boolean;
}
function createHoverStore() {
  let value: Hover | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: Hover | null) => {
      if (next === value) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
type HoverStore = ReturnType<typeof createHoverStore>;

function RiverTooltip({ store }: { store: HoverStore }) {
  const hover = useSyncExternalStore(store.subscribe, store.get, store.get);
  if (!hover) return null;
  const { title, detail } = describeCluster(hover.cluster);
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute flex max-w-[22rem] -translate-y-1/2 flex-col rounded-2xl border border-atlas-panel-border bg-atlas-panel px-3.5 py-2 shadow-2xl',
        hover.flip && '-translate-x-full',
      )}
      style={{ left: hover.x, top: hover.y }}
    >
      <span className="truncate text-sm font-bold text-atlas-text">
        {title}
      </span>
      <span className="text-xs text-atlas-text-2">{detail}</span>
    </div>
  );
}

/**
 * Music's family tree as a river through time, after Dorot's: lanes that
 * split from one another and merge as genres did, tinted by era, with the
 * events on them as round posters and counts. Scroll or pinch to zoom, drag
 * or scroll sideways to pan; the years at either end follow.
 *
 * The camera (riverCamera.ts) holds the view; a frame writer draws it
 * straight to the DOM — the bands' transform, the markers' two custom
 * properties, the bookends' digits — so a gesture renders nothing. React
 * renders when the zoom crosses a level (re-clustering, re-laying the births)
 * or the view leaves the drawn range, and the page's store hears of the view
 * once it rests.
 */
export default function TimeRiver({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useSize(rootRef);
  // Phones keep more of their width for the years (the vertical phone river
  // is a later step: docs/globe-redesign/PROGRESS.md).
  const gutter = size.width < 640 ? RIVER.labelGutterNarrow : RIVER.labelGutter;
  const plotWidth = Math.max(0, size.width - gutter);
  const riverHeight = Math.max(0, size.height - RIVER.top - RIVER.bottom);

  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const storeWindow = useAtlasSelector((s) => s.timeWindow);
  const [camera] = useState(() =>
    createRiverCamera(storeWindow ?? DEFAULT_WINDOW, DOMAIN),
  );
  const [hover] = useState(createHoverStore);

  /* ── What is drawn ─────────────────────────────────────────────────── */

  const specs = useMemo(lineageSpecs, []);
  const laneHeight = fitLaneHeight(specs, riverHeight, RIVER.gap);
  const pxPerYear = (w: TimeWindow) => plotWidth / (w.to - w.from || 1);
  const [level, setLevel] = useState(() => levelOf(1));
  const [range, setRange] = useState(() => overscan(camera.get()));
  const [restView, setRestView] = useState(() => camera.get());
  const rampYears = Math.min(
    RIVER.maxRampYears,
    Math.max(RIVER.minRampYears, RIVER.rampPx / levelPxPerYear(level)),
  );
  const layout = useMemo(
    () =>
      layoutRiver(specs, {
        height: riverHeight,
        laneHeight,
        gap: RIVER.gap,
        rampYears,
        domain: DOMAIN,
      }),
    [specs, riverHeight, laneHeight, rampYears],
  );
  const byLane = useMemo(() => eventsByLane(getTimelineIndex()), []);
  const clusters = useMemo(
    () => clusterLanes(byLane, level, RIVER.clusterGapPx, (t) => t.event.id),
    [byLane, level],
  );
  const posters = useMemo(
    () => posterKeys(clusters, restView, RIVER.maxPosters),
    [clusters, restView],
  );
  const markers = useMemo<PlacedMarker[]>(
    () =>
      clusters
        .filter((c) => c.lastYear >= range.from && c.year <= range.to)
        .map((cluster) => ({
          cluster,
          y: centerAt(layout, cluster.lane, cluster.year) ?? 0,
          kind: markerKind(cluster, posters.has(cluster.key)),
        })),
    [clusters, range, layout, posters],
  );

  /* ── The frame writer ──────────────────────────────────────────────── */

  const bandsRef = useRef<SVGGElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
  const toRef = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const live = useRef({ layout, plotWidth, level, range });
  live.current = { layout, plotWidth, level, range };

  const write = useCallback(() => {
    const { layout: l, plotWidth: width, level: lvl, range: r } = live.current;
    if (!width) return;
    const w = camera.get();
    const ppy = width / (w.to - w.from);
    bandsRef.current?.setAttribute(
      'transform',
      `matrix(${ppy} 0 0 1 ${-w.from * ppy} 0)`,
    );
    const items = itemsRef.current;
    if (items) {
      items.style.setProperty('--ppy', String(ppy));
      items.style.setProperty('--tx', String(-w.from * ppy));
    }
    writeYear(fromRef.current, w.from, { fixed: false });
    writeYear(toRef.current, w.to, { fixed: false });
    for (const [id, el] of labelRefs.current) {
      // A lane still growing out of its parent would sit on its parent's
      // name; it is named once it has mostly grown.
      const y = centerAt(l, id, w.to);
      const half = halfAt(l, id, w.to) ?? 0;
      el.hidden = y === null || half < l.laneHeight * 0.35;
      if (y !== null) el.style.transform = `translateY(${y}px)`;
    }
    const nextLevel = levelOf(ppy);
    if (nextLevel !== lvl) setLevel(nextLevel);
    // Redraw the range when the view leaves it, or has zoomed well inside
    // it — else a zoom-in keeps every marker of the wider view in the page.
    const drawn = r.to - r.from;
    const wanted = (w.to - w.from) * (1 + 2 * RIVER.overscan);
    if (w.from < r.from || w.to > r.to || drawn > wanted * 2) {
      setRange(overscan(w));
    }
  }, [camera]);

  // Every camera move is one write on the next frame; the store hears once
  // the view rests, and new posters wait for that too.
  const committed = useRef<TimeWindow | null>(null);
  useEffect(() => {
    let raf = 0;
    let commit = 0;
    const unsubscribe = camera.subscribe((source) => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          write();
        });
      }
      window.clearTimeout(commit);
      commit = window.setTimeout(() => {
        const w = camera.get();
        setRestView(w);
        if (source === 'page') return;
        committed.current = w;
        dispatch({ type: 'SET_WINDOW', payload: w });
      }, RIVER.commitMs);
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      window.clearTimeout(commit);
    };
  }, [camera, dispatch, write]);

  // A new layout or size draws at once, before paint.
  useLayoutEffect(write, [write, layout, plotWidth]);

  // The page moving the window (the URL, the era rail) eases the river there;
  // its own commits coming back are not news.
  useEffect(() => {
    if (!storeWindow) return;
    if (committed.current && sameWindow(committed.current, storeWindow)) return;
    if (sameWindow(storeWindow, camera.get())) return;
    camera.tween(storeWindow, reducedMotion ? 0 : RIVER.tweenMs);
  }, [storeWindow, camera, reducedMotion]);

  /* ── Gestures, the cursor and the tooltip ──────────────────────────── */

  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorYearRef = useRef<HTMLSpanElement>(null);
  const hideTransient = useCallback(() => {
    hover.set(null);
    if (cursorRef.current) cursorRef.current.hidden = true;
  }, [hover]);
  useRiverGestures(rootRef, camera, {
    plotWidth: () => live.current.plotWidth,
    reducedMotion,
    onGesture: hideTransient,
  });

  const onPointerMove = (e: React.PointerEvent) => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor) return;
    const x = e.clientX - root.getBoundingClientRect().left;
    const inPlot = x >= 0 && x <= plotWidth;
    cursor.hidden = !inPlot;
    if (!inPlot) return;
    cursor.style.transform = `translateX(${x}px)`;
    const w = camera.get();
    writeYear(cursorYearRef.current, w.from + x / pxPerYear(w));
  };

  const onHover = useCallback(
    (cluster: Cluster | null, el: HTMLElement | null) => {
      const root = rootRef.current;
      if (!cluster || !el || !root) {
        hover.set(null);
        return;
      }
      const box = el.getBoundingClientRect();
      const frame = root.getBoundingClientRect();
      const flip = box.right - frame.left > live.current.plotWidth - 240;
      hover.set({
        cluster,
        x: (flip ? box.left - 10 : box.right + 10) - frame.left,
        y: box.top + box.height / 2 - frame.top,
        flip,
      });
    },
    [hover],
  );

  /* ── Opening a marker ──────────────────────────────────────────────── */

  const [list, setList] = useState<{
    cluster: Cluster;
    x: number;
    y: number;
  } | null>(null);
  useEscapeLayer(list !== null, () => setList(null));

  const openEvent = useCallback(
    (t: TimelineEvent) =>
      // Until the event stage lands, an event opens on the map, in its card.
      navigate.go(
        { kind: 'event', eventId: t.event.id },
        { frame: { view: 'map' } },
      ),
    [navigate],
  );

  const onActivate = useCallback(
    (cluster: Cluster, el: HTMLElement) => {
      if (cluster.items.length === 1) {
        openEvent(cluster.items[0]);
        return;
      }
      const span = cluster.lastYear - cluster.year;
      if (span < 1) {
        // One year: no zoom pulls it apart, so list it.
        const root = rootRef.current!.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        setList({
          cluster,
          x: box.left + box.width / 2 - root.left,
          y: box.bottom + 8 - root.top,
        });
        return;
      }
      const pad = Math.max(1, span * 0.3);
      camera.tween(
        { from: cluster.year - pad, to: cluster.lastYear + pad },
        reducedMotion ? 0 : RIVER.tweenMs,
      );
    },
    [camera, openEvent, reducedMotion],
  );

  /* ── Keyboard: rove the markers, pan and zoom the view ─────────────── */

  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const laneOrder = useMemo(() => specs.map((s) => s.id), [specs]);
  const byLaneClusters = useMemo(() => {
    const map = new Map<string, Cluster[]>();
    for (const c of clusters) {
      const list = map.get(c.lane);
      if (list) list.push(c);
      else map.set(c.lane, [c]);
    }
    return map;
  }, [clusters]);

  const moveFocus = (target: Cluster | undefined) => {
    if (!target) return;
    setFocusedKey(target.key);
    const view = camera.get();
    const next = ensureVisible(view, target.year, 0.15, DOMAIN);
    if (next !== view) camera.tween(next, reducedMotion ? 0 : 250);
  };

  // Focus follows the roving key once its marker is drawn.
  useEffect(() => {
    if (!focusedKey) return;
    const el = itemsRef.current?.querySelector<HTMLElement>(
      `[data-river-item="${CSS.escape(focusedKey)}"]`,
    );
    if (
      el &&
      el !== document.activeElement &&
      itemsRef.current?.contains(document.activeElement)
    ) {
      el.focus();
    }
  }, [focusedKey, markers]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const w = camera.get();
    const span = w.to - w.from;
    const current = clusters.find((c) => c.key === focusedKey);
    const onMarker = !!current && (e.target as HTMLElement).dataset.riverItem;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        if (!onMarker) {
          camera.tween(
            { from: w.from + dir * span * 0.2, to: w.to + dir * span * 0.2 },
            reducedMotion ? 0 : 200,
          );
          return;
        }
        const lane = byLaneClusters.get(current!.lane)!;
        moveFocus(lane[lane.indexOf(current!) + dir]);
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!onMarker) return;
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        let i = laneOrder.indexOf(current!.lane) + dir;
        while (
          i >= 0 &&
          i < laneOrder.length &&
          !byLaneClusters.get(laneOrder[i])?.length
        ) {
          i += dir;
        }
        const lane = byLaneClusters.get(laneOrder[i]);
        if (!lane) return;
        moveFocus(
          lane.reduce((best, c) =>
            Math.abs(c.year - current!.year) <
            Math.abs(best.year - current!.year)
              ? c
              : best,
          ),
        );
        return;
      }
      case 'Home':
      case 'End': {
        if (!onMarker) return;
        e.preventDefault();
        const lane = byLaneClusters.get(current!.lane)!;
        moveFocus(e.key === 'Home' ? lane[0] : lane[lane.length - 1]);
        return;
      }
      case '+':
      case '=':
      case '-':
      case '_': {
        e.preventDefault();
        const anchor = current ? current.year : (w.from + w.to) / 2;
        const factor = e.key === '+' || e.key === '=' ? 0.6 : 1 / 0.6;
        camera.tween(
          {
            from: anchor - (anchor - w.from) * factor,
            to: anchor + (w.to - anchor) * factor,
          },
          reducedMotion ? 0 : 200,
        );
        return;
      }
    }
  };

  /* ── Drawing ───────────────────────────────────────────────────────── */

  const viewLabel = windowLabel(restView);
  return (
    <div
      ref={rootRef}
      aria-label={`Music's family tree, ${viewLabel}`}
      aria-roledescription="timeline"
      className={cn(
        'relative h-full w-full touch-none select-none overflow-hidden bg-atlas-page text-atlas-text outline-none',
        ATLAS_FOCUS_ON_BAND,
      )}
      role="region"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerLeave={hideTransient}
      onPointerMove={onPointerMove}
    >
      {plotWidth > 0 && riverHeight > 0 && (
        <>
          <RiverBands
            domain={DOMAIN}
            groupRef={bandsRef}
            layout={layout}
            top={RIVER.top}
          />

          {/* The cursor: a hairline at the pointer, its year at the foot. */}
          <div
            ref={cursorRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-0"
            hidden
          >
            <div
              className="absolute w-px bg-white/25"
              style={{ top: RIVER.top - 24, bottom: RIVER.bottom - 20 }}
            />
            <span
              ref={cursorYearRef}
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-bold text-atlas-page"
              style={{ bottom: RIVER.bottom - 34 }}
            />
          </div>

          {/* The markers, clipped to the years (the gutter holds the names). */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: plotWidth }}
          >
            <div ref={itemsRef} className="atlas-river-items">
              <RiverMarkers
                focusedKey={focusedKey}
                laneHeight={laneHeight}
                markers={markers}
                top={RIVER.top}
                onActivate={onActivate}
                onFocusKey={setFocusedKey}
                onHover={onHover}
              />
            </div>
          </div>

          {/* The lanes' names, at the right edge, on their own lanes. */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0"
            style={{ top: RIVER.top, width: gutter }}
          >
            {layout.lanes.map((lane) => (
              <span
                key={lane.id}
                ref={(el) => {
                  if (el) labelRefs.current.set(lane.id, el);
                  else labelRefs.current.delete(lane.id);
                }}
                className="absolute left-0 right-0 top-0 -mt-2.5 truncate pl-3 pr-3 text-xs font-bold leading-5 text-atlas-text sm:pl-4 sm:pr-5 sm:text-sm"
              >
                {lane.label}
              </span>
            ))}
          </div>
        </>
      )}

      {/* The years at either end. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 top-6 text-atlas-text"
      >
        <span ref={fromRef} className="atlas-river-bookend" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute top-6 -translate-x-full text-atlas-text"
        style={{ left: Math.max(plotWidth - 8, 0) }}
      >
        <span ref={toRef} className="atlas-river-bookend" />
      </div>

      <RiverTooltip store={hover} />

      {list && (
        <ul
          className={cn(
            ATLAS_POPOVER,
            'absolute flex max-h-72 w-80 -translate-x-1/2 flex-col gap-0.5 overflow-y-auto p-1.5',
          )}
          style={{ left: list.x, top: list.y }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {list.cluster.items.map((t) => (
            <li key={t.event.id}>
              <button
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus"
                type="button"
                onClick={() => {
                  setList(null);
                  openEvent(t);
                }}
              >
                {eventImage(t.event, 'thumb') ? (
                  <img
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    src={eventImage(t.event, 'thumb')}
                  />
                ) : (
                  <span className="size-8 shrink-0 rounded-full bg-white/10" />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold">
                    {t.event.title}
                  </span>
                  <span className="text-xs text-atlas-text-2">
                    {eventPlaceName(t.event)} · {t.event.year}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <span aria-live="polite" className="sr-only" role="status">
          {viewLabel}
        </span>
      )}
    </div>
  );
}
