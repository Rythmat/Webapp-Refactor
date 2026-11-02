import { Pause, Play } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { OrbitalCore } from './OrbitalCore';
import { slotAngle, type OrbitGeometry, type OrbitRing } from './orbitSlots';
import './orbital.css';

/**
 * Nodes on slowly turning rings around a still core. It knows nothing about
 * what the nodes are: everything comes in as props, worked out by `orbitSlots`.
 * Colour is the data's; the ink is neutral.
 */

export type OrbitalEmphasis = 'solid' | 'dim' | 'hollow';

export interface OrbitalNode {
  id: string;
  label: string;
  /** What a screen reader says, when the label alone isn't enough. */
  description?: string;
  color: string;
  icon: ComponentType<{ className?: string }>;
  emphasis: OrbitalEmphasis;
  ring: OrbitRing;
  /** Its place on the ring. A ring's slots are filled from 0, without gaps. */
  slot: number;
}

export interface OrbitalLink {
  id: string;
  source: string;
  target: string;
  hollow?: boolean;
}

const NOTHING: ReadonlySet<string> = new Set();
/** As the console's map fades what isn't lit. */
const FADED = 0.2;
const CORE_R = 8;
/** Between the selected node's name and the sheet that would cover it. */
const INSET_GAP = 12;

const slotKey = (ring: OrbitRing, slot: number) => `${ring}:${slot}`;

const isFocusVisible = (element: Element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

const discStyle = (node: OrbitalNode) => ({
  backgroundColor:
    node.emphasis === 'solid'
      ? `color-mix(in srgb, ${node.color} 24%, #141416)`
      : '#141416',
  borderColor:
    node.emphasis === 'dim'
      ? `color-mix(in srgb, ${node.color} 55%, #141416)`
      : node.color,
  borderStyle: node.emphasis === 'hollow' ? 'dashed' : 'solid',
});

export const OrbitalStage = ({
  geometry,
  nodes,
  links,
  selectedId,
  onSelect,
  ariaLabel,
  bornNodes = NOTHING,
  bornLinks = NOTHING,
  footer,
  bottomInset = 0,
}: {
  geometry: OrbitGeometry;
  nodes: readonly OrbitalNode[];
  links: readonly OrbitalLink[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  ariaLabel: string;
  bornNodes?: ReadonlySet<string>;
  bornLinks?: ReadonlySet<string>;
  footer?: ReactNode;
  /** How much of the stage's foot something covers while a node is selected. */
  bottomInset?: number;
}) => {
  const { cx, cy, outerRadius, innerRadius, flatten, capacity } = geometry;
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [shift, setShift] = useState(0);

  const bySlot = useMemo(
    () => new Map(nodes.map((n) => [slotKey(n.ring, n.slot), n])),
    [nodes],
  );
  const used = useMemo(
    () => ({
      inner: nodes.filter((n) => n.ring === 'inner').length,
      outer: nodes.filter((n) => n.ring === 'outer').length,
    }),
    [nodes],
  );
  const radiusOf = (ring: OrbitRing) =>
    ring === 'inner' ? innerRadius : outerRadius;

  /** Where a node sits on the turning piece, before it's flattened. */
  const placeOf = (ring: OrbitRing, slot: number) => {
    const angle = slotAngle(slot, used[ring], ring);
    return {
      x: radiusOf(ring) * Math.cos(angle),
      y: radiusOf(ring) * Math.sin(angle),
    };
  };

  const neighbours = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const { source, target } of links) {
      out.set(source, [...(out.get(source) ?? []), target]);
      out.set(target, [...(out.get(target) ?? []), source]);
    }
    return out;
  }, [links]);
  const lit = hoverId ?? focusId ?? selectedId;
  const litSet = useMemo(
    () => (lit ? new Set([lit, ...(neighbours.get(lit) ?? [])]) : null),
    [lit, neighbours],
  );

  // Something the student is looking at or pointing to holds still. Worked out
  // here, not with :hover and :focus-within, which would stay on after a click.
  const paused = userPaused || Boolean(hoverId ?? focusId ?? selectedId);

  const focusNode = (id: string) => {
    stageRef.current
      ?.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
  };

  // ── Keyboard: one tab stop; arrows walk round a ring and between them ──
  const present = nodes.some((n) => n.id === focusId) ? focusId : null;
  const selectedShown = nodes.some((n) => n.id === selectedId)
    ? selectedId
    : null;
  const first = bySlot.get(slotKey('outer', 0)) ?? bySlot.get('inner:0');
  const tabStop = present ?? selectedShown ?? first?.id ?? null;

  const onNodeKey = (event: KeyboardEvent, node: OrbitalNode) => {
    if (event.key === 'Escape') {
      onSelect(null);
      return;
    }
    let next: OrbitalNode | undefined;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const count = used[node.ring];
      next = bySlot.get(slotKey(node.ring, (node.slot + step + count) % count));
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Up is out, down is in, to whichever node is nearest round the ring.
      const ring: OrbitRing = event.key === 'ArrowUp' ? 'outer' : 'inner';
      if (ring !== node.ring && used[ring] > 0) {
        const from = slotAngle(node.slot, used[node.ring], node.ring);
        let best = Infinity;
        for (let slot = 0; slot < used[ring]; slot++) {
          const turn = Math.abs(slotAngle(slot, used[ring], ring) - from);
          const away = Math.min(turn, Math.PI * 2 - turn);
          if (away < best) {
            best = away;
            next = bySlot.get(slotKey(ring, slot));
          }
        }
      }
    } else {
      return;
    }
    event.preventDefault();
    if (next && next.id !== node.id) {
      setFocusId(next.id);
      focusNode(next.id);
    }
  };

  // Closing a selection gives focus back, unless something else has taken it:
  // to the node, or to whatever took its slot.
  const lastSelected = useRef<OrbitalNode | null>(null);
  useEffect(() => {
    const selected = nodes.find((n) => n.id === selectedId);
    if (selectedId) {
      if (selected) lastSelected.current = selected;
      return;
    }
    const last = lastSelected.current;
    lastSelected.current = null;
    if (!last) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const back = nodes.some((n) => n.id === last.id)
      ? last.id
      : bySlot.get(slotKey(last.ring, last.slot))?.id;
    if (back) focusNode(back);
  }, [selectedId, nodes, bySlot]);

  // A sheet from the foot of the stage mustn't hide the node it's about.
  const shiftRef = useRef(0);
  useLayoutEffect(() => {
    let next = 0;
    if (selectedId && bottomInset > 0 && stageRef.current) {
      const stage = stageRef.current.getBoundingClientRect();
      const node = stageRef.current
        .querySelector(`[data-node="${CSS.escape(selectedId)}"]`)
        ?.getBoundingClientRect();
      if (node) {
        const bottom = node.bottom + shiftRef.current;
        next = Math.max(0, bottom - (stage.bottom - bottomInset) + INSET_GAP);
      }
    }
    shiftRef.current = next;
    setShift(next);
  }, [selectedId, bottomInset]);

  const nodeButton = (node: OrbitalNode) => {
    const Icon = node.icon;
    const selected = node.id === selectedId;
    const faded = litSet ? !litSet.has(node.id) : false;
    return (
      <button
        key={node.id}
        type="button"
        data-node={node.id}
        tabIndex={node.id === tabStop ? 0 : -1}
        aria-label={node.description ?? node.label}
        aria-pressed={selected}
        title={node.label}
        onClick={() => onSelect(selected ? null : node.id)}
        onKeyDown={(event) => onNodeKey(event, node)}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHoverId(node.id);
        }}
        onPointerLeave={() => setHoverId(null)}
        // Keyboard focus only: a click mustn't leave a node lit, or held still.
        onFocus={(event) => {
          if (isFocusVisible(event.currentTarget)) setFocusId(node.id);
        }}
        onBlur={() => setFocusId(null)}
        style={{ opacity: faded ? FADED : 1 }}
        className="group pointer-events-auto absolute left-0 top-[-1.125rem] flex -translate-x-1/2 cursor-pointer flex-col items-center outline-none transition-opacity duration-150"
      >
        <span
          className={cn(
            'flex flex-col items-center',
            bornNodes.has(node.id) && 'orbital-node-born',
          )}
        >
          <span
            style={discStyle(node)}
            className={cn(
              'flex size-9 items-center justify-center rounded-full border-[1.5px] transition-shadow duration-150',
              (selected || node.id === focusId) &&
                'shadow-[0_0_0_2px_#101012,0_0_0_3.5px_white]',
            )}
          >
            <Icon
              className={cn(
                'size-4 transition-colors duration-150',
                node.emphasis === 'solid' || selected
                  ? 'text-white'
                  : 'text-white/60 group-hover:text-white',
              )}
            />
          </span>
          <span
            style={{ textShadow: '0 0 0.25rem #101012, 0 0 0.25rem #101012' }}
            className={cn(
              'mt-1 max-w-[5rem] truncate text-center text-xs leading-4 sm:max-w-[6.25rem]',
              selected ? 'font-bold text-white' : 'text-white/75',
            )}
          >
            {node.label}
          </span>
        </span>
      </button>
    );
  };

  const slots = (ring: OrbitRing) =>
    Array.from({ length: capacity[ring] }, (_, slot) => {
      const node = bySlot.get(slotKey(ring, slot));
      const { x, y } = node ? placeOf(ring, slot) : { x: 0, y: 0 };
      // Empty slots mount too, and turn with the rest: a node arriving later
      // takes one up, already upright. Only its button is new.
      return (
        <div
          key={slotKey(ring, slot)}
          data-slot={slotKey(ring, slot)}
          className="orbital-slot absolute left-0 top-0"
          style={{ transform: `translate(${x}px, ${y}px)` }}
        >
          <div className="orbital-upright">
            <div style={{ transform: `scaleY(${1 / flatten})` }}>
              {node && nodeButton(node)}
            </div>
          </div>
        </div>
      );
    });

  const placed = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div
      ref={stageRef}
      role="group"
      aria-label={ariaLabel}
      data-paused={paused}
      data-testid="orbital-stage"
      className="orbital-stage relative size-full select-none"
      style={{ overflow: 'clip' }}
      onClick={(event) => {
        if (!(event.target as Element).closest('button')) onSelect(null);
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-200"
        style={{ transform: shift ? `translateY(${-shift}px)` : undefined }}
      >
        <svg aria-hidden className="absolute inset-0 size-full">
          {(['outer', 'inner'] as const).map((ring) =>
            (used[ring] > 0 || (ring === 'outer' && nodes.length === 0)) &&
            radiusOf(ring) > 0 ? (
              <ellipse
                key={ring}
                cx={cx}
                cy={cy}
                rx={radiusOf(ring)}
                ry={radiusOf(ring) * flatten}
                fill="none"
                stroke="white"
                strokeOpacity={ring === 'outer' ? 0.09 : 0.06}
              />
            ) : null,
          )}
        </svg>
        <div
          className="absolute size-0"
          style={{ left: cx, top: cy, transform: `scaleY(${flatten})` }}
        >
          {/* Restarted with its capacity, so every slot begins together. */}
          <div
            key={`${capacity.inner}:${capacity.outer}`}
            className="orbital-rotator pointer-events-none absolute left-0 top-0 size-0"
          >
            <svg
              aria-hidden
              width={1}
              height={1}
              className="absolute left-0 top-0 overflow-visible"
            >
              {links.map((link) => {
                const from = placed.get(link.source);
                const to = placed.get(link.target);
                if (!from || !to) return null;
                const a = placeOf(from.ring, from.slot);
                const b = placeOf(to.ring, to.slot);
                const on = litSet
                  ? litSet.has(link.source) && litSet.has(link.target)
                  : false;
                const born = bornLinks.has(link.id);
                return (
                  <line
                    key={link.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    pathLength={1}
                    stroke="white"
                    strokeOpacity={on ? 0.7 : litSet ? 0.04 : 0.13}
                    strokeWidth={1.5}
                    strokeDasharray={
                      link.hollow && !born ? '0.04 0.03' : undefined
                    }
                    className={born ? 'orbital-link-born' : undefined}
                    style={{ transition: 'stroke-opacity 150ms ease-out' }}
                  />
                );
              })}
            </svg>
            {slots('inner')}
            {slots('outer')}
          </div>
        </div>
        {/* Over the lines, so none of them seems to end at it. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        >
          <OrbitalCore r={CORE_R} cx={cx} cy={cy} />
        </svg>
      </div>
      <button
        type="button"
        aria-label={userPaused ? 'Keep turning' : 'Hold still'}
        title={userPaused ? 'Keep turning' : 'Hold still'}
        onClick={() => setUserPaused((was) => !was)}
        className="absolute right-2 top-12 flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#141416] text-white/60 outline-none transition-colors duration-150 hover:bg-[#1f1f22] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:hidden"
      >
        {userPaused ? (
          <Play className="size-4" />
        ) : (
          <Pause className="size-4" />
        )}
      </button>
      {footer && <div className="absolute bottom-2 right-2">{footer}</div>}
    </div>
  );
};
