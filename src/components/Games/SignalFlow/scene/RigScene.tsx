import { motion, useReducedMotion } from 'framer-motion';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { project, projectOffset, type V2 } from '@/curriculum/anatomy/iso';
import type { RigAudio } from '../audio/rigAudio';
import type { GearPart, GearVisual } from '../gear/shapes';
import { gearVisual } from '../gear/visuals';
import { gearDef, gearName } from '../rig/gearDefs';
import type { MissionState } from '../rig/missionReducer';
import type { Cable, GearInstance, PortRef } from '../rig/rigTypes';
import {
  CABLE_WIDTH,
  cablePath,
  pageDirection,
  plugDrawing,
  plugTail,
} from './cablePath';

// ── The bench ──────────────────────────────────────────────────────────────
// Every piece of gear, then the cables, then the jacks on top, all in one SVG.
// Levels change every frame and React doesn't hear about it: one frame callback
// reads the rig's meters and writes straight to the cables and speakers.

const SCENE_CSS = `
.rig-line { vector-effect: non-scaling-stroke; fill: none; stroke: var(--rig-ink, rgba(255,255,255,0.86)); stroke-linejoin: round; stroke-linecap: round; pointer-events: none; }
.rig-face { fill: var(--rig-face, #121215); stroke: none; pointer-events: none; }
.rig-gear[data-dim='true'] { --rig-ink: rgba(255,255,255,0.3); }
.rig-gear[data-swap='true'] { --rig-ink: var(--rig-accent); }
.rig-gear[data-lit='true'] { --rig-ink: rgba(255,255,255,1); }
.rig-cable { vector-effect: non-scaling-stroke; fill: none; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.rig-cable-new { animation: rig-cable-in 0.22s ease-out; }
@keyframes rig-cable-in { from { opacity: 0; } }
.rig-cable-hit { vector-effect: non-scaling-stroke; fill: none; stroke: transparent; stroke-width: 18px; pointer-events: stroke; cursor: pointer; }
.rig-cable-hit:focus-visible + .rig-cable-focus { opacity: 1; }
.rig-cable-focus { opacity: 0; vector-effect: non-scaling-stroke; fill: none; stroke: #fff; stroke-width: 1px; stroke-dasharray: 3 3; pointer-events: none; }
.rig-jack { cursor: pointer; outline: none; touch-action: none; }
.rig-jack-ring { vector-effect: non-scaling-stroke; fill: transparent; stroke: var(--rig-accent); stroke-width: 1.5px; opacity: 0; transition: opacity 0.15s ease; }
.rig-jack:hover .rig-jack-ring, .rig-jack:focus-visible .rig-jack-ring { opacity: 1; }
.rig-jack[data-fits='true'] .rig-jack-ring { opacity: 0.85; animation: rig-jack-pulse 1.3s ease-in-out infinite; }
.rig-jack[data-pending='true'] .rig-jack-ring { opacity: 1; fill: var(--rig-accent); }
.rig-jack[data-refused='true'] { animation: rig-shake 0.42s ease-out; }
.rig-jack-label { font-size: 2.1px; fill: rgba(255,255,255,0.72); text-anchor: middle; pointer-events: none; opacity: 0; transition: opacity 0.15s ease; paint-order: stroke; stroke: #101012; stroke-width: 0.8px; }
.rig-jack:hover .rig-jack-label, .rig-jack:focus-visible .rig-jack-label, .rig-jack[data-fits='true'] .rig-jack-label, .rig-jack-label[data-always='true'] { opacity: 1; }
.rig-gear-name { fill: rgba(255,255,255,0.68); text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: #101012; stroke-width: 0.9px; }
@keyframes rig-jack-pulse { 50% { opacity: 0.25; } }
@keyframes rig-shake { 20% { transform: translateX(0.8px); } 45% { transform: translateX(-0.7px); } 70% { transform: translateX(0.4px); } 100% { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .rig-jack[data-fits='true'] .rig-jack-ring { animation: none; } .rig-jack[data-refused='true'] { animation: none; } }
`;

export interface GearSpot {
  x: number;
  y: number;
  /** Bench size, over the gear's own. */
  scale?: number;
}

export type RigLayout = Readonly<Record<string, GearSpot>>;

interface Props {
  state: MissionState;
  layout: RigLayout;
  audio: RigAudio | null;
  accent: string;
  /** Which jacks the cable in hand physically fits. */
  fits: (port: PortRef) => boolean;
  onPressPort: (port: PortRef) => void;
  onPressCable: (cable: string) => void;
  onPressGear: (gear: string) => void;
  /** Bumped when a note goes down a MIDI cable. */
  noteTick: React.MutableRefObject<number>;
  /** Fill the space given; else fill its width and scroll. */
  fill?: boolean;
}

const MARGIN = 7;
const SILENCE_DB = -58;
const FULL_DB = -8;

// Dashes on a non-scaling stroke are in screen pixels.
const PULSE_DASH = '2 11';
const NOTE_DASH = '0.1 16';
const PULSE_PIXELS_PER_SECOND = 46;

const levelToAmount = (db: number) =>
  Math.max(0, Math.min(1, (db - SILENCE_DB) / (FULL_DB - SILENCE_DB)));

const scaleOf = (spot: GearSpot, visual: GearVisual) =>
  spot.scale ?? visual.scale;

/** Everything on the page, in bench units. */
export function benchFrame(state: MissionState, layout: RigLayout) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const gear of Object.values(state.rig.gear)) {
    const spot = layout[gear.id];
    if (!spot) continue;
    const visual = gearVisual(gear);
    const k = scaleOf(spot, visual);
    x0 = Math.min(x0, spot.x + visual.box.x0 * k);
    y0 = Math.min(y0, spot.y + visual.box.y0 * k);
    x1 = Math.max(x1, spot.x + visual.box.x1 * k);
    y1 = Math.max(y1, spot.y + visual.box.y1 * k);
  }
  return {
    x: x0 - MARGIN,
    y: y0 - MARGIN,
    width: x1 - x0 + MARGIN * 2,
    // Room under the lowest gear for its name, and for hanging cables.
    height: y1 - y0 + MARGIN * 2 + 8,
  };
}

const PartLayers = memo(function PartLayers({
  part,
  register,
}: {
  part: GearPart;
  register?: (el: SVGGElement | null) => void;
}) {
  return (
    <g
      ref={register}
      data-part={part.id}
      style={
        part.tone === 'light'
          ? ({
              '--rig-face': '#e6e6ea',
              '--rig-ink': '#121215',
            } as CSSProperties)
          : part.open
            ? ({ '--rig-face': 'transparent' } as CSSProperties)
            : undefined
      }
    >
      {part.layers.map((layer, i) => (
        <g key={i}>
          {layer.outline && (
            <path className="rig-line" d={layer.outline} strokeWidth={2} />
          )}
          {layer.fill && <path className="rig-face" d={layer.fill} />}
          {layer.hatch && (
            <path
              className="rig-line"
              d={layer.hatch}
              strokeWidth={0.6}
              opacity={0.55}
            />
          )}
          {layer.ink && (
            <path className="rig-line" d={layer.ink} strokeWidth={1} />
          )}
          {layer.marks && (
            <path
              className="rig-line"
              d={layer.marks}
              strokeWidth={0.75 * (part.lineWeight ?? 1)}
              opacity={0.75}
            />
          )}
        </g>
      ))}
    </g>
  );
});

function GearDrawing({
  gear,
  visual,
  spot,
  dim,
  swap,
  onPress,
  registerPart,
}: {
  gear: GearInstance;
  visual: GearVisual;
  spot: GearSpot;
  dim: boolean;
  swap: boolean;
  onPress: () => void;
  registerPart: (gear: string, part: string, el: SVGGElement | null) => void;
}) {
  const reduceMotion = useReducedMotion();
  const k = scaleOf(spot, visual);
  return (
    <motion.g
      initial={reduceMotion ? false : { opacity: 0, y: -9 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 17 }}
    >
      <g
        className="rig-gear"
        data-gear={gear.id}
        data-dim={dim || undefined}
        data-swap={swap || undefined}
        transform={`translate(${spot.x} ${spot.y}) scale(${k})`}
        onClick={onPress}
      >
        {visual.parts.map((part) => (
          <PartLayers
            key={part.id}
            part={part}
            register={
              visual.movers?.some((mover) => mover.part === part.id)
                ? (el) => registerPart(gear.id, part.id, el)
                : undefined
            }
          />
        ))}
      </g>
    </motion.g>
  );
}

function jackPoint(
  gear: GearInstance,
  port: string,
  layout: RigLayout,
): { at: V2; axis: readonly [number, number, number] } | null {
  const spot = layout[gear.id];
  const visual = gearVisual(gear);
  const spec = visual.ports[port];
  if (!spot || !spec) return null;
  const k = scaleOf(spot, visual);
  return {
    at: [spot.x + spec.at[0] * k, spot.y + spec.at[1] * k],
    axis: spec.axis,
  };
}

interface CableGeometry {
  cable: Cable;
  path: string;
  a: { at: V2; axis: readonly [number, number, number] };
  b: { at: V2; axis: readonly [number, number, number] };
}

function cableGeometry(
  cable: Cable,
  gear: Readonly<Record<string, GearInstance>>,
  layout: RigLayout,
): CableGeometry | null {
  const gearA = gear[cable.a.gear];
  const gearB = gear[cable.b.gear];
  if (!gearA || !gearB) return null;
  const a = jackPoint(gearA, cable.a.port, layout);
  const b = jackPoint(gearB, cable.b.port, layout);
  if (!a || !b) return null;
  const tailA = plugTail(cable.kind, a.axis);
  const tailB = plugTail(cable.kind, b.axis);
  return {
    cable,
    a,
    b,
    path: cablePath(
      [a.at[0] + tailA[0], a.at[1] + tailA[1]],
      pageDirection(a.axis),
      [b.at[0] + tailB[0], b.at[1] + tailB[1]],
      pageDirection(b.axis),
    ),
  };
}

function Plug({
  kind,
  at,
  axis,
}: {
  kind: Cable['kind'];
  at: V2;
  axis: readonly [number, number, number];
}) {
  const drawing = plugDrawing(kind, axis);
  return (
    <g transform={`translate(${at[0]} ${at[1]})`} pointerEvents="none">
      <path className="rig-line" d={drawing.outline} strokeWidth={2} />
      <path className="rig-face" d={drawing.fill} />
      <path className="rig-line" d={drawing.ink} strokeWidth={1} />
    </g>
  );
}

const CableView = memo(function CableView({
  geometry,
  accent,
  selected,
  label,
  onPress,
  register,
}: {
  geometry: CableGeometry;
  accent: string;
  selected: boolean;
  label: string;
  onPress: (cable: string) => void;
  register: (id: string, el: SVGPathElement | null) => void;
}) {
  const { cable, path } = geometry;
  const width = CABLE_WIDTH[cable.kind];
  const isPower = cable.kind === 'iec';
  return (
    <g data-cable={cable.id} data-cable-kind={cable.kind}>
      <path
        className="rig-cable"
        d={path}
        stroke="#101012"
        strokeWidth={width + 2.4}
      />
      <path
        className="rig-cable rig-cable-new"
        d={path}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.62)'}
        strokeWidth={width}
        strokeDasharray={isPower ? '1 4' : undefined}
      />
      {!isPower && (
        <path
          ref={(el) => register(cable.id, el)}
          className="rig-cable"
          d={path}
          stroke={accent}
          strokeWidth={width + 0.5}
          strokeDasharray={PULSE_DASH}
          opacity={0}
        />
      )}
      <Plug kind={cable.kind} at={geometry.a.at} axis={geometry.a.axis} />
      <Plug kind={cable.kind} at={geometry.b.at} axis={geometry.b.axis} />
      {!isPower && (
        <>
          <path
            className="rig-cable-hit"
            d={path}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected}
            data-testid={`cable-${cable.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onPress(cable.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPress(cable.id);
              }
            }}
          />
          <path className="rig-cable-focus" d={path} />
        </>
      )}
    </g>
  );
});

/** The short thing to write beside a jack that isn't obvious from its gear. */
const shortLabel = (port: string, label: string) => {
  const channel = /^(?:ch|in)(\d+)$/.exec(port);
  return channel ? channel[1] : label;
};

export function RigScene({
  state,
  layout,
  audio,
  accent,
  fits,
  onPressPort,
  onPressCable,
  onPressGear,
  noteTick,
  fill = true,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { rig, trace } = state;
  const frame = useMemo(
    () => benchFrame(state, layout),
    // The frame holds all the mission's gear, placed or not, so nothing shifts
    // as gear comes off the shelf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.mission, layout],
  );
  const placed = useMemo(
    () => Object.values(rig.gear).filter((g) => g.placed && layout[g.id]),
    [rig.gear, layout],
  );
  const cables = useMemo(
    () =>
      rig.cables
        .map((cable) => cableGeometry(cable, rig.gear, layout))
        .filter((geometry): geometry is CableGeometry => geometry !== null),
    [rig.cables, rig.gear, layout],
  );

  const svgRef = useRef<SVGSVGElement>(null);

  // Frame by frame: meters into cables and speakers.
  const pulses = useRef(new Map<string, SVGPathElement>());
  const movers = useRef(new Map<string, SVGGElement>());
  const registerPulse = useCallback((id: string, el: SVGPathElement | null) => {
    if (el) pulses.current.set(id, el);
    else pulses.current.delete(id);
  }, []);
  const registerPart = useCallback(
    (gear: string, part: string, el: SVGGElement | null) => {
      const key = `${gear}/${part}`;
      if (el) movers.current.set(key, el);
      else movers.current.delete(key);
    },
    [],
  );
  const rigRef = useRef(rig);
  rigRef.current = rig;
  const traceRef = useRef(trace);
  traceRef.current = trace;
  const lastNote = useRef(0);
  const noteGlow = useRef(0);

  useEffect(() => {
    let frameId = 0;
    let travel = 0;
    let last = performance.now();
    const draw = (now: number) => {
      frameId = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      travel -= dt * PULSE_PIXELS_PER_SECOND;
      if (noteTick.current !== lastNote.current) {
        lastNote.current = noteTick.current;
        noteGlow.current = 1;
      }
      noteGlow.current = Math.max(0, noteGlow.current - dt * 4);
      for (const [id, el] of pulses.current) {
        const info = traceRef.current.cables[id];
        if (info?.notes) {
          el.setAttribute('opacity', String(noteGlow.current));
          el.setAttribute('stroke-dasharray', NOTE_DASH);
          el.setAttribute('stroke-dashoffset', String(travel));
          el.parentElement?.setAttribute('data-level', 'notes');
          continue;
        }
        const db = audio?.cableLevel(id) ?? -Infinity;
        const amount = levelToAmount(db);
        el.setAttribute(
          'opacity',
          String(amount > 0 ? 0.25 + amount * 0.75 : 0),
        );
        el.setAttribute('stroke-dasharray', PULSE_DASH);
        if (!reduceMotion) el.setAttribute('stroke-dashoffset', String(travel));
        el.parentElement?.setAttribute(
          'data-level',
          Number.isFinite(db) ? db.toFixed(1) : '-inf',
        );
      }
      svgRef.current?.setAttribute(
        'data-output-peak',
        (audio?.outputPeak() ?? 0).toFixed(3),
      );
      for (const gear of Object.values(rigRef.current.gear)) {
        if (!gear.placed) continue;
        for (const mover of gearVisual(gear).movers ?? []) {
          if (mover.type !== 'pump') continue;
          const el = movers.current.get(`${gear.id}/${mover.part}`);
          if (!el) continue;
          const db = audio?.sinkLevel(gear.id) ?? -Infinity;
          el.setAttribute('data-sink-level', db.toFixed(1));
          const amount = levelToAmount(db);
          const reach = reduceMotion ? 0 : amount * amount * mover.reach;
          const [x, y] = projectOffset([
            mover.axis[0] * reach,
            mover.axis[1] * reach,
            mover.axis[2] * reach,
          ]);
          el.setAttribute('transform', `translate(${x} ${y})`);
        }
      }
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [audio, reduceMotion, noteTick]);

  // Faders sit where their controls say.
  useEffect(() => {
    for (const gear of placed) {
      for (const mover of gearVisual(gear).movers ?? []) {
        if (mover.type !== 'fader') continue;
        const el = movers.current.get(`${gear.id}/${mover.part}`);
        if (!el) continue;
        const value = gear.controls[mover.control];
        const t =
          typeof value === 'number'
            ? (value - mover.min) / (mover.max - mover.min) - 0.5
            : 0;
        const [x, y] = project(
          mover.travel[0] * t,
          mover.travel[1] * t,
          mover.travel[2] * t,
        );
        el.setAttribute('transform', `translate(${x} ${y})`);
      }
    }
  }, [placed]);

  // A cable in hand follows the pointer from its first plug.
  const looseEl = useRef<SVGPathElement>(null);
  const pendingGeometry = useMemo(() => {
    if (!state.pending) return null;
    const gear = rig.gear[state.pending.gear];
    return gear ? jackPoint(gear, state.pending.port, layout) : null;
  }, [state.pending, rig.gear, layout]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !pendingGeometry) return;
    const move = (event: PointerEvent) => {
      const matrix = svg.getScreenCTM();
      if (!matrix || !looseEl.current) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      looseEl.current.setAttribute(
        'd',
        cablePath(
          pendingGeometry.at,
          pageDirection(pendingGeometry.axis),
          [point.x, point.y],
          [0, 0],
        ),
      );
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [pendingGeometry]);

  // Drag or tap: a press takes hold, and letting go over another jack finishes.
  const pressedAt = useRef<string | null>(null);
  useEffect(() => {
    const up = (event: PointerEvent) => {
      const from = pressedAt.current;
      pressedAt.current = null;
      if (!from) return;
      const target = document
        .elementFromPoint?.(event.clientX, event.clientY)
        ?.closest?.('[data-jack]');
      const jack = target?.getAttribute('data-jack');
      if (jack && jack !== from) {
        const [gear, port] = jack.split('/');
        onPressPort({ gear, port });
      }
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [onPressPort]);

  const refused = state.refusal?.target;
  const swappable = state.mission.steps[state.step]?.swappable;

  return (
    <svg
      ref={svgRef}
      data-testid="rig-scene"
      data-frame={`${frame.width}x${frame.height}`}
      role="group"
      aria-label={`The bench: ${placed.map((g) => gearName(g)).join(', ') || 'empty'}`}
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`block w-full select-none ${fill ? 'h-full' : 'h-auto'}`}
      style={{ '--rig-accent': accent } as CSSProperties}
    >
      <style>{SCENE_CSS}</style>
      {placed.map((gear) => (
        <GearDrawing
          key={gear.id}
          gear={gear}
          visual={gearVisual(gear)}
          spot={layout[gear.id]}
          dim={false}
          swap={state.swapping === gear.id}
          onPress={() => {
            if (swappable?.includes(gear.id)) onPressGear(gear.id);
          }}
          registerPart={registerPart}
        />
      ))}
      {cables.map((geometry) => {
        const a = rig.gear[geometry.cable.a.gear];
        const b = rig.gear[geometry.cable.b.gear];
        return (
          <CableView
            key={geometry.cable.id}
            geometry={geometry}
            accent={accent}
            selected={state.probe === geometry.cable.id}
            label={`Listen to the cable from ${gearName(a)} to ${gearName(b)}`}
            onPress={onPressCable}
            register={registerPulse}
          />
        );
      })}
      {pendingGeometry && state.cable && (
        <path
          ref={looseEl}
          className="rig-cable"
          d={`M${pendingGeometry.at[0]} ${pendingGeometry.at[1]}`}
          stroke={accent}
          strokeWidth={CABLE_WIDTH[state.cable]}
        />
      )}
      {placed.map((gear) => {
        const visual = gearVisual(gear);
        const spot = layout[gear.id];
        const k = scaleOf(spot, visual);
        return (
          <text
            key={gear.id}
            className="rig-gear-name"
            x={spot.x + ((visual.box.x0 + visual.box.x1) / 2) * k}
            y={spot.y + visual.box.y1 * k + 3.2 + (visual.nameGap ?? 0)}
            fontSize={2.5}
          >
            {gearName(gear)}
          </text>
        );
      })}
      {placed.map((gear) => {
        const { ports } = gearVisual(gear);
        return gearDef(gear).ports.map((port) => {
          if (!ports[port.id]) return null;
          if (port.domain === 'power' && !rig.env.managedPower) return null;
          const point = jackPoint(gear, port.id, layout);
          if (!point) return null;
          const key = `${gear.id}/${port.id}`;
          const ref = { gear: gear.id, port: port.id };
          const fitsHere = !!state.cable && fits(ref);
          const pending =
            state.pending?.gear === gear.id && state.pending.port === port.id;
          const plugged = rig.cables.some(
            (c) =>
              (c.a.gear === gear.id && c.a.port === port.id) ||
              (c.b.gear === gear.id && c.b.port === port.id),
          );
          const name = `${gearName(gear)}, ${port.label}`;
          return (
            <g
              key={key}
              className="rig-jack"
              role="button"
              tabIndex={0}
              aria-label={plugged ? `Pull the plug from ${name}` : name}
              data-jack={key}
              data-testid={`jack-${key}`}
              data-fits={fitsHere || undefined}
              data-pending={pending || undefined}
              data-refused={refused === key || undefined}
              data-plugged={plugged || undefined}
              onPointerDown={(event) => {
                event.preventDefault();
                pressedAt.current = key;
                onPressPort(ref);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPressPort(ref);
                }
              }}
              style={{ transformBox: 'fill-box' }}
            >
              <circle
                cx={point.at[0]}
                cy={point.at[1]}
                r={fill ? 2.8 : 4}
                fill="transparent"
              />
              <circle
                className="rig-jack-ring"
                cx={point.at[0]}
                cy={point.at[1]}
                r={1.7}
              />
              <text
                className="rig-jack-label"
                data-always={/^(ch|in)\d+$/.test(port.id) || undefined}
                x={point.at[0]}
                y={point.at[1] - 2.6}
              >
                {shortLabel(port.id, port.label)}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}
