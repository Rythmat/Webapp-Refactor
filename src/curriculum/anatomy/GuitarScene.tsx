import {
  animate,
  motionValue,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { paintOrder } from './anatomyPose';
import type { PartPose, SceneCamera, ScenePose } from './anatomyTypes';
import {
  leaderStart,
  throughCamera,
  type Callout,
  type Frame,
} from './callouts';
import type { CompiledModel, CompiledPart } from './compileModel';
import { projectOffset } from './iso';

// ── The drawing ────────────────────────────────────────────────────────────
// White hairlines on the dark canvas, the chosen part in the guitar's accent.
// Every part springs to the pose it is given. Springs write to motion values,
// and one frame callback turns those into transform attributes and leader
// paths, so a whole guitar coming apart renders nothing through React.

const INK: Readonly<Record<PartPose['state'], string>> = {
  idle: 'rgba(255,255,255,0.86)',
  seated: 'rgba(255,255,255,0.42)',
  dim: 'rgba(255,255,255,0.17)',
  lit: 'currentColor',
};
const FACE = '#121215';
/** A light part's face, by state. */
const LIGHT: Readonly<Record<PartPose['state'], string>> = {
  idle: '#e6e6ea',
  seated: '#9b9ba1',
  dim: '#34343a',
  lit: '#e6e6ea',
};

const SPRING = {
  type: 'spring',
  stiffness: 150,
  damping: 21,
  mass: 1,
} as const;
const CAMERA_SPRING = {
  type: 'spring',
  stiffness: 110,
  damping: 24,
  mass: 1,
} as const;

const SCENE_CSS = `
.anatomy-line { vector-effect: non-scaling-stroke; fill: none; stroke: var(--part-ink); stroke-linejoin: round; stroke-linecap: round; pointer-events: none; transition: stroke 0.28s ease; }
.anatomy-face { fill: var(--part-face); stroke: none; pointer-events: none; transition: fill 0.28s ease; }
.anatomy-hit { fill: transparent; stroke: transparent; pointer-events: all; cursor: pointer; }
.anatomy-part:hover { --part-hover: 1; }
.anatomy-part[data-hover='true'] .anatomy-line { stroke: rgba(255,255,255,1); }
.anatomy-part[data-state='lit'][data-hover='true'] .anatomy-line { stroke: var(--part-ink); }
.anatomy-pulse { animation: anatomy-pulse 1.1s ease-in-out infinite; }
@keyframes anatomy-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .anatomy-pulse { animation: none; } .anatomy-line, .anatomy-face { transition: none; } }
`;

interface PartMotion {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export interface GuitarSceneProps {
  model: CompiledModel;
  pose: ScenePose;
  camera: SceneCamera;
  /** The page's frame, if larger than the guitar's own. */
  frame?: Frame;
  /** Where the parts start, before they spring to `pose`. */
  initialPose?: ScenePose;
  callouts?: readonly Callout[];
  /** Seconds between parts when they all move; 0 moves them as one. */
  stagger?: number;
  /** Pressing a part; absent, the drawing is only a picture. */
  onPressPart?: (part: string) => void;
  /** Pressing the empty canvas. */
  onPressCanvas?: () => void;
  onPressCallout?: (term: string) => void;
  onHoverPart?: (part: string | null) => void;
  hoveredPart?: string | null;
  /** Parts that can't be pressed. */
  inert?: ReadonlySet<string>;
  /** Parts that pulse, to point them out. */
  pulsing?: readonly string[];
  /** The part to shake; a new nonce shakes it again. */
  shake?: { part: string; nonce: number } | null;
  /** The finished guitar's outline, faint and dashed, under the parts. */
  ghost?: boolean;
  /** The drawing as words, for assistive tech. */
  label: string;
}

const lineWidth = 1;

function PartDrawing({
  part,
  pose,
  accent,
  hovered,
  pulsing,
  pressable,
  register,
  onPress,
  onHover,
}: {
  part: CompiledPart;
  pose: PartPose;
  accent: string;
  hovered: boolean;
  pulsing: boolean;
  pressable: boolean;
  register: (id: string, el: SVGGElement | null) => void;
  onPress?: (part: string) => void;
  onHover?: (part: string | null) => void;
}) {
  const lit = pose.state === 'lit';
  let face = lit ? `color-mix(in srgb, ${accent} 16%, ${FACE})` : FACE;
  if (pose.seeThrough) face = 'transparent';
  const light = part.tone === 'light' ? LIGHT[pose.state] : null;
  if (light)
    face =
      pose.state === 'lit'
        ? `color-mix(in srgb, ${accent} 62%, #e6e6ea)`
        : light;
  const hit = useMemo(
    () => part.layers.map((layer) => `${layer.fill}${layer.marks}`).join(''),
    [part.layers],
  );
  return (
    <g
      ref={(el) => register(part.id, el)}
      className={pulsing ? 'anatomy-part anatomy-pulse' : 'anatomy-part'}
      data-part={part.id}
      data-state={pose.state}
      data-hover={hovered || undefined}
      style={
        {
          color: accent,
          '--part-ink': light ? FACE : INK[pose.state],
          '--part-face': face,
        } as React.CSSProperties
      }
    >
      {part.layers.map((layer, i) => (
        <g key={i}>
          {layer.fill && <path className="anatomy-face" d={layer.fill} />}
          {layer.hatch && (
            <path
              className="anatomy-line"
              d={layer.hatch}
              strokeWidth={lineWidth * 0.6}
              opacity={0.62}
            />
          )}
          {layer.ink && (
            <path
              className="anatomy-line"
              d={layer.ink}
              strokeWidth={lineWidth}
            />
          )}
          {layer.marks && (
            <path
              className="anatomy-line"
              d={layer.marks}
              strokeWidth={lineWidth * 0.75 * part.lineWeight}
              opacity={
                part.layers.length > 1 || part.id === 'strings' ? 1 : 0.7
              }
            />
          )}
        </g>
      ))}
      {pose.feature && part.features[pose.feature] && (
        <path
          className="anatomy-line"
          d={part.features[pose.feature]}
          strokeWidth={lineWidth * 1.1}
          style={{ stroke: accent }}
        />
      )}
      {pressable && (
        <path
          className="anatomy-hit"
          data-testid={`part-${part.id}`}
          d={hit}
          strokeWidth={Math.max(part.hitPad * 2, 0.1)}
          onClick={(event) => {
            event.stopPropagation();
            onPress?.(part.id);
          }}
          onPointerEnter={() => onHover?.(part.id)}
          onPointerLeave={() => onHover?.(null)}
        />
      )}
    </g>
  );
}

export function GuitarScene({
  model,
  pose,
  camera,
  frame,
  initialPose,
  callouts = [],
  stagger = 0,
  onPressPart,
  onPressCanvas,
  onPressCallout,
  onHoverPart,
  hoveredPart,
  inert,
  pulsing = [],
  shake,
  ghost = false,
  label,
}: GuitarSceneProps) {
  const reduceMotion = useReducedMotion();
  const { parts } = model;
  const view = frame ?? model.view;

  // One pair of motion values per part, starting where the scene opens.
  const motions = useMemo(() => {
    const start = initialPose ?? pose;
    return Object.fromEntries(
      parts.map((part): [string, PartMotion] => {
        const [x, y] = projectOffset(start[part.id].offset);
        return [part.id, { x: motionValue(x), y: motionValue(y) }];
      }),
    );
    // Fixed for the scene's life: it is remounted per guitar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);
  const cameraMotion = useMemo(
    () => ({
      x: motionValue(camera.x),
      y: motionValue(camera.y),
      scale: motionValue(camera.scale),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts],
  );

  const partEls = useRef(new Map<string, SVGGElement>());
  const cameraEl = useRef<SVGGElement | null>(null);
  const leaderEls = useRef(new Map<string, SVGPathElement>());
  const calloutsRef = useRef(callouts);
  calloutsRef.current = callouts;

  // Writes the current motion values to the page.
  const draw = useRef(() => {});
  draw.current = () => {
    const cam = {
      x: cameraMotion.x.get(),
      y: cameraMotion.y.get(),
      scale: cameraMotion.scale.get(),
    };
    cameraEl.current?.setAttribute(
      'transform',
      `translate(${cam.x} ${cam.y}) scale(${cam.scale})`,
    );
    for (const part of parts) {
      const motion = motions[part.id];
      partEls.current
        .get(part.id)
        ?.setAttribute(
          'transform',
          `translate(${motion.x.get()} ${motion.y.get()})`,
        );
    }
    for (const callout of calloutsRef.current) {
      const motion = motions[callout.part];
      const [x, y] = throughCamera(
        [
          callout.anchor[0] + motion.x.get(),
          callout.anchor[1] + motion.y.get(),
        ],
        cam,
      );
      const [sx, sy] = leaderStart(callout);
      leaderEls.current
        .get(callout.termId)
        ?.setAttribute('d', `M${sx} ${sy}L${x} ${y}`);
    }
  };

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw.current();
      });
    };
    const values = [
      ...Object.values(motions).flatMap((m) => [m.x, m.y]),
      cameraMotion.x,
      cameraMotion.y,
      cameraMotion.scale,
    ];
    const stops = values.map((value) => value.on('change', schedule));
    return () => {
      stops.forEach((stop) => stop());
      cancelAnimationFrame(frame);
    };
  }, [motions, cameraMotion]);

  useLayoutEffect(() => draw.current());

  // Spring to the pose. The top of the stack moves first.
  useEffect(() => {
    parts.forEach((part, i) => {
      const [x, y] = projectOffset(pose[part.id].offset);
      const motion = motions[part.id];
      if (reduceMotion) {
        motion.x.set(x);
        motion.y.set(y);
        return;
      }
      const delay = (parts.length - 1 - i) * stagger;
      if (motion.x.get() !== x) {
        void animate(motion.x, x, { ...SPRING, delay });
      }
      if (motion.y.get() !== y) {
        void animate(motion.y, y, { ...SPRING, delay });
      }
    });
    // stagger is read for this move only; a change of it alone moves nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose, parts, motions, reduceMotion]);

  useEffect(() => {
    const entries = [
      [cameraMotion.x, camera.x],
      [cameraMotion.y, camera.y],
      [cameraMotion.scale, camera.scale],
    ] as const;
    for (const [value, target] of entries) {
      if (reduceMotion) value.set(target);
      else if (value.get() !== target) {
        void animate(value, target, CAMERA_SPRING);
      }
    }
  }, [camera.x, camera.y, camera.scale, cameraMotion, reduceMotion]);

  // A wrong press: the part shakes where it floats, then settles.
  useEffect(() => {
    if (!shake || reduceMotion) return;
    const motion = motions[shake.part];
    if (!motion) return;
    const x = projectOffset(pose[shake.part].offset)[0];
    void animate(motion.x, [x, x + 0.45, x - 0.38, x + 0.24, x - 0.12, x], {
      duration: 0.42,
      ease: 'easeOut',
    });
    // Only a new press shakes; the pose is read as it stands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake?.nonce, shake?.part, reduceMotion]);

  const ghostPath = useMemo(
    () =>
      ghost
        ? parts
            .filter((part) => part.id !== 'frets' && part.id !== 'markers')
            .flatMap((part) => part.layers.map((layer) => layer.ink))
            .join('')
        : '',
    [ghost, parts],
  );

  const order = useMemo(() => paintOrder(model, pose), [model, pose]);

  const register = (id: string, el: SVGGElement | null) => {
    if (el) partEls.current.set(id, el);
    else partEls.current.delete(id);
  };

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full select-none overflow-hidden"
      onClick={onPressCanvas}
      data-guitar={model.kind}
    >
      <style>{SCENE_CSS}</style>
      <g ref={cameraEl}>
        {ghostPath && (
          <path
            data-ghost
            d={ghostPath}
            fill="none"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{
              vectorEffect: 'non-scaling-stroke',
              pointerEvents: 'none',
            }}
          />
        )}
        {order
          .map((id) => model.partById[id])
          .map((part) => (
            <PartDrawing
              key={part.id}
              part={part}
              pose={pose[part.id]}
              accent={model.accent}
              hovered={hoveredPart === part.id}
              pulsing={pulsing.includes(part.id)}
              pressable={!!onPressPart && !inert?.has(part.id)}
              register={register}
              onPress={onPressPart}
              onHover={onHoverPart}
            />
          ))}
      </g>
      {callouts.map((callout) => (
        <g key={callout.termId} data-callout={callout.termId}>
          <path
            ref={(el) => {
              if (el) leaderEls.current.set(callout.termId, el);
              else leaderEls.current.delete(callout.termId);
            }}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1}
            strokeDasharray="4 3"
            style={{
              vectorEffect: 'non-scaling-stroke',
              pointerEvents: 'none',
            }}
          />
          <text
            x={callout.x}
            y={callout.y}
            fontSize={callout.size}
            fill="rgba(255,255,255,0.9)"
            textAnchor={callout.side === 'left' ? 'start' : 'end'}
            style={{ cursor: onPressCallout ? 'pointer' : undefined }}
            onClick={(event) => {
              if (!onPressCallout) return;
              event.stopPropagation();
              onPressCallout(callout.termId);
            }}
          >
            {callout.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
