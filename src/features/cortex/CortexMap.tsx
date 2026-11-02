import { Maximize2, Minus, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { OrbitalCore } from '@/components/orbital/OrbitalCore';
import { neighboursOf, type CortexWeb, type WebNode } from './buildWeb';
import { nodeRadius, placeLabels } from './labels';
import {
  fitView,
  MAX_ZOOM,
  MIN_ZOOM,
  type Positions,
  type View,
} from './layout';
import { NODE_COLOR } from './nodeMeta';
import type { CortexView } from './useCortexView';

/**
 * The map. Dots and lines keep their place in the web's own coordinates, and
 * the names are worked out in screen space, always at 12px, once the view
 * comes to rest. One finger scrolls the page on a phone; two pan and pinch.
 * The web's middle, its core, stays at the origin.
 */

const ZOOM_STEP = 1.3;
/** A press that moves further than this is a drag, not a click. */
const DRAG_PX = 4;
const LABELS_REST_MS = 120;
const ORIGIN = { x: 0, y: 0 };
/** As the console's map fades what isn't lit. */
const FADED = 0.2;
const FADE = 'opacity 150ms ease-out';
/** Past this many, a fade would restyle too much at once to stay smooth. */
const FADE_MAX_NODES = 150;
/** The faint rings the web grows out through, in the web's own units. */
const GUIDE_STEP = 130;
const CORE_R = 8;

const clampZoom = (k: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));

/** The nearest node the arrow points at, for keyboard use. */
const nodeInDirection = (
  from: string,
  key: string,
  nodes: readonly WebNode[],
  positions: Positions,
): string | null => {
  const origin = positions[from];
  if (!origin) return null;
  const axis = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }[key];
  if (!axis) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const node of nodes) {
    if (node.id === from) continue;
    const p = positions[node.id];
    if (!p) continue;
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const along = dx * axis[0] + dy * axis[1];
    if (along <= 0) continue;
    const across = Math.abs(dx * axis[1]) + Math.abs(dy * axis[0]);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = node.id;
    }
  }
  return best;
};

export const CortexMap = ({
  web,
  view: layout,
  selectedId,
  onSelect,
}: {
  web: CortexWeb;
  view: CortexView;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const { positions, bornNodes, bornLinks } = layout;
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View | null>(null);
  // The view the names were last placed for: while panning they ride along,
  // and they're placed again once it rests.
  const [restedView, setRestedView] = useState<View | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const moved = useRef(false);
  const fitted = useRef(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () =>
      setSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Fit the first time it's laid out, and as long as they haven't moved it.
  const fit = useCallback(() => {
    if (!positions || size.width === 0) return;
    setView(fitView(positions, size.width, size.height, ORIGIN));
  }, [positions, size.width, size.height]);
  useEffect(() => {
    if (!positions || size.width === 0) return;
    if (fitted.current && moved.current) return;
    fitted.current = true;
    fit();
  }, [positions, size.width, fit]);

  useEffect(() => {
    if (!view) return;
    const timer = setTimeout(() => setRestedView(view), LABELS_REST_MS);
    return () => clearTimeout(timer);
  }, [view]);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    moved.current = true;
    setView((was) => {
      if (!was) return was;
      const k = clampZoom(was.k * factor);
      const scale = k / was.k;
      return {
        k,
        x: cx - (cx - was.x) * scale,
        y: cy - (cy - was.y) * scale,
      };
    });
  }, []);

  // A trackpad pinch arrives as a ctrl-wheel. A plain wheel still scrolls.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(
        Math.exp(-event.deltaY * 0.01),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // ── Dragging, and two fingers ──
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pressMoved = useRef(false);
  const lastPinch = useRef<{ distance: number } | null>(null);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pressMoved.current = false;
    lastPinch.current = null;
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const was = pointers.current.get(event.pointerId);
    if (!was) return;
    const dx = event.clientX - was.x;
    const dy = event.clientY - was.y;
    const now = { x: event.clientX, y: event.clientY };

    if (event.pointerType === 'touch') {
      // One finger belongs to the page; two move the map.
      if (pointers.current.size < 2) return;
      pointers.current.set(event.pointerId, now);
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = event.currentTarget.getBoundingClientRect();
      if (lastPinch.current && lastPinch.current.distance > 0) {
        zoomAt(
          distance / lastPinch.current.distance,
          (a.x + b.x) / 2 - rect.left,
          (a.y + b.y) / 2 - rect.top,
        );
      }
      lastPinch.current = { distance };
      pressMoved.current = true;
      setView((v) => (v ? { ...v, x: v.x + dx / 2, y: v.y + dy / 2 } : v));
      return;
    }

    if (!pressMoved.current && Math.hypot(dx, dy) < DRAG_PX) return;
    if (!pressMoved.current) {
      pressMoved.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    moved.current = true;
    pointers.current.set(event.pointerId, now);
    setView((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };

  const endPointer = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    lastPinch.current = null;
  };

  // ── What's lit ──
  const neighbours = useMemo(() => neighboursOf(web), [web]);
  const degrees = useMemo(() => {
    const out = new Map<string, number>();
    for (const [id, list] of neighbours) out.set(id, list.length);
    return out;
  }, [neighbours]);
  const lit = hoverId ?? focusId ?? selectedId;
  const litSet = useMemo(
    () => (lit ? new Set([lit, ...(neighbours.get(lit) ?? [])]) : null),
    [lit, neighbours],
  );

  const labels = useMemo(() => {
    if (!positions || !restedView) return [];
    return placeLabels(
      web.nodes,
      positions,
      degrees,
      restedView,
      size.width,
      size.height,
      litSet ?? undefined,
      lit,
    );
  }, [web.nodes, positions, degrees, restedView, size, litSet, lit]);

  // Keyboard: one tab stop, arrows walk the map.
  const tabStop = focusId ?? selectedId ?? web.nodes[0]?.id ?? null;
  const onNodeKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
      return;
    }
    if (event.key === 'Escape') {
      onSelect(null);
      return;
    }
    if (!positions) return;
    const next = nodeInDirection(id, event.key, web.nodes, positions);
    if (!next) return;
    event.preventDefault();
    setFocusId(next);
    svgRef.current
      ?.querySelector<SVGGElement>(`[data-node="${CSS.escape(next)}"]`)
      ?.focus();
  };

  const sentences = useMemo(() => {
    const names = new Map(web.nodes.map((n) => [n.id, n.label]));
    return web.links
      .filter((l) => !l.hollow)
      .map((l) => `${names.get(l.source)} connects to ${names.get(l.target)}`);
  }, [web]);

  const k = view?.k ?? 1;
  const fade = web.nodes.length <= FADE_MAX_NODES ? FADE : undefined;
  const guides = useMemo(() => {
    if (!positions) return [];
    const reach = Math.max(
      0,
      ...Object.values(positions).map((p) => Math.hypot(p.x, p.y)),
    );
    const out: number[] = [];
    for (let r = GUIDE_STEP; r <= reach + GUIDE_STEP / 2; r += GUIDE_STEP)
      out.push(r);
    return out;
  }, [positions]);
  const rest = restedView ?? view;
  const labelsMatch = rest !== null && view !== null && rest.k === view.k;

  // Kept while the view only pans: panning moves the group around it, and a
  // big web can't redraw every dot and line per frame.
  const world = useMemo(
    () =>
      positions ? (
        <>
          <g aria-hidden pointerEvents="none">
            {guides.map((r) => (
              <circle
                key={r}
                r={r}
                fill="none"
                stroke="white"
                strokeOpacity={0.05}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
          <g>
            {web.links.map((link) => {
              const a = positions[link.source];
              const b = positions[link.target];
              if (!a || !b) return null;
              const on = litSet
                ? litSet.has(link.source) && litSet.has(link.target)
                : false;
              return (
                <line
                  key={link.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  pathLength={1}
                  vectorEffect="non-scaling-stroke"
                  stroke="white"
                  strokeOpacity={on ? 0.7 : litSet ? 0.05 : 0.16}
                  strokeWidth={on ? 1.5 : 1}
                  strokeDasharray={
                    link.hollow && !bornLinks.has(link.id)
                      ? '0.04 0.03'
                      : undefined
                  }
                  style={{
                    transition: fade && 'stroke-opacity 150ms ease-out',
                  }}
                  className={
                    bornLinks.has(link.id) ? 'cortex-link-born' : undefined
                  }
                />
              );
            })}
          </g>
          <OrbitalCore r={CORE_R / k} />
          {web.nodes.map((node) => {
            const p = positions[node.id];
            if (!p) return null;
            const r = nodeRadius(node, degrees.get(node.id) ?? 0, k) / k;
            const color = NODE_COLOR[node.kind];
            const faded = litSet ? !litSet.has(node.id) : false;
            const describe = `${node.label}${node.detail ? `, ${node.detail}` : ''}`;
            return (
              <g
                key={node.id}
                data-node={node.id}
                role="button"
                tabIndex={node.id === tabStop ? 0 : -1}
                aria-label={describe}
                aria-pressed={node.id === selectedId}
                transform={`translate(${p.x} ${p.y})`}
                opacity={faded ? FADED : 1}
                style={{ transition: fade }}
                className="cursor-pointer outline-none"
                onClick={() => {
                  if (!pressMoved.current) onSelect(node.id);
                }}
                onKeyDown={(event) => onNodeKey(event, node.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') setHoverId(node.id);
                }}
                onPointerLeave={() => setHoverId(null)}
                // Keyboard focus only: a click or the page's own focusing
                // mustn't leave a node lit.
                onFocus={(event) => {
                  if (event.currentTarget.matches(':focus-visible'))
                    setFocusId(node.id);
                }}
                onBlur={() => setFocusId(null)}
              >
                <g
                  className={
                    bornNodes.has(node.id) ? 'cortex-node-born' : undefined
                  }
                >
                  {/* A bigger target than the dot, for fingers. */}
                  <circle r={Math.max(r, 12 / k)} fill="transparent" />
                  {(node.id === selectedId || node.id === focusId) && (
                    <circle
                      r={r + 4 / k}
                      fill="none"
                      stroke="white"
                      strokeOpacity={0.8}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {node.hollow ? (
                    <circle
                      r={r}
                      fill="#101012"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : node.role === 'concept' ? (
                    <circle
                      r={r}
                      fill={color}
                      stroke="white"
                      strokeOpacity={0.35}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : (
                    <circle
                      r={r}
                      fill={color}
                      fillOpacity={node.done ? 1 : 0.42}
                      stroke={color}
                      strokeOpacity={node.done ? 0 : 0.7}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              </g>
            );
          })}
        </>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handlers only close over what's listed
    [
      web,
      positions,
      guides,
      fade,
      k,
      litSet,
      bornNodes,
      bornLinks,
      degrees,
      selectedId,
      focusId,
      tabStop,
    ],
  );

  return (
    <div ref={boxRef} className="relative size-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        role="group"
        aria-label={`Your Cortex: ${web.activityCount} activities, ${web.connectionCount} connections`}
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: 'pan-x pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pressMoved.current)
            onSelect(null);
        }}
      >
        {positions && view && (
          <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
            {world}
          </g>
        )}
        {/* The names ride along while it pans and wait out a zoom. */}
        {positions && view && restedView && labelsMatch && (
          <g
            aria-hidden
            pointerEvents="none"
            transform={`translate(${view.x - restedView.x} ${view.y - restedView.y})`}
          >
            {labels.map((label) => {
              const faded = litSet ? !litSet.has(label.id) : false;
              return (
                <text
                  key={label.id}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#e8e8f0"
                  opacity={faded ? FADED : 0.9}
                  style={{ paintOrder: 'stroke', transition: fade }}
                  stroke="#101012"
                  strokeWidth={3}
                >
                  {label.text}
                </text>
              );
            })}
          </g>
        )}
      </svg>
      <ul className="sr-only">
        {sentences.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>
      {positions && view && (
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-full border border-white/10 bg-[#141416]">
          {[
            {
              label: 'Zoom in',
              Icon: Plus,
              run: () => zoomAt(ZOOM_STEP, size.width / 2, size.height / 2),
            },
            {
              label: 'Zoom out',
              Icon: Minus,
              run: () => zoomAt(1 / ZOOM_STEP, size.width / 2, size.height / 2),
            },
            {
              label: 'Show all of it',
              Icon: Maximize2,
              run: () => {
                moved.current = false;
                fit();
              },
            },
          ].map(({ label, Icon, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={run}
              className="flex size-9 items-center justify-center text-white/60 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
