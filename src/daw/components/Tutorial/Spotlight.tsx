import { useEffect, useState } from 'react';
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
// A glowing ring around the current step's target region (an anchor in
// anchorRegistry.ts). Purely visual: pointer-events:none, so the student
// still uses the real control. The rest of the Studio stays as it is, not
// dimmed: the ring is focus enough (owner, 2026-11-10).
//
// The ring glides to a new place and pulses its glow with opacity only.
// Under prefers-reduced-motion it neither glides nor pulses. The rect comes
// from the registry, which re-measures only when something moves.

/** The ring's gap around its target, and its corner radius (RainbowHighlight
 *  draws on the same outline). */
export const PAD = 6;
export const RADIUS = 8;
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
  );
}
