import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import { useAtlasMap } from '@/components/atlas/components/Globe/mapHandle';
import {
  ATLAS_FOCUS,
  ATLAS_LINK,
} from '@/components/atlas/components/UI/primitives';
import { ERA_HEX } from '@/components/atlas/data/musicalEras';
import { CONTINENTS } from '@/components/atlas/data/placeTree';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import {
  useIsPhone,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { stopScope } from '@/components/atlas/stats/stopScope';
import {
  ROOTS_RAMP,
  ROUTES_RAMP,
  SUN_WHITE,
  withAlpha,
} from '@/components/atlas/theme/marks';
import { ATLAS_MS } from '@/components/atlas/theme/motion';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import { cn } from '@/lib/utils';
import { ringData } from './ringData';
import {
  labelRoom,
  nameLength,
  ringCapacity,
  ringKey,
  ringLayout,
} from './ringLayout';

/** The morph between the map and the ring, ms. */
export const RING_MORPH_MS = ATLAS_MS.morph;

const CONTINENT = new Map(CONTINENTS.map((c) => [c.id, c]));

/**
 * Where the places are: `start` where the map has them, still; `ring`
 * moving to their seats; `leave` moving back to the map.
 */
type Phase = 'start' | 'ring' | 'leave';

/**
 * The Connections view (owner, 2026-10-29: Map + Ring, after the network
 * reference's map that turns into a ring): the busiest places in the years
 * shown round a circle, grouped by continent and region, each a dot in a
 * halo as big as its music; the links between them as chords bowed through
 * the middle, as thick as they are strong, coloured the way they ran. The
 * places grow out of where the map shows them and go back there when the
 * map returns. A place opens as on the map, staying in this view.
 */
export default function RingView({ active }: { active: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () =>
      setArea({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const insets = useAtlasSelector((s) => s.mapInsets);
  const phone = useIsPhone();
  const reduced = usePrefersReducedMotion();
  const w = useAtlasSelector((s) => s.timeWindow);
  const stop = useAtlasStop();
  const key = stopKey(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => stopScope(stop), [key]);
  const network = useNetwork();
  const navigate = useAtlasNavigate();
  const dispatch = useAtlasDispatch();
  const signals = useStageSignals();
  const mapHandle = useAtlasMap();

  const size = Math.max(0, Math.min(area.width, area.height));
  const capacity = ringCapacity(size / 2 - labelRoom(size), phone);
  const longest = nameLength(size);
  const data = useMemo(
    () =>
      network.index
        ? ringData(network.index, getTimelineIndex(), w, scope, capacity)
        : null,
    [network.index, w, scope, capacity],
  );
  const layout = useMemo(
    () =>
      data && size > 0
        ? ringLayout({
            places: data.places,
            links: data.links,
            focus: data.focus,
            size,
          })
        : null,
    [data, size],
  );

  // The morph: on arriving, the places start where the map has them and
  // move to their seats; on leaving, they go back.
  const [phase, setPhase] = useState<Phase>(reduced ? 'ring' : 'start');
  const [from, setFrom] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );
  const ready = !!layout;
  // Before paint, so no frame shows the places anywhere else.
  useLayoutEffect(() => {
    if (!ready) return;
    if (reduced) {
      setPhase('ring');
      return;
    }
    const handle = mapHandle?.current;
    const box = boxRef.current;
    if (handle && box && data) {
      const mapBox = handle.container().getBoundingClientRect();
      const ringBox = box.getBoundingClientRect();
      const points = handle.project(
        data.places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
      );
      setFrom(
        new Map(
          points.map((p) => [
            p.id,
            p.visible
              ? {
                  x: mapBox.left + p.x - ringBox.left,
                  y: mapBox.top + p.y - ringBox.top,
                }
              : // From the far side of the globe: out of the middle.
                { x: size / 2, y: size / 2 },
          ]),
        ),
      );
    }
    if (!active) {
      setPhase('leave');
      return;
    }
    // One frame at the map's positions, then to the seats.
    setPhase('start');
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase('ring'));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
    // Only when the view comes or goes, or the ring first has its places.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ready, reduced]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!active) setHovered(null);
  }, [active]);

  const years = w ? windowLabel(w) : 'all years';
  const shown = phase === 'ring';
  const move = (ms: number) =>
    reduced || phase === 'start'
      ? 'none'
      : `transform ${ms}ms cubic-bezier(0.45, 0, 0.25, 1)`;
  const late: CSSProperties = {
    opacity: shown ? 1 : 0,
    transition: reduced
      ? 'none'
      : `opacity ${ATLAS_MS.base * 2}ms ease ${shown ? RING_MORPH_MS * 0.6 : 0}ms`,
  };

  const pos = (id: string, x: number, y: number) => {
    if (shown) return { x, y };
    return from.get(id) ?? { x: size / 2, y: size / 2 };
  };

  const hover = (id: string | null, x = 0, y = 0) => {
    setHovered(id);
    if (!id || !id.startsWith('city:')) {
      signals.placeHover.set(null);
      return;
    }
    const box = boxRef.current?.getBoundingClientRect();
    signals.placeHover.set({
      target: { kind: 'place', id: id.slice('city:'.length) },
      anchor: { x: (box?.left ?? 0) + x, y: (box?.top ?? 0) + y },
    });
  };

  const focusIds = data?.focus ?? new Set<string>();
  const anyFocus = focusIds.size > 0;
  const nodes = layout?.nodes ?? [];

  return (
    <div
      className={cn(
        'absolute inset-0 transition-[background-color] duration-500 motion-reduce:transition-none',
        shown ? 'bg-atlas-panel' : 'bg-atlas-panel/0',
      )}
      data-atlas-ring
    >
      <div
        ref={areaRef}
        className="absolute"
        style={{
          left: insets.left + 8,
          right: insets.right + 8,
          top: insets.top + 8,
          bottom: insets.bottom + 8,
        }}
      >
        {network.status === 'error' ? (
          <Centered>
            The links didn’t load.{' '}
            <button
              className={ATLAS_LINK}
              type="button"
              onClick={network.retry}
            >
              Try again
            </button>
          </Centered>
        ) : !layout ? (
          <Centered>
            <SpectrumBar className="w-48" label="Loading the connections" />
          </Centered>
        ) : nodes.length < 3 ? (
          <Centered>
            Too few places with music in {years}.{' '}
            <button
              className={ATLAS_LINK}
              type="button"
              onClick={() => dispatch({ type: 'SET_WINDOW', payload: null })}
            >
              Show all years
            </button>
          </Centered>
        ) : (
          <div
            ref={boxRef}
            className="relative mx-auto"
            style={{
              width: size,
              height: size,
              top: (area.height - size) / 2,
            }}
          >
            <svg
              aria-hidden
              className="absolute inset-0 overflow-visible"
              height={size}
              width={size}
            >
              <defs>
                {layout.chords.map((c) => {
                  const into = anyFocus && c.focus && focusIds.has(c.to);
                  const ramp = into ? ROOTS_RAMP : ROUTES_RAMP;
                  return (
                    <linearGradient
                      key={c.id}
                      gradientUnits="userSpaceOnUse"
                      id={`ring-${c.id}`}
                      x1={c.x1}
                      x2={c.x2}
                      y1={c.y1}
                      y2={c.y2}
                    >
                      {ramp.map((color, i) => (
                        <stop
                          key={color}
                          offset={i / (ramp.length - 1)}
                          stopColor={color}
                        />
                      ))}
                    </linearGradient>
                  );
                })}
              </defs>
              <g style={late}>
                {layout.arcs.map((arc) => {
                  const c = CONTINENT.get(arc.continent);
                  // Well inside the dots, clear of the names outside them.
                  const r = layout.radius * 0.68;
                  return (
                    <g key={arc.id}>
                      <path
                        d={arc.d}
                        fill="none"
                        stroke={c?.color}
                        strokeLinecap="round"
                        strokeOpacity={0.75}
                        strokeWidth={3}
                      />
                      {arc.span > 0.3 && size >= 520 && (
                        <text
                          fill="rgb(255 255 255 / 0.32)"
                          fontSize={11}
                          letterSpacing="0.18em"
                          textAnchor="middle"
                          x={layout.cx + r * Math.cos(arc.mid)}
                          y={layout.cy + r * Math.sin(arc.mid)}
                        >
                          {arc.label.toUpperCase()}
                        </text>
                      )}
                    </g>
                  );
                })}
                {layout.chords.map((c) => {
                  const touches =
                    hovered !== null &&
                    (c.from === hovered || c.to === hovered);
                  const opacity =
                    hovered !== null
                      ? touches
                        ? 1
                        : 0.12
                      : anyFocus
                        ? c.focus
                          ? 0.95
                          : 0.3
                        : 0.7;
                  return (
                    <path
                      key={c.id}
                      className={cn(
                        'transition-opacity duration-200',
                        c.weak && active && !reduced && 'atlas-march',
                      )}
                      d={c.d}
                      fill="none"
                      opacity={opacity}
                      stroke={`url(#ring-${c.id})`}
                      strokeDasharray={c.weak ? '2 4' : undefined}
                      strokeLinecap={c.weak ? 'butt' : 'round'}
                      strokeWidth={c.width}
                    />
                  );
                })}
                {layout.chords
                  .filter((c) => c.pill)
                  .map((c) => {
                    const text = String(c.weight + c.back);
                    const wpx = 8 + text.length * 7;
                    return (
                      <g key={c.id} transform={`translate(${c.mx} ${c.my})`}>
                        <rect
                          fill="rgb(20 22 30 / 0.92)"
                          height={18}
                          rx={6}
                          stroke="rgb(255 255 255 / 0.2)"
                          width={wpx}
                          x={-wpx / 2}
                          y={-9}
                        />
                        <text
                          dominantBaseline="central"
                          fill="white"
                          fontSize={11}
                          fontWeight={700}
                          textAnchor="middle"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })}
              </g>
              {nodes.map((n) => {
                const p = pos(n.id, n.x, n.y);
                const lit = focusIds.has(n.id) || hovered === n.id;
                return (
                  <g
                    key={n.id}
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px)`,
                      transition: move(RING_MORPH_MS),
                    }}
                  >
                    <circle
                      fill={withAlpha(n.era ? ERA_HEX[n.era] : SUN_WHITE, 0.4)}
                      r={n.halo}
                    />
                    <circle fill="white" r={lit ? 4 : 2.5} />
                    {lit && (
                      <circle
                        fill="none"
                        r={n.halo + 3}
                        stroke="white"
                        strokeOpacity={0.6}
                      />
                    )}
                  </g>
                );
              })}
              <g style={late}>
                {nodes.map((n) => {
                  const deg = (n.angle * 180) / Math.PI + (n.flip ? 180 : 0);
                  const lit = focusIds.has(n.id) || hovered === n.id;
                  return (
                    <text
                      key={n.id}
                      dominantBaseline="central"
                      fill={lit ? 'white' : 'rgb(255 255 255 / 0.72)'}
                      fontSize={12}
                      fontWeight={lit ? 700 : 400}
                      textAnchor={n.flip ? 'end' : 'start'}
                      transform={`translate(${n.x} ${n.y}) rotate(${deg})`}
                      x={n.flip ? -n.halo - 6 : n.halo + 6}
                    >
                      {n.label.length > longest
                        ? `${n.label.slice(0, longest - 1)}…`
                        : n.label}
                    </text>
                  );
                })}
              </g>
            </svg>
            <div
              aria-label={`Connections between the ${nodes.length} busiest places, ${years}`}
              className="absolute inset-0"
              role="group"
              onPointerLeave={() => hover(null)}
            >
              {nodes.map((n, i) => {
                const p = pos(n.id, n.x, n.y);
                const links = layout.chords.filter(
                  (c) => c.from === n.id || c.to === n.id,
                ).length;
                return (
                  <button
                    key={n.id}
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    aria-current={focusIds.has(n.id) ? 'true' : undefined}
                    aria-label={`${n.label}: ${n.events} events, linked to ${links} ${links === 1 ? 'place' : 'places'} here`}
                    className={cn(
                      'absolute left-0 top-0 size-7 rounded-full',
                      ATLAS_FOCUS,
                    )}
                    data-ring-node={n.id}
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`,
                      transition: move(RING_MORPH_MS),
                    }}
                    tabIndex={i === cursor ? 0 : -1}
                    type="button"
                    onBlur={() => hover(null)}
                    onClick={() => {
                      const node = network.index?.node(n.id);
                      if (node?.place) navigate.toPlace(node.place);
                    }}
                    onFocus={() => {
                      setCursor(i);
                      hover(n.id, n.x, n.y);
                    }}
                    onKeyDown={(e) => {
                      const to = ringKey(e.key, i, nodes);
                      if (to === null) return;
                      e.preventDefault();
                      setCursor(to);
                      buttons.current[to]?.focus();
                    }}
                    onPointerEnter={() => hover(n.id, n.x, n.y)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-atlas-text-2">
      <p>{children}</p>
    </div>
  );
}
