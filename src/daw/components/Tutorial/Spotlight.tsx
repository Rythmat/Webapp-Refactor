import { useEffect, useId, useState } from 'react';
import {
  type AnchorRack,
  type Rect,
  type Target,
  anchorKey,
  idsOf,
  subscribeAnchorRect,
} from './anchorRegistry';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── Spotlight ───────────────────────────────────────────────────────────────
// Dims the Studio and cuts a glowing hole around the current step's target
// region (an anchor in anchorRegistry.ts). Purely visual: the whole layer is
// pointer-events:none so the user still interacts with the real control.
//
// The dim is a static full-screen SVG whose mask has a hole at the target, so
// it never repaints except when the target moves. The ring on top is its own
// small element: it glides to a new place and pulses its glow with opacity
// only. Under prefers-reduced-motion it neither glides nor pulses. The rect
// comes from the registry, which re-measures only when something moves.

const PAD = 6;
const RADIUS = 8;
const DIM = 'rgba(6, 8, 12, 0.4)';
const ACCENT = 'var(--daw-accent)';

export function Spotlight({
  target,
  rack,
}: {
  target?: Target;
  /** The effect rack an `fx-add-*` target means (default: the track dock). */
  rack?: AnchorRack;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [anchor, setAnchor] = useState<{ rect: Rect; id: string } | null>(null);
  const maskId = `tutorial-spotlight-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hasTarget = idsOf(target).length > 0;
  const key = anchorKey(target, rack);

  useEffect(() => {
    // On a new step the ring stays where it was until the new target is
    // measured (next frame), then glides there, as it did before.
    if (!hasTarget) {
      setAnchor(null);
      return;
    }
    return subscribeAnchorRect(
      target,
      (rect, id) => setAnchor(rect && id ? { rect, id } : null),
      { rack },
    );
    // `key` is the value-stable form of `target` + `rack`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!hasTarget || !anchor) return null;

  const { rect } = anchor;
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const width = rect.width + PAD * 2;
  const height = rect.height + PAD * 2;

  return (
    <>
      <svg
        aria-hidden
        data-testid="tutorial-spotlight-dim"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="#fff" />
            <rect
              data-testid="tutorial-spotlight-hole"
              x={x}
              y={y}
              width={width}
              height={height}
              rx={RADIUS}
              fill="#000"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={DIM} mask={`url(#${maskId})`} />
      </svg>
      <div
        aria-hidden
        data-testid="tutorial-spotlight-ring"
        data-tutorial-anchor={anchor.id}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width,
          height,
          transform: `translate(${x}px, ${y}px)`,
          borderRadius: RADIUS,
          pointerEvents: 'none',
          zIndex: 0,
          boxShadow: `0 0 0 2px ${ACCENT}, 0 0 16px 4px ${ACCENT}`,
          transition: reducedMotion
            ? 'none'
            : 'transform 120ms ease, width 120ms ease, height 120ms ease',
        }}
      >
        {!reducedMotion && (
          // The pulse: a wider glow faded in and out over the ring, opacity
          // only, so the compositor runs it without repainting.
          <div
            data-testid="tutorial-spotlight-pulse"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: RADIUS,
              boxShadow: `0 0 0 3px ${ACCENT}, 0 0 30px 10px ${ACCENT}`,
              opacity: 0,
              willChange: 'opacity',
              animation: 'tutorialPulse 1.6s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </>
  );
}
