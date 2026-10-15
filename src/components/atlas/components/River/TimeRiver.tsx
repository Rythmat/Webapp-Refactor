import './river.css';
import { AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
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
import { GlobeCornerButton } from '@/components/atlas/components/UI/GlobeCornerButton';
import {
  ATLAS_FOCUS,
  ATLAS_POPOVER,
} from '@/components/atlas/components/UI/primitives';
import { eventImage } from '@/components/atlas/data/eventImage';
import type { GenreChipId } from '@/components/atlas/data/genreChipIds';
import { GENRE_CHIPS, keepsGenres } from '@/components/atlas/data/genreChips';
import {
  CONTINENTS,
  SOURCE_COLOR,
  placeLaneOf,
  placeLanes,
  placePath,
  type PlaceLane,
} from '@/components/atlas/data/placeTree';
import {
  getTimelineEvent,
  getTimelineIndex,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasFrame,
  useAtlasNavigate,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { RIVER } from '@/components/atlas/theme/river';
import { useTimeCamera } from '@/components/atlas/timeline/TimeCamera';
import {
  DOMAIN,
  ensureVisible,
  windowLabel,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { cn } from '@/lib/utils';
import { EventStage } from './EventStage';
import { PlaceBands } from './PlaceBands';
import {
  RiverMarkers,
  describeCluster,
  frameWidth,
  posterSize,
  type PlacedMarker,
} from './RiverMarkers';
import { layoutFan, type FanLane } from './placeLayout';
import { clusterLanes, levelOf, type RiverCluster } from './riverLevels';
import { markerKind, posterKeys } from './riverModel';
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

/**
 * A row that scrolls sideways fades out at whichever end has more to show,
 * so a cut-off chip reads as "more this way" rather than as a mistake
 * (river.css, `.atlas-river-scroller`).
 */
function useScrollFade(ref: React.RefObject<HTMLElement>, size: unknown) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.dataset.fadeStart = String(el.scrollLeft > 1);
      el.dataset.fadeEnd = String(el.scrollLeft < max - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [ref, size]);
}

/** The view and part of its span again on either side: what is drawn. */
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
      key={hover.cluster.key}
      aria-hidden
      className={cn(
        'atlas-river-tooltip pointer-events-none absolute flex max-w-[22rem] -translate-y-1/2 flex-col rounded-2xl border border-atlas-panel-border bg-atlas-panel px-3.5 py-2 shadow-2xl',
        hover.flip && '-translate-x-full',
      )}
      data-flip={hover.flip}
      style={{ left: hover.x, top: hover.y }}
    >
      <span className="truncate text-sm font-bold text-atlas-text">
        {title}
      </span>
      <span className="text-xs text-atlas-text-2">{detail}</span>
    </div>
  );
}

const splitList = (raw: string): string[] => (raw ? raw.split(',') : []);

/** A place's name, whether it is drawn as a lane now or not. */
function placeName(index: readonly TimelineEvent[], id: string): string {
  const continent = CONTINENTS.find((c) => c.id === id);
  if (continent) return continent.label;
  const path = placePath(id);
  return (
    placeLanes(index, new Set(path.slice(0, 1))).find((l) => l.id === id)
      ?.label ?? id
  );
}

/**
 * The world's music as a river through time, after Dorot's: the four great
 * regions flow out of one source at the left as thick bands, each its own
 * colour, tinted by the eras it runs through. Open a band by its name and it
 * splits into its regions, open a region and it splits into its cities —
 * each part a shade of the place it came from. Events ride the bands as
 * round posters and counts; the genre chips along the top filter them.
 * Scroll or pinch to zoom about the pointer, drag to pan; the years at
 * either end follow.
 *
 * The page's time camera (timeline/TimeCamera.tsx) holds the view; a frame
 * writer draws it straight to the DOM — the markers' two custom properties,
 * the eras' tint, the bookends' digits — so a gesture renders nothing. React
 * renders when the zoom crosses a level (re-clustering) or the view leaves
 * the drawn range.
 */
export default function TimeRiver({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useSize(rootRef);
  const chipsRef = useRef<HTMLDivElement>(null);
  useScrollFade(chipsRef, size);
  const narrow = size.width < 640;
  const gutter = narrow ? RIVER.labelGutterNarrow : RIVER.labelGutter;
  // Phones keep their width for the years (a vertical phone river is a
  // later step: docs/globe-redesign/PROGRESS.md).
  const stages = narrow ? RIVER.fanStagesNarrow : RIVER.fanStages;
  const riverHeight = Math.max(0, size.height - RIVER.top - RIVER.bottom);

  const navigate = useAtlasNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const camera = useTimeCamera();
  const [hover] = useState(createHoverStore);

  const openRaw = useAtlasFrame((f) => f.open.join(','));
  const genresRaw = useAtlasFrame((f) => f.genres.join(','));
  const open = useMemo(() => new Set(splitList(openRaw)), [openRaw]);
  const genres = useMemo(
    () => splitList(genresRaw) as GenreChipId[],
    [genresRaw],
  );

  /* ── Lanes ─────────────────────────────────────────────────────────── */

  const index = useMemo(() => getTimelineIndex(), []);
  const lanes = useMemo(() => placeLanes(index, open), [index, open]);
  const laneById = useMemo(() => new Map(lanes.map((l) => [l.id, l])), [lanes]);
  // Each lane's ancestors, continent first: a city's id does not name its
  // region, so walk the lanes' parents.
  const ancestors = useMemo(
    () =>
      new Map(
        lanes.map((l) => [
          l.id,
          l.parent ? [...placePath(l.parent)] : ([] as string[]),
        ]),
      ),
    [lanes],
  );
  const fan = useMemo(() => {
    // A part shades from the colour of the lane it split from.
    const regionShades = new Map(
      placeLanes(index, new Set(CONTINENTS.map((c) => c.id))).map((l) => [
        l.id,
        l.color,
      ]),
    );
    const parentColor = (lane: PlaceLane) =>
      !lane.parent
        ? SOURCE_COLOR
        : (CONTINENTS.find((c) => c.id === lane.parent)?.color ??
          regionShades.get(lane.parent) ??
          SOURCE_COLOR);
    const fanLanes: FanLane[] = lanes.map((lane) => ({
      id: lane.id,
      depth: lane.depth,
      ancestors: ancestors.get(lane.id) ?? [],
      color: lane.color,
      colorEnd: lane.colorEnd,
      parentColor: parentColor(lane),
    }));
    return layoutFan(fanLanes, {
      width: size.width,
      height: riverHeight,
      gap: RIVER.gap,
      maxLane: RIVER.maxLane,
      minLane: RIVER.minLane,
      stages,
      sourceShare: RIVER.sourceShare,
    });
  }, [index, lanes, ancestors, size.width, riverHeight, stages]);
  const plotLeft = fan.plotLeft;
  const plotRight = Math.max(plotLeft + 1, size.width - gutter);
  const plotWidth = plotRight - plotLeft;
  const laneY = useMemo(
    () => new Map(fan.lanes.map((l) => [l.id, l.y])),
    [fan],
  );

  /* ── Markers ───────────────────────────────────────────────────────── */

  const [level, setLevel] = useState(() => levelOf(1));
  const [range, setRange] = useState(() => overscan(camera.get()));
  const [restView, setRestView] = useState(() => camera.get());
  const byLane = useMemo(() => {
    const keep = keepsGenres(genres);
    const ids = new Set(lanes.map((l) => l.id));
    const map = new Map<string, TimelineEvent[]>();
    for (const t of index) {
      if (!keep(t)) continue;
      const lane = placeLaneOf(t, ids);
      const list = map.get(lane);
      if (list) list.push(t);
      else map.set(lane, [t]);
    }
    return map;
  }, [index, lanes, genres]);
  // A thick band carries two rows of markers: each row keeps its markers a
  // deck's width apart, and the rows take turns, so a busy stretch fills
  // the band instead of crowding its centre line.
  const rows = fan.thickness >= RIVER.twoRowsAt ? 2 : 1;
  const frame = frameWidth(posterSize(fan.thickness, narrow));
  const clusters = useMemo(
    () =>
      clusterLanes(
        byLane,
        level,
        (frame * RIVER.clusterGapFactor) / rows,
        (t) => t.event.id,
      ),
    [byLane, level, frame, rows],
  );
  const rowOf = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Map<string, number>();
    for (const c of clusters) {
      const i = seen.get(c.lane) ?? 0;
      map.set(c.key, i % rows);
      seen.set(c.lane, i + 1);
    }
    return map;
  }, [clusters, rows]);
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
          y:
            (laneY.get(cluster.lane) ?? 0) +
            (rows === 2
              ? ((rowOf.get(cluster.key) ?? 0) - 0.5) * fan.thickness * 0.5
              : 0),
          kind: markerKind(cluster, posters.has(cluster.key)),
        })),
    [clusters, range, laneY, posters, rows, rowOf, fan.thickness],
  );

  /* ── The frame writer ──────────────────────────────────────────────── */

  const itemsRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
  const toRef = useRef<HTMLSpanElement>(null);
  const live = useRef({ plotLeft, plotWidth, level, range });
  live.current = { plotLeft, plotWidth, level, range };
  // The pointer's line, and where it is: a zoom under a still pointer
  // changes the year it reads.
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorYearRef = useRef<HTMLSpanElement>(null);
  const cursorX = useRef(0);

  const write = useCallback(() => {
    const {
      plotLeft: left,
      plotWidth: width,
      level: lvl,
      range: r,
    } = live.current;
    if (width <= 1) return;
    const w = camera.get();
    const ppy = width / (w.to - w.from);
    const tx = left - w.from * ppy;
    const items = itemsRef.current;
    if (items) {
      // A pan only moves the layer; a zoom restyles its markers too.
      items.style.transform = `translateX(${tx}px)`;
      if (items.dataset.ppy !== String(ppy)) {
        items.dataset.ppy = String(ppy);
        items.style.setProperty('--ppy', String(ppy));
      }
    }
    writeYear(fromRef.current, w.from, { fixed: false });
    writeYear(toRef.current, w.to, { fixed: false });
    if (cursorRef.current && !cursorRef.current.hidden) {
      writeYear(cursorYearRef.current, w.from + (cursorX.current - left) / ppy);
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

  useEffect(() => {
    let raf = 0;
    let rest = 0;
    const unsubscribe = camera.subscribe(() => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          write();
        });
      }
      window.clearTimeout(rest);
      rest = window.setTimeout(() => setRestView(camera.get()), 150);
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      window.clearTimeout(rest);
    };
  }, [camera, write]);

  // A new layout or size draws at once, before paint.
  useLayoutEffect(write, [write, plotLeft, plotWidth, fan]);

  /* ── Gestures, the cursor and the tooltip ──────────────────────────── */

  const hideTransient = useCallback(() => {
    hover.set(null);
    if (cursorRef.current) cursorRef.current.hidden = true;
  }, [hover]);
  useRiverGestures(rootRef, camera, {
    disabled: () => stagedRef.current,
    plotLeft: () => live.current.plotLeft,
    plotWidth: () => live.current.plotWidth,
    reducedMotion,
    onGesture: hideTransient,
  });

  const onPointerMove = (e: React.PointerEvent) => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor) return;
    // A tap leaves no pointer to follow, and the stage hides the years.
    if (e.pointerType === 'touch' || stagedRef.current) {
      cursor.hidden = true;
      return;
    }
    const x = e.clientX - root.getBoundingClientRect().left;
    const inPlot = x >= plotLeft && x <= plotRight;
    cursor.hidden = !inPlot;
    if (!inPlot) return;
    cursor.style.transform = `translateX(${x}px)`;
    cursorX.current = x;
    const w = camera.get();
    writeYear(
      cursorYearRef.current,
      w.from + ((x - plotLeft) / plotWidth) * (w.to - w.from),
    );
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
      const { plotLeft: left, plotWidth: width } = live.current;
      const flip = box.right - frame.left > left + width - 260;
      hover.set({
        cluster,
        x: (flip ? box.left - 10 : box.right + 10) - frame.left,
        y: box.top + box.height / 2 - frame.top,
        flip,
      });
    },
    [hover],
  );

  /* ── Opening places, opening markers ───────────────────────────────── */

  const splitLane = (lane: PlaceLane) => {
    const next = new Set(open);
    for (const id of placePath(lane.id)) next.add(id);
    navigate.setFrame({ open: [...next] });
  };
  const mergeInto = (place: string) => {
    // Its regions close with it.
    const next = [...open].filter((id) => !placePath(id).includes(place));
    navigate.setFrame({ open: next });
  };
  // The splits drawn in the fan, each with a chip to fold it back.
  const splits = useMemo(() => {
    const out: { id: string; label: string; depth: number; y: number }[] = [];
    for (const id of open) {
      const children = fan.lanes.filter((g) =>
        (ancestors.get(g.id) ?? []).includes(id),
      );
      if (!children.length) continue;
      const depth = placePath(id).length;
      const ys = children.map((g) => g.stops[depth]);
      out.push({
        id,
        label: placeName(index, id),
        depth,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      });
    }
    return out;
  }, [open, fan, ancestors, index]);

  const [list, setList] = useState<{
    cluster: Cluster;
    x: number;
    y: number;
  } | null>(null);
  useEscapeLayer(list !== null, () => setList(null));

  // An event opens on its stage, here on the timeline: a step of its own,
  // so Back closes it.
  const openEvent = useCallback(
    (t: TimelineEvent) => navigate.go({ kind: 'event', eventId: t.event.id }),
    [navigate],
  );

  /* ── The event stage ───────────────────────────────────────────────── */

  const stageId = useAtlasStopSelector((stop) =>
    stop.kind === 'event' ? stop.eventId : null,
  );
  const stageInfo = useMemo(() => {
    if (!stageId) return null;
    const t = getTimelineEvent(stageId);
    if (!t) return null;
    const ids = new Set(lanes.map((l) => l.id));
    const laneId = placeLaneOf(t, ids);
    // Its lane as filtered — or, if the chips filter it out, all of it.
    const filtered = byLane.get(laneId) ?? [];
    const list = filtered.some((x) => x.event.id === stageId)
      ? filtered
      : index.filter((x) => placeLaneOf(x, ids) === laneId);
    const i = list.findIndex((x) => x.event.id === stageId);
    return {
      t,
      lane: laneById.get(laneId),
      laneId,
      prev: list[i - 1],
      next: list[i + 1],
      position: { index: i + 1, total: list.length },
    };
  }, [stageId, lanes, byLane, index, laneById]);
  const staged = stageInfo !== null && active;
  const stagedRef = useRef(staged);
  stagedRef.current = staged;

  // The river behind keeps the event in view, for when the stage closes.
  useEffect(() => {
    if (!stageInfo) return;
    const view = camera.get();
    const next = ensureVisible(view, stageInfo.t.year, 0.2, DOMAIN);
    if (next !== view) camera.tween(next, reducedMotion ? 0 : RIVER.tweenMs);
    // On a new event only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageInfo?.t.event.id]);

  const closeStage = useCallback(() => {
    const id = stageInfo?.t.event.id;
    navigate.home();
    // Focus goes back to the event's marker, or the river.
    window.setTimeout(() => {
      const marker = id
        ? itemsRef.current?.querySelector<HTMLElement>(
            `[data-river-item="${CSS.escape(id)}"]`,
          )
        : null;
      (marker ?? rootRef.current)?.focus({ preventScroll: true });
    }, 0);
  }, [navigate, stageInfo]);

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
  const laneOrder = useMemo(() => lanes.map((l) => l.id), [lanes]);
  const byLaneClusters = useMemo(() => {
    const map = new Map<string, Cluster[]>();
    for (const c of clusters) {
      const l = map.get(c.lane);
      if (l) l.push(c);
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
    // The stage walks its lane with the same keys.
    if (stagedRef.current) return;
    const w = camera.get();
    const span = w.to - w.from;
    const current = clusters.find((c) => c.key === focusedKey);
    const onMarker = !!current && !!(e.target as HTMLElement).dataset.riverItem;
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

  const toggleGenre = (id: GenreChipId) =>
    navigate.setFrame({
      genres: genres.includes(id)
        ? genres.filter((g) => g !== id)
        : [...genres, id],
    });

  const viewLabel = windowLabel(restView);
  const ready = plotWidth > 1 && riverHeight > 0;
  return (
    <div
      ref={rootRef}
      aria-label={`Music around the world, ${viewLabel}`}
      aria-roledescription="timeline"
      className={cn(
        'relative h-full w-full touch-none select-none overflow-hidden text-atlas-text outline-none transition-[background-color] [transition-timing-function:var(--ease-out)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
        // Leaving for the globe, the page fades as the bands draw back.
        active ? 'bg-atlas-page' : 'bg-transparent',
      )}
      data-staged={staged}
      style={{ transitionDuration: `${RIVER.drawBackMs}ms` }}
      role="region"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerLeave={hideTransient}
      onPointerMove={onPointerMove}
    >
      {ready && (
        <>
          <div className="atlas-river-dim absolute inset-0">
            <PlaceBands
              active={active}
              ancestors={ancestors}
              layout={fan}
              plotLeft={plotLeft}
              plotRight={plotRight}
              reducedMotion={reducedMotion}
              right={size.width + fan.thickness}
              top={RIVER.top}
            />
          </div>

          {/* The cursor: a hairline at the pointer, its year at the foot. */}
          <div
            ref={cursorRef}
            aria-hidden
            className="atlas-river-dim pointer-events-none absolute inset-y-0 left-0 w-0"
            hidden
          >
            <div
              className="absolute w-px bg-white/30"
              style={{ top: RIVER.top - 28, bottom: RIVER.bottom - 22 }}
            />
            <span
              ref={cursorYearRef}
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-bold text-atlas-page"
              style={{ bottom: RIVER.bottom - 36 }}
            />
          </div>

          {/* The markers, clipped to the years, fading out at either end
            rather than cut in half there. */}
          <div
            className="atlas-river-dim atlas-river-plot absolute inset-y-0 overflow-hidden"
            style={{ left: plotLeft, width: plotWidth }}
            {...(staged ? { inert: '' } : {})}
          >
            <div
              ref={itemsRef}
              className="atlas-river-items"
              data-shown={active}
              style={{ left: -plotLeft }}
            >
              <RiverMarkers
                focusedKey={focusedKey}
                laneHeight={fan.thickness}
                markers={markers}
                narrow={narrow}
                top={RIVER.top}
                onActivate={onActivate}
                onFocusKey={setFocusedKey}
                onHover={onHover}
              />
            </div>
          </div>

          <div className="atlas-river-dim" {...(staged ? { inert: '' } : {})}>
            {/* The lanes' names, at the right on their bands: open one to
              split it into its parts. */}
            {fan.lanes.map((g) => {
              const lane = laneById.get(g.id)!;
              const count = byLane.get(g.id)?.length ?? 0;
              const className = cn(
                'absolute right-0 flex -translate-y-1/2 items-center justify-end gap-1 rounded-full text-right font-bold leading-tight text-white transition-[top,opacity] duration-700 ease-in-out [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]',
                narrow
                  ? 'pl-1 pr-2 text-xs'
                  : cn('pl-3 pr-4', g.thickness > 60 ? 'text-base' : 'text-sm'),
                active ? 'opacity-100' : 'opacity-0',
              );
              const style = { top: RIVER.top + g.y, maxWidth: gutter };
              const name = (
                <span className="flex min-w-0 flex-col items-end">
                  <span
                    className={cn(
                      'text-right',
                      // Two balanced lines where a band has room; one, cut
                      // short, on a thin one, so names never run into their
                      // neighbours.
                      g.thickness >= 40
                        ? 'line-clamp-2 [text-wrap:balance]'
                        : 'truncate',
                    )}
                  >
                    {lane.label}
                  </span>
                  {g.thickness > 48 && (
                    <span className="whitespace-nowrap text-xs font-normal text-white/80">
                      {count.toLocaleString('en-US')}
                      {!narrow && (count === 1 ? ' moment' : ' moments')}
                    </span>
                  )}
                </span>
              );
              return lane.splits ? (
                <button
                  key={g.id}
                  aria-label={`Open ${lane.label} into its ${
                    lane.depth === 1 ? 'regions' : 'cities'
                  }`}
                  className={cn(className, 'hover:bg-white/10', ATLAS_FOCUS)}
                  style={style}
                  title={`Open ${lane.label}`}
                  type="button"
                  onClick={() => splitLane(lane)}
                >
                  {name}
                  <ChevronRight aria-hidden className="size-4 shrink-0" />
                </button>
              ) : (
                <span key={g.id} className={className} style={style}>
                  {name}
                </span>
              );
            })}

            {/* Each split in the fan: a node on its strand, and a chip to
              fold it back. */}
            {splits.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'absolute transition-[top,opacity] duration-500 [transition-timing-function:var(--ease-in-out)]',
                  active ? 'opacity-100' : 'opacity-0',
                )}
                style={{ left: stages[s.depth - 1], top: RIVER.top + s.y }}
              >
                <span
                  aria-hidden
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                />
                <button
                  aria-label={`Close ${s.label}`}
                  className={cn(
                    'absolute left-1.5 top-0 flex -translate-y-[130%] items-center gap-1 whitespace-nowrap rounded-full border border-white/25 bg-atlas-page/80 px-2 py-0.5 text-xs font-bold text-white transition-colors hover:border-white/50 hover:bg-atlas-page',
                    ATLAS_FOCUS,
                  )}
                  title={`Gather ${s.label} back into one lane`}
                  type="button"
                  onClick={() => mergeInto(s.id)}
                >
                  {s.label}
                  <X aria-hidden className="size-3 opacity-70" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="atlas-river-dim" {...(staged ? { inert: '' } : {})}>
        {/* The years at either end. */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-6 top-5 text-atlas-text transition-opacity duration-300',
            !active && 'opacity-0',
          )}
        >
          <span ref={fromRef} className="atlas-river-bookend" />
        </div>
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-6 top-5 text-atlas-text transition-opacity duration-300',
            !active && 'opacity-0',
          )}
        >
          <span ref={toRef} className="atlas-river-bookend" />
        </div>

        {/* The genres, as Dorot's topic chips: filters, not lanes. */}
        <div
          ref={chipsRef}
          aria-label="Genres"
          className={cn(
            'atlas-river-scroller absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 overflow-x-auto px-1 py-1 transition-opacity duration-300 [scrollbar-width:none]',
            !active && 'opacity-0',
            narrow
              ? 'top-[4.5rem] max-w-[calc(100%-1rem)]'
              : 'top-7 max-w-[calc(100%-22rem)]',
          )}
          role="group"
        >
          {/* First, so it never scrolls out of reach. */}
          {genres.length > 0 && (
            <button
              className={cn(
                'h-8 shrink-0 rounded-full px-3 text-sm font-bold text-atlas-text underline-offset-2 hover:underline',
                ATLAS_FOCUS,
              )}
              type="button"
              onClick={() => navigate.setFrame({ genres: [] })}
            >
              Reset
            </button>
          )}
          {GENRE_CHIPS.map((chip) => {
            const on = genres.includes(chip.id);
            return (
              <button
                key={chip.id}
                aria-pressed={on}
                className={cn(
                  'h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm transition-colors',
                  on
                    ? 'border-white bg-white font-bold text-atlas-page'
                    : 'border-white/15 bg-white/[0.04] text-atlas-text-2 hover:border-white/30 hover:text-atlas-text',
                  ATLAS_FOCUS,
                )}
                type="button"
                onClick={() => toggleGenre(chip.id)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <RiverTooltip store={hover} />

      <AnimatePresence>
        {staged && ready && stageInfo.lane && (
          <EventStage
            key="stage"
            colors={[stageInfo.lane.color, stageInfo.lane.colorEnd]}
            from={{
              top:
                RIVER.top +
                (laneY.get(stageInfo.laneId) ?? riverHeight / 2) -
                fan.thickness / 2,
              height: fan.thickness,
            }}
            item={stageInfo.t}
            laneLabel={stageInfo.lane.label}
            narrow={narrow}
            next={stageInfo.next}
            position={stageInfo.position}
            prev={stageInfo.prev}
            reducedMotion={reducedMotion}
            stage={
              narrow
                ? { top: 72, height: Math.max(320, size.height - 72 - 150) }
                : {
                    top: RIVER.top + riverHeight * 0.03,
                    height: riverHeight * 0.88,
                  }
            }
            onClose={closeStage}
            onShowOnGlobe={() => navigate.setFrame({ view: 'map' })}
            onStep={(to) =>
              navigate.go({ kind: 'event', eventId: to.event.id })
            }
          />
        )}
      </AnimatePresence>

      {/* Dorot's little globe, bottom left: the same years on the map. */}
      <GlobeCornerButton />

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
