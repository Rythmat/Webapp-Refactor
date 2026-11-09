import { useEffect, useRef, useState } from 'react';
import {
  type AnchorRack,
  type Rect,
  type Target,
  subscribeAnchorRect,
} from './anchorRegistry';
import { PAD, RADIUS } from './Spotlight';

// ── RainbowHighlight ────────────────────────────────────────────────────────
// The celebration for a finished step: a rainbow ring, with a soft rainbow
// glow, on the outline of the region the step pointed at (the same outline
// the Spotlight ring draws). It follows that region on its own, so it stays
// on the step just done while the spotlight glides on to the next one. Fires
// once on mount and calls `onDone` when it has finished; remount with a new
// `key` to replay.
//
// The gradient spins by rotating an oversized square under a ring-shaped
// mask, and the whole fades in and out, transform and opacity only. Under
// prefers-reduced-motion it neither spins nor fades: the ring is simply
// there for the same time. The keyframes live in TutorialLayer.

/** How long the celebration stays up (a validated step advances at 950 ms). */
export const RAINBOW_MS = 1000;
const BAND = 3;
const GLOW_BAND = 6;
const GLOW_BLUR = 10;

const COLORS = [
  '#f472b6',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#22d3ee',
  '#a78bfa',
];
const GRADIENT = `conic-gradient(${[...COLORS, COLORS[0]].join(', ')})`;
/** Shows only the band between the border box and the content box. */
const RING_MASK =
  'linear-gradient(black, black) content-box, linear-gradient(black, black)';

export function RainbowHighlight({
  target,
  rack,
  reducedMotion,
  onDone,
}: {
  target?: Target;
  rack?: AnchorRack;
  reducedMotion: boolean;
  onDone?: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Mounted once per celebration (a fresh key), so the target is read once.
  useEffect(
    () => subscribeAnchorRect(target, (r) => setRect(r), { rack }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current?.(), RAINBOW_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (!rect) return null;

  const width = rect.width + PAD * 2;
  const height = rect.height + PAD * 2;
  // The spinning square covers the ring at every angle.
  const side = Math.ceil(Math.hypot(width, height));

  const ring = (band: number) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: band,
        borderRadius: RADIUS,
        overflow: 'hidden',
        WebkitMask: RING_MASK,
        WebkitMaskComposite: 'xor',
        mask: RING_MASK,
        maskComposite: 'exclude',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: (width - side) / 2,
          top: (height - side) / 2,
          width: side,
          height: side,
          background: GRADIENT,
          willChange: reducedMotion ? undefined : 'transform',
          animation: reducedMotion
            ? undefined
            : `tutorialRainbowSpin ${RAINBOW_MS}ms linear`,
        }}
      />
    </div>
  );

  return (
    <div
      aria-hidden
      data-testid="tutorial-rainbow"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width,
        height,
        transform: `translate(${rect.left - PAD}px, ${rect.top - PAD}px)`,
        pointerEvents: 'none',
        zIndex: 1,
        animation: reducedMotion
          ? undefined
          : `tutorialRainbowFade ${RAINBOW_MS}ms ease-out forwards`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: `blur(${GLOW_BLUR}px)`,
          opacity: 0.85,
        }}
      >
        {ring(GLOW_BAND)}
      </div>
      {ring(BAND)}
    </div>
  );
}
