import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  handFrame,
  handGroups,
  handPositions,
  type FingeringCursor,
  type HandFrame,
} from '@/learn/fingering/handFrames';
import {
  FINGERS,
  handPose,
  placeHand,
  whiteKeyWidth,
  type HandPose,
  type KeyboardGeometry,
  type PlacedHand,
} from '@/learn/fingering/handPose';
import type { HandPoseLibrary } from '@/learn/fingering/handPoseTypes';
import { keyBox, type KeyRange } from '@/learn/keyboard/lessonKeyboardRange';
import type { FingeringTimeline, Hand } from '@/lib/learn/pianoFingering';

/**
 * Peter's hands over Learn's keyboard: fine line drawings, faded, one per
 * hand shape, fingertips on the keys they play. A finger washes lightly in
 * the key color when its note is next and fills when it plays. The hand
 * stays put while its fingers keep to their keys, glides to the next
 * position, and changes shape (a crossfade between drawings) when the next
 * position needs another. Or, with the hands off and finger numbers on, just
 * the numbers above the keys. Decoration over the keys: never in the way of
 * a click.
 */

/**
 * The palm fades out at most this far below the keys (a share of their
 * height), and never past what shows of the lesson below them: the hands
 * stop short of the Demo / Practice / Play Now bar, and nothing moves to make
 * room for them.
 */
const HAND_ROOM = 0.45;

/**
 * The hand's own paper: nearly opaque, as the book draws it, so a lit key
 * never shows through a finger that isn't playing it.
 */
const HAND_FILL = 0.82;

const WASH: Record<'down' | 'hover' | 'idle', number> = {
  down: 0.85,
  hover: 0.32,
  idle: 0,
};

export interface FingeringHandsProps {
  timeline: FingeringTimeline;
  cursor: FingeringCursor;
  range: KeyRange;
  keyColor: string;
  hands: boolean;
  numbers: boolean;
  /** The element holding the keys (LessonKeyboard's stage). */
  stageEl: HTMLElement | null;
}

/** The nearest ancestor that clips what overflows it (the lesson's scroller). */
function clippingAncestor(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY !== 'visible') return p;
  }
  return null;
}

/**
 * The lesson's Demo / Practice / Play Now bar. Some layouts end the keys'
 * scroller where it begins; others pin it to the scroller's bottom, over
 * what scrolls.
 */
const lessonBar = (el: HTMLElement) =>
  el.ownerDocument.querySelector<HTMLElement>('[data-guitar-bar]');

/**
 * The keys' box inside the stage, live, and the room below them: down to the
 * bottom of what shows of the lesson, or the top of its bar, whichever comes
 * first, at most HAND_ROOM of the keys.
 */
function useKeysBox(stageEl: HTMLElement | null) {
  const [box, setBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    room: number;
  } | null>(null);
  useEffect(() => {
    if (!stageEl) return;
    const clip = clippingAncestor(stageEl);
    const bar = lessonBar(stageEl);
    const measure = () => {
      const keys = stageEl.querySelector('[data-testid="piano-keyboard-fill"]');
      if (!keys) return;
      const s = stageEl.getBoundingClientRect();
      const k = keys.getBoundingClientRect();
      const barTop = bar?.getBoundingClientRect().top;
      const floor = Math.min(
        clip ? clip.getBoundingClientRect().bottom : window.innerHeight,
        barTop !== undefined && barTop > k.top ? barTop : Infinity,
      );
      setBox((prev) => {
        const next = {
          x: k.left - s.left,
          y: k.top - s.top,
          width: k.width,
          height: k.height,
          room: Math.round(
            Math.max(0, Math.min(k.height * HAND_ROOM, floor - k.bottom)),
          ),
        };
        return prev &&
          prev.x === next.x &&
          prev.y === next.y &&
          prev.width === next.width &&
          prev.height === next.height &&
          prev.room === next.room
          ? prev
          : next;
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(stageEl);
    if (clip) observer?.observe(clip);
    if (bar) observer?.observe(bar);
    const scroller = clip ?? window;
    scroller.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      scroller.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [stageEl]);
  return box;
}

/** The drawings are big: loaded the first time a lesson shows hands. */
let library: HandPoseLibrary | null = null;
let loading: Promise<HandPoseLibrary> | null = null;
function useHandPoseLibrary(enabled: boolean) {
  const [lib, setLib] = useState(library);
  useEffect(() => {
    if (!enabled || lib) return;
    let live = true;
    loading ??= import('@/learn/fingering/handPoseArt').then(
      (m) => (library = { key: m.HAND_POSE_KEY, poses: m.HAND_POSE_ART }),
    );
    void loading.then((l) => live && setLib(l));
    return () => {
      live = false;
    };
  }, [enabled, lib]);
  return lib;
}

export function FingeringHands({
  timeline,
  cursor,
  range,
  keyColor,
  hands,
  numbers,
  stageEl,
}: FingeringHandsProps) {
  const box = useKeysBox(stageEl);
  const reduceMotion = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const lib = useHandPoseLibrary(hands);
  const groups = useMemo(() => handGroups(timeline), [timeline]);
  const positions = useMemo(
    () => ({
      lh: handPositions(groups.lh, 'lh'),
      rh: handPositions(groups.rh, 'rh'),
    }),
    [groups],
  );

  // Where each hand was, so it follows the lesson forward from there.
  const at = useRef<Record<Hand, number>>({ rh: -1, lh: -1 });
  useEffect(() => {
    at.current = { rh: -1, lh: -1 };
  }, [timeline]);

  const geo: KeyboardGeometry | null = box
    ? { range, width: box.width, height: box.height }
    : null;

  const frames = useMemo(() => {
    const out = {} as Record<Hand, HandFrame | null>;
    for (const hand of ['lh', 'rh'] as const) {
      const f = handFrame(groups[hand], cursor, at.current[hand]);
      if (f) at.current[hand] = f.at;
      out[hand] = f;
    }
    return out;
  }, [groups, cursor]);

  // Each position's drawing and place, once per lesson and keyboard size.
  const placed = useMemo(() => {
    if (!lib || !geo) return null;
    const out = {} as Record<Hand, (PlacedHand | null)[]>;
    for (const hand of ['lh', 'rh'] as const)
      out[hand] = positions[hand].positions.map((p) =>
        placeHand(hand, p.keys, geo, lib),
      );
    return out;
    // geo is rebuilt from box each render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, positions, box?.width, box?.height, range.low, range.high]);

  const handPoses = useMemo(() => {
    const out = {} as Record<Hand, HandPose | null>;
    for (const hand of ['lh', 'rh'] as const) {
      const frame = frames[hand];
      const p = frame ? positions[hand].at[frame.group] : undefined;
      const where = p === undefined ? null : placed?.[hand][p];
      out[hand] =
        frame && where && p !== undefined
          ? handPose(hand, frame, positions[hand].positions[p], where)
          : null;
    }
    return out;
  }, [frames, positions, placed]);

  if (!box || !geo || (!hands && !numbers)) return null;
  const room = hands ? box.room : 0;
  const glide = reduceMotion ? 'none' : 'transform 180ms ease-out';
  const fade = { duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' } as const;
  const digitSize = Math.max(10, Math.min(15, whiteKeyWidth(geo) * 0.42));

  return (
    <svg
      aria-hidden
      data-fingering={hands ? 'hands' : 'numbers'}
      className="pointer-events-none absolute z-20 overflow-visible"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height + room,
      }}
      width={box.width}
      height={box.height + room}
    >
      <defs>
        {/* The palm fades out below the keys, gone by the lesson's buttons. */}
        <linearGradient
          id={`${id}-fade`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={box.height - Math.max(4, box.height * 0.04)}
          x2="0"
          y2={box.height + room}
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask
          id={`${id}-mask`}
          maskUnits="userSpaceOnUse"
          x={-box.width}
          y={-box.height}
          width={box.width * 3}
          height={box.height * 3}
        >
          <rect
            x={-box.width}
            y={-box.height}
            width={box.width * 3}
            height={box.height * 3}
            fill={`url(#${id}-fade)`}
          />
        </mask>
      </defs>

      {hands &&
        (['lh', 'rh'] as const).map((hand) => {
          const pose = handPoses[hand];
          const wrist = pose
            ? `${id}-${hand}-${pose.art.id}${pose.mirror}-wrist`
            : '';
          return (
            <g
              key={hand}
              data-fingering-hand={hand}
              mask={`url(#${id}-mask)`}
              opacity={0.9}
            >
              <AnimatePresence initial={false}>
                {pose && (
                  // A new shape fades in over the last; the same shape glides.
                  <motion.g
                    key={`${pose.art.id}${pose.mirror}`}
                    data-hand-art={pose.art.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={fade}
                  >
                    <g
                      style={{
                        transform: `translate(${pose.left}px, ${pose.top}px) scale(${pose.mirror * pose.sx}, ${pose.sy})`,
                        transformBox: 'view-box',
                        transformOrigin: '0 0',
                        transition: glide,
                      }}
                    >
                      {/* Each drawing stops at the wrist, cut straight or
                          trailing off: it fades out before then. */}
                      <linearGradient
                        id={`${wrist}-g`}
                        gradientUnits="userSpaceOnUse"
                        x1="0"
                        y1={pose.art.size[1] * 0.7}
                        x2="0"
                        y2={pose.art.size[1]}
                      >
                        <stop offset="0" stopColor="#fff" />
                        <stop offset="1" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                      <mask
                        id={wrist}
                        maskUnits="userSpaceOnUse"
                        x={-pose.art.size[0]}
                        y={-pose.art.size[1]}
                        width={pose.art.size[0] * 3}
                        height={pose.art.size[1] * 3}
                      >
                        <rect
                          x={-pose.art.size[0]}
                          y={-pose.art.size[1]}
                          width={pose.art.size[0] * 3}
                          height={pose.art.size[1] * 3}
                          fill={`url(#${wrist}-g)`}
                        />
                      </mask>
                      <g mask={`url(#${wrist})`}>
                        <path
                          d={pose.art.paper}
                          fill="var(--fingering-hand-fill, #ffffff)"
                          fillOpacity={HAND_FILL}
                        />
                        {FINGERS.map((f) => {
                          const art = pose.art.fingers[f];
                          if (!art) return null;
                          const state = pose.fingers[f].state;
                          // Full at the tip, fading out down the finger.
                          const wash = `${id}-${hand}-${pose.art.id}-${f}`;
                          return (
                            <g key={f}>
                              <linearGradient
                                id={wash}
                                gradientUnits="userSpaceOnUse"
                                x1={art.tip[0]}
                                y1={art.tip[1]}
                                x2={art.root[0]}
                                y2={art.root[1]}
                              >
                                <stop offset="0" stopColor={keyColor} />
                                <stop offset="0.5" stopColor={keyColor} />
                                <stop
                                  offset="1"
                                  stopColor={keyColor}
                                  stopOpacity="0.1"
                                />
                              </linearGradient>
                              <path
                                data-finger={f}
                                data-state={state}
                                d={art.wash}
                                fill={`url(#${wash})`}
                                fillOpacity={WASH[state]}
                                style={{
                                  transition: reduceMotion
                                    ? 'none'
                                    : 'fill-opacity 160ms ease-out',
                                }}
                              />
                            </g>
                          );
                        })}
                        {/* The lines, with a faint light edge so they read on black keys. */}
                        <path
                          d={pose.art.lines}
                          fill="var(--fingering-hand-line, #231f20)"
                          stroke="var(--fingering-hand-halo, rgba(255,255,255,0.6))"
                          strokeWidth={1.3}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          paintOrder="stroke"
                        />
                      </g>
                    </g>
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          );
        })}

      {numbers &&
        (['lh', 'rh'] as const).flatMap((hand) => {
          const frame = frames[hand];
          const pose = handPoses[hand];
          if (!frame) return [];
          const notes = [
            ...frame.down,
            ...frame.hover.filter(
              (h) => !frame.down.some((d) => d.finger === h.finger),
            ),
          ];
          return notes.map((n) => {
            const k = keyBox(range, n.midi);
            if (!k) return null;
            const keyX = (k.left + k.width / 2) * box.width;
            let at: [number, number];
            if (hands && pose) {
              // On the fingertip; on the key for a finger the drawing curls;
              // none for a key the hand isn't over yet.
              const f = pose.fingers[n.finger];
              if (f.state === 'idle') return null;
              at = f.tip ?? [keyX, box.height * (k.black ? 0.4 : 0.8)];
            } else at = [keyX, -digitSize * 0.55];
            return (
              <text
                key={`${hand}-${n.index}`}
                data-finger-number={n.finger}
                x={at[0]}
                y={at[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={digitSize}
                fontWeight={700}
                fill="#ffffff"
                stroke="#101012"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {n.finger}
              </text>
            );
          });
        })}
    </svg>
  );
}
